-- ============================================================
-- Referral codes, referral chain, and referral_rewards ledger
-- Run after 021-session-requests-stripe-payments.sql
-- ============================================================

-- ─── 1. Users: referral chain + code column (nullable until backfill) ───────

ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS referral_code VARCHAR(8),
  ADD COLUMN IF NOT EXISTS referred_by UUID REFERENCES public.users (id) ON DELETE SET NULL;

COMMENT ON COLUMN public.users.referral_code IS 'Unique 8-character alphanumeric code; auto-set on insert';
COMMENT ON COLUMN public.users.referred_by IS 'Optional FK to the referring user (referral chain)';

-- ─── 2. Helper: generate candidate + unique code (8-char A–Z and 0–9) ─────

CREATE OR REPLACE FUNCTION public.generate_referral_code_candidate()
RETURNS TEXT
LANGUAGE plpgsql
VOLATILE
SET search_path = public
AS $$
DECLARE
  alphabet TEXT := 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  result TEXT := '';
  i INT;
BEGIN
  FOR i IN 1..8 LOOP
    result := result || substr(alphabet, 1 + floor(random() * length(alphabet))::INT, 1);
  END LOOP;
  RETURN result;
END;
$$;

CREATE OR REPLACE FUNCTION public.generate_unique_referral_code()
RETURNS TEXT
LANGUAGE plpgsql
VOLATILE
SET search_path = public
AS $$
DECLARE
  code TEXT;
  attempts INT := 0;
BEGIN
  LOOP
    code := public.generate_referral_code_candidate();
    EXIT WHEN NOT EXISTS (
      SELECT 1 FROM public.users u WHERE u.referral_code = code
    );
    attempts := attempts + 1;
    IF attempts > 100 THEN
      RAISE EXCEPTION 'Could not generate unique referral_code after 100 attempts';
    END IF;
  END LOOP;
  RETURN code;
END;
$$;

-- ─── 3. BEFORE INSERT: assign referral_code when omitted ─────────────────────

CREATE OR REPLACE FUNCTION public.users_set_referral_code()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.referral_code IS NULL OR btrim(NEW.referral_code) = '' THEN
    NEW.referral_code := public.generate_unique_referral_code();
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_users_set_referral_code ON public.users;
CREATE TRIGGER trg_users_set_referral_code
  BEFORE INSERT ON public.users
  FOR EACH ROW
  EXECUTE FUNCTION public.users_set_referral_code();

-- ─── 4. Backfill existing rows, then enforce NOT NULL + UNIQUE + index ───────

DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN SELECT id FROM public.users WHERE referral_code IS NULL LOOP
    UPDATE public.users
    SET referral_code = public.generate_unique_referral_code()
    WHERE id = r.id;
  END LOOP;
END;
$$;

ALTER TABLE public.users
  ALTER COLUMN referral_code SET NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_users_referral_code_unique
  ON public.users (referral_code);

-- ─── 5. referral_rewards ledger ─────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.referral_rewards (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  referrer_id UUID NOT NULL REFERENCES public.users (id) ON DELETE CASCADE,
  referred_id UUID NOT NULL REFERENCES public.users (id) ON DELETE CASCADE,
  reward_xp INTEGER NOT NULL DEFAULT 0,
  reward_credited BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT referral_rewards_referrer_not_self CHECK (referrer_id <> referred_id)
);

COMMENT ON TABLE public.referral_rewards IS 'XP rewards for referrals; writes via service role only';

CREATE INDEX IF NOT EXISTS idx_referral_rewards_referrer_id ON public.referral_rewards (referrer_id);
CREATE INDEX IF NOT EXISTS idx_referral_rewards_referred_id ON public.referral_rewards (referred_id);
CREATE INDEX IF NOT EXISTS idx_referral_rewards_created_at ON public.referral_rewards (created_at DESC);

-- ─── 6. RLS: read own rows; service role bypasses RLS for writes ────────────

ALTER TABLE public.referral_rewards ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can read own referral rewards" ON public.referral_rewards;
CREATE POLICY "Users can read own referral rewards" ON public.referral_rewards
  FOR SELECT
  USING (
    auth.uid() = referrer_id
    OR auth.uid() = referred_id
    OR (auth.jwt()->>'role')::text = 'admin'
  );

-- No INSERT/UPDATE/DELETE policies for authenticated users — only service role (bypasses RLS) can write.

-- ============================================================
-- ROLLBACK (manual — run in reverse order as needed)
-- ============================================================
-- DROP POLICY IF EXISTS "Users can read own referral rewards" ON public.referral_rewards;
-- ALTER TABLE public.referral_rewards DISABLE ROW LEVEL SECURITY;
-- DROP TABLE IF EXISTS public.referral_rewards;
-- DROP INDEX IF EXISTS idx_users_referral_code_unique;
-- ALTER TABLE public.users DROP COLUMN IF EXISTS referred_by;
-- ALTER TABLE public.users DROP COLUMN IF EXISTS referral_code;
-- DROP TRIGGER IF EXISTS trg_users_set_referral_code ON public.users;
-- DROP FUNCTION IF EXISTS public.users_set_referral_code();
-- DROP FUNCTION IF EXISTS public.generate_unique_referral_code();
-- DROP FUNCTION IF EXISTS public.generate_referral_code_candidate();
