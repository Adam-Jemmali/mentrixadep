-- Defer breakthrough pack assignment when item_bank has fewer than 3 approved items.

ALTER TABLE public.breakthrough_quest_queue
  ADD COLUMN IF NOT EXISTS available_at timestamptz NOT NULL DEFAULT now();

CREATE INDEX IF NOT EXISTS idx_breakthrough_quest_queue_available
  ON public.breakthrough_quest_queue (student_id, available_at)
  WHERE quest_id IS NULL AND completed_at IS NULL;

COMMENT ON COLUMN public.breakthrough_quest_queue.available_at IS
  'Earliest time createNextBreakthroughQuest may assign a quest from item_bank for this row.';
