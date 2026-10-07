-- DE Educare portal + admin · schema v1
-- Plain PostgreSQL 14+ (works on Supabase). Applied by `npm run db:migrate`.

create extension if not exists pgcrypto;

-- PEOPLE -------------------------------------------------------------------
create table users (
  id uuid primary key default gen_random_uuid(),
  phone text unique not null,                 -- E.164, e.g. +919876543210
  de_id text unique not null,                 -- shown on the exam screen, e.g. DE-2026-48213
  name text, email text, city text,
  role text not null default 'student' check (role in ('student','faculty','content','support','admin')),
  exam_group text not null default 'mba' check (exam_group in ('mba','upsc','bank','ug')),
  target_exam text, target_year int, target_percentile numeric,
  theme text not null default 'light' check (theme in ('light','dark')),
  guru_credits int not null default 0,
  onboarded boolean not null default false,
  created_at timestamptz not null default now(),
  last_active_at timestamptz
);

create table otp_requests (
  id uuid primary key default gen_random_uuid(),
  phone text not null,
  code_hash text not null,
  expires_at timestamptz not null,
  attempts int not null default 0,
  used boolean not null default false,
  created_at timestamptz not null default now()
);
create index on otp_requests (phone, created_at desc);

create table sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  token_hash text unique not null,
  expires_at timestamptz not null,
  user_agent text,
  created_at timestamptz not null default now()
);

-- CATALOGUE -----------------------------------------------------------------
create table exams (
  id uuid primary key default gen_random_uuid(),
  code text unique not null,                  -- CAT, MBA-CET, SNAP, NMAT, XAT, CMAT, UPSC-PRE, IBPS-PO
  name text not null,
  exam_group text not null check (exam_group in ('mba','upsc','bank','ug')),
  status text not null default 'live' check (status in ('live','soon')),
  exam_date date,
  sort int not null default 0
);

create table sections (
  id uuid primary key default gen_random_uuid(),
  exam_id uuid not null references exams(id) on delete cascade,
  code text not null,                         -- QA, DILR, VARC, LR …
  name text not null,
  questions int,                              -- default count in a full paper
  minutes int,                                -- sectional time (null = common timer)
  sort int not null default 0,
  unique (exam_id, code)
);

create table topics (
  id uuid primary key default gen_random_uuid(),
  section_id uuid not null references sections(id) on delete cascade,
  name text not null,
  sort int not null default 0,
  unique (section_id, name)
);

-- Exam window behaviour. rules: secTimer, lock, chooseOrder, calc, tita, review, lang, omr, split, nav, palette.
-- marking: {"label": "+3 / −1 MCQ / 0 TITA", "skipPenalty": {"after": 8, "value": 0.1}}
-- curve: score fraction → percentile, used until a test has 200 attempts.
create table interface_templates (
  exam_id uuid primary key references exams(id) on delete cascade,
  rules jsonb not null default '{}',
  marking jsonb not null default '{}',
  total_minutes int,
  note text,
  curve jsonb not null default '[]',
  updated_at timestamptz not null default now()
);

-- Tests tree shown on the Tests screen (MBA → CAT → Test Series → …).
create table catalog_nodes (
  id text primary key,                        -- slug, e.g. cat-series, sec-qa, tp-ar-percentages
  parent_id text references catalog_nodes(id) on delete cascade,
  exam_group text not null,
  exam_id uuid references exams(id),
  name text not null,
  sub text,
  sort int not null default 0,
  is_free boolean not null default false
);

create table courses (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,                  -- matches the website's plan ids: cat-10, cat-ts …
  name text not null,
  exam_id uuid references exams(id),
  description text,
  features text[] not null default '{}',
  badge text,
  price_paise int not null default 0,
  mrp_paise int not null default 0,
  validity text not null default 'till_exam' check (validity in ('till_exam','6m','12m')),
  guru_quota text not null default '10/day' check (guru_quota in ('10/day','50/day','unlimited')),
  includes text[] not null default '{}',
  channels text[] not null default '{web,app}',
  status text not null default 'draft' check (status in ('live','draft')),
  sort int not null default 0,
  created_at timestamptz not null default now()
);

