-- Video Calling Schema for OTAMS
-- Run this in Supabase SQL Editor

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

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_video_rooms_session_id ON video_rooms(session_id);
CREATE INDEX IF NOT EXISTS idx_video_rooms_room_token ON video_rooms(room_token);
CREATE INDEX IF NOT EXISTS idx_video_rooms_active ON video_rooms(active);
CREATE INDEX IF NOT EXISTS idx_call_participants_room_id ON call_participants(room_id);
CREATE INDEX IF NOT EXISTS idx_call_participants_user_id ON call_participants(user_id);

-- Enable RLS
ALTER TABLE video_rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE call_participants ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Users can view video rooms for their sessions
CREATE POLICY "Users can view video rooms for their sessions"
  ON video_rooms FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM sessions
      WHERE sessions.id = video_rooms.session_id
        AND (
          sessions.student_id = auth.uid()
          OR sessions.tutor_id = auth.uid()
          OR EXISTS (
            SELECT 1 FROM users
            WHERE id = auth.uid() AND role = 'admin'
          )
        )
    )
  );

-- RLS Policy: Only system can create video rooms (via service role)
-- Regular users cannot create rooms directly - must use server action

-- RLS Policy: Only system can update video rooms (via service role)

-- RLS Policy: Users can view participants for their sessions
CREATE POLICY "Users can view participants for their sessions"
  ON call_participants FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM video_rooms
      JOIN sessions ON sessions.id = video_rooms.session_id
      WHERE video_rooms.id = call_participants.room_id
        AND (
          sessions.student_id = auth.uid()
          OR sessions.tutor_id = auth.uid()
          OR EXISTS (
            SELECT 1 FROM users
            WHERE id = auth.uid() AND role = 'admin'
          )
        )
    )
  );

-- RLS Policy: Users can insert themselves as participants
CREATE POLICY "Users can join their own sessions"
  ON call_participants FOR INSERT
  WITH CHECK (
    user_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM video_rooms
      JOIN sessions ON sessions.id = video_rooms.session_id
      WHERE video_rooms.id = call_participants.room_id
        AND (
          (sessions.student_id = auth.uid() AND call_participants.role = 'student')
          OR (sessions.tutor_id = auth.uid() AND call_participants.role = 'tutor')
        )
        AND video_rooms.active = true
    )
  );

-- RLS Policy: Users can update their own participant record
CREATE POLICY "Users can update their own participant record"
  ON call_participants FOR UPDATE
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Function to generate secure room token
CREATE OR REPLACE FUNCTION generate_room_token()
RETURNS TEXT AS $$
BEGIN
  RETURN encode(gen_random_bytes(32), 'base64');
END;
$$ LANGUAGE plpgsql;

-- Function to auto-expire video rooms
CREATE OR REPLACE FUNCTION expire_video_rooms()
RETURNS void AS $$
BEGIN
  UPDATE video_rooms
  SET active = false
  WHERE active = true
    AND expires_at <= NOW();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to clean up expired rooms (optional, can be called periodically)
CREATE OR REPLACE FUNCTION cleanup_expired_rooms()
RETURNS void AS $$
BEGIN
  DELETE FROM video_rooms
  WHERE expires_at < NOW() - INTERVAL '1 day';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

