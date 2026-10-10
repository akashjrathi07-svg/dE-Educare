import 'server-only';
import Anthropic from '@anthropic-ai/sdk';
import { sql } from './db';
import type { User } from './auth';
import { spendCoins } from './coins';

const MODEL = process.env.GURU_MODEL || 'claude-opus-5-5';
let client: Anthropic | null = null;
const anthropic = () => (process.env.ANTHROPIC_API_KEY ? (client ??= new Anthropic()) : null);

export const GURU_FALLBACK = 'Start with two DILR sets a day, timed at 12 minutes each. Pick sets by type and review every wrong choice. Take one full mock each weekend and track set selection, not just score.';

type Content = Anthropic.Beta.Messages.BetaMessageParam['content'];
type Msg = { role: 'user' | 'assistant'; content: Content };

function params(system: string, messages: Msg[], maxTokens: number, effort: 'low' | 'medium' | 'high') {
  return {
    model: MODEL,
    max_tokens: maxTokens,
    system,
    messages,
    output_config: { effort },
    // If a safety classifier declines, the API retries on a suitable model in the same call.
    betas: ['server-side-fallback-2026-07-01'],
    fallbacks: 'default' as const,
  };
}

/** One-shot request. Returns `fallback` if no key is set or the call fails. */
export async function askClaude(system: string, messages: Msg[], fallback: string, opts: { maxTokens?: number; effort?: 'low' | 'medium' | 'high' } = {}): Promise<string> {
  const c = anthropic();
  if (!c) return fallback;
  try {
    const res = await c.beta.messages.create(params(system, messages, opts.maxTokens ?? 4000, opts.effort ?? 'low'));
    if (res.stop_reason === 'refusal') return fallback;
    const text = res.content.map(b => (b.type === 'text' ? b.text : '')).join('').trim();
    return text || fallback;
  } catch (e) {
    logApiError(e);
    return fallback;
  }
}

/** Streams text chunks. Yields the fallback in one piece if the API is unavailable. */
export async function* streamClaude(system: string, messages: Msg[], fallback: string): AsyncGenerator<string> {
  const c = anthropic();
  if (!c) { yield fallback; return; }
  let any = false;
  try {
    const stream = c.beta.messages.stream(params(system, messages, 8000, 'low'));
    for await (const ev of stream) {
      if (ev.type === 'content_block_delta' && ev.delta.type === 'text_delta') { any = true; yield ev.delta.text; }
    }
    const final = await stream.finalMessage();
    if (final.stop_reason === 'refusal' && !any) yield fallback;
  } catch (e) {
    logApiError(e);
    if (!any) yield fallback;
  }
}

function logApiError(e: unknown) {
  if (e instanceof Anthropic.RateLimitError) console.warn('[guru] rate limited');
  else if (e instanceof Anthropic.AuthenticationError) console.error('[guru] invalid ANTHROPIC_API_KEY');
  else if (e instanceof Anthropic.APIError) console.error('[guru] API error', e.status, e.message);
  else console.error('[guru]', e);
}

/** Spends Guru coins for an action (see lib/economy.ts for costs). */
export async function consumeGuru(userId: string, cost = 1, kind = 'chat', ref: string | null = null) {
  const r = await spendCoins(userId, cost, kind, ref);
  if (!r.ok) return { ok: false as const, message: r.message };
  return { ok: true as const, left: r.wallet.dailyLeft, bonus: r.wallet.bonus, spent: r.spent };
}

/** What Guru knows about the student: exam, days left, recent attempts. */
export async function studentContext(u: User, page: string) {
  const [exam] = await sql`select name, exam_date from exams where code = ${u.target_exam ?? 'CAT'}`;
  const days = exam?.exam_date ? Math.max(0, Math.ceil((new Date(exam.exam_date).getTime() - Date.now()) / 86400000)) : null;
  const recent = await sql`
    select t.name, a.score::float, a.max_score::float, a.percentile::float, a.accuracy,
      (select string_agg(s.name || ' ' || r.correct || '/' || (r.correct + r.wrong + r.skipped), ', ' order by s.sort)
         from attempt_section_results r join sections s on s.id = r.section_id where r.attempt_id = a.id) as secs
    from attempts a join tests t on t.id = a.test_id
    where a.user_id = ${u.id} and a.status = 'submitted' order by a.submitted_at desc limit 4`;
  const lines = recent.map(r => `${r.name}: ${r.score}/${r.max_score}, ${Number(r.percentile).toFixed(1)} %ile (est.), accuracy ${r.accuracy}%${r.secs ? ' · ' + r.secs : ''}`);
  return [
    `Student: ${u.name ?? 'a student'}, preparing for ${exam?.name ?? u.target_exam ?? 'CAT'}${u.target_year ? ' ' + u.target_year : ''}${days != null ? ` (${days} days left)` : ''}${u.target_percentile ? `, target ${u.target_percentile} percentile` : ''}.`,
    lines.length ? 'Recent attempts:\n' + lines.join('\n') : 'No tests taken yet.',
    `They are on the ${page} page of the DE Educare portal.`,
  ].join('\n');
}

export const GURU_SYSTEM = `You are Guru, the AI mentor in the DE Educare student portal (a Mumbai test-prep platform for CAT, MBA-CET, OMETs and, soon, UPSC and Bank PO).
Be specific, warm and practical. Recommend DE Educare tests by type (topic tests, sectionals, full mocks) when useful.
Reply in under 90 words, plain text, no markdown or bullet symbols.`;
