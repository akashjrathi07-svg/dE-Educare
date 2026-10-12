'use client';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { Chips, Field, useAction, useToast } from '../ui';
import { checkImport, resolveReports, runImport, saveQuestion } from './actions';
import type { ImportDefaults } from '@/lib/question-import';
import { readFile, readText } from '../read-sheet';

type Exam = { code: string; name: string; plus: number; minus: number; sections: { code: string; name: string; topics: string[] }[] };
type Form = Record<string, string>;

const LETTERS = ['A', 'B', 'C', 'D'] as const;
const DIFF_TAG: Record<string, string> = { easy: 'ok', medium: 'mid', hard: 'bad' };

function blank(exams: Exam[], code: string, keep?: Form): Form {
  const e = exams.find(x => x.code === code) ?? exams[0];
  const s = e.sections.find(x => x.code === keep?.section) ?? e.sections[0];
  return {
    question_id: '', exam: e.code, section: s.code, topic: keep?.topic && s.topics.includes(keep.topic) ? keep.topic : s.topics[0] ?? '', subtopic: '', type: 'MCQ', difficulty: keep?.difficulty ?? 'medium',
    ideal_time_sec: '90', marks_correct: String(e.plus), marks_wrong: String(e.minus), set_id: keep?.set_id ?? '', set_text: keep?.set_text ?? '', question_text: '', image_url: '',
    option_a: '', option_b: '', option_c: '', option_d: '', correct_answer: 'A', solution_text: '', solution_video_url: '', tags: '', source: 'Original', language: 'English', status: 'live',
  };
}

export function BankTools({ exams, mode, edit, defaultExam, closeHref }: { exams: Exam[]; mode: 'add' | 'edit' | 'import' | null; edit: Form | null; defaultExam: string; closeHref: string }) {
  if (mode === 'import') return <ImportPanel exams={exams} defaultExam={defaultExam} closeHref={closeHref} />;
  if (mode) return <QuestionForm exams={exams} initial={edit ?? blank(exams, defaultExam)} closeHref={closeHref} />;
  return null;
}

