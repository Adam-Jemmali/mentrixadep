-- Queue / sparring matches: both sides must accept before questions are generated.

ALTER TABLE public.skill_duels
  ADD COLUMN IF NOT EXISTS student_ready_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS opponent_ready_at TIMESTAMPTZ;

COMMENT ON COLUMN public.skill_duels.student_ready_at IS
  'Challenger (student_id) accepted the match preview; required before queue/ai_queue duels go active.';
COMMENT ON COLUMN public.skill_duels.opponent_ready_at IS
  'Opponent accepted (human) or bot ready timestamp for ai_queue; required with student_ready_at before activation.';
