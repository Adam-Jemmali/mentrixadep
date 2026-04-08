-- Align admin checks to the centralized is_admin(auth.uid()) helper.

-- Verification policies
drop policy if exists "admins_full_verification_access" on public.user_verifications;
create policy "admins_full_verification_access"
  on public.user_verifications
  for all
  using (public.is_admin(auth.uid()))
  with check (public.is_admin(auth.uid()));

drop policy if exists "admins_full_blacklist_access" on public.blacklisted_users;
create policy "admins_full_blacklist_access"
  on public.blacklisted_users
  for all
  using (public.is_admin(auth.uid()))
  with check (public.is_admin(auth.uid()));

drop policy if exists "admins_full_audit_access" on public.verification_audit_log;
create policy "admins_full_audit_access"
  on public.verification_audit_log
  for all
  using (public.is_admin(auth.uid()))
  with check (public.is_admin(auth.uid()));

-- Snapshot RPC admin check should match is_admin() semantics (approved admins only).
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
         group by tc.tutor_id
       ) t),
      '{}'::jsonb
    ),
    'available_courses', coalesce(
      (select jsonb_agg(sub.course order by sub.course)
       from (
         select distinct a.course
         from public.availability a
         where a.active = true and a.start_time >= now()
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

