import 'server-only';
import crypto from 'node:crypto';
import { sql } from './db';

/**
 * Razorpay. A plan unlocks only after the payment is verified on the server:
 * either the checkout callback's signature (HMAC with the key secret) or the
 * webhook's signature (HMAC with the webhook secret). Fulfilment is idempotent,
 * so receiving both is safe.
 */
export const razorpayConfigured = () => !!(process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET);
export const testModeAllowed = () => !razorpayConfigured() && (process.env.NODE_ENV !== 'production' || process.env.ALLOW_TEST_PAYMENTS === '1');

export type Quote = { course: { id: string; slug: string; name: string; price_paise: number; mrp_paise: number; validity: string; exam_id: string | null }; coupon: { id: string; code: string } | null; discount: number; total: number; couponError?: string };

export async function quote(courseSlug: string, couponCode: string | null, userId: string): Promise<Quote | null> {
  const [course] = await sql`select id, slug, name, price_paise, mrp_paise, validity, exam_id from courses where slug = ${courseSlug} and status = 'live'`;
  if (!course || course.price_paise <= 0) return null;
  const q: Quote = { course: course as Quote['course'], coupon: null, discount: 0, total: course.price_paise };
  const code = (couponCode ?? '').trim().toUpperCase();
  if (!code) return q;
  const [c] = await sql`
    select * from coupons where upper(code) = ${code} and active and (valid_till is null or valid_till >= current_date)
      and (max_uses is null or used < max_uses) and (course_ids is null or ${course.id} = any(course_ids)) and (user_id is null or user_id = ${userId})`;
  if (!c) return { ...q, couponError: 'That code is not valid for this plan.' };
  const discount = Math.min(course.price_paise, c.kind === 'flat' ? Number(c.value) : Math.round((course.price_paise * Number(c.value)) / 100));
  return { ...q, coupon: { id: c.id, code: c.code }, discount, total: course.price_paise - discount };
}

/** Creates our order and, when Razorpay is configured, the matching Razorpay order. */
export async function createOrder(userId: string, q: Quote) {
  const [o] = await sql`
    insert into orders (user_id, course_id, amount_paise, discount_paise, coupon_id)
    values (${userId}, ${q.course.id}, ${q.total}, ${q.discount}, ${q.coupon?.id ?? null}) returning id`;
  if (q.total === 0) {
    await sql`update orders set gateway = 'free', gateway_order_id = ${'free_' + o.id} where id = ${o.id}`;
    await fulfil(o.id, 'free_' + o.id, 'coupon', 0, {});
    return { orderId: o.id as string, free: true as const };
  }
  if (razorpayConfigured()) {
    const res = await fetch('https://api.razorpay.com/v1/orders', {
      method: 'POST',
      headers: { 'content-type': 'application/json', authorization: 'Basic ' + Buffer.from(`${process.env.RAZORPAY_KEY_ID}:${process.env.RAZORPAY_KEY_SECRET}`).toString('base64') },
      body: JSON.stringify({ amount: q.total, currency: 'INR', receipt: o.id, notes: { course: q.course.slug, user: userId } }),
    });
    if (!res.ok) {
      console.error('[razorpay] order failed', res.status, await res.text());
      await sql`update orders set status = 'failed' where id = ${o.id}`;
      return { error: 'Payment could not be started. Please try again.' as const };
    }
    const rz = await res.json();
    await sql`update orders set gateway_order_id = ${rz.id} where id = ${o.id}`;
    return { orderId: o.id as string, gatewayOrderId: rz.id as string, keyId: process.env.RAZORPAY_KEY_ID!, amount: q.total };
  }
  if (!testModeAllowed()) return { error: 'Payments are not set up yet.' as const };
  await sql`update orders set gateway = 'test', gateway_order_id = ${'test_' + o.id} where id = ${o.id}`;
  return { orderId: o.id as string, test: true as const };
}

const safeEqual = (a: string, b: string) => a.length === b.length && crypto.timingSafeEqual(Buffer.from(a), Buffer.from(b));

/** Checkout callback: signature = HMAC_SHA256(order_id + "|" + payment_id, key_secret). */
export function checkoutSignatureValid(gatewayOrderId: string, paymentId: string, signature: string) {
  const expected = crypto.createHmac('sha256', process.env.RAZORPAY_KEY_SECRET ?? '').update(`${gatewayOrderId}|${paymentId}`).digest('hex');
  return safeEqual(expected, signature);
}

/** Webhook: X-Razorpay-Signature = HMAC_SHA256(raw body, webhook secret). */
export function webhookSignatureValid(rawBody: string, signature: string) {
  const secret = process.env.RAZORPAY_WEBHOOK_SECRET;
  if (!secret) return false;
  return safeEqual(crypto.createHmac('sha256', secret).update(rawBody).digest('hex'), signature);
}

/** Marks the order paid and grants the plan. Safe to call more than once. */
export async function fulfil(orderId: string, paymentId: string, method: string | null, amount: number, raw: unknown) {
  return sql.begin(async tx => {
    const [o] = await tx`select o.*, c.validity, e.exam_date from orders o join courses c on c.id = o.course_id left join exams e on e.id = c.exam_id where o.id = ${orderId} for update of o`;
    if (!o) return false;
    if (o.status === 'paid') return true;
    await tx`insert into payments (order_id, gateway_payment_id, method, amount_paise, raw) values (${orderId}, ${paymentId}, ${method}, ${amount}, ${tx.json((raw ?? {}) as never)}) on conflict (gateway_payment_id) do nothing`;
    const [{ n }] = await tx`select nextval('invoice_seq')::int as n`;
    await tx`update orders set status = 'paid', paid_at = now(), invoice_no = ${'DE-' + new Date().getFullYear() + '-' + String(n).padStart(6, '0')} where id = ${orderId}`;
    const ends = o.validity === '6m' ? sql`now() + interval '6 months'` : o.validity === '12m' ? sql`now() + interval '12 months'`
      : o.exam_date ? sql`${o.exam_date}::date + interval '1 day'` : sql`now() + interval '12 months'`;
    await tx`insert into entitlements (user_id, course_id, ends_at, source, order_id) values (${o.user_id}, ${o.course_id}, ${ends}, 'purchase', ${orderId}) on conflict (order_id) do nothing`;
    if (o.coupon_id) await tx`update coupons set used = used + 1 where id = ${o.coupon_id}`;
    return true;
  });
}

export async function orderByGatewayId(gatewayOrderId: string) {
  const [o] = await sql`select id, user_id, amount_paise, status from orders where gateway_order_id = ${gatewayOrderId}`;
  return o as { id: string; user_id: string; amount_paise: number; status: string } | undefined;
}
