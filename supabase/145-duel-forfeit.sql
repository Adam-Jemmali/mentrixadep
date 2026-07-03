-- Track who left an active duel so both clients can show a fair walkover result.
ALTER TABLE public.skill_duels
  ADD COLUMN IF NOT EXISTS forfeited_by uuid REFERENCES auth.users(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_skill_duels_forfeited_by
  ON public.skill_duels (forfeited_by)
  WHERE forfeited_by IS NOT NULL;

COMMENT ON COLUMN public.skill_duels.forfeited_by IS
  'Set when a participant leaves an active duel. Opponent wins by walkover.';
