-- Clans + duel matchmaking queue. Run after 016-student-vs-student-duels.sql

-- ---------------------------------------------------------------------------
-- clans
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS clans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL CHECK (char_length(btrim(name)) BETWEEN 2 AND 60),
  tag TEXT NOT NULL,
  invite_code TEXT NOT NULL,
  leader_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT clans_tag_unique UNIQUE (tag),
  CONSTRAINT clans_invite_code_unique UNIQUE (invite_code),
  CONSTRAINT clans_tag_format CHECK (tag ~ '^[A-Z0-9]{2,8}$')
);

CREATE INDEX IF NOT EXISTS idx_clans_leader ON clans(leader_id);

-- ---------------------------------------------------------------------------
-- clan_members — one clan per user (unique user_id)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS clan_members (
  clan_id UUID NOT NULL REFERENCES clans(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('leader', 'member')),
  joined_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (clan_id, user_id),
  CONSTRAINT clan_members_one_clan_per_user UNIQUE (user_id)
);

CREATE INDEX IF NOT EXISTS idx_clan_members_clan ON clan_members(clan_id);
CREATE INDEX IF NOT EXISTS idx_clan_members_user ON clan_members(user_id);

-- ---------------------------------------------------------------------------
-- duel_queue — waiting for a peer (same division)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS duel_queue (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  division_key TEXT NOT NULL REFERENCES divisions(key),
  queued_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_duel_queue_division_queued
  ON duel_queue(division_key, queued_at);

-- Distinguish queue matchmaking from clan/direct challenges (polling / UX).
ALTER TABLE skill_duels
  ADD COLUMN IF NOT EXISTS match_source TEXT
  CHECK (match_source IS NULL OR match_source IN ('queue', 'clan', 'direct'));

COMMENT ON COLUMN skill_duels.match_source IS 'How the duel was created: queue, clan, or direct (UUID challenge).';

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------
ALTER TABLE clans ENABLE ROW LEVEL SECURITY;
ALTER TABLE clan_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE duel_queue ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users read own clan" ON clans;
CREATE POLICY "Users read own clan"
  ON clans FOR SELECT
  USING (
    id IN (SELECT clan_id FROM clan_members WHERE user_id = auth.uid())
  );

DROP POLICY IF EXISTS "Users read clan roster rows" ON clan_members;
CREATE POLICY "Users read clan roster rows"
  ON clan_members FOR SELECT
  USING (
    clan_id IN (SELECT clan_id FROM clan_members WHERE user_id = auth.uid())
  );

DROP POLICY IF EXISTS "Users manage own duel_queue row" ON duel_queue;
CREATE POLICY "Users manage own duel_queue row"
  ON duel_queue FOR ALL
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- ---------------------------------------------------------------------------
-- Atomic match: joiner is challenger (student_id); waiting peer is opponent.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION duel_queue_join_and_match(p_joiner UUID, p_division_key TEXT)
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
      match_source
    ) VALUES (
      p_joiner,
      v_opponent,
      p_joiner,
      p_division_key,
      'pending',
      '[]'::jsonb,
      0,
      'queue'
    )
    RETURNING id INTO v_duel_id;
    RETURN QUERY SELECT true, v_duel_id, v_opponent;
    RETURN;
  END IF;

  INSERT INTO duel_queue (user_id, division_key) VALUES (p_joiner, p_division_key);
  RETURN QUERY SELECT false, NULL::UUID, NULL::UUID;
END;
$$;

REVOKE ALL ON FUNCTION duel_queue_join_and_match(UUID, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION duel_queue_join_and_match(UUID, TEXT) TO service_role;

COMMENT ON TABLE clans IS 'Student clans: create/join by invite code; one membership per user.';
COMMENT ON TABLE duel_queue IS 'Students waiting for a peer in the same division for skill duels.';
COMMENT ON FUNCTION duel_queue_join_and_match IS 'Pairs joiner with oldest waiter or enqueues joiner. Joiner becomes challenger (student_id).';
