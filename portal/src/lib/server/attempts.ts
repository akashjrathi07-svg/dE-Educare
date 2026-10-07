import 'server-only';
import { sql } from './db';
import {
  syncTimer, isSectional, canVisitSection, marksFor, scoreAttempt, percentileFromCurve, percentileFromScores,
  REAL_PERCENTILE_MIN_ATTEMPTS, PEER_STATS_MIN_ATTEMPTS, xpForTest, normaliseAnswer, type Rules, type Marking, type QuestionKey,
} from '../exam-logic';
import { canTakeTest } from './access';
import { awardXp, bumpStreak } from './xp';

const GRACE_MS = 15_000;          // network slack after the clock hits zero
const MAX_DELTA_SEC = 600;        // ignore implausible time jumps from a client

export type TestBundle = Awaited<ReturnType<typeof loadTest>>;

export async function loadTest(testId: string) {
  const [test] = await sql`
    select t.*, e.code as exam_code, e.name as exam_name, e.exam_group, it.rules, it.marking, it.curve
    from tests t join exams e on e.id = t.exam_id left join interface_templates it on it.exam_id = t.exam_id
    where t.id = ${testId}`;
  if (!test) return null;
  const sections = await sql`select ts.id, ts.section_id, ts.name, ts.sort, ts.duration_min, s.code from test_sections ts join sections s on s.id = ts.section_id where ts.test_id = ${testId} order by ts.sort`;
  const questions = await sql`
    select tq.test_section_id, tq.sort, q.id, q.external_id, q.type, q.difficulty, q.ideal_time_sec, q.marks_correct::float as marks_correct,
           q.marks_wrong::float as marks_wrong, q.text, q.image_url, q.options, q.correct, q.solution_text, q.solution_video_url, q.text_hi, q.options_hi,
           q.section_id, qs.text as set_text, qs.id as set_id, t.name as topic
    from test_questions tq join questions q on q.id = tq.question_id
    left join question_sets qs on qs.id = q.set_id left join topics t on t.id = q.topic_id
    where tq.test_id = ${testId} order by tq.sort`;
  return {
    test: test as Record<string, any>,
    rules: (test.rules ?? {}) as Rules,
    marking: (test.marking ?? {}) as Marking,
    curve: (test.curve ?? []) as [number, number][],
    sections: sections as unknown as { id: string; section_id: string; name: string; sort: number; duration_min: number | null; code: string }[],
    questions: questions as unknown as Record<string, any>[],
  };
}

export async function testBySlug(slug: string) {
  const [t] = await sql`select id from tests where slug = ${slug} and status = 'live' and (live_from is null or live_from <= now())`;
  return t?.id as string | undefined;
}

/** Starts a test, or returns the attempt already in progress. */
export async function startAttempt(userId: string, testId: string, order?: number[]) {
  const access = await canTakeTest(userId, testId);
  if (!access.allowed) return { ok: false as const, error: 'locked', plan: access.plan };
  const [open] = await sql`select id from attempts where user_id = ${userId} and test_id = ${testId} and status = 'in_progress'`;
  if (open) return { ok: true as const, attemptId: open.id as string };
  const b = await loadTest(testId);
  if (!b || !b.questions.length) return { ok: false as const, error: 'empty' };
  const n = b.sections.length;
  const valid = order && order.length === n && [...order].sort().every((v, i) => v === i);
  const sectionOrder = b.rules.chooseOrder && valid ? order! : b.sections.map((_, i) => i);
  const [a] = await sql`
    insert into attempts (user_id, test_id, section_order, current_section, section_started_at)
    values (${userId}, ${testId}, ${sectionOrder}, 0, now())
    on conflict do nothing returning id`;
  if (!a) {
    const [again] = await sql`select id from attempts where user_id = ${userId} and test_id = ${testId} and status = 'in_progress'`;
    return { ok: true as const, attemptId: again.id as string };
  }
  return { ok: true as const, attemptId: a.id as string };
}

async function loadAttempt(attemptId: string, userId: string) {
  const [a] = await sql`select * from attempts where id = ${attemptId} and user_id = ${userId}`;
  return a as Record<string, any> | undefined;
}

