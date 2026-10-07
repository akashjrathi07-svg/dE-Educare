import { requireUser } from '@/lib/server/auth';
import { sql } from '@/lib/server/db';
import { DoubtForm } from './doubt-form';

export const metadata = { title: 'Doubt solver' };

const ago = (d: Date) => {
  const m = Math.round((Date.now() - new Date(d).getTime()) / 60000);
  return m < 60 ? `${Math.max(1, m)}m` : m < 1440 ? `${Math.round(m / 60)}h` : m < 2880 ? 'Yesterday' : `${Math.round(m / 1440)}d`;
};

export default async function Doubts() {
  const u = await requireUser('/doubts');
  const recent = await sql`select id, question, had_image, answer, created_at from doubts where user_id = ${u.id} order by created_at desc limit 8`;
  return (
    <>
      <div className="stack" style={{ '--gap': '4px' } as React.CSSProperties}>
        <h1 className="h1">Doubt solver</h1>
        <div className="sub">Upload a question. Guru explains it step by step. Each doubt uses one Guru question.</div>
      </div>
      <DoubtForm recent={recent.map(r => ({ id: r.id, q: r.question ?? (r.had_image ? 'Photo question' : 'Question'), a: r.answer ?? '', t: ago(r.created_at) }))} />
    </>
  );
}
