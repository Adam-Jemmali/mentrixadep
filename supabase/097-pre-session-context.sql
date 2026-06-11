-- Pre-Session Context — Guide-facing student performance cache on session_briefs
ALTER TABLE session_briefs
  ADD COLUMN IF NOT EXISTS guide_context_json jsonb,
  ADD COLUMN IF NOT EXISTS guide_context_cached_at timestamptz;

CREATE INDEX IF NOT EXISTS session_briefs_guide_context_cached_idx
  ON session_briefs (guide_context_cached_at DESC)
  WHERE guide_context_json IS NOT NULL;

-- Guides read briefs for sessions they teach (AI brief + cached context)
DROP POLICY IF EXISTS "tutors_read_session_briefs" ON session_briefs;
CREATE POLICY "tutors_read_session_briefs"
  ON session_briefs FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM sessions s
      WHERE s.id = session_briefs.session_id
        AND s.tutor_id = auth.uid()
    )
  );

COMMENT ON COLUMN session_briefs.guide_context_json IS
  'Cached Guide pre-session context (performance + breakthrough). 6hr TTL.';