function timerFor(a: Record<string, any>, b: NonNullable<TestBundle>, now = Date.now()) {
  return syncTimer({
    rules: b.rules, totalMinutes: b.test.duration_min, sectionMinutes: b.sections.map(s => s.duration_min),
    order: a.section_order, startedAt: new Date(a.started_at).getTime(), currentPos: a.current_section,
    sectionStartedAt: a.section_started_at ? new Date(a.section_started_at).getTime() : null,
  }, now);
}

/** Everything the exam window needs. Never includes correct answers or solutions. */
export async function attemptState(attemptId: string, userId: string) {
  let a = await loadAttempt(attemptId, userId);
  if (!a) return null;
  const b = (await loadTest(a.test_id))!;
  if (a.status === 'in_progress') {
    const t = timerFor(a, b);
    if (t.expired) {
      await submitAttempt(attemptId, userId);
      return { submitted: true as const, attemptId };
    }
    if (t.sectional && t.currentPos !== a.current_section) {
      await sql`update attempts set current_section = ${t.currentPos}, section_started_at = ${new Date(t.sectionStartedAt!)} where id = ${attemptId}`;
      a = { ...a, current_section: t.currentPos };
    }
  } else {
    return { submitted: true as const, attemptId };
  }
  const t = timerFor(a, b);
  const saved = await sql`select question_id, answer, marked_for_review, visits, time_spent_sec from attempt_answers where attempt_id = ${attemptId}`;
  const [u] = await sql`select name, de_id from users where id = ${userId}`;
  return {
    submitted: false as const,
    attemptId,
    test: { name: b.test.name, slug: b.test.slug, exam: b.test.exam_code, type: b.test.type, durationMin: b.test.duration_min },
    rules: b.rules,
    markingLabel: b.marking.label ?? '',
    student: { name: u.name ?? 'Student', deId: u.de_id },
    sections: b.sections.map((s, i) => ({ index: i, name: s.name, code: s.code, minutes: s.duration_min, count: b.questions.filter(q => q.test_section_id === s.id).length })),
    order: a.section_order as number[],
    currentPos: t.currentPos,
    sectional: t.sectional,
    secondsLeft: t.secondsLeft,
    serverNow: Date.now(),
    questions: b.questions.map(q => ({
      id: q.id, sectionIndex: b.sections.findIndex(s => s.id === q.test_section_id), type: q.type, text: q.text, textHi: q.text_hi, image: q.image_url,
      options: q.options as { key: string; text: string }[], optionsHi: q.options_hi, setId: q.set_id, setText: q.set_text,
      marks: [q.marks_correct, q.marks_wrong],
    })),
    saved: Object.fromEntries(saved.map(s => [s.question_id as string, { answer: s.answer as string | null, marked: s.marked_for_review as boolean, visits: s.visits as number, time: s.time_spent_sec as number }])),
    lastQuestion: a.last_question as string | null,
  };
}

export type AnswerChange = { questionId: string; answer?: string | null; marked?: boolean; timeDelta?: number; visit?: boolean };

