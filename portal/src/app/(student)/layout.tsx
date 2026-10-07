import { requireUser } from '@/lib/server/auth';
import { shellData } from '@/lib/server/shell';
import { Sidebar } from '@/components/sidebar';
import { Guru } from '@/components/guru';

export default async function StudentLayout({ children }: { children: React.ReactNode }) {
  const u = await requireUser();
  const s = await shellData(u);
  return (
    <div className="shell">
      <Sidebar data={s} />
      <main className="main"><div className="page">{children}</div></main>
      <Guru firstName={(u.name ?? 'there').split(' ')[0]} quota={s.guru} />
    </div>
  );
}
