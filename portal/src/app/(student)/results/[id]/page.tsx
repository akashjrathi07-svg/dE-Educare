import Link from 'next/link';
import { notFound } from 'next/navigation';
import { requireUser } from '@/lib/server/auth';
import { sql } from '@/lib/server/db';
import { attemptReport } from '@/lib/server/attempts';
import { analyse, fmt, type AnalysedQuestion } from '@/lib/analysis';
import { PEER_STATS_MIN_ATTEMPTS } from '@/lib/exam-logic';
import { ResultTabs } from './result-tabs';
import { analysisCost } from '@/lib/economy';
import { GuruButton, AiAnalysis } from './result-client';

export const metadata = { title: 'Result and analysis' };

export default async function Result({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const u = await requireUser(`/results/${id}`);
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const r = await attemptReport(id, u.id, ['admin', 'faculty', 'content', 'support'].includes(u.role));
  if (!r) notFound();
  const { attempt: a, bundle: b, answers, stats, histMap, solutionsOpen } = r;
  const topicNodes = await sql`select name, id from catalog_nodes where exam_id = ${b.test.exam_id} and id like '%tp-%' and not exists (select 1 from catalog_nodes c where c.parent_id = catalog_nodes.id)`;
  const nodeOf = new Map(topicNodes.map(n => [n.name, n.id]));
  const sectionNames = new Map(b.sections.map(s => [s.id, s.name]));

  const qs: AnalysedQuestion[] = b.questions.map((q, i) => {
    const ans = answers.get(q.id);
    const st = stats.get(q.id);
    const peer = st && st.attempts >= PEER_STATS_MIN_ATTEMPTS ? { avg: Number(st.avg_time_sec), topper: st.topper_time_sec != null ? Number(st.topper_time_sec) : null, acc: Math.round(Number(st.peer_accuracy_pct)) } : null;
    return {
      n: i + 1, questionId: q.id, sectionId: q.test_section_id, section: sectionNames.get(q.test_section_id) ?? '', topic: q.topic ?? 'General', topicNode: nodeOf.get(q.topic) ?? null,
      difficulty: q.difficulty, type: q.type, text: q.text, setText: q.set_text, options: q.options, correct: q.correct,
      answer: ans?.answer ?? null, result: ans?.is_correct === true ? 'ok' : ans?.is_correct === false ? 'bad' : 'skip', marks: Number(ans?.marks ?? 0),
      time: ans?.time_spent_sec ?? 0, ideal: q.ideal_time_sec, peer, solution: q.solution_text, video: q.solution_video_url, topicHistory: histMap.get(q.topic) ?? null,
    };
  });
  const data = analyse(qs);
  if (!solutionsOpen) for (const row of data.timeRows) { row.solution = null; row.right = 'Shown after the test window closes'; }
  const [{ total }] = await sql`select count(*)::int as total from attempts where test_id = ${a.test_id} and status = 'submitted'`;

  const practice = b.test.type === 'practice';
  const hero = [
    { k: 'Score', v: String(Number(a.score)), u: '/ ' + Number(a.max_score) },
    ...(practice ? [] : [{ k: a.percentile_estimated ? 'Est. percentile' : 'Percentile', v: Number(a.percentile).toFixed(1), u: '%ile' }]),
    { k: 'Accuracy', v: a.accuracy + '%', u: '' },
    { k: 'Attempted', v: String(a.correct + a.wrong), u: '/ ' + b.questions.length },
    ...(practice ? [] : [{ k: 'Rank', v: a.rank == null ? '—' : '#' + a.rank, u: a.rank == null ? 'not ranked' : 'of ' + total }]),
    { k: 'Time', v: fmt(a.time_sec ?? 0), u: '' },
  ];
  const weakest = [...data.sections].sort((x, y) => x.acc - y.acc)[0];

  return (
    <>
      <div className="head">
        <div className="stack" style={{ '--gap': '4px' } as React.CSSProperties}>
          <div className="kicker">{a.test_name} · {new Date(a.submitted_at).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit', timeZone: 'Asia/Kolkata' })}</div>
          <h1 className="h1">Result and analysis</h1>
        </div>
        <div className="row">
          <Link href={`/test/${a.test_slug}`} className="btn ghost">Retake</Link>
          <GuruButton text={`Analyse my ${a.test_name} result: ${Number(a.percentile).toFixed(1)} %ile, ${weakest?.name ?? 'one section'} was weakest at ${weakest?.acc ?? 0}% accuracy. What should I fix first?`} label="Ask Guru to analyse" />
        </div>
      </div>

      <div className="hero res-hero">
        {hero.map(h => <div key={h.k} className="stack" style={{ '--gap': '6px' } as React.CSSProperties}><div className="k">{h.k}</div><div className="v">{h.v}{h.u && <small> {h.u}</small>}</div></div>)}
      </div>
      {a.percentile_estimated && !practice && <p className="note" style={{ marginTop: -12 }}>Percentile is estimated from recent score trends until 200 students have taken this test. Rank is among {total} attempt{total === 1 ? '' : 's'} so far.</p>}

      <div className="ai-box">
        <span className="orb" />
        <div className="stack" style={{ flex: 1, minWidth: 240, '--gap': '3px' } as React.CSSProperties}>
          <span style={{ fontSize: 12, fontWeight: 800, color: 'var(--priInk)' }}>Guru’s take</span>
          <span style={{ fontSize: 14, lineHeight: 1.55, fontWeight: 600 }}>{data.guruTake}</span>
        </div>
        <GuruButton text={`Build me a 7-day fix plan after ${a.test_name}. ${data.guruTake}`} label="Build my fix plan" soft />
      </div>
      <AiAnalysis attemptId={id} text={a.ai_analysis} cost={analysisCost(b.test.type)} />

      <ResultTabs data={data} solutionsOpen={solutionsOpen} percentile={b.test.type === 'practice' ? Math.round((100 * a.correct) / Math.max(1, b.questions.length)) : Number(a.percentile)} practice={b.test.type === 'practice'} />
    </>
  );
}
