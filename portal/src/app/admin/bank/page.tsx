import Link from 'next/link';
import { requireStaff } from '@/lib/server/auth';
import { sql } from '@/lib/server/db';
import { examRefs } from '@/lib/server/admin';
import { PEER_STATS_MIN_ATTEMPTS } from '@/lib/exam-logic';
import { Head } from '../ui';
import { BankTools, ReportActions } from './bank-client';

type SP = { q?: string; exam?: string; sec?: string; diff?: string; reported?: string; nosol?: string; add?: string; edit?: string; import?: string; page?: string };

const LEGEND: [string, string, string, string][] = [
  ['question_id', 'No', 'Leave blank for new questions. Fill to update an existing one.', '—'], ['exam', 'Yes', 'CAT, MBA-CET, SNAP, NMAT, XAT, CMAT, UPSC-PRE, IBPS-PO, IPMAT', 'Test builder, interface'],
  ['section', 'Yes', 'Section code or name, e.g. QA or Quant (QA)', 'Section-wise report'], ['topic', 'Yes', 'From the topic list', 'Topic-wise report, SWOT'], ['subtopic', 'No', 'Free text', 'Topic drill-down'],
  ['type', 'Yes', 'MCQ, TITA, MSQ', 'Answer input'], ['difficulty', 'Yes', 'Easy, Medium, Hard', 'Difficulty report, SWOT'], ['ideal_time_sec', 'Yes', 'Seconds, e.g. 90', 'Time analysis'],
  ['marks_correct', 'Yes', 'e.g. 3', 'Score'], ['marks_wrong', 'Yes', 'e.g. 1, or 0 for TITA', 'Score'], ['set_id', 'No', 'Same ID groups an RC passage or DILR set', 'Split-screen sets'],
  ['set_text', 'No', 'Fill on the first row of each set', 'Split-screen sets'], ['question_text', 'Yes', 'Plain text. Use $…$ for maths.', '—'], ['image_url', 'No', 'Chart or diagram link (https://)', '—'],
  ['option_a … option_d', 'MCQ / MSQ', 'Answer options', '—'], ['correct_answer', 'Yes', 'A–D · A|C for MSQ · number for TITA', 'Score'], ['solution_text', 'Yes', 'Step-by-step solution', 'Detailed solutions'],
  ['solution_video_url', 'No', 'YouTube or Vimeo link', 'Detailed solutions'], ['tags', 'No', 'Comma separated', 'Search'], ['source', 'No', 'Original, CAT 2024 Slot 1…', 'Previous-paper tests'], ['language', 'No', 'English, Hindi, Both', 'Language switch'],
];
const FEEDS: [string, string, string][] = [
  ['Section', 'Section-wise report', '#AFC0FF'], ['Topic + subtopic', 'Topic-wise report, SWOT strengths and weaknesses', '#AFC0FF'], ['Difficulty', 'Difficulty report, SWOT opportunities', '#FFC44D'],
  ['Ideal time', 'Time analysis and time sinks (SWOT threats)', '#FFC44D'], ['Solution + video', 'Detailed solutions after submit', '#9BE3B8'], ['Peer & topper stats', 'Calculated automatically from attempts. Nothing to enter.', '#9BE3B8'],
];
const DIFF: Record<string, string> = { easy: 'ok', medium: 'mid', hard: 'bad' };
const PAGE = 100;

