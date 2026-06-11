-- Performance indexes (additive only — skips indexes that already exist elsewhere).
--
-- Already present (do not duplicate):
--   idx_sessions_student_status          → 038-performance-indexes-mv.sql
--   idx_division_war_contrib_war_div     → 099-division-wars.sql (war_id, division_id)
--   idx_breakthrough_events_concept      → 100-breakthrough-events.sql (student_id, subject, concept, …)
--   idx_progress_snapshots_student_generated → 094-progress-snapshots.sql
--   guide_impact_scores UNIQUE (guide_id, subject) → 095-guide-impact-score.sql

-- Availability browse: filter active slots by course + upcoming start_time
CREATE INDEX IF NOT EXISTS idx_availability_active_course_start
  ON public.availability (course, start_time)
  WHERE active = true;

-- Student hub: sessions filtered by student + status, ordered by start_time
CREATE INDEX IF NOT EXISTS idx_sessions_student_status_start
  ON public.sessions (student_id, status, start_time DESC);

COMMENT ON INDEX public.idx_availability_active_course_start IS
  'Course availability browse — active slots by course and start_time.';

COMMENT ON INDEX public.idx_sessions_student_status_start IS
  'Student hub session lists — student_id + status with recency sort.';
