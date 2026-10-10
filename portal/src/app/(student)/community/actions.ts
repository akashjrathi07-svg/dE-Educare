'use server';
import { XP_OTHER } from '@/lib/economy';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { currentUser } from '@/lib/server/auth';
import { sql } from '@/lib/server/db';
import { awardXp } from '@/lib/server/xp';
import { CHANNELS } from './channels';

export async function createPost(form: FormData) {
  const u = await currentUser();
  if (!u) redirect('/login');
  const title = String(form.get('title') ?? '').trim().slice(0, 200);
  const body = String(form.get('body') ?? '').trim().slice(0, 4000);
  const list = CHANNELS[u.exam_group] ?? CHANNELS.mba;
  const ch = String(form.get('channel') ?? '');
  if (!title) return;
  const [recent] = await sql`select count(*)::int as n from community_posts where user_id = ${u.id} and created_at > now() - interval '1 hour'`;
  if (recent.n >= 10) return;
  await sql`insert into community_posts (user_id, exam_group, channel, title, body) values (${u.id}, ${u.exam_group}, ${list.includes(ch) ? ch : list[1]}, ${title}, ${body || null})`;
  revalidatePath('/community');
}

export async function toggleVote(postId: string) {
  const u = await currentUser();
  if (!u) return;
  const del = await sql`delete from post_votes where post_id = ${postId} and user_id = ${u.id} returning 1`;
  if (!del.length) await sql`insert into post_votes (post_id, user_id) select id, ${u.id} from community_posts where id = ${postId} on conflict do nothing`;
  revalidatePath('/community');
}

export async function answerPost(form: FormData) {
  const u = await currentUser();
  if (!u) redirect('/login');
  const postId = String(form.get('post'));
  const body = String(form.get('body') ?? '').trim().slice(0, 4000);
  if (body) await sql`insert into community_answers (post_id, user_id, body) select id, ${u.id}, ${body} from community_posts where id = ${postId}`;
  revalidatePath(`/community/${postId}`);
}

/** The person who asked marks an answer helpful: +20 XP to whoever answered. */
export async function markHelpful(answerId: string) {
  const u = await currentUser();
  if (!u) return;
  const [a] = await sql`
    update community_answers ca set helpful = true from community_posts p
    where ca.id = ${answerId} and p.id = ca.post_id and p.user_id = ${u.id} and ca.user_id <> ${u.id} and not ca.helpful
    returning ca.user_id, ca.post_id`;
  if (a) await awardXp(a.user_id, 'helpful_answer', XP_OTHER.helpful_answer, answerId);
  if (a) revalidatePath(`/community/${a.post_id}`);
}
