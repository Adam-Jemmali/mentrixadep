-- ============================================================
-- Seed Admin User
-- ============================================================
-- 1. Create an admin user in Supabase Auth Dashboard (Authentication > Users > Add User)
-- 2. Copy the user's UUID
-- 3. Replace the UUID below with the actual UUID
-- 4. Run this SQL

SELECT seed_admin_user('YOUR_ADMIN_USER_ID_HERE'::UUID);
