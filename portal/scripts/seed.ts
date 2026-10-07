// Usage:
//   npm run db:seed            base data (safe for production): exams, interface rules, tests tree, plans, rewards
//   npm run db:seed -- --demo  also sample questions, tests, classes, library, community and leaderboard users
import postgres from 'postgres';
import { loadEnv } from './env';
import {
  EXAMS, TOPICS, CAT_CURVE, GENERIC_CURVE, TREE, COURSES, REWARDS, CAT_QA_GROUPS, OMET_TOPICS,
  DEMO_QUESTIONS, DEMO_SETS, DEMO_STUDENTS, DEMO_LIBRARY, DEMO_POSTS,
} from './seed-data';
import { slugify } from '../src/lib/slug';

loadEnv();
const sql = postgres(process.env.DATABASE_URL!, { onnotice: () => {} });
const demo = process.argv.includes('--demo');

type Id = string;
const examIds: Record<string, Id> = {};
const secIds: Record<string, Id[]> = {};          // exam code → section ids in order
const secCodes: Record<string, string[]> = {};

// ---------------------------------------------------------------- base
for (const [i, e] of EXAMS.entries()) {
  const [row] = await sql`
    insert into exams (code, name, exam_group, status, exam_date, sort)
    values (${e.code}, ${e.name}, ${e.group}, ${e.status}, ${e.date ?? null}, ${i})
    on conflict (code) do update set name = excluded.name, exam_group = excluded.exam_group
    returning id`;
  examIds[e.code] = row.id;
  secIds[e.code] = [];
  secCodes[e.code] = [];
  for (const [j, [code, name, q, mins]] of e.secs.entries()) {
    const [s] = await sql`
      insert into sections (exam_id, code, name, questions, minutes, sort)
      values (${row.id}, ${code}, ${name}, ${q}, ${mins}, ${j})
      on conflict (exam_id, code) do update set name = excluded.name, questions = excluded.questions, minutes = excluded.minutes, sort = excluded.sort
      returning id`;
    secIds[e.code].push(s.id);
    secCodes[e.code].push(code);
    for (const [k, t] of (TOPICS[e.code]?.[code] ?? []).entries()) {
      await sql`insert into topics (section_id, name, sort) values (${s.id}, ${t}, ${k}) on conflict do nothing`;
    }
  }
  const total = e.total ?? e.secs.reduce((a, s) => a + (s[3] ?? 0), 0);
  await sql`
    insert into interface_templates (exam_id, rules, marking, total_minutes, note, curve)
    values (${row.id}, ${sql.json(e.rules as never)}, ${sql.json({ ...e.marking, correct: e.defaultMarks[0], wrong: e.defaultMarks[1] } as never)}, ${total}, ${e.note}, ${sql.json((e.code === 'CAT' ? CAT_CURVE : GENERIC_CURVE) as never)})
    on conflict (exam_id) do nothing`;
}
// OMET topics live on their own exams' sections.
for (const [code, groups] of Object.entries(OMET_TOPICS)) {
  for (const [si, topics] of groups) {
    for (const [k, t] of topics.entries()) await sql`insert into topics (section_id, name, sort) values (${secIds[code][si]}, ${t}, ${k}) on conflict do nothing`;
  }
}

