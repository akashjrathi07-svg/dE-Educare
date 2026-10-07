import { describe, expect, it } from 'vitest';
import { syncTimer, canVisitSection, isCorrect, scoreAttempt, percentileFromCurve, percentileFromScores, isSectional } from './exam-logic';

const CAT = { secTimer: true, lock: true, nav: 'Within the current section' };
const t0 = Date.UTC(2026, 9, 7, 10, 0, 0);
const min = 60_000;

describe('timer', () => {
  it('counts down a common timer and expires', () => {
    const base = { rules: {}, totalMinutes: 150, sectionMinutes: [null, null], order: [0, 1], startedAt: t0, currentPos: 0, sectionStartedAt: null };
    expect(syncTimer(base, t0 + 10 * min).secondsLeft).toBe(140 * 60);
    expect(syncTimer(base, t0 + 151 * min).expired).toBe(true);
  });

  it('moves CAT to the next section when its 40 minutes are up, even if the student was offline', () => {
    const base = { rules: CAT, totalMinutes: 120, sectionMinutes: [40, 40, 40], order: [0, 1, 2], startedAt: t0, currentPos: 0, sectionStartedAt: t0 };
    const s = syncTimer(base, t0 + 85 * min);
    expect(s.currentPos).toBe(2);
    expect(s.secondsLeft).toBe(35 * 60);
    expect(syncTimer(base, t0 + 121 * min).expired).toBe(true);
  });

  it('keeps an early section submit: the next section starts from when it was opened', () => {
    const base = { rules: CAT, totalMinutes: 120, sectionMinutes: [40, 40, 40], order: [0, 1, 2], startedAt: t0, currentPos: 1, sectionStartedAt: t0 + 30 * min };
    expect(syncTimer(base, t0 + 31 * min).secondsLeft).toBe(39 * 60);
  });

  it('respects a student-chosen section order (NMAT)', () => {
    const base = { rules: { secTimer: true, lock: true, chooseOrder: true }, totalMinutes: 120, sectionMinutes: [28, 52, 40], order: [1, 0, 2], startedAt: t0, currentPos: 0, sectionStartedAt: t0 };
    expect(syncTimer(base, t0 + 60 * min)).toMatchObject({ currentPos: 1, secondsLeft: 20 * 60 });
  });

  it('treats a single-section test as a common timer', () => {
    expect(isSectional(CAT, [40])).toBe(false);
  });
});

describe('navigation', () => {
  it('locks CAT to the current section', () => {
    expect(canVisitSection(CAT, true, [0, 1, 2], 1, 1)).toBe(true);
    expect(canVisitSection(CAT, true, [0, 1, 2], 1, 0)).toBe(false);
  });
  it('lets MBA-CET move freely', () => {
    expect(canVisitSection({ nav: 'Free across sections' }, false, [0, 1, 2, 3], 0, 3)).toBe(true);
  });
});

describe('scoring', () => {
  const mcq = { type: 'MCQ' as const, correct: 'B', marksCorrect: 3, marksWrong: 1 };
  const tita = { type: 'TITA' as const, correct: '14', marksCorrect: 3, marksWrong: 0 };
  const msq = { type: 'MSQ' as const, correct: 'A|C', marksCorrect: 2, marksWrong: 0.5 };

  it('marks MCQ, TITA and MSQ answers', () => {
    expect(isCorrect(mcq, 'b')).toBe(true);
    expect(isCorrect(tita, '14.0')).toBe(true);
    expect(isCorrect(msq, 'C|A')).toBe(true);
    expect(isCorrect(msq, 'A')).toBe(false);
    expect(isCorrect(mcq, '')).toBe(null);
  });

  it('applies CAT marking: +3, −1 MCQ, 0 for wrong TITA', () => {
    const s = scoreAttempt([{ key: mcq, answer: 'B' }, { key: mcq, answer: 'A' }, { key: tita, answer: '13' }, { key: tita, answer: null }]);
    expect(s).toMatchObject({ score: 2, max: 12, correct: 1, wrong: 2, skipped: 1, accuracy: 33 });
  });

  it('applies the XAT skip penalty after 8 skips', () => {
    const key = { type: 'MCQ' as const, correct: 'A', marksCorrect: 1, marksWrong: 0.25 };
    const items = Array.from({ length: 10 }, () => ({ key, answer: null }));
    expect(scoreAttempt(items, { skipPenalty: { after: 8, value: 0.1 } }).score).toBe(-0.2);
  });
});

describe('percentile', () => {
  it('counts ties as half', () => {
    expect(percentileFromScores(50, [10, 50, 90, 50])).toBe(50);
  });
  it('interpolates the estimate curve', () => {
    const curve: [number, number][] = [[0.5, 99], [0.25, 90], [0, 20]];
    expect(percentileFromCurve(0.6, curve)).toBe(99);
    expect(percentileFromCurve(0.375, curve)).toBe(94.5);
    expect(percentileFromCurve(0, curve)).toBe(20);
  });
});
