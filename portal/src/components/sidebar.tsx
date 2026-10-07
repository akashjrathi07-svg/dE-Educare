'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useTransition } from 'react';
import { setExamGroup, toggleTheme } from '@/app/(student)/actions';
import type { shellData } from '@/lib/server/shell';

type Data = Awaited<ReturnType<typeof shellData>>;

const NAV: [href: string, mark: string, label: string][] = [
  ['/', 'HM', 'Dashboard'], ['/tests', 'TS', 'Tests'], ['/results', 'RS', 'Results'], ['/live', 'LV', 'Live classes'],
  ['/planner', 'PL', 'Study planner'], ['/library', 'LB', 'Library'], ['/doubts', 'DS', 'Doubt solver'],
  ['/community', 'CM', 'Community'], ['/profile', 'PR', 'Profile & rewards'],
];
const GROUPS = [['mba', 'MBA'], ['upsc', 'UPSC'], ['bank', 'Bank PO'], ['ug', 'Undergrad']];

export function Sidebar({ data }: { data: Data }) {
  const path = usePathname();
  const [, start] = useTransition();
  const active = (href: string) => (href === '/' ? path === '/' : path === href || path.startsWith(href + '/'));
  return (
    <aside className="side">
      <Link href="/" className="brand" style={{ color: 'var(--ink)' }}>
        <span className="brand-mark">De</span>
        <span className="brand-name wide-only">De educare</span>
      </Link>
      <div className="stack wide-only" style={{ '--gap': '8px' } as React.CSSProperties}>
        <span className="eyebrow">Preparing for</span>
        <div className="exam-switch">
          {GROUPS.map(([id, name]) => (
            <button key={id} type="button" aria-pressed={data.user.group === id} onClick={() => start(() => setExamGroup(id))}>{name}</button>
          ))}
        </div>
      </div>
      <nav className="nav" aria-label="Main">
        {NAV.map(([href, mark, label]) => (
          <Link key={href} href={href} className="nav-item" aria-current={active(href) ? 'page' : undefined} title={label}>
            <span className="nav-mark">{mark}</span>
            <span className="nav-label wide-only">{label}</span>
            {href === '/live' && data.liveNow && <span className="badge-live wide-only">LIVE</span>}
          </Link>
        ))}
        {['admin', 'content', 'faculty', 'support'].includes(data.user.role) && (
          <Link href="/admin" className="nav-item" title="Admin"><span className="nav-mark">AD</span><span className="nav-label wide-only">Admin</span></Link>
        )}
      </nav>
      <div className="side-foot">
        <div className="mini-stats wide-only">
          <div className="mini-stat"><b style={{ color: 'oklch(0.65 0.19 45)' }}>{data.streak}</b><span>day streak</span></div>
          <div className="mini-stat"><b style={{ color: 'var(--pri)' }}>{data.xp.toLocaleString('en-IN')}</b><span>XP</span></div>
        </div>
        {!data.paid && <Link href="/plans" className="btn md block">Upgrade</Link>}
        <div className="me">
          <Link href="/profile" className="avatar" aria-label="Profile">{data.user.initials}</Link>
          <div className="stack wide-only" style={{ flex: 1, '--gap': '0' } as React.CSSProperties}>
            <span style={{ fontSize: 13, fontWeight: 800 }}>{data.user.name}</span>
            <span style={{ fontSize: 11, color: 'var(--muted)', fontWeight: 700 }}>{data.planName}</span>
          </div>
          <button type="button" className="icon-btn wide-only" title="Toggle theme" aria-label="Toggle light or dark theme" onClick={() => start(() => toggleTheme())}><span className="theme-dot" /></button>
        </div>
      </div>
    </aside>
  );
}
