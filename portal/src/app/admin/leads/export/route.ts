import { currentUser, canAccess } from '@/lib/server/auth';
import { sql } from '@/lib/server/db';

const cell = (v: unknown) => {
  const s = v == null ? '' : v instanceof Date ? v.toISOString() : typeof v === 'object' ? Object.values(v as object).join(' / ') : String(v);
  return '"' + (/^[=+\-@]/.test(s) ? "'" + s : s).replace(/"/g, '""') + '"';
};

export async function GET(req: Request) {
  const u = await currentUser();
  if (!u || !canAccess(u.role, 'leads')) return new Response('Not allowed', { status: 403 });
  const tab = new URL(req.url).searchParams.get('tab');
  const rows = await sql`select * from leads where true ${tab === 'new' ? sql`and not contacted` : tab === 'contacted' ? sql`and contacted` : sql``} order by created_at desc`;
  const cols = ['created_at', 'name', 'phone', 'email', 'city', 'interest_label', 'currently', 'message', 'form', 'page', 'utm', 'contacted', 'note'] as const;
  const lines = rows.map(r => cols.map(c => cell(r[c])).join(','));
  return new Response('﻿' + [cols.join(','), ...lines].join('\r\n'), {
    headers: { 'content-type': 'text/csv; charset=utf-8', 'content-disposition': `attachment; filename="leads-${new Date().toISOString().slice(0, 10)}.csv"`, 'cache-control': 'no-store' },
  });
}
