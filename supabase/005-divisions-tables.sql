-- ============================================================
-- Divisions: subject-based communities with XP leaderboards
-- Run after 001-schema.sql in Supabase SQL Editor
-- ============================================================

-- ============================================================
-- TABLE: divisions
-- ============================================================

CREATE TABLE IF NOT EXISTS divisions (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  key         TEXT        UNIQUE NOT NULL,   -- slug, e.g. 'algorithms'
  name        TEXT        NOT NULL,           -- display name
  description TEXT,
  active      BOOLEAN     NOT NULL DEFAULT true,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- TABLE: course_division_map
-- Maps free-text course names (sessions.course) → division
-- ============================================================

CREATE TABLE IF NOT EXISTS course_division_map (
  course      TEXT  PRIMARY KEY,            -- exact match to sessions.course
  division_id UUID  NOT NULL REFERENCES divisions(id) ON DELETE CASCADE
);

-- ============================================================
-- SEED: divisions
-- ============================================================

INSERT INTO divisions (key, name, description) VALUES
  ('mathematics',       'Mathematics Division',       'Algebra, calculus, statistics, and more'),
  ('computer-science',  'Computer Science Division',  'Algorithms, data structures, programming languages'),
  ('physics',           'Physics Division',           'Mechanics, electromagnetism, quantum, and thermodynamics'),
  ('chemistry',         'Chemistry Division',         'Organic, inorganic, and physical chemistry'),
  ('biology',           'Biology Division',           'Cell biology, genetics, ecology, and anatomy'),
  ('english',           'English Division',           'Writing, literature, grammar, and essay skills'),
  ('history',           'History Division',           'World history, US history, and social studies'),
  ('economics',         'Economics Division',         'Micro, macro, and business economics'),
  ('data-science',      'Data Science Division',      'Machine learning, statistics, and data analysis'),
  ('general',           'General Division',           'All other subjects and interdisciplinary topics')
ON CONFLICT (key) DO NOTHING;

-- ============================================================
-- SEED: course_division_map
-- Covers the most common free-text course names tutors enter.
-- Add more rows as new courses appear.
-- ============================================================

-- Resolve division ids inline
WITH d AS (
  SELECT id, key FROM divisions
)
INSERT INTO course_division_map (course, division_id) VALUES
  -- Mathematics
  ('Mathematics',           (SELECT id FROM d WHERE key = 'mathematics')),
  ('Math',                  (SELECT id FROM d WHERE key = 'mathematics')),
  ('Algebra',               (SELECT id FROM d WHERE key = 'mathematics')),
  ('Calculus',              (SELECT id FROM d WHERE key = 'mathematics')),
  ('Statistics',            (SELECT id FROM d WHERE key = 'mathematics')),
  ('Linear Algebra',        (SELECT id FROM d WHERE key = 'mathematics')),
  ('Discrete Mathematics',  (SELECT id FROM d WHERE key = 'mathematics')),
  ('Trigonometry',          (SELECT id FROM d WHERE key = 'mathematics')),
  ('Pre-Calculus',          (SELECT id FROM d WHERE key = 'mathematics')),
  ('Geometry',              (SELECT id FROM d WHERE key = 'mathematics')),

  -- Computer Science
  ('Computer Science',      (SELECT id FROM d WHERE key = 'computer-science')),
  ('Programming',           (SELECT id FROM d WHERE key = 'computer-science')),
  ('Python',                (SELECT id FROM d WHERE key = 'computer-science')),
  ('JavaScript',            (SELECT id FROM d WHERE key = 'computer-science')),
  ('Java',                  (SELECT id FROM d WHERE key = 'computer-science')),
  ('C++',                   (SELECT id FROM d WHERE key = 'computer-science')),
  ('Algorithms',            (SELECT id FROM d WHERE key = 'computer-science')),
  ('Data Structures',       (SELECT id FROM d WHERE key = 'computer-science')),
  ('Web Development',       (SELECT id FROM d WHERE key = 'computer-science')),
  ('Software Engineering',  (SELECT id FROM d WHERE key = 'computer-science')),
  ('Databases',             (SELECT id FROM d WHERE key = 'computer-science')),
  ('Operating Systems',     (SELECT id FROM d WHERE key = 'computer-science')),

  -- Physics
  ('Physics',               (SELECT id FROM d WHERE key = 'physics')),
  ('Mechanics',             (SELECT id FROM d WHERE key = 'physics')),
  ('Thermodynamics',        (SELECT id FROM d WHERE key = 'physics')),
  ('Electromagnetism',      (SELECT id FROM d WHERE key = 'physics')),
  ('Quantum Physics',       (SELECT id FROM d WHERE key = 'physics')),

  -- Chemistry
  ('Chemistry',             (SELECT id FROM d WHERE key = 'chemistry')),
  ('Organic Chemistry',     (SELECT id FROM d WHERE key = 'chemistry')),
  ('Inorganic Chemistry',   (SELECT id FROM d WHERE key = 'chemistry')),
  ('Physical Chemistry',    (SELECT id FROM d WHERE key = 'chemistry')),
  ('Biochemistry',          (SELECT id FROM d WHERE key = 'chemistry')),

  -- Biology
  ('Biology',               (SELECT id FROM d WHERE key = 'biology')),
  ('Cell Biology',          (SELECT id FROM d WHERE key = 'biology')),
  ('Genetics',              (SELECT id FROM d WHERE key = 'biology')),
  ('Anatomy',               (SELECT id FROM d WHERE key = 'biology')),
  ('Ecology',               (SELECT id FROM d WHERE key = 'biology')),
  ('Microbiology',          (SELECT id FROM d WHERE key = 'biology')),

  -- English
  ('English',               (SELECT id FROM d WHERE key = 'english')),
  ('Writing',               (SELECT id FROM d WHERE key = 'english')),
  ('Essay Writing',         (SELECT id FROM d WHERE key = 'english')),
  ('Literature',            (SELECT id FROM d WHERE key = 'english')),
  ('Grammar',               (SELECT id FROM d WHERE key = 'english')),
  ('Reading Comprehension', (SELECT id FROM d WHERE key = 'english')),

  -- History
  ('History',               (SELECT id FROM d WHERE key = 'history')),
  ('World History',         (SELECT id FROM d WHERE key = 'history')),
  ('US History',            (SELECT id FROM d WHERE key = 'history')),
  ('Social Studies',        (SELECT id FROM d WHERE key = 'history')),
  ('Geography',             (SELECT id FROM d WHERE key = 'history')),

  -- Economics
  ('Economics',             (SELECT id FROM d WHERE key = 'economics')),
  ('Microeconomics',        (SELECT id FROM d WHERE key = 'economics')),
  ('Macroeconomics',        (SELECT id FROM d WHERE key = 'economics')),
  ('Business',              (SELECT id FROM d WHERE key = 'economics')),
  ('Finance',               (SELECT id FROM d WHERE key = 'economics')),
  ('Accounting',            (SELECT id FROM d WHERE key = 'economics')),

  -- Data Science
  ('Data Science',          (SELECT id FROM d WHERE key = 'data-science')),
  ('Machine Learning',      (SELECT id FROM d WHERE key = 'data-science')),
  ('Artificial Intelligence', (SELECT id FROM d WHERE key = 'data-science')),
  ('Deep Learning',         (SELECT id FROM d WHERE key = 'data-science')),
  ('Data Analysis',         (SELECT id FROM d WHERE key = 'data-science')),

  -- General (catch-all for anything not mapped above)
  ('General',               (SELECT id FROM d WHERE key = 'general')),
  ('Study Skills',          (SELECT id FROM d WHERE key = 'general')),
  ('Test Preparation',      (SELECT id FROM d WHERE key = 'general')),
  ('SAT Prep',              (SELECT id FROM d WHERE key = 'general')),
  ('ACT Prep',              (SELECT id FROM d WHERE key = 'general'))

ON CONFLICT (course) DO NOTHING;

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================

ALTER TABLE divisions          ENABLE ROW LEVEL SECURITY;
ALTER TABLE course_division_map ENABLE ROW LEVEL SECURITY;

-- Any authenticated user can read
DROP POLICY IF EXISTS "Authenticated users can read divisions" ON divisions;
CREATE POLICY "Authenticated users can read divisions" ON divisions
  FOR SELECT USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "Authenticated users can read course_division_map" ON course_division_map;
CREATE POLICY "Authenticated users can read course_division_map" ON course_division_map
  FOR SELECT USING (auth.uid() IS NOT NULL);

-- Only admins can write (INSERT / UPDATE / DELETE)
DROP POLICY IF EXISTS "Admins can manage divisions" ON divisions;
CREATE POLICY "Admins can manage divisions" ON divisions
  FOR ALL
  USING (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
  );

DROP POLICY IF EXISTS "Admins can manage course_division_map" ON course_division_map;
CREATE POLICY "Admins can manage course_division_map" ON course_division_map
  FOR ALL
  USING (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
  );

-- ============================================================
-- INDEXES
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_divisions_key        ON divisions(key);
CREATE INDEX IF NOT EXISTS idx_divisions_active      ON divisions(active);
CREATE INDEX IF NOT EXISTS idx_cdm_division_id       ON course_division_map(division_id);

-- ============================================================
-- user_xp.division_xp FORMAT (documentation comment)
-- ============================================================
-- The division_xp JSONB column in user_xp stores per-division XP as:
--   { "algorithms": 120, "calculus": 75, "data-structures": 40 }
-- Keys are divisions.key values. Values are integer XP amounts.
-- This column was created in 003-quest-tables.sql and needs no schema change.
-- Update it with:
--   UPDATE user_xp
--   SET division_xp = jsonb_set(
--       COALESCE(division_xp, '{}'::jsonb),
--       ARRAY[<division_key>],
--       to_jsonb(COALESCE((division_xp->><division_key>)::int, 0) + <xp_delta>)
--   )
--   WHERE user_id = <user_id>;
