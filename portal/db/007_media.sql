-- Images uploaded with questions (graphs and figures from Word files), served at /media/<id>.
create table if not exists media (
  id uuid primary key default gen_random_uuid(),
  mime text not null,
  bytes bytea not null,
  sha256 text unique not null,
  created_at timestamptz not null default now()
);
alter table media enable row level security;
do $$ begin
  if exists (select 1 from pg_roles where rolname = 'anon') then
    execute 'revoke all on media from anon, authenticated';
  end if;
end $$;
