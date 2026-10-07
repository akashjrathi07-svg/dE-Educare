import Link from 'next/link';
import { notFound } from 'next/navigation';
import { requireUser } from '@/lib/server/auth';
import { sql } from '@/lib/server/db';
import { answerPost, markHelpful } from '../actions';
import { VoteButton } from '../vote-button';

export const metadata = { title: 'Community' };

export default async function Post({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const u = await requireUser(`/community/${id}`);
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const [p] = await sql`
    select p.*, coalesce(u.name, 'Student') as by, (select count(*) from post_votes v where v.post_id = p.id)::int as votes,
      exists (select 1 from post_votes v where v.post_id = p.id and v.user_id = ${u.id}) as voted
    from community_posts p join users u on u.id = p.user_id where p.id = ${id} and p.exam_group = ${u.exam_group}`;
  if (!p) notFound();
  const answers = await sql`select a.*, coalesce(u.name, 'Student') as by from community_answers a join users u on u.id = a.user_id where a.post_id = ${id} order by a.helpful desc, a.created_at`;
  const mine = p.user_id === u.id;
  return (
    <>
      <Link href="/community" className="back">← Community</Link>
      <div className="card row" style={{ padding: '18px 20px', gap: 14, alignItems: 'flex-start', flexWrap: 'nowrap' }}>
        <VoteButton id={p.id} votes={p.votes} voted={p.voted} />
        <div className="stack" style={{ flex: 1, '--gap': '8px' } as React.CSSProperties}>
          <div className="row" style={{ gap: 8 }}><span className="tag pri">{p.channel}</span><span className="muted" style={{ fontSize: 12, fontWeight: 700 }}>{p.by}</span></div>
          <h1 style={{ margin: 0, fontSize: 22, fontWeight: 800, lineHeight: 1.3 }}>{p.title}</h1>
          {p.body && <p className="pre" style={{ margin: 0, fontSize: 15, lineHeight: 1.6 }}>{p.body}</p>}
        </div>
      </div>
      <h2 className="h2">{answers.length} answer{answers.length === 1 ? '' : 's'}</h2>
      {answers.map(a => (
        <div key={a.id} className="card pad stack" style={{ '--gap': '8px', borderColor: a.helpful ? 'var(--ok)' : undefined } as React.CSSProperties}>
          <div className="row" style={{ justifyContent: 'space-between' }}>
            <span className="muted" style={{ fontSize: 12, fontWeight: 800 }}>{a.user_id === u.id ? 'You' : a.by}</span>
            {a.helpful ? <span className="tag ok">Helpful · +20 XP</span>
              : mine && a.user_id !== u.id ? <form action={markHelpful.bind(null, a.id)}><button className="btn chip sm">Mark helpful</button></form> : null}
          </div>
          <div className="pre" style={{ fontSize: 14, lineHeight: 1.6 }}>{a.body}</div>
        </div>
      ))}
      <form action={answerPost} className="card pad stack" style={{ '--gap': '10px' } as React.CSSProperties}>
        <input type="hidden" name="post" value={p.id} />
        <label className="field"><span>Your answer</span><textarea name="body" className="input" required maxLength={4000} placeholder="Share your approach. If the asker marks it helpful you get +20 XP." /></label>
        <button className="btn" style={{ alignSelf: 'flex-end' }}>Post answer</button>
      </form>
    </>
  );
}
