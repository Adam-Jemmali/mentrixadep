-- Durable practice answer latencies for Faster velocity verdicts.
-- Never edit prior migrations.

CREATE TABLE IF NOT EXISTS public.skill_answer_latencies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.users (id) ON DELETE CASCADE,
  skill_node_id uuid NOT NULL REFERENCES public.skill_nodes (id) ON DELETE CASCADE,
  item_id uuid REFERENCES public.item_bank (id) ON DELETE SET NULL,
  answered_ms integer NOT NULL
    CHECK (answered_ms > 0 AND answered_ms <= 1800000),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_skill_answer_latencies_user_node_created
  ON public.skill_answer_latencies (user_id, skill_node_id, created_at DESC);

ALTER TABLE public.skill_answer_latencies ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS skill_answer_latencies_select_own ON public.skill_answer_latencies;
CREATE POLICY skill_answer_latencies_select_own ON public.skill_answer_latencies
  FOR SELECT
  USING (auth.uid() = user_id);

-- Writes via service role / server actions only.

COMMENT ON TABLE public.skill_answer_latencies IS
  'Practice answer latency samples for Faster verdicts. Clamped 1ms..30min.';
