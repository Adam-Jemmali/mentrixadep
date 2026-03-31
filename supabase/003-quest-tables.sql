-- ============================================================
-- Quest system tables (Phase 1)
-- Run after 001-schema.sql in Supabase SQL Editor
-- ============================================================

-- ============================================================
-- TABLES
-- ============================================================

CREATE TABLE IF NOT EXISTS quests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  creator_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  prompt TEXT NOT NULL,
  solution TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS user_quest_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  quest_id UUID NOT NULL REFERENCES quests(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'not_started' CHECK (status IN ('not_started', 'in_progress', 'completed')),
  mode TEXT CHECK (mode IN ('coach', 'exam')),
  num_attempts INT NOT NULL DEFAULT 0,
  last_attempt_at TIMESTAMPTZ,
  UNIQUE(user_id, quest_id)
);

CREATE TABLE IF NOT EXISTS user_xp (
  user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  total_xp INT NOT NULL DEFAULT 0,
  division_xp JSONB NOT NULL DEFAULT '{}',
  streak_days INT NOT NULL DEFAULT 0,
  last_activity_date DATE
);

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================

ALTER TABLE quests ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_quest_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_xp ENABLE ROW LEVEL SECURITY;

-- QUESTS: authenticated users can SELECT all; users can INSERT as creator; only creator can DELETE own
DROP POLICY IF EXISTS "Authenticated users can view all quests" ON quests;
CREATE POLICY "Authenticated users can view all quests" ON quests
  FOR SELECT USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Users can create quests as creator" ON quests;
CREATE POLICY "Users can create quests as creator" ON quests
  FOR INSERT WITH CHECK (creator_user_id = auth.uid());

DROP POLICY IF EXISTS "Creator can delete own quests" ON quests;
CREATE POLICY "Creator can delete own quests" ON quests
  FOR DELETE USING (creator_user_id = auth.uid());

-- USER_QUEST_PROGRESS: users can SELECT/INSERT/UPDATE only their own rows
DROP POLICY IF EXISTS "Users can view own quest progress" ON user_quest_progress;
CREATE POLICY "Users can view own quest progress" ON user_quest_progress
  FOR SELECT USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can insert own quest progress" ON user_quest_progress;
CREATE POLICY "Users can insert own quest progress" ON user_quest_progress
  FOR INSERT WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can update own quest progress" ON user_quest_progress;
CREATE POLICY "Users can update own quest progress" ON user_quest_progress
  FOR UPDATE USING (user_id = auth.uid());

-- USER_XP: users can SELECT/INSERT/UPDATE only their own row
DROP POLICY IF EXISTS "Users can view own XP" ON user_xp;
CREATE POLICY "Users can view own XP" ON user_xp
  FOR SELECT USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can insert own XP row" ON user_xp;
CREATE POLICY "Users can insert own XP row" ON user_xp
  FOR INSERT WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can update own XP" ON user_xp;
CREATE POLICY "Users can update own XP" ON user_xp
  FOR UPDATE USING (user_id = auth.uid());

-- ============================================================
-- INDEXES
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_quests_creator_user_id ON quests(creator_user_id);
CREATE INDEX IF NOT EXISTS idx_quests_created_at ON quests(created_at);
CREATE INDEX IF NOT EXISTS idx_user_quest_progress_user_id ON user_quest_progress(user_id);
CREATE INDEX IF NOT EXISTS idx_user_quest_progress_quest_id ON user_quest_progress(quest_id);
CREATE INDEX IF NOT EXISTS idx_user_quest_progress_status ON user_quest_progress(status);
CREATE INDEX IF NOT EXISTS idx_user_xp_total_xp ON user_xp(total_xp);
CREATE INDEX IF NOT EXISTS idx_user_xp_last_activity_date ON user_xp(last_activity_date);
