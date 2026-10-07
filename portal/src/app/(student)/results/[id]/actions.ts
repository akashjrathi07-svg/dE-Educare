'use server';
import { revalidatePath } from 'next/cache';
import { currentUser } from '@/lib/server/auth';
import { sql } from '@/lib/server/db';
import { askClaude } from '@/lib/server/guru';

/** Guru's written analysis (ANALYSIS_LOGIC.md · Guru AI analysis). Cached on the attempt. */
export async function generateAiAnalysis(attemptId: string) {
  const u = await currentUser();
  if (!u) return;
  const [a] = await sql`select a.*, t.name, e.code from attempts a join tests t on t.id = a.test_id join exams e on e.id = t.exam_id where a.id = ${attemptId} and a.user_id = ${u.id} and a.status = 'submitted'`;
  if (!a || a.ai_analysis) return;
  const secs = await sql`select s.name, r.correct, r.correct + r.wrong + r.skipped as n from attempt_section_results r join sections s on s.id = r.section_id where r.attempt_id = ${attemptId} order by s.sort`;
  const topics = await sql`
    select tp.name, aa.answer is null as skipped from attempt_answers aa join questions q on q.id = aa.question_id left join topics tp on tp.id = q.topic_id
    where aa.attempt_id = ${attemptId} and (aa.is_correct = false or aa.answer is null)`;
  const wrong = topics.filter(t => !t.skipped).map(t => t.name).filter(Boolean);
  const skipped = topics.filter(t => t.skipped).map(t => t.name).filter(Boolean);
  const weakest = [...secs].sort((x, y) => x.correct / Math.max(1, x.n) - y.correct / Math.max(1, y.n))[0];
  const fallback = [
    `1. ${[...secs].sort((x, y) => y.correct / Math.max(1, y.n) - x.correct / Math.max(1, x.n))[0]?.name ?? 'Your strongest section'} went well. Keep it sharp with one sectional a week.`,
    `2. Marks lost in ${wrong.slice(0, 3).join(', ') || 'no topics'}. Review each solution before retrying.`,
    `3. You skipped ${a.skipped} question${a.skipped === 1 ? '' : 's'}. Set a 2-minute cut-off per question so the last ones get a fair look.`,
    `4. Next: ${wrong[0] ?? 'Percentages'} topic test 1, then a ${weakest?.name ?? 'Quant'} sectional before your next mock.`,
  ].join('\n');
  const text = await askClaude(
    'You are Guru, the AI mentor on the DE Educare test portal. Write exactly 4 numbered lines: 1) what went well, 2) what cost marks and why, 3) one time-management tip, 4) the next 2 DE Educare tests to take, named as topic tests or sectionals. Under 110 words, plain text, no markdown.',
    [{ role: 'user', content: `A student just finished "${a.name}" (${a.code}). Score ${a.score}/${a.max_score}, accuracy ${a.accuracy}%, ${a.skipped} skipped, estimated ${Number(a.percentile).toFixed(1)} percentile. Sections: ${secs.map(s => `${s.name} ${s.correct}/${s.n}`).join(', ')}. Wrong topics: ${wrong.join(', ') || 'none'}. Skipped topics: ${skipped.join(', ') || 'none'}.` }],
    fallback, { maxTokens: 3000, effort: 'low' },
  );
  await sql`update attempts set ai_analysis = ${text}, ai_generated_at = now() where id = ${attemptId}`;
  revalidatePath(`/results/${attemptId}`);
}

/** "Report a problem" on a solution. Shows up in Admin → Question bank. One open report per student per question. */
export async function reportQuestion(questionId: string, reason: string, note: string) {
  const u = await currentUser();
  if (!u) return { ok: false, message: 'Please sign in again.' };
  const REASONS = ['Wrong answer key', 'Question unclear', 'Solution wrong or missing', 'Typo or formatting', 'Other'];
  if (!REASONS.includes(reason)) return { ok: false, message: 'Pick a reason.' };
  const [seen] = await sql`select 1 from attempt_answers aa join attempts a on a.id = aa.attempt_id where a.user_id = ${u.id} and aa.question_id = ${questionId} limit 1`;
  if (!seen) return { ok: false, message: 'You can report questions from your own tests.' };
  const [dup] = await sql`select 1 from question_reports where question_id = ${questionId} and user_id = ${u.id} and status = 'open'`;
  if (!dup) await sql`insert into question_reports (question_id, user_id, reason, note) values (${questionId}, ${u.id}, ${reason}, ${note.trim().slice(0, 500) || null})`;
  return { ok: true, message: 'Thanks, our content team will check it.' };
}
