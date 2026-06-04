-- Diagnostic onboarding profiles: stores student quiz answers and AI-generated study plans
-- Safe to re-run (idempotent policies).

CREATE TABLE IF NOT EXISTS student_diagnostic_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  subject text NOT NULL,
  goal text NOT NULL CHECK (goal IN ('exam', 'interview', 'assignment', 'general')),
  timeline text NOT NULL CHECK (timeline IN ('this_week', 'this_month', 'this_semester', 'no_deadline')),
  self_rating smallint NOT NULL CHECK (self_rating BETWEEN 1 AND 5),
  weak_areas text,
  hours_per_week smallint NOT NULL CHECK (hours_per_week BETWEEN 1 AND 40),
  preferred_style text NOT NULL CHECK (preferred_style IN ('visual', 'practice', 'reading', 'mixed')),
  study_plan jsonb NOT NULL DEFAULT '[]'::jsonb,
  first_practice_prompt text,
  completed_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT uq_student_diagnostic UNIQUE (student_id)
);

CREATE INDEX IF NOT EXISTS idx_diagnostic_student ON student_diagnostic_profiles(student_id);

ALTER TABLE student_diagnostic_profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Students can read own diagnostic profile" ON student_diagnostic_profiles;
DROP POLICY IF EXISTS "Service role full access to diagnostic profiles" ON student_diagnostic_profiles;

CREATE POLICY "Students can read own diagnostic profile"
  ON student_diagnostic_profiles FOR SELECT
  USING (auth.uid() = student_id);

-- Inserts/updates from the app use the service role (bypasses RLS). Students read their own row.
