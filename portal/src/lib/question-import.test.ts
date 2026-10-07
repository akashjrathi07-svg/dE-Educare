import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { parseCsv, validateRows, type ExamRef } from './question-import';

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
