-- Fold legacy division XP (general, mathematics, etc.) into ap-calculus-ab — one league only.

DO $$
DECLARE
  r record;
  legacy_sum int;
  current_ab int;
BEGIN
  FOR r IN
    SELECT user_id, division_xp
    FROM public.user_xp
    WHERE division_xp IS NOT NULL
      AND division_xp <> '{}'::jsonb
  LOOP
    SELECT coalesce(sum((value)::int), 0)
    INTO legacy_sum
    FROM jsonb_each_text(r.division_xp) AS t(key, value)
    WHERE key <> 'ap-calculus-ab';

    current_ab := coalesce((r.division_xp->>'ap-calculus-ab')::int, 0);

    IF legacy_sum > 0 THEN
      UPDATE public.user_xp
      SET division_xp = jsonb_build_object('ap-calculus-ab', current_ab + legacy_sum)
      WHERE user_id = r.user_id;
    ELSIF NOT (r.division_xp ? 'ap-calculus-ab') AND jsonb_typeof(r.division_xp) = 'object' THEN
      UPDATE public.user_xp
      SET division_xp = jsonb_build_object('ap-calculus-ab', current_ab)
      WHERE user_id = r.user_id;
    END IF;
  END LOOP;
END $$;

INSERT INTO public.division_weekly_xp (user_id, division_key, week_start, xp_earned, updated_at)
SELECT
  user_id,
  'ap-calculus-ab',
  week_start,
  sum(xp_earned),
  max(updated_at)
FROM public.division_weekly_xp
WHERE division_key <> 'ap-calculus-ab'
GROUP BY user_id, week_start
ON CONFLICT (user_id, division_key, week_start) DO UPDATE
SET
  xp_earned = public.division_weekly_xp.xp_earned + EXCLUDED.xp_earned,
  updated_at = greatest(public.division_weekly_xp.updated_at, EXCLUDED.updated_at);

DELETE FROM public.division_weekly_xp
WHERE division_key <> 'ap-calculus-ab';

UPDATE public.user_settings
SET focused_division_key = 'ap-calculus-ab'
WHERE focused_division_key IS DISTINCT FROM 'ap-calculus-ab';

INSERT INTO public.user_divisions (user_id, division_key)
SELECT ux.user_id, 'ap-calculus-ab'
FROM public.user_xp ux
WHERE coalesce((ux.division_xp->>'ap-calculus-ab')::int, 0) > 0
ON CONFLICT DO NOTHING;

REFRESH MATERIALIZED VIEW public.mv_division_leaderboard;
