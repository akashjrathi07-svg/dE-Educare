// Pure exam rules: timers, navigation, scoring and percentile. No database access,
// so every rule here is unit-tested (exam-logic.test.ts).

export type Rules = {
  secTimer?: boolean; lock?: boolean; chooseOrder?: boolean; calc?: boolean; tita?: boolean; review?: boolean;
  lang?: boolean; omr?: boolean; split?: boolean; nav?: string; palette?: string;
};
export type Marking = { label?: string; skipPenalty?: { after: number; value: number } };

export type TimerInput = {
  rules: Rules;
  totalMinutes: number;
  sectionMinutes: (number | null)[];   // per test section, in the test's own order
  order: number[];                      // section_order (indexes into sectionMinutes)
  startedAt: number;                    // ms
  currentPos: number;
  sectionStartedAt: number | null;      // ms
};

export type TimerState = {
  sectional: boolean;
  currentPos: number;
  sectionStartedAt: number | null;
  secondsLeft: number;
  expired: boolean;
};

/** Sectional timing applies only when the template asks for it and every section has a duration. */
export function isSectional(rules: Rules, sectionMinutes: (number | null)[]) {
  return !!rules.secTimer && sectionMinutes.length > 1 && sectionMinutes.every(m => m != null && m > 0);
}

/**
 * Server-authoritative clock. Moves through sections whose time has run out
 * (for example after the student was offline) and reports time left.
 */
export function syncTimer(t: TimerInput, now: number): TimerState {
  if (!isSectional(t.rules, t.sectionMinutes)) {
    const left = Math.ceil((t.startedAt + t.totalMinutes * 60_000 - now) / 1000);
    return { sectional: false, currentPos: 0, sectionStartedAt: null, secondsLeft: Math.max(0, left), expired: left <= 0 };
  }
  let pos = t.currentPos;
  let start = t.sectionStartedAt ?? t.startedAt;
  while (pos < t.order.length) {
    const end = start + (t.sectionMinutes[t.order[pos]] as number) * 60_000;
    if (now < end) return { sectional: true, currentPos: pos, sectionStartedAt: start, secondsLeft: Math.ceil((end - now) / 1000), expired: false };
    start = end;
    pos++;
  }
  return { sectional: true, currentPos: t.order.length, sectionStartedAt: start, secondsLeft: 0, expired: true };
}

/** Whether the student may open or answer a question in `sectionIndex` right now. */
export function canVisitSection(_rules: Rules, sectional: boolean, order: number[], currentPos: number, sectionIndex: number) {
  // Sections lock only under sectional timers; with one common timer students move freely.
  if (!sectional) return true;
  return order[currentPos] === sectionIndex;
}

export type QuestionKey = { type: 'MCQ' | 'TITA' | 'MSQ'; correct: string; marksCorrect: number; marksWrong: number };

export function normaliseAnswer(type: QuestionKey['type'], answer: string | null | undefined): string | null {
  if (answer == null) return null;
  const a = String(answer).trim();
  if (!a) return null;
  if (type === 'MSQ') return a.toUpperCase().split('|').map(s => s.trim()).filter(Boolean).sort().join('|') || null;
  if (type === 'MCQ') return a.toUpperCase();
  return a;
}

export function isCorrect(q: QuestionKey, answer: string | null): boolean | null {
  const a = normaliseAnswer(q.type, answer);
  if (a == null) return null;
  if (q.type === 'TITA') {
    const x = Number(a), y = Number(q.correct);
    if (Number.isFinite(x) && Number.isFinite(y)) return Math.abs(x - y) < 1e-9;
    return a.toLowerCase() === q.correct.trim().toLowerCase();
  }
  return a === normaliseAnswer(q.type, q.correct);
}

export function marksFor(q: QuestionKey, answer: string | null): { correct: boolean | null; marks: number } {
  const c = isCorrect(q, answer);
  if (c == null) return { correct: null, marks: 0 };
  return { correct: c, marks: c ? q.marksCorrect : -Math.abs(q.marksWrong) };
}

export type Scored = { score: number; max: number; correct: number; wrong: number; skipped: number; accuracy: number; skipPenalty: number };

export function scoreAttempt(items: { key: QuestionKey; answer: string | null }[], marking: Marking = {}): Scored {
  let score = 0, max = 0, correct = 0, wrong = 0, skipped = 0;
  for (const it of items) {
    max += it.key.marksCorrect;
    const r = marksFor(it.key, it.answer);
    score += r.marks;
    if (r.correct === true) correct++;
    else if (r.correct === false) wrong++;
    else skipped++;
  }
  let skipPenalty = 0;
  if (marking.skipPenalty && skipped > marking.skipPenalty.after) {
    skipPenalty = (skipped - marking.skipPenalty.after) * marking.skipPenalty.value;
    score -= skipPenalty;
  }
  return { score: round2(score), max: round2(max), correct, wrong, skipped, accuracy: correct + wrong ? Math.round((correct / (correct + wrong)) * 100) : 0, skipPenalty: round2(skipPenalty) };
}

/** Percentile from real attempts: share of scores below, ties counted half. */
export function percentileFromScores(score: number, others: number[]): number {
  if (!others.length) return 0;
  let below = 0, ties = 0;
  for (const s of others) { if (s < score) below++; else if (s === score) ties++; }
  return round2(((below + ties / 2) / others.length) * 100);
}

/** Estimated percentile from an exam's score-fraction curve (descending [fraction, percentile] pairs). */
export function percentileFromCurve(fraction: number, curve: [number, number][]): number {
  if (!curve.length) return 0;
  const f = Math.max(0, fraction);
  for (let i = 0; i < curve.length; i++) {
    const [hs, hp] = curve[i];
    if (f >= hs) {
      if (i === 0) return hp;
      const [us, up] = curve[i - 1];
      return round2(hp + ((f - hs) / (us - hs)) * (up - hp));
    }
  }
  return curve[curve.length - 1][1];
}

export const REAL_PERCENTILE_MIN_ATTEMPTS = 200;
export const PEER_STATS_MIN_ATTEMPTS = 50;

export function round2(n: number) { return Math.round(n * 100) / 100; }

/** XP for finishing a test (ANALYSIS_LOGIC.md · Gamification). */
export function xpForTest(type: string, questionCount: number): number {
  if (type === 'daily') return 50;
  if (type === 'full_mock' || type === 'pyq') return 150;
  if (type === 'sectional') return 60;
  return Math.max(20, Math.min(60, questionCount * 3));
}

export function levelFor(xp: number) {
  const level = Math.floor(Math.max(0, xp) / 1000) + 1;
  return { level, into: Math.max(0, xp) % 1000, toNext: 1000 - (Math.max(0, xp) % 1000) };
}
