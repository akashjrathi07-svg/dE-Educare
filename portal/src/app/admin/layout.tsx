import Link from 'next/link';
import { canAccess, requireStaff, STAFF_AREAS, type StaffArea } from '@/lib/server/auth';
import { sql } from '@/lib/server/db';
import { initials } from '@/lib/server/shell';
import { AdminNav, ToastHost } from './ui';

export const metadata = { title: 'DE Educare Admin', robots: { index: false } };

const ROLE: Record<string, string> = { admin: 'Super admin', content: 'Content team', faculty: 'Faculty', support: 'Support' };

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const u = await requireStaff('overview');
  const areas = (Object.keys(STAFF_AREAS) as StaffArea[]).filter(a => canAccess(u.role, a));
  const [[{ n }], [{ pending }]] = await Promise.all([
    sql`select count(*)::int as n from questions`,
    sql`select count(*)::int as pending from reviews where status = 'pending'`,
  ]);
  return (
    <div className="admin" data-theme="light">
      <aside className="admin-side">
        <div className="row" style={{ gap: 10, padding: '0 6px', flexWrap: 'nowrap' }}>
          <span className="brand-mark" style={{ background: '#1F3A8A', fontSize: 13 }}>DE</span>
          <div className="stack wide-only" style={{ '--gap': '0' } as React.CSSProperties}>
            <span style={{ fontSize: 15, fontWeight: 800 }}>DE Educare</span>
            <span style={{ font: '600 10px var(--mono)', letterSpacing: '.08em', color: '#FFC44D' }}>ADMIN</span>
          </div>
        </div>
        <AdminNav areas={areas} badges={{ bank: n.toLocaleString('en-IN'), ...(pending ? { reviews: String(pending) } : {}) }} />
        <div className="stack" style={{ marginTop: 'auto', '--gap': '10px' } as React.CSSProperties}>
          <Link href="/" className="wide-only" style={{ color: 'rgba(255,255,255,.7)', fontSize: 13, fontWeight: 700, padding: '0 6px' }}>← Student app</Link>
          <div className="row" style={{ gap: 10, padding: '12px 6px 0', borderTop: '1px solid rgba(255,255,255,.12)', flexWrap: 'nowrap' }}>
            <span className="avatar" style={{ width: 32, height: 32, fontSize: 12 }}>{initials(u.name)}</span>
            <div className="stack wide-only" style={{ '--gap': '0' } as React.CSSProperties}>
              <span style={{ fontSize: 13, fontWeight: 800 }}>{u.name ?? u.phone}</span>
              <span style={{ fontSize: 11, color: 'rgba(255,255,255,.6)', fontWeight: 700 }}>{ROLE[u.role]}</span>
            </div>
          </div>
        </div>
      </aside>
      <main className="admin-main"><ToastHost><div className="admin-page">{children}</div></ToastHost></main>
    </div>
  );
}
