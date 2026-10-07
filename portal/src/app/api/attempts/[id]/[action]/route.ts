import { currentUser } from '@/lib/server/auth';
import { attemptState, saveAnswers, nextSection, submitAttempt, type AnswerChange } from '@/lib/server/attempts';

type Ctx = { params: Promise<{ id: string; action: string }> };
const uuid = /^[0-9a-f-]{36}$/i;

export async function GET(_req: Request, { params }: Ctx) {
  const { id, action } = await params;
  const u = await currentUser();
  if (!u) return Response.json({ error: 'auth' }, { status: 401 });
  if (action !== 'state' || !uuid.test(id)) return Response.json({ error: 'not_found' }, { status: 404 });
  const s = await attemptState(id, u.id);
  return s ? Response.json(s) : Response.json({ error: 'not_found' }, { status: 404 });
}

export async function POST(req: Request, { params }: Ctx) {
  const { id, action } = await params;
  const u = await currentUser();
  if (!u) return Response.json({ error: 'auth' }, { status: 401 });
  if (!uuid.test(id)) return Response.json({ error: 'not_found' }, { status: 404 });
  const body = await req.json().catch(() => ({}));
  if (action === 'save') {
    const changes = (Array.isArray(body.changes) ? body.changes : []).filter((c: AnswerChange) => typeof c?.questionId === 'string' && uuid.test(c.questionId));
    return Response.json(await saveAnswers(id, u.id, changes, typeof body.current === 'string' ? body.current : undefined));
  }
  if (action === 'next-section') {
    if (Array.isArray(body.changes) && body.changes.length) await saveAnswers(id, u.id, body.changes);
    return Response.json(await nextSection(id, u.id));
  }
  if (action === 'submit') {
    if (Array.isArray(body.changes) && body.changes.length) await saveAnswers(id, u.id, body.changes);
    return Response.json(await submitAttempt(id, u.id));
  }
  return Response.json({ error: 'not_found' }, { status: 404 });
}