function QuestionForm({ exams, initial, closeHref }: { exams: Exam[]; initial: Form; closeHref: string }) {
  const [f, setF] = useState<Form>(initial);
  const router = useRouter();
  const { busy, run } = useAction();
  const exam = exams.find(e => e.code === f.exam) ?? exams[0];
  const sec = exam.sections.find(s => s.code === f.section) ?? exam.sections[0];
  const set = (p: Form) => setF(x => ({ ...x, ...p }));
  const editing = !!initial.question_id;
  const tita = f.type === 'TITA', msq = f.type === 'MSQ';
  const answers = f.correct_answer.split('|').filter(Boolean);

  const save = (again: boolean) => run(() => saveQuestion(f, f.status as 'live' | 'draft'), r => {
    if (!r.ok) return;
    if (again) setF(blank(exams, f.exam, f));
    else router.push(closeHref);
  });

  return (
    <div className="grid" style={{ '--min': '420px', alignItems: 'start', '--gap': '16px' } as React.CSSProperties}>
      <div className="card pad stack" style={{ '--gap': '16px' } as React.CSSProperties}>
        <div className="row" style={{ justifyContent: 'space-between' }}>
          <b style={{ fontSize: 17 }}>{editing ? 'Edit question' : 'Add a question'} <span className="mono muted" style={{ fontSize: 12 }}>{initial.question_id || 'New'}</span></b>
          <Link className="btn ghost sm" href={closeHref}>Close</Link>
        </div>
        <div className="form-grid">
          <Field label="Exam" req>
            <select className="input" value={f.exam} onChange={e => setF(blank(exams, e.target.value, { ...f, section: '' }))}>{exams.map(e => <option key={e.code} value={e.code}>{e.name}</option>)}</select>
          </Field>
          <Field label="Section" req hint="Section-wise report">
            <select className="input" value={f.section} onChange={e => { const s = exam.sections.find(x => x.code === e.target.value)!; set({ section: s.code, topic: s.topics[0] ?? '' }); }}>{exam.sections.map(s => <option key={s.code} value={s.code}>{s.name}</option>)}</select>
          </Field>
          <Field label="Topic" req hint="Topic-wise report · SWOT">
            {sec.topics.length ? <select className="input" value={f.topic} onChange={e => set({ topic: e.target.value })}>{sec.topics.map(t => <option key={t}>{t}</option>)}</select>
              : <input className="input" value={f.topic} placeholder="New topic name" onChange={e => set({ topic: e.target.value })} />}
          </Field>
          <Field label="Subtopic"><input className="input" value={f.subtopic} placeholder="e.g. Successive discounts" onChange={e => set({ subtopic: e.target.value })} /></Field>
          <Field label="Answer type" group>
            <Chips options={['MCQ', 'TITA', 'MSQ']} value={f.type} onChange={v => set({ type: v as string, correct_answer: v === 'TITA' ? '' : 'A', ...(v === 'TITA' ? { marks_wrong: '0' } : { marks_wrong: String(exam.minus) }) })} />
          </Field>
          <Field label="Difficulty" req group hint="Difficulty report · SWOT">
            <Chips options={['easy', 'medium', 'hard']} labels={{ easy: 'Easy', medium: 'Medium', hard: 'Hard' }} value={f.difficulty} onChange={v => set({ difficulty: v as string })} />
          </Field>
          <Field label="Ideal time (sec)" req hint="Time analysis"><input className="input" type="number" min={5} value={f.ideal_time_sec} onChange={e => set({ ideal_time_sec: e.target.value })} /></Field>
          <Field label="Marks if correct"><input className="input" type="number" step="any" value={f.marks_correct} onChange={e => set({ marks_correct: e.target.value })} /></Field>
          <Field label="Negative marks" hint={tita ? 'Usually 0 for TITA' : undefined}><input className="input" type="number" step="any" min={0} value={f.marks_wrong} onChange={e => set({ marks_wrong: e.target.value })} /></Field>
          <Field label="Set ID (optional)" hint="Same ID groups an RC passage or DILR set"><input className="input" value={f.set_id} placeholder="RC-CAT-014" onChange={e => set({ set_id: e.target.value })} /></Field>
          <Field label="Passage or set" span>
            <textarea className="input" rows={3} value={f.set_text} placeholder="Paste an RC passage or DILR set. It shows on the left in split-screen exams. Editing it changes it for every question in the set." onChange={e => set({ set_text: e.target.value })} />
          </Field>
          <Field label="Question" req span><textarea className="input" rows={4} value={f.question_text} placeholder="Type the question. Use $…$ for maths." onChange={e => set({ question_text: e.target.value })} /></Field>
          <Field label="Image URL" span><input className="input" value={f.image_url} placeholder="https:// (chart or diagram)" onChange={e => set({ image_url: e.target.value })} /></Field>
          {!tita && LETTERS.map(l => (
            <Field key={l} label={'Option ' + l} req={l === 'A' || l === 'B'}>
              <input className="input" value={f['option_' + l.toLowerCase()]} onChange={e => set({ ['option_' + l.toLowerCase()]: e.target.value })} />
            </Field>
          ))}
          {tita ? (
            <Field label="Correct answer (number)" req><input className="input" type="number" step="any" value={f.correct_answer} onChange={e => set({ correct_answer: e.target.value })} /></Field>
          ) : (
            <Field label={msq ? 'Correct options (all that apply)' : 'Correct option'} req group span>
              <Chips options={LETTERS} value={msq ? answers as (typeof LETTERS)[number][] : (f.correct_answer as (typeof LETTERS)[number])}
                onChange={v => set({ correct_answer: Array.isArray(v) ? [...v].sort().join('|') : v })} />
            </Field>
          )}
          <Field label="Solution" span hint="Detailed solutions"><textarea className="input" rows={4} value={f.solution_text} placeholder="Step-by-step. Shown under Time & solutions after submit." onChange={e => set({ solution_text: e.target.value })} /></Field>
          <Field label="Solution video URL"><input className="input" value={f.solution_video_url} placeholder="https://" onChange={e => set({ solution_video_url: e.target.value })} /></Field>
          <Field label="Source"><input className="input" value={f.source} placeholder="Original / CAT 2024 Slot 1" onChange={e => set({ source: e.target.value })} /></Field>
          <Field label="Tags"><input className="input" value={f.tags} placeholder="comma separated" onChange={e => set({ tags: e.target.value })} /></Field>
          <Field label="Language" group><Chips options={['English', 'Hindi', 'Both']} value={f.language} onChange={v => set({ language: v as string })} /></Field>
          <Field label="Status" group hint="Draft questions are never picked for tests">
            <Chips options={['live', 'draft']} labels={{ live: 'Live', draft: 'Draft' }} value={f.status} onChange={v => set({ status: v as string })} />
          </Field>
        </div>
        <div className="row" style={{ justifyContent: 'flex-end' }}>
          {!editing && <button type="button" className="btn ghost" disabled={busy} onClick={() => save(true)}>Save & add another</button>}
          <button type="button" className="btn" disabled={busy} onClick={() => save(false)}>{busy ? 'Saving…' : editing ? 'Save changes' : 'Save question'}</button>
        </div>
      </div>
      <Preview f={f} exam={exam} secName={sec.name} />
    </div>
  );
}

