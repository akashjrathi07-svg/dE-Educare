import 'server-only';
import { sql } from './db';

export type Plan = { id: string; slug: string; name: string; price_paise: number; status: string };

/** Course ids the user can use right now (paid, granted or rewarded). */
export async function activeCourseIds(userId: string): Promise<string[]> {
  const rows = await sql`select distinct course_id from entitlements where user_id = ${userId} and starts_at <= now() and (ends_at is null or ends_at > now())`;
  return rows.map(r => r.course_id as string);
}

export async function hasUnlimitedGuru(userId: string): Promise<boolean> {
  const [r] = await sql`
    select 1 from entitlements e join courses c on c.id = e.course_id
    where e.user_id = ${userId} and c.guru_quota = 'unlimited' and e.starts_at <= now() and (e.ends_at is null or e.ends_at > now()) limit 1`;
  return !!r;
}

export async function dailyGuruLimit(userId: string): Promise<number | null> {
  const rows = await sql`
    select c.guru_quota from entitlements e join courses c on c.id = e.course_id
    where e.user_id = ${userId} and e.starts_at <= now() and (e.ends_at is null or e.ends_at > now())`;
  const q = rows.map(r => r.guru_quota as string);
  if (q.includes('unlimited')) return null;
  return q.includes('50/day') ? 50 : 10;
}

/** Ids of tests (from the given list) this user may take, plus the cheapest plan for each locked one. */
export async function testAccessMap(userId: string | null, testIds: string[]) {
  const open = new Set<string>();
  const plans = new Map<string, Plan>();
  if (!testIds.length) return { open, plans };
  const free = await sql`select id from tests where id = any(${testIds}) and is_free`;
  free.forEach(r => open.add(r.id));
  if (userId) {
    const viaPlan = await sql`
      select distinct ct.test_id from course_tests ct
      join entitlements e on e.course_id = ct.course_id and e.user_id = ${userId} and e.starts_at <= now() and (e.ends_at is null or e.ends_at > now())
      where ct.test_id = any(${testIds})`;
    viaPlan.forEach(r => open.add(r.test_id));
    const unlocked = await sql`select test_id from test_unlocks where user_id = ${userId} and test_id = any(${testIds})`;
    unlocked.forEach(r => open.add(r.test_id));
  }
  const locked = testIds.filter(id => !open.has(id));
  if (locked.length) {
    const rows = await sql`
      select distinct on (ct.test_id) ct.test_id, c.id, c.slug, c.name, c.price_paise, c.status
      from course_tests ct join courses c on c.id = ct.course_id
      where ct.test_id = any(${locked})
      order by ct.test_id, (c.status = 'live') desc, c.price_paise asc`;
    rows.forEach(r => plans.set(r.test_id, { id: r.id, slug: r.slug, name: r.name, price_paise: r.price_paise, status: r.status }));
  }
  return { open, plans };
}

export async function canTakeTest(userId: string, testId: string) {
  const { open, plans } = await testAccessMap(userId, [testId]);
  return { allowed: open.has(testId), plan: plans.get(testId) ?? null };
}

/** Unused free-test credits (from XP milestones or the rewards store). */
export async function availableCredits(userId: string) {
  const rows = await sql`select kind, count(*)::int as n from test_credits where user_id = ${userId} and used_test_id is null group by kind`;
  return { mock: rows.find(r => r.kind === 'mock')?.n ?? 0, sectional: rows.find(r => r.kind === 'sectional')?.n ?? 0 };
}

/** Spend one credit to unlock a test for good. Mock credits also work on sectionals. */
export async function useCreditOn(userId: string, testId: string): Promise<boolean> {
  return sql.begin(async tx => {
    const [t] = await tx`select type from tests where id = ${testId}`;
    if (!t || !['full_mock', 'sectional'].includes(t.type)) return false;
    const kinds = t.type === 'full_mock' ? ['mock'] : ['sectional', 'mock'];
    const [c] = await tx`
      select id from test_credits where user_id = ${userId} and used_test_id is null and kind = any(${kinds})
      order by (kind = 'sectional') desc, created_at limit 1 for update skip locked`;
    if (!c) return false;
    await tx`update test_credits set used_test_id = ${testId}, used_at = now() where id = ${c.id}`;
    await tx`insert into test_unlocks (user_id, test_id) values (${userId}, ${testId}) on conflict do nothing`;
    return true;
  });
}
