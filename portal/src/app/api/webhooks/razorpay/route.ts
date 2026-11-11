import { webhookSignatureValid, orderByGatewayId, fulfil, syncOrder } from '@/lib/server/payments';
import { sql } from '@/lib/server/db';

/** Razorpay webhook (Dashboard → Webhooks → events: payment.authorized, payment.captured, order.paid, payment.failed). */
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
  } else if (ev.event === 'payment.authorized' && o.status !== 'paid') {
    // Auto-capture off in Razorpay: capture it ourselves, then grant the plan.
    const [g] = await sql`select gateway_order_id from orders where id = ${o.id}`;
    await syncOrder({ id: o.id, gateway_order_id: g.gateway_order_id, amount_paise: o.amount_paise });
  } else if (ev.event === 'payment.failed' && o.status === 'created') {
    await sql`update orders set status = 'failed' where id = ${o.id}`;
  }
  return Response.json({ ok: true });
}
