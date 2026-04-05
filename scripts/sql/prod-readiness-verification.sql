-- Production readiness verification pack
-- Run after applying: supabase/053-production-hardening-signup-and-search-path.sql
-- Safe read-only checks (except optional signup simulation block at bottom).

-- 1) Confirm security-definer function exists and has pinned search_path
select n.nspname as schema_name,
       p.proname as function_name,
       p.prosecdef as is_security_definer,
       p.proconfig
from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public'
  and p.proname = 'handle_new_user_with_jwt';

-- 2) Confirm legacy SECURITY DEFINER functions are pinned
select p.proname as function_name,
       p.proconfig
from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public'
  and p.proname in (
    'is_approved_tutor',
    'is_approved_student',
    'is_admin',
    'update_user_jwt_metadata',
    'auto_complete_sessions',
    'handle_auto_approve_session_request',
    'validate_rating_session',
    'seed_admin_user',
    'is_auto_approve_registrations',
    'create_user_verification'
  )
order by p.proname;

-- 3) Confirm app health telemetry path is writable/active (last 30m)
select
  count(*) filter (where event_name = 'realtime_disconnect') as realtime_disconnect_events,
  count(*) filter (where event_name = 'realtime_reconnect') as realtime_reconnect_events,
  count(*) filter (where event_name = 'checkout_started') as checkout_started,
  count(*) filter (where event_name = 'checkout_completed') as checkout_completed
from analytics_events
where created_at >= now() - interval '30 minutes';

-- 4) Checkout/webhook operational trend snapshot (last 30m)
select event_type, count(*)
from stripe_webhook_log
where processed_at >= now() - interval '30 minutes'
group by event_type
order by count(*) desc;

-- 5) Realtime disconnects by channel/reason (last 30m)
select
  coalesce(properties->>'channel', 'unknown') as channel,
  coalesce(properties->>'reason', 'unknown') as reason,
  count(*) as total
from analytics_events
where event_name = 'realtime_disconnect'
  and created_at >= now() - interval '30 minutes'
group by 1, 2
order by total desc;

-- 6) Optional manual verification guidance (no-op comments)
-- Admin self-promotion blocked:
--   Attempt a normal signup with raw_user_meta_data role='admin'.
--   Expected role in public.users: student (or tutor only via trusted server path).
-- Signup trigger works:
--   Complete a normal student signup flow and confirm users row + registration_requests row created.
