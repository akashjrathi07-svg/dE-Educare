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
  /** Test this question belongs to, when a file holds whole tests ("test" column or "Test:" line). */
  testName: string | null;
};
export type RowError = { row: number; message: string };

/** Values used when a row leaves a column blank (picked once in the import screen). */
export type ImportDefaults = Partial<Record<'exam' | 'section' | 'topic' | 'type' | 'difficulty' | 'marks_correct' | 'marks_wrong' | 'ideal_time_sec' | 'source', string>>;
export type ImportOptions = { defaults?: ImportDefaults; newTopics?: boolean };

/** Friendly column names people use in their own sheets, mapped to template columns. */
const ALIASES: Record<string, string> = {
  id: 'question_id', qid: 'question_id', questionid: 'question_id', subject: 'section', chapter: 'topic', subtopics: 'subtopic',
  questiontype: 'type', answertype: 'type', level: 'difficulty', time: 'ideal_time_sec', idealtime: 'ideal_time_sec', timesec: 'ideal_time_sec',
  marks: 'marks_correct', positive: 'marks_correct', negative: 'marks_wrong', negativemarks: 'marks_wrong', passage: 'set_text', set: 'set_id', setid: 'set_id',
  question: 'question_text', questions: 'question_text', text: 'question_text', image: 'image_url', a: 'option_a', b: 'option_b', c: 'option_c', d: 'option_d',
  optiona: 'option_a', optionb: 'option_b', optionc: 'option_c', optiond: 'option_d', option1: 'option_a', option2: 'option_b', option3: 'option_c', option4: 'option_d',
  answer: 'correct_answer', ans: 'correct_answer', correct: 'correct_answer', correctoption: 'correct_answer', key: 'correct_answer',
  solution: 'solution_text', explanation: 'solution_text', video: 'solution_video_url', solutionvideo: 'solution_video_url',
  test: 'test', testname: 'test', mock: 'test', paper: 'test', sectionname: 'section',
  qno: 'qno', q: 'qno', no: 'qno', questionno: 'qno', questionnumber: 'qno', qnumber: 'qno', sno: 'qno', srno: 'qno',
  marksifcorrect: 'marks_correct', marksforcorrect: 'marks_correct', imagelink: 'image_url', imageurl: 'image_url', idealtimesec: 'ideal_time_sec', difficultylevel: 'difficulty',
};
function headerName(h: string) {
  const t = h.trim().toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '');
  if ((COLUMNS as readonly string[]).includes(t)) return t;
  return ALIASES[t.replace(/_/g, '')] ?? t;
}

/** Reads a correct answer the way people write it: "B", "(b)", "Option B", "2", "A, C" or the option's own text. */
function answerKeys(raw: string, options: { key: string; text: string }[]) {
  const v = raw.trim();
  const byText = options.find(o => norm(o.text) && norm(o.text) === norm(v));
  if (byText) return [byText.key];
  const cleaned = v.toUpperCase().replace(/OPTION|ANSWER|ANS|[().:\s]/g, ' ').trim();
  return cleaned.split(/[|,;&/ ]+|AND/).map(k => k.trim()).filter(Boolean).map(k => (/^[1-4]$/.test(k) ? 'ABCD'[Number(k) - 1] : k));
}

