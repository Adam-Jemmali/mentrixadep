-- Broadcast INSERT/UPDATE on session_ai_packages so learners can see in-app alerts when a guide publishes.
-- Safe to run once; skips if already part of the publication.

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'session_ai_packages'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.session_ai_packages;
  END IF;
END $$;
