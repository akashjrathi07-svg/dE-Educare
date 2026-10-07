import { currentUser } from '@/lib/server/auth';
import { sql } from '@/lib/server/db';
import { consumeGuru, streamClaude, studentContext, GURU_SYSTEM, GURU_FALLBACK } from '@/lib/server/guru';

/** POST { text, page, mode } → streamed plain-text reply. */
export async function POST(req: Request) {
  const u = await currentUser();
  if (!u) return new Response('Sign in to talk to Guru.', { status: 401 });
  const body = await req.json().catch(() => ({}));
  const text = String(body.text ?? '').trim().slice(0, 2000);
  const page = String(body.page ?? 'Dashboard').slice(0, 60);
  const mode = body.mode === 'voice' ? 'voice' : 'chat';
  if (!text) return new Response('Ask a question first.', { status: 400 });

  const quota = await consumeGuru(u.id);
  if (!quota.ok) return new Response(quota.message, { status: 429 });

  const history = (await sql`select role, text from guru_messages where user_id = ${u.id} order by id desc limit 8`).reverse();
  await sql`insert into guru_messages (user_id, role, text, context, mode) values (${u.id}, 'user', ${text}, ${page}, ${mode})`;
  const messages = [
    ...history.map(m => ({ role: m.role as 'user' | 'assistant', content: m.text as string })),
    { role: 'user' as const, content: text },
  ];
  // The API needs the first message to be the user's.
  while (messages.length && messages[0].role !== 'user') messages.shift();
  const system = GURU_SYSTEM + (mode === 'voice' ? ' This reply will be read aloud, so keep it to 3 short sentences.' : '') + '\n\n' + (await studentContext(u, page));

  const encoder = new TextEncoder();
  let full = '';
  const stream = new ReadableStream({
    async start(controller) {
      for await (const chunk of streamClaude(system, messages, GURU_FALLBACK)) {
        full += chunk;
        controller.enqueue(encoder.encode(chunk));
      }
      controller.close();
      await sql`insert into guru_messages (user_id, role, text, context, mode) values (${u.id}, 'assistant', ${full.trim() || GURU_FALLBACK}, ${page}, ${mode})`;
    },
  });
  return new Response(stream, {
    headers: { 'content-type': 'text/plain; charset=utf-8', 'cache-control': 'no-store', 'x-guru-left': quota.left == null ? 'unlimited' : String(quota.left) },
  });
}

/** GET → recent conversation for the panel. */
export async function GET() {
  const u = await currentUser();
  if (!u) return Response.json({ messages: [] }, { status: 401 });
  const rows = (await sql`select role, text from guru_messages where user_id = ${u.id} order by id desc limit 30`).reverse();
  return Response.json({ messages: rows });
}
