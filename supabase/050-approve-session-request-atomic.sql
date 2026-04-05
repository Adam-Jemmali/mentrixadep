-- Atomic approval path for session requests to prevent race conditions
-- when tutors/admins approve the same request concurrently.

create or replace function public.approve_session_request_atomic(
  p_request_id uuid,
  p_actor_id uuid
)
returns table(session_id uuid)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_request session_requests%rowtype;
  v_availability availability%rowtype;
  v_price_cents integer;
  v_session_id uuid;
  v_caller_uid uuid;
  v_actor_is_admin boolean;
begin
  v_caller_uid := auth.uid();

  -- For direct authenticated RPC calls, actor_id must match JWT user id.
  -- Service-role/server invocations are allowed to act on behalf of others.
  if auth.role() <> 'service_role' and (v_caller_uid is null or v_caller_uid <> p_actor_id) then
    raise exception 'request_forbidden';
  end if;

  v_actor_is_admin := is_admin(p_actor_id);

  select *
    into v_request
    from session_requests
   where id = p_request_id
   for update;

  if not found then
    raise exception 'request_not_found';
  end if;

  if v_request.status <> 'pending' then
    raise exception 'request_not_pending';
  end if;

  if not v_actor_is_admin and v_request.tutor_id <> p_actor_id then
    raise exception 'request_forbidden';
  end if;

  select *
    into v_availability
    from availability
   where id = v_request.availability_id
   for update;

  if not found then
    raise exception 'availability_not_found';
  end if;

  if exists (
    select 1
      from sessions s
     where s.tutor_id = v_request.tutor_id
       and s.start_time = v_availability.start_time
       and s.status = 'scheduled'
  ) then
    raise exception 'tutor_double_booked';
  end if;

  if exists (
    select 1
      from sessions s
     where s.student_id = v_request.student_id
       and s.start_time = v_availability.start_time
       and s.status = 'scheduled'
  ) then
    raise exception 'student_double_booked';
  end if;

  update session_requests
     set status = 'approved',
         updated_at = now()
   where id = v_request.id
     and status = 'pending';

  if not found then
    raise exception 'request_not_pending';
  end if;

  v_price_cents := coalesce(v_availability.price_per_session, 2500);

  insert into sessions (
    student_id,
    tutor_id,
    availability_id,
    course,
    start_time,
    end_time,
    completed,
    price_per_session,
    stripe_checkout_session_id,
    stripe_payment_intent_id,
    stripe_refund_id
  )
  values (
    v_request.student_id,
    v_request.tutor_id,
    v_request.availability_id,
    v_availability.course,
    v_availability.start_time,
    v_availability.end_time,
    false,
    v_price_cents,
    v_request.stripe_checkout_session_id,
    v_request.stripe_payment_intent_id,
    v_request.stripe_refund_id
  )
  returning id into v_session_id;

  delete from availability
   where id = v_request.availability_id;

  return query select v_session_id;

exception
  when unique_violation then
    raise exception 'session_conflict';
end;
$$;

comment on function public.approve_session_request_atomic(uuid, uuid)
is 'Atomically approves a pending session request and creates the scheduled session.';

revoke all on function public.approve_session_request_atomic(uuid, uuid) from public;
grant execute on function public.approve_session_request_atomic(uuid, uuid) to service_role;
