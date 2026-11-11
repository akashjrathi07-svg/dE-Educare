-- When the portal last asked Razorpay about an unpaid order (see syncOrder in lib/server/payments.ts).
alter table orders add column if not exists checked_at timestamptz;
create index if not exists orders_unpaid_idx on orders (user_id, created_at) where status = 'created';
