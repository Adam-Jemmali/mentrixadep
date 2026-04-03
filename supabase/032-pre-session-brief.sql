-- Pre-Session Brief: storage for AI-generated learner briefs.
-- Run after 031-ai-hardening.sql

CREATE TABLE IF NOT EXISTS session_briefs (
  id             uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id     uuid        NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  student_id     uuid        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  -- Payload from Gemini
  likely_coverage    text[]  NOT NULL DEFAULT '{}',
  weak_spots         text[]  NOT NULL DEFAULT '{}',
  warm_up_title      text    NOT NULL DEFAULT '',
  warm_up_prompt     text    NOT NULL DEFAULT '',
  warm_up_hint       text,
  questions_to_ask   text[]  NOT NULL DEFAULT '{}',
  -- Delivery tracking
  email_sent_at  timestamptz,
  created_at     timestamptz NOT NULL DEFAULT now(),
  UNIQUE (session_id)  -- one brief per session
);

CREATE INDEX IF NOT EXISTS session_briefs_student_idx  ON session_briefs (student_id);
CREATE INDEX IF NOT EXISTS session_briefs_session_idx  ON session_briefs (session_id);

-- RLS: students can read their own briefs
ALTER TABLE session_briefs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "students_read_own_briefs"
  ON session_briefs FOR SELECT
  USING (auth.uid() = student_id);

-- Service role writes via server actions / cron.
