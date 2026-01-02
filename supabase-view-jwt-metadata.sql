-- View JWT metadata for all users
-- Run this in Supabase SQL Editor to see the raw_user_meta_data

SELECT 
  id,
  email,
  raw_user_meta_data,
  created_at
FROM auth.users
ORDER BY created_at DESC;

-- View specific user's metadata
-- Replace 'USER_EMAIL' with the actual email
-- SELECT 
--   id,
--   email,
--   raw_user_meta_data->>'role' as role,
--   raw_user_meta_data->>'approved' as approved,
--   raw_user_meta_data
-- FROM auth.users
-- WHERE email = 'USER_EMAIL';

