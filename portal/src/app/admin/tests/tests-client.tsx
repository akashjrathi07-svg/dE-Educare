'use client';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Chips, DropZone, Field, useAction, useToast } from '../ui';
import { readFile, readText, type ImageUploader } from '../read-sheet';
import { uploadImage } from '../media-actions';
import { mergeDetails } from '@/lib/question-import';
import { checkUpload, uploadTests, type UploadSettings } from './upload';
import { createTest, type TestInput } from './actions';

type Sec = { code: string; name: string; questions: number; minutes: number | null; topics: string[] };
type Exam = { code: string; name: string; plus: number; rules: Record<string, unknown>; marking: string; totalMinutes: number | null; sections: Sec[] };

const TYPES = { full_mock: 'Full mock', sectional: 'Sectional', topic: 'Topic test', daily: 'Daily free', pyq: 'Previous paper' };
const DIFFS = ['easy', 'medium', 'hard'] as const;

function plan(exam: Exam, type: TestInput['type'], secCode: string) {
  const sec = exam.sections.find(s => s.code === secCode) ?? exam.sections[0];
  const allQ = exam.sections.reduce((a, s) => a + s.questions, 0);
  if (type === 'sectional') return { secs: [{ code: sec.code, count: sec.questions }], minutes: sec.minutes ?? Math.round(((exam.totalMinutes ?? 60) * sec.questions) / Math.max(1, allQ)) };
  if (type === 'topic') return { secs: [{ code: sec.code, count: 10 }], minutes: 15 };
  if (type === 'daily') {
    // 5 questions spread across up to 5 sections.
    const n = Math.min(5, exam.sections.length);
    return { secs: exam.sections.slice(0, n).map((s, i) => ({ code: s.code, count: Math.floor(5 / n) + (i < 5 % n ? 1 : 0) })), minutes: 10 };
  }
  return { secs: exam.sections.map(s => ({ code: s.code, count: s.questions })), minutes: exam.totalMinutes ?? (exam.sections.reduce((a, s) => a + (s.minutes ?? 0), 0) || 60) };
}

