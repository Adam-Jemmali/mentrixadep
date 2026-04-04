-- Per-user list visibility + challenger cancel without deleting the row (opponent still sees the duel).

ALTER TABLE public.skill_duels
  ADD COLUMN IF NOT EXISTS challenger_hidden_at TIMESTAMPTZ NULL,
  ADD COLUMN IF NOT EXISTS opponent_hidden_at TIMESTAMPTZ NULL;

COMMENT ON COLUMN public.skill_duels.challenger_hidden_at IS 'When set, challenger (student_id) hid this duel from their list; row remains for the opponent.';
COMMENT ON COLUMN public.skill_duels.opponent_hidden_at IS 'When set, opponent hid this duel from their list; row remains for the challenger.';

ALTER TABLE public.skill_duels DROP CONSTRAINT IF EXISTS skill_duels_status_check;

ALTER TABLE public.skill_duels
  ADD CONSTRAINT skill_duels_status_check
  CHECK (status IN ('pending', 'active', 'completed', 'declined', 'cancelled'));
