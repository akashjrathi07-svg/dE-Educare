'use server';
import { revalidatePath } from 'next/cache';
import { staffOrThrow } from '@/lib/server/auth';
import { sql } from '@/lib/server/db';
import { examRefs, istTimestamp } from '@/lib/server/admin';
import { slugify } from '@/lib/slug';

export type TestInput = {
  name: string; slug?: string; type: 'full_mock' | 'sectional' | 'topic' | 'daily' | 'pyq'; exam: string; sections: { code: string; count: number; ids: string }[]; topic: string;
  mode: 'auto' | 'manual'; easy: number; medium: number; hard: number; minutes: number; free: boolean; courses: string[];
  solutions: 'after_submit' | 'after_window'; windowEnd: string; ranking: 'all_india' | 'batch' | 'none'; publish: 'now' | 'schedule' | 'draft'; date: string; time: string; nodeId: string;
  /** Make a numbered series in one go: "CAT Mock" ×10 → CAT Mock 1 … CAT Mock 10 (IDs cat-m-1 … cat-m-10). */
  count?: number; startAt?: number;
  /** Prefer questions that are not in any other test yet. */
  fresh?: boolean;
};

const MAX_SERIES = 50;

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

  const count = t.mode === 'manual' ? 1 : Math.max(1, Math.min(MAX_SERIES, Math.round(Number(t.count) || 1)));
  const startAt = Math.max(0, Math.round(Number(t.startAt) || 1));
  const used = new Set<string>();

  // Choose questions per section for every test in the series; no question repeats inside the series.
  const tests: { name: string; picked: { secId: string; secName: string; minutes: number | null; ids: string[] }[] }[] = [];
  for (let k = 0; k < count; k++) {
    const picked: { secId: string; secName: string; minutes: number | null; ids: string[] }[] = [];
    const label = count > 1 ? `${name} ${startAt + k}` : name;
    for (const w of wanted) {
      const sec = exam.sections.find(s => s.code === w.code);
      if (!sec) return { ok: false, message: 'Unknown section ' + w.code };
      const topicFilter = t.type === 'topic' ? sql`and q.topic_id = (select id from topics where section_id = ${sec.id} and name = ${t.topic})` : sql``;
      const notUsed = sql`and not (q.id = any(${[...used]}::uuid[]))`;
      // Fresh questions first (not in any test yet), then the rest, at random.
      const order = t.fresh ? sql`order by exists (select 1 from test_questions x where x.question_id = q.id), random()` : sql`order by random()`;
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
          const rows = await sql`select q.id from questions q where q.exam_id = ${exam.id} and q.section_id = ${sec.id} and q.status = 'live' and q.difficulty = ${d} ${topicFilter} ${notUsed} ${order} limit ${split[d]}`;
          ids.push(...rows.map(r => r.id));
        }
        if (ids.length < w.count) {
          // Not enough at one level: top up from any difficulty.
          const more = await sql`select q.id from questions q where q.exam_id = ${exam.id} and q.section_id = ${sec.id} and q.status = 'live' ${topicFilter} ${notUsed} and not (q.id = any(${ids}::uuid[])) ${order} limit ${w.count - ids.length}`;
          ids.push(...more.map(r => r.id));
        }
        if (ids.length < w.count) {
          const need = count > 1 ? ` ${count} tests × ${w.count} = ${count * w.count} different questions are needed; test ${k + 1} could only get ${ids.length}.` : ` Only ${ids.length} live question${ids.length === 1 ? '' : 's'} match; the test needs ${w.count}.`;
          return { ok: false, message: `${sec.name}:${need} Add questions, lower the count or make fewer tests.` };
        }
        // Keep RC passages and DILR sets together.
        const ord = await sql`select id from questions where id = any(${ids}::uuid[]) order by coalesce(set_id::text, id::text), external_id`;
        ids = ord.map(r => r.id);
      }
      ids.forEach(id => used.add(id));
      picked.push({ secId: sec.id, secName: sec.name, minutes: secTimer ? sec.minutes : null, ids });
    }
    tests.push({ name: label.slice(0, 120), picked });
  }

  const status = t.publish === 'draft' ? 'draft' : 'live';
  const liveFrom = t.publish === 'schedule' ? istTimestamp(t.date, t.time || '09:00') : null;
  const windowEnd = t.solutions === 'after_window' ? istTimestamp(t.windowEnd, '23:59') : null;
  // The test ID is the link the website uses (portal.deeducare.com/test/<id>), e.g. cat-m-1.
  // For a series the ID is the start: cat-m → cat-m-1, cat-m-2 …
  const wantedId = (t.slug ?? '').trim().toLowerCase().replace(/-+$/, '');
  if (wantedId && !/^[a-z0-9][a-z0-9-]{1,55}[a-z0-9]$/.test(wantedId)) return { ok: false, message: 'Test ID can use small letters, numbers and dashes, e.g. cat-m-11' };
  const slugs: string[] = [];
  for (const [k, test] of tests.entries()) {
    if (wantedId) {
      const slug = count > 1 ? `${wantedId}-${startAt + k}` : wantedId;
      if ((await sql`select 1 from tests where slug = ${slug}`).length) return { ok: false, message: `Test ID ${slug} is already used by another test` };
      slugs.push(slug);
    } else {
      const base = slugify(exam.code + '-' + test.name);
      let slug = base;
      for (let n = 2; slugs.includes(slug) || (await sql`select 1 from tests where slug = ${slug}`).length; n++) slug = base + '-' + n;
      slugs.push(slug);
    }
  }

  await sql.begin(async tx => {
    for (const [k, one] of tests.entries()) {
      const [test] = await tx`
        insert into tests (slug, name, type, exam_id, node_id, duration_min, is_free, solutions_visibility, ranking, status, live_from, window_end, blueprint, sort)
        values (${slugs[k]}, ${one.name}, ${t.type}, ${exam.id}, ${t.nodeId || null}, ${Math.round(t.minutes)}, ${t.free}, ${t.solutions}, ${t.ranking}, ${status}, ${liveFrom}, ${windowEnd},
                ${tx.json({ mode: t.mode, easy: t.easy, medium: t.medium, hard: t.hard, topic: t.topic || null } as never)},
                (select coalesce(max(sort), 0) + 1 from tests where node_id is not distinct from ${t.nodeId || null}))
        returning id`;
      let qsort = 0;
      for (const [i, p] of one.picked.entries()) {
        const [ts] = await tx`insert into test_sections (test_id, section_id, name, sort, duration_min) values (${test.id}, ${p.secId}, ${p.secName}, ${i}, ${p.minutes}) returning id`;
        for (const qid of p.ids) await tx`insert into test_questions (test_id, test_section_id, question_id, sort) values (${test.id}, ${ts.id}, ${qid}, ${qsort++})`;
      }
      for (const c of t.courses) await tx`insert into course_tests (course_id, test_id) values (${c}, ${test.id}) on conflict do nothing`;
    }
  });
  revalidatePath('/admin/tests');
  revalidatePath('/tests');
  const total = tests[0].picked.reduce((s, p) => s + p.ids.length, 0);
  const what = count > 1 ? `${count} tests (${tests[0].name} … ${tests[count - 1].name}) · ${total} questions each` : `${name} · ${total} questions`;
  return { ok: true, message: `${what} · ` + (status === 'draft' ? 'saved as draft' : liveFrom ? `scheduled for ${t.date}` : 'live on web and app') };
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

