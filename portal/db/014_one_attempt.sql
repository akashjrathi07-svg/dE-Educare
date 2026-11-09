-- One attempt per test. Staff can allow one more for a genuine problem (internet cut, wrong test); the old result stays.
alter table attempts add column if not exists retake_allowed boolean not null default false;
