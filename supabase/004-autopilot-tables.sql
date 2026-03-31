-- ============================================================
-- Auto-Pilot: session AI packages (summaries, flashcards, follow-up quests)
-- Run after 001-schema.sql in Supabase SQL Editor
-- ============================================================

-- ============================================================
-- TABLE
-- ============================================================

CREATE TABLE IF NOT EXISTS session_ai_packages (
  session_id UUID PRIMARY KEY REFERENCES sessions(id) ON DELETE CASCADE,
  summary TEXT,
  key_points TEXT[],
  followup_quests JSONB NOT NULL DEFAULT '[]',
  flashcards JSONB NOT NULL DEFAULT '[]',
  generated_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- TRIGGER (updated_at)
-- ============================================================

-- Uses update_updated_at_column() from 001-schema.sql
DROP TRIGGER IF EXISTS update_session_ai_packages_updated_at ON session_ai_packages;
CREATE TRIGGER update_session_ai_packages_updated_at
  BEFORE UPDATE ON session_ai_packages FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================

ALTER TABLE session_ai_packages ENABLE ROW LEVEL SECURITY;

-- Students can SELECT their own sessions' packages
DROP POLICY IF EXISTS "Students can view own session AI packages" ON session_ai_packages;
CREATE POLICY "Students can view own session AI packages" ON session_ai_packages
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM sessions s
      WHERE s.id = session_ai_packages.session_id
        AND s.student_id = auth.uid()
    )
  );

-- Tutors can SELECT and UPDATE their own sessions' packages
DROP POLICY IF EXISTS "Tutors can view own session AI packages" ON session_ai_packages;
CREATE POLICY "Tutors can view own session AI packages" ON session_ai_packages
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM sessions s
      WHERE s.id = session_ai_packages.session_id
        AND s.tutor_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Tutors can update own session AI packages" ON session_ai_packages;
CREATE POLICY "Tutors can update own session AI packages" ON session_ai_packages
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM sessions s
      WHERE s.id = session_ai_packages.session_id
        AND s.tutor_id = auth.uid()
    )
  );

-- INSERT: admin client only (no policy)

-- ============================================================
-- INDEXES
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_session_ai_packages_generated_by ON session_ai_packages(generated_by);
CREATE INDEX IF NOT EXISTS idx_session_ai_packages_created_at ON session_ai_packages(created_at);
