'use server';
import { revalidatePath } from 'next/cache';
import { currentUser } from '@/lib/server/auth';
import { sql } from '@/lib/server/db';
import { askClaude, consumeGuru } from '@/lib/server/guru';
import { refundCoins } from '@/lib/server/coins';
import { COIN_COST } from '@/lib/economy';

const TYPES = ['image/png', 'image/jpeg', 'image/webp', 'image/gif'] as const;
const MAX_BYTES = 5 * 1024 * 1024;

export async function solveDoubt(form: FormData): Promise<{ answer?: string; error?: string }> {
  const u = await currentUser();
  if (!u) return { error: 'Please sign in again.' };
  const text = String(form.get('text') ?? '').trim().slice(0, 2000);
  const file = form.get('image');
  const img = file instanceof File && file.size > 0 ? file : null;
  if (!text && !img) return { error: 'Add an image or type your doubt.' };
  if (img && (!TYPES.includes(img.type as (typeof TYPES)[number]) || img.size > MAX_BYTES)) return { error: 'Upload a PNG, JPG or WebP image under 5 MB.' };
  const quota = await consumeGuru(u.id, COIN_COST.doubt, 'doubt');
  if (!quota.ok) return { error: quota.message };

  const content: Parameters<typeof askClaude>[1][number]['content'] = [];
  if (img) content.push({ type: 'image', source: { type: 'base64', media_type: img.type as (typeof TYPES)[number], data: Buffer.from(await img.arrayBuffer()).toString('base64') } });
  content.push({ type: 'text', text: (img ? 'The question is in the image. ' : '') + 'Student note: ' + (text || 'Please solve this.') });
  const FALLBACK = 'Guru could not reach the AI service just now. Your coins were returned; please try again in a minute.';
  const answer = await askClaude(
    'You are Guru, a patient exam tutor for CAT, MBA-CET, OMETs and other competitive exams. Solve step by step in plain text with numbered steps, under 160 words. End with the answer and one shortcut tip. If the image is unreadable or not a question, say so briefly and ask for a clearer photo.',
    [{ role: 'user', content }],
    FALLBACK,
    { maxTokens: 6000, effort: 'medium' },
  );
  if (answer === FALLBACK) { await refundCoins(u.id, quota.spent, 'doubt'); return { error: FALLBACK }; }
  await sql`insert into doubts (user_id, question, had_image, answer) values (${u.id}, ${text || null}, ${!!img}, ${answer})`;
  revalidatePath('/doubts');
  return { answer };
}
