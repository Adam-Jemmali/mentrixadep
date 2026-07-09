-- PROMPT 027: Guide retest closure notification copy (accuracy from X to Y).
-- Run after 151-rank-cache-batch-refresh.sql

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
    COALESCE(NULLIF(TRIM(sn.node_name), ''), 'the skill node')
  INTO v_student_name, v_node_name
  FROM public.users u
  LEFT JOIN public.user_settings us ON us.user_id = u.id
  CROSS JOIN public.skill_nodes sn
  WHERE u.id = NEW.user_id
    AND sn.id = NEW.skill_node_id;

  v_pre := ROUND(COALESCE(NEW.pre_accuracy, 0));
  v_post := ROUND(COALESCE(NEW.post_accuracy, 0));

  IF v_post > v_pre THEN
    v_body := format(
      '%s accuracy on %s moved from %s%% to %s%% after your session and package',
      v_student_name,
      v_node_name,
      v_pre::text,
      v_post::text
    );
  ELSE
    v_body := format(
      '%s accuracy on %s did not move. Consider addressing it differently next session.',
      v_student_name,
      v_node_name
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
    '/tutor/sessions-ai',
    NEW.id
  )
  ON CONFLICT (kind, source_id) DO NOTHING;

  RETURN NEW;
END;
$$;
