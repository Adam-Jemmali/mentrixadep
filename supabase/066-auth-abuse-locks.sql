-- Auth abuse lockouts: hashed identifiers only (no raw email/IP storage).
create table if not exists public.auth_abuse_locks (
  lock_key text primary key,
  failure_count integer not null default 0 check (failure_count >= 0),
  locked_until timestamptz null,
  updated_at timestamptz not null default now()
);

alter table public.auth_abuse_locks enable row level security;

drop policy if exists "auth_abuse_locks_service_only_select" on public.auth_abuse_locks;
create policy "auth_abuse_locks_service_only_select"
  on public.auth_abuse_locks
  for select
  to service_role
  using (true);

drop policy if exists "auth_abuse_locks_service_only_write" on public.auth_abuse_locks;
create policy "auth_abuse_locks_service_only_write"
  on public.auth_abuse_locks
  for all
  to service_role
  using (true)
  with check (true);

create index if not exists idx_auth_abuse_locks_locked_until on public.auth_abuse_locks (locked_until);

