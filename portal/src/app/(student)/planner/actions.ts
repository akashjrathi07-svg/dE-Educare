'use server';
import { XP_OTHER } from '@/lib/economy';
import { revalidatePath } from 'next/cache';
import { currentUser } from '@/lib/server/auth';
import { sql } from '@/lib/server/db';
import { awardXp, revokeXp } from '@/lib/server/xp';
import { askClaude } from '@/lib/server/guru';
import { weekStart, todayIST, TASKS } from '@/lib/server/planner';

export async function togglePlannerTask(id: string) {
  const u = await currentUser();
  if (!u) return;
  const [t] = await sql`update planner_tasks set done = not done where id = ${id} and user_id = ${u.id} and day >= ${todayIST()}::date returning done`;
  if (!t) return;
  if (t.done) await awardXp(u.id, 'planner_task', XP_OTHER.planner_task, id);
  else await revokeXp(u.id, 'planner_task', id);
  revalidatePath('/planner');
  revalidatePath('/');
}

/** Guru rewrites the rest of the week around the student's weak topics. */
export async function replanWeek() {
  const u = await currentUser();
  if (!u) return { ok: false };
  const today = todayIST();
  const start = weekStart();
  const weak = await sql`
    select tp.name, round(100.0 * avg(case when aa.is_correct then 1 else 0 end))::int as acc
    from attempt_answers aa join attempts a on a.id = aa.attempt_id join questions q on q.id = aa.question_id join topics tp on tp.id = q.topic_id
    where a.user_id = ${u.id} and a.status = 'submitted' and aa.answer is not null group by tp.name order by acc asc limit 5`;
  const days: string[] = [];
  for (let d = 0; d < 7; d++) { const day = new Date(Date.parse(start) + d * 86400000).toISOString().slice(0, 10); if (day >= today) days.push(day); }
  const fallback = () => {
    const tb = TASKS[u.exam_group] ?? TASKS.mba;
    const topics = weak.map(w => w.name);
    return days.flatMap((day, d) => [0, 1, 2, 3].map(k => {
      const [title, meta, tag] = tb[(d + k + 3) % tb.length];
      return { day, title: k === 1 && topics[d % Math.max(1, topics.length)] ? `${topics[d % topics.length]} · topic test` : title, meta: k === 1 && topics.length ? '15 min · weak topic' : meta, tag: k === 1 && topics.length ? 'Test' : tag };
    }));
  };
  let tasks = fallback();
  const reply = await askClaude(
    'You plan study weeks for DE Educare students. Reply with JSON only: an array of objects {"day":"YYYY-MM-DD","title":string,"meta":string,"tag":one of Test|Practice|Class|Revise|Review|Study}. 4 tasks per day, titles under 45 characters, meta under 25 characters.',
    [{ role: 'user', content: `Exam: ${u.target_exam ?? 'CAT'}. Days to plan: ${days.join(', ')}. Weakest topics by accuracy: ${weak.map(w => `${w.name} ${w.acc}%`).join(', ') || 'unknown yet'}. Include one daily free test each day, one weak-topic test most days, one review session and one full mock on the weekend.` }],
    '', { maxTokens: 6000, effort: 'medium' },
  );
  try {
    const parsed = JSON.parse(reply.replace(/^```(?:json)?|```$/g, '').trim());
    const ok = Array.isArray(parsed) && parsed.every(t => days.includes(t.day) && typeof t.title === 'string');
    if (ok && parsed.length) tasks = parsed.slice(0, days.length * 5).map((t: Record<string, string>) => ({ day: t.day, title: t.title.slice(0, 60), meta: String(t.meta ?? '').slice(0, 40), tag: String(t.tag ?? 'Study').slice(0, 12) }));
  } catch { /* keep fallback */ }
  await sql.begin(async tx => {
    await tx`delete from planner_tasks where user_id = ${u.id} and day = any(${days}::date[]) and not done`;
    const sorts: Record<string, number> = {};
    for (const t of tasks) {
      sorts[t.day] = (sorts[t.day] ?? 10) + 1;
      await tx`insert into planner_tasks (user_id, day, title, meta, tag, sort) values (${u.id}, ${t.day}, ${t.title}, ${t.meta}, ${t.tag}, ${sorts[t.day]})`;
    }
  });
  revalidatePath('/planner');
  revalidatePath('/');
  return { ok: true };
}
