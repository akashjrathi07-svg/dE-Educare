import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { mergeDetails, parseCsv, parseTextQuestions, validateRows, type ExamRef } from './question-import';

const EXAMS: ExamRef[] = [
  { code: 'CAT', name: 'CAT', sections: [{ code: 'QA', name: 'Quant', topics: ['Profit & Loss', 'Time, Speed & Distance', 'Algebra', 'Geometry'] }, { code: 'DILR', name: 'DILR', topics: ['Arrangements'] }, { code: 'VARC', name: 'VARC', topics: ['Reading Comprehension'] }] },
  { code: 'MBA-CET', name: 'MBA-CET', sections: [{ code: 'LR', name: 'Logical Reasoning', topics: [] }] },
];

describe('csv', () => {
  it('handles quotes, commas and newlines inside fields', () => {
    expect(parseCsv('a,b\n"x, ""y""","line1\nline2"\n')).toEqual([['a', 'b'], ['x, "y"', 'line1\nline2']]);
  });

  it('accepts the downloadable template', () => {
    const csv = fs.readFileSync(path.resolve(import.meta.dirname, '../../public/question-import-template.csv'), 'utf8');
    const r = validateRows(parseCsv(csv), [...EXAMS, { code: 'UPSC-PRE', name: 'UPSC Prelims', sections: [{ code: 'GS1', name: 'GS Paper I', topics: [] }] }, { code: 'IBPS-PO', name: 'IBPS PO', sections: [{ code: 'RE', name: 'Reasoning', topics: [] }] }]);
    expect(r.total).toBeGreaterThan(0);
    expect(r.errors.filter(e => !/topic/.test(e.message))).toEqual([]);
  });
});

describe('validation', () => {
  const head = 'exam,section,topic,type,difficulty,ideal_time_sec,marks_correct,marks_wrong,set_id,set_text,question_text,option_a,option_b,option_c,option_d,correct_answer';
  const run = (...rows: string[]) => validateRows(parseCsv([head, ...rows].join('\n')), EXAMS);

  it('reports the row and the fix', () => {
    const r = run('CAT,QA,Profit & Loss,MCQ,Easy,60,3,1,,,Q?,1,2,3,4,E', 'CAT,QA,Mensurations,MCQ,Easy,60,3,1,,,Q?,1,2,3,4,A');
    expect(r.ready).toHaveLength(0);
    expect(r.errors[0]).toMatchObject({ row: 2, message: 'correct_answer is "E". Use A, B, C, D.' });
    expect(r.errors[1].row).toBe(3);
  });

  it('suggests a close topic name', () => {
    expect(run('CAT,QA,Geometri,MCQ,Easy,60,3,1,,,Q?,1,2,,,A').errors[0].message).toContain('Did you mean "Geometry"?');
  });

  it('needs a number for TITA and sorts MSQ answers', () => {
    expect(run('CAT,QA,Algebra,TITA,Easy,45,3,0,,,x?,,,,,abc').errors[0].message).toMatch(/numeric/i);
    expect(run('CAT,QA,Algebra,MSQ,Hard,45,3,1,,,x?,1,2,3,4,C|A').ready[0].correct).toBe('A|C');
  });

  it('copies a set passage from its first row', () => {
    const r = run('CAT,DILR,Arrangements,MCQ,Hard,120,3,1,S1,Passage text,Q1,a,b,,,A', 'CAT,DILR,Arrangements,MCQ,Hard,120,3,1,S1,,Q2,a,b,,,B');
    expect(r.ready.map(q => q.setText)).toEqual(['Passage text', 'Passage text']);
  });

  it('allows any topic for exams without a topic list', () => {
    expect(run('MBA-CET,LR,Coding-Decoding,MCQ,Easy,30,1,0,,,Q,a,b,,,A').ready).toHaveLength(1);
  });
});

