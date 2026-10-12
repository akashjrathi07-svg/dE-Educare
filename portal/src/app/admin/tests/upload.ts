'use server';
import { revalidatePath } from 'next/cache';
import { staffOrThrow } from '@/lib/server/auth';
import { sql } from '@/lib/server/db';
import { examRefs, type AdminExam } from '@/lib/server/admin';
import { upsertQuestion } from '@/lib/server/questions';
import { validateRows, type ImportRow } from '@/lib/question-import';
import { slugify } from '@/lib/slug';

const MAX_ROWS = 3000;
const TYPES = ['full_mock', 'sectional', 'topic', 'daily', 'pyq'] as const;

export type UploadSettings = {
  exam: string; type: (typeof TYPES)[number];
  /** Name when the file has no "test" column / "Test:" lines; for several tests it is the series name. */
  name: string;
  /** Website link start, e.g. cat-m → cat-m-1, cat-m-2 … (blank = made from the names). */
  slugPrefix: string; startAt: number;
  /** Section for rows that leave it blank (sectionals). */
  section: string;
  /** 0 = from the exam pattern. */
  minutes: number;
  free: boolean; courses: string[];
  /** Also make a new plan with all uploaded tests, e.g. "CAT 10 Mocks" for ₹1,200. */
  newCourse: { name: string; price: number; live: boolean } | null;
  publish: 'now' | 'draft'; nodeId: string;
};
export type UploadInput = { table: string[][]; settings: UploadSettings };

type Planned = { name: string; slug: string; minutes: number; sections: { code: string; name: string; id: string; minutes: number | null; rows: ImportRow[] }[] };

function clean(input: UploadInput): UploadInput {
  const str = (v: unknown) => (v == null ? '' : String(v)).slice(0, 20000);
  const table = (Array.isArray(input?.table) ? input.table : []).slice(0, MAX_ROWS + 2).map(r => (Array.isArray(r) ? r.slice(0, 60).map(str) : []));
  const s = input?.settings ?? ({} as UploadSettings);
  return {
    table,
    settings: {
      exam: str(s.exam), type: TYPES.includes(s.type) ? s.type : 'full_mock', name: str(s.name).trim().slice(0, 100), slugPrefix: str(s.slugPrefix).trim().toLowerCase().replace(/-+$/, ''),
      startAt: Math.max(0, Math.round(Number(s.startAt) || 1)), section: str(s.section), minutes: Math.max(0, Math.min(600, Math.round(Number(s.minutes) || 0))),
      free: s.free === true, courses: Array.isArray(s.courses) ? s.courses.map(str).slice(0, 20) : [],
      newCourse: s.newCourse && str(s.newCourse.name).trim() ? { name: str(s.newCourse.name).trim().slice(0, 80), price: Math.max(0, Number(s.newCourse.price) || 0), live: s.newCourse.live === true } : null,
      publish: s.publish === 'draft' ? 'draft' : 'now', nodeId: str(s.nodeId),
    },
  };
}

/** Validates the file and works out the tests it makes. Nothing is saved. */
async function plan(input: UploadInput) {
  const { table, settings: st } = clean(input);
  const exams = await examRefs();
  const exam = exams.find(e => e.code === st.exam);
  if (!exam) return { exams, exam: null, st, tests: [] as Planned[], errors: [{ row: 1, message: 'Pick the exam' }], total: 0 };
  if (table.length - 1 > MAX_ROWS) return { exams, exam, st, tests: [], errors: [{ row: 1, message: `Up to ${MAX_ROWS} questions per upload. Split the file.` }], total: 0 };
  // Topic is optional for whole tests: questions without one go under "General".
  const { ready, errors, total } = validateRows(table, exams, { defaults: { exam: exam.code, section: st.section, topic: 'General' }, newTopics: true });
  for (const q of ready) if (q.exam !== exam.code) errors.push({ row: q.row, message: `exam is ${q.exam}, but this upload is for ${exam.code}` });

  // Group into tests by the "test" column / "Test:" lines, in file order.
  const names: string[] = [];
  const byTest = new Map<string, ImportRow[]>();
  for (const q of ready) {
    const n = q.testName?.trim() || st.name || 'Uploaded test';
    if (!byTest.has(n)) { byTest.set(n, []); names.push(n); }
    byTest.get(n)!.push(q);
  }
  const secTimer = exam.rules.secTimer === true && ['full_mock', 'pyq', 'sectional'].includes(st.type);
  const tests: Planned[] = names.map((name, i) => {
    const rows = byTest.get(name)!;
    const sections = exam.sections.filter(s => rows.some(q => q.sectionCode === s.code)).map(s => ({
      code: s.code, name: s.name, id: s.id, minutes: secTimer ? s.minutes : null, rows: rows.filter(q => q.sectionCode === s.code),
    }));
    const patternMin = st.type === 'full_mock' || st.type === 'pyq'
      ? exam.totalMinutes ?? exam.sections.reduce((a, s) => a + (s.minutes ?? 0), 0)
      : sections.reduce((a, s) => a + (exam.sections.find(x => x.code === s.code)?.minutes ?? 0), 0);
    const minutes = st.minutes || patternMin || Math.max(5, Math.ceil(rows.reduce((a, q) => a + q.ideal, 0) / 60));
    const display = names.length > 1 && !rows[0].testName ? `${name} ${st.startAt + i}` : name;
    const slug = st.slugPrefix ? (names.length > 1 ? `${st.slugPrefix}-${st.startAt + i}` : st.slugPrefix) : '';
    return { name: display.slice(0, 120), slug, minutes, sections };
  });
  return { exams, exam, st, tests, errors: errors.sort((a, b) => a.row - b.row), total };
}

