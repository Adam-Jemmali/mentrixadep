-- Fix Momentum credit booking with auto-approve Guides.
-- Redemptions held availability_id ON DELETE RESTRICT, so the auto-approve
-- trigger (and atomic approve) failed when deleting the slot after insert.
-- That surfaced as session_requests FK 23503 → "Invalid availability or tutor".
--
-- Also stop CASCADE-deleting session_requests when the slot row is removed.
-- Approved requests must remain for refunds, credit linking, and history.

ALTER TABLE public.momentum_session_credit_redemptions
  ALTER COLUMN availability_id DROP NOT NULL;

DO $$
DECLARE
  v_conname text;
BEGIN
  SELECT c.conname
    INTO v_conname
    FROM pg_constraint c
    JOIN pg_class t ON t.oid = c.conrelid
    JOIN pg_namespace n ON n.oid = t.relnamespace
   WHERE n.nspname = 'public'
     AND t.relname = 'momentum_session_credit_redemptions'
     AND c.contype = 'f'
     AND pg_get_constraintdef(c.oid) ILIKE '%availability%';

  IF v_conname IS NOT NULL THEN
    EXECUTE format(
      'ALTER TABLE public.momentum_session_credit_redemptions DROP CONSTRAINT %I',
      v_conname
    );
  END IF;
END $$;

ALTER TABLE public.momentum_session_credit_redemptions
  ADD CONSTRAINT momentum_session_credit_redemptions_availability_id_fkey
  FOREIGN KEY (availability_id)
  REFERENCES public.availability (id)
  ON DELETE SET NULL;

COMMENT ON COLUMN public.momentum_session_credit_redemptions.availability_id IS
  'Slot redeemed at booking. Cleared when the slot row is removed after approve.';

-- session_requests.availability_id: CASCADE wiped approved requests when the slot was deleted.
DO $$
DECLARE
  v_conname text;
BEGIN
  SELECT c.conname
    INTO v_conname
    FROM pg_constraint c
    JOIN pg_class t ON t.oid = c.conrelid
    JOIN pg_namespace n ON n.oid = t.relnamespace
   WHERE n.nspname = 'public'
     AND t.relname = 'session_requests'
     AND c.contype = 'f'
     AND pg_get_constraintdef(c.oid) ILIKE '%availability%';

  IF v_conname IS NOT NULL THEN
    EXECUTE format(
      'ALTER TABLE public.session_requests DROP CONSTRAINT %I',
      v_conname
    );
  END IF;
END $$;

ALTER TABLE public.session_requests
  ALTER COLUMN availability_id DROP NOT NULL;

ALTER TABLE public.session_requests
  ADD CONSTRAINT session_requests_availability_id_fkey
  FOREIGN KEY (availability_id)
  REFERENCES public.availability (id)
  ON DELETE SET NULL;

COMMENT ON COLUMN public.session_requests.availability_id IS
  'Open slot at request time. Cleared when the slot row is removed after approve.';
