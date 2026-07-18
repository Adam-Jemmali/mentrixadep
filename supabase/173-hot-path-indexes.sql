-- Hot-path indexes for new surfaces (1k users / single Vercel).
-- Prompt asked for mastery_state on skn decay — that column does not exist;
-- mastery state is computed in app from attempts/correct. Index matches the
-- real check-mastery-decay range scan: next_review_at window, skill_node present.

-- 1) Decay cron: next_review_at BETWEEN now AND now+24h (no user_id predicate)
CREATE INDEX IF NOT EXISTS idx_skn_decay_check
  ON public.student_knowledge_nodes (next_review_at)
  WHERE next_review_at IS NOT NULL
    AND skill_node_id IS NOT NULL;

COMMENT ON INDEX public.idx_skn_decay_check IS
  'check-mastery-decay range scan. App filters verified/proficient after fetch.';

-- 2) selectItemBankQuestions: approved rows by node (+ format for free_response mix)
CREATE INDEX IF NOT EXISTS idx_item_bank_approved_node_format
  ON public.item_bank (skill_node_id, item_format)
  WHERE status = 'approved';

COMMENT ON INDEX public.idx_item_bank_approved_node_format IS
  'Quest item bank load: status=approved AND skill_node_id IN (...) with format filter.';

-- 3) live_board_events: already has idx_live_board_occurred (occurred_at DESC).
--    Keep; 48h retention stays under seq-scan risk at 1k users.

-- 4) guide_teaching_portfolio: already has idx_guide_portfolio_guide_opted.

-- 5) node_percentile_snapshot: PK (skill_node_id, accuracy_bucket) covers IN lookups.

-- 6) student_goals: already has idx_student_goals_one_active_per_subject
--    and idx_student_goals_user_active.
