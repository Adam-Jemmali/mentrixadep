-- PROMPT 006 / Sprint 2 Security Hardening: lock user_xp to service-role writes only.
-- Run after 132-ap-calculus-ab-division-only.sql
-- Closes P0 XP self-write exploit (authenticated clients could set total_xp arbitrarily).

-- Revoke self-write from authenticated role (read policy unchanged).
DROP POLICY IF EXISTS "Users can insert own XP row" ON public.user_xp;
DROP POLICY IF EXISTS "Users can update own XP" ON public.user_xp;

-- Belt-and-suspenders: client roles cannot mutate XP rows directly.
REVOKE INSERT, UPDATE, DELETE ON TABLE public.user_xp FROM anon, authenticated;

-- applyXpAward (service role) is the only write path; total_xp must never decrease.
CREATE OR REPLACE FUNCTION public.guard_user_xp_apply_award()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'UPDATE' AND NEW.total_xp < OLD.total_xp THEN
    RAISE EXCEPTION 'user_xp.total_xp may only increase (attempted % -> %)',
      OLD.total_xp, NEW.total_xp;
  END IF;
  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION public.guard_user_xp_apply_award() IS
  'Enforces monotonic total_xp on user_xp updates from applyXpAward (service role).';

DROP TRIGGER IF EXISTS tr_guard_user_xp_apply_award ON public.user_xp;
CREATE TRIGGER tr_guard_user_xp_apply_award
  BEFORE UPDATE ON public.user_xp
  FOR EACH ROW
  EXECUTE FUNCTION public.guard_user_xp_apply_award();
