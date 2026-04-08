-- Close RLS gaps for operational security tables.

alter table if exists public.stripe_webhook_log enable row level security;
alter table if exists public.security_rate_limits enable row level security;

-- Explicit deny-by-default for anon/authenticated.
revoke all on table public.stripe_webhook_log from anon, authenticated;
revoke all on table public.security_rate_limits from anon, authenticated;

-- Service role-only access (used by server-side/admin clients).
drop policy if exists "stripe_webhook_log_service_only_select" on public.stripe_webhook_log;
create policy "stripe_webhook_log_service_only_select"
  on public.stripe_webhook_log
  for select
  to service_role
  using (true);

drop policy if exists "stripe_webhook_log_service_only_write" on public.stripe_webhook_log;
create policy "stripe_webhook_log_service_only_write"
  on public.stripe_webhook_log
  for all
  to service_role
  using (true)
  with check (true);

drop policy if exists "security_rate_limits_service_only_select" on public.security_rate_limits;
create policy "security_rate_limits_service_only_select"
  on public.security_rate_limits
  for select
  to service_role
  using (true);

drop policy if exists "security_rate_limits_service_only_write" on public.security_rate_limits;
create policy "security_rate_limits_service_only_write"
  on public.security_rate_limits
  for all
  to service_role
  using (true)
  with check (true);

