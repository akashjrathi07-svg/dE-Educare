'use server';
import { revalidatePath } from 'next/cache';
import { currentUser } from '@/lib/server/auth';
import { sql } from '@/lib/server/db';
import { askClaude, consumeGuru } from '@/lib/server/guru';
import { refundCoins } from '@/lib/server/coins';
import { reportCost } from '@/lib/economy';

/** Guru's full progress report over the student's last 30 tests: 5 coins, or 10 for more than 10 tests. */
export async function generateProgressReport(): Promise<{ ok: boolean; message: string }> {
  const u = await currentUser();
  if (!u) return { ok: false, message: 'Please sign in again.' };
  const tests = await sql`
    select a.id, t.name, t.type, a.score::float, a.max_score::float, a.accuracy, a.percentile::float, a.skipped, a.time_sec, a.submitted_at
    from attempts a join tests t on t.id = a.test_id where a.user_id = ${u.id} and a.status = 'submitted' order by a.submitted_at desc limit 30`;
  if (tests.length < 2) return { ok: false, message: 'Take at least two tests first, so there is a trend to report on.' };
  const cost = reportCost(tests.length);
  const pay = await consumeGuru(u.id, cost, 'report');
  if (!pay.ok) return { ok: false, message: pay.message };
  const ids = tests.map(t => t.id);
  const [secs, topics] = await Promise.all([
    sql`select s.name, sum(r.correct)::int as c, sum(r.correct + r.wrong + r.skipped)::int as n from attempt_section_results r join sections s on s.id = r.section_id where r.attempt_id = any(${ids}) group by s.name order by s.name`,
    sql`select tp.name, count(*) filter (where aa.is_correct)::int as c, count(*)::int as n
        from attempt_answers aa join questions q on q.id = aa.question_id join topics tp on tp.id = q.topic_id
        where aa.attempt_id = any(${ids}) and aa.answer is not null group by tp.name having count(*) >= 2 order by (count(*) filter (where aa.is_correct))::float / count(*) limit 12`,
  ]);
  const lines = tests.map(t => `${new Date(t.submitted_at).toISOString().slice(0, 10)} ${t.name} (${t.type}): ${t.score}/${t.max_score}, ${t.accuracy}% accuracy, ${Number(t.percentile).toFixed(1)} %ile, ${t.skipped} skipped`).join('\n');
  const text = await askClaude(
    'You are Guru, the AI mentor on DE Educare. Write a progress report for a student preparing for ' + (u.target_exam ?? 'CAT') + '. Use these plain-text headings, each followed by 2–4 short lines: TREND (is the score/percentile improving, with numbers), STRENGTHS, WEAK TOPICS (name them, with accuracy), TIME AND ATTEMPTS, NEXT 14 DAYS (a day-by-day style plan using DE Educare topic tests, sectionals and mocks). Be specific and encouraging, no markdown symbols, under 300 words.',
    [{ role: 'user', content: `Tests (newest first):\n${lines}\n\nSection accuracy across these tests: ${secs.map(s => `${s.name} ${s.c}/${s.n}`).join(', ')}.\nWeakest topics (correct/attempted): ${topics.map(t => `${t.name} ${t.c}/${t.n}`).join(', ') || 'not enough data'}.\nTarget percentile: ${u.target_percentile ?? 99}.` }],
    '', { maxTokens: 6000, effort: 'medium' },
  );
  if (!text) {
    await refundCoins(u.id, pay.spent, 'report');
    return { ok: false, message: 'Guru could not write the report just now. Your coins were returned; please try again.' };
  }
  await sql`insert into progress_reports (user_id, tests, coins, body) values (${u.id}, ${tests.length}, ${cost}, ${text})`;
  revalidatePath('/results');
  return { ok: true, message: 'Report ready' };
}
