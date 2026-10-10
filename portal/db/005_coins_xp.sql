-- Guru coins and the XP economy.
-- Daily coins (10 free · 50 on test series · unlimited on coaching) reset every day in IST and are counted in guru_usage.used.
-- Bonus coins (users.guru_credits) never expire: from XP, prizes, streaks and staff grants.

create table if not exists coin_events (
  id bigserial primary key,
  user_id uuid not null references users(id) on delete cascade,
  kind text not null,             -- chat, voice, doubt, analysis, report, practice | xp_convert, prize, streak, grant
  coins int not null,             -- negative = spent, positive = granted (bonus)
  pool text not null check (pool in ('daily','bonus','unlimited')),
  ref text,
  created_at timestamptz not null default now()
);
create index if not exists coin_events_user_idx on coin_events (user_id, created_at desc);
create unique index if not exists coin_events_grant_once on coin_events (user_id, kind, ref) where coins > 0 and ref is not null;

-- Guru's full progress report across recent tests.
create table if not exists progress_reports (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  tests int not null,
  coins int not null,
  body text not null,
  created_at timestamptz not null default now()
);
create index if not exists progress_reports_user_idx on progress_reports (user_id, created_at desc);

-- Practice sets a student builds: owned by them, never listed for others.
alter table tests add column if not exists owner_id uuid references users(id) on delete cascade;
alter table tests drop constraint if exists tests_type_check;
alter table tests add constraint tests_type_check check (type in ('full_mock','sectional','topic','daily','pyq','custom','practice'));

-- Course category, so coupons can target test series or coaching.
alter table courses add column if not exists category text not null default 'test_series';
alter table courses drop constraint if exists courses_category_check;
alter table courses add constraint courses_category_check check (category in ('test_series','coaching'));

-- Coupons: a cap on the discount and an optional category.
alter table coupons add column if not exists max_discount_paise int;
alter table coupons add column if not exists category text;

-- Monthly leaderboard prizes, awarded once per month per student.
create table if not exists monthly_prizes (
  month date not null,
  exam_group text not null,
  user_id uuid not null references users(id) on delete cascade,
  rank int not null,
  xp int not null,
  coins int not null,
  coupon_id uuid references coupons(id) on delete set null,
  primary key (month, user_id)
);

-- Coaching programmes (granted by staff after enrolment; unlimited Guru).
insert into courses (slug, name, description, features, price_paise, mrp_paise, guru_quota, status, category, sort)
values
  ('cat-coaching-2027', 'CAT Coaching 2027', 'Live lectures, recordings, the CAT Test Series, books, one-on-one mentorship, GD-PI-WAT and admission guidance.', array['Live lectures for Quant, DILR and VARC','Recorded session of every class','CAT Test Series','One-on-one mentorship','Unlimited Guru'], 4000000, 4000000, 'unlimited', 'draft', 'coaching', 20),
  ('cet-coaching-2028', 'CET Coaching 2028', 'Live lectures, recordings, the CET Test Series, books, one-on-one mentorship and CAP round guidance.', array['Live lectures for LR, AR, QA and VA','Recorded session of every class','CET Test Series','One-on-one mentorship','Unlimited Guru'], 3000000, 3000000, 'unlimited', 'draft', 'coaching', 21),
  ('mba-plus', 'MBA+ (CAT + CET + OMET)', 'Everything in CAT and CET Coaching plus the OMET Combo, GD-PI-WAT and admission guidance across exams.', array['CAT and CET coaching','OMET Combo','GD, PI and WAT preparation','Unlimited Guru'], 6000000, 6000000, 'unlimited', 'draft', 'coaching', 22)
on conflict (slug) do nothing;

-- Every mock and test series plan gets 50 daily coins; coaching is unlimited.
update courses set guru_quota = '50/day' where category = 'test_series';

-- New rewards store (old items stay for history but are hidden).
update reward_items set active = false where id not in ('coins-10','coins-50','ts-5','ts-10','coach-5','coach-10','mock-credit');
insert into reward_items (id, name, cost_xp, grants, sort, active) values
  ('coins-10', '10 bonus Guru coins', 1000, '{"bonus_coins":10}', 1, true),
  ('coins-50', '50 bonus Guru coins', 5000, '{"bonus_coins":50}', 2, true),
  ('mock-credit', 'Unlock any one full mock', 2500, '{"test_credit":"mock"}', 3, true),
  ('ts-5', '5% off any test series (up to ₹150)', 1500, '{"coupon_percent":5,"cap_paise":15000,"category":"test_series"}', 4, true),
  ('ts-10', '10% off any test series (up to ₹400)', 4000, '{"coupon_percent":10,"cap_paise":40000,"category":"test_series"}', 5, true),
  ('coach-5', '5% off coaching (up to ₹2,000)', 8000, '{"coupon_percent":5,"cap_paise":200000,"category":"coaching"}', 6, true),
  ('coach-10', '10% off coaching (up to ₹4,000)', 15000, '{"coupon_percent":10,"cap_paise":400000,"category":"coaching"}', 7, true)
on conflict (id) do update set name = excluded.name, cost_xp = excluded.cost_xp, grants = excluded.grants, sort = excluded.sort, active = true;

alter table coin_events enable row level security;
alter table progress_reports enable row level security;
alter table monthly_prizes enable row level security;
do $$ begin
  if exists (select 1 from pg_roles where rolname = 'anon') then
    execute 'revoke all on coin_events, progress_reports, monthly_prizes from anon, authenticated';
    execute 'revoke all on sequence coin_events_id_seq from anon, authenticated';
  end if;
end $$;