function Preview({ f, exam, secName }: { f: Form; exam: Exam; secName: string }) {
  const tita = f.type === 'TITA';
  const answers = f.correct_answer.split('|');
  return (
    <div className="stack" style={{ position: 'sticky', top: 20, '--gap': '10px' } as React.CSSProperties}>
      <span className="eyebrow">Student preview</span>
      <div className="card pad stack" style={{ '--gap': '14px' } as React.CSSProperties}>
        <div className="row" style={{ justifyContent: 'space-between' }}><b style={{ fontSize: 13 }}>{exam.name} · {secName}</b><span className="mono" style={{ fontSize: 12 }}>+{f.marks_correct || 0} / −{f.marks_wrong || 0}</span></div>
        <div className="row" style={{ '--gap': '6px' } as React.CSSProperties}>
          <span className="tag pri">{f.topic}{f.subtopic ? ' · ' + f.subtopic : ''}</span><span className={'tag ' + DIFF_TAG[f.difficulty]} style={{ textTransform: 'capitalize' }}>{f.difficulty}</span>
          <span className="tag">{f.type}</span><span className="tag">Ideal {f.ideal_time_sec || 0}s</span>
        </div>
        {f.set_text && <div className="pre" style={{ fontSize: 13, lineHeight: 1.55, padding: 12, borderRadius: 12, background: 'var(--sunk)', maxHeight: 180, overflowY: 'auto' }}>{f.set_text}</div>}
        <div className="pre" style={{ fontSize: 15, lineHeight: 1.55, fontWeight: 600 }}>{f.question_text || 'Your question appears here as students will see it.'}</div>
        {/^https:\/\//.test(f.image_url) && <img src={f.image_url} alt="" style={{ maxWidth: '100%', borderRadius: 10 }} />}
        {tita ? (
          <div className="row"><span className="note">Answer</span><span className="mono" style={{ padding: '8px 14px', borderRadius: 10, border: '1px solid var(--line)', fontSize: 16 }}>{f.correct_answer || '—'}</span></div>
        ) : (
          <div className="stack" style={{ '--gap': '8px' } as React.CSSProperties}>
            {LETTERS.filter(l => f['option_' + l.toLowerCase()] || l === 'A' || l === 'B').map(l => {
              const ok = answers.includes(l);
              return (
                <div key={l} className="row" style={{ flexWrap: 'nowrap', padding: '10px 12px', borderRadius: 12, border: '1px solid ' + (ok ? 'oklch(0.6 0.14 155)' : 'var(--line)'), background: ok ? 'oklch(0.96 0.04 155)' : 'var(--card)' }}>
                  <span style={{ width: 26, height: 26, flex: 'none', borderRadius: 8, display: 'grid', placeItems: 'center', fontWeight: 800, fontSize: 12, background: ok ? 'oklch(0.6 0.14 155)' : 'var(--chip)', color: ok ? '#fff' : 'var(--muted)' }}>{l}</span>
                  <span style={{ fontSize: 14, fontWeight: 600 }}>{f['option_' + l.toLowerCase()] || 'Option ' + l}</span>
                </div>
              );
            })}
          </div>
        )}
        {f.solution_text && <div className="stack" style={{ '--gap': '4px', borderTop: '1px solid var(--line2)', paddingTop: 12 } as React.CSSProperties}><span className="eyebrow">Solution</span><div className="pre note" style={{ fontSize: 13 }}>{f.solution_text}</div></div>}
      </div>
    </div>
  );
}

type Check = Awaited<ReturnType<typeof checkImport>>;

function ImportPanel({ exams, defaultExam, closeHref }: { exams: Exam[]; defaultExam: string; closeHref: string }) {
  const [tab, setTab] = useState<'file' | 'paste'>('file');
  const [table, setTable] = useState<string[][] | null>(null);
  const [name, setName] = useState('');
  const [text, setText] = useState('');
  const [d, setD] = useState<ImportDefaults>({ exam: exams.find(e => e.code === defaultExam)?.code ?? '', section: '', topic: '', difficulty: '' });
  const [newTopics, setNewTopics] = useState(false);
  const [status, setStatus] = useState<'live' | 'draft'>('live');
  const [check, setCheck] = useState<Check | null>(null);
  const [checking, setChecking] = useState(false);
  const toast = useToast();
  const router = useRouter();
  const { busy, run } = useAction();
  const exam = exams.find(e => e.code === d.exam);
  const sec = exam?.sections.find(s => s.code === d.section);
  const seq = useRef(0);

  // Re-check whenever the rows or the whole-upload choices change.
  useEffect(() => {
    if (!table) { setCheck(null); return; }
    const n = ++seq.current;
    setChecking(true);
    const t = setTimeout(() => {
      checkImport({ table, defaults: d, newTopics })
        .then(r => { if (n === seq.current) setCheck(r); })
        .catch(() => toast('Could not check the questions. Try again.'))
        .finally(() => { if (n === seq.current) setChecking(false); });
    }, 300);
    return () => clearTimeout(t);
  }, [table, d, newTopics, toast]);

  const pick = async (file: File | undefined) => {
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) { toast('File is larger than 5 MB. Split it into parts.'); return; }
    try { setName(file.name); setTable(await readFile(file)); } catch { toast('Could not read that file. Save it as .xlsx or .csv and try again.'); }
  };
  const fromPaste = () => { if (text.trim()) { setName('Pasted questions'); setTable(readText(text)); } };
  const setDef = (p: ImportDefaults) => setD(x => ({ ...x, ...p }));

  return (
    <div className="card pad stack" style={{ '--gap': '16px' } as React.CSSProperties}>
      <div className="row" style={{ justifyContent: 'space-between' }}><b style={{ fontSize: 17 }}>Add many questions</b><Link className="btn ghost sm" href={closeHref}>Close</Link></div>
      <Chips options={['file', 'paste']} labels={{ file: 'Excel or CSV file', paste: 'Paste from Word or PDF' }} value={tab} onChange={v => { setTab(v as 'file' | 'paste'); setTable(null); setName(''); }} />

      <div className="stack" style={{ '--gap': '8px' } as React.CSSProperties}>
        <span className="eyebrow">For the whole upload <span className="muted" style={{ textTransform: 'none', letterSpacing: 0 }}>· used when a question leaves it blank</span></span>
        <div className="form-grid">
          <Field label="Exam">
            <select className="input" value={d.exam} onChange={e => setDef({ exam: e.target.value, section: '', topic: '' })}>
              <option value="">From the file</option>{exams.map(e => <option key={e.code} value={e.code}>{e.name}</option>)}
            </select>
          </Field>
          <Field label="Section">
            <select className="input" value={d.section} disabled={!exam} onChange={e => setDef({ section: e.target.value, topic: '' })}>
              <option value="">From the file</option>{exam?.sections.map(s => <option key={s.code} value={s.code}>{s.name}</option>)}
            </select>
          </Field>
          <Field label="Topic">
            {sec && sec.topics.length && !newTopics ? (
              <select className="input" value={d.topic} onChange={e => setDef({ topic: e.target.value })}><option value="">From the file</option>{sec.topics.map(t => <option key={t}>{t}</option>)}</select>
            ) : <input className="input" value={d.topic} placeholder="From the file" onChange={e => setDef({ topic: e.target.value })} />}
          </Field>
          <Field label="Difficulty">
            <select className="input" value={d.difficulty} onChange={e => setDef({ difficulty: e.target.value })}>
              <option value="">From the file (else Medium)</option><option value="easy">Easy</option><option value="medium">Medium</option><option value="hard">Hard</option>
            </select>
          </Field>
          <Field label="Marks" hint="Blank uses each row's marks">
            <div className="row" style={{ flexWrap: 'nowrap', '--gap': '6px' } as React.CSSProperties}>
              <input className="input" type="number" step="any" placeholder="+" value={d.marks_correct ?? ''} onChange={e => setDef({ marks_correct: e.target.value })} aria-label="Marks if correct" />
              <input className="input" type="number" step="any" placeholder="−" value={d.marks_wrong ?? ''} onChange={e => setDef({ marks_wrong: e.target.value })} aria-label="Negative marks" />
            </div>
          </Field>
          <Field label="Save as" group>
            <Chips options={['live', 'draft']} labels={{ live: 'Live', draft: 'Draft (check first)' }} value={status} onChange={v => setStatus(v as 'live' | 'draft')} />
          </Field>
        </div>
        <label className="row" style={{ fontSize: 13, fontWeight: 700 }}>
          <input type="checkbox" checked={newTopics} onChange={e => setNewTopics(e.target.checked)} /> Add new topics automatically when a topic isn&apos;t in the list yet
        </label>
      </div>

      {tab === 'file' ? (
        <>
          <ol className="note" style={{ margin: 0, paddingLeft: 18, fontSize: 13 }}>
            <li>Use your own Excel sheet with headings like <b>Question, Option A–D, Answer, Solution, Topic, Difficulty</b>, or the <a href="/question-import-template.csv" download>full template</a>.</li>
            <li>Upload the .xlsx or .csv file. Every row is checked first; nothing is saved yet.</li>
          </ol>
          <label className="dropzone" style={{ height: 120, cursor: 'pointer' }}>
            <input type="file" accept=".xlsx,.csv,.tsv,.txt,text/csv" className="sr" onChange={e => pick(e.target.files?.[0])} />
            <b>{name || 'Choose an Excel or CSV file'}</b><span className="note">{checking ? 'Checking every row…' : 'Up to 2,000 questions at a time'}</span>
          </label>
        </>
      ) : (
        <>
          <div className="note" style={{ fontSize: 13 }}>
            Paste questions as they are in your Word file or PDF. Number each question, write options as (A) (B) (C) (D), and add <b>Answer:</b> and <b>Solution:</b> lines. A <b>Directions:</b> or <b>Passage:</b> line before a group of questions keeps them together as a set. Questions with no options and a number as the answer become TITA.
          </div>
          <textarea className="input mono" rows={12} style={{ fontSize: 13 }} value={text} onChange={e => setText(e.target.value)}
            placeholder={'1. A price rises by 20% and then falls by 20%. What is the net change?\n(A) No change  (B) 4% decrease  (C) 4% increase  (D) 2% decrease\nAnswer: B\nSolution: 1.2 × 0.8 = 0.96, so a 4% decrease.\n\n2. What is 15% of 200?\nAnswer: 30'} />
          <div className="row" style={{ justifyContent: 'flex-end' }}><button type="button" className="btn ghost" disabled={!text.trim()} onClick={fromPaste}>{checking ? 'Checking…' : 'Check questions'}</button></div>
        </>
      )}

      {check && table && (
        <div className="stack" style={{ '--gap': '10px' } as React.CSSProperties}>
          <div className={'alert ' + (check.errors.length ? 'info' : 'ok')}>
            {check.ready} of {check.total} questions are ready{check.updates ? ` (${check.updates} update existing questions)` : ''}.
            {check.errors.length > 0 && ` ${check.errors.length + (check.moreErrors ?? 0)} need a fix.`}
          </div>
          {check.preview.length > 0 && (
            <div className="list">
              {check.preview.map(p => (
                <div key={p.row} className="list-row stack" style={{ alignItems: 'flex-start', '--gap': '4px', fontSize: 13 } as React.CSSProperties}>
                  <b>{p.text}</b>
                  {p.options.length > 0 && <span className="note">{p.options.join('   ')}</span>}
                  <span className="note">Answer {p.correct} · {p.type} · {p.topic} · <span style={{ textTransform: 'capitalize' }}>{p.difficulty}</span></span>
                </div>
              ))}
              {check.ready > check.preview.length && <div className="list-row note">…and {check.ready - check.preview.length} more.</div>}
            </div>
          )}
          {check.errors.length > 0 && (
            <div className="list">
              {check.errors.map((e, i) => <div key={i} className="list-row" style={{ fontSize: 13 }}><span className="mono" style={{ width: 90, flex: 'none', color: 'var(--bad)' }}>{tab === 'paste' ? 'Question ' + (e.row - 1) : 'Row ' + e.row}</span><span>{e.message}</span></div>)}
              {(check.moreErrors ?? 0) > 0 && <div className="list-row note">…and {check.moreErrors} more.</div>}
            </div>
          )}
          <div className="row" style={{ justifyContent: 'flex-end' }}>
            <button type="button" className="btn" disabled={busy || checking || !check.ready}
              onClick={() => run(() => runImport({ table, defaults: d, newTopics }, status), r => { if (r.ok) router.push(closeHref); })}>
              {busy ? 'Saving…' : `Add ${check.ready} question${check.ready === 1 ? '' : 's'}${status === 'draft' ? ' as drafts' : ''}`}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export function ReportActions({ questionId, reports }: { questionId: string; reports: { reason: string | null; note: string | null }[] }) {
  const { busy, run } = useAction();
  return (
    <div className="alert err stack" style={{ padding: '8px 10px', fontSize: 12, '--gap': '6px' } as React.CSSProperties}>
      <span>{reports.length} report{reports.length > 1 ? 's' : ''}: {reports.map(r => [r.reason, r.note].filter(Boolean).join(' – ')).join(' · ')}</span>
      <div className="row" style={{ '--gap': '6px' } as React.CSSProperties}>
        <button type="button" className="btn ok sm" disabled={busy} onClick={() => run(() => resolveReports(questionId, 'fixed'))}>Mark fixed</button>
        <button type="button" className="btn ghost sm" disabled={busy} onClick={() => run(() => resolveReports(questionId, 'dismissed'))}>Dismiss</button>
      </div>
    </div>
  );
}
