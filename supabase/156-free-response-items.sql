-- PROMPT P#012 (Sprint 3): Free response item schema and attempt grading ledger.
-- Run after 155-live-board-event-type-check.sql
-- Note: spec number 138 is taken by division-forum-apply; this is the canonical free-response migration.

-- ---------------------------------------------------------------------------
-- item_bank: construction formats beyond MCQ recognition
-- ---------------------------------------------------------------------------

ALTER TABLE public.item_bank
  ADD COLUMN IF NOT EXISTS item_format text DEFAULT 'mcq',
  ADD COLUMN IF NOT EXISTS answer_expression text,
  ADD COLUMN IF NOT EXISTS answer_alternatives text[],
  ADD COLUMN IF NOT EXISTS solution_steps jsonb,
  ADD COLUMN IF NOT EXISTS grading_variables jsonb,
  ADD COLUMN IF NOT EXISTS partial_credit_rules jsonb;

UPDATE public.item_bank
SET item_format = 'mcq'
WHERE item_format IS NULL;

ALTER TABLE public.item_bank
  ALTER COLUMN item_format SET NOT NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'item_bank_item_format_check'
  ) THEN
    ALTER TABLE public.item_bank
      ADD CONSTRAINT item_bank_item_format_check
      CHECK (item_format IN ('mcq', 'free_response', 'step_trace', 'multi_part'));
  END IF;
END $$;

COMMENT ON COLUMN public.item_bank.item_format IS
  'mcq | free_response | step_trace | multi_part. Default mcq preserves existing bank rows.';

COMMENT ON COLUMN public.item_bank.answer_expression IS
  'SymPy-parseable canonical answer, e.g. 3*x**2 + 2*x. Required for free_response and multi_part.';

COMMENT ON COLUMN public.item_bank.answer_alternatives IS
  'Equivalent answer strings in alternate notation; pre-check before symbolic grading.';

COMMENT ON COLUMN public.item_bank.solution_steps IS
  'Ordered steps: step_number, description, expression, misconception_if_skipped, is_critical.';

COMMENT ON COLUMN public.item_bank.grading_variables IS
  'Symbolic grading context: variable names, domains, tolerances, unit expectations.';

COMMENT ON COLUMN public.item_bank.partial_credit_rules IS
  'Partial credit patterns: expression_pattern, credit_fraction, label.';

CREATE INDEX IF NOT EXISTS idx_item_bank_item_format_approved
  ON public.item_bank (item_format)
  WHERE status = 'approved';

-- ---------------------------------------------------------------------------
-- free_response_attempts: raw student construction + graded outcome
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.free_response_attempts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.users (id) ON DELETE CASCADE,
  item_id uuid NOT NULL REFERENCES public.item_bank (id) ON DELETE CASCADE,
  raw_input text NOT NULL,
  normalized_expression text,
  is_correct boolean,
  partial_credit_fraction numeric(4, 3) NOT NULL DEFAULT 0,
  grading_result jsonb,
  attempt_number int NOT NULL DEFAULT 1,
  time_taken_seconds int,
  attempted_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_free_response_attempts_user_attempted
  ON public.free_response_attempts (user_id, attempted_at DESC);

CREATE INDEX IF NOT EXISTS idx_free_response_attempts_item_user
  ON public.free_response_attempts (item_id, user_id, attempt_number);

COMMENT ON TABLE public.free_response_attempts IS
  'Student free-response submissions and symbolic grading outcomes. Not MCQ elimination.';

COMMENT ON COLUMN public.free_response_attempts.raw_input IS
  'Unmodified student entry from the blank field.';

COMMENT ON COLUMN public.free_response_attempts.normalized_expression IS
  'Canonical SymPy-normalized form after parse; null when parse fails.';

COMMENT ON COLUMN public.free_response_attempts.grading_result IS
  'Engine output: match path, partial credit hits, parse errors, step coverage.';

ALTER TABLE public.free_response_attempts ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public.free_response_attempts FROM PUBLIC;
GRANT SELECT, INSERT ON TABLE public.free_response_attempts TO authenticated;
GRANT ALL ON TABLE public.free_response_attempts TO service_role;

DROP POLICY IF EXISTS free_response_attempts_read_own ON public.free_response_attempts;
CREATE POLICY free_response_attempts_read_own
  ON public.free_response_attempts
  FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS free_response_attempts_insert_own ON public.free_response_attempts;
CREATE POLICY free_response_attempts_insert_own
  ON public.free_response_attempts
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS free_response_attempts_service_role_all ON public.free_response_attempts;
CREATE POLICY free_response_attempts_service_role_all
  ON public.free_response_attempts
  FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');
