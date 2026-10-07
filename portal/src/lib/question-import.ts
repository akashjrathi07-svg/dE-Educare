// CSV parsing and validation for the admin question bank import.
// Format: question-import-template.csv (one row per question; sets share set_id).

export function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [], field = '', quoted = false;
  const s = text.replace(/^﻿/, '');
  for (let i = 0; i < s.length; i++) {
    const c = s[i];
    if (quoted) {
      if (c === '"') { if (s[i + 1] === '"') { field += '"'; i++; } else quoted = false; }
      else field += c;
    } else if (c === '"') quoted = true;
    else if (c === ',') { row.push(field); field = ''; }
    else if (c === '\n' || c === '\r') {
      if (c === '\r' && s[i + 1] === '\n') i++;
      row.push(field); field = '';
      if (row.some(f => f.trim() !== '')) rows.push(row);
      row = [];
    } else field += c;
  }
  row.push(field);
  if (row.some(f => f.trim() !== '')) rows.push(row);
  return rows;
}

export const COLUMNS = ['question_id', 'exam', 'section', 'topic', 'subtopic', 'type', 'difficulty', 'ideal_time_sec', 'marks_correct', 'marks_wrong', 'set_id', 'set_text', 'question_text', 'image_url', 'option_a', 'option_b', 'option_c', 'option_d', 'correct_answer', 'solution_text', 'solution_video_url', 'tags', 'source', 'language'] as const;

export type ExamRef = { code: string; name: string; sections: { code: string; name: string; topics: string[] }[] };
export type ImportRow = {
  row: number; externalId: string | null; exam: string; sectionCode: string; topic: string; subtopic: string | null;
  type: 'MCQ' | 'TITA' | 'MSQ'; difficulty: 'easy' | 'medium' | 'hard'; ideal: number; marksCorrect: number; marksWrong: number;
  setId: string | null; setText: string | null; text: string; image: string | null; options: { key: string; text: string }[];
  correct: string; solution: string | null; video: string | null; tags: string[]; source: string | null; language: 'en' | 'hi' | 'both';
};
export type RowError = { row: number; message: string };

const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, '');
const url = (s: string) => /^https?:\/\/\S+$/i.test(s);

/** Matches an exam by code or name ("CAT", "MBA-CET", "UPSC Prelims"). */
function findExam(exams: ExamRef[], v: string) {
  const n = norm(v);
  return exams.find(e => norm(e.code) === n || norm(e.name) === n);
}

function closest(options: string[], v: string): string | null {
  const n = norm(v);
  let best: string | null = null, score = 0;
  for (const o of options) {
    const m = norm(o);
    let s = 0;
    for (let i = 0; i < Math.min(m.length, n.length) && m[i] === n[i]; i++) s++;
    if (m.includes(n) || n.includes(m)) s += 5;
    if (s > score) { score = s; best = o; }
  }
  return score >= 3 ? best : null;
}