/** Step 1: check the file and show the tests it will make. */
export async function checkUpload(input: UploadInput) {
  await staffOrThrow('tests');
  const p = await plan(input);
  const expected = p.exam ? Object.fromEntries(p.exam.sections.map(s => [s.code, s.questions ?? 0])) : {};
  return {
    total: p.total, errors: p.errors.slice(0, 50), moreErrors: Math.max(0, p.errors.length - 50),
    tests: p.tests.map(t => ({
      name: t.name, slug: t.slug, minutes: t.minutes, questions: t.sections.reduce((a, s) => a + s.rows.length, 0),
      sections: t.sections.map(s => ({ name: s.name, count: s.rows.length, pattern: p.st.type === 'full_mock' || p.st.type === 'pyq' ? expected[s.code] ?? 0 : 0 })),
    })),
  };
}

/** Step 2: adds the questions to the bank, creates the tests and links them to plans, all in one go. */
export async function uploadTests(input: UploadInput) {
  await staffOrThrow('tests');
  const p = await plan(input);
  if (!p.exam) return { ok: false, message: p.errors[0]?.message ?? 'Pick the exam' };
  if (p.errors.length) return { ok: false, message: `Fix ${p.errors.length} problem${p.errors.length > 1 ? 's' : ''} in the file first (see the list).` };
  if (!p.tests.length) return { ok: false, message: 'No questions found in the file' };
  const exam = p.exam as AdminExam, st = p.st;

  // Website links: given prefix or made from the exam and test name; all must be new.
  const slugs: string[] = [];
  for (const t of p.tests) {
    if (t.slug) {
      if (!/^[a-z0-9][a-z0-9-]{1,58}[a-z0-9]$/.test(t.slug)) return { ok: false, message: 'Test ID can use small letters, numbers and dashes, e.g. cat-m' };
      if ((await sql`select 1 from tests where slug = ${t.slug}`).length) return { ok: false, message: `Test ID ${t.slug} is already used by another test` };
      slugs.push(t.slug);
    } else {
      const base = slugify(exam.code + '-' + t.name);
      let slug = base;
      for (let n = 2; slugs.includes(slug) || (await sql`select 1 from tests where slug = ${slug}`).length; n++) slug = base + '-' + n;
      slugs.push(slug);
    }
  }
  const courseIds = (await sql`select id from courses where id = any(${st.courses}::uuid[])`).map(r => r.id as string);
  const status = st.publish === 'draft' ? 'draft' : 'live';
  let newCourse = '';
  let questions = 0;

  await sql.begin(async tx => {
    if (st.newCourse) {
      let slug = slugify(st.newCourse.name), n = 1;
      while ((await tx`select 1 from courses where slug = ${slug}`).length) slug = slugify(st.newCourse.name) + '-' + ++n;
      const includes = { full_mock: ['Full mocks'], sectional: ['Sectionals'], topic: ['Topic tests'], daily: ['Daily tests'], pyq: ['Previous papers'] }[st.type];
      const price = Math.round(st.newCourse.price * 100);
      const [c] = await tx`insert into courses (slug, name, exam_id, price_paise, mrp_paise, includes, status, category, features, sort)
        values (${slug}, ${st.newCourse.name}, ${exam.id}, ${price}, ${price}, ${includes}, ${st.newCourse.live ? 'live' : 'draft'}, 'test_series',
                ${[`${p.tests.length} ${p.tests.length === 1 ? 'test' : 'tests'} in the real ${exam.name} interface`, 'AI analysis after every attempt']},
                (select coalesce(max(sort), 0) + 1 from courses)) returning id`;
      courseIds.push(c.id);
      newCourse = `${st.newCourse.name} (${slug})`;
    }
    for (const [k, t] of p.tests.entries()) {
      const [test] = await tx`
        insert into tests (slug, name, type, exam_id, node_id, duration_min, is_free, solutions_visibility, ranking, status, blueprint, sort)
        values (${slugs[k]}, ${t.name}, ${st.type}, ${exam.id}, ${st.nodeId || null}, ${t.minutes}, ${st.free}, 'after_submit', 'all_india', ${status},
                ${tx.json({ mode: 'upload' } as never)}, (select coalesce(max(sort), 0) + 1 from tests where node_id is not distinct from ${st.nodeId || null}))
        returning id`;
      let qsort = 0;
      for (const [i, s] of t.sections.entries()) {
        const [ts] = await tx`insert into test_sections (test_id, section_id, name, sort, duration_min) values (${test.id}, ${s.id}, ${s.name}, ${i}, ${s.minutes}) returning id`;
        for (const q of s.rows) {
          const r = await upsertQuestion(tx, q, p.exams, 'live');
          await tx`insert into test_questions (test_id, test_section_id, question_id, sort) values (${test.id}, ${ts.id}, ${r.uuid}, ${qsort++})`;
          questions++;
        }
      }
      for (const c of courseIds) await tx`insert into course_tests (course_id, test_id) values (${c}, ${test.id}) on conflict do nothing`;
    }
  });
  revalidatePath('/admin/tests');
  revalidatePath('/admin/bank');
  revalidatePath('/admin/courses');
  revalidatePath('/tests');
  const what = p.tests.length > 1 ? `${p.tests.length} tests (${p.tests[0].name} … ${p.tests[p.tests.length - 1].name})` : p.tests[0].name;
  return { ok: true, message: `${what} · ${questions} questions added · ${status === 'draft' ? 'saved as draft' : 'live on web and app'}${newCourse ? ` · new plan ${newCourse}` : ''}` };
}
