-- Weekly Movement Receipt for verified grid movement, retest loop, session credit.
-- Run after 140-mastery-grid-snapshots.sql

CREATE TABLE IF NOT EXISTS public.movement_receipts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid NOT NULL REFERENCES public.users (id) ON DELETE CASCADE,
  week_start date NOT NULL,
  receipt_data jsonb NOT NULL,
  generated_at timestamptz NOT NULL DEFAULT now(),
  email_sent_at timestamptz,
  clicked_at timestamptz,
  CONSTRAINT movement_receipts_student_week UNIQUE (student_id, week_start)
);

CREATE INDEX IF NOT EXISTS idx_movement_receipts_student_generated
  ON public.movement_receipts (student_id, generated_at DESC);

ALTER TABLE public.movement_receipts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS movement_receipts_read_own ON public.movement_receipts;
CREATE POLICY movement_receipts_read_own ON public.movement_receipts
  FOR SELECT USING (auth.uid() = student_id);

DROP POLICY IF EXISTS movement_receipts_service ON public.movement_receipts;
CREATE POLICY movement_receipts_service ON public.movement_receipts
  FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');

COMMENT ON TABLE public.movement_receipts IS 'Weekly verified movement receipt: grid flips, retest due, session credit. Momentum subscribers receive email.';
