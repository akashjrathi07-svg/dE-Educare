'use server';
import crypto from 'node:crypto';
import { currentUser, canAccess } from '@/lib/server/auth';
import { sql } from '@/lib/server/db';

const TYPES: Record<string, string> = { 'image/png': 'png', 'image/jpeg': 'jpg', 'image/gif': 'gif', 'image/webp': 'webp' };
const MAX = 4 * 1024 * 1024;

/** Stores one image from an uploaded Word file and returns its /media URL (the same image is stored once). */
export async function uploadImage(fd: FormData): Promise<{ ok: true; url: string } | { ok: false; message: string }> {
  const u = await currentUser();
  if (!u || !(canAccess(u.role, 'bank') || canAccess(u.role, 'tests'))) return { ok: false, message: 'Not allowed' };
  const file = fd.get('file');
  if (!(file instanceof Blob)) return { ok: false, message: 'No image' };
  if (file.size > MAX) return { ok: false, message: 'Image larger than 4 MB' };
  const bytes = Buffer.from(await file.arrayBuffer());
  // Trust the bytes, not the name: PNG, JPEG, GIF or WebP only.
  const mime = bytes.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) ? 'image/png'
    : bytes[0] === 0xff && bytes[1] === 0xd8 ? 'image/jpeg'
    : bytes.subarray(0, 4).toString() === 'GIF8' ? 'image/gif'
    : bytes.subarray(0, 4).toString() === 'RIFF' && bytes.subarray(8, 12).toString() === 'WEBP' ? 'image/webp' : '';
  if (!TYPES[mime]) return { ok: false, message: 'Images must be PNG, JPEG, GIF or WebP' };
  const sha = crypto.createHash('sha256').update(bytes).digest('hex');
  const [row] = await sql`insert into media (mime, bytes, sha256) values (${mime}, ${bytes}, ${sha})
    on conflict (sha256) do update set sha256 = excluded.sha256 returning id`;
  return { ok: true, url: '/media/' + row.id };
}