/** Autosave. Rejects writes after time is up or outside the open section. */
export async function saveAnswers(attemptId: string, userId: string, changes: AnswerChange[], currentQuestion?: string) {
  const a = await loadAttempt(attemptId, userId);
  if (!a || a.status !== 'in_progress') return { ok: false, error: 'closed' };
  const b = (await loadTest(a.test_id))!;
  const now = Date.now();
  const t = timerFor(a, b, now - GRACE_MS);
  if (t.expired) { await submitAttempt(attemptId, userId); return { ok: false, error: 'time_up' }; }
  const live = timerFor(a, b, now);
  const qMap = new Map(b.questions.map(q => [q.id, q]));
  let accepted = 0;
  for (const c of changes.slice(0, 200)) {
    const q = qMap.get(c.questionId);
    if (!q) continue;
    const si = b.sections.findIndex(s => s.id === q.test_section_id);
    if (!canVisitSection(b.rules, live.sectional, a.section_order, Math.min(live.currentPos, a.section_order.length - 1), si)) continue;
    const answer = c.answer === undefined ? undefined : normaliseAnswer(q.type, c.answer);
    const delta = Math.max(0, Math.min(MAX_DELTA_SEC, Math.round(c.timeDelta ?? 0)));
    await sql`
      insert into attempt_answers (attempt_id, question_id, answer, marked_for_review, time_spent_sec, visits, answered_at)
      values (${attemptId}, ${q.id}, ${answer ?? null}, ${c.marked ?? false}, ${delta}, ${c.visit ? 1 : 0}, ${answer ? new Date() : null})
      on conflict (attempt_id, question_id) do update set
        answer = case when ${answer === undefined} then attempt_answers.answer else excluded.answer end,
        marked_for_review = case when ${c.marked === undefined} then attempt_answers.marked_for_review else excluded.marked_for_review end,
        time_spent_sec = attempt_answers.time_spent_sec + ${delta},
        visits = attempt_answers.visits + ${c.visit ? 1 : 0},
        answered_at = case when ${answer === undefined} then attempt_answers.answered_at else excluded.answered_at end`;
    accepted++;
  }
  if (currentQuestion && qMap.has(currentQuestion)) await sql`update attempts set last_question = ${currentQuestion} where id = ${attemptId}`;
  return { ok: true, accepted, secondsLeft: live.secondsLeft, currentPos: live.currentPos };
}

/** Sectional exams: submit the current section and open the next one. */
export async function nextSection(attemptId: string, userId: string) {
  const a = await loadAttempt(attemptId, userId);
  if (!a || a.status !== 'in_progress') return { ok: false };
  const b = (await loadTest(a.test_id))!;
  const t = timerFor(a, b);
  if (!t.sectional) return { ok: false };
  const pos = t.currentPos + 1;
  if (pos >= a.section_order.length) { await submitAttempt(attemptId, userId); return { ok: true, submitted: true }; }
  await sql`update attempts set current_section = ${pos}, section_started_at = now() where id = ${attemptId} and current_section = ${a.current_section}`;
  return { ok: true, submitted: false };
}

