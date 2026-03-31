-- ============================================================
-- Mentrixa Database Schema (Complete)
-- Run this FIRST in Supabase SQL Editor
-- ============================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================
-- TABLES
-- ============================================================

-- Users table (extends Supabase auth.users)
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('student', 'tutor', 'admin')),
  approved BOOLEAN NOT NULL DEFAULT false,
  auto_approve BOOLEAN NOT NULL DEFAULT false,
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
  price_per_session INTEGER NOT NULL DEFAULT 2500,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT availability_duration_check CHECK (
    end_time > start_time
    AND (end_time - start_time) >= INTERVAL '15 minutes'
    AND (end_time - start_time) <= INTERVAL '480 minutes'
  ),
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
  status TEXT NOT NULL DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'cancelled', 'completed')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT sessions_duration_check CHECK (
    end_time > start_time
    AND (end_time - start_time) >= INTERVAL '15 minutes'
    AND (end_time - start_time) <= INTERVAL '480 minutes'
  )
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

-- Video rooms table
CREATE TABLE IF NOT EXISTS video_rooms (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  session_id UUID NOT NULL UNIQUE REFERENCES sessions(id) ON DELETE CASCADE,
  room_token TEXT NOT NULL UNIQUE,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL
);

-- Call participants table
CREATE TABLE IF NOT EXISTS call_participants (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  room_id UUID NOT NULL REFERENCES video_rooms(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('student', 'tutor')),
  joined_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  left_at TIMESTAMPTZ,
  CONSTRAINT call_participants_unique_user_room UNIQUE (room_id, user_id)
);

-- Video recordings table
CREATE TABLE IF NOT EXISTS video_recordings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  session_id UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  room_id UUID NOT NULL REFERENCES video_rooms(id) ON DELETE CASCADE,
  tutor_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  storage_path TEXT NOT NULL UNIQUE,
  file_name TEXT NOT NULL,
  file_size BIGINT NOT NULL,
  duration_seconds INTEGER,
  mime_type TEXT NOT NULL DEFAULT 'video/webm',
  started_at TIMESTAMPTZ NOT NULL,
  ended_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- HELPER FUNCTIONS (SECURITY DEFINER - bypass RLS)
-- ============================================================

