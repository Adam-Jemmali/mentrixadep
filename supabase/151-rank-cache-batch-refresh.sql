-- PROMPT 017: Batch rank cache refresh — drop per-VFA full rebuild; cron refreshes recent actives only.
-- Run after 150-live-board-avatar-url.sql

ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS last_vfa_at timestamptz;

COMMENT ON COLUMN public.users.last_vfa_at IS
  'Latest verified_first_attempts.attempted_at for this user. Drives incremental rank cache cron.';

CREATE INDEX IF NOT EXISTS idx_users_last_vfa_at
  ON public.users (last_vfa_at DESC)
  WHERE last_vfa_at IS NOT NULL;

UPDATE public.users u
SET last_vfa_at = sub.max_at
FROM (
  SELECT user_id, MAX(COALESCE(attempted_at, now())) AS max_at
  FROM public.verified_first_attempts
  GROUP BY user_id
) sub
WHERE u.id = sub.user_id;

CREATE OR REPLACE FUNCTION public.trg_users_touch_last_vfa_at()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.users
  SET
    last_vfa_at = COALESCE(NEW.attempted_at, now()),
    updated_at = now()
  WHERE id = NEW.user_id;
  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS verified_first_attempts_touch_last_vfa_at ON public.verified_first_attempts;
CREATE TRIGGER verified_first_attempts_touch_last_vfa_at
  AFTER INSERT ON public.verified_first_attempts
  FOR EACH ROW
  EXECUTE FUNCTION public.trg_users_touch_last_vfa_at();

COMMENT ON FUNCTION public.trg_users_touch_last_vfa_at IS
  'O(1) write on VFA insert. Rank cache rebuild runs on scheduled cron, not here.';

-- Full rebuild retained for manual backfill / verify.
CREATE OR REPLACE FUNCTION public.refresh_ap_calc_verified_rank_cache()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  WITH user_accuracy AS (
    SELECT
      vfa.user_id,
      COUNT(*)::bigint AS attempt_count,
      ROUND(
        (COUNT(*) FILTER (WHERE vfa.is_correct))::numeric * 100.0
        / NULLIF(COUNT(*), 0)
      )::integer AS accuracy_pct
    FROM public.verified_first_attempts vfa
    GROUP BY vfa.user_id
  ),
  with_percentile AS (
    SELECT
      ua.user_id,
      ua.attempt_count,
      ua.accuracy_pct,
      CASE
        WHEN ua.attempt_count >= 5 THEN
          (CUME_DIST() OVER (ORDER BY ua.accuracy_pct) * 100)::numeric(6, 2)
      END AS pct_rank
    FROM user_accuracy ua
  )
  INSERT INTO public.ap_calc_verified_rank_cache (
    user_id,
    verified_count,
    accuracy_percent,
    percentile,
    updated_at
  )
  SELECT
    wp.user_id,
    wp.attempt_count,
    wp.accuracy_pct,
    wp.pct_rank,
    now()
  FROM with_percentile wp
  ON CONFLICT (user_id) DO UPDATE SET
    verified_count = EXCLUDED.verified_count,
    accuracy_percent = EXCLUDED.accuracy_percent,
    percentile = EXCLUDED.percentile,
    updated_at = EXCLUDED.updated_at;

  DELETE FROM public.ap_calc_verified_rank_cache c
  WHERE NOT EXISTS (
    SELECT 1
    FROM public.verified_first_attempts v
    WHERE v.user_id = c.user_id
  );
END;
$$;

COMMENT ON FUNCTION public.refresh_ap_calc_verified_rank_cache IS
  'Full AP Calc AB rank cache rebuild. Manual backfill only; scheduled cron uses refresh_ap_calc_verified_rank_cache_recent.';

-- Incremental cron path: percentile uses full cohort; upsert only users active in the window.
CREATE OR REPLACE FUNCTION public.refresh_ap_calc_verified_rank_cache_recent(
  p_window interval DEFAULT interval '10 minutes'
)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_rows integer;
  v_cutoff timestamptz := now() - p_window;
