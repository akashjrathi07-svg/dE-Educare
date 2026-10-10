'use server';
import { revalidatePath } from 'next/cache';
import { currentUser } from '@/lib/server/auth';
import { sql } from '@/lib/server/db';

const KINDS = ['tests', 'classes', 'guru'] as const;
const MAX_PHOTO = 1.5 * 1024 * 1024;

/** Saves (or edits) the student's review of one part of DE Educare. It goes live on the website after staff approve it. */
export async function submitReview(fd: FormData): Promise<{ ok: boolean; message: string }> {
  const u = await currentUser();
  if (!u) return { ok: false, message: 'Please sign in again.' };
  const kind = String(fd.get('kind'));
  const rating = Math.round(Number(fd.get('rating')));
  const body = String(fd.get('body') ?? '').trim().replace(/\s+/g, ' ');
  const name = String(fd.get('name') ?? '').trim().slice(0, 40);
  const exam = String(fd.get('exam') ?? '').trim().slice(0, 40) || null;
  const consent = fd.get('consent') === 'on';
  if (!KINDS.includes(kind as (typeof KINDS)[number])) return { ok: false, message: 'Pick what you are reviewing.' };
  if (!(rating >= 1 && rating <= 5)) return { ok: false, message: 'Pick a star rating.' };
  if (body.length < 30) return { ok: false, message: 'Please write at least a couple of sentences (30+ characters).' };
  if (body.length > 600) return { ok: false, message: 'Please keep it under 600 characters.' };
  if (!name) return { ok: false, message: 'Add the name to show with your review.' };
  if (!consent) return { ok: false, message: 'Please allow us to show your review on deeducare.com.' };

  let photo: Buffer | null = null, mime: string | null = null;
  const file = fd.get('photo');
  if (file instanceof File && file.size > 0) {
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) return { ok: false, message: 'The photo must be a JPG, PNG or WebP image.' };
    if (file.size > MAX_PHOTO) return { ok: false, message: 'The photo is too large. Please use one under 1.5 MB.' };
    photo = Buffer.from(await file.arrayBuffer());
    mime = file.type;
  }
  const removePhoto = fd.get('removePhoto') === '1';

  // Editing a review sends it back for approval.
  await sql`
    insert into reviews (user_id, kind, rating, body, display_name, exam_label, photo, photo_mime, consent)
    values (${u.id}, ${kind}, ${rating}, ${body}, ${name}, ${exam}, ${photo}, ${mime}, true)
    on conflict (user_id, kind) do update set rating = excluded.rating, body = excluded.body, display_name = excluded.display_name,
      exam_label = excluded.exam_label, consent = true, status = 'pending', reviewed_at = null, reviewed_by = null, updated_at = now(),
      photo = case when ${removePhoto} then null else coalesce(excluded.photo, reviews.photo) end,
      photo_mime = case when ${removePhoto} then null else coalesce(excluded.photo_mime, reviews.photo_mime) end`;
  revalidatePath('/review');
  return { ok: true, message: 'Thank you! Your review will appear on deeducare.com once our team checks it.' };
}