// Tests tree.
let sort = 0;
const node = async (id: string, parent: string | null, group: string, name: string, sub: string, exam?: string, free = false) => {
  await sql`
    insert into catalog_nodes (id, parent_id, exam_group, exam_id, name, sub, sort, is_free)
    values (${id}, ${parent}, ${group}, ${exam ? examIds[exam] : null}, ${name}, ${sub}, ${sort++}, ${free})
    on conflict (id) do update set name = excluded.name, sub = excluded.sub, parent_id = excluded.parent_id, sort = excluded.sort`;
};
const groupOf = (id: string): string => {
  let cur: string | null = id;
  while (cur) { const r = TREE.find(t => t[0] === cur)!; if (!r[1]) return r[0]; cur = r[1]; }
  return 'mba';
};
for (const [id, parent, name, sub, exam, free] of TREE) await node(id, parent, groupOf(id), name, sub, exam, !!free);
// CAT topic leaves.
for (const [gid, name, sub, topics] of CAT_QA_GROUPS) {
  await node(gid, 'tp-qa', 'mba', name, sub, 'CAT');
  for (const t of topics) await node('cat-tp-' + slugify(t), gid, 'mba', t, '3 tests · 10 Q · 15 min', 'CAT');
}
for (const t of TOPICS.CAT.DILR) await node('cat-tp-' + slugify(t), 'tp-dilr', 'mba', t, '3 tests · 10 Q · 15 min', 'CAT');
for (const t of TOPICS.CAT.VARC.slice(0, 5)) await node('cat-tp-' + slugify(t), 'tp-varc', 'mba', t, '3 tests · 10 Q · 15 min', 'CAT');
// CET sectional and topic leaves.
for (const [k, code] of secCodes['MBA-CET'].entries()) {
  const name = EXAMS.find(e => e.code === 'MBA-CET')!.secs[k][1];
  await node('cet-sec-' + code.toLowerCase(), 'cet-sec', 'mba', name, '5 tests · 30 min', 'MBA-CET');
  await node('cet-tp-' + code.toLowerCase(), 'cet-topic', 'mba', name, 'Topic tests', 'MBA-CET');
  for (const t of TOPICS['MBA-CET'][code]) await node('cet-tp-' + slugify(t) + '-' + code.toLowerCase(), 'cet-tp-' + code.toLowerCase(), 'mba', t, '3 tests · 10 Q · 15 min', 'MBA-CET');
}
// OMET leaves.
for (const code of ['XAT', 'SNAP', 'NMAT', 'CMAT']) {
  const x = code.toLowerCase();
  const e = EXAMS.find(ex => ex.code === code)!;
  await node(x + '-mocks', x, 'mba', code + ' Mocks', 'Full length', code);
  await node(x + '-sec', x, 'mba', 'Sectional Tests', e.secs.map(s => s[1]).join(', '), code);
  for (const [k, s] of e.secs.entries()) await node(x + '-sec-' + k, x + '-sec', 'mba', s[1], '4 tests · 20 min', code);
  await node(x + '-topic', x, 'mba', 'Topic Tests', 'One topic at a time', code);
  for (const [, topics] of OMET_TOPICS[code]) for (const t of topics) await node(x + '-tp-' + slugify(t), x + '-topic', 'mba', t, '3 tests · 10 Q · 15 min', code);
}

// Plans.
for (const [i, c] of COURSES.entries()) {
  await sql`
    insert into courses (slug, name, exam_id, description, features, badge, price_paise, mrp_paise, guru_quota, includes, status, sort)
    values (${c.slug}, ${c.name}, ${examIds[c.exam]}, ${c.desc}, ${c.features}, ${c.badge ?? null}, ${c.price * 100}, ${c.mrp * 100}, ${c.guru}, ${c.includes}, ${c.status}, ${i})
    on conflict (slug) do nothing`;
}
for (const [i, [id, name, cost, grants]] of REWARDS.entries()) {
  await sql`insert into reward_items (id, name, cost_xp, grants, sort) values (${id}, ${name}, ${cost}, ${sql.json(grants as never)}, ${i}) on conflict (id) do nothing`;
}
console.log('base data ready');

// ---------------------------------------------------------------- demo
if (demo) {
  const [{ n }] = await sql`select count(*)::int as n from tests`;
  if (n > 0) {
    console.log('demo data already present, skipping');
  } else {
    await seedDemo();
    console.log('demo data ready');
  }
}
await sql.end();

