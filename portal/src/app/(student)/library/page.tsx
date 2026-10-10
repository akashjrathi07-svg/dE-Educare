import Link from 'next/link';
import { requireUser } from '@/lib/server/auth';
import { sql } from '@/lib/server/db';
import { SaveButton } from './save-button';

export const metadata = { title: 'Library' };

export default async function Library({ searchParams }: { searchParams: Promise<{ tab?: string }> }) {
  const u = await requireUser('/library');
  const tab = (await searchParams).tab ?? 'rec';
  const items = await sql`
    select l.*, s.user_id is not null as saved, exists (select 1 from library_file_parts p where p.item_id = l.id) as has_file from library_items l
    left join saved_items s on s.item_id = l.id and s.user_id = ${u.id}
    where l.exam_group = ${u.exam_group} and l.status = 'live' order by l.sort, l.created_at desc`;
  const list = tab === 'notes' ? items.filter(i => i.kind === 'pdf') : tab === 'dl' ? items.filter(i => i.saved) : items.filter(i => i.kind === 'video');
  const used = items.filter(i => i.saved).reduce((a, i) => a + Number(i.size_mb ?? 0), 0);
  const tabs = [['rec', 'Recorded classes'], ['notes', 'Notes'], ['dl', 'Offline']];
  return (
    <>
      <div className="head">
        <h1 className="h1">Library</h1>
        <nav className="seg">{tabs.map(([id, l]) => <Link key={id} href={`/library?tab=${id}`} aria-current={tab === id}>{l}</Link>)}</nav>
      </div>
      {tab === 'dl' && (
        <div className="card stack" style={{ padding: '16px 18px', borderRadius: 16, '--gap': '8px' } as React.CSSProperties}>
          <div className="row" style={{ justifyContent: 'space-between', fontSize: 13, fontWeight: 800 }}><span>Saved for offline</span><span className="mono">{Math.round(used)} MB / 4 GB</span></div>
          <div className="bar"><i style={{ width: Math.max(2, (used / 4000) * 100) + '%' }} /></div>
          <div className="muted" style={{ fontSize: 12 }}>Saved items sync to the DE Educare app on your phone so you can study without internet.</div>
        </div>
      )}
      {!list.length && <div className="empty">{tab === 'dl' ? 'Nothing saved for offline yet.' : 'Nothing here yet. New recordings appear after each live class.'}</div>}
      <div className="grid fill" style={{ '--min': '230px', '--gap': '14px' } as React.CSSProperties}>
        {list.map(i => (
          <div key={i.id} className="card" style={{ overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
            <div className="stripes row" style={{ height: 120, alignItems: 'flex-end', justifyContent: 'space-between', padding: 10 }}>
              <span className="mono" style={{ fontSize: 10, padding: '3px 6px', borderRadius: 5, background: 'var(--card)', color: 'var(--muted)' }}>{i.kind.toUpperCase()}</span>
              {i.size_mb && <span className="mono faint" style={{ fontSize: 10 }}>{Number(i.size_mb)} MB</span>}
            </div>
            <div className="stack" style={{ padding: 14, flex: 1, '--gap': '10px' } as React.CSSProperties}>
              <div className="stack" style={{ '--gap': '2px' } as React.CSSProperties}><div style={{ fontSize: 14, fontWeight: 800, lineHeight: 1.3 }}>{i.title}</div><div className="muted" style={{ fontSize: 12 }}>{[i.exam_code, i.meta].filter(Boolean).join(' · ')}</div></div>
              <div className="row" style={{ marginTop: 'auto', flexWrap: 'nowrap' }}>
                {i.has_file ? <Link href={`/library/${i.id}`} className="btn chip sm" style={{ flex: 1 }}>Read</Link>
                  : i.url ? <a href={i.url} target="_blank" rel="noopener noreferrer" className="btn chip sm" style={{ flex: 1 }}>{i.kind === 'video' ? 'Watch' : 'Open'}</a>
                  : <span className="btn chip sm" aria-disabled="true" style={{ flex: 1 }}>Coming soon</span>}
                <SaveButton id={i.id} saved={i.saved} />
              </div>
            </div>
          </div>
        ))}
      </div>
    </>
  );
}
