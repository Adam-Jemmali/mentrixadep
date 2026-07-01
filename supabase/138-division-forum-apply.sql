-- Idempotent league forum schema. Run this if 136/137 failed partway or 137 was run without 136.

-- 1) Columns
ALTER TABLE public.division_messages
  ADD COLUMN IF NOT EXISTS parent_id UUID,
  ADD COLUMN IF NOT EXISTS thread_id UUID,
  ADD COLUMN IF NOT EXISTS title TEXT,
  ADD COLUMN IF NOT EXISTS image_path TEXT;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'division_messages'
      AND column_name = 'image_status'
  ) THEN
    ALTER TABLE public.division_messages
      ADD COLUMN image_status TEXT NOT NULL DEFAULT 'none';
  END IF;
END $$;

UPDATE public.division_messages
SET image_status = 'none'
WHERE image_status IS NULL;

ALTER TABLE public.division_messages
  ALTER COLUMN image_status SET DEFAULT 'none';

ALTER TABLE public.division_messages
  ALTER COLUMN image_status SET NOT NULL;

-- 2) Self-referential FKs (only if missing)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'division_messages_parent_id_fkey'
  ) THEN
    ALTER TABLE public.division_messages
      ADD CONSTRAINT division_messages_parent_id_fkey
      FOREIGN KEY (parent_id) REFERENCES public.division_messages (id) ON DELETE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'division_messages_thread_id_fkey'
  ) THEN
    ALTER TABLE public.division_messages
      ADD CONSTRAINT division_messages_thread_id_fkey
      FOREIGN KEY (thread_id) REFERENCES public.division_messages (id) ON DELETE CASCADE;
  END IF;
END $$;

-- 3) Backfill legacy flat messages BEFORE title constraint
UPDATE public.division_messages
SET
  thread_id = COALESCE(thread_id, id),
  title = COALESCE(
    NULLIF(left(trim(title), 120), ''),
    NULLIF(left(trim(body), 120), ''),
    'League discussion'
  )
WHERE parent_id IS NULL;

UPDATE public.division_messages
SET title = NULL
WHERE parent_id IS NOT NULL;

-- 4) Constraints
ALTER TABLE public.division_messages
  DROP CONSTRAINT IF EXISTS division_messages_image_status_check;

ALTER TABLE public.division_messages
  ADD CONSTRAINT division_messages_image_status_check
  CHECK (image_status IN ('none', 'approved', 'pending', 'rejected'));

ALTER TABLE public.division_messages
  DROP CONSTRAINT IF EXISTS division_messages_body_check;

ALTER TABLE public.division_messages
  ADD CONSTRAINT division_messages_body_check
  CHECK (
    char_length(body) <= 4000
    AND (
      char_length(trim(body)) > 0
      OR (image_path IS NOT NULL AND image_status = 'approved')
    )
  );

ALTER TABLE public.division_messages
  DROP CONSTRAINT IF EXISTS division_messages_thread_title_check;

ALTER TABLE public.division_messages
  ADD CONSTRAINT division_messages_thread_title_check
  CHECK (
    (parent_id IS NULL AND title IS NOT NULL AND char_length(trim(title)) BETWEEN 1 AND 120)
    OR (parent_id IS NOT NULL AND title IS NULL)
  );

-- 5) Indexes
CREATE INDEX IF NOT EXISTS idx_division_messages_thread_created
  ON public.division_messages (division_key, thread_id, created_at ASC);

CREATE INDEX IF NOT EXISTS idx_division_messages_parent
  ON public.division_messages (parent_id)
  WHERE parent_id IS NOT NULL;

COMMENT ON COLUMN public.division_messages.parent_id IS 'Null for thread root; set for replies.';
COMMENT ON COLUMN public.division_messages.thread_id IS 'Root message id for thread grouping.';
COMMENT ON COLUMN public.division_messages.title IS 'Thread title (root posts only).';
COMMENT ON COLUMN public.division_messages.image_path IS 'Private storage path for league screenshot.';
COMMENT ON COLUMN public.division_messages.image_status IS 'Screenshot moderation state.';

-- 6) Private screenshot bucket
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'division-discussion',
  'division-discussion',
  false,
  5242880,
  ARRAY['image/jpeg', 'image/png']::text[]
)
ON CONFLICT (id) DO UPDATE
SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;