BEGIN
  WITH user_accuracy AS (
    SELECT
      vfa.user_id,
      COUNT(*)::bigint AS attempt_count,
      ROUND(
        (COUNT(*) FILTER (WHERE vfa.is_correct))::numeric * 100.0
        / NULLIF(COUNT(*), 0)
      )::integer AS accuracy_pct
    FROM public.verified_first_attempts vfa
    GROUP BY vfa.user_id
  ),
  with_percentile AS (
    SELECT
      ua.user_id,
      ua.attempt_count,
      ua.accuracy_pct,
      CASE
        WHEN ua.attempt_count >= 5 THEN
          (CUME_DIST() OVER (ORDER BY ua.accuracy_pct) * 100)::numeric(6, 2)
      END AS pct_rank
    FROM user_accuracy ua
  ),
  active_users AS (
    SELECT u.id AS user_id
    FROM public.users u
    WHERE u.last_vfa_at > v_cutoff
  )
  INSERT INTO public.ap_calc_verified_rank_cache (
    user_id,
    verified_count,
    accuracy_percent,
    percentile,
    updated_at
  )
  SELECT
    wp.user_id,
    wp.attempt_count,
    wp.accuracy_pct,
    wp.pct_rank,
    now()
  FROM with_percentile wp
  INNER JOIN active_users au ON au.user_id = wp.user_id
  ON CONFLICT (user_id) DO UPDATE SET
    verified_count = EXCLUDED.verified_count,
    accuracy_percent = EXCLUDED.accuracy_percent,
    percentile = EXCLUDED.percentile,
    updated_at = EXCLUDED.updated_at;

  GET DIAGNOSTICS v_rows = ROW_COUNT;

  DELETE FROM public.ap_calc_verified_rank_cache c
  WHERE NOT EXISTS (
    SELECT 1
    FROM public.verified_first_attempts v
    WHERE v.user_id = c.user_id
  )
  AND c.user_id IN (
    SELECT u.id
    FROM public.users u
    WHERE u.last_vfa_at > v_cutoff
  );

  RETURN v_rows;
END;
$$;

COMMENT ON FUNCTION public.refresh_ap_calc_verified_rank_cache_recent IS
  'Cron worker: recompute rank rows for users with last_vfa_at inside p_window (default 10 minutes).';

GRANT EXECUTE ON FUNCTION public.refresh_ap_calc_verified_rank_cache_recent(interval) TO service_role;

DROP TRIGGER IF EXISTS verified_first_attempts_refresh_rank_cache ON public.verified_first_attempts;
DROP FUNCTION IF EXISTS public.trg_refresh_ap_calc_verified_rank_cache();

COMMENT ON TABLE public.ap_calc_verified_rank_cache IS
  'PROMPT 006/017: Precomputed AP Calculus AB VFA accuracy and peer percentile (min 5 skills). Refreshed on scheduled cron for recently active users.';

CREATE OR REPLACE FUNCTION public.verify_ap_calc_verified_rank_cache()
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
  v_refresh_trigger_exists boolean;
  v_touch_trigger_exists boolean;
  v_last_vfa_col boolean;
  v_cache_rows bigint;
  v_vfa_users bigint;
BEGIN
  SELECT EXISTS (
    SELECT 1
    FROM pg_trigger t
    INNER JOIN pg_class c ON c.oid = t.tgrelid
    WHERE c.relname = 'verified_first_attempts'
      AND t.tgname = 'verified_first_attempts_refresh_rank_cache'
      AND NOT t.tgisinternal
  ) INTO v_refresh_trigger_exists;

  RETURN QUERY SELECT
    'no_insert_refresh_trigger'::text,
    NOT v_refresh_trigger_exists,
    CASE
      WHEN v_refresh_trigger_exists THEN 'per-insert refresh trigger still present'
      ELSE 'per-insert refresh trigger removed'
    END;

  SELECT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'users'
      AND column_name = 'last_vfa_at'
  ) INTO v_last_vfa_col;

  RETURN QUERY SELECT
    'users_last_vfa_at_column'::text,
    v_last_vfa_col,
    CASE WHEN v_last_vfa_col THEN 'last_vfa_at present' ELSE 'missing last_vfa_at' END;

  SELECT EXISTS (
    SELECT 1
    FROM pg_trigger t
    INNER JOIN pg_class c ON c.oid = t.tgrelid
    WHERE c.relname = 'verified_first_attempts'
      AND t.tgname = 'verified_first_attempts_touch_last_vfa_at'
      AND NOT t.tgisinternal
  ) INTO v_touch_trigger_exists;

  RETURN QUERY SELECT
    'touch_last_vfa_trigger'::text,
    v_touch_trigger_exists,
    CASE WHEN v_touch_trigger_exists THEN 'touch trigger present' ELSE 'missing touch trigger' END;

  SELECT COUNT(*)::bigint INTO v_cache_rows FROM public.ap_calc_verified_rank_cache;
  SELECT COUNT(DISTINCT user_id)::bigint INTO v_vfa_users FROM public.verified_first_attempts;

  RETURN QUERY SELECT
    'cache_covers_vfa_users'::text,
    v_cache_rows >= v_vfa_users OR v_vfa_users = 0,
    format('cache=%s distinct vfa users=%s', v_cache_rows, v_vfa_users);
END;
$$;
