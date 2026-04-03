-- Lists foreign keys in public schema without a matching leading index.
-- Run in Supabase SQL editor; add indexes for returned rows.
with fk as (
  select
    con.oid as constraint_oid,
    ns.nspname as table_schema,
    cls.relname as table_name,
    con.conname as constraint_name,
    con.conkey as key_attnums
  from pg_constraint con
  join pg_class cls on cls.oid = con.conrelid
  join pg_namespace ns on ns.oid = cls.relnamespace
  where con.contype = 'f'
    and ns.nspname = 'public'
),
fk_cols as (
  select
    fk.constraint_oid,
    fk.table_schema,
    fk.table_name,
    fk.constraint_name,
    array_agg(att.attname order by ord.ordinality) as fk_columns
  from fk
  join unnest(fk.key_attnums) with ordinality as ord(attnum, ordinality) on true
  join pg_attribute att
    on att.attrelid = to_regclass(format('%I.%I', fk.table_schema, fk.table_name))
   and att.attnum = ord.attnum
  group by fk.constraint_oid, fk.table_schema, fk.table_name, fk.constraint_name
),
idx_cols as (
  select
    ns.nspname as table_schema,
    cls.relname as table_name,
    idxcls.relname as index_name,
    array_agg(att.attname order by ord.ordinality) as index_columns
  from pg_index i
  join pg_class cls on cls.oid = i.indrelid
  join pg_namespace ns on ns.oid = cls.relnamespace
  join pg_class idxcls on idxcls.oid = i.indexrelid
  join unnest(i.indkey) with ordinality as ord(attnum, ordinality) on true
  join pg_attribute att on att.attrelid = cls.oid and att.attnum = ord.attnum
  where ns.nspname = 'public'
    and i.indisvalid
    and i.indisready
  group by ns.nspname, cls.relname, idxcls.relname
)
select
  fk.table_schema,
  fk.table_name,
  fk.constraint_name,
  fk.fk_columns
from fk_cols fk
where not exists (
  select 1
  from idx_cols i
  where i.table_schema = fk.table_schema
    and i.table_name = fk.table_name
    and i.index_columns[1:cardinality(fk.fk_columns)] = fk.fk_columns
)
order by fk.table_name, fk.constraint_name;
