-- Index audit: EXPLAIN ANALYZE for the 6 hottest new queries.
-- Run in Supabase SQL editor (or psql) after migration 173.
-- Look for Seq Scan on tables expected to exceed ~10k rows.
-- Prefer Index Scan / Bitmap Index Scan / Index Only Scan.

-- ---------------------------------------------------------------------------
-- 1) selectItemBankQuestions — approved bank by node (+ format)
-- ---------------------------------------------------------------------------
EXPLAIN (ANALYZE, BUFFERS, FORMAT TEXT)
SELECT id, skill_node_id, prompt, item_format, difficulty_rating
FROM public.item_bank
WHERE status = 'approved'
  AND skill_node_id IN (
    SELECT id FROM public.skill_nodes WHERE subject = 'AP Calculus AB' LIMIT 20
  )
  AND item_format IN ('mcq', 'free_response', 'multi_part')
LIMIT 200;

-- Expect: Bitmap/Index on idx_item_bank_approved_node_format
--         (or idx_item_bank_item_format_approved as secondary)

-- ---------------------------------------------------------------------------
-- 2) live_board_events initial ~50-row load
-- ---------------------------------------------------------------------------
EXPLAIN (ANALYZE, BUFFERS, FORMAT TEXT)
SELECT
  id, event_type, user_id, display_name, skill_node_id, node_name,
  unit_name, accuracy_pct, new_rank_tier, is_first_attempt, occurred_at
FROM public.live_board_events
ORDER BY occurred_at DESC
LIMIT 50;

-- Expect: Index Scan Backward on idx_live_board_occurred

-- ---------------------------------------------------------------------------
-- 3) check-mastery-decay cron on next_review_at window
-- ---------------------------------------------------------------------------
EXPLAIN (ANALYZE, BUFFERS, FORMAT TEXT)
SELECT user_id, skill_node_id, attempts, correct, last_seen_at, next_review_at
FROM public.student_knowledge_nodes
WHERE skill_node_id IS NOT NULL
  AND next_review_at IS NOT NULL
  AND next_review_at > now()
  AND next_review_at <= now() + interval '24 hours'
ORDER BY next_review_at ASC
LIMIT 500;

-- Expect: Index Scan on idx_skn_decay_check
-- Note: older idx_student_knowledge_next_review is (user_id, next_review_at)
--       and cannot serve this global window scan alone.

-- ---------------------------------------------------------------------------
-- 4) guide_teaching_portfolio on guide_id + opted_in
-- ---------------------------------------------------------------------------
EXPLAIN (ANALYZE, BUFFERS, FORMAT TEXT)
SELECT id, guide_id, student_id, node_name, before_accuracy, after_accuracy, added_at
FROM public.guide_teaching_portfolio
WHERE guide_id = '00000000-0000-0000-0000-000000000001'::uuid
  AND student_opted_in = true
ORDER BY added_at DESC
LIMIT 50;

-- Expect: Index Scan on idx_guide_portfolio_guide_opted

-- ---------------------------------------------------------------------------
-- 5) node_percentile_snapshot comparison lookup
-- ---------------------------------------------------------------------------
EXPLAIN (ANALYZE, BUFFERS, FORMAT TEXT)
SELECT skill_node_id, accuracy_bucket, user_count
FROM public.node_percentile_snapshot
WHERE skill_node_id IN (
  SELECT id FROM public.skill_nodes WHERE subject = 'AP Calculus AB' LIMIT 40
);

-- Expect: Index scan via PRIMARY KEY (skill_node_id, accuracy_bucket)

-- ---------------------------------------------------------------------------
-- 6) student_goals active goal per user per subject
-- ---------------------------------------------------------------------------
EXPLAIN (ANALYZE, BUFFERS, FORMAT TEXT)
SELECT id, user_id, subject, goal_type, target_date, target_percentile, active
FROM public.student_goals
WHERE user_id = '00000000-0000-0000-0000-000000000001'::uuid
  AND subject = 'AP Calculus AB'
  AND active = true
LIMIT 1;

-- Expect: Index Only / Index Scan on idx_student_goals_one_active_per_subject
--         or idx_student_goals_user_active
