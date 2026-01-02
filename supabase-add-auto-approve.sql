-- Add auto_approve column to users table for tutors
-- Run this in Supabase SQL Editor

-- Check if column exists first
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_schema = 'public' 
      AND table_name = 'users' 
      AND column_name = 'auto_approve'
  ) THEN
    ALTER TABLE users ADD COLUMN auto_approve BOOLEAN NOT NULL DEFAULT false;
    RAISE NOTICE 'Column auto_approve added successfully';
  ELSE
    RAISE NOTICE 'Column auto_approve already exists';
  END IF;
END $$;

-- Verify it was added
SELECT 
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'users'
  AND column_name = 'auto_approve';