export function Builder({ exams, courses, nodes, pool, closeHref }: { exams: Exam[]; courses: { id: string; name: string; exam: string | null }[]; nodes: { id: string; path: string; exam: string }[]; pool: Record<string, number>; closeHref: string }) {
  const first = exams[0];
  const init = (examCode: string, type: TestInput['type'], sec = '', prev?: TestInput): TestInput => {
    const exam = exams.find(e => e.code === examCode) ?? first;
    const s = exam.sections.find(x => x.code === sec) ?? exam.sections[0];
    const p = plan(exam, type, s.code);
    return {
      name: prev?.name ?? '', slug: prev?.slug ?? '', type, exam: exam.code, sections: p.secs.map(x => ({ ...x, ids: '' })), topic: type === 'topic' ? (s.topics[0] ?? '') : '', mode: prev?.mode ?? 'auto',
      easy: prev?.easy ?? 30, medium: prev?.medium ?? 50, hard: prev?.hard ?? 20, minutes: p.minutes, free: type === 'daily' || type === 'pyq' ? true : prev?.free ?? false,
      courses: exam.code === prev?.exam ? prev.courses : [], solutions: prev?.solutions ?? 'after_submit', windowEnd: prev?.windowEnd ?? '', ranking: prev?.ranking ?? 'all_india',
      publish: prev?.publish ?? 'now', date: prev?.date ?? '', time: prev?.time ?? '09:00', nodeId: exam.code === prev?.exam ? prev.nodeId : '',
      count: prev?.count ?? 1, startAt: prev?.startAt ?? 1, fresh: prev?.fresh ?? true,
    };
  };
  const [f, setF] = useState<TestInput>(() => init(first.code, 'full_mock'));
  const router = useRouter();
  const { busy, run } = useAction();
  const set = (p: Partial<TestInput>) => setF(x => ({ ...x, ...p }));
  const exam = exams.find(e => e.code === f.exam) ?? first;
  const r = exam.rules as Record<string, string | boolean>;
  const one = f.type === 'sectional' || f.type === 'topic';
  const secCode = f.sections[0]?.code ?? exam.sections[0].code;
  const totQ = f.sections.reduce((a, s) => a + (s.count || 0), 0);
  const avail = (code: string) => f.type === 'topic' ? pool[`${exam.code}|${code}|t:${f.topic}`] ?? 0 : DIFFS.reduce((a, d) => a + (pool[`${exam.code}|${code}|${d}`] ?? 0), 0);
  const pctOk = Math.round(f.easy + f.medium + f.hard) === 100;
  const n = f.mode === 'manual' ? 1 : Math.max(1, f.count ?? 1);
  const label = (f.publish === 'draft' ? 'Save' : f.publish === 'schedule' ? 'Schedule' : 'Publish') + (n > 1 ? ` ${n} tests` : f.publish === 'draft' ? ' draft' : ' test');

  return (
    <div className="grid" style={{ '--min': '420px', alignItems: 'start', '--gap': '16px' } as React.CSSProperties}>
      <div className="card pad stack" style={{ '--gap': '16px' } as React.CSSProperties}>
        <div className="row" style={{ justifyContent: 'space-between' }}><b style={{ fontSize: 17 }}>New test</b><Link className="btn ghost sm" href={closeHref}>Close</Link></div>
        <div className="form-grid">
          <Field label={n > 1 ? 'Series name' : 'Test name'} req hint={n > 1 ? `Numbered: ${f.name || 'CAT Mock'} ${f.startAt ?? 1} … ${f.name || 'CAT Mock'} ${(f.startAt ?? 1) + n - 1}` : undefined}>
            <input className="input" value={f.name} placeholder={n > 1 ? 'CAT Mock' : 'CAT Mock 11'} onChange={e => set({ name: e.target.value })} />
          </Field>
          <Field label={n > 1 ? 'Test ID start (website links)' : 'Test ID (website link)'} hint={n > 1 ? `Gives ${f.slug || 'cat-m'}-${f.startAt ?? 1} … ${f.slug || 'cat-m'}-${(f.startAt ?? 1) + n - 1}. Leave blank to make them.` : "Must match the website's link for this test, e.g. cat-m-1. Leave blank to make one."}>
            <input className="input mono" value={f.slug ?? ''} placeholder={n > 1 ? 'cat-m' : 'cat-m-11'} onChange={e => set({ slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '') })} />
          </Field>
          {f.mode === 'auto' && <>
            <Field label="How many tests" hint="Make a whole series at once. No question repeats inside the series.">
              <input className="input" type="number" min={1} max={50} value={f.count ?? 1} onChange={e => set({ count: Math.max(1, Math.min(50, Number(e.target.value) || 1)) })} />
            </Field>
            {n > 1 && <Field label="Start numbering at"><input className="input" type="number" min={0} value={f.startAt ?? 1} onChange={e => set({ startAt: Number(e.target.value) })} /></Field>}
          </>}
          <Field label="Test type" group span><Chips options={Object.keys(TYPES) as TestInput['type'][]} labels={TYPES} value={f.type} onChange={v => setF(init(f.exam, v as TestInput['type'], secCode, f))} /></Field>
          <Field label="Exam interface" hint="Sets sections, timers and marking">
            <select className="input" value={f.exam} onChange={e => setF(init(e.target.value, f.type, '', f))}>{exams.map(e => <option key={e.code} value={e.code}>{e.name}</option>)}</select>
          </Field>
          {one && (
            <Field label="Section">
              <select className="input" value={secCode} onChange={e => setF(init(f.exam, f.type, e.target.value, f))}>{exam.sections.map(s => <option key={s.code} value={s.code}>{s.name}</option>)}</select>
            </Field>
          )}
          {f.type === 'topic' && (
            <Field label="Topic" req>
              <select className="input" value={f.topic} onChange={e => set({ topic: e.target.value })}>{(exam.sections.find(s => s.code === secCode)?.topics ?? []).map(t => <option key={t}>{t}</option>)}</select>
            </Field>
          )}
          <Field label="Question selection" group><Chips options={['auto', 'manual']} labels={{ auto: 'Auto blueprint', manual: 'Pick manually' }} value={f.mode} onChange={v => set({ mode: v as 'auto' | 'manual' })} /></Field>
          {f.mode === 'auto' && DIFFS.map(d => (
            <Field key={d} label={d[0].toUpperCase() + d.slice(1) + ' %'} hint={d === 'hard' ? (pctOk ? 'Adds up to 100%' : 'Should add up to 100%') : undefined}>
              <input className="input" type="number" min={0} max={100} value={f[d]} onChange={e => set({ [d]: Number(e.target.value) })} />
            </Field>
          ))}
          {f.mode === 'auto' && (
            <Field label="Question freshness" group>
              <Chips options={['fresh', 'any']} labels={{ fresh: 'Unused questions first', any: 'Any question' }} value={f.fresh ? 'fresh' : 'any'} onChange={v => set({ fresh: v === 'fresh' })} />
            </Field>
          )}
          <Field label="Duration (min)" hint={r.secTimer && !one && f.type !== 'daily' ? 'Sections keep their own timers' : undefined}><input className="input" type="number" min={1} value={f.minutes} onChange={e => set({ minutes: Number(e.target.value) })} /></Field>
        </div>

        <div className="list">
          {f.sections.map((s, i) => {
            const sec = exam.sections.find(x => x.code === s.code)!;
            const av = avail(s.code);
            const upd = (p: Partial<typeof s>) => set({ sections: f.sections.map((x, j) => (j === i ? { ...x, ...p } : x)) });
            return (
              <div key={s.code} className="list-row" style={{ flexWrap: 'wrap', alignItems: 'flex-start' }}>
                <div className="stack" style={{ flex: '1 1 200px', '--gap': '2px' } as React.CSSProperties}>
                  <b style={{ fontSize: 14 }}>{sec.name}{f.type === 'topic' ? ' · ' + f.topic : ''}</b>
                  <span style={{ fontSize: 12, fontWeight: 700, color: f.mode === 'auto' && av < s.count * n ? 'var(--bad)' : 'var(--ok)' }}>
                    {f.mode === 'auto' ? `${av} live questions match${n > 1 ? ` · ${s.count * n} needed for ${n} tests` : ''}${av < s.count * n ? ' · not enough' : ''}` : `List ${s.count} question IDs`}
                  </span>
                </div>
                <label className="row" style={{ fontSize: 12, fontWeight: 700, color: 'var(--muted)' }}>Questions
                  <input className="input" type="number" min={0} style={{ width: 80 }} value={s.count} onChange={e => upd({ count: Number(e.target.value) })} />
                </label>
                {f.mode === 'manual' && <textarea className="input" rows={2} style={{ flexBasis: '100%' }} placeholder="Q1001, Q1002, …" value={s.ids} onChange={e => upd({ ids: e.target.value })} />}
              </div>
            );
          })}
        </div>

        <div className="form-grid">
          <Field label="Who can take it" group span hint="Free tests are open to everyone; otherwise the selected plans unlock it">
            <div className="chips">
              <button type="button" className="chip" aria-pressed={f.free} onClick={() => set({ free: !f.free })}>Free</button>
              {courses.filter(c => !c.exam || c.exam === f.exam).map(c => (
                <button key={c.id} type="button" className="chip" aria-pressed={f.courses.includes(c.id)}
                  onClick={() => set({ courses: f.courses.includes(c.id) ? f.courses.filter(x => x !== c.id) : [...f.courses, c.id] })}>{c.name}</button>
              ))}
            </div>
          </Field>
          <Field label="Also list on the Tests screen under" span hint="Optional. Tests always show in the folders of the courses ticked above.">
            <select className="input" value={f.nodeId} onChange={e => set({ nodeId: e.target.value })}>
              <option value="">Only in its courses' folders</option>{nodes.filter(n => n.exam === f.exam).map(n => <option key={n.id} value={n.id}>{n.path}</option>)}
            </select>
          </Field>
          <Field label="Show solutions" group><Chips options={['after_submit', 'after_window']} labels={{ after_submit: 'Right after submit', after_window: 'After the test window closes' }} value={f.solutions} onChange={v => set({ solutions: v as TestInput['solutions'] })} /></Field>
          {f.solutions === 'after_window' && <Field label="Window closes on"><input className="input" type="date" value={f.windowEnd} onChange={e => set({ windowEnd: e.target.value })} /></Field>}
          <Field label="Ranking" group><Chips options={['all_india', 'batch', 'none']} labels={{ all_india: 'All-India percentile', batch: 'Batch rank only', none: 'No ranking' }} value={f.ranking} onChange={v => set({ ranking: v as TestInput['ranking'] })} /></Field>
          <Field label="Publish" group><Chips options={['now', 'schedule', 'draft']} labels={{ now: 'Publish now', schedule: 'Schedule', draft: 'Save as draft' }} value={f.publish} onChange={v => set({ publish: v as TestInput['publish'] })} /></Field>
          {f.publish === 'schedule' && <>
            <Field label="Go-live date"><input className="input" type="date" value={f.date} onChange={e => set({ date: e.target.value })} /></Field>
            <Field label="Time (IST)"><input className="input" type="time" value={f.time} onChange={e => set({ time: e.target.value })} /></Field>
          </>}
        </div>
        <div className="row" style={{ justifyContent: 'flex-end' }}>
          <button type="button" className="btn" disabled={busy} onClick={() => run(() => createTest(f), res => res.ok && router.push(closeHref))}>{busy ? 'Building…' : label}</button>
        </div>
      </div>

      <div className="dark-panel stack" style={{ position: 'sticky', top: 20, '--gap': '14px' } as React.CSSProperties}>
        <span className="eyebrow" style={{ color: '#FFC44D' }}>Summary</span>
        <b style={{ fontSize: 20 }}>{f.name || 'Untitled test'}{n > 1 ? ` × ${n}` : ''}</b>
        <div className="grid" style={{ '--min': '80px', '--gap': '8px' } as React.CSSProperties}>
          {[['Questions', totQ], ['Minutes', f.minutes], ['Max marks', +(totQ * exam.plus).toFixed(1)]].map(([k, v]) => (
            <div key={k} style={{ background: 'rgba(255,255,255,.06)', borderRadius: 12, padding: 12 }}><div style={{ font: '800 24px var(--sans)' }}>{v}</div><div style={{ fontSize: 11, color: 'rgba(255,255,255,.6)', fontWeight: 700 }}>{k}</div></div>
          ))}
        </div>
        <div className="stack" style={{ '--gap': '6px', fontSize: 13 } as React.CSSProperties}>
          {[['Timer', r.secTimer ? 'Sectional' : 'One common timer'], ['Navigation', String(r.nav ?? '—')], ['Marking', exam.marking || '—'], ['Calculator', r.calc ? 'On' : 'Off'], ['Palette', String(r.palette ?? '—')], ['Language', r.lang ? 'English / Hindi' : 'English']].map(([k, v]) => (
            <div key={k} className="row" style={{ justifyContent: 'space-between', flexWrap: 'nowrap' }}><span style={{ color: 'rgba(255,255,255,.6)' }}>{k}</span><b style={{ textAlign: 'right' }}>{v}</b></div>
          ))}
        </div>
        <Link href={`/admin/interfaces?exam=${encodeURIComponent(exam.code)}`} style={{ color: '#AFC0FF', fontSize: 13, fontWeight: 800 }}>Edit the {exam.name} interface →</Link>
      </div>
    </div>
  );
}

