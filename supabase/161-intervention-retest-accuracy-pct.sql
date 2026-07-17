-- Use VFA accuracy_pct (0–1) for intervention retest completion when present.
-- Table + closed loop were created in 126-intervention-retests.sql (do not recreate as 140).

CREATE OR REPLACE FUNCTION public.verified_first_attempts_complete_intervention_retests()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_post numeric;
BEGIN
  v_post := ROUND(
    COALESCE(
      NEW.accuracy_pct,
      CASE WHEN NEW.is_correct THEN 1.0 ELSE 0.0 END
    ) * 100.0,
    2
  );
  PERFORM public.complete_due_intervention_retests(
    NEW.user_id,
    NEW.skill_node_id,
    v_post
  );
  RETURN NEW;
END;
$$;
