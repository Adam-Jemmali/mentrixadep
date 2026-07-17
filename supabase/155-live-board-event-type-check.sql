-- Constrain live_board_events.event_type to the four supported Arena feed types.
-- The table was created in 147-live-arena-board.sql without a CHECK; add it now.
-- Run after 154-breakthrough-quest-queue-available-at.sql.

ALTER TABLE public.live_board_events
  DROP CONSTRAINT IF EXISTS live_board_events_event_type_check;

ALTER TABLE public.live_board_events
  ADD CONSTRAINT live_board_events_event_type_check
  CHECK (event_type IN (
    'verified_attempt',
    'rank_advance',
    'breakthrough',
    'division_war_result'
  ));

COMMENT ON CONSTRAINT live_board_events_event_type_check ON public.live_board_events IS
  'Arena feed supports verified_attempt, rank_advance, breakthrough, division_war_result only.';
