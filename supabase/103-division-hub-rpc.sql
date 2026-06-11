-- Single round trip for division hub cards (replaces per division N+1 queries).

CREATE OR REPLACE FUNCTION public.utc_week_monday(p_ts timestamptz DEFAULT now())
RETURNS date
LANGUAGE sql
IMMUTABLE
AS $$
  WITH day AS (
    SELECT (p_ts AT TIME ZONE 'UTC')::date AS d
  )
  SELECT d - (
    CASE WHEN extract(dow FROM d) = 0 THEN 6 ELSE extract(dow FROM d)::int - 1 END
  )
  FROM day;
$$;

CREATE OR REPLACE FUNCTION public.division_hub_cards(p_user_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_ok boolean;
  v_week date;
  v_focused text;
BEGIN
  v_ok := (p_user_id = auth.uid()) OR public.is_admin(auth.uid());
  IF NOT v_ok THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  v_week := public.utc_week_monday(now());

  SELECT nullif(trim(focused_division_key), '')
  INTO v_focused
  FROM public.user_settings
  WHERE user_id = p_user_id;

  RETURN coalesce(
    (
      SELECT jsonb_agg(
        jsonb_build_object(
          'key', d.key,
          'name', d.name,
          'description', d.description,
          'memberCount', coalesce(mc.cnt, 0),
          'weeklyXp', coalesce(dw.xp_earned, 0),
          'weeklyRank', CASE
            WHEN NOT coalesce(mem.is_member, false) THEN NULL
            WHEN coalesce(dw.xp_earned, 0) > 0 THEN coalesce(rk.above, 0) + 1
            WHEN coalesce(pos.cnt, 0) > 0 THEN coalesce(pos.cnt, 0) + 1
            ELSE NULL
          END,
          'isFocused', (v_focused IS NOT NULL AND v_focused = d.key),
          'isMember', coalesce(mem.is_member, false)
        )
        ORDER BY d.name
      )
      FROM public.divisions d
      LEFT JOIN LATERAL (
        SELECT count(*)::int AS cnt
        FROM public.user_divisions ud
        WHERE ud.division_key = d.key
      ) mc ON true
      LEFT JOIN LATERAL (
        SELECT true AS is_member
        FROM public.user_divisions ud
        WHERE ud.user_id = p_user_id AND ud.division_key = d.key
        LIMIT 1
      ) mem ON true
      LEFT JOIN public.division_weekly_xp dw
        ON dw.user_id = p_user_id
       AND dw.division_key = d.key
       AND dw.week_start = v_week
      LEFT JOIN LATERAL (
        SELECT count(*)::int AS above
        FROM public.division_weekly_xp x
        WHERE x.division_key = d.key
          AND x.week_start = v_week
          AND x.xp_earned > coalesce(dw.xp_earned, 0)
      ) rk ON true
      LEFT JOIN LATERAL (
        SELECT count(*)::int AS cnt
        FROM public.division_weekly_xp x
        WHERE x.division_key = d.key
          AND x.week_start = v_week
          AND x.xp_earned > 0
      ) pos ON true
      WHERE d.active = true
    ),
    '[]'::jsonb
  );
END;
$$;

COMMENT ON FUNCTION public.division_hub_cards(uuid) IS
  'Division hub card payload: member counts, weekly XP/rank, focus/membership flags — one query.';

GRANT EXECUTE ON FUNCTION public.division_hub_cards(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.division_hub_cards(uuid) TO service_role;
