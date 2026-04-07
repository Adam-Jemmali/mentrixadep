-- Track whether a paid booking used Stripe Connect destination charges (funds + fee split on charge).
-- Legacy rows: false (platform balance + separate Transfer API).

ALTER TABLE session_requests
  ADD COLUMN IF NOT EXISTS stripe_destination_charge BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE sessions
  ADD COLUMN IF NOT EXISTS stripe_destination_charge BOOLEAN NOT NULL DEFAULT false;

COMMENT ON COLUMN session_requests.stripe_destination_charge IS
  'True when Checkout used payment_intent.transfer_data.destination (tutor receives net on charge).';

COMMENT ON COLUMN sessions.stripe_destination_charge IS
  'Copied from session_requests at approval; used by payout ledger to skip separate transfers.';

-- Recreate atomic approve to copy the flag onto sessions.
CREATE OR REPLACE FUNCTION public.approve_session_request_atomic(
  p_request_id uuid,
  p_actor_id uuid
)
RETURNS TABLE(session_id uuid)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_request session_requests%rowtype;
  v_availability availability%rowtype;
  v_price_cents integer;
  v_session_id uuid;
  v_caller_uid uuid;
  v_actor_is_admin boolean;
BEGIN
  v_caller_uid := auth.uid();

  IF auth.role() <> 'service_role' AND (v_caller_uid IS NULL OR v_caller_uid <> p_actor_id) THEN
    RAISE EXCEPTION 'request_forbidden';
  END IF;

  v_actor_is_admin := is_admin(p_actor_id);

  SELECT *
    INTO v_request
    FROM session_requests
   WHERE id = p_request_id
   FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'request_not_found';
  END IF;

  IF v_request.status <> 'pending' THEN
    RAISE EXCEPTION 'request_not_pending';
  END IF;

  IF NOT v_actor_is_admin AND v_request.tutor_id <> p_actor_id THEN
    RAISE EXCEPTION 'request_forbidden';
  END IF;

  SELECT *
    INTO v_availability
    FROM availability
   WHERE id = v_request.availability_id
   FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'availability_not_found';
  END IF;

  IF EXISTS (
    SELECT 1
      FROM sessions s
     WHERE s.tutor_id = v_request.tutor_id
       AND s.start_time = v_availability.start_time
       AND s.status = 'scheduled'
  ) THEN
    RAISE EXCEPTION 'tutor_double_booked';
  END IF;

  IF EXISTS (
    SELECT 1
      FROM sessions s
     WHERE s.student_id = v_request.student_id
       AND s.start_time = v_availability.start_time
       AND s.status = 'scheduled'
  ) THEN
    RAISE EXCEPTION 'student_double_booked';
  END IF;

  UPDATE session_requests
     SET status = 'approved',
         updated_at = now()
   WHERE id = v_request.id
     AND status = 'pending';

  IF NOT FOUND THEN
    RAISE EXCEPTION 'request_not_pending';
  END IF;

  v_price_cents := coalesce(v_availability.price_per_session, 2500);

  INSERT INTO sessions (
    student_id,
    tutor_id,
    availability_id,
    course,
    start_time,
    end_time,
    completed,
    price_per_session,
    stripe_checkout_session_id,
    stripe_payment_intent_id,
    stripe_refund_id,
    stripe_destination_charge
  )
  VALUES (
    v_request.student_id,
    v_request.tutor_id,
    v_request.availability_id,
    v_availability.course,
    v_availability.start_time,
    v_availability.end_time,
    false,
    v_price_cents,
    v_request.stripe_checkout_session_id,
    v_request.stripe_payment_intent_id,
    v_request.stripe_refund_id,
    coalesce(v_request.stripe_destination_charge, false)
  )
  RETURNING id INTO v_session_id;

  DELETE FROM availability
   WHERE id = v_request.availability_id;

  RETURN QUERY SELECT v_session_id;

EXCEPTION
  WHEN unique_violation THEN
    RAISE EXCEPTION 'session_conflict';
END;
$$;