/** Stores a picture from a Word file and returns its URL (null if it is not a web image, e.g. an old equation). */
const uploadPicture: ImageUploader = async (name, data) => {
  const fd = new FormData();
  fd.append('file', new Blob([data as BlobPart]), name);
  const r = await uploadImage(fd).catch(() => null);
  return r && r.ok ? r.url : null;
};

type UploadCheck = Awaited<ReturnType<typeof checkUpload>>;

/** Upload whole tests from Excel/CSV or Word, and optionally make a plan (10 mocks, test series) from them. */
export function UploadTests({ exams, courses, nodes, closeHref }: { exams: Exam[]; courses: { id: string; name: string; exam: string | null }[]; nodes: { id: string; path: string; exam: string }[]; closeHref: string }) {
  const [st, setSt] = useState<UploadSettings>({ exam: exams[0]?.code ?? '', type: 'full_mock', name: '', slugPrefix: '', startAt: 1, section: '', minutes: 0, free: false, courses: [], newCourse: null, publish: 'now', nodeId: '' });
  const [content, setContent] = useState<string[][] | null>(null);
  const [details, setDetails] = useState<{ name: string; rows: string[][] } | null>(null);
  const [fileName, setFileName] = useState('');
  const [text, setText] = useState('');
  const [tab, setTab] = useState<'file' | 'paste'>('file');
  // Word holds the questions; the optional Excel sheet adds topic, difficulty, marks… by question number.
  const merged = useMemo(() => (content && details ? mergeDetails(content, details.rows) : null), [content, details]);
  const table = merged ? merged.table : content;
  const setTable = setContent;
  const [check, setCheck] = useState<UploadCheck | null>(null);
  const [checking, setChecking] = useState(false);
  const router = useRouter();
  const toast = useToast();
  const { busy, run } = useAction();
  const exam = exams.find(e => e.code === st.exam) ?? exams[0];
  const set = (p: Partial<UploadSettings>) => setSt(x => ({ ...x, ...p }));
  const seq = useRef(0);

  useEffect(() => {
    if (!table) { setCheck(null); return; }
    const n = ++seq.current;
    setChecking(true);
    const t = setTimeout(() => {
      checkUpload({ table, settings: st }).then(r => { if (n === seq.current) setCheck(r); }).catch(() => toast('Could not check the file. Try again.')).finally(() => { if (n === seq.current) setChecking(false); });
    }, 300);
    return () => clearTimeout(t);
  }, [table, st, toast]);

  const pick = async (file: File | undefined) => {
    if (!file) return;
    if (file.size > 8 * 1024 * 1024) { toast('File is larger than 8 MB. Split it into parts.'); return; }
    try { setFileName(file.name); setTable(await readFile(file, { upload: uploadPicture })); } catch { toast('Could not read that file. Save it as .xlsx, .csv or .docx and try again.'); }
  };
  const pickDetails = async (file: File | undefined) => {
    if (!file) return;
    try { setDetails({ name: file.name, rows: await readFile(file) }); } catch { toast('Could not read the details file. Save it as .xlsx or .csv.'); }
  };
  const many = (check?.tests.length ?? 0) > 1;

  return (
    <div className="card pad stack" style={{ '--gap': '16px' } as React.CSSProperties}>
      <div className="row" style={{ justifyContent: 'space-between' }}><b style={{ fontSize: 17 }}>Upload tests</b><Link className="btn ghost sm" href={closeHref}>Close</Link></div>
      <div className="note" style={{ fontSize: 13 }}>
        One file can hold one test or a whole series. The questions are added to the question bank and the tests are created in one step.
        In <b>Word</b>, start each test with a line <b>Test: CAT Mock 1</b> and each section with <b>Section: QA</b>, then for each question: <b>Topic:</b> (stays until the next Topic line), the numbered question, its options a)–d) (add e) only if the question has five; it gets exactly the options you write), <b>Answer:</b> and <b>Explanation:</b>.
        For an RC passage or DILR set, write <b>D.51-55)</b> followed by the passage just before question 51: questions 51 to 55 share it and always come together. Pictures in the Word file are imported.
        In <b>Excel</b>, add columns <b>Test</b> and <b>Section</b> next to Question, Option A–E, Answer, Solution, Topic and Difficulty.
        {' '}Templates: <a href="/test-upload-template.docx" download>Word test template</a> (questions, options, answers, solutions) with the <a href="/question-details-template.xlsx" download>Excel details template</a> (topic, subtopic, difficulty, time, marks), or everything in one <a href="/test-upload-template.xlsx" download>Excel sheet</a>.
      </div>

      <div className="form-grid">
        <Field label="Exam" req>
          <select className="input" value={st.exam} onChange={e => set({ exam: e.target.value, section: '', courses: [] })}>{exams.map(e => <option key={e.code} value={e.code}>{e.name}</option>)}</select>
        </Field>
        <Field label="Test type" group span><Chips options={Object.keys(TYPES) as TestInput['type'][]} labels={TYPES} value={st.type} onChange={v => set({ type: v as UploadSettings['type'] })} /></Field>
        <Field label="Section" hint="For questions without a section (sectional tests)">
          <select className="input" value={st.section} onChange={e => set({ section: e.target.value })}><option value="">From the file</option>{exam.sections.map(s => <option key={s.code} value={s.code}>{s.name}</option>)}</select>
        </Field>
        <Field label="Test name" hint="Used when the file has no Test lines or column"><input className="input" value={st.name} placeholder="CAT Mock 11" onChange={e => set({ name: e.target.value })} /></Field>
        <Field label="Test ID start (website links)" hint={many ? `Gives ${st.slugPrefix || 'cat-m'}-${st.startAt} … in file order. Blank makes them from the names.` : 'e.g. cat-m-11. Blank makes one from the name.'}>
          <input className="input mono" value={st.slugPrefix} placeholder={many ? 'cat-m' : 'cat-m-11'} onChange={e => set({ slugPrefix: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '') })} />
        </Field>
        {many && <Field label="Start numbering at"><input className="input" type="number" min={0} value={st.startAt} onChange={e => set({ startAt: Number(e.target.value) })} /></Field>}
        <Field label="Duration (min)" hint="0 uses the exam pattern"><input className="input" type="number" min={0} value={st.minutes} onChange={e => set({ minutes: Number(e.target.value) })} /></Field>
      </div>

      <Chips options={['file', 'paste']} labels={{ file: 'Excel, CSV or Word file', paste: 'Paste from Word or PDF' }} value={tab} onChange={v => { setTab(v as 'file' | 'paste'); setTable(null); setFileName(''); }} />
      {tab === 'file' ? (
        <DropZone accept=".xlsx,.csv,.docx,.txt" onFile={pick} title={fileName || 'Drag an .xlsx, .csv or .docx file here, or click to choose'}
          sub={checking ? 'Checking every question…' : 'Pictures in Word files are uploaded with the questions'} />
      ) : (
        <>
          <textarea className="input mono" rows={12} style={{ fontSize: 13 }} value={text} onChange={e => setText(e.target.value)}
            placeholder={'Test: CAT Mock 1\nSection: QA\nTopic: Percentages\nQ.1) A price rises by 20% and then falls by 20%. What is the net change?\na) No change\nb) 4% decrease\nc) 4% increase\nd) 2% decrease\nAnswer: b\nExplanation: 1.2 × 0.8 = 0.96\n\nSection: DILR\nTopic: Arrangements\nD.2-3) Five friends sit in a row…\nQ.2) Who sits at the left end?\na) A  b) B  c) C  d) D  e) E\nAnswer: b\nQ.3) Who sits in the middle?\na) A  b) B  c) C  d) D  e) E\nAnswer: c'} />
          <div className="row" style={{ justifyContent: 'flex-end' }}><button type="button" className="btn ghost" disabled={!text.trim()} onClick={() => { setFileName('Pasted text'); setTable(readText(text)); }}>{checking ? 'Checking…' : 'Check tests'}</button></div>
        </>
      )}

      <div className="stack" style={{ '--gap': '6px' } as React.CSSProperties}>
        <span className="eyebrow">Question details (Excel, optional)</span>
        <div className="row" style={{ '--gap': '10px' } as React.CSSProperties}>
          <div style={{ flex: '0 1 260px' }}><DropZone compact accept=".xlsx,.csv" onFile={pickDetails} title={details ? 'Change details file' : 'Drag the details .xlsx here'} sub={details ? undefined : 'or click to choose'} /></div>
          {details && <button type="button" className="btn ghost sm" onClick={() => setDetails(null)}>Remove</button>}
          <span className="note" style={{ fontSize: 13 }}>
            {details ? `${details.name} · ${merged?.matched ?? 0} questions got their details${merged?.unmatched.length ? ` · ${merged.unmatched.length} rows matched no question (${merged.unmatched.slice(0, 3).join('; ')})` : ''}`
              : 'Topic, subtopic, difficulty, ideal time and marks for each question, matched by Test, Section and Q No. These feed the analysis and the auto test builder.'}
          </span>
        </div>
      </div>

      {check && table && (
        <div className="stack" style={{ '--gap': '12px' } as React.CSSProperties}>
          <div className={'alert ' + (check.errors.length ? 'err' : 'ok')}>
            {check.tests.length} test{check.tests.length === 1 ? '' : 's'} · {check.tests.reduce((a, t) => a + t.questions, 0)} questions
            {check.errors.length > 0 ? ` · ${check.errors.length + (check.moreErrors ?? 0)} need a fix before uploading` : ' · ready'}
          </div>
          <div className="list">
            {check.tests.map(t => (
              <div key={t.name} className="list-row stack" style={{ alignItems: 'flex-start', '--gap': '4px' } as React.CSSProperties}>
                <div className="row" style={{ justifyContent: 'space-between', width: '100%' }}><b>{t.name}</b><span className="mono note">{t.slug || 'ID made from the name'} · {t.minutes} min</span></div>
                <span className="note" style={{ fontSize: 13 }}>
                  {t.sections.map(s => `${s.name} ${s.count}${s.pattern && s.pattern !== s.count ? ` (pattern ${s.pattern})` : ''}`).join(' · ')} · {t.questions} questions
                </span>
              </div>
            ))}
          </div>
          {check.errors.length > 0 && (
            <div className="list">
              {check.errors.map((e, i) => <div key={i} className="list-row" style={{ fontSize: 13 }}><span className="mono" style={{ width: 90, flex: 'none', color: 'var(--bad)' }}>{tab === 'paste' || /docx/i.test(fileName) ? 'Question ' + (e.row - 1) : 'Row ' + e.row}</span><span>{e.message}</span></div>)}
              {(check.moreErrors ?? 0) > 0 && <div className="list-row note">…and {check.moreErrors} more.</div>}
            </div>
          )}

          <div className="form-grid">
            <Field label="Who can take them" group span hint="Free tests are open to everyone; otherwise the selected plans unlock them">
              <div className="chips">
                <button type="button" className="chip" aria-pressed={st.free} onClick={() => set({ free: !st.free })}>Free</button>
                {courses.filter(c => !c.exam || c.exam === st.exam).map(c => (
                  <button key={c.id} type="button" className="chip" aria-pressed={st.courses.includes(c.id)}
                    onClick={() => set({ courses: st.courses.includes(c.id) ? st.courses.filter(x => x !== c.id) : [...st.courses, c.id] })}>{c.name}</button>
                ))}
              </div>
            </Field>
            <Field label="Make a new plan from these tests" span hint="e.g. a 10-mock pack or a test series students can buy">
              <div className="row" style={{ '--gap': '8px' } as React.CSSProperties}>
                <input className="input" style={{ flex: '2 1 200px', width: 'auto' }} value={st.newCourse?.name ?? ''} placeholder={`${exam.name} ${check.tests.length} Mocks`} onChange={e => set({ newCourse: e.target.value ? { name: e.target.value, price: st.newCourse?.price ?? 0, live: st.newCourse?.live ?? false } : null })} />
                <input className="input" style={{ flex: '1 1 110px', width: 'auto' }} type="number" min={0} disabled={!st.newCourse} value={st.newCourse?.price ?? ''} placeholder="Price ₹" onChange={e => st.newCourse && set({ newCourse: { ...st.newCourse, price: Number(e.target.value) } })} />
                <label className="row" style={{ fontSize: 13, fontWeight: 700 }}><input type="checkbox" disabled={!st.newCourse} checked={!!st.newCourse?.live} onChange={e => st.newCourse && set({ newCourse: { ...st.newCourse, live: e.target.checked } })} /> On sale now</label>
              </div>
            </Field>
            <Field label="Also list on the Tests screen under" span hint="Optional. Tests always show in the folders of the courses ticked above.">
              <select className="input" value={st.nodeId} onChange={e => set({ nodeId: e.target.value })}>
                <option value="">Only in its courses' folders</option>{nodes.filter(n => n.exam === st.exam).map(n => <option key={n.id} value={n.id}>{n.path}</option>)}
              </select>
            </Field>
            <Field label="Publish" group><Chips options={['now', 'draft']} labels={{ now: 'Publish now', draft: 'Save as draft' }} value={st.publish} onChange={v => set({ publish: v as 'now' | 'draft' })} /></Field>
          </div>
          <div className="row" style={{ justifyContent: 'flex-end' }}>
            <button type="button" className="btn" disabled={busy || checking || !!check.errors.length || !check.tests.length}
              onClick={() => run(() => uploadTests({ table, settings: st }), r => { if (r.ok) router.push(closeHref); })}>
              {busy ? 'Uploading…' : `Upload ${check.tests.length} test${check.tests.length === 1 ? '' : 's'}`}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
