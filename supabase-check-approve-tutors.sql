-- Check and approve tutors who have availability
-- Run this in Supabase SQL Editor to see which tutors need approval

-- First, check which tutors have availability but might not be approved
SELECT 
  u.id,
  u.role,
  u.approved,
  COUNT(a.id) as availability_count,
  STRING_AGG(DISTINCT a.course, ', ') as courses
FROM users u
INNER JOIN availability a ON u.id = a.tutor_id
WHERE u.role = 'tutor'
GROUP BY u.id, u.role, u.approved
ORDER BY availability_count DESC;

-- If you see tutors with approved = false, approve them with this:
-- Replace 'TUTOR_ID_HERE' with the actual tutor ID from the query above
-- UPDATE users SET approved = true WHERE id = 'TUTOR_ID_HERE'::UUID AND role = 'tutor';

-- Or approve all tutors who have availability:
UPDATE users 
SET approved = true 
WHERE role = 'tutor' 
  AND id IN (
    SELECT DISTINCT tutor_id FROM availability
  )
  AND approved = false;

-- Verify the update:
SELECT id, role, approved FROM users WHERE role = 'tutor';

