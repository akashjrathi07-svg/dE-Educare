import Link from 'next/link';
import { requireUser } from '@/lib/server/auth';
import { sql } from '@/lib/server/db';
import { activeCourseIds } from '@/lib/server/access';
import { rupees } from '@/lib/server/shell';

export const metadata = { title: 'Plans' };

export default async function Plans() {
  const u = await requireUser('/plans');
  const owned = new Set(await activeCourseIds(u.id));
  const plans = await sql`
    select c.*, e.name as exam from courses c left join exams e on e.id = c.exam_id
    where c.status = 'live' and c.price_paise > 0 and (e.exam_group = ${u.exam_group} or e.id is null) order by c.sort`;
  const soon = await sql`select c.name from courses c join exams e on e.id = c.exam_id where c.status = 'draft' and e.exam_group = ${u.exam_group} order by c.sort`;
  return (
    <>
      <div className="stack" style={{ '--gap': '4px' } as React.CSSProperties}>
        <h1 className="h1">Choose your plan</h1>
        <div className="sub">Valid till your exam date. Prices include GST. Unlocks instantly on web and app.</div>
      </div>
      {plans.length ? (
        <div className="grid" style={{ '--min': '260px', '--gap': '14px' } as React.CSSProperties}>
          {plans.map(p => (
            <div key={p.id} className="card stack" style={{ padding: 22, borderRadius: 20, '--gap': '16px', borderWidth: 2, borderColor: p.badge === 'Most popular' ? 'var(--pri)' : 'var(--line)' } as React.CSSProperties}>
              <div className="row" style={{ justifyContent: 'space-between' }}><span style={{ fontSize: 17, fontWeight: 800 }}>{p.name}</span>{p.badge && <span className="tag amber">{p.badge}</span>}</div>
              <div className="row" style={{ alignItems: 'baseline' }}>
                <span style={{ font: '800 38px/1 var(--sans)', letterSpacing: '-.03em' }}>{rupees(p.price_paise)}</span>
                {p.mrp_paise > p.price_paise && <span className="faint" style={{ fontSize: 14, textDecoration: 'line-through' }}>{rupees(p.mrp_paise)}</span>}
              </div>
              <div className="muted" style={{ fontSize: 13, lineHeight: 1.4 }}>{p.description}</div>
              <div className="stack" style={{ '--gap': '8px', paddingTop: 14, borderTop: '1px solid var(--line2)' } as React.CSSProperties}>
                {(p.features as string[]).map(f => <div key={f} className="row" style={{ fontSize: 13, fontWeight: 600, flexWrap: 'nowrap' }}><span style={{ color: 'var(--ok)', fontWeight: 800 }}>✓</span>{f}</div>)}
              </div>
              {owned.has(p.id)
                ? <span className="btn ok block" aria-disabled="true">Active on your account</span>
                : <Link href={`/checkout?plan=${p.slug}`} className="btn block" style={{ marginTop: 'auto' }}>Continue with {p.name} →</Link>}
            </div>
          ))}
        </div>
      ) : <div className="card empty">Plans for this exam are launching soon.</div>}
      {soon.length > 0 && <p className="note">Coming soon: {soon.map(s => s.name).join(', ')}.</p>}
    </>
  );
}
