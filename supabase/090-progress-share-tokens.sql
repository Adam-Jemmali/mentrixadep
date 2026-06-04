-- Progress share tokens: allow students to create shareable progress report links
CREATE TABLE IF NOT EXISTS progress_share_tokens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token text NOT NULL UNIQUE,
  expires_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT uq_progress_share_student UNIQUE (student_id)
);

CREATE INDEX IF NOT EXISTS idx_progress_share_token ON progress_share_tokens(token);

ALTER TABLE progress_share_tokens ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Students can manage own share tokens"
  ON progress_share_tokens FOR ALL
  USING (auth.uid() = student_id);

CREATE POLICY "Service role full access to share tokens"
  ON progress_share_tokens FOR ALL
  USING (auth.jwt()->>'role' = 'service_role');

CREATE POLICY "Anyone can read by token for public share links"
  ON progress_share_tokens FOR SELECT
  USING (true);
