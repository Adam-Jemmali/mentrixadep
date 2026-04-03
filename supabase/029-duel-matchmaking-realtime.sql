-- Skill duels: queue level matching (±1 account level), AI opponent support, optional Realtime
-- Run after 017-clans-and-duel-queue.sql

-- Replace legacy 2-arg RPC (same name, different signature)
DROP FUNCTION IF EXISTS duel_queue_join_and_match(UUID, TEXT);

-- ─── 1. Queue: store account level at enqueue time for ±1 matching ───────────

ALTER TABLE public.duel_queue
  ADD COLUMN IF NOT EXISTS queue_level INTEGER NOT NULL DEFAULT 1
  CONSTRAINT duel_queue_level_range CHECK (queue_level >= 1 AND queue_level <= 99);

COMMENT ON COLUMN public.duel_queue.queue_level IS 'Account level (from total XP) when joining queue; used for ±1 matchmaking.';

-- ─── 2. Skill duels: optional AI opponent (no human opponent row) ───────────

ALTER TABLE public.skill_duels
  ADD COLUMN IF NOT EXISTS is_ai_opponent BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE public.skill_duels
  DROP CONSTRAINT IF EXISTS skill_duels_opponent_student_id_fkey;

ALTER TABLE public.skill_duels
  ALTER COLUMN opponent_student_id DROP NOT NULL;

ALTER TABLE public.skill_duels
  ADD CONSTRAINT skill_duels_opponent_student_id_fkey
  FOREIGN KEY (opponent_student_id) REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE public.skill_duels
  DROP CONSTRAINT IF EXISTS skill_duels_human_or_ai_opponent;

ALTER TABLE public.skill_duels
  ADD CONSTRAINT skill_duels_human_or_ai_opponent CHECK (
    (is_ai_opponent = false AND opponent_student_id IS NOT NULL)
    OR (is_ai_opponent = true AND opponent_student_id IS NULL)
  );

COMMENT ON COLUMN public.skill_duels.is_ai_opponent IS 'True when opponent is simulated (queue timeout); student_id is the human learner.';

-- Match source may include ai_queue for clarity (optional); app may use queue + is_ai_opponent
ALTER TABLE public.skill_duels
  DROP CONSTRAINT IF EXISTS skill_duels_match_source_check;

ALTER TABLE public.skill_duels
  ADD CONSTRAINT skill_duels_match_source_check
  CHECK (
    match_source IS NULL
    OR match_source IN ('queue', 'clan', 'direct', 'ai_queue')
  );

-- Enable Realtime (run in Supabase SQL if your project uses default publication):
-- ALTER PUBLICATION supabase_realtime ADD TABLE public.skill_duels;

-- ─── 3. Replace RPC: level-aware matchmaking ─────────────────────────────────

CREATE OR REPLACE FUNCTION duel_queue_join_and_match(
  p_joiner UUID,
  p_division_key TEXT,
  p_level INTEGER
)
RETURNS TABLE(matched BOOLEAN, duel_id UUID, opponent_id UUID)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_opponent UUID;
  v_duel_id UUID;
  v_level INTEGER;
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM divisions WHERE key = p_division_key AND active = true
  ) THEN
    RAISE EXCEPTION 'invalid_division';
  END IF;

  v_level := GREATEST(1, LEAST(COALESCE(p_level, 1), 99));

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
    AND ABS(dq.queue_level - v_level) <= 1
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

  INSERT INTO duel_queue (user_id, division_key, queue_level)
  VALUES (p_joiner, p_division_key, v_level);
  RETURN QUERY SELECT false, NULL::UUID, NULL::UUID;
END;
$$;

REVOKE ALL ON FUNCTION duel_queue_join_and_match(UUID, TEXT, INTEGER) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION duel_queue_join_and_match(UUID, TEXT, INTEGER) TO service_role;

COMMENT ON FUNCTION duel_queue_join_and_match(UUID, TEXT, INTEGER) IS
  'Pairs joiner with oldest waiter in same division within ±1 queue_level, or enqueues joiner.';
