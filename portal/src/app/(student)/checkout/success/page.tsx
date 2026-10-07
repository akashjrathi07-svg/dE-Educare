import Link from 'next/link';
import { requireUser } from '@/lib/server/auth';
import { sql } from '@/lib/server/db';

export const metadata = { title: 'Payment' };

export default async function Success({ searchParams }: { searchParams: Promise<{ order?: string; test?: string; pending?: string }> }) {
  const sp = await searchParams;
  const u = await requireUser('/plans');
  const [o] = sp.order ? await sql`select o.status, o.invoice_no, c.name, c.guru_quota from orders o join courses c on c.id = o.course_id where o.id = ${sp.order} and o.user_id = ${u.id}` : [];
  if (!o) return <div className="empty">Order not found. <Link href="/plans">Back to plans</Link></div>;
  const paid = o.status === 'paid';
  return (
    <div className="card stack" style={{ maxWidth: 520, margin: '40px auto', padding: 36, borderRadius: 24, alignItems: 'center', textAlign: 'center', '--gap': '16px' } as React.CSSProperties}>
      <div style={{ width: 64, height: 64, borderRadius: '50%', background: paid ? 'oklch(0.6 0.14 155)' : 'var(--amber)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 30, fontWeight: 800 }}>{paid ? '✓' : '…'}</div>
      <div style={{ font: '800 28px var(--sans)', letterSpacing: '-.02em' }}>{paid ? 'Payment successful' : 'Confirming your payment'}</div>
      <div className="muted" style={{ fontSize: 14, lineHeight: 1.5 }}>
        {paid
          ? <>{o.name} is active on web and app.{o.guru_quota === 'unlimited' ? ' Guru is now unlimited.' : ''} Invoice {o.invoice_no}.</>
          : <>We’re waiting for the bank to confirm. Your plan unlocks automatically within a few minutes. Refresh this page to check.</>}
      </div>
      {sp.test ? <Link href={`/test/${sp.test}`} className="btn">Start your test</Link> : <Link href="/tests" className="btn">Start your first mock</Link>}
    </div>
  );
}
