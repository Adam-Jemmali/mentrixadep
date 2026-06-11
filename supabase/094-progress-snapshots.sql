-- Weekly Progress Snapshot — personalized rank + weak-spot conversion emails
CREATE TABLE IF NOT EXISTS progress_snapshots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  snapshot_data jsonb NOT NULL,
  generated_at timestamptz NOT NULL DEFAULT now(),
  email_sent_at timestamptz,
  clicked_at timestamptz
);

CREATE INDEX IF NOT EXISTS idx_progress_snapshots_student_generated
  ON progress_snapshots (student_id, generated_at DESC);

ALTER TABLE progress_snapshots ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Students read own progress snapshots"
  ON progress_snapshots FOR SELECT
  USING (auth.uid() = student_id);

CREATE POLICY "Service role full access progress snapshots"
  ON progress_snapshots FOR ALL
  USING (auth.jwt()->>'role' = 'service_role');
