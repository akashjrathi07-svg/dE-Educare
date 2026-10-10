-- Supabase exposes the public schema through its REST API with the public "anon" key.
-- This app talks to Postgres directly as the owner role and never uses that API,
-- so turn on row level security with no policies (= no API access) and drop API grants.
-- Harmless on plain Postgres. Re-run safe.
do $$
declare t record;
begin
  for t in select tablename from pg_tables where schemaname = 'public' loop
    execute format('alter table public.%I enable row level security', t.tablename);
  end loop;
  if exists (select 1 from pg_roles where rolname = 'anon') then
    execute 'revoke all on all tables in schema public from anon, authenticated';
    execute 'revoke all on all sequences in schema public from anon, authenticated';
    execute 'alter default privileges in schema public revoke all on tables from anon, authenticated';
    execute 'alter default privileges in schema public revoke all on sequences from anon, authenticated';
  end if;
end $$;
