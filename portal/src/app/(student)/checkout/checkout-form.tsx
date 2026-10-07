'use client';
import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { checkQuote, startPayment, confirmPayment } from './actions';

const inr = (paise: number) => '₹' + Math.round(paise / 100).toLocaleString('en-IN');
type RzpWindow = Window & { Razorpay?: new (o: Record<string, unknown>) => { open(): void; on(e: string, cb: (r: { error?: { description?: string } }) => void): void } };

function loadRazorpay(): Promise<boolean> {
  return new Promise(resolve => {
    if ((window as RzpWindow).Razorpay) return resolve(true);
    const s = document.createElement('script');
    s.src = 'https://checkout.razorpay.com/v1/checkout.js';
    s.onload = () => resolve(true);
    s.onerror = () => resolve(false);
    document.body.appendChild(s);
  });
}

export function CheckoutForm({ plan, test, initialCoupon }: { plan: { slug: string; name: string; price: number }; test: string; initialCoupon: string }) {
  const router = useRouter();
  const [method, setMethod] = useState('upi');
  const [coupon, setCoupon] = useState(initialCoupon);
  const [applied, setApplied] = useState<{ code: string; discount: number } | null>(null);
  const [msg, setMsg] = useState<{ kind: 'ok' | 'err'; text: string } | null>(null);
  const [busy, start] = useTransition();
  const total = plan.price - (applied?.discount ?? 0);
  const methods = [['upi', 'UPI', 'Google Pay, PhonePe, Paytm or any UPI app'], ['card', 'Credit / debit card', 'Visa, Mastercard, RuPay'], ['netbanking', 'Netbanking', 'All major Indian banks'], ['emi', 'EMI', `From ${inr(plan.price / 6)}/month, no-cost on select cards`]];

  const apply = () => start(async () => {
    const q = await checkQuote(plan.slug, coupon);
    if (!q || q.couponError || !q.coupon) { setApplied(null); setMsg({ kind: 'err', text: q?.couponError ?? 'That code is not valid.' }); return; }
    setApplied({ code: q.coupon.code, discount: q.discount });
    setMsg({ kind: 'ok', text: `Coupon applied · ${inr(q.discount)} off` });
  });

  const pay = () => start(async () => {
    setMsg(null);
    const r = await startPayment(plan.slug, applied?.code ?? '');
    if ('error' in r && r.error) { setMsg({ kind: 'err', text: r.error }); return; }
    if ('free' in r && r.free) { router.push(`/checkout/success?order=${r.orderId}&test=${encodeURIComponent(test)}`); return; }
    if ('test' in r && r.test) { router.push(`/checkout/test?order=${r.orderId}&method=${method}&test=${encodeURIComponent(test)}`); return; }
    if (!('gatewayOrderId' in r)) return;
    if (!(await loadRazorpay())) { setMsg({ kind: 'err', text: 'Could not load the payment window. Check your connection.' }); return; }
    const Rzp = (window as RzpWindow).Razorpay!;
    const rzp = new Rzp({
      key: r.keyId, order_id: r.gatewayOrderId, amount: r.amount, currency: 'INR', name: 'DE Educare', description: r.planName,
      prefill: { name: r.name, contact: r.phone, email: r.email, method },
      theme: { color: '#1F3A8A' },
      handler: async (resp: { razorpay_order_id: string; razorpay_payment_id: string; razorpay_signature: string }) => {
        const c = await confirmPayment(resp);
        // If the callback check fails, the webhook still unlocks the plan once Razorpay confirms the payment.
        router.push(`/checkout/success?order=${r.orderId}&test=${encodeURIComponent(test)}${c.ok ? '' : '&pending=1'}`);
      },
    });
    rzp.on('payment.failed', e => setMsg({ kind: 'err', text: e.error?.description ?? 'Payment failed. You have not been charged.' }));
    rzp.open();
  });

  return (
    <div className="grid" style={{ '--min': '320px', '--gap': '16px', alignItems: 'start' } as React.CSSProperties}>
      <div className="stack">
        <div style={{ fontSize: 15, fontWeight: 800 }}>Payment method</div>
        {methods.map(([id, name, sub]) => (
          <button key={id} type="button" className="card row" onClick={() => setMethod(id)} aria-pressed={method === id}
            style={{ padding: '14px 16px', borderRadius: 16, borderWidth: 2, borderColor: method === id ? 'var(--pri)' : 'var(--line)', gap: 12, textAlign: 'left', flexWrap: 'nowrap' }}>
            <span className="radio" style={{ borderColor: method === id ? 'var(--pri)' : undefined, background: 'transparent', position: 'relative' }}>{method === id && <span style={{ width: 10, height: 10, borderRadius: '50%', background: 'var(--pri)' }} />}</span>
            <span className="stack" style={{ '--gap': '2px' } as React.CSSProperties}><span style={{ fontSize: 14, fontWeight: 800 }}>{name}</span><span className="muted" style={{ fontSize: 12 }}>{sub}</span></span>
          </button>
        ))}
        <div className="note">Payments are secured by Razorpay. We never see or store card details.</div>
      </div>
      <div className="card stack" style={{ padding: 20, '--gap': '14px' } as React.CSSProperties}>
        <div style={{ fontSize: 15, fontWeight: 800 }}>Order summary</div>
        <div className="row" style={{ justifyContent: 'space-between', fontSize: 14, fontWeight: 700 }}><span>{plan.name}</span><span>{inr(plan.price)}</span></div>
        <form className="row" style={{ flexWrap: 'nowrap' }} onSubmit={e => { e.preventDefault(); apply(); }}>
          <label className="sr" htmlFor="coupon">Coupon code</label>
          <input id="coupon" className="input sunk mono" value={coupon} onChange={e => setCoupon(e.target.value.toUpperCase())} placeholder="Coupon code" maxLength={30} />
          <button className="btn chip md" disabled={busy || !coupon.trim()}>Apply</button>
        </form>
        {applied && <div className="row" style={{ justifyContent: 'space-between', fontSize: 14, fontWeight: 700, color: 'var(--ok)' }}><span>Coupon {applied.code}</span><span>−{inr(applied.discount)}</span></div>}
        {msg && <p className={'alert ' + msg.kind} role="status" style={{ margin: 0 }}>{msg.text}</p>}
        <div className="row" style={{ justifyContent: 'space-between', alignItems: 'baseline', paddingTop: 14, borderTop: '1px solid var(--line2)' }}>
          <span style={{ fontSize: 14, fontWeight: 800 }}>Total</span><span style={{ font: '800 30px var(--sans)', letterSpacing: '-.02em' }}>{inr(total)}</span>
        </div>
        <button type="button" className="btn lg block" onClick={pay} disabled={busy}>{busy ? 'Processing…' : `Pay ${inr(total)}`}</button>
      </div>
    </div>
  );
}
