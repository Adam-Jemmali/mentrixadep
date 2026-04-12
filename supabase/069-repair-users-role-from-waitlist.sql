-- 069: Align public.users with approved registration_requests (approval + role when safe).
--
-- Never set users.role = 'student' when the account is already 'tutor' but RR still says
-- 'student' (legacy guides or bad RR row). That mismatch made Google sign-in overwrite tutors.

UPDATE users u
SET
  role = CASE
    WHEN u.role = 'tutor' AND rr.role = 'student' THEN u.role
    ELSE rr.role
  END,
  approved = true,
  status = 'approved',
  updated_at = NOW()
FROM auth.users au
JOIN registration_requests rr
  ON LOWER(rr.email) = LOWER(au.email)
WHERE
  u.id = au.id
  AND rr.status = 'approved'
  AND rr.role IN ('student', 'tutor')
  AND (
    u.role IS DISTINCT FROM rr.role
    OR u.approved IS DISTINCT FROM true
    OR COALESCE(u.status, 'pending') <> 'approved'
  );
