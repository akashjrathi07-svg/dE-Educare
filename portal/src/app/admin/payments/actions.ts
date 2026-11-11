'use server';
import { revalidatePath } from 'next/cache';
import { staffOrThrow } from '@/lib/server/auth';
import { sql } from '@/lib/server/db';
import { fulfil, syncOrder, syncUnpaidOrders } from '@/lib/server/payments';

const done = (message: string, ok = true) => { revalidatePath('/admin/payments'); return { ok, message }; };

/** Asks Razorpay about every unconfirmed checkout of the last 60 days and unlocks the paid ones. */
export async function checkAll() {
  await staffOrThrow('payments');
  const n = await syncUnpaidOrders();
  return done(n ? `${n} paid order${n === 1 ? '' : 's'} found and unlocked` : 'Checked with Razorpay: none of them was actually paid');
}

/** Asks Razorpay about one order. */
export async function checkOne(orderId: string) {
  await staffOrThrow('payments');
  const [o] = await sql`select id, gateway_order_id, amount_paise, status from orders where id = ${orderId}`;
  if (!o) return done('Order not found', false);
  if (o.status === 'paid') return done('Already paid and unlocked');
  return (await syncOrder({ id: o.id, gateway_order_id: o.gateway_order_id, amount_paise: Number(o.amount_paise) }))
    ? done('Paid: plan unlocked')
    : done('Razorpay shows no completed payment for this checkout', false);
}

/** Admin only: unlock an order you have confirmed yourself (e.g. seen in the Razorpay dashboard or paid by UPI to you). */
export async function unlockAnyway(orderId: string, reference: string) {
  const me = await staffOrThrow('payments');
  if (me.role !== 'admin') return done('Only an admin can do this', false);
  const [o] = await sql`select id, amount_paise, status from orders where id = ${orderId}`;
  if (!o) return done('Order not found', false);
  if (o.status === 'paid') return done('Already paid and unlocked');
  const ref = reference.trim().slice(0, 120);
  await fulfil(o.id, 'manual_' + (ref || o.id), 'manual', Number(o.amount_paise), { manual: true, reference: ref, by: me.id });
  return done('Plan unlocked and the order marked paid');
}
