import 'server-only';
import crypto from 'node:crypto';
import { sql } from './db';
import { askClaudeJSON } from './guru';

/** At most this many AI questions go into one practice set; the rest must come from the bank. */
export const AI_MAX_PER_SET = 10;

type Generated = { questions: { topic: string; difficulty: 'easy' | 'medium' | 'hard'; text: string; options: string[]; answer: 'A' | 'B' | 'C' | 'D'; solution: string }[] };

const SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['questions'],
  properties: {
    questions: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['topic', 'difficulty', 'text', 'options', 'answer', 'solution'],
        properties: {
          topic: { type: 'string' },
          difficulty: { type: 'string', enum: ['easy', 'medium', 'hard'] },
          text: { type: 'string' },
          options: { type: 'array', items: { type: 'string' } },
          answer: { type: 'string', enum: ['A', 'B', 'C', 'D'] },
          solution: { type: 'string' },
        },
      },
    },
  },
};

/** Word 3-grams of a question, for a rough "is this the same question" check. */
function shingles(text: string) {
  const w = text.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim().split(' ').filter(Boolean);
  const out = new Set<string>();
  for (let i = 0; i + 2 < w.length; i++) out.add(w[i] + ' ' + w[i + 1] + ' ' + w[i + 2]);
  return out;
}
function overlap(a: Set<string>, b: Set<string>) {
  if (!a.size || !b.size) return 0;
  let n = 0;
  for (const x of a) if (b.has(x)) n++;
  return n / Math.min(a.size, b.size);
}

/**
 * Writes `count` new MCQs for one section (and topic) with Claude, drops any that look like a mock,
 * sectional or previous-paper question of that section, saves the rest to the bank (source 'ai',
 * live, reused by later practice sets) and returns their ids. Returns [] if the AI is unavailable.
 */
export async function generatePracticeQuestions(p: { examId: string; examName: string; sectionId: string; sectionName: string; topicId: string | null; topicName: string; level: string | null; count: number }): Promise<string[]> {
  const count = Math.min(Math.max(1, p.count), AI_MAX_PER_SET);
  const [topics, mocks, [style]] = await Promise.all([
    sql`select id, name from topics where section_id = ${p.sectionId} order by sort, name`,
    sql`select q.text from questions q where q.section_id = ${p.sectionId} and exists (
          select 1 from test_questions tq join tests t on t.id = tq.test_id where tq.question_id = q.id and t.type in ('full_mock', 'sectional', 'pyq'))`,
    sql`select marks_correct, marks_wrong, round(avg(ideal_time_sec))::int as ideal from questions
        where section_id = ${p.sectionId} and type = 'MCQ' and status = 'live' group by 1, 2 order by count(*) desc limit 1`,
  ]);
  const topicList = topics.map(t => t.name as string);
  const system = `You write original practice questions for Indian MBA entrance exams for DE Educare, a test-prep company.
Every question must be new: do not reproduce or lightly reword questions from any past paper, coaching material, mock test or book.
Match the real exam's level, style and timing for the section. Each question has exactly 4 options (plain text, no letter prefix) and exactly one correct answer.
Check the arithmetic and logic of every question and its answer before you write it. The solution is a short, clear worked explanation a student can follow.`;
  const ask = `Exam: ${p.examName}
Section: ${p.sectionName}
${p.topicName ? `Topic: ${p.topicName} (every question on this topic)` : `Topics to spread across: ${topicList.slice(0, 40).join(', ')}`}
Difficulty: ${p.level ?? 'a mix of easy, medium and hard'}
Write ${count} questions. Each question must stand alone (no shared passage or data set).
For "topic", use ${p.topicName ? `"${p.topicName}"` : 'one name from the topic list above'}.`;
  const out = await askClaudeJSON<Generated>(system, [{ role: 'user', content: ask }], SCHEMA, { maxTokens: 16000, effort: 'medium' });
  if (!out?.questions?.length) return [];

  const mockShingles = mocks.map(m => shingles(String(m.text ?? '')));
  const keep = out.questions.filter(q => {
    if (q.options.length !== 4 || !q.text.trim() || !q.solution.trim()) return false;
    const s = shingles(q.text);
    return !mockShingles.some(m => overlap(s, m) >= 0.5);
  }).slice(0, count);
  if (!keep.length) return [];

  const topicId = (name: string) => p.topicId ?? topics.find(t => t.name.toLowerCase() === name.trim().toLowerCase())?.id ?? topics[0]?.id ?? null;
  const ids: string[] = [];
  await sql.begin(async tx => {
    for (const q of keep) {
      const [row] = await tx`
        insert into questions (external_id, exam_id, section_id, topic_id, type, difficulty, ideal_time_sec, marks_correct, marks_wrong,
          text, options, correct, solution_text, source, language, status)
        values (${'ai-' + crypto.randomUUID()}, ${p.examId}, ${p.sectionId}, ${topicId(q.topic)}, 'MCQ', ${p.level ?? q.difficulty},
          ${style?.ideal ?? 90}, ${style?.marks_correct ?? 1}, ${style?.marks_wrong ?? 0},
          ${q.text.trim()}, ${tx.json(q.options.map((t, i) => ({ key: 'ABCD'[i], text: t.trim() })) as never)}, ${q.answer},
          ${q.solution.trim()}, 'ai', 'en', 'live')
        returning id`;
      ids.push(row.id);
    }
  });
  return ids;
}
