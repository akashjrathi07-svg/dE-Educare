import { currentUser } from '@/lib/server/auth';
import { sql } from '@/lib/server/db';
import { consumeGuru, streamClaude, studentContext, GURU_SYSTEM, GURU_FALLBACK } from '@/lib/server/guru';
import { refundCoins } from '@/lib/server/coins';
import { COIN_COST } from '@/lib/economy';

// Voice replies teach like a tutor at a whiteboard, so they cost more than chat.
const VOICE_STYLE = ' This reply will be spoken aloud by a voice tutor. Teach like a real teacher sitting next to the student: start with the idea in one plain sentence, walk through one short worked example step by step, then ask the student one quick check question. Use 5 to 8 short spoken sentences, no lists, symbols or markdown; say numbers and formulas the way a teacher would read them out.';

/** POST { text, page, mode } → streamed plain-text reply. */
export async function POST(req: Request) {
  const u = await currentUser();
  if (!u) return new Response('Sign in to talk to Guru.', { status: 401 });
  const body = await req.json().catch(() => ({}));
  const text = String(body.text ?? '').trim().slice(0, 2000);
  const page = String(body.page ?? 'Dashboard').slice(0, 60);
  const mode = body.mode === 'voice' ? 'voice' : 'chat';
  if (!text) return new Response('Ask a question first.', { status: 400 });

  const quota = await consumeGuru(u.id, mode === 'voice' ? COIN_COST.voice : COIN_COST.chat, mode);
  if (!quota.ok) return new Response(quota.message, { status: 429 });

  const history = (await sql`select role, text from guru_messages where user_id = ${u.id} order by id desc limit 8`).reverse();
  await sql`insert into guru_messages (user_id, role, text, context, mode) values (${u.id}, 'user', ${text}, ${page}, ${mode})`;
  const messages = [
    ...history.map(m => ({ role: m.role as 'user' | 'assistant', content: m.text as string })),
    { role: 'user' as const, content: text },
  ];
  // The API needs the first message to be the user's.
  while (messages.length && messages[0].role !== 'user') messages.shift();
  const system = GURU_SYSTEM + (mode === 'voice' ? VOICE_STYLE : '') + '\n\n' + (await studentContext(u, page));

  const encoder = new TextEncoder();
  let full = '';
  const stream = new ReadableStream({
    async start(controller) {
      for await (const chunk of streamClaude(system, messages, GURU_FALLBACK)) {
        full += chunk;
        controller.enqueue(encoder.encode(chunk));
      }
      controller.close();
      // No AI answer (key missing or API down): give the coins back.
      if (full.trim() === GURU_FALLBACK) await refundCoins(u.id, quota.spent, mode);
      await sql`insert into guru_messages (user_id, role, text, context, mode) values (${u.id}, 'assistant', ${full.trim() || GURU_FALLBACK}, ${page}, ${mode})`;
    },
  });
  return new Response(stream, {
    headers: { 'content-type': 'text/plain; charset=utf-8', 'cache-control': 'no-store', 'x-guru-left': quota.left == null ? 'unlimited' : String(quota.left), 'x-guru-bonus': String(quota.bonus) },
  });
}

/** GET → recent conversation for the panel. */
export async function GET() {
  const u = await currentUser();
  if (!u) return Response.json({ messages: [] }, { status: 401 });
  const rows = (await sql`select role, text from guru_messages where user_id = ${u.id} order by id desc limit 30`).reverse();
  return Response.json({ messages: rows });
}