-- QUESTIONS -----------------------------------------------------------------
create table question_sets (
  id uuid primary key default gen_random_uuid(),
  external_id text unique,
  exam_id uuid references exams(id),
  section_id uuid references sections(id),
  text text not null
);

create sequence question_ext_seq start 1001;

create table questions (
  id uuid primary key default gen_random_uuid(),
  external_id text unique not null default ('Q' || nextval('question_ext_seq')),
  exam_id uuid not null references exams(id),
  section_id uuid not null references sections(id),
  topic_id uuid references topics(id),
  subtopic text,
  type text not null check (type in ('MCQ','TITA','MSQ')),
  difficulty text not null check (difficulty in ('easy','medium','hard')),
  ideal_time_sec int not null default 90,
  marks_correct numeric not null default 1,
  marks_wrong numeric not null default 0,
  set_id uuid references question_sets(id),
  text text not null,
  image_url text,
  options jsonb not null default '[]',        -- [{"key":"A","text":"…"}]
  correct text not null,                      -- "B" | "A|C" | "14"
  solution_text text,
  solution_video_url text,
  tags text[] not null default '{}',
  source text,
  language text not null default 'en' check (language in ('en','hi','both')),
  text_hi text, options_hi jsonb, solution_hi text,
  status text not null default 'live' check (status in ('draft','live','reported')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index on questions (exam_id, section_id, difficulty);

-- Peer statistics. Shown to students only once attempts >= 50.
create table question_stats (
  question_id uuid primary key references questions(id) on delete cascade,
  attempts int not null default 0,
  correct_count int not null default 0,
  total_time_sec bigint not null default 0,
  avg_time_sec numeric,
  topper_time_sec numeric,
  peer_accuracy_pct numeric,
  updated_at timestamptz not null default now()
);

create table question_reports (
  id uuid primary key default gen_random_uuid(),
  question_id uuid not null references questions(id) on delete cascade,
  user_id uuid references users(id) on delete set null,
  reason text, note text,
  status text not null default 'open' check (status in ('open','fixed','dismissed')),
  created_at timestamptz not null default now()
);

-- TESTS ---------------------------------------------------------------------
create table tests (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,                  -- matches website links: cat-m-1, cat-ss-0-1, cat-tp-percentages-1 …
  name text not null,
  type text not null check (type in ('full_mock','sectional','topic','daily','pyq','custom')),
  exam_id uuid not null references exams(id),
  node_id text references catalog_nodes(id) on delete set null,
  duration_min int not null,
  is_free boolean not null default false,
  solutions_visibility text not null default 'after_submit' check (solutions_visibility in ('after_submit','after_window')),
  ranking text not null default 'all_india' check (ranking in ('all_india','batch','none')),
  status text not null default 'draft' check (status in ('draft','scheduled','live','archived')),
  live_from timestamptz,
  window_end timestamptz,
  blueprint jsonb not null default '{}',
  sort int not null default 0,
  created_at timestamptz not null default now()
);
create index on tests (node_id, sort);

create table test_sections (
  id uuid primary key default gen_random_uuid(),
  test_id uuid not null references tests(id) on delete cascade,
  section_id uuid not null references sections(id),
  name text not null,
  sort int not null default 0,
  duration_min int                            -- null = common timer
);

create table test_questions (
  test_id uuid not null references tests(id) on delete cascade,
  test_section_id uuid not null references test_sections(id) on delete cascade,
  question_id uuid not null references questions(id),
  sort int not null default 0,
  primary key (test_id, question_id)
);

-- Which plans unlock a test (in addition to is_free).
create table course_tests (
  course_id uuid not null references courses(id) on delete cascade,
  test_id uuid not null references tests(id) on delete cascade,
  primary key (course_id, test_id)
);

-- ATTEMPTS ------------------------------------------------------------------
create table attempts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  test_id uuid not null references tests(id) on delete cascade,
  started_at timestamptz not null default now(),
  submitted_at timestamptz,
  status text not null default 'in_progress' check (status in ('in_progress','submitted')),
  section_order int[] not null default '{}',  -- indexes into the test's sections
  current_section int not null default 0,     -- position in section_order
  section_started_at timestamptz,
  last_question uuid,
  score numeric, max_score numeric, percentile numeric, percentile_estimated boolean,
  rank int, accuracy numeric, correct int, wrong int, skipped int, time_sec int,
  ai_analysis text, ai_generated_at timestamptz
);
create index on attempts (user_id, submitted_at desc);
create index on attempts (test_id, status, score);
create unique index one_open_attempt on attempts (user_id, test_id) where status = 'in_progress';

create table attempt_answers (
  attempt_id uuid not null references attempts(id) on delete cascade,
  question_id uuid not null references questions(id),
  answer text,
  is_correct boolean,
  marks numeric,
  time_spent_sec int not null default 0,
  visits int not null default 0,
  marked_for_review boolean not null default false,
  answered_at timestamptz,
  primary key (attempt_id, question_id)
);

create table attempt_section_results (
  attempt_id uuid not null references attempts(id) on delete cascade,
  section_id uuid not null references sections(id),
  score numeric, max_score numeric, correct int, wrong int, skipped int, time_sec int, percentile numeric,
  primary key (attempt_id, section_id)
);

-- COMMERCE ------------------------------------------------------------------
create table coupons (
  id uuid primary key default gen_random_uuid(),
  code text unique not null,
  kind text not null check (kind in ('flat','percent')),
  value numeric not null,                     -- paise for flat, % for percent
  max_uses int, used int not null default 0,
  valid_till date,
  course_ids uuid[],                          -- null = any course
  user_id uuid references users(id) on delete cascade,  -- personal coupons from the rewards store
  active boolean not null default true
);

create sequence invoice_seq start 1;

create table orders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id),
  course_id uuid not null references courses(id),
  amount_paise int not null,
  discount_paise int not null default 0,
  coupon_id uuid references coupons(id),
  gateway text not null default 'razorpay',
  gateway_order_id text unique,
  status text not null default 'created' check (status in ('created','paid','failed','refunded')),
  invoice_no text unique,
  paid_at timestamptz,
  created_at timestamptz not null default now()
);

