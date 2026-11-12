'use server';
import { revalidatePath } from 'next/cache';
import { staffOrThrow, createUser, normalisePhone } from '@/lib/server/auth';
import { sql } from '@/lib/server/db';
import { parseFingerprints, setSettings } from '@/lib/server/settings';

/**
 * Saves the Android app settings. The review number gets an account named "Play Store review" with the
 * CAT Test Series and SNAP 15 Mocks unlocked, so Google's reviewers can see the paid tests.
 */
export async function saveAppSettings(f: { fingerprints: string; reviewPhone: string; reviewOtp: string }) {
  const me = await staffOrThrow('app');
  const prints = parseFingerprints(f.fingerprints);
  if (f.fingerprints.trim() && !prints.length) return { ok: false, message: 'That is not a SHA-256 fingerprint. It looks like AB:CD:… with 32 pairs.' };
  const phone = f.reviewPhone.trim() ? normalisePhone(f.reviewPhone) : '';
  if (phone === null) return { ok: false, message: 'Enter a valid 10-digit mobile number for the review login.' };
  const otp = f.reviewOtp.trim();
  if (phone && !/^\d{6}$/.test(otp)) return { ok: false, message: 'The review code must be 6 digits.' };
  await setSettings({ android_sha256: prints.join(','), review_phone: phone, review_otp: phone ? otp : '' }, me.id);
  const done = [prints.length ? `${prints.length} fingerprint${prints.length > 1 ? 's' : ''} saved` : 'no fingerprints'];
  if (phone) {
    const [u] = await createUser(phone);
    await sql`update users set name = coalesce(nullif(name, ''), 'Play Store review'), onboarded = true,
      target_exam = coalesce(target_exam, 'CAT'), exam_group = 'mba' where id = ${u.id}`;
    const courses = await sql`select id, name from courses where slug in ('cat-ts', 'om-single') and status = 'live'`;
    for (const c of courses) {
      const [has] = await sql`select 1 from entitlements where user_id = ${u.id} and course_id = ${c.id} and (ends_at is null or ends_at > now())`;
      if (!has) await sql`insert into entitlements (user_id, course_id, ends_at, source) values (${u.id}, ${c.id}, now() + interval '12 months', 'grant')`;
    }
    done.push('review login ready with ' + courses.map(c => c.name).join(' and '));
  }
  revalidatePath('/admin/app');
  return { ok: true, message: 'Saved · ' + done.join(' · ') };
}
