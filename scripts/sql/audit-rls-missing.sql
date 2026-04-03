-- Lists public tables that have no RLS policies defined.
-- Run in Supabase SQL editor before launch.
select
  t.tablename
from pg_tables t
where t.schemaname = 'public'
  and not exists (
    select 1
    from pg_policies p
    where p.schemaname = 'public'
      and p.tablename = t.tablename
  )
order by t.tablename;
