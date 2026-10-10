/**
 * Guru coins and XP: every number of the economy lives here.
 *
 * Coins pay for Guru. Daily coins (by plan) reset at midnight IST and do not
 * carry forward. Bonus coins (from XP, prizes, streaks, staff) never expire
 * and are used after the daily coins run out.
 *
 * XP rewards effort and results. It can be turned into bonus coins
 * (100 XP = 1 coin) or into capped discount coupons in the rewards store.
 */

export const DAILY_COINS = { free: 10, test_series: 50, coaching: null } as const; // null = unlimited

export const XP_PER_COIN = 100;

/** What each Guru action costs. */
export const COIN_COST = {
  chat: 1,
  voice: 3,           // voice replies teach like a tutor: concept, example, quick check
  doubt: 2,           // photo or typed doubt with a worked solution
  analysis: { topic: 1, daily: 1, practice: 1, custom: 1, sectional: 2, full_mock: 3, pyq: 3 } as Record<string, number>,
  reportSmall: 5,     // full progress report over up to 10 tests
  reportLarge: 10,    // over more than 10 tests
  practicePer10: 1,   // practice sets: 1 coin per 10 questions
} as const;

export const COIN_LABEL: Record<string, string> = {
  chat: 'Guru chat', voice: 'Guru voice', doubt: 'Doubt solved', analysis: 'Test analysis', report: 'Progress report', practice: 'Practice set',
  xp_convert: 'Converted from XP', prize: 'Monthly prize', streak: 'Streak bonus', grant: 'Added by DE Educare', reward: 'Rewards store',
};

export function analysisCost(testType: string) {
  return COIN_COST.analysis[testType] ?? 1;
}

export function reportCost(tests: number) {
  return tests > 10 ? COIN_COST.reportLarge : COIN_COST.reportSmall;
}

export function practiceCost(questions: number) {
  return Math.max(1, Math.ceil(questions / 10)) * COIN_COST.practicePer10;
}

/** Base XP for finishing a test. Practice sets earn like topic tests. */
export const XP_BASE: Record<string, number> = { daily: 2, topic: 2, practice: 2, custom: 2, sectional: 20, full_mock: 100, pyq: 100 };

/**
 * XP for a finished test: base × accuracy multiplier, plus a percentile bonus on mocks.
 * 95%+ accuracy ×3, 85%+ ×2, 70%+ ×1.5. A 95+ percentile on a full mock adds 100.
 */
export function xpForResult(type: string, accuracy: number, percentile: number | null) {
  const base = XP_BASE[type] ?? 2;
  const mult = accuracy >= 95 ? 3 : accuracy >= 85 ? 2 : accuracy >= 70 ? 1.5 : 1;
  const pctBonus = (type === 'full_mock' || type === 'pyq') && percentile != null ? (percentile >= 99 ? 200 : percentile >= 95 ? 100 : 0) : 0;
  return Math.round(base * mult) + pctBonus;
}

export const XP_OTHER = { planner_task: 5, helpful_answer: 20 } as const;

/** Streak milestones pay bonus coins once each. */
export const STREAK_COINS: [days: number, coins: number][] = [[7, 10], [30, 50], [100, 200]];

/** Levels from lifetime XP. */
export const LEVELS: [name: string, from: number][] = [['Bronze', 0], ['Silver', 500], ['Gold', 2000], ['Platinum', 6000], ['Diamond', 15000], ['Legend', 40000]];

export function levelOf(xp: number) {
  let i = 0;
  while (i + 1 < LEVELS.length && xp >= LEVELS[i + 1][1]) i++;
  const [name, from] = LEVELS[i];
  const next = LEVELS[i + 1];
  return { name, index: i, from, next: next ? { name: next[0], at: next[1] } : null, progress: next ? Math.round(((xp - from) / (next[1] - from)) * 100) : 100 };
}

/** Monthly leaderboard prizes (per exam group, XP earned in the calendar month). */
export const MONTHLY_PRIZES: { from: number; to: number; coins: number; coupon?: { percent: number; capPaise: number; category: 'test_series' | 'coaching' }; note?: string }[] = [
  { from: 1, to: 1, coins: 500, coupon: { percent: 10, capPaise: 400000, category: 'coaching' }, note: '1:1 mentorship call' },
  { from: 2, to: 3, coins: 300, coupon: { percent: 10, capPaise: 40000, category: 'test_series' }, note: '1:1 mentorship call' },
  { from: 4, to: 10, coins: 150, note: '1:1 mentorship call' },
  { from: 11, to: 25, coins: 50, note: '1:1 mentorship call' },
];
