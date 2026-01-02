-- OTAMS Database Schema
-- Run this SQL in your Supabase SQL Editor

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users table (extends Supabase auth.users)
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('student', 'tutor', 'admin')),
  approved BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Registration requests table
CREATE TABLE IF NOT EXISTS registration_requests (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email TEXT NOT NULL UNIQUE,
  role TEXT NOT NULL CHECK (role IN ('student', 'tutor')),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Availability table (tutor availability slots)
CREATE TABLE IF NOT EXISTS availability (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tutor_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  course TEXT NOT NULL,
  start_time TIMESTAMPTZ NOT NULL,
  end_time TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT availability_duration_check CHECK (end_time = start_time + INTERVAL '30 minutes'),
  CONSTRAINT availability_tutor_course_unique UNIQUE (tutor_id, start_time, course)
);

-- Session requests table
CREATE TABLE IF NOT EXISTS session_requests (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  student_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  tutor_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  availability_id UUID NOT NULL REFERENCES availability(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'cancelled')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Sessions table (confirmed tutoring sessions)
CREATE TABLE IF NOT EXISTS sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  student_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  tutor_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  course TEXT NOT NULL,
  start_time TIMESTAMPTZ NOT NULL,
  end_time TIMESTAMPTZ NOT NULL,
  completed BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT sessions_duration_check CHECK (end_time = start_time + INTERVAL '30 minutes')
);

-- Ratings table
CREATE TABLE IF NOT EXISTS ratings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  session_id UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  tutor_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  comment TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT ratings_one_per_session UNIQUE (session_id, student_id)
);

-- Function to check for overlapping availability
CREATE OR REPLACE FUNCTION check_availability_overlap()
RETURNS TRIGGER AS $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM availability
    WHERE tutor_id = NEW.tutor_id
      AND id != NEW.id
      AND course = NEW.course
      AND (
        (start_time <= NEW.start_time AND end_time > NEW.start_time)
        OR (start_time < NEW.end_time AND end_time >= NEW.end_time)
        OR (start_time >= NEW.start_time AND end_time <= NEW.end_time)
      )
  ) THEN
    RAISE EXCEPTION 'Overlapping availability slots are not allowed for the same tutor and course';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to prevent overlapping availability
CREATE TRIGGER prevent_availability_overlap
  BEFORE INSERT OR UPDATE ON availability
  FOR EACH ROW
  EXECUTE FUNCTION check_availability_overlap();

-- Function to check if student can cancel (must be >60 min before start)
CREATE OR REPLACE FUNCTION can_student_cancel(session_start TIMESTAMPTZ)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN session_start > NOW() + INTERVAL '60 minutes';
END;
$$ LANGUAGE plpgsql;

-- Function to validate student cancellation
CREATE OR REPLACE FUNCTION validate_student_cancellation()
RETURNS TRIGGER AS $$
DECLARE
  session_start TIMESTAMPTZ;
BEGIN
  IF NEW.status = 'cancelled' AND OLD.status != 'cancelled' AND NEW.student_id = auth.uid() THEN
    SELECT start_time INTO session_start
    FROM availability
    WHERE id = NEW.availability_id;
    
    IF session_start <= NOW() + INTERVAL '60 minutes' THEN
      RAISE EXCEPTION 'Cannot cancel session less than 60 minutes before start time';
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers for updated_at
CREATE TRIGGER update_users_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_registration_requests_updated_at
  BEFORE UPDATE ON registration_requests
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_session_requests_updated_at
  BEFORE UPDATE ON session_requests
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER validate_student_cancellation_trigger
  BEFORE UPDATE ON session_requests
  FOR EACH ROW
  EXECUTE FUNCTION validate_student_cancellation();

-- Enable Row Level Security on all tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE registration_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE availability ENABLE ROW LEVEL SECURITY;
ALTER TABLE session_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE ratings ENABLE ROW LEVEL SECURITY;

-- RLS Policies for users table
CREATE POLICY "Users can view their own profile"
  ON users FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile"
  ON users FOR UPDATE
  USING (auth.uid() = id);

CREATE POLICY "Admins can view all users"
  ON users FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "Admins can update all users"
  ON users FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- RLS Policies for registration_requests table
CREATE POLICY "Anyone can create registration requests"
  ON registration_requests FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Users can view their own registration requests"
  ON registration_requests FOR SELECT
  USING (
    email = (SELECT email FROM auth.users WHERE id = auth.uid())
    OR EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "Admins can update registration requests"
  ON registration_requests FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- RLS Policies for availability table
CREATE POLICY "Tutors can view all availability"
  ON availability FOR SELECT
  USING (true);

CREATE POLICY "Tutors can create their own availability"
  ON availability FOR INSERT
  WITH CHECK (
    tutor_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid() AND role = 'tutor' AND approved = true
    )
  );

CREATE POLICY "Tutors can update their own availability"
  ON availability FOR UPDATE
  USING (
    tutor_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid() AND role = 'tutor' AND approved = true
    )
  );

