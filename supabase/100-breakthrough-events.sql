-- Breakthrough Moments — detected accuracy jumps, shareable events, adaptive follow-ups
-- Run after 099-division-wars.sql

CREATE TABLE IF NOT EXISTS public.breakthrough_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid NOT NULL REFERENCES public.users (id) ON DELETE CASCADE,
  subject text NOT NULL,
  concept text NOT NULL,
  accuracy_before numeric(5, 2) NOT NULL,
  accuracy_after numeric(5, 2) NOT NULL,
  session_id uuid REFERENCES public.sessions (id) ON DELETE SET NULL,
  triggered_by text NOT NULL DEFAULT 'quest' CHECK (triggered_by IN ('quest', 'session', 'duel')),
  detected_at timestamptz NOT NULL DEFAULT now(),
  shared_at timestamptz
);

CREATE INDEX IF NOT EXISTS idx_breakthrough_events_student
  ON public.breakthrough_events (student_id, detected_at DESC);

CREATE INDEX IF NOT EXISTS idx_breakthrough_events_concept
  ON public.breakthrough_events (student_id, subject, concept, detected_at DESC);

CREATE TABLE IF NOT EXISTS public.breakthrough_quest_queue (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  breakthrough_event_id uuid NOT NULL REFERENCES public.breakthrough_events (id) ON DELETE CASCADE,
  student_id uuid NOT NULL REFERENCES public.users (id) ON DELETE CASCADE,
  subject text NOT NULL,
  topic text NOT NULL,
  target_subtopic text NOT NULL,
  sort_order int NOT NULL CHECK (sort_order BETWEEN 1 AND 3),
  quest_id uuid REFERENCES public.quests (id) ON DELETE SET NULL,
  completed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (breakthrough_event_id, sort_order)
);

CREATE INDEX IF NOT EXISTS idx_breakthrough_quest_queue_student
  ON public.breakthrough_quest_queue (student_id, completed_at);

ALTER TABLE public.breakthrough_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.breakthrough_quest_queue ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Students read own breakthrough events" ON public.breakthrough_events;
CREATE POLICY "Students read own breakthrough events" ON public.breakthrough_events
  FOR SELECT USING (auth.uid() = student_id);

DROP POLICY IF EXISTS "Authenticated read breakthrough events for OG" ON public.breakthrough_events;
CREATE POLICY "Authenticated read breakthrough events for OG" ON public.breakthrough_events
  FOR SELECT USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "Students read own breakthrough quest queue" ON public.breakthrough_quest_queue;
CREATE POLICY "Students read own breakthrough quest queue" ON public.breakthrough_quest_queue
  FOR SELECT USING (auth.uid() = student_id);

COMMENT ON TABLE public.breakthrough_events IS
  'Auto-detected concept breakthroughs (25+ pt accuracy jump after struggle).';

COMMENT ON TABLE public.breakthrough_quest_queue IS
  'Downstream adaptive quests queued after a breakthrough (max 3).';
