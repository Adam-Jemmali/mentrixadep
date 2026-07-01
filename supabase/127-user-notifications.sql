-- PROMPT 005 (closure): Guide in-app notification when intervention retest completes.
-- Run after 126-intervention-retests.sql

CREATE TABLE IF NOT EXISTS public.user_notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.users (id) ON DELETE CASCADE,
  kind text NOT NULL,
  body text NOT NULL,
  href text,
  source_id uuid,
  read_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT user_notifications_kind_source_unique UNIQUE (kind, source_id)
);

CREATE INDEX IF NOT EXISTS idx_user_notifications_user_unread
  ON public.user_notifications (user_id, created_at DESC)
  WHERE read_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_user_notifications_user_created
  ON public.user_notifications (user_id, created_at DESC);

ALTER TABLE public.user_notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS user_notifications_read_own ON public.user_notifications;
CREATE POLICY user_notifications_read_own ON public.user_notifications
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS user_notifications_update_own ON public.user_notifications;
CREATE POLICY user_notifications_update_own ON public.user_notifications
  FOR UPDATE USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

COMMENT ON TABLE public.user_notifications IS
  'In-app notifications (features/notifications). Guide intervention retest closure writes intervention_retest_complete rows.';

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
    COALESCE(NULLIF(TRIM(sn.node_name), ''), 'the skill node')
  INTO v_student_name, v_node_name
  FROM public.users u
  LEFT JOIN public.user_settings us ON us.user_id = u.id
  CROSS JOIN public.skill_nodes sn
  WHERE u.id = NEW.user_id
    AND sn.id = NEW.skill_node_id;

  v_delta := COALESCE(NEW.delta, COALESCE(NEW.post_accuracy, 0) - COALESCE(NEW.pre_accuracy, 0));

  IF v_delta > 0 THEN
    v_body := format(
      'Your session with %s improved their first attempt accuracy on %s by %s percentage points',
      v_student_name,
      v_node_name,
      ROUND(ABS(v_delta))::text
    );
  ELSE
    v_body := format(
      'Your session with %s did not move their accuracy on %s. Consider a different approach next time.',
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

DROP TRIGGER IF EXISTS intervention_retests_guide_notify ON public.intervention_retests;
CREATE TRIGGER intervention_retests_guide_notify
  AFTER INSERT OR UPDATE ON public.intervention_retests
  FOR EACH ROW
  EXECUTE FUNCTION public.insert_guide_intervention_retest_notification();