/** Validates every row. Returns ready rows plus readable errors (row numbers as shown in Excel). */
export function validateRows(table: string[][], exams: ExamRef[]): { ready: ImportRow[]; errors: RowError[]; total: number } {
  if (!table.length) return { ready: [], errors: [{ row: 1, message: 'The file is empty.' }], total: 0 };
  const header = table[0].map(h => h.trim().toLowerCase());
  const missing = ['exam', 'section', 'topic', 'type', 'difficulty', 'question_text', 'correct_answer'].filter(c => !header.includes(c));
  if (missing.length) return { ready: [], errors: [{ row: 1, message: `Missing column${missing.length > 1 ? 's' : ''}: ${missing.join(', ')}. Use the template.` }], total: 0 };
  const col = (r: string[], name: string) => (r[header.indexOf(name)] ?? '').trim();
  const ready: ImportRow[] = [], errors: RowError[] = [];
  const setTexts = new Map<string, string>();

  table.slice(1).forEach((r, i) => {
    const row = i + 2;
    const err = (m: string) => errors.push({ row, message: m });
    const exam = findExam(exams, col(r, 'exam'));
    if (!exam) return err(`exam "${col(r, 'exam')}" not found. Use one of: ${exams.map(e => e.code).join(', ')}.`);
    const secIn = col(r, 'section');
    const sec = exam.sections.find(s => norm(s.code) === norm(secIn) || norm(s.name) === norm(secIn));
    if (!sec) return err(`section "${secIn}" is not a ${exam.code} section. Use: ${exam.sections.map(s => s.code).join(', ')}.`);
    const topic = col(r, 'topic');
    if (!topic) return err('topic is required.');
    const known = sec.topics.find(t => norm(t) === norm(topic));
    if (sec.topics.length && !known) {
      const hint = closest(sec.topics, topic);
      return err(`topic "${topic}" not found in ${sec.code}.${hint ? ` Did you mean "${hint}"?` : ''}`);
    }
    const type = col(r, 'type').toUpperCase();
    if (!['MCQ', 'TITA', 'MSQ'].includes(type)) return err(`type "${col(r, 'type')}" must be MCQ, TITA or MSQ.`);
    const diff = col(r, 'difficulty').toLowerCase();
    if (!['easy', 'medium', 'hard'].includes(diff)) return err('difficulty must be Easy, Medium or Hard.');
    const ideal = Number(col(r, 'ideal_time_sec') || 90);
    if (!Number.isFinite(ideal) || ideal < 5 || ideal > 1800) return err('ideal_time_sec must be a number of seconds, e.g. 90.');
    const mc = Number(col(r, 'marks_correct') || 1), mw = Math.abs(Number(col(r, 'marks_wrong') || 0));
    if (!Number.isFinite(mc) || mc <= 0 || !Number.isFinite(mw)) return err('marks_correct and marks_wrong must be numbers, e.g. 3 and 1.');
    const text = col(r, 'question_text');
    if (!text) return err('question_text is required.');
    const options = (['a', 'b', 'c', 'd'] as const).map((k, j) => ({ key: 'ABCD'[j], text: col(r, 'option_' + k) })).filter(o => o.text);
    let correct = col(r, 'correct_answer');
    if (type === 'TITA') {
      if (!correct || !Number.isFinite(Number(correct))) return err('TITA questions need a numeric correct_answer.');
    } else {
      if (options.length < 2 || !options.find(o => o.key === 'A') || !options.find(o => o.key === 'B')) return err('MCQ and MSQ questions need at least option_a and option_b.');
      const keys = correct.toUpperCase().split('|').map(k => k.trim()).filter(Boolean);
      if (!keys.length) return err('correct_answer is required.');
      if (type === 'MCQ' && keys.length !== 1) return err('MCQ correct_answer must be one letter, e.g. B.');
      const bad = keys.find(k => !options.some(o => o.key === k));
      if (bad) return err(`correct_answer is "${bad}". Use ${options.map(o => o.key).join(', ')}${type === 'MSQ' ? ' (A|C for several)' : ''}.`);
      correct = keys.sort().join('|');
    }
    const image = col(r, 'image_url'), video = col(r, 'solution_video_url');
    if (image && !url(image)) return err('image_url must start with https://');
    if (video && !url(video)) return err('solution_video_url must start with https://');
    const setId = col(r, 'set_id') || null, setText = col(r, 'set_text') || null;
    if (setId && setText) setTexts.set(setId, setText);
    const lang = norm(col(r, 'language') || 'english');
    ready.push({
      row, externalId: col(r, 'question_id') || null, exam: exam.code, sectionCode: sec.code, topic: known ?? topic, subtopic: col(r, 'subtopic') || null,
      type: type as ImportRow['type'], difficulty: diff as ImportRow['difficulty'], ideal: Math.round(ideal), marksCorrect: mc, marksWrong: type === 'TITA' && !col(r, 'marks_wrong') ? 0 : mw,
      setId, setText, text, image: image || null, options: type === 'TITA' ? [] : options, correct, solution: col(r, 'solution_text') || null, video: video || null,
      tags: col(r, 'tags').split(',').map(t => t.trim()).filter(Boolean), source: col(r, 'source') || null,
      language: lang.startsWith('hi') ? 'hi' : lang.startsWith('both') ? 'both' : 'en',
    });
  });
  // A set's passage only needs to be on its first row.
  for (const q of ready) if (q.setId && !q.setText) q.setText = setTexts.get(q.setId) ?? null;
  for (const q of ready) if (q.setId && !q.setText) { errors.push({ row: q.row, message: `set_id "${q.setId}" has no set_text on any row.` }); }
  const bad = new Set(errors.map(e => e.row));
  return { ready: ready.filter(q => !bad.has(q.row)), errors: errors.sort((a, b) => a.row - b.row), total: table.length - 1 };
}
