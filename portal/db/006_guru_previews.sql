-- Guru previews for website visitors who are not signed in: 3 a day per visitor (hashed IP).
create table if not exists guru_previews (
  visitor text not null,
  day date not null,
  used int not null default 0,
  primary key (visitor, day)
);
alter table guru_previews enable row level security;
do $$ begin
  if exists (select 1 from pg_roles where rolname = 'anon') then
    execute 'revoke all on guru_previews from anon, authenticated';
  end if;
end $$;
