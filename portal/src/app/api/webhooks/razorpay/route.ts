import { webhookSignatureValid, orderByGatewayId, fulfil } from '@/lib/server/payments';
import { sql } from '@/lib/server/db';

/** Razorpay webhook (Dashboard → Webhooks → events: payment.captured, order.paid, payment.failed). */
export async function POST(req: Request) {
  const raw = await req.text();
  if (!webhookSignatureValid(raw, req.headers.get('x-razorpay-signature') ?? '')) return new Response('bad signature', { status: 400 });
  const ev = JSON.parse(raw);
  const pay = ev.payload?.payment?.entity;
  const gatewayOrder = pay?.order_id ?? ev.payload?.order?.entity?.id;
  if (!gatewayOrder) return Response.json({ ok: true });
  const o = await orderByGatewayId(gatewayOrder);
  if (!o) return Response.json({ ok: true });
  if (ev.event === 'payment.captured' || ev.event === 'order.paid') {
    if (pay && pay.amount !== o.amount_paise) { console.error('[razorpay] amount mismatch', gatewayOrder); return Response.json({ ok: false }); }
    await fulfil(o.id, pay?.id ?? 'order_' + gatewayOrder, pay?.method ?? null, pay?.amount ?? o.amount_paise, ev);
  } else if (ev.event === 'payment.failed' && o.status === 'created') {
    await sql`update orders set status = 'failed' where id = ${o.id}`;
  }
  return Response.json({ ok: true });
}
