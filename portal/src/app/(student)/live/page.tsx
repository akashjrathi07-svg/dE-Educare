import Link from 'next/link';
import { requireUser } from '@/lib/server/auth';
import { visibleClasses } from '@/lib/server/live';
import { ReminderButton } from './reminder-button';

export const metadata = { title: 'Live classes' };
const when = (d: Date) => {
  const t = new Date(d);
  const today = new Date().toLocaleDateString('en-IN', { timeZone: 'Asia/Kolkata' }) === t.toLocaleDateString('en-IN', { timeZone: 'Asia/Kolkata' });
  return { day: today ? 'Today' : t.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short', timeZone: 'Asia/Kolkata' }), time: t.toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit', timeZone: 'Asia/Kolkata' }) };
};

export default async function Live() {
  const u = await requireUser('/live');
  const all = await visibleClasses(u.id, u.exam_group);
  const now = all.find(c => c.on_air);
  const upcoming = all.filter(c => !c.on_air && !c.ended);
  const past = all.filter(c => c.ended).slice(-6).reverse();
  const mins = (d: Date) => Math.max(1, Math.round((Date.now() - new Date(d).getTime()) / 60000));
  return (
    <>
      <h1 className="h1">Live classes</h1>
      {now ? (
        <div className="card r22" style={{ overflow: 'hidden', display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(300px,1fr))' }}>
          <div className="stripes" style={{ position: 'relative', minHeight: 220 }}><span className="tag live" style={{ position: 'absolute', top: 14, left: 14 }}>LIVE NOW</span></div>
          <div className="stack" style={{ padding: 24, justifyContent: 'center', '--gap': '12px' } as React.CSSProperties}>
            <div style={{ font: '800 26px/1.15 var(--sans)', letterSpacing: '-.03em' }}>{now.title}</div>
            <div className="muted" style={{ fontSize: 14 }}>{now.faculty_name}{now.batch_name ? ' · ' + now.batch_name : ''} · started {mins(now.starts_at)} min ago</div>
            <Link href={`/live/${now.id}`} className="btn strong" style={{ alignSelf: 'flex-start', padding: '12px 20px' }}>Join class</Link>
          </div>
        </div>
      ) : <div className="card pad muted" style={{ fontSize: 14 }}>No class is live right now.</div>}
      <section className="stack">
        <h2 className="h2">Upcoming</h2>
        <div className="list">
          {upcoming.length ? upcoming.map(c => {
            const w = when(c.starts_at);
            return (
              <div key={c.id} className="row" style={{ padding: '14px 18px', gap: 16, flexWrap: 'nowrap' }}>
                <div className="stack" style={{ width: 92, flex: 'none', '--gap': '0' } as React.CSSProperties}><span className="muted" style={{ fontSize: 11, fontWeight: 800, textTransform: 'uppercase' }}>{w.day}</span><span className="mono" style={{ fontSize: 14 }}>{w.time}</span></div>
                <Link href={`/live/${c.id}`} className="stack" style={{ flex: 1, minWidth: 0, '--gap': '2px', color: 'var(--ink)' } as React.CSSProperties}><span style={{ fontSize: 14, fontWeight: 800 }}>{c.title}</span><span className="muted" style={{ fontSize: 12 }}>{c.faculty_name}{c.topic ? ' · ' + c.topic : ''} · {c.duration_min} min</span></Link>
                <ReminderButton id={c.id} on={c.reminded} />
              </div>
            );
          }) : <div className="list-row muted" style={{ fontSize: 14 }}>No classes scheduled yet.</div>}
        </div>
      </section>
      {past.length > 0 && (
        <section className="stack">
          <h2 className="h2">Recent classes</h2>
          <div className="list">
            {past.map(c => (
              <Link key={c.id} href={`/live/${c.id}`} className="list-row">
                <span className="stack" style={{ flex: 1, '--gap': '2px' } as React.CSSProperties}><span style={{ fontSize: 14, fontWeight: 800 }}>{c.title}</span><span className="muted" style={{ fontSize: 12 }}>{c.faculty_name} · {when(c.starts_at).day}</span></span>
                <span className="tag">{c.recording_url ? 'Recording' : 'Recording soon'}</span>
              </Link>
            ))}
          </div>
        </section>
      )}
    </>
  );
}
