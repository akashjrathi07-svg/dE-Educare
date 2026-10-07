import { currentUser } from '@/lib/server/auth';
import { sql } from '@/lib/server/db';
import { canSeeClass } from '@/lib/server/live';

type Ctx = { params: Promise<{ id: string }> };

/** GET ?after=<id> → new chat messages. Polled every few seconds by the class room. */
export async function GET(req: Request, { params }: Ctx) {
  const { id } = await params;
  const u = await currentUser();
  if (!u || !(await canSeeClass(u.id, u.exam_group, id))) return Response.json({ messages: [] }, { status: 403 });
  const after = Number(new URL(req.url).searchParams.get('after') ?? 0) || 0;
  const rows = await sql`
    select m.id::int, m.text, m.created_at, coalesce(u.name, 'Student') as by, u.role <> 'student' as host, m.user_id = ${u.id} as mine
    from live_messages m left join users u on u.id = m.user_id where m.class_id = ${id} and m.id > ${after} order by m.id limit 100`;
  const [{ watching }] = await sql`select count(distinct user_id)::int as watching from live_messages where class_id = ${id} and created_at > now() - interval '30 minutes'`;
  return Response.json({ messages: rows, watching });
}

export async function POST(req: Request, { params }: Ctx) {
  const { id } = await params;
  const u = await currentUser();
  if (!u || !(await canSeeClass(u.id, u.exam_group, id))) return Response.json({ ok: false }, { status: 403 });
  const text = String((await req.json().catch(() => ({}))).text ?? '').trim().slice(0, 500);
  if (!text) return Response.json({ ok: false }, { status: 400 });
  const [recent] = await sql`select count(*)::int as n from live_messages where class_id = ${id} and user_id = ${u.id} and created_at > now() - interval '10 seconds'`;
  if (recent.n >= 3) return Response.json({ ok: false, error: 'Slow down a little.' }, { status: 429 });
  await sql`insert into live_messages (class_id, user_id, text) values (${id}, ${u.id}, ${text})`;
  return Response.json({ ok: true });
}