CREATE OR REPLACE FUNCTION is_approved_tutor(user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM users WHERE id = user_id AND role = 'tutor' AND approved = true
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION is_approved_student(user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM users WHERE id = user_id AND role = 'student' AND approved = true
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION is_admin(user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM users WHERE id = user_id AND role = 'admin' AND approved = true
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION can_student_cancel(session_start TIMESTAMPTZ)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN session_start > NOW() + INTERVAL '60 minutes';
END;
$$ LANGUAGE plpgsql;

-- ============================================================
-- TRIGGERS & TRIGGER FUNCTIONS
-- ============================================================

-- Updated_at auto-update
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_users_updated_at ON users;
CREATE TRIGGER update_users_updated_at
  BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
DROP TRIGGER IF EXISTS update_registration_requests_updated_at ON registration_requests;
CREATE TRIGGER update_registration_requests_updated_at
  BEFORE UPDATE ON registration_requests FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
DROP TRIGGER IF EXISTS update_session_requests_updated_at ON session_requests;
CREATE TRIGGER update_session_requests_updated_at
  BEFORE UPDATE ON session_requests FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Prevent overlapping availability
CREATE OR REPLACE FUNCTION check_availability_overlap()
RETURNS TRIGGER AS $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM availability
    WHERE tutor_id = NEW.tutor_id AND id != NEW.id AND course = NEW.course
      AND (
        (start_time <= NEW.start_time AND end_time > NEW.start_time)
        OR (start_time < NEW.end_time AND end_time >= NEW.end_time)
        OR (start_time >= NEW.start_time AND end_time <= NEW.end_time)
      )
  ) THEN
    RAISE EXCEPTION 'Overlapping availability slots are not allowed';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS prevent_availability_overlap ON availability;
CREATE TRIGGER prevent_availability_overlap
  BEFORE INSERT OR UPDATE ON availability FOR EACH ROW EXECUTE FUNCTION check_availability_overlap();

-- Student cancellation validation
CREATE OR REPLACE FUNCTION validate_student_cancellation()
RETURNS TRIGGER AS $$
DECLARE session_start TIMESTAMPTZ;
BEGIN
  IF NEW.status = 'cancelled' AND OLD.status != 'cancelled' AND NEW.student_id = auth.uid() THEN
    SELECT start_time INTO session_start FROM availability WHERE id = NEW.availability_id;
    IF session_start <= NOW() + INTERVAL '60 minutes' THEN
      RAISE EXCEPTION 'Cannot cancel less than 60 minutes before start';
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS validate_student_cancellation_trigger ON session_requests;
CREATE TRIGGER validate_student_cancellation_trigger
  BEFORE UPDATE ON session_requests FOR EACH ROW EXECUTE FUNCTION validate_student_cancellation();

-- JWT metadata sync
CREATE OR REPLACE FUNCTION update_user_jwt_metadata()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE auth.users SET raw_user_meta_data = jsonb_build_object('role', NEW.role, 'approved', NEW.approved)
  WHERE id = NEW.id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS update_jwt_metadata_on_user_update ON users;
CREATE TRIGGER update_jwt_metadata_on_user_update
  AFTER UPDATE OF role, approved ON users FOR EACH ROW EXECUTE FUNCTION update_user_jwt_metadata();

-- Auto-create user record on auth signup
CREATE OR REPLACE FUNCTION handle_new_user_with_jwt()
RETURNS TRIGGER AS $$
DECLARE user_role TEXT; is_approved BOOLEAN;
BEGIN
  user_role := COALESCE(NEW.raw_user_meta_data->>'role', 'student');
  is_approved := CASE WHEN user_role = 'admin' THEN true ELSE false END;
  INSERT INTO public.users (id, role, approved) VALUES (NEW.id, user_role, is_approved)
  ON CONFLICT (id) DO NOTHING;
  UPDATE auth.users SET raw_user_meta_data = jsonb_build_object('role', user_role, 'approved', is_approved)
  WHERE id = NEW.id;
  IF user_role != 'admin' THEN
    INSERT INTO public.registration_requests (email, role, status) VALUES (NEW.email, user_role, 'pending')
    ON CONFLICT (email) DO UPDATE SET status = 'pending', updated_at = NOW();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION handle_new_user_with_jwt();

-- Auto-complete past sessions
CREATE OR REPLACE FUNCTION auto_complete_sessions()
RETURNS void AS $$
BEGIN
  UPDATE sessions SET completed = true, status = 'completed' WHERE completed = false AND end_time <= NOW() AND status != 'cancelled';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Auto-approve session requests
CREATE OR REPLACE FUNCTION handle_auto_approve_session_request()
RETURNS TRIGGER AS $$
DECLARE
  tutor_auto_approve BOOLEAN; tutor_approved BOOLEAN;
  existing_tutor_session_id UUID; existing_student_session_id UUID;
  avail_start_time TIMESTAMPTZ; avail_end_time TIMESTAMPTZ; avail_course TEXT;
BEGIN
  IF NEW.status != 'pending' THEN RETURN NEW; END IF;
  SELECT auto_approve, approved INTO tutor_auto_approve, tutor_approved FROM users WHERE id = NEW.tutor_id;
  IF tutor_auto_approve = true AND tutor_approved = true THEN
    SELECT start_time, end_time, course INTO avail_start_time, avail_end_time, avail_course
    FROM availability WHERE id = NEW.availability_id;
    IF avail_start_time IS NULL THEN RETURN NEW; END IF;
    SELECT id INTO existing_tutor_session_id FROM sessions WHERE tutor_id = NEW.tutor_id AND start_time = avail_start_time LIMIT 1;
    SELECT id INTO existing_student_session_id FROM sessions WHERE student_id = NEW.student_id AND start_time = avail_start_time LIMIT 1;
    IF existing_tutor_session_id IS NULL AND existing_student_session_id IS NULL THEN
      INSERT INTO sessions (student_id, tutor_id, course, start_time, end_time, completed)
      VALUES (NEW.student_id, NEW.tutor_id, avail_course, avail_start_time, avail_end_time, false);
      DELETE FROM availability WHERE id = NEW.availability_id;
      UPDATE session_requests SET status = 'approved', updated_at = NOW() WHERE id = NEW.id;
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS auto_approve_session_request_trigger ON session_requests;
CREATE TRIGGER auto_approve_session_request_trigger
  AFTER INSERT ON session_requests FOR EACH ROW EXECUTE FUNCTION handle_auto_approve_session_request();

-- Rating validation
CREATE OR REPLACE FUNCTION validate_rating_session()
RETURNS TRIGGER AS $$
DECLARE
  session_completed BOOLEAN;
  session_status TEXT;
BEGIN
  SELECT completed, status INTO session_completed, session_status FROM sessions WHERE id = NEW.session_id;
  IF session_completed IS NULL THEN RAISE EXCEPTION 'Session not found'; END IF;
  IF session_status = 'cancelled' THEN RAISE EXCEPTION 'Cancelled sessions cannot be rated'; END IF;
  IF session_completed = false THEN RAISE EXCEPTION 'Cannot rate incomplete session'; END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS validate_rating_trigger ON ratings;
CREATE TRIGGER validate_rating_trigger
  BEFORE INSERT OR UPDATE ON ratings FOR EACH ROW EXECUTE FUNCTION validate_rating_session();

-- Admin seed helper
CREATE OR REPLACE FUNCTION seed_admin_user(admin_user_id UUID)
RETURNS void AS $$
BEGIN
  INSERT INTO users (id, role, approved) VALUES (admin_user_id, 'admin', true)
  ON CONFLICT (id) DO UPDATE SET role = 'admin', approved = true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================

ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE registration_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE availability ENABLE ROW LEVEL SECURITY;
ALTER TABLE session_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE ratings ENABLE ROW LEVEL SECURITY;
ALTER TABLE video_rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE call_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE video_recordings ENABLE ROW LEVEL SECURITY;

-- Ensure sessions.status exists (for existing DBs created before status was added)
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'scheduled';
UPDATE sessions SET status = 'completed' WHERE completed = true AND status = 'scheduled';
ALTER TABLE sessions DROP CONSTRAINT IF EXISTS sessions_status_check;
ALTER TABLE sessions ADD CONSTRAINT sessions_status_check CHECK (status IN ('scheduled', 'cancelled', 'completed'));

-- USERS
DROP POLICY IF EXISTS "Users can view their own profile" ON users;
CREATE POLICY "Users can view their own profile" ON users FOR SELECT USING (auth.uid() = id);
DROP POLICY IF EXISTS "Users can update their own profile" ON users;
CREATE POLICY "Users can update their own profile" ON users FOR UPDATE USING (auth.uid() = id);
DROP POLICY IF EXISTS "Admins can view all users" ON users;
CREATE POLICY "Admins can view all users" ON users FOR SELECT USING ((auth.jwt()->>'role')::text = 'admin');
DROP POLICY IF EXISTS "Admins can update all users" ON users;
CREATE POLICY "Admins can update all users" ON users FOR UPDATE USING ((auth.jwt()->>'role')::text = 'admin');

-- REGISTRATION REQUESTS
DROP POLICY IF EXISTS "Anyone can create registration requests" ON registration_requests;
CREATE POLICY "Anyone can create registration requests" ON registration_requests FOR INSERT WITH CHECK (true);
DROP POLICY IF EXISTS "Users can view their own registration requests" ON registration_requests;
CREATE POLICY "Users can view their own registration requests" ON registration_requests FOR SELECT
  USING (email = (SELECT email FROM auth.users WHERE id = auth.uid()) OR (auth.jwt()->>'role')::text = 'admin');
DROP POLICY IF EXISTS "Admins can update registration requests" ON registration_requests;
CREATE POLICY "Admins can update registration requests" ON registration_requests FOR UPDATE
  USING ((auth.jwt()->>'role')::text = 'admin');

-- AVAILABILITY
DROP POLICY IF EXISTS "Anyone can view availability" ON availability;
CREATE POLICY "Anyone can view availability" ON availability FOR SELECT USING (true);
DROP POLICY IF EXISTS "Tutors can create their own availability" ON availability;
CREATE POLICY "Tutors can create their own availability" ON availability FOR INSERT
  WITH CHECK (tutor_id = auth.uid() AND (((auth.jwt()->>'role')::text = 'tutor' AND (auth.jwt()->>'approved')::text = 'true') OR is_approved_tutor(auth.uid())));
DROP POLICY IF EXISTS "Tutors can update their own availability" ON availability;
CREATE POLICY "Tutors can update their own availability" ON availability FOR UPDATE
  USING (tutor_id = auth.uid() AND (((auth.jwt()->>'role')::text = 'tutor' AND (auth.jwt()->>'approved')::text = 'true') OR is_approved_tutor(auth.uid())));
DROP POLICY IF EXISTS "Tutors can delete their own availability" ON availability;
CREATE POLICY "Tutors can delete their own availability" ON availability FOR DELETE
  USING (tutor_id = auth.uid() AND (((auth.jwt()->>'role')::text = 'tutor' AND (auth.jwt()->>'approved')::text = 'true') OR is_approved_tutor(auth.uid())));

-- SESSION REQUESTS
DROP POLICY IF EXISTS "Students and tutors can view relevant session requests" ON session_requests;
CREATE POLICY "Students and tutors can view relevant session requests" ON session_requests FOR SELECT
  USING (student_id = auth.uid() OR tutor_id = auth.uid() OR (auth.jwt()->>'role')::text = 'admin');
DROP POLICY IF EXISTS "Students can create session requests" ON session_requests;
CREATE POLICY "Students can create session requests" ON session_requests FOR INSERT
  WITH CHECK (student_id = auth.uid() AND (((auth.jwt()->>'role')::text = 'student' AND (auth.jwt()->>'approved')::text = 'true') OR is_approved_student(auth.uid())));
DROP POLICY IF EXISTS "Tutors can update session requests for their availability" ON session_requests;
CREATE POLICY "Tutors can update session requests for their availability" ON session_requests FOR UPDATE
  USING (tutor_id = auth.uid() AND (((auth.jwt()->>'role')::text = 'tutor' AND (auth.jwt()->>'approved')::text = 'true') OR is_approved_tutor(auth.uid())));
DROP POLICY IF EXISTS "Students can cancel their own session requests" ON session_requests;
CREATE POLICY "Students can cancel their own session requests" ON session_requests FOR UPDATE
  USING (student_id = auth.uid() AND status = 'pending') WITH CHECK ((status = 'cancelled' AND student_id = auth.uid()) OR status != 'cancelled');

-- SESSIONS
DROP POLICY IF EXISTS "Students and tutors can view their sessions" ON sessions;
CREATE POLICY "Students and tutors can view their sessions" ON sessions FOR SELECT
  USING (student_id = auth.uid() OR tutor_id = auth.uid() OR (auth.jwt()->>'role')::text = 'admin');
DROP POLICY IF EXISTS "Tutors can create sessions from approved requests" ON sessions;
CREATE POLICY "Tutors can create sessions from approved requests" ON sessions FOR INSERT
  WITH CHECK (tutor_id = auth.uid() AND (((auth.jwt()->>'role')::text = 'tutor' AND (auth.jwt()->>'approved')::text = 'true') OR is_approved_tutor(auth.uid())));
DROP POLICY IF EXISTS "Tutors can update their sessions" ON sessions;
CREATE POLICY "Tutors can update their sessions" ON sessions FOR UPDATE
  USING (tutor_id = auth.uid() AND (((auth.jwt()->>'role')::text = 'tutor' AND (auth.jwt()->>'approved')::text = 'true') OR is_approved_tutor(auth.uid())));
DROP POLICY IF EXISTS "Students can cancel their sessions" ON sessions;
CREATE POLICY "Students can cancel their sessions" ON sessions FOR UPDATE
  USING (student_id = auth.uid() AND status NOT IN ('cancelled', 'completed')) WITH CHECK (status = 'cancelled');
DROP POLICY IF EXISTS "Tutors can cancel their sessions" ON sessions;
CREATE POLICY "Tutors can cancel their sessions" ON sessions FOR UPDATE
  USING (tutor_id = auth.uid() AND status NOT IN ('cancelled', 'completed')) WITH CHECK (status = 'cancelled');

-- RATINGS
DROP POLICY IF EXISTS "Students and tutors can view ratings for their sessions" ON ratings;
CREATE POLICY "Students and tutors can view ratings for their sessions" ON ratings FOR SELECT
  USING (student_id = auth.uid() OR tutor_id = auth.uid() OR (auth.jwt()->>'role')::text = 'admin');
DROP POLICY IF EXISTS "Students can create ratings for their completed sessions" ON ratings;
CREATE POLICY "Students can create ratings for their completed sessions" ON ratings FOR INSERT
  WITH CHECK (student_id = auth.uid() AND EXISTS (SELECT 1 FROM sessions WHERE id = session_id AND student_id = auth.uid() AND completed = true));
DROP POLICY IF EXISTS "Students can update their own ratings" ON ratings;
CREATE POLICY "Students can update their own ratings" ON ratings FOR UPDATE USING (student_id = auth.uid());

-- VIDEO ROOMS
DROP POLICY IF EXISTS "Users can view video rooms for their sessions" ON video_rooms;
CREATE POLICY "Users can view video rooms for their sessions" ON video_rooms FOR SELECT
  USING (EXISTS (SELECT 1 FROM sessions WHERE sessions.id = video_rooms.session_id
    AND (sessions.student_id = auth.uid() OR sessions.tutor_id = auth.uid() OR is_admin(auth.uid()))));

-- CALL PARTICIPANTS
DROP POLICY IF EXISTS "Users can view their call participation" ON call_participants;
CREATE POLICY "Users can view their call participation" ON call_participants FOR SELECT
  USING (user_id = auth.uid() OR EXISTS (SELECT 1 FROM video_rooms vr JOIN sessions s ON s.id = vr.session_id
    WHERE vr.id = call_participants.room_id AND (s.student_id = auth.uid() OR s.tutor_id = auth.uid())));

-- VIDEO RECORDINGS
DROP POLICY IF EXISTS "Users can view recordings for their sessions" ON video_recordings;
CREATE POLICY "Users can view recordings for their sessions" ON video_recordings FOR SELECT
  USING (EXISTS (SELECT 1 FROM sessions WHERE sessions.id = video_recordings.session_id
    AND (sessions.student_id = auth.uid() OR sessions.tutor_id = auth.uid() OR is_admin(auth.uid()))));

-- ============================================================
-- INDEXES
-- ============================================================

-- Core table indexes
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX IF NOT EXISTS idx_users_approved ON users(approved);
CREATE INDEX IF NOT EXISTS idx_users_role_approved ON users(role, approved) WHERE approved = true;
CREATE INDEX IF NOT EXISTS idx_registration_requests_status ON registration_requests(status);
CREATE INDEX IF NOT EXISTS idx_availability_tutor_id ON availability(tutor_id);
CREATE INDEX IF NOT EXISTS idx_availability_start_time ON availability(start_time);
CREATE INDEX IF NOT EXISTS idx_availability_tutor_time_course ON availability(tutor_id, start_time, course);
CREATE INDEX IF NOT EXISTS idx_session_requests_student_id ON session_requests(student_id);
CREATE INDEX IF NOT EXISTS idx_session_requests_tutor_id ON session_requests(tutor_id);
CREATE INDEX IF NOT EXISTS idx_session_requests_status ON session_requests(status);
CREATE INDEX IF NOT EXISTS idx_session_requests_tutor_status ON session_requests(tutor_id, status);
CREATE INDEX IF NOT EXISTS idx_sessions_student_id ON sessions(student_id);
CREATE INDEX IF NOT EXISTS idx_sessions_tutor_id ON sessions(tutor_id);
CREATE INDEX IF NOT EXISTS idx_sessions_start_time ON sessions(start_time);
CREATE INDEX IF NOT EXISTS idx_sessions_tutor_time ON sessions(tutor_id, start_time DESC);
CREATE INDEX IF NOT EXISTS idx_sessions_student_time ON sessions(student_id, start_time DESC);
CREATE INDEX IF NOT EXISTS idx_sessions_completed ON sessions(completed) WHERE completed = false;
CREATE INDEX IF NOT EXISTS idx_ratings_session_id ON ratings(session_id);
CREATE INDEX IF NOT EXISTS idx_ratings_tutor_id ON ratings(tutor_id);

-- Video/Recording indexes
CREATE INDEX IF NOT EXISTS idx_video_rooms_session_id ON video_rooms(session_id);
CREATE INDEX IF NOT EXISTS idx_video_rooms_room_token ON video_rooms(room_token);
CREATE INDEX IF NOT EXISTS idx_video_rooms_active ON video_rooms(active);
CREATE INDEX IF NOT EXISTS idx_video_rooms_session_active ON video_rooms(session_id, active) WHERE active = true;
CREATE INDEX IF NOT EXISTS idx_call_participants_room_id ON call_participants(room_id);
CREATE INDEX IF NOT EXISTS idx_call_participants_user_id ON call_participants(user_id);
CREATE INDEX IF NOT EXISTS idx_video_recordings_session_id ON video_recordings(session_id);
CREATE INDEX IF NOT EXISTS idx_video_recordings_room_id ON video_recordings(room_id);
CREATE INDEX IF NOT EXISTS idx_video_recordings_tutor_id ON video_recordings(tutor_id);
CREATE INDEX IF NOT EXISTS idx_video_recordings_created_at ON video_recordings(created_at);
CREATE INDEX IF NOT EXISTS idx_video_recordings_session_created ON video_recordings(session_id, created_at DESC);

-- ============================================================
-- MIGRATION: Add sessions.status (run only if sessions already exists without status)
-- ============================================================
-- ALTER TABLE sessions ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'scheduled';
-- UPDATE sessions SET status = 'completed' WHERE completed = true;
-- ALTER TABLE sessions ADD CONSTRAINT sessions_status_check CHECK (status IN ('scheduled', 'cancelled', 'completed'));
-- Then create the two cancel policies (see SESSIONS section above) if not already present.
