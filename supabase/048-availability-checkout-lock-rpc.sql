-- Atomic lock acquisition for Stripe checkout slot reservations.
-- Prevents false conflicts caused by non-atomic OR filters under concurrency.

CREATE OR REPLACE FUNCTION public.acquire_availability_checkout_lock(
  p_availability_id UUID,
  p_user_id UUID,
  p_locked_until TIMESTAMPTZ
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_acquired BOOLEAN;
BEGIN
  UPDATE public.availability
  SET
    booking_status = 'pending_payment',
    locked_until = p_locked_until,
    locked_by = p_user_id,
    stripe_checkout_session_id = NULL
  WHERE id = p_availability_id
    AND (
      booking_status IS NULL
      OR booking_status = 'available'
      OR (
        booking_status = 'pending_payment'
        AND (
          locked_by = p_user_id
          OR locked_until IS NULL
          OR locked_until <= NOW()
        )
      )
    )
  RETURNING TRUE INTO v_acquired;

  RETURN COALESCE(v_acquired, FALSE);
END;
$$;

REVOKE ALL ON FUNCTION public.acquire_availability_checkout_lock(UUID, UUID, TIMESTAMPTZ) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.acquire_availability_checkout_lock(UUID, UUID, TIMESTAMPTZ) TO service_role;
