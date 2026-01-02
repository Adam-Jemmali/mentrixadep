-- Verify auto_approve column was added successfully
-- This should return the column information

SELECT 
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'users'
  AND column_name = 'auto_approve';

-- View current auto_approve settings for all tutors
SELECT 
  id,
  role,
  approved,
  auto_approve,
  created_at
FROM users
WHERE role = 'tutor'
ORDER BY created_at DESC;

