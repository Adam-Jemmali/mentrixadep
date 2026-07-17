-- PROMPT P#013 (Sprint 3): Symbolic grading result cache for free-response items.
-- Run after 156-free-response-items.sql

CREATE TABLE IF NOT EXISTS public.symbolic_grading_cache (
  student_expr_hash text NOT NULL,
  correct_expr_hash text NOT NULL,
  result boolean NOT NULL,
  computed_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (student_expr_hash, correct_expr_hash)
);

CREATE INDEX IF NOT EXISTS idx_symbolic_grading_cache_computed
  ON public.symbolic_grading_cache (computed_at DESC);

COMMENT ON TABLE public.symbolic_grading_cache IS
  'Memoized symbolic equivalence checks. Hits under 24h skip Edge Function compute.';

ALTER TABLE public.symbolic_grading_cache ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public.symbolic_grading_cache FROM PUBLIC;
GRANT ALL ON TABLE public.symbolic_grading_cache TO service_role;

DROP POLICY IF EXISTS symbolic_grading_cache_service_role_all ON public.symbolic_grading_cache;
CREATE POLICY symbolic_grading_cache_service_role_all
  ON public.symbolic_grading_cache
  FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');
