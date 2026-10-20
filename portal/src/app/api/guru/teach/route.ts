import { currentUser } from '@/lib/server/auth';
import { sql } from '@/lib/server/db';
import { askClaudeJSON, consumeGuru, studentContext } from '@/lib/server/guru';
import { refundCoins } from '@/lib/server/coins';
import { corsHeaders } from '@/lib/server/cors';
import { COIN_COST } from '@/lib/economy';

export type Lesson = {
  title: string;
  idea: string;
  steps: { heading: string; body: string }[];
  example: { question: string; steps: string[]; answer: string };
  traps: string[];
  check: { question: string; options: string[]; answer_index: number; why: string };
  next: string[];
};

const str = { type: 'string' };
const SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['title', 'idea', 'steps', 'example', 'traps', 'check', 'next'],
  properties: {
    title: str,
    idea: str,
    steps: { type: 'array', items: { type: 'object', additionalProperties: false, required: ['heading', 'body'], properties: { heading: str, body: str } } },
    example: { type: 'object', additionalProperties: false, required: ['question', 'steps', 'answer'], properties: { question: str, steps: { type: 'array', items: str }, answer: str } },
    traps: { type: 'array', items: str },
    check: { type: 'object', additionalProperties: false, required: ['question', 'options', 'answer_index', 'why'], properties: { question: str, options: { type: 'array', items: str }, answer_index: { type: 'integer' }, why: str } },
    next: { type: 'array', items: str },
  },
};

const STYLE: Record<string, string> = {
  new: 'Teach it from scratch.',
  simpler: 'The student found the last explanation hard. Teach it again more simply, with an everyday analogy and smaller steps.',
  another: 'The student wants a different worked example at a slightly higher level, with a new check question.',
  deeper: 'The student has the basics. Go one level deeper: shortcuts, exam-level variations and how toppers solve it fast.',
};
const LEVEL: Record<string, string> = { basic: 'a beginner', standard: 'a student who knows the basics', advanced: 'a strong student aiming for 99 percentile' };

const SYSTEM = `You are Guru, the AI teacher in DE Educare (test prep for CAT, MBA-CET and OMETs in India).
You teach one concept as an interactive lesson that the app shows one step at a time and can read aloud.
- idea: the whole concept in one or two plain sentences.
- steps: 3 to 5 short teaching steps, each with a 2-5 word heading and a body of at most 3 sentences. Build intuition before formulas.
- example: one exam-style question, solved in 3 to 6 short steps, with the final answer.
- traps: 1 to 3 common mistakes students make on this.
- check: one multiple-choice question with exactly 4 options, the 0-based index of the right one, and a one-line why.
- next: 2 or 3 related topics to learn next, each 2-5 words.
Write formulas in plain text a teacher would read out (a^2, x/y, sqrt(3)), no markdown or LaTeX. Use Indian exam context (₹, km/h) where natural.
If the request is not a study topic, set the title to "Let's pick a topic" and teach how to choose what to study today.`;

/** POST { topic, level, style, page } → a lesson as JSON. Costs COIN_COST.teach; refunded if no lesson comes back. */
export async function POST(req: Request) {
  const cors = corsHeaders(req);
  const u = await currentUser();
  if (!u) return Response.json({ message: 'Sign in to learn with Guru.' }, { status: 401, headers: cors });
  const body = await req.json().catch(() => ({}));
  const topic = String(body.topic ?? '').trim().slice(0, 300);
  const level = LEVEL[body.level] ? body.level : 'standard';
  const style = STYLE[body.style] ? body.style : 'new';
  const page = String(body.page ?? 'Guru lesson').slice(0, 60);
  if (!topic) return Response.json({ message: 'Type a topic or question to learn.' }, { status: 400, headers: cors });

  const quota = await consumeGuru(u.id, COIN_COST.teach, 'teach');
  if (!quota.ok) return Response.json({ message: quota.message }, { status: 429, headers: cors });

  const ask = `Topic: ${topic}\nStudent level: ${LEVEL[level]}.\n${STYLE[style]}`;
  const lesson = await askClaudeJSON<Lesson>(SYSTEM + '\n\n' + (await studentContext(u, page)), [{ role: 'user', content: ask }], SCHEMA, { effort: 'medium' });
  const ok = lesson && lesson.steps?.length && lesson.check?.options?.length >= 2;
  if (!ok) {
    await refundCoins(u.id, quota.spent, 'teach');
    return Response.json({ message: 'Guru could not prepare this lesson right now. Your coins were not used; please try again.' }, { status: 503, headers: cors });
  }
  lesson.check.answer_index = Math.min(Math.max(0, Math.round(lesson.check.answer_index)), lesson.check.options.length - 1);
  await sql`insert into guru_messages (user_id, role, text, context, mode) values
    (${u.id}, 'user', ${'Teach me: ' + topic}, ${page}, 'teach'),
    (${u.id}, 'assistant', ${lesson.title + ' — ' + lesson.idea}, ${page}, 'teach')`;
  return Response.json({ lesson, left: quota.left, bonus: quota.bonus }, { headers: { ...cors, 'cache-control': 'no-store' } });
}

export function OPTIONS(req: Request) {
  return new Response(null, { status: 204, headers: corsHeaders(req) });
}
