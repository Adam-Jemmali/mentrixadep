-- Repair users marked pending/suspended even though waitlist request is already approved.
-- This fixes historical rows where admin approval updated registration_requests but missed users.

UPDATE users u
SET
  approved = true,
  status = 'approved',
  updated_at = NOW()
FROM auth.users au
JOIN registration_requests rr
  ON LOWER(rr.email) = LOWER(au.email)
WHERE
  u.id = au.id
  AND rr.status = 'approved'
  AND (
    u.approved IS DISTINCT FROM true
    OR COALESCE(u.status, 'pending') <> 'approved'
  );
