import { requireUser } from '@/lib/server/auth';
import { ensureWeek, weekTasks, weekStart, todayIST } from '@/lib/server/planner';
import { PlannerTask } from '@/components/planner-task';
import { ReplanButton } from './replan-button';

export const metadata = { title: 'Study planner' };
const DAY = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

export default async function Planner() {
  const u = await requireUser('/planner');
  await ensureWeek(u.id, u.exam_group);
  const tasks = await weekTasks(u.id);
  const start = weekStart();
  const today = todayIST();
  const days = DAY.map((d, i) => {
    const date = new Date(Date.parse(start) + i * 86400000).toISOString().slice(0, 10);
    return { d, date, n: Number(date.slice(8)), tasks: tasks.filter(t => t.day === date) };
  });
  const done = tasks.filter(t => t.done).length;
  const label = (iso: string) => new Date(iso + 'T00:00:00Z').toLocaleDateString('en-IN', { day: 'numeric', month: 'short', timeZone: 'UTC' });
  return (
    <>
      <div className="head">
        <div className="stack" style={{ '--gap': '4px' } as React.CSSProperties}>
          <div className="kicker">{label(start)} – {label(days[6].date)} · {done} of {tasks.length} tasks done · +10 XP per task</div>
          <h1 className="h1">Study planner</h1>
        </div>
        <ReplanButton />
      </div>
      <div style={{ overflowX: 'auto', scrollbarWidth: 'none' }}>
        <div className="week">
          {days.map(day => {
            const isToday = day.date === today;
            return (
              <div key={day.date} className="stack" style={{ '--gap': '8px' } as React.CSSProperties}>
                <div className="row" style={{ justifyContent: 'space-between', alignItems: 'baseline', padding: '10px 12px', borderRadius: 12, background: isToday ? 'var(--pri)' : 'var(--card)', color: isToday ? '#fff' : 'var(--ink)', border: isToday ? 0 : '1px solid var(--line)' }}>
                  <span style={{ fontSize: 12, fontWeight: 800, textTransform: 'uppercase' }}>{day.d}</span><span style={{ font: '800 18px var(--sans)' }}>{day.n}</span>
                </div>
                {day.tasks.map(t => <PlannerTask key={t.id} task={t as never} variant="card" locked={day.date < today} />)}
              </div>
            );
          })}
        </div>
      </div>
      <p className="note">Past days are locked. Tick a task when you finish it; Guru uses your planner to suggest what to do next.</p>
    </>
  );
}