const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, '');
/** Short stable key for a passage (FNV-1a), so the same passage always maps to the same set. */
function passageKey(t: string) {
  let h = 0x811c9dc5;
  for (const ch of norm(t)) { h ^= ch.charCodeAt(0); h = Math.imul(h, 0x01000193) >>> 0; }
  return h.toString(36).toUpperCase();
}
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
export function validateRows(table: string[][], exams: ExamRef[], opts: ImportOptions = {}): { ready: ImportRow[]; errors: RowError[]; total: number } {
  if (!table.length) return { ready: [], errors: [{ row: 1, message: 'The file is empty.' }], total: 0 };
  const header = table[0].map(h => headerName(String(h ?? '')));
  const defaults: Record<string, string> = { ...(opts.defaults ?? {}) };
  const missing = ['exam', 'section', 'topic', 'question_text', 'correct_answer'].filter(c => !header.includes(c) && !defaults[c]?.trim());
  if (missing.length) return { ready: [], errors: [{ row: 1, message: `Missing column${missing.length > 1 ? 's' : ''}: ${missing.join(', ')}. Use the template, or pick ${missing.length > 1 ? 'them' : 'it'} above for the whole file.` }], total: 0 };
  const own = (r: string[], name: string) => {
    const i = header.indexOf(name);
    return i < 0 ? '' : String(r[i] ?? '').trim();
  };
  const col = (r: string[], name: string) => own(r, name) || (defaults[name] ?? '').trim();
  const ready: ImportRow[] = [], errors: RowError[] = [];
  const setTexts = new Map<string, string>();

  table.slice(1).forEach((r, i) => {
    const row = i + 2;
    const err = (m: string) => errors.push({ row, message: m });
    const exam = findExam(exams, col(r, 'exam'));
    if (!exam) return err(`exam "${col(r, 'exam')}" not found. Use one of: ${exams.map(e => e.code).join(', ')}.`);
    const secIn = col(r, 'section');
    const sec = exam.sections.find(s => norm(s.code) === norm(secIn) || norm(s.name) === norm(secIn))
      // "Quantitative Aptitude" for "Quant (QA)", "VARC" for "Verbal Ability & RC (VARC)"…
      ?? (norm(secIn).length >= 2 ? exam.sections.find(s => norm(s.name).includes(norm(secIn)) || norm(secIn).includes(norm(s.code)) && norm(s.code).length >= 2) : undefined);
    if (!sec) return err(`section "${secIn}" is not a ${exam.code} section. Use: ${exam.sections.map(s => s.code).join(', ')}.`);
    const topic = col(r, 'topic');
    if (!topic) return err('topic is required.');
    const known = sec.topics.find(t => norm(t) === norm(topic));
    if (sec.topics.length && !known && !opts.newTopics) {
      const hint = closest(sec.topics, topic);
      return err(`topic "${topic}" not found in ${sec.code}.${hint ? ` Did you mean "${hint}"?` : ''} Or tick "Add new topics".`);
    }
    const options = (['a', 'b', 'c', 'd'] as const).map((k, j) => ({ key: 'ABCD'[j], text: col(r, 'option_' + k) })).filter(o => o.text);
    let correct = col(r, 'correct_answer');
    // Type: the row's own value, else no options + a number means TITA, else the default, else MCQ (MSQ for several answers).
    const typeIn = own(r, 'type') || (!options.length && Number.isFinite(Number(correct)) && correct !== '' ? 'TITA' : defaults.type || (answerKeys(correct, options).length > 1 ? 'MSQ' : 'MCQ'));
    const type = typeIn.toUpperCase().replace(/^SINGLE.*|^OBJECTIVE$/, 'MCQ').replace(/^MULTI.*/, 'MSQ').replace(/^(NUMERIC.*|INTEGER|NAT)$/, 'TITA');
    if (!['MCQ', 'TITA', 'MSQ'].includes(type)) return err(`type "${typeIn}" must be MCQ, TITA or MSQ.`);
    const diff = (col(r, 'difficulty') || 'medium').toLowerCase().replace(/^(e|easy.*)$/, 'easy').replace(/^(m|moderate|medium.*)$/, 'medium').replace(/^(h|difficult|tough|hard.*)$/, 'hard');
    if (!['easy', 'medium', 'hard'].includes(diff)) return err('difficulty must be Easy, Medium or Hard.');
    const ideal = Number(col(r, 'ideal_time_sec') || 90);
    if (!Number.isFinite(ideal) || ideal < 5 || ideal > 1800) return err('ideal_time_sec must be a number of seconds, e.g. 90.');
    const mc = Number(col(r, 'marks_correct') || 1), mw = Math.abs(Number(col(r, 'marks_wrong') || 0));
    if (!Number.isFinite(mc) || mc <= 0 || !Number.isFinite(mw)) return err('marks_correct and marks_wrong must be numbers, e.g. 3 and 1.');
    const text = col(r, 'question_text');
    if (!text) return err('question_text is required.');
    if (type === 'TITA') {
      if (!correct || !Number.isFinite(Number(correct))) return err('TITA questions need a numeric correct_answer.');
    } else {
      if (options.length < 2 || !options.find(o => o.key === 'A') || !options.find(o => o.key === 'B')) return err('MCQ and MSQ questions need at least option_a and option_b.');
      const keys = answerKeys(correct, options);
      if (!keys.length) return err('correct_answer is required.');
      if (type === 'MCQ' && keys.length !== 1) return err('MCQ correct_answer must be one letter, e.g. B.');
      const bad = keys.find(k => !options.some(o => o.key === k));
      if (bad) return err(`correct_answer is "${bad}". Use ${options.map(o => o.key).join(', ')}${type === 'MSQ' ? ' (A|C for several)' : ''}.`);
      correct = keys.sort().join('|');
    }
    const image = col(r, 'image_url'), video = col(r, 'solution_video_url');
    if (image && !url(image)) return err('image_url must start with https://');
    if (video && !url(video)) return err('solution_video_url must start with https://');
    const setText = col(r, 'set_text') || null;
    // A passage without a set ID: rows with the same passage form one set.
    const setId = col(r, 'set_id') || (setText ? 'P-' + passageKey(setText) : null);
    if (setId && setText) setTexts.set(setId, setText);
    const lang = norm(col(r, 'language') || 'english');
    ready.push({
      row, externalId: col(r, 'question_id') || null, exam: exam.code, sectionCode: sec.code, topic: known ?? topic, subtopic: col(r, 'subtopic') || null,
      type: type as ImportRow['type'], difficulty: diff as ImportRow['difficulty'], ideal: Math.round(ideal), marksCorrect: mc, marksWrong: type === 'TITA' && !col(r, 'marks_wrong') ? 0 : mw,
      setId, setText, text, image: image || null, options: type === 'TITA' ? [] : options, correct, solution: col(r, 'solution_text') || null, video: video || null,
      tags: col(r, 'tags').split(',').map(t => t.trim()).filter(Boolean), source: col(r, 'source') || null,
      language: lang.startsWith('hi') ? 'hi' : lang.startsWith('both') ? 'both' : 'en',
      testName: own(r, 'test') || null,
    });
  });
  // A set's passage only needs to be on its first row.
  for (const q of ready) if (q.setId && !q.setText) q.setText = setTexts.get(q.setId) ?? null;
  for (const q of ready) if (q.setId && !q.setText) { errors.push({ row: q.row, message: `set_id "${q.setId}" has no set_text on any row.` }); }
  const bad = new Set(errors.map(e => e.row));
  return { ready: ready.filter(q => !bad.has(q.row)), errors: errors.sort((a, b) => a.row - b.row), total: table.length - 1 };
}

