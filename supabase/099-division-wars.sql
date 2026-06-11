-- Division Wars — weekly team events replacing clans (accuracy-based scoring)
-- Run after 098-rank-card.sql

CREATE TABLE IF NOT EXISTS public.division_wars (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  division_a_id uuid NOT NULL REFERENCES public.divisions (id) ON DELETE CASCADE,
  division_b_id uuid NOT NULL REFERENCES public.divisions (id) ON DELETE CASCADE,
  subject text NOT NULL,
  week_start date NOT NULL,
  week_end date NOT NULL,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'completed')),
  winner_division_id uuid REFERENCES public.divisions (id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT division_wars_distinct_divisions CHECK (division_a_id <> division_b_id)
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_division_wars_pair_week
  ON public.division_wars (
    LEAST(division_a_id, division_b_id),
    GREATEST(division_a_id, division_b_id),
    week_start
  );

CREATE INDEX IF NOT EXISTS idx_division_wars_week_status
  ON public.division_wars (week_start, status);

CREATE INDEX IF NOT EXISTS idx_division_wars_division_a
  ON public.division_wars (division_a_id, status);

CREATE INDEX IF NOT EXISTS idx_division_wars_division_b
  ON public.division_wars (division_b_id, status);

COMMENT ON TABLE public.division_wars IS
  'Weekly division-vs-division war. Scored by accuracy points, not quest count.';

CREATE TABLE IF NOT EXISTS public.division_war_contributions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  war_id uuid NOT NULL REFERENCES public.division_wars (id) ON DELETE CASCADE,
  student_id uuid NOT NULL REFERENCES public.users (id) ON DELETE CASCADE,
  division_id uuid NOT NULL REFERENCES public.divisions (id) ON DELETE CASCADE,
  quests_completed int NOT NULL DEFAULT 0 CHECK (quests_completed >= 0),
  total_accuracy_points numeric(10, 2) NOT NULL DEFAULT 0 CHECK (total_accuracy_points >= 0),
  last_updated timestamptz NOT NULL DEFAULT now(),
  UNIQUE (war_id, student_id)
);

CREATE INDEX IF NOT EXISTS idx_division_war_contrib_war_div
  ON public.division_war_contributions (war_id, division_id);

CREATE INDEX IF NOT EXISTS idx_division_war_contrib_student
  ON public.division_war_contributions (student_id, war_id);

COMMENT ON COLUMN public.division_war_contributions.total_accuracy_points IS
  'Sum of quest score percentages during the war week (accuracy-based, not quest spam).';

CREATE TABLE IF NOT EXISTS public.division_war_badges (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.users (id) ON DELETE CASCADE,
  war_id uuid NOT NULL REFERENCES public.division_wars (id) ON DELETE CASCADE,
  division_id uuid NOT NULL REFERENCES public.divisions (id) ON DELETE CASCADE,
  division_name text NOT NULL,
  expires_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, war_id)
);

CREATE INDEX IF NOT EXISTS idx_division_war_badges_user_active
  ON public.division_war_badges (user_id, expires_at DESC);

-- ─── RLS ─────────────────────────────────────────────────────────────────────

ALTER TABLE public.division_wars ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.division_war_contributions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.division_war_badges ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated read division wars" ON public.division_wars;
CREATE POLICY "Authenticated read division wars" ON public.division_wars
  FOR SELECT USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "Authenticated read war contributions" ON public.division_war_contributions;
CREATE POLICY "Authenticated read war contributions" ON public.division_war_contributions
  FOR SELECT USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "Users read own war badges" ON public.division_war_badges;
CREATE POLICY "Users read own war badges" ON public.division_war_badges
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Public read war badges for rank cards" ON public.division_war_badges;
CREATE POLICY "Public read war badges for rank cards" ON public.division_war_badges
  FOR SELECT USING (expires_at > now());

-- ─── Realtime (live war progress) ───────────────────────────────────────────

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'division_war_contributions'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.division_war_contributions;
  END IF;
END $$;
