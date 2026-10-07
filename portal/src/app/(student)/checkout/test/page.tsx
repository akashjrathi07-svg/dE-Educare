import { redirect } from 'next/navigation';
import { requireUser } from '@/lib/server/auth';
import { sql } from '@/lib/server/db';
import { testModeAllowed } from '@/lib/server/payments';
import { rupees } from '@/lib/server/shell';
import { simulatePayment } from '../actions';

/** Development stand-in for the Razorpay window. Not available when Razorpay keys are set or in production. */
export default async function TestPayment({ searchParams }: { searchParams: Promise<{ order?: string; method?: string; test?: string }> }) {
  const sp = await searchParams;
  const u = await requireUser('/plans');
  if (!testModeAllowed() || !sp.order) redirect('/plans');
  const [o] = await sql`select o.id, o.amount_paise, c.name from orders o join courses c on c.id = o.course_id where o.id = ${sp.order} and o.user_id = ${u.id} and o.status = 'created' and o.gateway = 'test'`;
  if (!o) redirect('/plans');
  return (
    <form action={simulatePayment} className="card stack" style={{ maxWidth: 480, margin: '40px auto', padding: 28, '--gap': '14px' } as React.CSSProperties}>
      <span className="tag mid">TEST MODE</span>
      <h1 className="h1" style={{ fontSize: 24 }}>Simulated payment</h1>
      <p className="muted" style={{ margin: 0, fontSize: 14 }}>Razorpay keys are not set, so this page stands in for the payment window. Add RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET to take real payments.</p>
      <div className="row" style={{ justifyContent: 'space-between', fontWeight: 800 }}><span>{o.name}</span><span>{rupees(o.amount_paise)}</span></div>
      <input type="hidden" name="order" value={o.id} /><input type="hidden" name="method" value={sp.method ?? 'upi'} /><input type="hidden" name="test" value={sp.test ?? ''} />
      <button className="btn lg block">Simulate successful payment</button>
    </form>
  );
}
