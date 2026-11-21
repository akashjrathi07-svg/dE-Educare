'use server';
import crypto from 'node:crypto';
import { currentUser } from '@/lib/server/auth';
import { sql, notInMocks } from '@/lib/server/db';
import { consumeGuru } from '@/lib/server/guru';
import { refundCoins } from '@/lib/server/coins';
import { practiceCost } from '@/lib/economy';
import { AI_MAX_PER_SET, generatePracticeQuestions } from '@/lib/server/ai-questions';

/**
 * Builds a personal practice set: one section, an optional topic, 10/20/30 questions, 1 coin per 10.
 * Questions come from the bank (daily tests, free and earlier AI questions; never mock, sectional or
 * previous-paper questions). If the bank is short by up to 10, Guru writes the rest, checked against the
 * mocks, and they are saved for other students too. Not ranked; visible only to their owner.
 */
export async function createPracticeSet(p: { exam: string; section: string; topic: string; count: number; level: string }): Promise<{ ok: false; message: string } | { ok: true; slug: string }> {
  const u = await currentUser();
  if (!u) return { ok: false, message: 'Please sign in again.' };
  const count = [10, 20, 30].includes(p.count) ? p.count : 10;
  const [sec] = await sql`select s.id, s.name, e.id as exam_id, e.code, e.name as exam_name from sections s join exams e on e.id = s.exam_id where e.code = ${p.exam} and s.code = ${p.section}`;
  if (!sec) return { ok: false, message: 'Pick an exam and a section.' };
  const topicId = p.topic ? (await sql`select id from topics where section_id = ${sec.id} and name = ${p.topic}`)[0]?.id : null;
  if (p.topic && !topicId) return { ok: false, message: 'That topic was not found.' };
  const level = ['easy', 'medium', 'hard'].includes(p.level) ? p.level : null;
  // Never questions from mocks or sectionals; prefer ones this student has not seen yet.
  const pool = await sql`
    select q.id from questions q
    where q.exam_id = ${sec.exam_id} and q.section_id = ${sec.id} and q.status = 'live' and q.set_id is null and ${notInMocks()}
      ${topicId ? sql`and q.topic_id = ${topicId}` : sql``} ${level ? sql`and q.difficulty = ${level}` : sql``}
    order by exists (select 1 from attempt_answers aa join attempts a on a.id = aa.attempt_id where a.user_id = ${u.id} and aa.question_id = q.id), random()
    limit ${count}`;
  const short = count - pool.length;
  if (short > AI_MAX_PER_SET) return { ok: false, message: `Only ${pool.length} practice question${pool.length === 1 ? '' : 's'} match right now and Guru can write up to ${AI_MAX_PER_SET} more. Pick fewer questions, another level or the whole section.` };

  const pay = await consumeGuru(u.id, practiceCost(count), 'practice');
  if (!pay.ok) return { ok: false, message: pay.message };
  try {
    if (short > 0) {
      const made = await generatePracticeQuestions({ examId: sec.exam_id, examName: sec.exam_name, sectionId: sec.id, sectionName: sec.name, topicId, topicName: p.topic || '', level, count: short });
      if (made.length < short) {
        await refundCoins(u.id, pay.spent, 'practice');
        return { ok: false, message: 'Guru could not write enough questions right now. Your coins were returned; try fewer questions or again in a minute.' };
      }
      pool.push(...made.map(id => ({ id })) as never[]);
    }
    const slug = 'px-' + crypto.randomBytes(5).toString('hex');
    const name = `Practice · ${p.topic || sec.name} · ${count} Q`;
    await sql.begin(async tx => {
      const [t] = await tx`
        insert into tests (slug, name, type, exam_id, duration_min, is_free, ranking, status, owner_id, blueprint)
        values (${slug}, ${name}, 'practice', ${sec.exam_id}, ${Math.ceil(count * 1.5)}, false, 'none', 'live', ${u.id}, ${tx.json({ topic: p.topic || null, level } as never)}) returning id`;
      const [ts] = await tx`insert into test_sections (test_id, section_id, name, sort) values (${t.id}, ${sec.id}, ${sec.name}, 0) returning id`;
      for (const [i, q] of pool.entries()) await tx`insert into test_questions (test_id, test_section_id, question_id, sort) values (${t.id}, ${ts.id}, ${q.id}, ${i})`;
      await tx`insert into test_unlocks (user_id, test_id) values (${u.id}, ${t.id})`;
    });
    return { ok: true, slug };
  } catch (e) {
    console.error('[practice]', e);
    await refundCoins(u.id, pay.spent, 'practice');
    return { ok: false, message: 'Could not build the set. Your coins were returned.' };
  }
}
