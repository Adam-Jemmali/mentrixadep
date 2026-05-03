-- Realtime for booking hub: learners see new slots without refresh; both roles see session/request updates.
-- Run in Supabase SQL editor or migrations. Skips if already in publication.

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'availability'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.availability;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'session_requests'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.session_requests;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'sessions'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.sessions;
  END IF;
END $$;
