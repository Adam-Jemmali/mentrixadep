-- P#026: Rank wager in duels — XP only, 10% cap. Never real money.
-- 144 is phase5-long-term — use 165.

CREATE TABLE IF NOT EXISTS public.duel_xp_wagers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  duel_id uuid NOT NULL REFERENCES public.skill_duels (id) ON DELETE CASCADE,
  challenger_id uuid NOT NULL REFERENCES public.users (id) ON DELETE CASCADE,
  opponent_id uuid NOT NULL REFERENCES public.users (id) ON DELETE CASCADE,
  challenger_wager integer NOT NULL CHECK (challenger_wager > 0),
  opponent_wager integer NOT NULL CHECK (opponent_wager > 0),
  status text NOT NULL DEFAULT 'pending' CHECK (
    status IN ('pending', 'accepted', 'rejected', 'settled')
  ),
  winner_id uuid REFERENCES public.users (id) ON DELETE SET NULL,
  settled_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT duel_xp_wagers_duel_unique UNIQUE (duel_id)
);

CREATE INDEX IF NOT EXISTS idx_duel_xp_wagers_status
  ON public.duel_xp_wagers (status)
  WHERE status IN ('pending', 'accepted');

ALTER TABLE public.duel_xp_wagers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS duel_xp_wagers_read_participants ON public.duel_xp_wagers;
CREATE POLICY duel_xp_wagers_read_participants ON public.duel_xp_wagers
  FOR SELECT USING (
    auth.uid() = challenger_id OR auth.uid() = opponent_id
  );

COMMENT ON TABLE public.duel_xp_wagers IS
  'Optional XP stakes on skill duels. Cap floor(total_xp * 0.10); escrow on accept; settle once per duel.';
