import Link from 'next/link';
import { requireStaff } from '@/lib/server/auth';
import { sql } from '@/lib/server/db';
import { studentColumns } from '@/lib/server/admin';
import { Head } from '../ui';
import { StudentsClient } from './students-client';

export default async function Students({ searchParams }: { searchParams: Promise<{ q?: string; exam?: string; batch?: string; open?: string; staff?: string }> }) {
  const me = await requireStaff('students');
  const sp = await searchParams;
  const q = (sp.q ?? '').trim();
  const digits = q.replace(/\D/g, '');
  const roles = sp.staff ? ['faculty', 'content', 'support', 'admin'] : ['student'];
  const [rows, [{ total }], exams, batches, courses] = await Promise.all([
    sql`select ${studentColumns()} from users u
        where u.role = any(${roles})
          ${sp.exam ? sql`and u.target_exam = ${sp.exam}` : sql``}
          ${sp.batch ? sql`and exists (select 1 from batch_members m where m.user_id = u.id and m.batch_id = ${sp.batch})` : sql``}
          ${q ? sql`and (u.name ilike ${'%' + q + '%'} or u.de_id ilike ${'%' + q + '%'} ${digits.length >= 4 ? sql`or u.phone like ${'%' + digits + '%'}` : sql``})` : sql``}
          ${sp.open && UUID.test(sp.open) ? sql`or u.id = ${sp.open}` : sql``}
        order by u.created_at desc limit 200`,
    sql`select count(*)::int as total from users where role = 'student'`,
    sql`select code, name from exams order by sort`,
    sql`select id, name from batches order by name`,
    sql`select id, name from courses order by sort`,
  ]);
  const chip = (code: string | null, label: string) => {
    const p = new URLSearchParams({ ...(q && { q }), ...(code && { exam: code }), ...(sp.batch && { batch: sp.batch }) });
    return <Link key={label} href={'/admin/students?' + p} className="chip" aria-pressed={(sp.exam ?? null) === code}>{label}</Link>;
  };
  return (
    <>
      <Head title={sp.staff ? 'Staff' : 'Students'} sub={sp.staff ? 'Faculty, content, support and admin accounts' : `${total.toLocaleString('en-IN')} students · one DE Educare ID across web and app`}>
        {me.role === 'admin' && <Link className="btn ghost" href={sp.staff ? '/admin/students' : '/admin/students?staff=1'}>{sp.staff ? 'Students' : 'Staff'}</Link>}
        {me.role !== 'faculty' && <a className="btn ghost" href={'/admin/students/export?' + new URLSearchParams({ ...(sp.exam && { exam: sp.exam }), ...(sp.batch && { batch: sp.batch }) })}>Export CSV</a>}
      </Head>
      <div className="row" style={{ '--gap': '12px' } as React.CSSProperties}>
        <form style={{ flex: '1 1 260px' }}>
          {sp.exam && <input type="hidden" name="exam" value={sp.exam} />}{sp.batch && <input type="hidden" name="batch" value={sp.batch} />}{sp.staff && <input type="hidden" name="staff" value="1" />}
          <input className="input" name="q" defaultValue={q} placeholder="Search by name, phone or DE ID" aria-label="Search students" />
        </form>
        {!sp.staff && <div className="chips">{chip(null, 'All')}{exams.map(e => chip(e.code, e.name))}</div>}
      </div>
      {sp.batch && <div className="alert info">Showing one batch · <Link href="/admin/students">show everyone</Link></div>}
      <StudentsClient
        role={me.role} openId={sp.open ?? null}
        exams={exams.map(e => ({ id: e.code, name: e.name }))} batches={batches.map(b => ({ id: b.id, name: b.name }))} courses={courses.map(c => ({ id: c.id, name: c.name }))}
        rows={rows.map(r => ({
          id: r.id, name: r.name ?? 'New student', phone: r.phone, deId: r.de_id, role: r.role, exam: r.target_exam ?? '', plans: r.plans ?? 'Free', batchId: r.batch_id, batch: r.batch ?? 'None',
          pct: r.pct == null ? '—' : String(r.pct), attempts: r.attempts, credits: r.guru_credits,
          last: r.last_active_at ? ago(new Date(r.last_active_at)) : '—', joined: new Date(r.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }),
        }))}
      />
    </>
  );
}

const UUID = /^[0-9a-f-]{36}$/i;

function ago(d: Date) {
  const m = Math.round((Date.now() - d.getTime()) / 60000);
  if (m < 60) return Math.max(1, m) + 'm ago';
  if (m < 1440) return Math.round(m / 60) + 'h ago';
  return Math.round(m / 1440) + 'd ago';
}