const TEXT_HEADER = ['question_text', 'option_a', 'option_b', 'option_c', 'option_d', 'correct_answer', 'solution_text', 'set_id', 'set_text', 'topic', 'difficulty', 'image_url', 'test', 'section', 'qno'];

/**
 * Reads questions typed or pasted from Word / PDF into a table that validateRows understands.
 *
 *   Directions: Read the passage and answer the questions.    ← optional, shared by the questions below
 *   1. A price rises by 20% and falls by 20%. Net change?
 *   (A) No change  (B) 4% decrease
 *   (C) 4% increase  (D) 2% decrease
 *   Answer: B
 *   Solution: 1.2 × 0.8 = 0.96, so 4% decrease.
 *
 * Questions are numbered (1. / Q1. / 1)) or separated by blank lines. Options can be on one line or
 * several, written A) A. (A) or a). "Answer:" can be a letter, several letters, or a number (TITA).
 * "Topic:" and "Difficulty:" lines are optional per question.
 */
export function parseTextQuestions(text: string): string[][] {
  let lines = text.replace(/\r\n?/g, '\n').replace(/\u00a0/g, ' ').split('\n');
  // Titles and instructions above the first "Test:" line are not questions.
  const firstTest = lines.findIndex(l => /^\s*test\s*[:.\-–]/i.test(l));
  if (firstTest > 0) lines = lines.slice(firstTest);
  const rows: string[][] = [TEXT_HEADER];
  const QSTART = /^\s*(?:Q(?:uestion)?\s*\.?\s*)?(\d{1,4})\s*[.):]\s+(.*)$/i;
  const OPT = /(?:^|\s)\(?([A-Da-d])[).]\s+/g;
  const LABEL = /^\s*(answer|ans|correct answer|key|solution|sol|explanation|exp|topic|chapter|difficulty|level|passage|directions?|image|test|section)\s*[:.\-–]\s*(.*)$/i;
  let passage = '', setNo = 0, setId = '', test = '', section = '';
  type Q = { text: string[]; opts: string[]; ans: string; sol: string[]; topic: string; diff: string; image: string; no: string; in: 'q' | 'opt' | 'sol' | 'passage' };
  // Held in an object so TypeScript doesn't narrow it inside the loop.
  const cur: { q: Q | null } = { q: null };
  const flush = () => {
    if (cur.q && cur.q.text.join(' ').trim()) {
      rows.push([cur.q.text.join('\n').trim(), ...[0, 1, 2, 3].map(i => (cur.q!.opts[i] ?? '').trim()), cur.q.ans.trim(), cur.q.sol.join('\n').trim(), passage ? setId : '', passage ? passage.trim() : '', cur.q.topic, cur.q.diff, cur.q.image, test, section, cur.q.no]);
    }
    cur.q = null;
  };
  const start = (first: string, no = '') => { flush(); cur.q = { text: first ? [first] : [], opts: [], ans: '', sol: [], topic: '', diff: '', image: '', no, in: 'q' }; };
  const addOptions = (line: string) => {
    // "(A) 10% (B) 12%" → two options; text before the first marker continues the previous option.
    const parts = line.split(OPT);
    if (parts[0].trim() && cur.q!.opts.length) cur.q!.opts[cur.q!.opts.length - 1] += ' ' + parts[0].trim();
    for (let i = 1; i < parts.length; i += 2) cur.q!.opts['ABCD'.indexOf(parts[i].toUpperCase())] = parts[i + 1].trim();
  };

  let blank = false;
  const isOptLine = (l: string | undefined) => !!l && /^\(?[A-Da-d][).]\s+/.test(l.trim());
  for (const [li, raw] of lines.entries()) {
    const line = raw.trim();
    if (!line) { blank = true; if (cur.q && cur.q.in === 'passage') cur.q.in = 'q'; continue; }
    const lab = line.match(LABEL);
    if (lab) {
      const k = lab[1].toLowerCase(), v = lab[2].trim();
      // "Test: CAT Mock 2" and "Section: QA" apply to every question after them.
      if (k === 'test' || k === 'section') { flush(); if (k === 'test') { test = v; section = ''; } else section = v; passage = ''; blank = false; cur.q = null; continue; }
      if (/^(passage|directions?)$/.test(k)) { flush(); passage = v; setNo++; setId = 'TXT-' + Date.now().toString(36).toUpperCase() + '-' + setNo; blank = false; cur.q = null; continue; }
      if (!cur.q) start('');
      if (/^(answer|ans|correct answer|key)$/.test(k)) { cur.q!.ans = v; cur.q!.in = 'q'; }
      else if (/^(solution|sol|explanation|exp)$/.test(k)) { cur.q!.sol = v ? [v] : []; cur.q!.in = 'sol'; }
      else if (/^(topic|chapter)$/.test(k)) cur.q!.topic = v;
      else if (/^(difficulty|level)$/.test(k)) cur.q!.diff = v;
      else if (k === 'image') cur.q!.image = v;
      blank = false;
      continue;
    }
    const qs = line.match(QSTART);
    if (qs) { start(qs[2], qs[1]); blank = false; continue; }
    const isOpt = /^\(?[A-Da-d][).]\s+/.test(line);
    // A plain line followed by options is a new question, even right after a solution.
    if (cur.q && cur.q.in === 'sol' && !isOpt && isOptLine(lines.slice(li + 1).find(l => l.trim()))) { start(line); blank = false; continue; }
    if (cur.q && cur.q.in === 'sol' && !isOpt) { cur.q.sol.push(line); blank = false; continue; }
    if (isOpt && cur.q) { addOptions(line); cur.q.in = 'opt'; blank = false; continue; }
    if (!cur.q) {
      // Text before any numbered question: a passage if one was announced, else an unnumbered question.
      if (passage && setNo && !rows.slice(1).some(r => r[7] === setId)) passage += '\n' + line;
      else start(line);
    } else if (cur.q.ans && cur.q.in === 'q') {
      // After a question's answer, the next plain line is the next (unnumbered) question.
      start(line);
    } else if (blank && cur.q.in !== 'q' && (cur.q.ans || cur.q.opts.length)) {
      // A blank line after a finished question starts the next unnumbered one.
      start(line);
    } else if (cur.q.in === 'opt' && cur.q.opts.length) {
      addOptions(line);
    } else {
      cur.q.text.push(line);
    }
    blank = false;
  }
  flush();
  return rows;
}


