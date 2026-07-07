-- Live Arena Board: Supabase Realtime INSERT stream for public /arena feed.
-- Run after 147-live-arena-board.sql

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'live_board_events'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.live_board_events;
  END IF;
END $$;
