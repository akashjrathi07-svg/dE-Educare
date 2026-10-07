import Link from 'next/link';
import { requireUser } from '@/lib/server/auth';
import { sql } from '@/lib/server/db';
import { CHANNELS } from './channels';
import { createPost } from './actions';
import { VoteButton } from './vote-button';
import { initials } from '@/lib/server/shell';

export const metadata = { title: 'Community' };
const ago = (d: Date) => { const m = Math.round((Date.now() - new Date(d).getTime()) / 60000); return m < 60 ? `${Math.max(1, m)}m` : m < 1440 ? `${Math.round(m / 60)}h` : `${Math.round(m / 1440)}d`; };

export default async function Community({ searchParams }: { searchParams: Promise<{ ch?: string }> }) {
  const u = await requireUser('/community');
  const list = CHANNELS[u.exam_group] ?? CHANNELS.mba;
  const ch = list.includes((await searchParams).ch ?? '') ? (await searchParams).ch! : 'All';
  const posts = await sql`
    select p.id, p.channel, p.title, p.body, p.created_at, coalesce(u.name, 'Student') as by,
      (select count(*) from post_votes v where v.post_id = p.id)::int as votes,
      exists (select 1 from post_votes v where v.post_id = p.id and v.user_id = ${u.id}) as voted,
      (select count(*) from community_answers a where a.post_id = p.id)::int as answers
    from community_posts p join users u on u.id = p.user_id
    where p.exam_group = ${u.exam_group} and (${ch} = 'All' or p.channel = ${ch})
    order by p.created_at desc limit 50`;
  return (
    <>
      <div className="head"><h1 className="h1">Community</h1><div className="muted" style={{ fontSize: 13, fontWeight: 700 }}>+20 XP when your answer is marked helpful</div></div>
      <div className="comm-grid">
        <nav className="comm-ch" aria-label="Channels">
          {list.map(c => <Link key={c} href={c === 'All' ? '/community' : `/community?ch=${encodeURIComponent(c)}`} className="btn md" style={{ justifyContent: 'flex-start', background: c === ch ? 'var(--strong)' : 'transparent', color: c === ch ? '#fff' : 'var(--ink)' }}>{c}</Link>)}
        </nav>
        <div className="stack" style={{ '--gap': '12px', minWidth: 0 } as React.CSSProperties}>
          <form action={createPost} className="card stack" style={{ padding: 14, '--gap': '10px' } as React.CSSProperties}>
            <div className="row" style={{ alignItems: 'flex-start', flexWrap: 'nowrap', gap: 10 }}>
              <span className="avatar">{initials(u.name)}</span>
              <div className="stack" style={{ flex: 1, '--gap': '6px' } as React.CSSProperties}>
                <label className="sr" htmlFor="pt">Title</label>
                <input id="pt" name="title" className="input" placeholder="Ask a question or share an approach…" required maxLength={200} style={{ border: 0, padding: '8px 0', background: 'transparent' }} />
                <label className="sr" htmlFor="pb">Details</label>
                <textarea id="pb" name="body" className="input" placeholder="Add details (optional)" maxLength={4000} style={{ minHeight: 44, border: 0, padding: 0, background: 'transparent' }} />
              </div>
            </div>
            <div className="row" style={{ justifyContent: 'flex-end' }}>
              <select name="channel" className="input" style={{ width: 'auto' }} defaultValue={ch === 'All' ? list[1] : ch} aria-label="Channel">{list.slice(1).map(c => <option key={c}>{c}</option>)}</select>
              <button className="btn md">Post</button>
            </div>
          </form>
          {posts.map(p => (
            <div key={p.id} className="card row" style={{ padding: '16px 18px', gap: 14, alignItems: 'flex-start', flexWrap: 'nowrap' }}>
              <VoteButton id={p.id} votes={p.votes} voted={p.voted} />
              <Link href={`/community/${p.id}`} className="stack" style={{ flex: 1, minWidth: 0, '--gap': '6px', color: 'var(--ink)' } as React.CSSProperties}>
                <div className="row" style={{ gap: 8 }}><span className="tag pri">{p.channel}</span><span className="muted" style={{ fontSize: 12, fontWeight: 700 }}>{p.by} · {ago(p.created_at)}</span></div>
                <div style={{ fontSize: 16, fontWeight: 800, lineHeight: 1.3 }}>{p.title}</div>
                {p.body && <div className="muted" style={{ fontSize: 14, lineHeight: 1.5 }}>{p.body}</div>}
                <div style={{ fontSize: 12, fontWeight: 800, color: 'var(--pri)' }}>{p.answers} answer{p.answers === 1 ? '' : 's'}</div>
              </Link>
            </div>
          ))}
          {!posts.length && <div className="card empty">No posts here yet. Start the conversation.</div>}
        </div>
      </div>
    </>
  );
}