create table payments (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references orders(id),
  gateway_payment_id text unique not null,
  method text,
  amount_paise int,
  raw jsonb,
  verified_at timestamptz not null default now()
);

create table entitlements (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  course_id uuid not null references courses(id),
  starts_at timestamptz not null default now(),
  ends_at timestamptz,
  source text not null default 'purchase' check (source in ('purchase','grant','reward')),
  order_id uuid unique references orders(id)
);
create index on entitlements (user_id);

-- CLASSES -------------------------------------------------------------------
create table batches (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  exam_id uuid references exams(id),
  course_id uuid references courses(id),
  faculty_id uuid references users(id),
  days text[] not null default '{}',
  start_time time,
  start_date date,
  capacity int not null default 100,
  created_at timestamptz not null default now()
);

create table batch_members (
  batch_id uuid not null references batches(id) on delete cascade,
  user_id uuid not null references users(id) on delete cascade,
  primary key (batch_id, user_id)
);

create table live_classes (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  batch_id uuid references batches(id) on delete set null,   -- null = open to every student of the exam group
  exam_group text not null default 'mba',
  faculty_id uuid references users(id),
  faculty_name text,
  topic text,
  starts_at timestamptz not null,
  duration_min int not null default 60,
  stream_url text,
  record boolean not null default true,
  recording_url text,
  cancelled boolean not null default false,
  created_at timestamptz not null default now()
);

create table live_messages (
  id bigserial primary key,
  class_id uuid not null references live_classes(id) on delete cascade,
  user_id uuid references users(id) on delete set null,
  text text not null,
  created_at timestamptz not null default now()
);

create table live_hands (
  class_id uuid not null references live_classes(id) on delete cascade,
  user_id uuid not null references users(id) on delete cascade,
  raised_at timestamptz not null default now(),
  primary key (class_id, user_id)
);

