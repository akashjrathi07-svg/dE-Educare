-- Student reviews (shown on deeducare.com after approval) and free resources
-- (PDFs uploaded in Admin, read view-only in the portal, listed on the website).

create table if not exists reviews (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  kind text not null check (kind in ('tests','classes','guru')),
  rating int not null check (rating between 1 and 5),
  body text not null,
  display_name text not null,
  exam_label text,
  photo bytea,
  photo_mime text,
  consent boolean not null default false,
  status text not null default 'pending' check (status in ('pending','approved','rejected')),
  reviewed_by uuid references users(id) on delete set null,
  reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, kind)
);
create index if not exists reviews_status_idx on reviews (status, created_at desc);

-- Library: which exam, shown on the website, and the uploaded file itself.
alter table library_items add column if not exists exam_code text;
alter table library_items add column if not exists description text;
alter table library_items add column if not exists pages int;
alter table library_items add column if not exists public boolean not null default false;
alter table library_items add column if not exists status text not null default 'live' check (status in ('live','draft'));

-- PDFs are stored in parts of up to 3 MB so uploads and reads stay under the hosting request limit.
create table if not exists library_file_parts (
  item_id uuid not null references library_items(id) on delete cascade,
  part int not null,
  bytes bytea not null,
  primary key (item_id, part)
);

alter table reviews enable row level security;
alter table library_file_parts enable row level security;
do $$ begin
  if exists (select 1 from pg_roles where rolname = 'anon') then
    execute 'revoke all on reviews, library_file_parts from anon, authenticated';
  end if;
end $$;
