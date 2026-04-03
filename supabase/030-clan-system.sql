-- Clan expansion: profile fields, join modes, chat, weekly challenge, clan wars (future).
-- Run after 029-duel-matchmaking-realtime.sql

-- ─── 1. Extend clans ─────────────────────────────────────────────────────────

ALTER TABLE public.clans
  ADD COLUMN IF NOT EXISTS description TEXT
    CHECK (description IS NULL OR char_length(btrim(description)) <= 500);

ALTER TABLE public.clans
  ADD COLUMN IF NOT EXISTS focus_division_key TEXT
    REFERENCES public.divisions(key);

ALTER TABLE public.clans
  ADD COLUMN IF NOT EXISTS join_mode TEXT NOT NULL DEFAULT 'open'
    CHECK (join_mode IN ('open', 'approval'));

ALTER TABLE public.clans
  ADD COLUMN IF NOT EXISTS is_public BOOLEAN NOT NULL DEFAULT true;

ALTER TABLE public.clans
  ADD COLUMN IF NOT EXISTS avatar_kind TEXT NOT NULL DEFAULT 'preset'
    CHECK (avatar_kind IN ('preset', 'custom'));

ALTER TABLE public.clans
  ADD COLUMN IF NOT EXISTS avatar_preset_key TEXT;

ALTER TABLE public.clans
  ADD COLUMN IF NOT EXISTS avatar_url TEXT;

ALTER TABLE public.clans
  ADD COLUMN IF NOT EXISTS xp_total BIGINT NOT NULL DEFAULT 0;

COMMENT ON COLUMN public.clans.join_mode IS 'open: anyone with code can join; approval: leader approves join requests.';
COMMENT ON COLUMN public.clans.is_public IS 'Listed in clan search for learners.';
COMMENT ON COLUMN public.clans.xp_total IS 'Lifetime clan XP pool (bonuses and future systems).';

-- Case-insensitive unique name
CREATE UNIQUE INDEX IF NOT EXISTS clans_name_unique_ci
  ON public.clans (lower(btrim(name)));

-- Invite codes: 6 chars for new (existing 8-char rows remain valid)
ALTER TABLE public.clans DROP CONSTRAINT IF EXISTS clans_invite_code_len;
ALTER TABLE public.clans
  ADD CONSTRAINT clans_invite_code_len
  CHECK (char_length(invite_code) >= 6 AND char_length(invite_code) <= 10);

-- ─── 2. Join requests (approval mode) ───────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.clan_join_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clan_id UUID NOT NULL REFERENCES public.clans(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'approved', 'rejected')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  resolved_at TIMESTAMPTZ
);

CREATE UNIQUE INDEX IF NOT EXISTS clan_join_requests_one_pending
  ON public.clan_join_requests (clan_id, user_id)
  WHERE status = 'pending';

CREATE INDEX IF NOT EXISTS idx_clan_join_requests_clan
  ON public.clan_join_requests (clan_id, status);