/**
 * Adds a details sheet (Excel) to questions from a Word file: topic, subtopic, difficulty, ideal time,
 * marks, tags, source, type or image for each question. Rows are matched by Test + Section + Q No, then
 * Test + Q No, then Q No alone; the question's own values win where both are filled.
 * Returns the merged table and how many detail rows matched.
 */
export function mergeDetails(content: string[][], details: string[][]): { table: string[][]; matched: number; unmatched: string[] } {
  if (content.length < 2 || details.length < 2) return { table: content, matched: 0, unmatched: [] };
  const ch = content[0].map(h => headerName(String(h ?? '')));
  const dh = details[0].map(h => headerName(String(h ?? '')));
  const FIELDS = ['topic', 'subtopic', 'difficulty', 'ideal_time_sec', 'marks_correct', 'marks_wrong', 'tags', 'source', 'type', 'image_url', 'language'];
  const cell = (h: string[], r: string[], k: string) => { const i = h.indexOf(k); return i < 0 ? '' : String(r[i] ?? '').trim(); };
  const num = (v: string) => v.replace(/[^0-9]/g, '');
  // Question numbers: as written in Word, else counted from 1 inside each test.
  const counters = new Map<string, number>();
  const keysOf = (h: string[], r: string[], count: boolean) => {
    const t = norm(cell(h, r, 'test')), s = norm(cell(h, r, 'section'));
    let n = num(cell(h, r, 'qno'));
    if (!n && count) { const c = (counters.get(t) ?? 0) + 1; counters.set(t, c); n = String(c); }
    return [`${t}|${s}|${n}`, `${t}||${n}`, `||${n}`];
  };
  const byKey = new Map<string, string[]>();
  for (const r of details.slice(1)) {
    if (!r.some(c => String(c ?? '').trim())) continue;
    const t = norm(cell(dh, r, 'test')), sec = norm(cell(dh, r, 'section')), n = num(cell(dh, r, 'qno'));
    if (!n) continue;
    byKey.set(`${t}|${sec}|${n}`, r);
  }
  const header = [...ch];
  for (const f of FIELDS) if (!header.includes(f) && dh.includes(f)) header.push(f);
  const used = new Set<string[]>();
  const rows = content.slice(1).map(r => {
    const out = header.map((h, i) => (i < ch.length ? String(r[i] ?? '') : ''));
    const [k1, k2, k3] = keysOf(ch, r, true);
    // Exact match first, then the same number in the same test, then the number alone.
    let d = byKey.get(k1);
    if (!d) for (const [k, v] of byKey) { const [t, , n] = k.split('|'); if (!used.has(v) && `${t}||${n}` === k2) { d = v; break; } }
    if (!d) for (const [k, v] of byKey) { const n = k.split('|')[2]; if (!used.has(v) && `||${n}` === k3) { d = v; break; } }
    if (d) {
      used.add(d);
      for (const f of FIELDS) {
        const v = cell(dh, d, f), i = header.indexOf(f);
        if (v && i >= 0 && !String(out[i] ?? '').trim()) out[i] = v;
      }
    }
    return out;
  });
  const unmatched = [...byKey.entries()].filter(([, v]) => !used.has(v)).map(([k]) => k.split('|').filter(Boolean).join(' · ') || k).slice(0, 20);
  return { table: [header, ...rows], matched: used.size, unmatched };
}
