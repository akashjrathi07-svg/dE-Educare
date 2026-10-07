'use server';
import { redirect } from 'next/navigation';
import { currentUser } from '@/lib/server/auth';
import { quote, createOrder, checkoutSignatureValid, orderByGatewayId, fulfil, testModeAllowed } from '@/lib/server/payments';
import { sql } from '@/lib/server/db';

export async function checkQuote(plan: string, coupon: string) {
  const u = await currentUser();
  if (!u) return null;
  return quote(plan, coupon, u.id);
}

export async function startPayment(plan: string, coupon: string) {
  const u = await currentUser();
  if (!u) return { error: 'Please sign in again.' };
  const q = await quote(plan, coupon, u.id);
  if (!q) return { error: 'This plan is not available.' };
  if (q.couponError) return { error: q.couponError };
  const r = await createOrder(u.id, q);
  if ('error' in r) return { error: r.error };
  return { ...r, name: u.name ?? '', phone: u.phone, email: u.email ?? '', planName: q.course.name };
}

/** Called by Razorpay Checkout's success handler. Grants the plan only if the signature checks out. */
export async function confirmPayment(p: { razorpay_order_id: string; razorpay_payment_id: string; razorpay_signature: string }) {
  const u = await currentUser();
  if (!u) return { ok: false };
  const o = await orderByGatewayId(p.razorpay_order_id);
  if (!o || o.user_id !== u.id || !checkoutSignatureValid(p.razorpay_order_id, p.razorpay_payment_id, p.razorpay_signature)) return { ok: false };
  await fulfil(o.id, p.razorpay_payment_id, null, o.amount_paise, p);
  return { ok: true, orderId: o.id };
}

/** Development only: simulates a successful payment when Razorpay keys are not set. */
export async function simulatePayment(form: FormData) {
  const u = await currentUser();
  if (!u || !testModeAllowed()) redirect('/plans');
  const orderId = String(form.get('order'));
  const [o] = await sql`select id, amount_paise from orders where id = ${orderId} and user_id = ${u.id} and gateway = 'test'`;
  if (!o) redirect('/plans');
  await fulfil(o.id, 'testpay_' + o.id, String(form.get('method') ?? 'upi'), o.amount_paise, { simulated: true });
  redirect(`/checkout/success?order=${o.id}&test=${encodeURIComponent(String(form.get('test') ?? ''))}`);
}
