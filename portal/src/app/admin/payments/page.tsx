import Link from 'next/link';
import { requireStaff } from '@/lib/server/auth';
import { sql } from '@/lib/server/db';
import { razorpayConfigured } from '@/lib/server/payments';
import { rupees } from '@/lib/server/shell';
import { Head } from '../ui';
import { CheckAll, OrderActions } from './payments-client';

export const metadata = { title: 'Payments' };

const TABS = [['stuck', 'Needs a look'], ['paid', 'Paid'], ['all', 'All']] as const;
const when = (d: Date) => new Date(d).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit', timeZone: 'Asia/Kolkata' });

/** How a paid order was confirmed. */
function via(gateway: string, raw: Record<string, unknown> | null) {
  if (gateway === 'offline') return 'Enrolled by staff';
  if (gateway === 'free') return 'Free coupon';
  if (!raw) return '';
  if (raw.manual) return 'Unlocked by admin';
  if (raw.synced) return 'Auto-check with Razorpay';
  if (raw.event) return 'Razorpay webhook';
  return 'Student’s browser';
}

/**
 * Every checkout, and whether it unlocked. "Needs a look": not confirmed, and the student has no access to
 * that plan from any other order. Unconfirmed checkouts are also checked on their own when the student opens the portal.
 */
export default async function Payments({ searchParams }: { searchParams: Promise<{ tab?: string; q?: string }> }) {
  const me = await requireStaff('payments');
  const sp = await searchParams;
  const tab = TABS.some(t => t[0] === sp.tab) ? sp.tab! : 'stuck';
  const q = (sp.q ?? '').trim();
  const digits = q.replace(/\D/g, '');
  const stuck = sql`o.status in ('created', 'failed') and o.gateway = 'razorpay'
    and not exists (select 1 from entitlements e where e.user_id = o.user_id and e.course_id = o.course_id and (e.ends_at is null or e.ends_at > now()))`;
  const [rows, [n], [hook]] = await Promise.all([
    sql`
      select o.id, o.created_at, o.paid_at, o.status, o.gateway, o.amount_paise, o.invoice_no, o.checked_at, c.name as plan, u.id as user_id, u.name, u.phone,
        (select p.raw from payments p where p.order_id = o.id order by p.verified_at limit 1) as raw,
        exists (select 1 from entitlements e where e.user_id = o.user_id and e.course_id = o.course_id and (e.ends_at is null or e.ends_at > now())) as has_access
      from orders o join courses c on c.id = o.course_id join users u on u.id = o.user_id
      where o.created_at > now() - interval '120 days'
        ${tab === 'stuck' ? sql`and ${stuck}` : tab === 'paid' ? sql`and o.status = 'paid'` : sql``}
        ${q ? sql`and (u.name ilike ${'%' + q + '%'} ${digits.length >= 4 ? sql`or u.phone like ${'%' + digits + '%'}` : sql``} or o.invoice_no ilike ${'%' + q + '%'})` : sql``}
      order by o.created_at desc limit 300`,
    sql`select count(*) filter (where ${stuck})::int as stuck, count(*) filter (where o.status = 'paid')::int as paid, count(*)::int as all
        from orders o where o.created_at > now() - interval '120 days'`,
    sql`select count(*)::int as n, max(verified_at) as last from payments where raw ? 'event'`,
  ]);
  const webhookSet = !!process.env.RAZORPAY_WEBHOOK_SECRET;
  return (
    <>
      <Head title="Payments" sub="Every checkout and whether the plan unlocked. Unconfirmed ones are checked with Razorpay automatically when the student opens the portal.">
        <CheckAll n={n.stuck} />
      </Head>

      <div className="grid" style={{ '--min': '220px', '--gap': '10px' } as React.CSSProperties}>
        <div className="card" style={{ padding: 14 }}><div className="eyebrow">Razorpay keys</div><b>{razorpayConfigured() ? '✓ Connected' : '✗ Missing in Vercel'}</b></div>
        <div className="card" style={{ padding: 14 }}>
          <div className="eyebrow">Razorpay webhook</div>
          <b style={{ color: webhookSet && hook.n ? 'var(--ok)' : 'var(--bad)' }}>{!webhookSet ? '✗ Not set up' : hook.n ? `✓ Working · last ${when(hook.last)}` : '… Set up, nothing received yet'}</b>
        </div>
        <div className="card" style={{ padding: 14 }}><div className="eyebrow">Needs a look</div><b style={{ color: n.stuck ? 'var(--bad)' : 'var(--ok)' }}>{n.stuck ? `${n.stuck} not confirmed` : 'Nothing stuck'}</b></div>
      </div>
      {!(webhookSet && hook.n) && (
        <details className="note">
          <summary><b>Set up the webhook</b> so payments unlock even when the student never comes back</summary>
          <ol style={{ margin: '8px 0 0', paddingLeft: 20, lineHeight: 1.7 }}>
            <li>Razorpay Dashboard → Settings → Webhooks → Add new webhook.</li>
            <li>URL: <code>https://portal.deeducare.com/api/webhooks/razorpay</code></li>
            <li>Events: payment.authorized, payment.captured, order.paid, payment.failed. Pick a secret.</li>
            <li>Vercel → the portal project → Settings → Environment Variables: add <code>RAZORPAY_WEBHOOK_SECRET</code> with the same secret, then redeploy.</li>
          </ol>
        </details>
      )}

      <div className="row" style={{ justifyContent: 'space-between' }}>
        <nav className="seg" aria-label="Status">
          {TABS.map(([id, l]) => <Link key={id} href={`/admin/payments?tab=${id}`} aria-current={tab === id}>{l} · {n[id]}</Link>)}
        </nav>
        <form className="row" style={{ flexWrap: 'nowrap' }}>
          <input type="hidden" name="tab" value={tab} />
          <input className="input" name="q" defaultValue={q} placeholder="Name, mobile or invoice" style={{ minWidth: 220 }} />
          <button className="btn chip md">Search</button>
        </form>
      </div>
      {tab === 'stuck' && rows.length > 0 && <div className="note">Many of these are students who opened checkout and left without paying. <b>Check</b> asks Razorpay; only real payments unlock.</div>}
      {rows.length === 0 && <div className="card empty">{tab === 'stuck' ? 'Nothing stuck: every paid checkout has unlocked.' : 'No payments here.'}</div>}
      <div className="stack" style={{ '--gap': '8px' } as React.CSSProperties}>
        {rows.map(r => {
          const paid = r.status === 'paid';
          return (
            <div key={r.id} className="card" style={{ padding: 14, display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))', gap: 12, alignItems: 'center' }}>
              <div className="stack" style={{ '--gap': '2px' } as React.CSSProperties}>
                <Link href={`/admin/students?open=${r.user_id}`} style={{ fontWeight: 800 }}>{r.name ?? 'New student'}</Link>
                <a href={`tel:${r.phone}`} className="mono muted" style={{ fontSize: 12 }}>{r.phone}</a>
              </div>
              <div className="stack" style={{ '--gap': '2px', fontSize: 13 } as React.CSSProperties}>
                <b>{r.plan}</b><span className="muted">{rupees(Number(r.amount_paise))} · {when(r.created_at)}</span>
              </div>
              <div className="stack" style={{ '--gap': '2px', fontSize: 13 } as React.CSSProperties}>
                {paid ? <span className="tag ok" style={{ alignSelf: 'flex-start' }}>Paid · unlocked</span>
                  : <span className={'tag ' + (r.has_access ? '' : 'bad')} style={{ alignSelf: 'flex-start' }}>{r.has_access ? 'Not paid · has access from another order' : 'Not confirmed'}</span>}
                <span className="muted">{paid ? `${via(r.gateway, r.raw)}${r.invoice_no ? ' · ' + r.invoice_no : ''}` : r.checked_at ? `Razorpay checked ${when(r.checked_at)}` : 'Not checked yet'}</span>
              </div>
              {!paid && <OrderActions id={r.id} admin={me.role === 'admin'} />}
            </div>
          );
        })}
      </div>
    </>
  );
}
