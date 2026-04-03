-- Studio output: practice exercises, follow-up topics, publish workflow, regenerate cap
-- Run after 004-autopilot-tables.sql

ALTER TABLE session_ai_packages
  ADD COLUMN IF NOT EXISTS practice_exercises JSONB NOT NULL DEFAULT '[]',
  ADD COLUMN IF NOT EXISTS follow_up_topics TEXT[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS studio_regenerate_count INT NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS package_published_at TIMESTAMPTZ;

-- Existing packages were visible to learners; treat as published
UPDATE session_ai_packages
SET package_published_at = COALESCE(package_published_at, created_at)
WHERE package_published_at IS NULL;

DROP POLICY IF EXISTS "Students can view own session AI packages" ON session_ai_packages;
CREATE POLICY "Students can view own session AI packages" ON session_ai_packages
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM sessions s
      WHERE s.id = session_ai_packages.session_id
        AND s.student_id = auth.uid()
    )
    AND package_published_at IS NOT NULL
  );