export default async function Bank({ searchParams }: { searchParams: Promise<SP> }) {
  await requireStaff('bank');
  const sp = await searchParams;
  const exams = await examRefs();
  const exam = exams.find(e => e.code === sp.exam);
  const sec = exam?.sections.find(s => s.code === sp.sec);
  const diff = ['easy', 'medium', 'hard'].includes(sp.diff ?? '') ? sp.diff! : null;
  const q = (sp.q ?? '').trim();
  const page = Math.max(1, Number(sp.page) || 1);
  const where = sql`where true
    ${exam ? sql`and q.exam_id = ${exam.id}` : sql``} ${sec ? sql`and q.section_id = ${sec.id}` : sql``} ${diff ? sql`and q.difficulty = ${diff}` : sql``}
    ${sp.nosol ? sql`and coalesce(q.solution_text, '') = ''` : sql``}
    ${sp.reported ? sql`and exists (select 1 from question_reports r where r.question_id = q.id and r.status = 'open')` : sql``}
    ${q ? sql`and (q.text ilike ${'%' + q + '%'} or q.external_id ilike ${q} or t.name ilike ${'%' + q + '%'} or ${q} = any(q.tags))` : sql``}`;
  const [rows, [dist], editing] = await Promise.all([
    sql`select q.id, q.external_id, q.text, q.type, q.difficulty, q.ideal_time_sec, q.status, e.code as exam, s.code as sec, t.name as topic, st.attempts, st.peer_accuracy_pct,
          (select json_agg(json_build_object('reason', r.reason, 'note', r.note)) from question_reports r where r.question_id = q.id and r.status = 'open') as reports
        from questions q join exams e on e.id = q.exam_id join sections s on s.id = q.section_id left join topics t on t.id = q.topic_id left join question_stats st on st.question_id = q.id
        ${where} order by q.created_at desc, q.external_id desc limit ${PAGE} offset ${(page - 1) * PAGE}`,
    sql`select count(*)::int as total, count(*) filter (where difficulty = 'easy')::int as easy, count(*) filter (where difficulty = 'medium')::int as medium, count(*) filter (where difficulty = 'hard')::int as hard
        from questions q left join topics t on t.id = q.topic_id ${where}`,
    sp.edit ? sql`select q.*, e.code as exam, s.code as sec, t.name as topic, qs.external_id as set_ext, qs.text as set_text
        from questions q join exams e on e.id = q.exam_id join sections s on s.id = q.section_id left join topics t on t.id = q.topic_id left join question_sets qs on qs.id = q.set_id
        where q.external_id = ${sp.edit}` : Promise.resolve([]),
  ]);
  const link = (p: Partial<SP>) => '/admin/bank?' + new URLSearchParams(Object.entries({ q: sp.q, exam: sp.exam, sec: sp.sec, diff: sp.diff, reported: sp.reported, nosol: sp.nosol, ...p }).filter(([, v]) => v) as [string, string][]);
  const e0 = editing[0];
  const opts = (e0?.options ?? []) as { key: string; text: string }[];
  const edit = e0 ? {
    question_id: e0.external_id, exam: e0.exam, section: e0.sec, topic: e0.topic ?? '', subtopic: e0.subtopic ?? '', type: e0.type, difficulty: e0.difficulty, ideal_time_sec: String(e0.ideal_time_sec),
    marks_correct: String(Number(e0.marks_correct)), marks_wrong: String(Number(e0.marks_wrong)), set_id: e0.set_ext ?? '', set_text: e0.set_text ?? '', question_text: e0.text, image_url: e0.image_url ?? '',
    option_a: opts.find(o => o.key === 'A')?.text ?? '', option_b: opts.find(o => o.key === 'B')?.text ?? '', option_c: opts.find(o => o.key === 'C')?.text ?? '', option_d: opts.find(o => o.key === 'D')?.text ?? '',
    correct_answer: e0.correct, solution_text: e0.solution_text ?? '', solution_video_url: e0.solution_video_url ?? '', tags: (e0.tags ?? []).join(', '), source: e0.source ?? '',
    language: { en: 'English', hi: 'Hindi', both: 'Both' }[e0.language as string] ?? 'English', status: e0.status === 'draft' ? 'draft' : 'live',
  } : null;

  return (
    <>
      <Head title="Question bank" sub="Every question with the details the analysis needs">
        <Link className="btn ghost" href={link({ import: '1' })}>Bulk import</Link>
        <Link className="btn" href={link({ add: '1' })}>Add question</Link>
      </Head>

      <div className="dark-panel stack" style={{ '--gap': '12px' } as React.CSSProperties}>
        <span className="eyebrow" style={{ color: '#FFC44D' }}>What each field feeds in the student analysis</span>
        <div className="grid" style={{ '--min': '220px', '--gap': '10px' } as React.CSSProperties}>
          {FEEDS.map(([f, a, c]) => (
            <div key={f} className="row" style={{ flexWrap: 'nowrap', alignItems: 'flex-start', '--gap': '10px' } as React.CSSProperties}>
              <span style={{ width: 8, height: 8, borderRadius: 4, background: c, marginTop: 6, flex: 'none' }} />
              <div className="stack" style={{ '--gap': '0' } as React.CSSProperties}><b style={{ fontSize: 13 }}>{f}</b><span style={{ fontSize: 12, color: 'rgba(255,255,255,.7)' }}>{a}</span></div>
            </div>
          ))}
        </div>
      </div>

      <BankTools
        key={(sp.edit ?? '') + (sp.add ?? '') + (sp.import ?? '')}
        exams={exams.map(e => ({ code: e.code, name: e.name, plus: e.plus, minus: e.minus, sections: e.sections.map(s => ({ code: s.code, name: s.name, topics: s.topics })) }))}
        mode={edit ? 'edit' : sp.add ? 'add' : sp.import ? 'import' : null} edit={edit} defaultExam={exam?.code ?? exams[0]?.code ?? 'CAT'} closeHref={link({})}
      />

      {sp.import && (
        <details className="card pad">
          <summary style={{ fontWeight: 800, cursor: 'pointer' }}>CSV columns</summary>
          <div className="tbl" style={{ '--minw': '0', '--cols': '160px 80px minmax(0,1.4fr) minmax(0,1fr)', marginTop: 12 } as React.CSSProperties}>
            <div className="tr th"><span>Column</span><span>Required</span><span>Values</span><span>Feeds</span></div>
            {LEGEND.map(([c, r, v, p]) => <div key={c} className="tr"><span className="mono" style={{ fontSize: 12 }}>{c}</span><span style={{ color: r === 'Yes' ? 'var(--ink)' : 'var(--faint)' }}>{r}</span><span className="s">{v}</span><span className="s">{p}</span></div>)}
          </div>
        </details>
      )}

      <form className="row" style={{ '--gap': '10px' } as React.CSSProperties}>
        <input className="input" style={{ flex: '1 1 240px', width: 'auto' }} name="q" defaultValue={sp.q} placeholder="Search text, topic, tag or ID" aria-label="Search questions" />
        <select className="input" style={{ width: 'auto' }} name="exam" defaultValue={sp.exam ?? ''} aria-label="Exam"><option value="">All exams</option>{exams.map(e => <option key={e.code} value={e.code}>{e.name}</option>)}</select>
        {exam && <select className="input" style={{ width: 'auto' }} name="sec" defaultValue={sp.sec ?? ''} aria-label="Section"><option value="">All sections</option>{exam.sections.map(s => <option key={s.code} value={s.code}>{s.name}</option>)}</select>}
        <select className="input" style={{ width: 'auto' }} name="diff" defaultValue={sp.diff ?? ''} aria-label="Difficulty"><option value="">All difficulty</option><option value="easy">Easy</option><option value="medium">Medium</option><option value="hard">Hard</option></select>
        <button className="btn ghost">Filter</button>
        {(sp.reported || sp.nosol) && <Link className="chip on" href={link({ reported: '', nosol: '' })}>{sp.reported ? 'Reported' : 'No solution'} ×</Link>}
      </form>
      <div className="note">{dist.total.toLocaleString('en-IN')} questions · {dist.easy} easy · {dist.medium} medium · {dist.hard} hard</div>

      <div className="tbl-wrap">
        <div className="tbl" style={{ '--minw': '980px', '--cols': '70px minmax(0,2.4fr) 110px minmax(0,1fr) 56px 76px 56px 86px 60px' } as React.CSSProperties}>
          <div className="tr th"><span>ID</span><span>Question</span><span>Exam</span><span>Topic</span><span>Type</span><span>Level</span><span>Ideal</span><span>Peer acc.</span><span /></div>
          {rows.length === 0 && <div className="empty">No questions match.</div>}
          {rows.map(r => (
            <div key={r.id} className="tr" style={{ alignItems: 'start' }}>
              <span className="mono" style={{ fontSize: 12 }}>{r.external_id}</span>
              <div className="stack" style={{ '--gap': '6px' } as React.CSSProperties}>
                <span style={{ display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{r.text}</span>
                {r.status === 'draft' && <span className="tag">Draft · not used in tests</span>}
                {r.reports && <ReportActions questionId={r.id} reports={r.reports} />}
              </div>
              <span className="s">{r.exam} · {r.sec}</span><span className="s">{r.topic ?? '—'}</span><span className="s">{r.type}</span>
              <span className={'tag ' + DIFF[r.difficulty]} style={{ textTransform: 'capitalize' }}>{r.difficulty}</span>
              <span className="mono">{r.ideal_time_sec}s</span>
              <span className="mono" style={{ color: (r.attempts ?? 0) < PEER_STATS_MIN_ATTEMPTS ? 'var(--faint)' : undefined }} title={`${r.attempts ?? 0} attempts`}>
                {(r.attempts ?? 0) < PEER_STATS_MIN_ATTEMPTS ? 'Collecting' : Math.round(r.peer_accuracy_pct) + '%'}
              </span>
              <Link href={link({ edit: r.external_id })} className="link">Edit</Link>
            </div>
          ))}
        </div>
      </div>
      <div className="row" style={{ justifyContent: 'space-between' }}>
        {page > 1 ? <Link className="btn ghost sm" href={link({ page: String(page - 1) })}>← Newer</Link> : <span />}
        {dist.total > page * PAGE && <Link className="btn ghost sm" href={link({ page: String(page + 1) })}>Older →</Link>}
      </div>
    </>
  );
}