-- ─── 3. Clan chat ───────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.clan_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clan_id UUID NOT NULL REFERENCES public.clans(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  body TEXT NOT NULL CHECK (char_length(btrim(body)) BETWEEN 1 AND 2000),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_clan_messages_clan_created
  ON public.clan_messages (clan_id, created_at DESC);

-- ─── 4. Weekly collective quest challenge ───────────────────────────────────

CREATE TABLE IF NOT EXISTS public.clan_weekly_challenge (
  clan_id UUID NOT NULL REFERENCES public.clans(id) ON DELETE CASCADE,
  week_start DATE NOT NULL,
  quests_completed INT NOT NULL DEFAULT 0 CHECK (quests_completed >= 0),
  bonus_awarded_at TIMESTAMPTZ,
  bonus_xp INT NOT NULL DEFAULT 2000,
  quest_target INT NOT NULL DEFAULT 20,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (clan_id, week_start)
);

COMMENT ON TABLE public.clan_weekly_challenge IS 'Tracks clan-wide quest completions for weekly bonus XP.';

-- ─── 5. Clan wars (future UI) ───────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.clan_wars (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clan_a_id UUID NOT NULL REFERENCES public.clans(id) ON DELETE CASCADE,
  clan_b_id UUID NOT NULL REFERENCES public.clans(id) ON DELETE CASCADE,
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  ends_at TIMESTAMPTZ NOT NULL,
  clan_a_xp BIGINT NOT NULL DEFAULT 0,
  clan_b_xp BIGINT NOT NULL DEFAULT 0,
  winner_clan_id UUID REFERENCES public.clans(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'scheduled'
    CHECK (status IN ('scheduled', 'active', 'completed', 'cancelled')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT clan_wars_distinct CHECK (clan_a_id <> clan_b_id)
);

CREATE INDEX IF NOT EXISTS idx_clan_wars_clan_a ON public.clan_wars (clan_a_id, status);
CREATE INDEX IF NOT EXISTS idx_clan_wars_clan_b ON public.clan_wars (clan_b_id, status);

COMMENT ON TABLE public.clan_wars IS 'Two-clan competition by XP over a window; UI pending.';

-- ─── 6. Member cap (20) ─────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.fn_clan_member_cap()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  n INT;
BEGIN
  SELECT COUNT(*)::INT INTO n FROM public.clan_members WHERE clan_id = NEW.clan_id;
  IF n >= 20 THEN
    RAISE EXCEPTION 'clan_full' USING ERRCODE = '23514';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS tr_clan_member_cap ON public.clan_members;
CREATE TRIGGER tr_clan_member_cap
  BEFORE INSERT ON public.clan_members
  FOR EACH ROW
  EXECUTE PROCEDURE public.fn_clan_member_cap();

-- ─── 7. RLS: clans readable if public or member ─────────────────────────────

DROP POLICY IF EXISTS "Users read own clan" ON public.clans;
CREATE POLICY "Students read clans public or member"
  ON public.clans FOR SELECT
  TO authenticated
  USING (
    is_public = true
    OR id IN (SELECT clan_id FROM public.clan_members WHERE user_id = auth.uid())
  );

-- Leaders update their clan (avatar, settings)
DROP POLICY IF EXISTS "Clan leaders update clan" ON public.clans;
CREATE POLICY "Clan leaders update clan"
  ON public.clans FOR UPDATE
  TO authenticated
  USING (leader_id = auth.uid())
  WITH CHECK (leader_id = auth.uid());

ALTER TABLE public.clan_join_requests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users see own join requests" ON public.clan_join_requests;
CREATE POLICY "Users see own join requests"
  ON public.clan_join_requests FOR SELECT
  TO authenticated
  USING (
    user_id = auth.uid()
    OR clan_id IN (SELECT clan_id FROM public.clan_members WHERE user_id = auth.uid() AND role = 'leader')
  );

DROP POLICY IF EXISTS "Users insert join requests" ON public.clan_join_requests;
CREATE POLICY "Users insert join requests"
  ON public.clan_join_requests FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Leaders resolve join requests" ON public.clan_join_requests;
CREATE POLICY "Leaders resolve join requests"
  ON public.clan_join_requests FOR UPDATE
  TO authenticated
  USING (
    clan_id IN (SELECT clan_id FROM public.clan_members WHERE user_id = auth.uid() AND role = 'leader')
  );

ALTER TABLE public.clan_messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Clan members read messages" ON public.clan_messages;
CREATE POLICY "Clan members read messages"
  ON public.clan_messages FOR SELECT
  TO authenticated
  USING (
    clan_id IN (SELECT clan_id FROM public.clan_members WHERE user_id = auth.uid())
  );

DROP POLICY IF EXISTS "Clan members post messages" ON public.clan_messages;
CREATE POLICY "Clan members post messages"
  ON public.clan_messages FOR INSERT
  TO authenticated
  WITH CHECK (
    user_id = auth.uid()
    AND clan_id IN (SELECT clan_id FROM public.clan_members WHERE user_id = auth.uid())
  );

ALTER TABLE public.clan_weekly_challenge ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Clan members read weekly challenge" ON public.clan_weekly_challenge;
CREATE POLICY "Clan members read weekly challenge"
  ON public.clan_weekly_challenge FOR SELECT
  TO authenticated
  USING (
    clan_id IN (SELECT clan_id FROM public.clan_members WHERE user_id = auth.uid())
  );

ALTER TABLE public.clan_wars ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Clan members read wars" ON public.clan_wars;
CREATE POLICY "Clan members read wars"
  ON public.clan_wars FOR SELECT
  TO authenticated
  USING (
    clan_a_id IN (SELECT clan_id FROM public.clan_members WHERE user_id = auth.uid())
    OR clan_b_id IN (SELECT clan_id FROM public.clan_members WHERE user_id = auth.uid())
  );

-- Realtime (run in SQL if needed):
-- ALTER PUBLICATION supabase_realtime ADD TABLE public.clan_messages;

-- ─── 8. Storage bucket for custom clan avatars ────────────────────────────────

INSERT INTO storage.buckets (id, name, public)
VALUES ('clan-avatars', 'clan-avatars', true)
ON CONFLICT (id) DO NOTHING;
