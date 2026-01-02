-- Fix RLS policy to ensure users can always query their own record during login
-- This ensures the login process works correctly

-- Drop and recreate the policy to ensure it works correctly
DROP POLICY IF EXISTS "Users can view their own profile" ON users;

CREATE POLICY "Users can view their own profile"
  ON users FOR SELECT
  USING (auth.uid() = id);

-- Also ensure the admin policy works
DROP POLICY IF EXISTS "Admins can view all users" ON users;

CREATE POLICY "Admins can view all users"
  ON users FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid() AND role = 'admin' AND approved = true
    )
  );

-- Verify the user exists and can be queried
-- Run this to test:
-- SELECT id, role, approved FROM users WHERE id = '1de6eaeb-bb63-4df3-8da3-15d5f1057bdd'::UUID;

