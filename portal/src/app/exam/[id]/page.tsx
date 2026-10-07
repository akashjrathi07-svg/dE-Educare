import { redirect } from 'next/navigation';
import { requireUser } from '@/lib/server/auth';
import { attemptState } from '@/lib/server/attempts';
import { ExamWindow } from './exam-window';

export const metadata = { title: 'Exam' };

export default async function ExamPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const u = await requireUser(`/exam/${id}`);
  if (!/^[0-9a-f-]{36}$/i.test(id)) redirect('/tests');
  const s = await attemptState(id, u.id);
  if (!s) redirect('/tests');
  if (s.submitted) redirect(`/results/${id}`);
  return <ExamWindow initial={s} />;
}
