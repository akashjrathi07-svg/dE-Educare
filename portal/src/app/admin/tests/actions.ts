'use server';
import { revalidatePath } from 'next/cache';
import { staffOrThrow } from '@/lib/server/auth';
import { sql } from '@/lib/server/db';
import { examRefs, istTimestamp } from '@/lib/server/admin';
import { slugify } from '@/lib/slug';

export type TestInput = {
  name: string; type: 'full_mock' | 'sectional' | 'topic' | 'daily' | 'pyq'; exam: string; sections: { code: string; count: number; ids: string }[]; topic: string;
  mode: 'auto' | 'manual'; easy: number; medium: number; hard: number; minutes: number; free: boolean; courses: string[];
  solutions: 'after_submit' | 'after_window'; windowEnd: string; ranking: 'all_india' | 'batch' | 'none'; publish: 'now' | 'schedule' | 'draft'; date: string; time: string; nodeId: string;
};

/** Splits n questions by difficulty percentages; rounding leftovers go to medium. */
function splitByDifficulty(n: number, easy: number, medium: number, hard: number) {
  const sum = easy + medium + hard || 100;
  const e = Math.round((n * easy) / sum), h = Math.round((n * hard) / sum);
  return { easy: e, medium: Math.max(0, n - e - h), hard: h };
}

