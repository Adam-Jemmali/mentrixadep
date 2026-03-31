-- ============================================================
-- Course Expertise & Student Course Interests
-- Tutors declare courses they can teach (with proof).
-- Students declare courses they need help with.
-- Admins verify tutor expertise.
-- ============================================================

-- Tutor courses (expertise declarations)
CREATE TABLE IF NOT EXISTS tutor_courses (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tutor_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  course_name TEXT NOT NULL,
  proof_description TEXT NOT NULL DEFAULT '',
  verified BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT tutor_courses_unique UNIQUE (tutor_id, course_name)
);

-- Student courses (interest declarations)
CREATE TABLE IF NOT EXISTS student_courses (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  student_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  course_name TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT student_courses_unique UNIQUE (student_id, course_name)
);

-- ============================================================
-- RLS
-- ============================================================

ALTER TABLE tutor_courses ENABLE ROW LEVEL SECURITY;
ALTER TABLE student_courses ENABLE ROW LEVEL SECURITY;

-- tutor_courses: tutors manage own rows
CREATE POLICY "Tutors can read own courses"
  ON tutor_courses FOR SELECT
  USING (tutor_id = auth.uid());

CREATE POLICY "Tutors can insert own courses"
  ON tutor_courses FOR INSERT
  WITH CHECK (tutor_id = auth.uid());

CREATE POLICY "Tutors can delete own courses"
  ON tutor_courses FOR DELETE
  USING (tutor_id = auth.uid());

-- tutor_courses: admins full access
CREATE POLICY "Admins can read all tutor courses"
  ON tutor_courses FOR SELECT
  USING ((auth.jwt()->>'role')::text = 'admin');

CREATE POLICY "Admins can update tutor courses"
  ON tutor_courses FOR UPDATE
  USING ((auth.jwt()->>'role')::text = 'admin');

CREATE POLICY "Admins can delete tutor courses"
  ON tutor_courses FOR DELETE
  USING ((auth.jwt()->>'role')::text = 'admin');

-- tutor_courses: students can read all (to see tutor qualifications)
CREATE POLICY "Students can read tutor courses"
  ON tutor_courses FOR SELECT
  USING ((auth.jwt()->>'role')::text = 'student');

-- student_courses: students manage own rows
CREATE POLICY "Students can read own courses"
  ON student_courses FOR SELECT
  USING (student_id = auth.uid());

CREATE POLICY "Students can insert own courses"
  ON student_courses FOR INSERT
  WITH CHECK (student_id = auth.uid());

CREATE POLICY "Students can delete own courses"
  ON student_courses FOR DELETE
  USING (student_id = auth.uid());

-- student_courses: admins can read all
CREATE POLICY "Admins can read all student courses"
  ON student_courses FOR SELECT
  USING ((auth.jwt()->>'role')::text = 'admin');

-- ============================================================
-- INDEXES
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_tutor_courses_tutor_id ON tutor_courses(tutor_id);
CREATE INDEX IF NOT EXISTS idx_tutor_courses_course_name ON tutor_courses(course_name);
CREATE INDEX IF NOT EXISTS idx_tutor_courses_verified ON tutor_courses(verified);
CREATE INDEX IF NOT EXISTS idx_tutor_courses_tutor_verified ON tutor_courses(tutor_id, verified);
CREATE INDEX IF NOT EXISTS idx_student_courses_student_id ON student_courses(student_id);
CREATE INDEX IF NOT EXISTS idx_student_courses_course_name ON student_courses(course_name);
