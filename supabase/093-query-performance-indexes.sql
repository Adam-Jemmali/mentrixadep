-- Query performance indexes + RPC helpers for 10k-user scale.

-- Partial index for cron session completion scans
create index if not exists idx_sessions_scheduled_end_payout_null
  on public.sessions (end_time)
  where status = 'scheduled' and payout_status is null;

-- Analytics aggregation by event name + time
create index if not exists idx_analytics_events_name_created
  on public.analytics_events (event_name, created_at desc);

-- Rank lookup via materialized leaderboard (avoids full user_xp table scan in app code)
create or replace function public.get_user_rank(p_user_id uuid, p_division_key text)
returns integer
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_xp integer;
  v_rank integer;
begin
  select coalesce((division_xp->>p_division_key)::integer, 0)
  into v_xp
  from public.user_xp
  where user_id = p_user_id;

  if v_xp is null then
    return 1;
  end if;

  select count(*) + 1
  into v_rank
  from public.mv_division_leaderboard m
  where m.division_key = p_division_key
    and m.division_xp > v_xp;

  if v_rank is not null then
    return v_rank;
  end if;

  -- MV fallback when refresh lagging
  select count(*) + 1
  into v_rank
  from public.user_xp u
  where coalesce((u.division_xp->>p_division_key)::integer, 0) > v_xp;

  return coalesce(v_rank, 1);
end;
$$;

comment on function public.get_user_rank(uuid, text) is
  'Returns 1-based rank for a user within a division by division XP.';

grant execute on function public.get_user_rank(uuid, text) to authenticated;
grant execute on function public.get_user_rank(uuid, text) to service_role;

-- Hub snapshot: scope tutor_expertise to tutors with active future availability
create or replace function public.student_hub_snapshot(p_user_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_ok boolean;
begin
  v_ok := (p_user_id = auth.uid()) OR public.is_admin(auth.uid());
  if not v_ok then
    raise exception 'forbidden';
  end if;

  return jsonb_build_object(
    'user_xp', (select to_jsonb(x.*) from public.user_xp x where x.user_id = p_user_id),
    'user_settings', (select to_jsonb(s.*) from public.user_settings s where s.user_id = p_user_id),
    'student_courses', coalesce(
      (select jsonb_agg(to_jsonb(sc.*) order by sc.created_at asc)
       from public.student_courses sc where sc.student_id = p_user_id),
      '[]'::jsonb
    ),
    'has_pending_requests', exists (
      select 1 from public.session_requests sr
      where sr.student_id = p_user_id and sr.status = 'pending'
    ),
    'tutor_expertise', coalesce(
      (select jsonb_object_agg(t.tutor_id::text, t.courses)
       from (
         select
           tc.tutor_id,
           jsonb_agg(
             jsonb_build_object(
               'course_name', tc.course_name,
               'proof_description', tc.proof_description,
               'verified', tc.verified
             ) order by tc.course_name
           ) as courses
         from public.tutor_courses tc
         where exists (
           select 1
           from public.availability a
           where a.tutor_id = tc.tutor_id
             and a.active = true
             and a.start_time >= now()
         )
         group by tc.tutor_id
       ) t),
      '{}'::jsonb
    ),
    'available_courses', coalesce(
      (select jsonb_agg(sub.course order by sub.course)
       from (
         select distinct a.course
         from public.availability a
         where a.active = true
           and a.start_time >= now()
           and a.start_time < now() + interval '14 days'
       ) sub),
      '[]'::jsonb
    ),
    'in_progress_quest', (
      select jsonb_build_object(
        'quest_id', uqp.quest_id,
        'prompt', q.prompt,
        'num_attempts', uqp.num_attempts
      )
      from public.user_quest_progress uqp
      inner join public.quests q on q.id = uqp.quest_id
      where uqp.user_id = p_user_id and uqp.status = 'in_progress'
      order by uqp.last_attempt_at desc nulls last
      limit 1
    )
  );
end;
$$;

comment on function public.student_hub_snapshot(uuid) is
  'Single round-trip hub payload; tutor_expertise scoped to tutors with future availability.';

grant execute on function public.student_hub_snapshot(uuid) to authenticated;
grant execute on function public.student_hub_snapshot(uuid) to service_role;
