-- Launch audit: identify public tables missing RLS policies.
-- This file intentionally DOES NOT auto-apply blanket policies.
-- Generate statements, review each table, then apply table-specific policies.

-- 1) Missing policy list
select
  t.tablename,
  c.relrowsecurity as rls_enabled,
  c.relforcerowsecurity as force_rls
from pg_tables t
join pg_class c
  on c.relname = t.tablename
join pg_namespace n
  on n.oid = c.relnamespace
 and n.nspname = t.schemaname
where t.schemaname = 'public'
  and not exists (
    select 1
    from pg_policies p
    where p.schemaname = 'public'
      and p.tablename = t.tablename
  )
order by t.tablename;

-- 2) Generate draft SQL for each missing-policy table (service-role baseline).
-- Review and adapt to your app's intended access model before running.
with missing as (
  select t.tablename
  from pg_tables t
  where t.schemaname = 'public'
    and not exists (
      select 1
      from pg_policies p
      where p.schemaname = 'public'
        and p.tablename = t.tablename
    )
)
select format(
$$
alter table public.%1$I enable row level security;
create policy %1$I_service_role_all on public.%1$I
  for all
  using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');
$$,
  tablename
) as sql_statement
from missing
order by tablename;
