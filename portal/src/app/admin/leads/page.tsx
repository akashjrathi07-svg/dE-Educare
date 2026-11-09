import Link from 'next/link';
import { requireStaff } from '@/lib/server/auth';
import { sql } from '@/lib/server/db';
import { emailReady } from '@/lib/server/email';
import { Head } from '../ui';
import { LeadStatus } from './leads-client';

export const metadata = { title: 'Leads' };

const TABS = [['new', 'New'], ['contacted', 'Contacted'], ['all', 'All']] as const;
const when = (d: Date) => new Date(d).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit', timeZone: 'Asia/Kolkata' });
const wa = (phone: string) => 'https://wa.me/' + (phone.replace(/\D/g, '').length === 10 ? '91' : '') + phone.replace(/\D/g, '');

/** Website form submissions: who, what they want, which form and page they came from. */
export default async function Leads({ searchParams }: { searchParams: Promise<{ tab?: string; q?: string }> }) {
  await requireStaff('leads');
  const sp = await searchParams;
  const tab = TABS.some(t => t[0] === sp.tab) ? sp.tab! : 'new';
  const q = (sp.q ?? '').trim();
  const [rows, [n]] = await Promise.all([
    sql`select * from leads where true
      ${tab === 'new' ? sql`and not contacted` : tab === 'contacted' ? sql`and contacted` : sql``}
      ${q ? sql`and (name ilike ${'%' + q + '%'} or phone like ${'%' + q.replace(/\D/g, '') + '%'} or form ilike ${'%' + q + '%'} or interest_label ilike ${'%' + q + '%'})` : sql``}
      order by created_at desc limit 300`,
    sql`select count(*) filter (where not contacted)::int as new, count(*) filter (where contacted)::int as contacted, count(*)::int as all from leads`,
  ]);
  return (
    <>
      <Head title="Leads" sub="Every form on deeducare.com, with the form and page it came from.">
        <a className="btn ghost" href={`/admin/leads/export?tab=${tab}`}>Download CSV</a>
      </Head>
      {!emailReady() && <div className="note">Lead emails to contact@deeducare.com come from the website for now. To send them from the portal instead, add the Amazon SES keys in Vercel (see the portal README).</div>}
      <div className="row" style={{ justifyContent: 'space-between' }}>
        <nav className="seg" aria-label="Status">
          {TABS.map(([id, l]) => <Link key={id} href={`/admin/leads?tab=${id}`} aria-current={tab === id}>{l} · {n[id]}</Link>)}
        </nav>
        <form className="row" style={{ flexWrap: 'nowrap' }}>
          <input type="hidden" name="tab" value={tab} />
          <input className="input" name="q" defaultValue={q} placeholder="Search name, mobile, form…" style={{ minWidth: 220 }} />
          <button className="btn chip md">Search</button>
        </form>
      </div>
      {rows.length === 0 && <div className="card empty">No leads here.</div>}
      <div className="stack" style={{ '--gap': '10px' } as React.CSSProperties}>
        {rows.map(r => (
          <div key={r.id} className="card" style={{ padding: 16, display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16 }}>
            <div className="stack" style={{ '--gap': '4px' } as React.CSSProperties}>
              <b style={{ fontSize: 15 }}>{r.name}</b>
              <div className="row" style={{ gap: 10, fontSize: 13 }}>
                <a href={`tel:${r.phone}`} className="mono">{r.phone}</a>
                <a href={wa(r.phone)} target="_blank" rel="noopener" style={{ fontWeight: 800 }}>WhatsApp ↗</a>
              </div>
              {r.email && <a href={`mailto:${r.email}`} style={{ fontSize: 13 }}>{r.email}</a>}
              <span className="muted" style={{ fontSize: 12 }}>{when(r.created_at)}{r.city ? ` · ${r.city}` : ''}{r.currently ? ` · ${r.currently}` : ''}</span>
            </div>
            <div className="stack" style={{ '--gap': '4px', fontSize: 13 } as React.CSSProperties}>
              {r.interest_label && <span><b>Wants:</b> {r.interest_label}</span>}
              <span><b>Form:</b> {r.form}</span>
              {r.page && <a href={r.page} target="_blank" rel="noopener" className="muted" style={{ overflowWrap: 'anywhere' }}>{r.page.replace(/^https?:\/\//, '')}</a>}
              {Object.keys(r.utm ?? {}).length > 0 && <span className="muted">Campaign: {Object.values(r.utm).join(' / ')}</span>}
              {r.message && <span style={{ background: 'var(--sunk)', padding: '6px 10px', borderRadius: 10 }}>{r.message}</span>}
            </div>
            <LeadStatus id={r.id} contacted={r.contacted} note={r.note ?? ''} />
          </div>
        ))}
      </div>
    </>
  );
}
