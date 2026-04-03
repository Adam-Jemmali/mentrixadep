-- Student profile: bio, visibility, avatar URL; storage bucket for profile pictures
ALTER TABLE user_settings
  ADD COLUMN IF NOT EXISTS bio TEXT,
  ADD COLUMN IF NOT EXISTS profile_visible_to_tutors BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS avatar_url TEXT;

COMMENT ON COLUMN user_settings.bio IS 'Student public bio (shown when profile is visible to tutors).';
COMMENT ON COLUMN user_settings.profile_visible_to_tutors IS 'When false, only the student and admins can view /student/[id] profile.';
COMMENT ON COLUMN user_settings.avatar_url IS 'Public URL for profile image (Supabase Storage profile-pics bucket).';

INSERT INTO storage.buckets (id, name, public)
VALUES ('profile-pics', 'profile-pics', true)
ON CONFLICT (id) DO UPDATE SET public = EXCLUDED.public;

DROP POLICY IF EXISTS "Profile pictures are publicly readable" ON storage.objects;
CREATE POLICY "Profile pictures are publicly readable"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'profile-pics');

DROP POLICY IF EXISTS "Users upload avatars only under own folder" ON storage.objects;
CREATE POLICY "Users upload avatars only under own folder"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'profile-pics'
    AND split_part(name, '/', 1) = auth.uid()::text
  );

DROP POLICY IF EXISTS "Users update own avatar objects" ON storage.objects;
CREATE POLICY "Users update own avatar objects"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'profile-pics'
    AND split_part(name, '/', 1) = auth.uid()::text
  );

DROP POLICY IF EXISTS "Users delete own avatar objects" ON storage.objects;
CREATE POLICY "Users delete own avatar objects"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'profile-pics'
    AND split_part(name, '/', 1) = auth.uid()::text
  );