/** Scores the attempt, ranks it, updates peer stats and awards XP. Safe to call twice. */
export async function submitAttempt(attemptId: string, userId: string) {
  const done = await sql.begin(async tx => {
    const [a] = await tx`select * from attempts where id = ${attemptId} and user_id = ${userId} for update`;
    if (!a || a.status !== 'in_progress') return null;
    const b = (await loadTest(a.test_id))!;
    const saved = new Map((await tx`select * from attempt_answers where attempt_id = ${attemptId}`).map(r => [r.question_id, r]));
    const items: { key: QuestionKey; answer: string | null; q: Record<string, any> }[] = b.questions.map(q => ({
      key: { type: q.type, correct: q.correct, marksCorrect: q.marks_correct, marksWrong: q.marks_wrong },
      answer: saved.get(q.id)?.answer ?? null, q,
    }));
    for (const it of items) {
      const r = marksFor(it.key, it.answer);
      await tx`
        insert into attempt_answers (attempt_id, question_id, answer, is_correct, marks) values (${attemptId}, ${it.q.id}, ${it.answer}, ${r.correct}, ${r.marks})
        on conflict (attempt_id, question_id) do update set is_correct = excluded.is_correct, marks = excluded.marks`;
    }
    const total = scoreAttempt(items, b.marking);
    const timeSec = [...saved.values()].reduce((s, r) => s + (r.time_spent_sec ?? 0), 0);

    for (const s of b.sections) {
      const its = items.filter(i => i.q.test_section_id === s.id);
      const sc = scoreAttempt(its);
      const st = its.reduce((x, i) => x + (saved.get(i.q.id)?.time_spent_sec ?? 0), 0);
      const pct = percentileFromCurve(sc.max ? Math.max(0, sc.score) / sc.max : 0, b.curve);
      await tx`
        insert into attempt_section_results (attempt_id, section_id, score, max_score, correct, wrong, skipped, time_sec, percentile)
        values (${attemptId}, ${s.section_id}, ${sc.score}, ${sc.max}, ${sc.correct}, ${sc.wrong}, ${sc.skipped}, ${st}, ${pct})
        on conflict (attempt_id, section_id) do update set score = excluded.score, max_score = excluded.max_score, correct = excluded.correct,
          wrong = excluded.wrong, skipped = excluded.skipped, time_sec = excluded.time_sec, percentile = excluded.percentile`;
    }

    // Ranking set in the test builder: everyone (All-India), batch-mates only, or no rank shown.
    const [{ ranking }] = await tx`select ranking from tests where id = ${a.test_id}`;
    const others = (await tx`select score::float from attempts where test_id = ${a.test_id} and status = 'submitted' and id <> ${attemptId}
      ${ranking === 'batch' ? tx`and user_id in (select m2.user_id from batch_members m1 join batch_members m2 on m2.batch_id = m1.batch_id where m1.user_id = ${userId})` : tx``}`).map(r => r.score as number);
    const real = others.length + 1 >= REAL_PERCENTILE_MIN_ATTEMPTS;
    const percentile = real ? percentileFromScores(total.score, others) : percentileFromCurve(total.max ? Math.max(0, total.score) / total.max : 0, b.curve);
    const rank = ranking === 'none' ? null : others.filter(s => s > total.score).length + 1;

    await tx`
      update attempts set status = 'submitted', submitted_at = now(), score = ${total.score}, max_score = ${total.max}, accuracy = ${total.accuracy},
        correct = ${total.correct}, wrong = ${total.wrong}, skipped = ${total.skipped}, time_sec = ${timeSec},
        percentile = ${percentile}, percentile_estimated = ${!real}, rank = ${rank}
      where id = ${attemptId}`;

    // Peer statistics (only from a student's first attempt at a test, so retakes don't skew them).
    const [{ firsts }] = await tx`select count(*)::int as firsts from attempts where user_id = ${userId} and test_id = ${a.test_id} and status = 'submitted'`;
    if (firsts === 1) {
      for (const it of items) {
        const r = saved.get(it.q.id);
        if (!r?.answer) continue;
        const ok = marksFor(it.key, it.answer).correct ? 1 : 0;
        const time = r.time_spent_sec ?? 0;
        await tx`
          insert into question_stats (question_id, attempts, correct_count, total_time_sec, avg_time_sec, peer_accuracy_pct)
          values (${it.q.id}, 1, ${ok}, ${time}, ${time}, ${ok * 100})
          on conflict (question_id) do update set
            attempts = question_stats.attempts + 1,
            correct_count = question_stats.correct_count + ${ok},
            total_time_sec = question_stats.total_time_sec + ${time},
            avg_time_sec = (question_stats.total_time_sec + ${time})::numeric / (question_stats.attempts + 1),
            peer_accuracy_pct = round(100.0 * (question_stats.correct_count + ${ok}) / (question_stats.attempts + 1), 1),
            updated_at = now()`;
      }
      if (others.length + 1 >= PEER_STATS_MIN_ATTEMPTS) {
        // Topper time: average time on correct answers by the top 10% of scorers on this test.
        await tx`
          with top as (
            select id from attempts where test_id = ${a.test_id} and status = 'submitted'
            order by score desc limit greatest(1, (select count(*) / 10 from attempts where test_id = ${a.test_id} and status = 'submitted'))
          )
          update question_stats qs set topper_time_sec = x.t
          from (select question_id, avg(time_spent_sec) as t from attempt_answers where attempt_id in (select id from top) and is_correct group by question_id) x
          where qs.question_id = x.question_id`;
      }
    }
    return { test: b.test, questions: items.length };
  });

  if (done) {
    const daily = done.test.type === 'daily';
    await awardXp(userId, daily ? 'daily_test' : 'test_complete', xpForTest(done.test.type, done.questions), String(done.test.id));
    if (daily) await bumpStreak(userId);
  }
  return { ok: true };
}

