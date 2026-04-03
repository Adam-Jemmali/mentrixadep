-- Launch hardening: ensure every public FK has a leading index.
-- Safe + idempotent: creates only missing indexes.

do $$
declare
  r record;
  idx_name text;
  cols_quoted text;
begin
  for r in
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
    order by fk.table_name, fk.constraint_name
  loop
    select string_agg(format('%I', c), ', ')
      into cols_quoted
    from unnest(r.fk_columns) c;

    idx_name := format(
      'idx_%s_fk_%s',
      r.table_name,
      substr(md5(r.constraint_name || '_' || array_to_string(r.fk_columns, '_')), 1, 10)
    );

    execute format(
      'create index if not exists %I on %I.%I (%s);',
      idx_name,
      r.table_schema,
      r.table_name,
      cols_quoted
    );
  end loop;
end $$;
