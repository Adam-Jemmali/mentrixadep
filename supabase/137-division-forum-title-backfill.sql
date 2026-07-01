-- Fix 136 ordering: backfill legacy flat messages before thread title constraint.

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

ALTER TABLE public.division_messages
  DROP CONSTRAINT IF EXISTS division_messages_thread_title_check;

ALTER TABLE public.division_messages
  ADD CONSTRAINT division_messages_thread_title_check
  CHECK (
    (parent_id IS NULL AND title IS NOT NULL AND char_length(trim(title)) BETWEEN 1 AND 120)
    OR (parent_id IS NOT NULL AND title IS NULL)
  );