describe('easier imports', () => {
  it('reads numbered questions pasted from Word, with inline and stacked options', () => {
    const t = parseTextQuestions(`1. A price rises by 20% and then falls by 20%. What is the net change?
(A) No change  (B) 4% decrease
(C) 4% increase  (D) 2% decrease
Answer: B
Solution: 1.2 x 0.8 = 0.96.
So it is a 4% decrease.

Q2) How many ways can 3 people sit in a row?
a) 3
b) 6
c) 9
Ans: (b)
Difficulty: Easy

3. What is 15% of 200?
Answer: 30`);
    expect(t.length).toBe(4);
    const [h, q1, q2, q3] = t;
    const c = (r: string[], k: string) => r[h.indexOf(k)];
    expect(c(q1, 'question_text')).toMatch(/^A price rises/);
    expect([c(q1, 'option_a'), c(q1, 'option_b'), c(q1, 'option_c'), c(q1, 'option_d')]).toEqual(['No change', '4% decrease', '4% increase', '2% decrease']);
    expect(c(q1, 'solution_text')).toBe('1.2 x 0.8 = 0.96.\nSo it is a 4% decrease.');
    expect(c(q2, 'option_c')).toBe('9');
    expect(c(q2, 'difficulty')).toBe('Easy');
    expect(c(q3, 'correct_answer')).toBe('30');

    const r = validateRows(t, EXAMS, { defaults: { exam: 'CAT', section: 'QA', topic: 'Algebra', difficulty: 'medium' } });
    expect(r.errors).toEqual([]);
    expect(r.ready.map(q => [q.type, q.correct, q.difficulty])).toEqual([['MCQ', 'B', 'medium'], ['MCQ', 'B', 'easy'], ['TITA', '30', 'medium']]);
  });

  it('keeps a passage with the questions under it', () => {
    const t = parseTextQuestions(`Directions: Five friends sit in a row. C is in the middle.

1. Who is at an end?
(A) A (B) B
Answer: B
2. Who is next to C?
(A) A (B) E
Answer: A`);
    const r = validateRows(t, EXAMS, { defaults: { exam: 'CAT', section: 'QA', topic: 'Algebra' } });
    expect(r.ready.length).toBe(2);
    expect(r.ready[0].setId).toBeTruthy();
    expect(r.ready[0].setId).toBe(r.ready[1].setId);
    expect(r.ready[1].setText).toMatch(/Five friends/);
  });

  it('accepts friendly sheet headings, answers like "Option 2", and new topics when asked', () => {
    const table = [['Question', 'Option A', 'Option B', 'Option C', 'Answer', 'Explanation', 'Chapter', 'Level'], ['2+2?', '3', '4', '5', 'Option 2', 'Add.', 'Mental maths', 'Hard']];
    expect(validateRows(table, EXAMS, { defaults: { exam: 'CAT', section: 'QA' } }).errors[0].message).toMatch(/Add new topics/);
    const r = validateRows(table, EXAMS, { defaults: { exam: 'CAT', section: 'QA' }, newTopics: true });
    expect(r.errors).toEqual([]);
    expect(r.ready[0]).toMatchObject({ correct: 'B', topic: 'Mental maths', difficulty: 'hard', solution: 'Add.' });
  });
});

describe('whole tests from Word', () => {
  it('splits by Test: and Section: lines and keeps unnumbered questions apart', () => {
    const t = parseTextQuestions(`Test: CAT Mock 1
Section: Quant
What is 2+2?
(A) 3 (B) 4
Answer: B
What is 3+3?
(A) 6 (B) 7
Answer: A
Section: DILR
1. Who sits at the end?
(A) X (B) Y
Answer: A
Test: CAT Mock 2
Section: QA
1. What is 5+5?
Answer: 10`);
    const h = t[0];
    const c = (r: string[], k: string) => r[h.indexOf(k)];
    expect(t.slice(1).map(r => [c(r, 'test'), c(r, 'section'), c(r, 'question_text')])).toEqual([
      ['CAT Mock 1', 'Quant', 'What is 2+2?'], ['CAT Mock 1', 'Quant', 'What is 3+3?'], ['CAT Mock 1', 'DILR', 'Who sits at the end?'], ['CAT Mock 2', 'QA', 'What is 5+5?'],
    ]);
    const r = validateRows(t, EXAMS, { defaults: { exam: 'CAT', topic: 'General' }, newTopics: true });
    expect(r.errors).toEqual([]);
    expect(r.ready.map(q => [q.testName, q.sectionCode])).toEqual([['CAT Mock 1', 'QA'], ['CAT Mock 1', 'QA'], ['CAT Mock 1', 'DILR'], ['CAT Mock 2', 'QA']]);
  });
});

