'use server';
import { revalidatePath } from 'next/cache';
import { staffOrThrow } from '@/lib/server/auth';
import { sql } from '@/lib/server/db';

export async function setReviewStatus(id: string, status: 'approved' | 'rejected' | 'pending') {
  const u = await staffOrThrow('reviews');
  await sql`update reviews set status = ${status}, reviewed_by = ${u.id}, reviewed_at = now() where id = ${id}`;
  revalidatePath('/admin/reviews');
  return { ok: true, message: status === 'approved' ? 'Approved · shows on deeducare.com within 10 minutes' : status === 'rejected' ? 'Hidden from the website' : 'Moved back to pending' };
}

export async function removeReviewPhoto(id: string) {
  await staffOrThrow('reviews');
  await sql`update reviews set photo = null, photo_mime = null where id = ${id}`;
  revalidatePath('/admin/reviews');
  return { ok: true, message: 'Photo removed' };
}

/** Light edits only (typos, a surname to an initial). The meaning must stay the student's. */
export async function editReview(id: string, name: string, exam: string) {
  await staffOrThrow('reviews');
  const n = name.trim().slice(0, 40);
  if (!n) return { ok: false, message: 'Name is required' };
  await sql`update reviews set display_name = ${n}, exam_label = ${exam.trim().slice(0, 40) || null} where id = ${id}`;
  revalidatePath('/admin/reviews');
  return { ok: true, message: 'Saved' };
}
