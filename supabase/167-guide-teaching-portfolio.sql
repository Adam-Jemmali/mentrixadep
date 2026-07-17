-- P#031 Guide teaching portfolio with student opt-in.
-- Prompt said 146; that file is comp-member-session-credits — use 167.
-- Requires 166-share-artifacts.sql.

CREATE TABLE IF NOT EXISTS public.guide_teaching_portfolio (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  guide_id uuid NOT NULL REFERENCES public.users (id) ON DELETE CASCADE,
  student_id uuid NOT NULL REFERENCES public.users (id) ON DELETE CASCADE,
  session_id uuid REFERENCES public.sessions (id) ON DELETE SET NULL,
  share_artifact_id uuid REFERENCES public.share_artifacts (id) ON DELETE SET NULL,
  skill_node_id uuid REFERENCES public.skill_nodes (id) ON DELETE SET NULL,
  node_name text NOT NULL,
  before_accuracy numeric,
  after_accuracy numeric,
  student_opted_in boolean NOT NULL DEFAULT false,
  added_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT guide_teaching_portfolio_share_artifact_unique UNIQUE (share_artifact_id)
);

CREATE INDEX IF NOT EXISTS idx_guide_portfolio_guide_opted
  ON public.guide_teaching_portfolio (guide_id, added_at DESC)
  WHERE student_opted_in = true;

CREATE INDEX IF NOT EXISTS idx_guide_portfolio_student_pending
  ON public.guide_teaching_portfolio (student_id, added_at DESC)
  WHERE student_opted_in = false;

ALTER TABLE public.guide_teaching_portfolio ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS guide_portfolio_student_read ON public.guide_teaching_portfolio;
CREATE POLICY guide_portfolio_student_read ON public.guide_teaching_portfolio
  FOR SELECT USING (auth.uid() = student_id);

DROP POLICY IF EXISTS guide_portfolio_student_update ON public.guide_teaching_portfolio;
CREATE POLICY guide_portfolio_student_update ON public.guide_teaching_portfolio
  FOR UPDATE USING (auth.uid() = student_id)
  WITH CHECK (auth.uid() = student_id);

DROP POLICY IF EXISTS guide_portfolio_guide_read_approved ON public.guide_teaching_portfolio;
CREATE POLICY guide_portfolio_guide_read_approved ON public.guide_teaching_portfolio
  FOR SELECT USING (auth.uid() = guide_id AND student_opted_in = true);

DROP POLICY IF EXISTS guide_portfolio_service ON public.guide_teaching_portfolio;
CREATE POLICY guide_portfolio_service ON public.guide_teaching_portfolio
  FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');

COMMENT ON TABLE public.guide_teaching_portfolio IS
  'Guide breakthrough cards. Public only when student_opted_in. Pending stays false if unanswered.';

CREATE OR REPLACE FUNCTION public.create_guide_portfolio_on_before_after_share()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_guide_name text;
  v_node_name text;
  v_skill_node_id uuid;
  v_session_id uuid;
  v_portfolio_id uuid;
  v_body text;
BEGIN
  IF NEW.artifact_type IS DISTINCT FROM 'before_after' THEN
    RETURN NEW;
  END IF;

  IF NEW.guide_id IS NULL THEN
    RETURN NEW;
  END IF;

  v_node_name := COALESCE(NULLIF(TRIM(NEW.node_name), ''), 'this skill');

  SELECT ir.skill_node_id,
         CASE WHEN ir.source_type IN ('session', 'studio_package') THEN ir.source_id ELSE NULL END
  INTO v_skill_node_id, v_session_id
  FROM public.intervention_retests ir
  WHERE ir.id = NEW.intervention_retest_id;

  SELECT COALESCE(
    NULLIF(TRIM(NEW.guide_name), ''),
    NULLIF(TRIM(us.display_name), ''),
    'Your Guide'
  )
  INTO v_guide_name
  FROM public.users u
  LEFT JOIN public.user_settings us ON us.user_id = u.id
  WHERE u.id = NEW.guide_id;

  IF v_guide_name IS NULL THEN
    v_guide_name := 'Your Guide';
  END IF;

  INSERT INTO public.guide_teaching_portfolio (
    guide_id,
    student_id,
    session_id,
    share_artifact_id,
    skill_node_id,
    node_name,
    before_accuracy,
    after_accuracy,
    student_opted_in
  )
  VALUES (
    NEW.guide_id,
    NEW.user_id,
    v_session_id,
    NEW.id,
    v_skill_node_id,
    v_node_name,
    NEW.before_value,
    NEW.after_value,
    false
  )
  ON CONFLICT (share_artifact_id) DO NOTHING
  RETURNING id INTO v_portfolio_id;

  IF v_portfolio_id IS NULL THEN
    RETURN NEW;
  END IF;

  v_body := format(
    '%s wants your %s lift on their portfolio. Name stays private. Approve or skip.',
    v_guide_name,
    v_node_name
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
    'guide_portfolio_opt_in',
    v_body,
    '/student?portfolio=' || v_portfolio_id::text,
    v_portfolio_id
  )
  ON CONFLICT (kind, source_id) DO NOTHING;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS share_artifacts_guide_portfolio ON public.share_artifacts;
CREATE TRIGGER share_artifacts_guide_portfolio
  AFTER INSERT ON public.share_artifacts
  FOR EACH ROW
  EXECUTE FUNCTION public.create_guide_portfolio_on_before_after_share();

COMMENT ON FUNCTION public.create_guide_portfolio_on_before_after_share IS
  'On before_after share with guide_id: pending portfolio row + student opt-in notify.';
