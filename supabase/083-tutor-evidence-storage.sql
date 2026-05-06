-- Tutor proficiency evidence uploads (PDF/JPG/PNG) reviewed by admins

INSERT INTO storage.buckets (id, name, public)
VALUES ('tutor-evidence', 'tutor-evidence', true)
ON CONFLICT (id) DO UPDATE SET public = EXCLUDED.public;

DROP POLICY IF EXISTS "Tutor evidence is publicly readable" ON storage.objects;
CREATE POLICY "Tutor evidence is publicly readable"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'tutor-evidence');
