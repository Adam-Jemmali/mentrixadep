-- PROMPT 003: Verify item_bank shape and AP Calculus AB coverage (300–500 approved).
-- Generation: npm run item-bank:generate (offline, auto-approved via Gemini verifier).

ALTER TABLE public.item_bank
  ADD COLUMN IF NOT EXISTS reviewed_by text,
  ADD COLUMN IF NOT EXISTS reviewed_at timestamptz;

COMMENT ON TABLE public.item_bank IS
  'Pre-generated AP Calculus AB MCQs. Offline script inserts approved rows only; students read approved via RLS.';

COMMENT ON COLUMN public.item_bank.reviewed_by IS
  'Auto: gemini-auto. Manual override: admin email.';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'item_bank_status_check'
  ) THEN
    ALTER TABLE public.item_bank
      ADD CONSTRAINT item_bank_status_check
      CHECK (status IN ('pending_review', 'approved', 'rejected'));
  END IF;
END $$;

CREATE OR REPLACE FUNCTION public.count_ap_calc_ab_approved_items()
RETURNS bigint
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COUNT(*)::bigint
  FROM public.item_bank ib
  INNER JOIN public.skill_nodes sn ON sn.id = ib.skill_node_id
  WHERE sn.subject = 'AP Calculus AB'
    AND ib.status = 'approved';
$$;

CREATE OR REPLACE FUNCTION public.verify_ap_calc_ab_item_bank_coverage()
RETURNS TABLE (
  approved_count bigint,
  nodes_below_min bigint,
  passes_global boolean,
  passes_per_node boolean
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  approved bigint;
  below bigint;
BEGIN
  SELECT COUNT(*)::bigint
  INTO approved
  FROM public.item_bank ib
  INNER JOIN public.skill_nodes sn ON sn.id = ib.skill_node_id
  WHERE sn.subject = 'AP Calculus AB'
    AND ib.status = 'approved';

  SELECT COUNT(*)::bigint
  INTO below
  FROM public.skill_nodes sn
  LEFT JOIN (
    SELECT skill_node_id, COUNT(*)::int AS c
    FROM public.item_bank
    WHERE status = 'approved'
    GROUP BY skill_node_id
  ) counts ON counts.skill_node_id = sn.id
  WHERE sn.subject = 'AP Calculus AB'
    AND COALESCE(counts.c, 0) < 3;

  approved_count := approved;
  nodes_below_min := below;
  passes_global := approved BETWEEN 300 AND 500;
  passes_per_node := below = 0;

  RETURN NEXT;
END;
$$;

GRANT EXECUTE ON FUNCTION public.count_ap_calc_ab_approved_items() TO authenticated;
GRANT EXECUTE ON FUNCTION public.count_ap_calc_ab_approved_items() TO service_role;
GRANT EXECUTE ON FUNCTION public.verify_ap_calc_ab_item_bank_coverage() TO authenticated;
GRANT EXECUTE ON FUNCTION public.verify_ap_calc_ab_item_bank_coverage() TO service_role;
