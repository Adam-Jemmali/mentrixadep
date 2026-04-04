-- Skill duels: open matchmaking in queue (ignore account level / XP)
-- Replaces level-based duel_queue_join_and_match(UUID, TEXT, INTEGER)

CREATE OR REPLACE FUNCTION duel_queue_join_and_match(
  p_joiner UUID,
  p_division_key TEXT
)
RETURNS TABLE(matched BOOLEAN, duel_id UUID, opponent_id UUID)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_opponent UUID;
  v_duel_id UUID;
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM divisions WHERE key = p_division_key AND active = true
  ) THEN
    RAISE EXCEPTION 'invalid_division';
  END IF;

  IF EXISTS (
    SELECT 1 FROM duel_queue WHERE user_id = p_joiner AND division_key = p_division_key
  ) THEN
    RETURN QUERY SELECT false, NULL::UUID, NULL::UUID;
    RETURN;
  END IF;

  DELETE FROM duel_queue WHERE user_id = p_joiner;

  SELECT dq.user_id INTO v_opponent
  FROM duel_queue dq
  WHERE dq.division_key = p_division_key
    AND dq.user_id <> p_joiner
  ORDER BY dq.queued_at ASC
  LIMIT 1
  FOR UPDATE SKIP LOCKED;

  IF v_opponent IS NOT NULL THEN
    DELETE FROM duel_queue WHERE user_id = v_opponent;

    INSERT INTO skill_duels (
      student_id,
      opponent_student_id,
      initiator_id,
      division_key,
      status,
      questions,
      reward_amount_cents,
      match_source,
      is_ai_opponent
    ) VALUES (
      p_joiner,
      v_opponent,
      p_joiner,
      p_division_key,
      'pending',
      '[]'::jsonb,
      0,
      'queue',
      false
    )
    RETURNING id INTO v_duel_id;

    RETURN QUERY SELECT true, v_duel_id, v_opponent;
    RETURN;
  END IF;

  INSERT INTO duel_queue (user_id, division_key)
  VALUES (p_joiner, p_division_key);

  RETURN QUERY SELECT false, NULL::UUID, NULL::UUID;
END;
$$;

REVOKE ALL ON FUNCTION duel_queue_join_and_match(UUID, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION duel_queue_join_and_match(UUID, TEXT) TO service_role;

COMMENT ON FUNCTION duel_queue_join_and_match(UUID, TEXT) IS
  'Pairs joiner with oldest waiter in same division, regardless of level/XP; otherwise enqueues joiner.';
