-- Optional cleanup if an older 088 created a redundant service_role policy.
DROP POLICY IF EXISTS "Service role full access to diagnostic profiles" ON student_diagnostic_profiles;
