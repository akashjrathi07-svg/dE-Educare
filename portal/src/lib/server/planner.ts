import 'server-only';
import { sql } from './db';

const TASKS: Record<string, [string, string, string][]> = {
  mba: [['Daily free test', '5 questions · 10 min', 'Test'], ['DILR: 2 arrangement sets', '24 min, timed', 'Practice'], ['Recorded class: TSD shortcuts', '42 min', 'Class'], ['Flashcards: arithmetic formulas', '6 cards', 'Revise'], ['VARC: 2 RC passages', '20 min', 'Practice'], ['Sectional: DILR', '40 min', 'Test'], ['Mock review with Guru', '30 min', 'Review']],
  upsc: [['Current affairs quiz', '8 min', 'Test'], ['Polity: Fundamental Rights', '45 min', 'Study'], ['Mains answer: GS II', '150 words', 'Write'], ['Flashcards: key Articles', '4 cards', 'Revise'], ['PYQ 2023: 25 questions', '30 min', 'Practice'], ['Map work: rivers', '20 min', 'Study'], ['Mock review with Guru', '30 min', 'Review']],
  bank: [['Speed drill: puzzles', '3 × 3 min', 'Drill'], ['Quant: simplification', '15 min', 'Practice'], ['English: 2 RCs', '15 min', 'Practice'], ['Banking awareness notes', '20 min', 'Study'], ['Prelims mock', '60 min', 'Test'], ['Flashcards: RBI terms', '4 cards', 'Revise'], ['Mock review with Guru', '20 min', 'Review']],
  ug: [['Quant: logarithms basics', '30 min', 'Study'], ['Verbal: 20 new words', '15 min', 'Revise'], ['IPMAT mock', '120 min', 'Test'], ['CUET GT: reasoning set', '20 min', 'Practice'], ['Essay practice', '200 words', 'Write'], ['Flashcards', '4 cards', 'Revise'], ['Mock review with Guru', '30 min', 'Review']],
};

/** Monday of the current week in India, as YYYY-MM-DD. */
export function weekStart(offsetWeeks = 0) {
  const now = new Date(Date.now() + 5.5 * 3600_000);
  const dow = (now.getUTCDay() + 6) % 7;
  const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - dow + offsetWeeks * 7));
  return d.toISOString().slice(0, 10);
}
export function todayIST() { return new Date(Date.now() + 5.5 * 3600_000).toISOString().slice(0, 10); }

/** Creates a starter week (4 tasks a day) the first time a student opens the planner in a week. */
export async function ensureWeek(userId: string, group: string, variant = 0) {
  const start = weekStart();
  const [have] = await sql`select 1 from planner_tasks where user_id = ${userId} and day >= ${start}::date and day < ${start}::date + 7 limit 1`;
  if (have) return;
  const tb = TASKS[group] ?? TASKS.mba;
  for (let d = 0; d < 7; d++) for (let k = 0; k < 4; k++) {
    const [title, meta, tag] = tb[(d + k + variant * 2) % tb.length];
    await sql`insert into planner_tasks (user_id, day, title, meta, tag, sort) values (${userId}, ${start}::date + ${d}::int, ${title}, ${meta}, ${tag}, ${k})`;
  }
}

export async function weekTasks(userId: string) {
  const start = weekStart();
  return sql`select id, day::text as day, title, meta, tag, done, sort from planner_tasks
             where user_id = ${userId} and day >= ${start}::date and day < ${start}::date + 7 order by day, sort`;
}

export { TASKS };