/** Daily free test for an exam: created on first request each day from the live question bank. */
export async function ensureDailyTest(examCode: string): Promise<string | null> {
  const [exam] = await sql`select e.id, e.code, e.name from exams e where e.code = ${examCode} and e.status = 'live'`;
  if (!exam) return null;
  const day = new Date(Date.now() + 5.5 * 3600_000).toISOString().slice(0, 10);   // India date
  const pfx = examCode === 'CAT' ? 'cat' : examCode === 'MBA-CET' ? 'cet' : 'om-' + examCode.toLowerCase();
  const slug = `${pfx}-d-${day.replace(/-/g, '')}`;
  const [have] = await sql`select id from tests where slug = ${slug}`;
  if (have) return have.id;
  const qs = await sql`
    select q.id, q.section_id from questions q where q.exam_id = ${exam.id} and q.status = 'live'
    order by md5(q.id::text || ${day}) limit 5`;
  if (!qs.length) return null;
  const label = new Date(day + 'T00:00:00Z').toLocaleDateString('en-IN', { day: 'numeric', month: 'short', timeZone: 'UTC' });
  const node = examCode === 'CAT' ? 'cat-daily' : examCode === 'MBA-CET' ? 'cet-daily' : examCode.toLowerCase();
  return sql.begin(async tx => {
    const [t] = await tx`
      insert into tests (slug, name, type, exam_id, node_id, duration_min, is_free, status, sort)
      values (${slug}, ${exam.name + ' Daily Test · ' + label}, 'daily', ${exam.id}, ${node}, 10, true, 'live', ${-Number(day.replace(/-/g, ''))})
      on conflict (slug) do nothing returning id`;
    if (!t) return (await tx`select id from tests where slug = ${slug}`)[0].id;
    const [ts] = await tx`insert into test_sections (test_id, section_id, name, sort) values (${t.id}, ${qs[0].section_id}, 'Mixed', 0) returning id`;
    for (const [i, q] of qs.entries()) await tx`insert into test_questions (test_id, test_section_id, question_id, sort) values (${t.id}, ${ts.id}, ${q.id}, ${i})`;
    return t.id;
  });
}

/** Report data for the result page. */
export async function attemptReport(attemptId: string, userId: string, viewerIsStaff = false) {
  const [a] = await sql`select a.*, t.name as test_name, t.slug as test_slug, t.type as test_type, t.solutions_visibility, t.window_end, e.code as exam_code
                        from attempts a join tests t on t.id = a.test_id join exams e on e.id = t.exam_id
                        where a.id = ${attemptId} and (a.user_id = ${userId} or ${viewerIsStaff})`;
  if (!a || a.status !== 'submitted') return null;
  const b = (await loadTest(a.test_id))!;
  const answers = new Map((await sql`select * from attempt_answers where attempt_id = ${attemptId}`).map(r => [r.question_id, r]));
  const stats = new Map((await sql`select * from question_stats where question_id = any(${b.questions.map(q => q.id)})`).map(r => [r.question_id, r]));
  const sections = await sql`select * from attempt_section_results where attempt_id = ${attemptId}`;
  const topics = [...new Set(b.questions.map(q => q.topic).filter(Boolean))];
  // Topic accuracy over the student's last 5 submitted attempts that included the topic.
  const hist = topics.length ? await sql`
    with recent as (
      select t.name as topic, aa.is_correct, a.submitted_at,
             dense_rank() over (partition by t.name order by a.submitted_at desc) as rk
      from attempts a join attempt_answers aa on aa.attempt_id = a.id
      join questions q on q.id = aa.question_id join topics t on t.id = q.topic_id
      where a.user_id = ${a.user_id} and a.status = 'submitted' and t.name = any(${topics}) and aa.answer is not null
    )
    select topic, round(100.0 * avg(case when is_correct then 1 else 0 end))::int as acc from recent where rk <= 5 group by topic` : [];
  const histMap = new Map(hist.map(h => [h.topic, h.acc as number]));
  const solutionsOpen = viewerIsStaff || a.solutions_visibility === 'after_submit' || (a.window_end && new Date(a.window_end) < new Date());
  return { attempt: a, bundle: b, answers, stats, sections, histMap, solutionsOpen: !!solutionsOpen };
}
