-- Settings staff can change in Admin without a redeploy (e.g. the Android app fingerprints and the store-review login).
create table if not exists app_settings (
  key text primary key,
  value text not null default '',
  updated_at timestamptz not null default now(),
  updated_by uuid references users(id) on delete set null
);
alter table app_settings enable row level security;