async function seedDemo() {
  const topicId = async (sectionId: Id, name: string) => {
    const [t] = await sql`insert into topics (section_id, name) values (${sectionId}, ${name}) on conflict (section_id, name) do update set name = excluded.name returning id`;
    return t.id as Id;
  };
  const setIds: Record<string, Id> = {};
  for (const q of DEMO_QUESTIONS) {
    const e = EXAMS.find(x => x.code === q.exam)!;
    const si = secCodes[q.exam].indexOf(q.sec);
    const sectionId = secIds[q.exam][si];
    if (q.set && !setIds[q.set]) {
      const [s] = await sql`insert into question_sets (external_id, exam_id, section_id, text) values (${q.set}, ${examIds[q.exam]}, ${sectionId}, ${DEMO_SETS[q.set]}) returning id`;
      setIds[q.set] = s.id;
    }
    const wrong = q.type === 'TITA' ? 0 : e.defaultMarks[1];
    const [row] = await sql`
      insert into questions (exam_id, section_id, topic_id, subtopic, type, difficulty, ideal_time_sec, marks_correct, marks_wrong, set_id, text, options, correct, solution_text, source)
      values (${examIds[q.exam]}, ${sectionId}, ${await topicId(sectionId, q.topic)}, ${q.sub ?? null}, ${q.type}, ${q.diff}, ${q.ideal}, ${e.defaultMarks[0]}, ${wrong},
              ${q.set ? setIds[q.set] : null}, ${q.text}, ${sql.json(q.o.map((t, i) => ({ key: 'ABCD'[i], text: t })) as never)}, ${q.a}, ${q.sol}, 'Original')
      returning id`;
    if (q.stats) {
      const [att, avg, top, acc] = q.stats;
      await sql`insert into question_stats (question_id, attempts, correct_count, total_time_sec, avg_time_sec, topper_time_sec, peer_accuracy_pct)
                values (${row.id}, ${att}, ${Math.round((att * acc) / 100)}, ${att * avg}, ${avg}, ${top}, ${acc})`;
    }
  }

  // Questions per exam/section for building sample tests. OMETs borrow CAT questions by section type.
  const bank = await sql`select q.id, e.code as exam, s.code as sec, t.name as topic from questions q join exams e on e.id = q.exam_id join sections s on s.id = q.section_id left join topics t on t.id = q.topic_id`;
  const omSec = (name: string) => (/English|Language|Verbal|VA/i.test(name) ? 'VARC' : /Quant|QA|Numer|QT/i.test(name) ? 'QA' : 'DILR');
  const pick = (exam: string, sec: string, topic?: string) => {
    const examQ = bank.filter(b => b.exam === exam);
    const src = examQ.length ? examQ : bank.filter(b => b.exam === 'CAT');
    const code = examQ.length ? sec : omSec(EXAMS.find(e => e.code === exam)!.secs.find(s => s[0] === sec)?.[1] ?? sec);
    let qs = src.filter(b => b.sec === code && (!topic || b.topic === topic));
    if (!qs.length) qs = src.filter(b => b.sec === code);
    return qs.map(b => b.id as Id);
  };

  const courseId = async (slug: string) => (await sql`select id from courses where slug = ${slug}`)[0].id as Id;
  let tsort = 0;
  const mkTest = async (o: { slug: string; name: string; type: string; exam: string; node: string; free: boolean; secs: number[]; secMin?: number | null; mins: number; courses: string[]; topic?: string }) => {
    const [t] = await sql`
      insert into tests (slug, name, type, exam_id, node_id, duration_min, is_free, status, sort)
      values (${o.slug}, ${o.name}, ${o.type}, ${examIds[o.exam]}, ${o.node}, ${o.mins}, ${o.free}, 'live', ${tsort++})
      returning id`;
    let qsort = 0;
    for (const [k, si] of o.secs.entries()) {
      const e = EXAMS.find(x => x.code === o.exam)!;
      const [ts] = await sql`insert into test_sections (test_id, section_id, name, sort, duration_min)
                             values (${t.id}, ${secIds[o.exam][si]}, ${e.secs[si][1]}, ${k}, ${o.secMin === undefined ? e.secs[si][3] : o.secMin}) returning id`;
      for (const qid of pick(o.exam, e.secs[si][0], o.topic)) {
        await sql`insert into test_questions (test_id, test_section_id, question_id, sort) values (${t.id}, ${ts.id}, ${qid}, ${qsort++}) on conflict do nothing`;
      }
    }
    for (const c of o.courses) await sql`insert into course_tests (course_id, test_id) values (${await courseId(c)}, ${t.id})`;
  };

  // CAT
  const all3 = [0, 1, 2];
  for (let i = 1; i <= 10; i++) await mkTest({ slug: 'cat-m-' + i, name: 'CAT Mock ' + i, type: 'full_mock', exam: 'CAT', node: 'cat-mocks', free: i === 1, secs: all3, mins: 120, courses: ['cat-10', 'cat-ts'] });
  for (let i = 1; i <= 20; i++) await mkTest({ slug: 'cat-sm-' + i, name: 'Test Series Mock ' + i, type: 'full_mock', exam: 'CAT', node: 'ts-mocks', free: false, secs: all3, mins: 120, courses: ['cat-ts'] });
  // Website order for sectionals is QA, DILR, VARC → section indexes 2, 1, 0.
  for (const [k, [si, nodeId, label]] of ([[2, 'sec-qa', 'Quant'], [1, 'sec-dilr', 'DILR'], [0, 'sec-varc', 'VARC']] as const).entries()) {
    for (let i = 1; i <= 10; i++) await mkTest({ slug: `cat-ss-${k}-${i}`, name: `${label} Sectional ${i}`, type: 'sectional', exam: 'CAT', node: nodeId, free: i === 1, secs: [si], mins: 40, courses: ['cat-ts'] });
  }
  const catTopicSec = (t: string) => (TOPICS.CAT.QA.includes(t) ? 2 : TOPICS.CAT.DILR.includes(t) ? 1 : 0);
  const catTopics = [...CAT_QA_GROUPS.flatMap(g => g[3]), ...TOPICS.CAT.DILR, ...TOPICS.CAT.VARC.slice(0, 5)];
  for (const t of catTopics) for (let n = 1; n <= 3; n++) {
    await mkTest({ slug: `cat-tp-${slugify(t)}-${n}`, name: `${t} · Test ${n}`, type: 'topic', exam: 'CAT', node: 'cat-tp-' + slugify(t), free: n === 1, secs: [catTopicSec(t)], secMin: null, mins: 15, courses: ['cat-ts'], topic: t });
  }
  await mkTest({ slug: 'cat-pyq-0', name: 'CAT 2024 Slot 1 · previous paper', type: 'pyq', exam: 'CAT', node: 'cat-pyq', free: true, secs: all3, mins: 120, courses: [] });
  await mkTest({ slug: 'cat-pyq-1', name: 'CAT 2023 Slot 2 · previous paper', type: 'pyq', exam: 'CAT', node: 'cat-pyq', free: true, secs: all3, mins: 120, courses: [] });

  // MBA-CET
  const cet4 = [0, 1, 2, 3];
  for (let i = 1; i <= 10; i++) await mkTest({ slug: 'cet-m-' + i, name: 'MBA-CET Mock ' + i, type: 'full_mock', exam: 'MBA-CET', node: 'cet-mocks', free: i === 1, secs: cet4, mins: 150, courses: ['cet-mock', 'cet-ts', 'cet-crash'] });
  for (let i = 1; i <= 15; i++) await mkTest({ slug: 'cet-sm-' + i, name: 'Test Series Mock ' + i, type: 'full_mock', exam: 'MBA-CET', node: 'cet-sm', free: false, secs: cet4, mins: 150, courses: ['cet-ts', 'cet-crash'] });
  for (const [k, code] of secCodes['MBA-CET'].entries()) {
    const name = EXAMS.find(e => e.code === 'MBA-CET')!.secs[k][1];
    for (let i = 1; i <= 5; i++) await mkTest({ slug: `cet-ss-${k}-${i}`, name: `${name} Sectional ${i}`, type: 'sectional', exam: 'MBA-CET', node: 'cet-sec-' + code.toLowerCase(), free: i === 1, secs: [k], mins: 30, courses: ['cet-ts', 'cet-crash'] });
    for (const t of TOPICS['MBA-CET'][code]) for (let n = 1; n <= 3; n++) {
      await mkTest({ slug: `cet-tp-${slugify(t)}-${n}`, name: `${t} · Test ${n}`, type: 'topic', exam: 'MBA-CET', node: `cet-tp-${slugify(t)}-${code.toLowerCase()}`, free: n === 1, secs: [k], secMin: null, mins: 15, courses: ['cet-ts', 'cet-crash'], topic: t });
    }
  }
  await mkTest({ slug: 'cet-pyq-0', name: 'MAH-CET 2025 · memory-based paper', type: 'pyq', exam: 'MBA-CET', node: 'cet-mocks', free: true, secs: cet4, mins: 150, courses: [] });

  // OMETs
  for (const code of ['XAT', 'SNAP', 'NMAT', 'CMAT']) {
    const x = code.toLowerCase();
    const e = EXAMS.find(ex => ex.code === code)!;
    const idx = e.secs.map((_, i) => i);
    const mins = e.total ?? e.secs.reduce((a, s) => a + (s[3] ?? 0), 0);
    for (let i = 1; i <= 8; i++) await mkTest({ slug: `om-${x}-m-${i}`, name: `${code} Mock ${i}`, type: 'full_mock', exam: code, node: x + '-mocks', free: i === 1, secs: idx, mins, courses: ['om-pack'] });
    for (const k of idx) for (let i = 1; i <= 4; i++) await mkTest({ slug: `om-${x}-ss-${k}-${i}`, name: `${e.secs[k][1]} Sectional ${i}`, type: 'sectional', exam: code, node: `${x}-sec-${k}`, free: i === 1, secs: [k], secMin: 20, mins: 20, courses: ['om-pack'] });
    for (const [si, topics] of OMET_TOPICS[code]) for (const t of topics) for (let n = 1; n <= 3; n++) {
      await mkTest({ slug: `om-${x}-tp-${slugify(t)}-${n}`, name: `${t} · Test ${n}`, type: 'topic', exam: code, node: `${x}-tp-${slugify(t)}`, free: n === 1, secs: [si], secMin: null, mins: 15, courses: ['om-pack'] });
    }
  }

  // People: an admin, a faculty member and leaderboard students.
  const user = async (name: string, phone: string, role = 'student', city = 'Mumbai') => {
    const [u] = await sql`insert into users (phone, de_id, name, city, role, onboarded, target_exam)
                          values (${phone}, ${'DE-2026-' + phone.slice(-5)}, ${name}, ${city}, ${role}, true, 'CAT')
                          on conflict (phone) do update set name = excluded.name returning id`;
    return u.id as Id;
  };
  await user('Admin', '+919999900000', 'admin');
  const faculty = await user('Arjun Mehta', '+919999900001', 'faculty');
  const studentIds: Id[] = [];
  for (const [name, phone, xp, city] of DEMO_STUDENTS) {
    const id = await user(name, phone, 'student', city);
    studentIds.push(id);
    // Spread XP over the last 40 days so week / month / all-time boards differ.
    for (let d = 0; d < 8; d++) await sql`insert into xp_events (user_id, kind, xp, created_at) values (${id}, 'test_complete', ${Math.round(xp / 8)}, now() - ${d * 5 + ' days'}::interval)`;
  }

  // Classes: one live now, upcoming ones, one recorded.
  const cls = async (title: string, topic: string, startOffsetMin: number, dur: number, rec?: string) => {
    const [c] = await sql`insert into live_classes (title, topic, exam_group, faculty_id, faculty_name, starts_at, duration_min, stream_url, recording_url)
                          values (${title}, ${topic}, 'mba', ${faculty}, 'Arjun Mehta', now() + ${startOffsetMin + ' minutes'}::interval, ${dur}, 'https://www.youtube.com/embed/live_stream?channel=REPLACE', ${rec ?? null}) returning id`;
    return c.id as Id;
  };
  const liveNow = await cls('TSD shortcuts for CAT', 'Quant', -18, 75);
  await cls('Mock 5 live analysis', 'All sections', 120, 90);
  await cls('RC: tone and inference questions', 'VARC', 60 * 24, 60);
  await cls('Games & tournaments', 'DILR', 60 * 48, 90);
  await cls('Geometry in 60 minutes', 'Quant', 60 * 96, 60);
  const msgs: [number | null, string][] = [[null, 'Relative speed: same direction subtract, opposite add.'], [0, 'So 54 and 36 opposite gives 90 km/h?'], [null, 'Exactly. Convert: 90 × 5/18 = 25 m/s.']];
  for (const [who, text] of msgs) await sql`insert into live_messages (class_id, user_id, text) values (${liveNow}, ${who === null ? faculty : studentIds[who]}, ${text})`;

  for (const [i, [kind, title, meta, mb]] of DEMO_LIBRARY.entries()) {
    await sql`insert into library_items (kind, title, meta, size_mb, url, sort) values (${kind}, ${title}, ${meta}, ${mb}, ${kind === 'pdf' ? '/sample.pdf' : null}, ${i})`;
  }
  for (const [ch, by, title, body, votes] of DEMO_POSTS) {
    const [p] = await sql`insert into community_posts (user_id, channel, title, body, created_at) values (${studentIds[by]}, ${ch}, ${title}, ${body}, now() - ${by * 2 + ' hours'}::interval) returning id`;
    for (let v = 0; v < Math.min(votes, studentIds.length); v++) await sql`insert into post_votes (post_id, user_id) values (${p.id}, ${studentIds[v]}) on conflict do nothing`;
    await sql`insert into community_answers (post_id, user_id, body) values (${p.id}, ${studentIds[(by + 1) % studentIds.length]}, 'Try the shortcut a + b + ab/100 for two successive changes. It works for any pair.')`;
  }
  await sql`insert into coupons (code, kind, value) values ('DE500', 'flat', 50000) on conflict (code) do nothing`;
  const [b] = await sql`insert into batches (name, exam_id, course_id, faculty_id, days, start_time, start_date, capacity)
                        values ('CAT 2026 Weekend A', ${examIds.CAT}, ${await courseId('cat-ts')}, ${faculty}, '{Sat,Sun}', '10:00', current_date - 120, 120) returning id`;
  for (const id of studentIds.slice(0, 5)) await sql`insert into batch_members (batch_id, user_id) values (${b.id}, ${id})`;
}
