-- Test and add auto_approve column if it doesn't exist
-- Run this in Supabase SQL Editor

-- First, check if the column exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_schema = 'public' 
      AND table_name = 'users' 
      AND column_name = 'auto_approve'
  ) THEN
    -- Column doesn't exist, add it
    ALTER TABLE users ADD COLUMN auto_approve BOOLEAN NOT NULL DEFAULT false;
    RAISE NOTICE 'Column auto_approve added successfully';
  ELSE
    RAISE NOTICE 'Column auto_approve already exists';
  END IF;
END $$;

-- Verify the column exists and show its properties
SELECT 
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'users'
  AND column_name = 'auto_approve';

-- Show current values for all users
SELECT 
  id,
  role,
  approved,
  auto_approve,
  created_at
FROM users
ORDER BY role, created_at DESC;

