-- 072: Preserve admin (and tutor) roles when aligning users with registration_requests.
--
-- Root cause: Migration 068 added an idempotent UPDATE that synced public.users.role from
-- registration_requests for approved waitlist rows. registration_requests.role only allows
-- student|tutor (see table CHECK), so admin accounts typically have RR.role = 'student'.
-- The CASE in 068 kept tutor when RR still said student, but did not exclude admin, so
-- public.users.role was overwritten to 'student'. Sign-in and middleware read public.users.role
-- and call getRoleHomePath(), so admins and some guides were redirected to /student.
--
-- This migration: (1) restores a known admin row, (2) backfills tutors downgraded to student
-- when they still have Guide signals, (3) re-runs the RR alignment UPDATE while excluding
-- users who are already admin so RR can never clobber that role again.

-- 1) Restore admin for the production account (explicit UUID).
UPDATE public.users
SET
  role = 'admin',
  approved = true,
  status = 'approved',
  updated_at = NOW()
WHERE id = '1de6eaeb-bb63-4df3-8da3-15d5f1057bdd'::uuid;

-- 2) Guides incorrectly set to student: keep tutor when Stripe Connect or tutor_courses exist.
UPDATE public.users u
SET
  role = 'tutor',
  updated_at = NOW()
WHERE u.role = 'student'
  AND COALESCE(u.is_blacklisted, false) = false
  AND (
    EXISTS (SELECT 1 FROM public.tutor_courses tc WHERE tc.tutor_id = u.id)
    OR NULLIF(trim(COALESCE(u.stripe_account_id, '')), '') IS NOT NULL
    OR NULLIF(trim(COALESCE(u.stripe_account_id_live, '')), '') IS NOT NULL
    OR NULLIF(trim(COALESCE(u.stripe_account_id_test, '')), '') IS NOT NULL
  );

-- 3) Re-run registration_requests alignment (069-style) but never touch admin rows.
UPDATE public.users u
SET
  role = CASE
    WHEN u.role = 'tutor' AND rr.role = 'student' THEN u.role
    ELSE rr.role
  END,
  approved = true,
  status = 'approved',
  updated_at = NOW()
FROM auth.users au
JOIN public.registration_requests rr
  ON lower(rr.email) = lower(au.email)
WHERE
  u.id = au.id
  AND u.role <> 'admin'
  AND rr.status = 'approved'
  AND rr.role IN ('student', 'tutor')
  AND (
    u.role IS DISTINCT FROM rr.role
    OR u.approved IS DISTINCT FROM true
    OR COALESCE(u.status, 'pending') <> 'approved'
  );