export async function createTest(t: TestInput) {
  await staffOrThrow('tests');
  const name = t.name.trim().slice(0, 120);
  if (!name) return { ok: false, message: 'Give the test a name' };
  if (!['full_mock', 'sectional', 'topic', 'daily', 'pyq'].includes(t.type)) return { ok: false, message: 'Pick a test type' };
  const exam = (await examRefs()).find(e => e.code === t.exam);
  if (!exam) return { ok: false, message: 'Pick an exam' };
  const wanted = t.sections.filter(s => s.count > 0);
  if (!wanted.length) return { ok: false, message: 'Add at least one question' };
  if (t.mode === 'auto' && Math.round(t.easy + t.medium + t.hard) !== 100) return { ok: false, message: 'Easy, medium and hard should add up to 100%' };
  if (!(t.minutes >= 1 && t.minutes <= 600)) return { ok: false, message: 'Duration must be between 1 and 600 minutes' };
  if (t.publish === 'schedule' && !/^\d{4}-\d\d-\d\d$/.test(t.date)) return { ok: false, message: 'Pick a go-live date' };
  if (t.solutions === 'after_window' && !/^\d{4}-\d\d-\d\d$/.test(t.windowEnd)) return { ok: false, message: 'Pick when the test window closes' };
  if (t.type === 'topic' && !t.topic) return { ok: false, message: 'Pick a topic' };
  const secTimer = exam.rules.secTimer === true && ['full_mock', 'pyq', 'sectional'].includes(t.type);

  // Choose questions per section.
  const picked: { secId: string; secName: string; minutes: number | null; ids: string[] }[] = [];
  for (const w of wanted) {
    const sec = exam.sections.find(s => s.code === w.code);
    if (!sec) return { ok: false, message: 'Unknown section ' + w.code };
    const topicFilter = t.type === 'topic' ? sql`and q.topic_id = (select id from topics where section_id = ${sec.id} and name = ${t.topic})` : sql``;
    let ids: string[];
    if (t.mode === 'manual') {
      const ext = [...new Set(w.ids.split(/[\s,]+/).map(x => x.trim().toUpperCase()).filter(Boolean))];
      if (ext.length !== w.count) return { ok: false, message: `${sec.name}: listed ${ext.length} IDs, but the section needs ${w.count}` };
      const rows = await sql`select q.id, q.external_id from questions q where q.external_id = any(${ext}) and q.exam_id = ${exam.id} and q.section_id = ${sec.id} and q.status = 'live'`;
      const missing = ext.filter(x => !rows.some(r => r.external_id === x));
      if (missing.length) return { ok: false, message: `${sec.name}: ${missing.slice(0, 5).join(', ')} not found as live ${exam.code} ${sec.code} questions` };
      ids = ext.map(x => rows.find(r => r.external_id === x)!.id);
    } else {
      const split = splitByDifficulty(w.count, t.easy, t.medium, t.hard);
      ids = [];
      for (const d of ['easy', 'medium', 'hard'] as const) {
        const rows = await sql`select q.id from questions q where q.exam_id = ${exam.id} and q.section_id = ${sec.id} and q.status = 'live' and q.difficulty = ${d} ${topicFilter} order by random() limit ${split[d]}`;
        ids.push(...rows.map(r => r.id));
      }
      if (ids.length < w.count) {
        // Not enough at one level: top up from any difficulty.
        const more = await sql`select q.id from questions q where q.exam_id = ${exam.id} and q.section_id = ${sec.id} and q.status = 'live' ${topicFilter} and not (q.id = any(${ids})) order by random() limit ${w.count - ids.length}`;
        ids.push(...more.map(r => r.id));
      }
      if (ids.length < w.count) return { ok: false, message: `${sec.name}: only ${ids.length} live question${ids.length === 1 ? '' : 's'} match, the test needs ${w.count}. Add questions or lower the count.` };
      // Keep RC passages and DILR sets together.
      const order = await sql`select id from questions where id = any(${ids}) order by coalesce(set_id::text, id::text), external_id`;
      ids = order.map(r => r.id);
    }
    picked.push({ secId: sec.id, secName: sec.name, minutes: secTimer ? sec.minutes : null, ids });
  }

  const status = t.publish === 'draft' ? 'draft' : 'live';
  const liveFrom = t.publish === 'schedule' ? istTimestamp(t.date, t.time || '09:00') : null;
  const windowEnd = t.solutions === 'after_window' ? istTimestamp(t.windowEnd, '23:59') : null;
  const base = slugify(exam.code + '-' + name);
  let slug = base, n = 1;
  while ((await sql`select 1 from tests where slug = ${slug}`).length) slug = base + '-' + ++n;

  await sql.begin(async tx => {
    const [test] = await tx`
      insert into tests (slug, name, type, exam_id, node_id, duration_min, is_free, solutions_visibility, ranking, status, live_from, window_end, blueprint, sort)
      values (${slug}, ${name}, ${t.type}, ${exam.id}, ${t.nodeId || null}, ${Math.round(t.minutes)}, ${t.free}, ${t.solutions}, ${t.ranking}, ${status}, ${liveFrom}, ${windowEnd},
              ${tx.json({ mode: t.mode, easy: t.easy, medium: t.medium, hard: t.hard, topic: t.topic || null } as never)},
              (select coalesce(max(sort), 0) + 1 from tests where node_id is not distinct from ${t.nodeId || null}))
      returning id`;
    let qsort = 0;
    for (const [k, p] of picked.entries()) {
      const [ts] = await tx`insert into test_sections (test_id, section_id, name, sort, duration_min) values (${test.id}, ${p.secId}, ${p.secName}, ${k}, ${p.minutes}) returning id`;
      for (const qid of p.ids) await tx`insert into test_questions (test_id, test_section_id, question_id, sort) values (${test.id}, ${ts.id}, ${qid}, ${qsort++})`;
    }
    for (const c of t.courses) await tx`insert into course_tests (course_id, test_id) values (${c}, ${test.id}) on conflict do nothing`;
  });
  revalidatePath('/admin/tests');
  revalidatePath('/tests');
  const total = picked.reduce((s, p) => s + p.ids.length, 0);
  return { ok: true, message: `${name} · ${total} questions · ` + (status === 'draft' ? 'saved as draft' : liveFrom ? `scheduled for ${t.date}` : 'live on web and app') };
}

export async function setTestStatus(id: string, status: 'live' | 'draft' | 'archived') {
  await staffOrThrow('tests');
  if (!['live', 'draft', 'archived'].includes(status)) return { ok: false, message: 'Unknown status' };
  const [t] = await sql`update tests set status = ${status}, live_from = null where id = ${id} returning name`;
  if (!t) return { ok: false, message: 'Test not found' };
  revalidatePath('/admin/tests');
  revalidatePath('/tests');
  return { ok: true, message: `${t.name} is now ${status === 'live' ? 'live' : status}` };
}
