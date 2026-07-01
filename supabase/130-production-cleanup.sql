-- PROMPT 009: Production cleanup — privacy liability and orphaned tables.
-- Run after 129-student-goals.sql
--
-- Pre-apply verification (expect 0 rows for orphaned tables):
--   SELECT COUNT(*) FROM student_diagnostic_profiles WHERE created_at > now() - interval '30 days';
--   SELECT COUNT(*) FROM session_bundles WHERE created_at > now() - interval '30 days';
--
-- duel_queue is intentionally retained: live matchmaking via duel_queue_join_and_match
-- (src/features/duels/duel-queue.ts, student/duel/page.tsx).

DROP TABLE IF EXISTS public.telemetry_logs CASCADE;

DROP TABLE IF EXISTS public.student_diagnostic_profiles CASCADE;

DROP TABLE IF EXISTS public.session_bundles CASCADE;