export type TestEdit = {
  name: string; slug: string; minutes: number; free: boolean; courses: string[]; nodeId: string;
  solutions: 'after_submit' | 'after_window'; windowEnd: string; ranking: 'all_india' | 'batch' | 'none';
  status: 'live' | 'draft' | 'archived' | 'schedule'; date: string; time: string;
};

const done = () => { revalidatePath('/admin/tests'); revalidatePath('/tests'); revalidatePath('/admin/courses'); };
const uuids = (ids: string[]) => (Array.isArray(ids) ? ids.filter(x => /^[0-9a-f-]{36}$/i.test(x)).slice(0, 500) : []);

/** Changes a test's details: name, link, duration, who can take it, where it is listed, solutions, ranking and status. */
export async function updateTest(id: string, e: TestEdit) {
  await staffOrThrow('tests');
  const name = e.name.trim().slice(0, 120);
  if (!name) return { ok: false, message: 'Give the test a name' };
  const slug = e.slug.trim().toLowerCase();
  if (!/^[a-z0-9][a-z0-9-]{1,55}[a-z0-9]$/.test(slug)) return { ok: false, message: 'Test ID can use small letters, numbers and dashes, e.g. cat-m-11' };
  if ((await sql`select 1 from tests where slug = ${slug} and id <> ${id}`).length) return { ok: false, message: `Test ID ${slug} is already used by another test` };
  const minutes = Math.round(Number(e.minutes));
  if (!(minutes >= 1 && minutes <= 600)) return { ok: false, message: 'Duration must be between 1 and 600 minutes' };
  if (!['after_submit', 'after_window'].includes(e.solutions) || !['all_india', 'batch', 'none'].includes(e.ranking)) return { ok: false, message: 'Pick solutions and ranking' };
  if (e.solutions === 'after_window' && !/^\d{4}-\d\d-\d\d$/.test(e.windowEnd)) return { ok: false, message: 'Pick when the test window closes' };
  if (e.status === 'schedule' && !/^\d{4}-\d\d-\d\d$/.test(e.date)) return { ok: false, message: 'Pick a go-live date' };
  if (!['live', 'draft', 'archived', 'schedule'].includes(e.status)) return { ok: false, message: 'Pick a status' };
  const status = e.status === 'schedule' ? 'live' : e.status;
  const liveFrom = e.status === 'schedule' ? istTimestamp(e.date, e.time || '09:00') : null;
  const windowEnd = e.solutions === 'after_window' ? istTimestamp(e.windowEnd, '23:59') : null;
  const courses = uuids(e.courses);
  const [t] = await sql`select id, duration_min from tests where id = ${id}`;
  if (!t) return { ok: false, message: 'Test not found' };
  await sql.begin(async tx => {
    await tx`update tests set name = ${name}, slug = ${slug}, duration_min = ${minutes}, is_free = ${e.free}, node_id = ${e.nodeId || null},
      solutions_visibility = ${e.solutions}, window_end = ${windowEnd}, ranking = ${e.ranking}, status = ${status}, live_from = ${liveFrom} where id = ${id}`;
    // A whole-test timer change keeps section timers in proportion when the test has them.
    if (t.duration_min !== minutes) await tx`update test_sections set duration_min = greatest(1, round(duration_min * ${minutes}::numeric / ${t.duration_min})) where test_id = ${id} and duration_min is not null`;
    await tx`delete from course_tests where test_id = ${id} and not (course_id = any(${courses}::uuid[]))`;
    for (const c of courses) await tx`insert into course_tests (course_id, test_id) values (${c}, ${id}) on conflict do nothing`;
  });
  done();
  return { ok: true, message: `${name} saved` };
}

