-- P#027: Before/after share cards on Guide retest lift.
-- 145 is duel-forfeit — use 166.

CREATE TABLE IF NOT EXISTS public.share_artifacts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.users (id) ON DELETE CASCADE,
  artifact_type text NOT NULL CHECK (
    artifact_type IN (
      'before_after',
      'rank_advance',
      'streak_milestone',
      'breakthrough',
      'certification'
    )
  ),
  node_name text,
  before_value numeric,
  after_value numeric,
  guide_name text,
  guide_id uuid REFERENCES public.users (id) ON DELETE SET NULL,
  rank_tier text,
  image_url text,
  share_token text NOT NULL UNIQUE DEFAULT (gen_random_uuid()::text),
  intervention_retest_id uuid UNIQUE REFERENCES public.intervention_retests (id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_share_artifacts_user_created
  ON public.share_artifacts (user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_share_artifacts_type
  ON public.share_artifacts (artifact_type, created_at DESC);

ALTER TABLE public.share_artifacts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS share_artifacts_read_own ON public.share_artifacts;
CREATE POLICY share_artifacts_read_own ON public.share_artifacts
  FOR SELECT USING (auth.uid() = user_id);

COMMENT ON TABLE public.share_artifacts IS
  'Shareable proof cards. before_after rows auto-create when Guide retest delta >= 15.';

-- Public read by token via SECURITY DEFINER RPC (no open SELECT on table).
CREATE OR REPLACE FUNCTION public.get_share_artifact_by_token(p_token text)
RETURNS TABLE (
  id uuid,
  artifact_type text,
  node_name text,
  before_value numeric,
  after_value numeric,
  guide_name text,
  image_url text,
  share_token text,
  created_at timestamptz,
  rank_card_username text
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF p_token IS NULL OR length(trim(p_token)) < 8 THEN
    RETURN;
  END IF;

  RETURN QUERY
  SELECT
    sa.id,
    sa.artifact_type,
    sa.node_name,
    sa.before_value,
    sa.after_value,
    sa.guide_name,
    sa.image_url,
    sa.share_token,
    sa.created_at,
    us.rank_card_username
  FROM public.share_artifacts sa
  LEFT JOIN public.user_settings us ON us.user_id = sa.user_id
  WHERE sa.share_token = trim(p_token)
  LIMIT 1;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_share_artifact_by_token(text) TO anon, authenticated, service_role;

CREATE OR REPLACE FUNCTION public.create_before_after_share_on_retest()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_guide_id uuid;
  v_guide_name text;
  v_node_name text;
  v_delta numeric;
  v_artifact_id uuid;
  v_share_token text;
  v_points integer;
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

  v_delta := COALESCE(NEW.delta, NEW.post_accuracy - COALESCE(NEW.pre_accuracy, 0));
  IF v_delta < 15 THEN
    RETURN NEW;
  END IF;

  SELECT s.tutor_id
  INTO v_guide_id
  FROM public.sessions s
  WHERE s.id = NEW.source_id;

  SELECT COALESCE(NULLIF(TRIM(us.display_name), ''), NULLIF(SPLIT_PART(u.email, '@', 1), ''))
  INTO v_guide_name
  FROM public.users u
  LEFT JOIN public.user_settings us ON us.user_id = u.id
  WHERE u.id = v_guide_id;

  SELECT COALESCE(NULLIF(TRIM(sn.node_name), ''), 'this skill')
  INTO v_node_name
  FROM public.skill_nodes sn
  WHERE sn.id = NEW.skill_node_id;

  v_share_token := gen_random_uuid()::text;

  INSERT INTO public.share_artifacts (
    user_id,
    artifact_type,
    node_name,
    before_value,
    after_value,
    guide_name,
    guide_id,
    share_token,
    intervention_retest_id
  )
  VALUES (
    NEW.user_id,
    'before_after',
    v_node_name,
    NEW.pre_accuracy,
    NEW.post_accuracy,
    v_guide_name,
    v_guide_id,
    v_share_token,
    NEW.id
  )
  ON CONFLICT (intervention_retest_id) DO NOTHING
  RETURNING id INTO v_artifact_id;

  IF v_artifact_id IS NULL THEN
    RETURN NEW;
  END IF;

  INSERT INTO public.background_jobs (
    job_type,
    idempotency_key,
    payload,
    status,
    priority,
    max_attempts
  )
  VALUES (
    'image.share_artifact',
    'share-artifact:' || v_artifact_id::text,
    jsonb_build_object(
      'artifactId', v_artifact_id,
      'shareToken', v_share_token
    ),
    'queued',
    5,
    5
  )
  ON CONFLICT (job_type, idempotency_key) DO NOTHING;

  v_points := ROUND(v_delta)::integer;
  v_body := format(
    'You improved %s by %s percentage points. One tap to share.',
    v_node_name,
    v_points
  );

  INSERT INTO public.user_notifications (
    user_id,
    kind,
    body,
    href,
    source_id
  )
  VALUES (
    NEW.user_id,
    'share_before_after',
    v_body,
    '/share/' || v_share_token,
    v_artifact_id
  )
  ON CONFLICT (kind, source_id) DO NOTHING;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS intervention_retests_before_after_share ON public.intervention_retests;
CREATE TRIGGER intervention_retests_before_after_share
  AFTER INSERT OR UPDATE ON public.intervention_retests
  FOR EACH ROW
  EXECUTE FUNCTION public.create_before_after_share_on_retest();

COMMENT ON FUNCTION public.create_before_after_share_on_retest IS
  'On Guide session/studio retest with delta >= 15: share_artifacts + image job + student notify.';
