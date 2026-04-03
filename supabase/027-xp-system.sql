-- XP ledger (idempotent awards), achievements (level-ups), last_activity_at for streak UX
-- Run after 003-quest-tables.sql

-- ─── 1. user_xp: precise last action time (18h at-risk) ───────────────────────

ALTER TABLE public.user_xp
  ADD COLUMN IF NOT EXISTS last_activity_at TIMESTAMPTZ;

-- ─── 2. Idempotent XP awards ────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.xp_award_ledger (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users (id) ON DELETE CASCADE,
  award_key TEXT NOT NULL,
  xp_amount INT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT xp_award_ledger_user_key UNIQUE (user_id, award_key)
);

CREATE INDEX IF NOT EXISTS idx_xp_award_ledger_user_created
  ON public.xp_award_ledger (user_id, created_at DESC);

COMMENT ON TABLE public.xp_award_ledger IS 'One row per logical XP grant; service role inserts';

ALTER TABLE public.xp_award_ledger ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users read own xp award ledger" ON public.xp_award_ledger;
CREATE POLICY "Users read own xp award ledger" ON public.xp_award_ledger
  FOR SELECT USING (auth.uid() = user_id);

-- ─── 3. Achievements (level-up events; client subscribes via Realtime) ─────

CREATE TABLE IF NOT EXISTS public.user_achievements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users (id) ON DELETE CASCADE,
  achievement_type TEXT NOT NULL DEFAULT 'level_up',
  from_level INT,
  to_level INT,
  title TEXT,
  meta JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_user_achievements_user_created
  ON public.user_achievements (user_id, created_at DESC);

COMMENT ON TABLE public.user_achievements IS 'Level-up and milestones; INSERT triggers Realtime for UI';

ALTER TABLE public.user_achievements ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users read own achievements" ON public.user_achievements;
CREATE POLICY "Users read own achievements" ON public.user_achievements
  FOR SELECT USING (auth.uid() = user_id);

-- Enable Realtime for INSERT (run in Supabase SQL if publication exists):
-- ALTER PUBLICATION supabase_realtime ADD TABLE public.user_achievements;
