'use server';
import { redirect } from 'next/navigation';
import { currentUser, signOut } from '@/lib/server/auth';
import { sql } from '@/lib/server/db';

/**
 * Deletes a student's account. Personal details and personal content (Guru chats, doubts with photos, planner,
 * reviews, saved items, sessions) are removed. Paid orders and invoices are kept without a name, phone or email,
 * because tax law requires them; test scores stay only as anonymous numbers in the percentile statistics.
 */
export async function deleteMyAccount(_: unknown, form: FormData): Promise<{ error: string }> {
  const u = await currentUser();
  if (!u) redirect('/login?next=/delete-account');
  if (u.role !== 'student') return { error: 'Staff accounts are removed by an admin. Ask the DE Educare team.' };
  if (String(form.get('confirm') ?? '').trim().toUpperCase() !== 'DELETE') return { error: 'Type DELETE to confirm.' };

  await sql.begin(async tx => {
    for (const t of ['guru_messages', 'guru_usage', 'doubts', 'planner_tasks', 'reminders', 'saved_items', 'reviews', 'live_hands', 'live_messages', 'post_votes', 'progress_reports', 'batch_members', 'test_unlocks'] as const) {
      await tx`delete from ${tx(t)} where user_id = ${u.id}`;
    }
    await tx`update entitlements set ends_at = now() where user_id = ${u.id} and (ends_at is null or ends_at > now())`;
    await tx`update users set phone = ${'deleted:' + u.id}, name = null, email = null, city = null, target_exam = null, target_year = null,
      target_percentile = null, guru_credits = 0, onboarded = false where id = ${u.id}`;
    await tx`delete from sessions where user_id = ${u.id}`;
  });
  await signOut();
  redirect('/delete-account?done=1');
}