describe('Word questions + Excel details', () => {
  it('fills topic, difficulty and marks by test, section and question number', () => {
    const word = parseTextQuestions(`Test: CAT Mock 1
Section: QA
1. Two plus two?
(A) 3 (B) 4
Answer: B
2. Fifteen percent of 200?
Answer: 30
Section: VARC
1. Main idea?
(A) X (B) Y
Answer: A`);
    const excel = [
      ['Test', 'Section', 'Q No', 'Topic', 'Subtopic', 'Difficulty', 'Ideal time (sec)', 'Marks if correct', 'Negative marks'],
      ['CAT Mock 1', 'QA', '2', 'Algebra', 'Percent', 'Easy', '60', '3', '0'],
      ['CAT Mock 1', 'QA', '1', 'Geometry', '', 'Hard', '120', '3', '1'],
      ['CAT Mock 1', 'VARC', '1', 'Reading Comprehension', 'Main idea', 'Medium', '90', '3', '1'],
      ['CAT Mock 1', 'QA', '9', 'Algebra', '', 'Easy', '', '', ''],
    ];
    const m = mergeDetails(word, excel);
    expect(m.matched).toBe(3);
    expect(m.unmatched.length).toBe(1);
    const r = validateRows(m.table, EXAMS, { defaults: { exam: 'CAT', topic: 'General' }, newTopics: true });
    expect(r.errors).toEqual([]);
    expect(r.ready.map(q => [q.sectionCode, q.topic, q.subtopic, q.difficulty, q.ideal, q.marksWrong])).toEqual([
      ['QA', 'Geometry', null, 'hard', 120, 1], ['QA', 'Algebra', 'Percent', 'easy', 60, 0], ['VARC', 'Reading Comprehension', 'Main idea', 'medium', 90, 1],
    ]);
  });
});

describe('vendor format: Topic, D.51-55) directions, Q.51), five options', () => {
  it('groups only the questions in the directions range and reads options a) to e)', () => {
    const t = parseTextQuestions(`Test: Bank PO Mock 1
Section: QA
Topic: Algebra
D.51-52) Study the following graph carefully to answer the questions that follow:
[[img:/media/11111111-2222-3333-4444-555555555555]]
Q.51) In which city is the difference second lowest?
a) Jalandhar
b) Delhi
c) Chandigarh
d) Hoshiarpur
e) Ropar
Answer: b
Explanation: Read the graph.
Q.52) What is the ratio?
a) 3: 2
b) 2: 3
c) 
d) 
Answer: a
Topic: Geometry
Q.53) Not part of the set?
a) yes
b) no`);
    const h = t[0];
    const c = (r: string[], k: string) => r[h.indexOf(k)];
    const [q51, q52, q53] = t.slice(1);
    expect(c(q51, 'option_e')).toBe('Ropar');
    expect(c(q51, 'set_text')).toMatch(/^Study the following graph[\s\S]*\[\[img:\/media\//);
    expect(c(q52, 'set_id')).toBe(c(q51, 'set_id'));
    expect(c(q52, 'option_c')).toBe('');
    expect(c(q53, 'set_id')).toBe('');
    expect([c(q51, 'topic'), c(q52, 'topic'), c(q53, 'topic')]).toEqual(['Algebra', 'Algebra', 'Geometry']);
    const excel = [
      ['Question Number', 'Correct Answer(s)', 'Subject', 'Marks', ' Negative Marks', 'Type', ' Difficulty Level', 'Partial Marks'],
      [51, 'b', 'Maths > Quant (QA) > Algebra', 2, 0.6, 'Single', 'Very Easy', ''],
      [53, 'A, B', 'Quant (QA)', 2, 0.6, 'Multiple', 'Very Hard', 0.5],
    ].map(r => r.map(String));
    const m = mergeDetails(t, excel);
    const r = validateRows(m.table, EXAMS, { defaults: { exam: 'CAT', topic: 'General' }, newTopics: true });
    expect(r.errors).toEqual([]);
    expect(r.ready.map(q => [q.type, q.correct, q.difficulty, q.marksCorrect, q.marksWrong, q.options.length])).toEqual([
      ['MCQ', 'B', 'easy', 2, 0.6, 5], ['MCQ', 'A', 'medium', 1, 0, 2], ['MSQ', 'A|B', 'hard', 2, 0.6, 2],
    ]);
    expect(r.ready.map(q => q.tags)).toEqual([['very easy'], [], ['very hard']]);
  });

  it('reads Section > Topic > Subtopic paths and concept columns, so Guru can find questions', () => {
    const r = validateRows([
      ['Subject', 'Question', 'A', 'B', 'Answer', 'Concepts', 'Year'],
      ['Maths > Quant (QA) > Arithmetic > Successive discounts', 'Q?', '1', '2', 'A', 'percent change; multiplying factors', 'CAT 2023 Slot 2'],
      ['Maths > Quantitative > Time and Work', 'Q?', '1', '2', 'B', '', ''],
    ], EXAMS, { defaults: { exam: 'CAT', section: 'QA' }, newTopics: true });
    expect(r.errors).toEqual([]);
    expect(r.ready.map(q => [q.sectionCode, q.topic, q.subtopic, q.tags, q.source])).toEqual([
      ['QA', 'Arithmetic', 'Successive discounts', ['percent change', 'multiplying factors'], 'CAT 2023 Slot 2'],
      ['QA', 'Time and Work', null, [], null],
    ]);
  });
});
