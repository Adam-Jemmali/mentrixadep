  -- Resolve feature foundation: intake persistence, feedback loop, and study notes

  CREATE TABLE IF NOT EXISTS public.resolve_problems (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    subject TEXT NOT NULL,
    problem_text TEXT NOT NULL,
    image_url TEXT,
    difficulty TEXT NOT NULL CHECK (
      difficulty IN (
        'no_idea',
        'concept_but_stuck',
        'minor_confusion'
      )
    ),
    ai_response JSONB,
    was_helpful BOOLEAN,
    tutor_escalated BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  );

  CREATE INDEX IF NOT EXISTS resolve_problems_user_created_idx
    ON public.resolve_problems(user_id, created_at DESC);

  CREATE INDEX IF NOT EXISTS resolve_problems_subject_idx
    ON public.resolve_problems(subject);

  CREATE INDEX IF NOT EXISTS resolve_problems_ai_response_gin_idx
    ON public.resolve_problems USING GIN (ai_response);

  ALTER TABLE public.resolve_problems ENABLE ROW LEVEL SECURITY;

  DROP POLICY IF EXISTS "resolve_problems_select_own" ON public.resolve_problems;
  CREATE POLICY "resolve_problems_select_own"
    ON public.resolve_problems FOR SELECT
    USING (auth.uid() = user_id);

  DROP POLICY IF EXISTS "resolve_problems_insert_own" ON public.resolve_problems;
  CREATE POLICY "resolve_problems_insert_own"
    ON public.resolve_problems FOR INSERT
    WITH CHECK (auth.uid() = user_id);

  DROP POLICY IF EXISTS "resolve_problems_update_own" ON public.resolve_problems;
  CREATE POLICY "resolve_problems_update_own"
    ON public.resolve_problems FOR UPDATE
    USING (auth.uid() = user_id);

  -- Saved review notes generated from Resolve sessions
  CREATE TABLE IF NOT EXISTS public.resolve_study_notes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    problem_id UUID NOT NULL REFERENCES public.resolve_problems(id) ON DELETE CASCADE,
    subject TEXT NOT NULL,
    note_title TEXT NOT NULL,
    note_body TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (user_id, problem_id)
  );

  CREATE INDEX IF NOT EXISTS resolve_study_notes_user_created_idx
    ON public.resolve_study_notes(user_id, created_at DESC);

  ALTER TABLE public.resolve_study_notes ENABLE ROW LEVEL SECURITY;

  DROP POLICY IF EXISTS "resolve_study_notes_select_own" ON public.resolve_study_notes;
  CREATE POLICY "resolve_study_notes_select_own"
    ON public.resolve_study_notes FOR SELECT
    USING (auth.uid() = user_id);

  DROP POLICY IF EXISTS "resolve_study_notes_insert_own" ON public.resolve_study_notes;
  CREATE POLICY "resolve_study_notes_insert_own"
    ON public.resolve_study_notes FOR INSERT
    WITH CHECK (auth.uid() = user_id);

  -- Storage bucket for uploaded textbook/homework images
  INSERT INTO storage.buckets (id, name, public)
  VALUES ('resolve-images', 'resolve-images', true)
  ON CONFLICT (id) DO UPDATE SET public = EXCLUDED.public;

  DROP POLICY IF EXISTS "Resolve images are publicly readable" ON storage.objects;
  CREATE POLICY "Resolve images are publicly readable"
    ON storage.objects FOR SELECT
    USING (bucket_id = 'resolve-images');

  DROP POLICY IF EXISTS "Users upload resolve images under own folder" ON storage.objects;
  CREATE POLICY "Users upload resolve images under own folder"
    ON storage.objects FOR INSERT
    TO authenticated
    WITH CHECK (
      bucket_id = 'resolve-images'
      AND split_part(name, '/', 1) = auth.uid()::text
    );
