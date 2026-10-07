import Link from 'next/link';
import { requireUser } from '@/lib/server/auth';
import { sql } from '@/lib/server/db';
import { activeCourseIds } from '@/lib/server/access';
import { streakOf, myRank } from '@/lib/server/xp';
import { ensureWeek, todayIST } from '@/lib/server/planner';
import { PlannerTask } from '@/components/planner-task';

export const metadata = { title: 'Dashboard' };

export default async function Dashboard() {
  const u = await requireUser('/');
  const exam = (await sql`select code, name, exam_date, status from exams where code = ${u.target_exam ?? 'CAT'}`)[0];
  const days = exam?.exam_date ? Math.max(0, Math.ceil((new Date(exam.exam_date).getTime() - Date.now()) / 86400000)) : null;
  const [last] = await sql`
    select a.id, a.score::float, a.max_score::float, a.percentile::float, t.name from attempts a join tests t on t.id = a.test_id
    where a.user_id = ${u.id} and a.status = 'submitted' and t.type in ('full_mock','pyq') order by a.submitted_at desc limit 1`;
  const [avg] = await sql`select avg(a.percentile)::float as p, count(*)::int as n from attempts a join tests t on t.id = a.test_id where a.user_id = ${u.id} and a.status = 'submitted' and t.type in ('full_mock','pyq')`;
  const streak = await streakOf(u.id);
  const rank = await myRank(u.id, 'week', u.exam_group);
  const paid = (await activeCourseIds(u.id)).length > 0;
  const inProgress = await sql`
    select a.id, t.name, t.slug, (select count(*) from test_questions where test_id = t.id)::int as total,
      (select count(*) from attempt_answers where attempt_id = a.id and answer is not null)::int as answered
    from attempts a join tests t on t.id = a.test_id where a.user_id = ${u.id} and a.status = 'in_progress' order by a.started_at desc limit 3`;
  // Recommendation: the topic test for the student's most recent wrong topic.
  const [weak] = await sql`
    select tp.name as topic, t.slug, t.name from attempt_answers aa join attempts a on a.id = aa.attempt_id
    join questions q on q.id = aa.question_id join topics tp on tp.id = q.topic_id
    join tests t on t.type = 'topic' and t.name like tp.name || ' · Test%' and t.status = 'live'
    where a.user_id = ${u.id} and aa.is_correct = false order by a.submitted_at desc, t.sort limit 1`;
  const [live] = await sql`
    select id, title, faculty_name, starts_at, duration_min, starts_at <= now() as on_air from live_classes
    where exam_group = ${u.exam_group} and not cancelled and starts_at + (duration_min || ' minutes')::interval > now() order by starts_at limit 1`;
  await ensureWeek(u.id, u.exam_group);
  const today = await sql`select id, title, meta, tag, done from planner_tasks where user_id = ${u.id} and day = ${todayIST()}::date order by sort`;

  const hour = new Date(Date.now() + 5.5 * 3600_000).getUTCHours();
  const greet = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
  const dateLabel = new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'Asia/Kolkata' });
  const examLabel = `${exam?.name ?? 'CAT'}${u.target_year ? ' ' + u.target_year : ''}`;
  const soon = exam?.status === 'soon';

  const stats = [
    { k: 'Days to exam', v: days != null ? String(days) : '—', u: '', s: examLabel, cls: 'hero' },
    { k: 'Percentile', v: last ? Number(last.percentile).toFixed(1) : '—', u: last ? '%ile' : '', s: last ? `Last mock · target ${u.target_percentile ?? 99}` : 'Take a mock to see it' },
    { k: 'Mock score', v: last ? String(Math.round(last.score)) : '—', u: last ? '/ ' + last.max_score : '', s: avg?.n ? `Avg ${Number(avg.p).toFixed(1)} %ile over ${avg.n} mock${avg.n > 1 ? 's' : ''}` : 'No mocks yet' },
    { k: 'Streak', v: String(streak.current), u: 'days', s: `Best: ${streak.best} days`, cls: 'streak' },
    { k: 'Rank', v: rank.xp ? '#' + rank.rank.toLocaleString('en-IN') : '—', u: '', s: 'This week by XP' },
  ];

  return (
    <>
      <header className="head">
        <div className="stack" style={{ '--gap': '4px' } as React.CSSProperties}>
          <div className="kicker">{dateLabel} · {examLabel}</div>
          <h1 className="h1 xl">{greet}, {(u.name ?? 'there').split(' ')[0]}</h1>
        </div>
        <Link href="/tests" className="btn ghost">Browse all tests →</Link>
      </header>

      <div className="grid" style={{ '--min': '160px' } as React.CSSProperties}>
        {stats.map(s => (
          <div key={s.k} className={'stat ' + (s.cls ?? '')}>
            <div className="k">{s.k}</div>
            <div className="v">{s.v}{s.u && <small> {s.u}</small>}</div>
            <div className="s">{s.s}</div>
          </div>
        ))}
      </div>

      <div className="grid" style={{ '--min': '320px', '--gap': '16px' } as React.CSSProperties}>
        <div className="hero stack" style={{ '--gap': '18px' } as React.CSSProperties}>
          <div className="row" style={{ justifyContent: 'space-between' }}>
            <span className="eyebrow" style={{ color: 'var(--amber)', fontSize: 11 }}>Daily free test</span>
            <span style={{ fontSize: 12, fontWeight: 800, padding: '5px 10px', borderRadius: 999, background: 'rgba(255,255,255,.14)' }}>+50 XP · keeps streak</span>
          </div>
          <div className="stack" style={{ '--gap': '6px' } as React.CSSProperties}>
            <div style={{ font: '800 30px/1.1 var(--sans)', letterSpacing: '-.03em' }}>{soon ? `${exam?.name} is launching soon` : `Today’s ${exam?.name ?? 'CAT'} test`}</div>
            <div style={{ fontSize: 14, color: 'rgba(255,255,255,.75)' }}>{soon ? 'Practise CAT and MBA-CET meanwhile.' : `5 questions · 10 min · ${exam?.name ?? 'CAT'} pattern · new every morning`}</div>
          </div>
          {!soon && <Link href={`/daily/${exam?.code ?? 'CAT'}`} className="btn white" style={{ alignSelf: 'flex-start', padding: '12px 20px' }}>Start test</Link>}
        </div>
        <div className="card r22" style={{ overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
          <div className="stripes" style={{ position: 'relative', height: 150 }}>
            {live && <span className="tag live" style={{ position: 'absolute', top: 12, left: 12 }}>{live.on_air ? 'LIVE NOW' : 'NEXT CLASS'}</span>}
            <span className="mono faint" style={{ position: 'absolute', bottom: 10, right: 12, fontSize: 11 }}>class stream</span>
          </div>
          <div className="row" style={{ padding: '16px 18px', justifyContent: 'space-between', flexWrap: 'nowrap' }}>
            {live ? (
              <>
                <div className="stack" style={{ '--gap': '2px' } as React.CSSProperties}>
                  <div style={{ fontSize: 16, fontWeight: 800 }}>{live.title}</div>
                  <div className="muted" style={{ fontSize: 13 }}>{live.faculty_name} · {live.on_air ? 'on air now' : new Date(live.starts_at).toLocaleString('en-IN', { weekday: 'short', hour: 'numeric', minute: '2-digit', timeZone: 'Asia/Kolkata' })}</div>
                </div>
                <Link href={`/live/${live.id}`} className="btn strong md">{live.on_air ? 'Join' : 'Details'}</Link>
              </>
            ) : <div className="muted" style={{ fontSize: 14 }}>No live classes scheduled. Recordings are in your library.</div>}
          </div>
        </div>
      </div>

      <div className="grid" style={{ '--min': '320px', '--gap': '16px' } as React.CSSProperties}>
        <section className="stack">
          <h2 className="h2">Continue</h2>
          <div className="list">
            {inProgress.map(a => {
              const pct = a.total ? Math.round((a.answered / a.total) * 100) + '%' : '0%';
              return (
                <Link key={a.id} href={`/exam/${a.id}`} className="list-row">
                  <div className="stack" style={{ flex: 1, '--gap': '6px' } as React.CSSProperties}>
                    <div className="row" style={{ justifyContent: 'space-between' }}><span style={{ fontSize: 14, fontWeight: 800 }}>{a.name}</span><span className="mono muted" style={{ fontSize: 12 }}>{pct}</span></div>
                    <div className="bar thin"><i style={{ width: pct }} /></div>
                    <div className="muted" style={{ fontSize: 12 }}>{a.answered} of {a.total} answered · resume where you left off</div>
                  </div>
                </Link>
              );
            })}
            {weak && (
              <Link href={`/test/${weak.slug}`} className="list-row">
                <div className="stack" style={{ flex: 1, '--gap': '6px' } as React.CSSProperties}>
                  <div className="row" style={{ justifyContent: 'space-between' }}><span style={{ fontSize: 14, fontWeight: 800 }}>{weak.name}</span><span className="mono muted" style={{ fontSize: 12 }}>0%</span></div>
                  <div className="bar thin"><i style={{ width: 0 }} /></div>
                  <div className="muted" style={{ fontSize: 12 }}>Recommended by Guru · you missed {weak.topic} recently</div>
                </div>
              </Link>
            )}
            {!inProgress.length && !weak && <div className="list-row muted" style={{ fontSize: 14 }}>Nothing in progress. Start with today’s free test or a full mock.</div>}
          </div>
        </section>
        <section className="stack">
          <div className="row" style={{ justifyContent: 'space-between', alignItems: 'baseline' }}>
            <h2 className="h2">Today’s plan</h2>
            <Link href="/planner" className="link">Open planner →</Link>
          </div>
          <div className="list">
            {today.map(t => <PlannerTask key={t.id} task={{ id: t.id, title: t.title, meta: t.meta, tag: t.tag, done: t.done }} variant="row" />)}
          </div>
        </section>
      </div>

      {!paid && (
        <div className="card r22 row" style={{ padding: '22px 24px', justifyContent: 'space-between', gap: 20 }}>
          <div className="stack" style={{ '--gap': '4px' } as React.CSSProperties}>
            <div style={{ fontSize: 18, fontWeight: 800 }}>Unlock the CAT Test Series</div>
            <div className="muted" style={{ fontSize: 14 }}>20 mocks · 30 sectionals · topic tests for every chapter · unlimited Guru</div>
          </div>
          <Link href="/plans" className="btn">See plans</Link>
        </div>
      )}
    </>
  );
}