CREATE POLICY "Tutors can delete their own availability"
  ON availability FOR DELETE
  USING (
    tutor_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid() AND role = 'tutor' AND approved = true
    )
  );

-- RLS Policies for session_requests table
CREATE POLICY "Students and tutors can view relevant session requests"
  ON session_requests FOR SELECT
  USING (
    student_id = auth.uid()
    OR tutor_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "Students can create session requests"
  ON session_requests FOR INSERT
  WITH CHECK (
    student_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid() AND role = 'student' AND approved = true
    )
  );

CREATE POLICY "Tutors can update session requests for their availability"
  ON session_requests FOR UPDATE
  USING (
    tutor_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid() AND role = 'tutor' AND approved = true
    )
  );

CREATE POLICY "Students can cancel their own session requests"
  ON session_requests FOR UPDATE
  USING (
    student_id = auth.uid()
    AND status = 'pending'
  )
  WITH CHECK (
    (status = 'cancelled' AND student_id = auth.uid())
    OR status != 'cancelled'
  );

-- RLS Policies for sessions table
CREATE POLICY "Students and tutors can view their sessions"
  ON sessions FOR SELECT
  USING (
    student_id = auth.uid()
    OR tutor_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "Tutors can create sessions from approved requests"
  ON sessions FOR INSERT
  WITH CHECK (
    tutor_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid() AND role = 'tutor' AND approved = true
    )
  );

CREATE POLICY "Tutors can update their sessions"
  ON sessions FOR UPDATE
  USING (
    tutor_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid() AND role = 'tutor' AND approved = true
    )
  );

-- RLS Policies for ratings table
CREATE POLICY "Students and tutors can view ratings for their sessions"
  ON ratings FOR SELECT
  USING (
    student_id = auth.uid()
    OR tutor_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "Students can create ratings for their completed sessions"
  ON ratings FOR INSERT
  WITH CHECK (
    student_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM sessions
      WHERE id = session_id
        AND student_id = auth.uid()
        AND completed = true
    )
  );

CREATE POLICY "Students can update their own ratings"
  ON ratings FOR UPDATE
  USING (student_id = auth.uid());

-- Function to handle user creation (called after auth signup)
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  user_role TEXT;
BEGIN
  user_role := COALESCE(NEW.raw_user_meta_data->>'role', 'student');
  
  -- Create user record
  INSERT INTO public.users (id, role, approved)
  VALUES (
    NEW.id,
    user_role,
    CASE WHEN user_role = 'admin' THEN true ELSE false END
  )
  ON CONFLICT (id) DO NOTHING;
  
  -- Create registration request (unless admin)
  IF user_role != 'admin' THEN
    INSERT INTO public.registration_requests (email, role, status)
    VALUES (
      NEW.email,
      user_role,
      'pending'
    )
    ON CONFLICT (email) DO UPDATE SET
      status = 'pending',
      updated_at = NOW();
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to create user record after auth signup
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION handle_new_user();

-- Seed admin user (you'll need to create the auth user first, then update this)
-- Replace 'YOUR_ADMIN_USER_ID' with the actual UUID from auth.users after creating the admin user
-- Or use this function after creating the auth user:

-- First, create the admin user in Supabase Auth Dashboard, then run:
-- INSERT INTO users (id, role, approved)
-- VALUES ('YOUR_ADMIN_USER_ID', 'admin', true)
-- ON CONFLICT (id) DO UPDATE SET role = 'admin', approved = true;

-- Helper function to seed admin (run after creating auth user)
CREATE OR REPLACE FUNCTION seed_admin_user(admin_user_id UUID)
RETURNS void AS $$
BEGIN
  INSERT INTO users (id, role, approved)
  VALUES (admin_user_id, 'admin', true)
  ON CONFLICT (id) DO UPDATE SET role = 'admin', approved = true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX IF NOT EXISTS idx_users_approved ON users(approved);
CREATE INDEX IF NOT EXISTS idx_registration_requests_status ON registration_requests(status);
CREATE INDEX IF NOT EXISTS idx_availability_tutor_id ON availability(tutor_id);
CREATE INDEX IF NOT EXISTS idx_availability_start_time ON availability(start_time);
CREATE INDEX IF NOT EXISTS idx_session_requests_student_id ON session_requests(student_id);
CREATE INDEX IF NOT EXISTS idx_session_requests_tutor_id ON session_requests(tutor_id);
CREATE INDEX IF NOT EXISTS idx_session_requests_status ON session_requests(status);
CREATE INDEX IF NOT EXISTS idx_sessions_student_id ON sessions(student_id);
CREATE INDEX IF NOT EXISTS idx_sessions_tutor_id ON sessions(tutor_id);
CREATE INDEX IF NOT EXISTS idx_sessions_start_time ON sessions(start_time);
CREATE INDEX IF NOT EXISTS idx_ratings_session_id ON ratings(session_id);
CREATE INDEX IF NOT EXISTS idx_ratings_tutor_id ON ratings(tutor_id);

