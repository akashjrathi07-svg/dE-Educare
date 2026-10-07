import { currentUser, canAccess } from '@/lib/server/auth';
import { sql } from '@/lib/server/db';
import { studentColumns } from '@/lib/server/admin';

const cell = (v: unknown) => {
  const s = v == null ? '' : v instanceof Date ? v.toISOString() : String(v);
  // Quote everything; neutralise spreadsheet formulas.
  return '"' + (/^[=+\-@]/.test(s) ? "'" + s : s).replace(/"/g, '""') + '"';
};

export async function GET(req: Request) {
  const u = await currentUser();
  if (!u || !canAccess(u.role, 'students') || u.role === 'faculty') return new Response('Not allowed', { status: 403 });
  const p = new URL(req.url).searchParams;
  const exam = p.get('exam'), batch = p.get('batch');
  const rows = await sql`select ${studentColumns()}, u.email, u.city from users u where u.role = 'student'
    ${exam ? sql`and u.target_exam = ${exam}` : sql``}
    ${batch && /^[0-9a-f-]{36}$/i.test(batch) ? sql`and exists (select 1 from batch_members m where m.user_id = u.id and m.batch_id = ${batch})` : sql``}
    order by u.created_at desc`;
  const head = ['de_id', 'name', 'phone', 'email', 'city', 'exam', 'plans', 'batch', 'avg_percentile', 'tests_taken', 'guru_credits', 'joined', 'last_active'];
  const lines = rows.map(r => [r.de_id, r.name, r.phone, r.email, r.city, r.target_exam, r.plans ?? 'Free', r.batch, r.pct, r.attempts, r.guru_credits, r.created_at, r.last_active_at].map(cell).join(','));
  return new Response('﻿' + [head.join(','), ...lines].join('\r\n'), {
    headers: { 'content-type': 'text/csv; charset=utf-8', 'content-disposition': `attachment; filename="students-${new Date().toISOString().slice(0, 10)}.csv"`, 'cache-control': 'no-store' },
  });
}
