import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { parseCsv, parseTextQuestions, validateRows, type ExamRef } from './question-import';

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
    expect(run('CAT,QA,Algebra,TITA,Easy,45,3,0,,,x?,,,,,abc').errors[0].message).toContain('numeric');
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
