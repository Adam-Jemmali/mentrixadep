-- Divisions: membership, weekly XP leaderboard, chat, archived weekly winners
-- Run after 027-xp-system.sql

-- ─── 1. Membership (many divisions; focus is user_settings.focused_division_key) ─

CREATE TABLE IF NOT EXISTS public.user_divisions (
  user_id UUID NOT NULL REFERENCES public.users (id) ON DELETE CASCADE,
  division_key TEXT NOT NULL REFERENCES public.divisions (key) ON DELETE CASCADE,
  joined_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, division_key)
);

CREATE INDEX IF NOT EXISTS idx_user_divisions_division ON public.user_divisions (division_key);

COMMENT ON TABLE public.user_divisions IS 'Student membership in subject divisions (Join Division).';

ALTER TABLE public.user_divisions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users read own division memberships" ON public.user_divisions;
CREATE POLICY "Users read own division memberships" ON public.user_divisions
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users insert own division membership" ON public.user_divisions;
CREATE POLICY "Users insert own division membership" ON public.user_divisions
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users delete own division membership" ON public.user_divisions;
CREATE POLICY "Users delete own division membership" ON public.user_divisions
  FOR DELETE USING (auth.uid() = user_id);

-- ─── 2. Weekly XP (UTC week: Monday–Sunday; week_start = Monday date UTC) ─────

CREATE TABLE IF NOT EXISTS public.division_weekly_xp (
  user_id UUID NOT NULL REFERENCES public.users (id) ON DELETE CASCADE,
  division_key TEXT NOT NULL REFERENCES public.divisions (key) ON DELETE CASCADE,
  week_start DATE NOT NULL,
  xp_earned INT NOT NULL DEFAULT 0 CHECK (xp_earned >= 0),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, division_key, week_start)
);

CREATE INDEX IF NOT EXISTS idx_division_weekly_lookup
  ON public.division_weekly_xp (division_key, week_start, xp_earned DESC);

COMMENT ON TABLE public.division_weekly_xp IS 'Per-division XP earned in a UTC calendar week; reset implied by new week_start rows.';

ALTER TABLE public.division_weekly_xp ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated read division weekly xp" ON public.division_weekly_xp;
CREATE POLICY "Authenticated read division weekly xp" ON public.division_weekly_xp
  FOR SELECT USING (auth.uid() IS NOT NULL);

-- Inserts/updates from app service role (server actions) only — no direct client writes
DROP POLICY IF EXISTS "No client writes division weekly xp" ON public.division_weekly_xp;
CREATE POLICY "No client writes division weekly xp" ON public.division_weekly_xp
  FOR INSERT WITH CHECK (false);

DROP POLICY IF EXISTS "No client updates division weekly xp" ON public.division_weekly_xp;
CREATE POLICY "No client updates division weekly xp" ON public.division_weekly_xp
  FOR UPDATE USING (false);

-- ─── 3. Division chat ─────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.division_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  division_key TEXT NOT NULL REFERENCES public.divisions (key) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.users (id) ON DELETE CASCADE,
  body TEXT NOT NULL CHECK (char_length(trim(body)) > 0 AND char_length(body) <= 4000),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_division_messages_division_created
  ON public.division_messages (division_key, created_at DESC);

COMMENT ON TABLE public.division_messages IS 'Lightweight division discussion; members only.';

ALTER TABLE public.division_messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Members read division messages" ON public.division_messages;
CREATE POLICY "Members read division messages" ON public.division_messages
  FOR SELECT USING (
    auth.uid() IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM public.user_divisions ud
      WHERE ud.user_id = auth.uid() AND ud.division_key = division_messages.division_key
    )
  );

DROP POLICY IF EXISTS "Members post division messages" ON public.division_messages;
CREATE POLICY "Members post division messages" ON public.division_messages
  FOR INSERT WITH CHECK (
    auth.uid() = user_id
    AND EXISTS (
      SELECT 1 FROM public.user_divisions ud
      WHERE ud.user_id = auth.uid() AND ud.division_key = division_messages.division_key
    )
  );

-- Optional Realtime: ALTER PUBLICATION supabase_realtime ADD TABLE public.division_messages;

-- ─── 4. Weekly winners archive (top 3 bonus XP granted by cron) ───────────────

CREATE TABLE IF NOT EXISTS public.division_winners (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  week_start DATE NOT NULL,
  division_key TEXT NOT NULL REFERENCES public.divisions (key) ON DELETE CASCADE,
  rank INT NOT NULL CHECK (rank >= 1 AND rank <= 3),
  user_id UUID NOT NULL REFERENCES public.users (id) ON DELETE CASCADE,
  weekly_xp INT NOT NULL DEFAULT 0,
  bonus_xp INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (week_start, division_key, rank),
  UNIQUE (week_start, division_key, user_id)
);

CREATE INDEX IF NOT EXISTS idx_division_winners_week ON public.division_winners (week_start DESC);

COMMENT ON TABLE public.division_winners IS 'Archived top-3 weekly division leaderboard; bonus XP applied via ledger.';

ALTER TABLE public.division_winners ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated read division winners" ON public.division_winners;
CREATE POLICY "Authenticated read division winners" ON public.division_winners
  FOR SELECT USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "No client writes division winners" ON public.division_winners;
CREATE POLICY "No client inserts division winners" ON public.division_winners
  FOR INSERT WITH CHECK (false);

-- ─── 5. Backfill membership from existing division_xp ─────────────────────────

INSERT INTO public.user_divisions (user_id, division_key, joined_at)
SELECT
  ux.user_id,
  elem.key AS division_key,
  now()
FROM public.user_xp ux
CROSS JOIN LATERAL jsonb_each_text(COALESCE(ux.division_xp, '{}'::jsonb)) AS elem(key, val)
WHERE trim(val) ~ '^[0-9]+$' AND trim(val)::numeric > 0
ON CONFLICT (user_id, division_key) DO NOTHING;
