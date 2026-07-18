-- Quest Skill Revolution: new construction formats + authoring doctrine metadata.
-- Never edit prior migrations.

ALTER TABLE public.item_bank
  DROP CONSTRAINT IF EXISTS item_bank_item_format_check;

ALTER TABLE public.item_bank
  ADD CONSTRAINT item_bank_item_format_check
  CHECK (item_format IN (
    'mcq',
    'free_response',
    'step_trace',
    'multi_part',
    'complete_expression',
    'drag_order',
    'graph_feature'
  ));

COMMENT ON COLUMN public.item_bank.item_format IS
  'mcq | free_response | step_trace | multi_part | complete_expression | drag_order | graph_feature';

ALTER TABLE public.item_bank
  ADD COLUMN IF NOT EXISTS authoring_meta jsonb NOT NULL DEFAULT '{}'::jsonb;

COMMENT ON COLUMN public.item_bank.authoring_meta IS
  'Doctrine: skill_verb, transfer_tag, proof_artifact, misconception_kit (string[]).';

ALTER TABLE public.verified_first_attempts
  DROP CONSTRAINT IF EXISTS verified_first_attempts_attempt_format_check;

ALTER TABLE public.verified_first_attempts
  ADD CONSTRAINT verified_first_attempts_attempt_format_check
  CHECK (attempt_format IN (
    'mcq',
    'free_response',
    'multi_part_part',
    'complete_expression',
    'drag_order',
    'graph_feature'
  ));

COMMENT ON COLUMN public.verified_first_attempts.attempt_format IS
  'mcq | free_response | multi_part_part | complete_expression | drag_order | graph_feature. FR-family rows weigh 1.5x.';

CREATE OR REPLACE FUNCTION public.upsert_student_node_rolling_from_vfa()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_weight numeric := CASE
    WHEN NEW.attempt_format IN (
      'free_response',
      'multi_part_part',
      'complete_expression',
      'drag_order',
      'graph_feature'
    ) THEN 1.5
    ELSE 1.0
  END;
  v_points numeric := COALESCE(NEW.accuracy_pct, CASE WHEN NEW.is_correct THEN 1 ELSE 0 END) * 100.0;
BEGIN
  INSERT INTO public.student_node_rolling_stats (
    user_id,
    skill_node_id,
    rolling_accuracy,
    attempts_in_window,
    last_updated
  )
  VALUES (
    NEW.user_id,
    NEW.skill_node_id,
    v_points,
    v_weight,
    now()
  )
  ON CONFLICT (user_id, skill_node_id) DO UPDATE SET
    attempts_in_window = public.student_node_rolling_stats.attempts_in_window + v_weight,
    rolling_accuracy = ROUND(
      (
        public.student_node_rolling_stats.rolling_accuracy
          * public.student_node_rolling_stats.attempts_in_window
        + v_points * v_weight
      ) / (public.student_node_rolling_stats.attempts_in_window + v_weight),
      2
    ),
    last_updated = now();

  RETURN NEW;
END;
$$;
