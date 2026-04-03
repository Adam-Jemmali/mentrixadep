-- Adaptive Learning: Student Knowledge Graph
-- Run after 032-pre-session-brief.sql

-- ─── 1. Knowledge graph table ─────────────────────────────────────────────────
-- Stores mastery scores per user / subject / topic / subtopic.
-- One row per (user_id, subject, topic, subtopic) combination.
-- mastery_score: 0–100 (0 = not started, 100 = mastered)
-- attempts: total answer attempts for this subtopic
-- correct: correct answers count
-- last_seen_at: last time this subtopic appeared in a quest

CREATE TABLE IF NOT EXISTS student_knowledge_nodes (
  id             uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id        uuid        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  subject        text        NOT NULL,  -- e.g. "Mathematics"
  topic          text        NOT NULL,  -- e.g. "Calculus"
  subtopic       text        NOT NULL,  -- e.g. "u-substitution"
  mastery_score  int         NOT NULL DEFAULT 0 CHECK (mastery_score BETWEEN 0 AND 100),
  attempts       int         NOT NULL DEFAULT 0,
  correct        int         NOT NULL DEFAULT 0,
  -- streak: consecutive correct answers for spaced-repetition decay logic
  correct_streak int         NOT NULL DEFAULT 0,
  last_seen_at   timestamptz,
  created_at     timestamptz NOT NULL DEFAULT now(),
  updated_at     timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, subject, topic, subtopic)
);

CREATE INDEX IF NOT EXISTS skn_user_idx       ON student_knowledge_nodes (user_id);
CREATE INDEX IF NOT EXISTS skn_subject_idx    ON student_knowledge_nodes (user_id, subject);
CREATE INDEX IF NOT EXISTS skn_mastery_idx    ON student_knowledge_nodes (user_id, mastery_score);

-- RLS: students read/write own nodes; service role full access
ALTER TABLE student_knowledge_nodes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "students_read_own_nodes"
  ON student_knowledge_nodes FOR SELECT
  USING (auth.uid() = user_id);

-- Writes via service role from server actions only.

-- ─── 2. Quest topic tagging ───────────────────────────────────────────────────
-- Stores the subject/topic/subtopic tags extracted by AI per quest attempt.
-- Used to drive knowledge graph updates after quest completion.

CREATE TABLE IF NOT EXISTS quest_topic_tags (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  quest_id    uuid        NOT NULL REFERENCES quests(id) ON DELETE CASCADE,
  user_id     uuid        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  subject     text        NOT NULL,
  topic       text        NOT NULL,
  subtopic    text        NOT NULL,
  correct     boolean     NOT NULL DEFAULT false,
  created_at  timestamptz NOT NULL DEFAULT now(),
  UNIQUE (quest_id, user_id, subject, topic, subtopic)
);

CREATE INDEX IF NOT EXISTS qtt_user_idx  ON quest_topic_tags (user_id);
CREATE INDEX IF NOT EXISTS qtt_quest_idx ON quest_topic_tags (quest_id);

ALTER TABLE quest_topic_tags ENABLE ROW LEVEL SECURITY;

CREATE POLICY "students_read_own_tags"
  ON quest_topic_tags FOR SELECT
  USING (auth.uid() = user_id);

-- ─── 3. Trigger: auto-update updated_at ──────────────────────────────────────
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS skn_updated_at ON student_knowledge_nodes;
CREATE TRIGGER skn_updated_at
  BEFORE UPDATE ON student_knowledge_nodes
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
