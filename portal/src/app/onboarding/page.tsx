import { redirect } from 'next/navigation';
import { currentUser } from '@/lib/server/auth';
import { sql } from '@/lib/server/db';

export const metadata = { title: 'Welcome' };

async function save(form: FormData) {
  'use server';
  const u = await currentUser();
  if (!u) redirect('/login');
  const name = String(form.get('name') ?? '').trim().slice(0, 80);
  const exam = String(form.get('exam') ?? 'CAT');
  const year = Number(form.get('year')) || null;
  const target = Number(form.get('target')) || null;
  const [e] = await sql`select exam_group from exams where code = ${exam}`;
  if (!name) redirect('/onboarding?err=name');
  await sql`update users set name = ${name}, target_exam = ${exam}, exam_group = ${e?.exam_group ?? 'mba'}, target_year = ${year}, target_percentile = ${target},
            city = ${String(form.get('city') ?? '').trim().slice(0, 60) || null}, onboarded = true where id = ${u.id}`;
  const next = String(form.get('next') ?? '/');
  redirect(next.startsWith('/') && !next.startsWith('//') ? next : '/');
}

export default async function Onboarding({ searchParams }: { searchParams: Promise<{ next?: string; err?: string }> }) {
  const sp = await searchParams;
  const u = await currentUser();
  if (!u) redirect('/login');
  const exams = await sql`select code, name, status from exams order by sort`;
  const y = new Date().getFullYear();
  return (
    <main className="auth">
      <form action={save} className="card stack" style={{ maxWidth: 520, width: '100%', padding: 32, '--gap': '18px' } as React.CSSProperties}>
        <input type="hidden" name="next" value={sp.next ?? '/'} />
        <div className="stack" style={{ '--gap': '4px' } as React.CSSProperties}>
          <span className="eyebrow">WELCOME TO DE EDUCARE</span>
          <h1 className="h1">Set up your prep</h1>
          <span className="sub">Guru uses this to plan your tests and count down to your exam.</span>
        </div>
        {sp.err && <p className="alert err">Please enter your name.</p>}
        <label className="field"><span>Your name <i className="req">*</i></span><input className="input lg" name="name" defaultValue={u.name ?? ''} required maxLength={80} autoComplete="name" /></label>
        <label className="field"><span>Preparing for</span>
          <select className="input lg" name="exam" defaultValue={u.target_exam ?? 'CAT'}>
            {exams.map(e => <option key={e.code} value={e.code}>{e.name}{e.status === 'soon' ? ' (launching soon)' : ''}</option>)}
          </select>
        </label>
        <div className="form-grid">
          <label className="field"><span>Attempt year</span><select className="input lg" name="year" defaultValue={u.target_year ?? y}>{[y, y + 1, y + 2].map(v => <option key={v}>{v}</option>)}</select></label>
          <label className="field"><span>Target percentile</span><input className="input lg" name="target" type="number" min={50} max={100} step="0.1" defaultValue={u.target_percentile ?? 99} /></label>
        </div>
        <label className="field"><span>City</span><input className="input lg" name="city" defaultValue={u.city ?? ''} autoComplete="address-level2" /></label>
        <button className="btn lg block">Start preparing →</button>
      </form>
    </main>
  );
}
