-- Website form submissions (details and offers, call-back), shown in Admin → Leads.
create table if not exists leads (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  name text not null,
  phone text not null,
  email text,
  city text,
  interest text,
  interest_label text,
  currently text,
  message text,
  form text not null,            -- which form and button, e.g. "Pop-up form: See test series"
  page text,                     -- page URL the form was sent from
  utm jsonb not null default '{}',
  contacted boolean not null default false,
  contacted_at timestamptz,
  contacted_by uuid references users(id),
  note text
);
create index if not exists leads_created_idx on leads (created_at desc);
create index if not exists leads_phone_idx on leads (phone);
alter table leads enable row level security;   -- like every table: only the portal's server can read it
