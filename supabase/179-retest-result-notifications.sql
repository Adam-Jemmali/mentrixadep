-- Retest result notifications: Guide dashboard copy, student in app + push.
-- Run after 178-skill-answer-latencies.sql

CREATE OR REPLACE FUNCTION public.insert_guide_intervention_retest_notification()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_guide_id uuid;
  v_student_name text;
  v_node_name text;
  v_pre numeric;
  v_post numeric;
  v_delta numeric;
  v_body text;
BEGIN
  IF NEW.completed_at IS NULL OR NEW.post_accuracy IS NULL THEN
    RETURN NEW;
  END IF;

  IF TG_OP = 'UPDATE' AND OLD.completed_at IS NOT NULL THEN
    RETURN NEW;
  END IF;

  IF NEW.source_type NOT IN ('studio_package', 'session') THEN
    RETURN NEW;
  END IF;

  SELECT s.tutor_id
  INTO v_guide_id
  FROM public.sessions s
  WHERE s.id = NEW.source_id;

  IF v_guide_id IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT
    COALESCE(
      NULLIF(TRIM(us.display_name), ''),
      NULLIF(SPLIT_PART(u.email, '@', 1), ''),
      'your student'
    ),
    COALESCE(NULLIF(TRIM(sn.node_name), ''), 'this skill')
  INTO v_student_name, v_node_name
  FROM public.users u
  LEFT JOIN public.user_settings us ON us.user_id = u.id
  CROSS JOIN public.skill_nodes sn
  WHERE u.id = NEW.user_id
    AND sn.id = NEW.skill_node_id;

  v_pre := ROUND(COALESCE(NEW.pre_accuracy, 0));
  v_post := ROUND(COALESCE(NEW.post_accuracy, 0));
  v_delta := COALESCE(NEW.delta, v_post - v_pre);

  IF v_delta < 0 THEN
    v_body := format('Consider a different approach on %s.', v_node_name);
  ELSIF v_delta >= 10 THEN
    v_body := format(
      '%s accuracy on %s moved from %s%% to %s%% after your session.',
      v_student_name,
      v_node_name,
      v_pre::text,
      v_post::text
    );
  ELSE
    v_body := format(
      '%s accuracy on %s moved from %s%% to %s%%.',
      v_student_name,
      v_node_name,
      v_pre::text,
      v_post::text
    );
  END IF;

  INSERT INTO public.user_notifications (
    user_id,
    kind,
    body,
    href,
    source_id
  )
  VALUES (
    v_guide_id,
    'intervention_retest_complete',
    v_body,
    '/tutor?brief=' || NEW.source_id::text,
    NEW.id
  )
  ON CONFLICT (kind, source_id) DO NOTHING;

  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.insert_student_retest_complete_notification()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_node_name text;
  v_pre numeric;
  v_post numeric;
  v_title text;
  v_body text;
BEGIN
  IF NEW.completed_at IS NULL OR NEW.post_accuracy IS NULL THEN
    RETURN NEW;
  END IF;

  IF TG_OP = 'UPDATE' AND OLD.completed_at IS NOT NULL THEN
    RETURN NEW;
  END IF;

  IF NEW.source_type NOT IN ('studio_package', 'session') THEN
    RETURN NEW;
  END IF;

  SELECT COALESCE(NULLIF(TRIM(sn.node_name), ''), 'this skill')
  INTO v_node_name
  FROM public.skill_nodes sn
  WHERE sn.id = NEW.skill_node_id;

  v_pre := ROUND(COALESCE(NEW.pre_accuracy, 0));
  v_post := ROUND(COALESCE(NEW.post_accuracy, 0));
  v_title := v_node_name || ' retest complete';
  v_body := format('Your accuracy moved from %s%% to %s%%', v_pre::text, v_post::text);

  INSERT INTO public.user_notifications (
    user_id,
    kind,
    body,
    href,
    source_id
  )
  VALUES (
    NEW.user_id,
    'retest_complete',
    v_body,
    '/student#retest-proof',
    NEW.id
  )
  ON CONFLICT (kind, source_id) DO NOTHING;

  INSERT INTO public.background_jobs (
    job_type,
    idempotency_key,
    payload,
    status,
    priority,
    max_attempts
  )
  VALUES (
    'push.retest_complete',
    'retest-push:' || NEW.id::text,
    jsonb_build_object(
      'userId', NEW.user_id,
      'title', v_title,
      'body', v_body,
      'url', '/student#retest-proof'
    ),
    'queued',
    6,
    5
  )
  ON CONFLICT (job_type, idempotency_key) DO NOTHING;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS intervention_retests_student_notify ON public.intervention_retests;
CREATE TRIGGER intervention_retests_student_notify
  AFTER INSERT OR UPDATE ON public.intervention_retests
  FOR EACH ROW
  EXECUTE FUNCTION public.insert_student_retest_complete_notification();

COMMENT ON FUNCTION public.insert_student_retest_complete_notification IS
  'On Guide session retest completion: student in app notify + web push job.';
