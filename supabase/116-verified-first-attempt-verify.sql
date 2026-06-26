-- PROMPT 005: Verify Verified First Attempt mechanic (rank honesty).
-- Table created in 109-verified-first-attempt.sql; this migration verifies shape + RLS.

CREATE TABLE IF NOT EXISTS public.verified_first_attempts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.users (id) ON DELETE CASCADE,
  skill_node_id uuid NOT NULL REFERENCES public.skill_nodes (id) ON DELETE CASCADE,
  item_id uuid NOT NULL REFERENCES public.item_bank (id) ON DELETE CASCADE,
  is_correct boolean NOT NULL,
  attempted_at timestamptz DEFAULT now(),
  UNIQUE (user_id, skill_node_id)
);

CREATE INDEX IF NOT EXISTS idx_vfa_user
  ON public.verified_first_attempts (user_id);

ALTER TABLE public.verified_first_attempts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS vfa_read_own ON public.verified_first_attempts;
CREATE POLICY vfa_read_own ON public.verified_first_attempts
  FOR SELECT USING (auth.uid() = user_id);

COMMENT ON TABLE public.verified_first_attempts IS
  'PROMPT 005: Immutable first attempt per user per skill node. UNIQUE(user_id, skill_node_id) is the entire mechanic. Service role inserts only.';

CREATE OR REPLACE FUNCTION public.verify_verified_first_attempt_mechanic()
RETURNS TABLE (
  check_name text,
  passed boolean,
  detail text
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_col_count int;
  v_unique_ok boolean;
  v_rls_ok boolean;
  v_user_insert_policies int;
BEGIN
  SELECT COUNT(*)::int
  INTO v_col_count
  FROM information_schema.columns
  WHERE table_schema = 'public'
    AND table_name = 'verified_first_attempts'
    AND column_name IN ('id', 'user_id', 'skill_node_id', 'item_id', 'is_correct', 'attempted_at');

  RETURN QUERY SELECT
    'required_columns'::text,
    v_col_count = 6,
    format('found %s/6 columns', v_col_count);

  SELECT EXISTS (
    SELECT 1
    FROM pg_constraint c
    INNER JOIN pg_class t ON t.oid = c.conrelid
    INNER JOIN pg_namespace n ON n.oid = t.relnamespace
    WHERE n.nspname = 'public'
      AND t.relname = 'verified_first_attempts'
      AND c.contype = 'u'
      AND pg_get_constraintdef(c.oid) ILIKE '%user_id%'
      AND pg_get_constraintdef(c.oid) ILIKE '%skill_node_id%'
  ) INTO v_unique_ok;

  RETURN QUERY SELECT
    'unique_user_skill_node'::text,
    v_unique_ok,
    CASE WHEN v_unique_ok THEN 'UNIQUE (user_id, skill_node_id) present' ELSE 'missing unique constraint' END;

  SELECT c.relrowsecurity
  INTO v_rls_ok
  FROM pg_class c
  INNER JOIN pg_namespace n ON n.oid = c.relnamespace
  WHERE n.nspname = 'public' AND c.relname = 'verified_first_attempts';

  RETURN QUERY SELECT
    'rls_enabled'::text,
    COALESCE(v_rls_ok, false),
    CASE WHEN v_rls_ok THEN 'RLS on' ELSE 'RLS off' END;

  SELECT COUNT(*)::int
  INTO v_user_insert_policies
  FROM pg_policies
  WHERE schemaname = 'public'
    AND tablename = 'verified_first_attempts'
    AND cmd = 'INSERT';

  RETURN QUERY SELECT
    'no_user_insert_policy'::text,
    v_user_insert_policies = 0,
    format('%s INSERT policies (expect 0; service role writes)', v_user_insert_policies);
END;
$$;

GRANT EXECUTE ON FUNCTION public.verify_verified_first_attempt_mechanic() TO authenticated;
GRANT EXECUTE ON FUNCTION public.verify_verified_first_attempt_mechanic() TO service_role;