/** Adds tests to a course, moves them from one course to another, or takes them out of a course. */
export async function setTestCourses(ids: string[], op: 'add' | 'move' | 'remove', courseId: string, fromCourseId = '') {
  await staffOrThrow('tests');
  const tests = uuids(ids);
  if (!tests.length) return { ok: false, message: 'Tick at least one test' };
  const [c] = await sql`select name from courses where id = ${courseId}`;
  if (!c) return { ok: false, message: 'Pick a course' };
  await sql.begin(async tx => {
    if (op === 'remove') { await tx`delete from course_tests where course_id = ${courseId} and test_id = any(${tests}::uuid[])`; return; }
    for (const t of tests) await tx`insert into course_tests (course_id, test_id) values (${courseId}, ${t}) on conflict do nothing`;
    if (op === 'move' && fromCourseId && fromCourseId !== courseId) await tx`delete from course_tests where course_id = ${fromCourseId} and test_id = any(${tests}::uuid[])`;
  });
  done();
  const n = `${tests.length} test${tests.length === 1 ? '' : 's'}`;
  return { ok: true, message: op === 'remove' ? `${n} taken out of ${c.name}` : op === 'move' ? `${n} moved to ${c.name}` : `${n} added to ${c.name}` };
}

/** Makes independent copies of tests (same questions and timing, own attempts and ranks), optionally only in one course. */
export async function duplicateTests(ids: string[], courseId: string) {
  await staffOrThrow('tests');
  const tests = uuids(ids);
  if (!tests.length) return { ok: false, message: 'Tick at least one test' };
  const made: string[] = [];
  await sql.begin(async tx => {
    for (const id of tests) {
      const [src] = await tx`select * from tests where id = ${id}`;
      if (!src) continue;
      let slug = src.slug.replace(/-copy(-\d+)?$/, '') + '-copy';
      for (let n = 2; (await tx`select 1 from tests where slug = ${slug}`).length; n++) slug = src.slug.replace(/-copy(-\d+)?$/, '') + '-copy-' + n;
      const [t] = await tx`
        insert into tests (slug, name, type, exam_id, node_id, duration_min, is_free, solutions_visibility, ranking, status, live_from, window_end, blueprint, sort)
        values (${slug}, ${src.name}, ${src.type}, ${src.exam_id}, ${courseId ? null : src.node_id}, ${src.duration_min}, ${src.is_free}, ${src.solutions_visibility}, ${src.ranking},
                ${src.status}, ${src.live_from}, ${src.window_end}, ${src.blueprint}, ${src.sort}) returning id`;
      const secs = await tx`select * from test_sections where test_id = ${id} order by sort`;
      for (const s of secs) {
        const [ns] = await tx`insert into test_sections (test_id, section_id, name, sort, duration_min) values (${t.id}, ${s.section_id}, ${s.name}, ${s.sort}, ${s.duration_min}) returning id`;
        await tx`insert into test_questions (test_id, test_section_id, question_id, sort) select ${t.id}, ${ns.id}, question_id, sort from test_questions where test_section_id = ${s.id}`;
      }
      if (courseId) await tx`insert into course_tests (course_id, test_id) values (${courseId}, ${t.id})`;
      else await tx`insert into course_tests (course_id, test_id) select course_id, ${t.id} from course_tests where test_id = ${id}`;
      made.push(slug);
    }
  });
  done();
  return { ok: true, message: `Copied ${made.length} test${made.length === 1 ? '' : 's'}: ${made.slice(0, 3).join(', ')}${made.length > 3 ? '…' : ''}` };
}

/** Deletes tests for good, with their attempts. Credits students spent on them are given back. */
export async function deleteTests(ids: string[]) {
  await staffOrThrow('tests');
  const tests = uuids(ids);
  if (!tests.length) return { ok: false, message: 'Tick at least one test' };
  const rows = await sql.begin(async tx => {
    await tx`update test_credits set used_test_id = null, used_at = null where used_test_id = any(${tests}::uuid[])`;
    return tx`delete from tests where id = any(${tests}::uuid[]) and owner_id is null returning name`;
  });
  done();
  return { ok: true, message: rows.length === 1 ? `${rows[0].name} deleted` : `${rows.length} tests deleted` };
}
