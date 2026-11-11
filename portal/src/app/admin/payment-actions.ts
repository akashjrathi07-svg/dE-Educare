'use server';
import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { staffOrThrow } from '@/lib/server/auth';
import { syncUnpaidOrders } from '@/lib/server/payments';

/** Admin → Overview: asks Razorpay about every unconfirmed checkout of the last 60 days and unlocks the paid ones. */
export async function checkPayments() {
  const u = await staffOrThrow('courses');
  if (u.role !== 'admin') throw new Error('Not allowed');
  const n = await syncUnpaidOrders();
  revalidatePath('/admin');
  redirect('/admin?unlocked=' + n);
}