create table reminders (
  user_id uuid not null references users(id) on delete cascade,
  class_id uuid not null references live_classes(id) on delete cascade,
  primary key (user_id, class_id)
);

-- LIBRARY -------------------------------------------------------------------
create table library_items (
  id uuid primary key default gen_random_uuid(),
  kind text not null check (kind in ('video','pdf')),
  title text not null,
  meta text,
  url text,
  size_mb numeric,
  exam_group text not null default 'mba',
  class_id uuid references live_classes(id) on delete set null,
  sort int not null default 0,
  created_at timestamptz not null default now()
);

create table saved_items (
  user_id uuid not null references users(id) on delete cascade,
  item_id uuid not null references library_items(id) on delete cascade,
  saved_at timestamptz not null default now(),
  primary key (user_id, item_id)
);

-- GURU ----------------------------------------------------------------------
create table guru_usage (
  user_id uuid not null references users(id) on delete cascade,
  day date not null,
  used int not null default 0,
  primary key (user_id, day)
);

create table guru_messages (
  id bigserial primary key,
  user_id uuid not null references users(id) on delete cascade,
  role text not null check (role in ('user','assistant')),
  text text not null,
  context text,
  mode text not null default 'chat',
  created_at timestamptz not null default now()
);
create index on guru_messages (user_id, id desc);

create table doubts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  question text,
  had_image boolean not null default false,
  answer text,
  created_at timestamptz not null default now()
);

-- PLANNER -------------------------------------------------------------------
create table planner_tasks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  day date not null,
  title text not null,
  meta text,
  tag text,
  done boolean not null default false,
  sort int not null default 0
);
create index on planner_tasks (user_id, day);

-- COMMUNITY -----------------------------------------------------------------
create table community_posts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  exam_group text not null default 'mba',
  channel text not null,
  title text not null,
  body text,
  created_at timestamptz not null default now()
);

create table community_answers (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references community_posts(id) on delete cascade,
  user_id uuid not null references users(id) on delete cascade,
  body text not null,
  helpful boolean not null default false,
  created_at timestamptz not null default now()
);

create table post_votes (
  post_id uuid not null references community_posts(id) on delete cascade,
  user_id uuid not null references users(id) on delete cascade,
  primary key (post_id, user_id)
);

-- GAMIFICATION --------------------------------------------------------------
create table xp_events (
  id bigserial primary key,
  user_id uuid not null references users(id) on delete cascade,
  kind text not null,                         -- test_complete, daily_test, planner_task, helpful_answer, redeem
  xp int not null,                            -- negative for spending in the rewards store
  ref text,
  created_at timestamptz not null default now()
);
create index on xp_events (user_id);
create index on xp_events (created_at);
create unique index xp_once on xp_events (user_id, kind, ref) where ref is not null;

create table streaks (
  user_id uuid primary key references users(id) on delete cascade,
  current int not null default 0,
  best int not null default 0,
  last_day date
);

create table reward_items (
  id text primary key,
  name text not null,
  cost_xp int not null,
  grants jsonb not null default '{}',          -- {"test_credit":"sectional"} | {"coupon_flat":20000} | {"coupon_percent":20,"course":"all-mba"} | {"priority_days":30}
  sort int not null default 0,
  active boolean not null default true
);

create table redemptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  reward_id text not null references reward_items(id),
  coupon_id uuid references coupons(id),
  created_at timestamptz not null default now()
);

-- One credit unlocks one locked test of that kind. Earned every 1,000 XP (mock) or from the rewards store.
create table test_credits (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  kind text not null check (kind in ('mock','sectional')),
  source text not null,
  used_test_id uuid references tests(id),
  created_at timestamptz not null default now(),
  used_at timestamptz
);
create unique index credit_once on test_credits (user_id, source);

create table test_unlocks (
  user_id uuid not null references users(id) on delete cascade,
  test_id uuid not null references tests(id) on delete cascade,
  primary key (user_id, test_id)
);

create table schema_migrations (name text primary key, applied_at timestamptz not null default now());
