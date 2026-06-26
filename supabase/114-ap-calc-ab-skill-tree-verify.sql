-- PROMPT 002: Verify skill_nodes shape (created in 104) and AP Calculus AB seed count (100–150).
-- Seed data: scripts/data/ap-calc-ab-skill-nodes.json
-- Apply seed: npm run skill-tree:seed

-- Idempotent column guards (table originates in 104-skill-nodes.sql; do not edit that file).
ALTER TABLE public.skill_nodes
  ADD COLUMN IF NOT EXISTS description text,
  ADD COLUMN IF NOT EXISTS prerequisites uuid[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS common_misconceptions text[] DEFAULT '{}';

COMMENT ON TABLE public.skill_nodes IS
  'Canonical skill nodes per subject/unit. AP Calculus AB seeded via scripts/seed-ap-calc-ab-skill-tree.ts (100–150 nodes, 8 units).';

CREATE OR REPLACE FUNCTION public.count_ap_calc_ab_skill_nodes()
RETURNS bigint
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COUNT(*)::bigint
  FROM public.skill_nodes
  WHERE subject = 'AP Calculus AB';
$$;

COMMENT ON FUNCTION public.count_ap_calc_ab_skill_nodes() IS
  'Row count for AP Calculus AB skill_nodes (expect 100–150 after seed).';

CREATE OR REPLACE FUNCTION public.verify_ap_calc_ab_skill_nodes()
RETURNS TABLE (
  node_count bigint,
  unit_count bigint,
  passes boolean
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  c bigint;
  u bigint;
BEGIN
  SELECT COUNT(*)::bigint, COUNT(DISTINCT unit_number)::bigint
  INTO c, u
  FROM public.skill_nodes
  WHERE subject = 'AP Calculus AB';

  node_count := c;
  unit_count := u;
  passes := (c BETWEEN 100 AND 150) AND (u = 8);

  RETURN NEXT;
END;
$$;

COMMENT ON FUNCTION public.verify_ap_calc_ab_skill_nodes() IS
  'Returns AP Calculus AB skill tree stats; passes when count is 100–150 across 8 units.';

CREATE OR REPLACE FUNCTION public.assert_ap_calc_ab_skill_nodes()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  c bigint;
  u bigint;
BEGIN
  SELECT COUNT(*)::bigint, COUNT(DISTINCT unit_number)::bigint
  INTO c, u
  FROM public.skill_nodes
  WHERE subject = 'AP Calculus AB';

  IF c < 100 OR c > 150 THEN
    RAISE EXCEPTION 'AP Calculus AB skill_nodes count % out of range 100–150. Run: npm run skill-tree:seed', c;
  END IF;

  IF u <> 8 THEN
    RAISE EXCEPTION 'AP Calculus AB skill_nodes expected 8 units, found %', u;
  END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION public.count_ap_calc_ab_skill_nodes() TO authenticated;
GRANT EXECUTE ON FUNCTION public.count_ap_calc_ab_skill_nodes() TO service_role;
GRANT EXECUTE ON FUNCTION public.verify_ap_calc_ab_skill_nodes() TO authenticated;
GRANT EXECUTE ON FUNCTION public.verify_ap_calc_ab_skill_nodes() TO service_role;
GRANT EXECUTE ON FUNCTION public.assert_ap_calc_ab_skill_nodes() TO service_role;
