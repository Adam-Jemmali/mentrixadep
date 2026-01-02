-- Seed Admin User
-- Instructions:
-- 1. Create an admin user in Supabase Auth Dashboard (Authentication > Users > Add User)
-- 2. Copy the user's UUID
-- 3. Replace 'YOUR_ADMIN_USER_ID' below with the actual UUID
-- 4. Run this SQL

-- Option 1: Using the helper function
SELECT seed_admin_user('1de6eaeb-bb63-4df3-8da3-15d5f1057bdd'::UUID);

-- Option 2: Direct insert (if user already exists in auth.users)
-- INSERT INTO users (id, role, approved)
-- VALUES ('YOUR_ADMIN_USER_ID'::UUID, 'admin', true)
-- ON CONFLICT (id) DO UPDATE SET role = 'admin', approved = true;

