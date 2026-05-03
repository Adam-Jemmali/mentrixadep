-- Learners should not see "Study package pending" after the tutor removes the Studio row
-- (deleteStudioPackage). Set on removal; cleared when a new session_ai_packages row is created.

ALTER TABLE sessions
  ADD COLUMN IF NOT EXISTS studio_package_withdrawn_at TIMESTAMPTZ NULL;

COMMENT ON COLUMN sessions.studio_package_withdrawn_at IS
  'Set when the tutor removes the session AI package; student UI must not imply a package is still being prepared. Cleared when a new package row is inserted.';

-- Best-effort backfill: sessions hidden from tutor with no package row (e.g. prior deleteStudioPackage).
UPDATE sessions s
SET studio_package_withdrawn_at = tutor_hidden_at
WHERE studio_package_withdrawn_at IS NULL
  AND tutor_hidden_at IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM session_ai_packages p WHERE p.session_id = s.id
  );
