import 'server-only';
import type { ImportRow } from '../question-import';
import type { AdminExam } from './admin';
import type { TransactionSql } from 'postgres';

type Tx = TransactionSql;

/** Inserts or updates one validated row (matched by question_id). Returns the external id and whether it was new. */
export async function upsertQuestion(tx: Tx, q: ImportRow, exams: AdminExam[], status: 'live' | 'draft' = 'live') {
  const exam = exams.find(e => e.code === q.exam)!;
  const sec = exam.sections.find(s => s.code === q.sectionCode)!;
  await tx`insert into topics (section_id, name, sort) values (${sec.id}, ${q.topic}, 999) on conflict (section_id, name) do nothing`;
  const [topic] = await tx`select id from topics where section_id = ${sec.id} and name = ${q.topic}`;
  let setId: string | null = null;
  if (q.setId) {
    const [s] = await tx`insert into question_sets (external_id, exam_id, section_id, text) values (${q.setId}, ${exam.id}, ${sec.id}, ${q.setText ?? ''})
      on conflict (external_id) do update set text = excluded.text, exam_id = excluded.exam_id, section_id = excluded.section_id returning id`;
    setId = s.id;
  }
  const v = {
    exam_id: exam.id, section_id: sec.id, topic_id: topic.id, subtopic: q.subtopic, type: q.type, difficulty: q.difficulty, ideal_time_sec: q.ideal,
    marks_correct: q.marksCorrect, marks_wrong: q.marksWrong, set_id: setId, text: q.text, image_url: q.image, options: tx.json(q.options), correct: q.correct,
    solution_text: q.solution, solution_video_url: q.video, tags: q.tags, source: q.source, language: q.language, status,
  };
  if (q.externalId) {
    const [u] = await tx`update questions set ${tx(v as never)}, updated_at = now() where external_id = ${q.externalId} returning external_id`;
    if (u) return { id: u.external_id as string, created: false };
    const [n] = await tx`insert into questions ${tx({ ...v, external_id: q.externalId } as never)} returning external_id`;
    return { id: n.external_id as string, created: true };
  }
  const [n] = await tx`insert into questions ${tx(v as never)} returning external_id`;
  return { id: n.external_id as string, created: true };
}
