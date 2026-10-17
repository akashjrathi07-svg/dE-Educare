'use client';
import Link from 'next/link';
import { useState } from 'react';
import { Chips, Drawer, Field, Status, useAction, useToast } from '../ui';
import { deleteTests, duplicateTests, setTestCourses, setTestStatus, updateTest, type TestEdit } from './actions';

type Row = {
  id: string; slug: string; name: string; type: string; typeLabel: string; exam: string; q: number; minutes: number; free: boolean; status: string;
  liveFrom: string; windowEnd: string; nodeId: string; solutions: string; ranking: string; views: number; started: number; attempts: number; courseIds: string[];
};
type Course = { id: string; name: string; exam: string | null };
type Node = { id: string; path: string; exam: string };

const STATUS: Record<string, string> = { live: 'Live', scheduled: 'Scheduled', draft: 'Draft', archived: 'Archived' };
/** ISO time → date and time as typed in IST. */
const ist = (iso: string) => {
  if (!iso) return { date: '', time: '09:00' };
  const d = new Date(new Date(iso).getTime() + 330 * 60000).toISOString();
  return { date: d.slice(0, 10), time: d.slice(11, 16) };
};

/** The tests table: tick tests to add, move or copy them between courses, or open one to edit it. */
export function TestList({ rows, courses, nodes, appUrl, tab }: { rows: Row[]; courses: Course[]; nodes: Node[]; appUrl: string; tab: string }) {
  const [sel, setSel] = useState<string[]>([]);
  const [edit, setEdit] = useState<Row | null>(null);
  const [target, setTarget] = useState('');
  const { busy, run } = useAction();
  const toast = useToast();
  const inCourse = courses.find(c => c.id === tab);
  const name = (id: string) => courses.find(c => c.id === id)?.name ?? '';
  const all = rows.length > 0 && sel.length === rows.length;
  const after = (r: { ok: boolean }) => r.ok && setSel([]);
  const url = (slug: string) => `${appUrl || window.location.origin}/test/${slug}`;
  const copy = async (slug: string) => {
    try { await navigator.clipboard.writeText(url(slug)); toast('Link copied: ' + url(slug)); } catch { window.prompt('Copy this link', url(slug)); }
  };
  const remove = (ids: string[]) => {
    const picked = rows.filter(r => ids.includes(r.id));
    const tries = picked.reduce((a, r) => a + r.started, 0);
    const what = picked.length === 1 ? `"${picked[0].name}"` : `${picked.length} tests`;
    if (!window.confirm(`Delete ${what} for good?${tries ? `\n\n${tries} student${tries === 1 ? ' has' : 's have'} taken ${picked.length === 1 ? 'it' : 'them'}; their attempts and results will be deleted too. To only hide a test, choose Archive instead.` : ''}`)) return;
    run(() => deleteTests(ids), after);
  };

  return (
    <>
      {sel.length > 0 && (
        <div className="card pad row" style={{ '--gap': '10px', position: 'sticky', top: 8, zIndex: 5 } as React.CSSProperties}>
          <b>{sel.length} selected</b>
          <select className="input" style={{ width: 'auto', minWidth: 200 }} value={target} onChange={e => setTarget(e.target.value)} aria-label="Course">
            <option value="">Choose a course…</option>{courses.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
          <button type="button" className="btn sm" disabled={busy || !target} onClick={() => run(() => setTestCourses(sel, 'add', target), after)}
            title="The same test, unlocked by this course too">Add to course</button>
          {inCourse && <button type="button" className="btn ghost sm" disabled={busy || !target || target === tab} onClick={() => run(() => setTestCourses(sel, 'move', target, tab), after)}
            title={`Take out of ${inCourse.name} and put in the chosen course`}>Move to course</button>}
          <button type="button" className="btn ghost sm" disabled={busy || !target} onClick={() => run(() => duplicateTests(sel, target), after)}
            title="A separate copy with the same questions, with its own attempts and ranks">Copy into course</button>
          {inCourse && <button type="button" className="btn ghost sm" disabled={busy} onClick={() => run(() => setTestCourses(sel, 'remove', tab), after)}>Remove from {inCourse.name}</button>}
          <span style={{ flex: 1 }} />
          <button type="button" className="btn ghost sm" style={{ color: 'var(--bad)' }} disabled={busy} onClick={() => remove(sel)}>Delete</button>
          <button type="button" className="btn ghost sm" onClick={() => setSel([])}>Clear</button>
        </div>
      )}

      <div className="tbl-wrap">
        <div className="tbl" style={{ '--minw': '1000px', '--cols': '28px minmax(0,1.6fr) 90px 40px 48px minmax(0,1.2fr) 52px 64px 66px 90px 140px' } as React.CSSProperties}>
          <div className="tr th">
            <input type="checkbox" aria-label="Select all" checked={all} onChange={() => setSel(all ? [] : rows.map(r => r.id))} />
            <span>Test</span><span>Type</span><span>Q</span><span>Min</span><span>Courses</span><span title="Times students opened the test page">Views</span>
            <span title="Students who started it">Students</span><span title="Submitted attempts">Attempts</span><span>Status</span><span />
          </div>
          {rows.length === 0 && <div className="empty">No tests here yet.</div>}
          {rows.map(t => (
            <div key={t.id} className="tr">
              <input type="checkbox" aria-label={'Select ' + t.name} checked={sel.includes(t.id)} onChange={() => setSel(s => (s.includes(t.id) ? s.filter(x => x !== t.id) : [...s, t.id]))} />
              <div className="stack" style={{ '--gap': '2px' } as React.CSSProperties}>
                <button type="button" className="t" style={{ background: 'none', border: 0, padding: 0, textAlign: 'left', cursor: 'pointer', font: 'inherit', fontWeight: 800 }} onClick={() => setEdit(t)}>{t.name}</button>
                <span className="s mono">{t.exam} · {t.status === 'live' ? <Link href={`/test/${t.slug}`} target="_blank">{t.slug} ↗</Link> : t.slug}</span>
              </div>
              <span className="s">{t.typeLabel}</span><span className="mono">{t.q}</span><span className="mono">{t.minutes}</span>
              <span className="s">{[t.free && 'Free', ...t.courseIds.map(name)].filter(Boolean).join(' · ') || <span style={{ color: 'var(--bad)' }}>Nobody can take it</span>}</span>
              <span className="mono">{t.views.toLocaleString('en-IN')}</span>
              <span className="mono">{t.started.toLocaleString('en-IN')}</span>
              <span className="mono">{t.attempts.toLocaleString('en-IN')}</span>
              <span title={t.status === 'scheduled' ? 'Goes live ' + new Date(t.liveFrom).toLocaleString('en-IN') : undefined}><Status s={STATUS[t.status] ?? t.status} /></span>
              <div className="row" style={{ '--gap': '4px', flexWrap: 'nowrap' } as React.CSSProperties}>
                <button type="button" className="btn ghost sm" onClick={() => setEdit(t)}>Edit</button>
                <button type="button" className="btn ghost sm" title="Copy the student link" aria-label={'Copy link to ' + t.name} onClick={() => copy(t.slug)}>🔗</button>
                <select className="input" style={{ width: 30, padding: 4, fontSize: 11 }} aria-label={'More for ' + t.name} value="" disabled={busy}
                  onChange={e => {
                    const v = e.target.value;
                    if (v === 'delete') remove([t.id]);
                    else if (v === 'copy') run(() => duplicateTests([t.id], ''));
                    else if (v) run(() => setTestStatus(t.id, v as 'live' | 'draft' | 'archived'));
                  }}>
                  <option value="">⋯</option>
                  {t.status !== 'live' && <option value="live">Publish now</option>}
                  {t.status !== 'draft' && <option value="draft">Move to draft</option>}
                  {t.status !== 'archived' && <option value="archived">Archive (hide)</option>}
                  <option value="copy">Make a copy</option>
                  <option value="delete">Delete…</option>
                </select>
              </div>
            </div>
          ))}
        </div>
      </div>

      {edit && <EditTest key={edit.id} row={edit} courses={courses} nodes={nodes} onClose={() => setEdit(null)} copyLink={() => copy(edit.slug)} onDelete={() => { setEdit(null); remove([edit.id]); }} />}
    </>
  );
}

function EditTest({ row, courses, nodes, onClose, copyLink, onDelete }: { row: Row; courses: Course[]; nodes: Node[]; onClose: () => void; copyLink: () => void; onDelete: () => void }) {
  const live = ist(row.liveFrom), win = ist(row.windowEnd);
  const [f, setF] = useState<TestEdit>({
    name: row.name, slug: row.slug, minutes: row.minutes, free: row.free, courses: row.courseIds, nodeId: row.nodeId,
    solutions: row.solutions as TestEdit['solutions'], windowEnd: win.date, ranking: row.ranking as TestEdit['ranking'],
    status: row.status === 'scheduled' ? 'schedule' : (row.status as TestEdit['status']), date: live.date, time: live.time,
  });
  const set = (p: Partial<TestEdit>) => setF(x => ({ ...x, ...p }));
  const { busy, run } = useAction();
  return (
    <Drawer title="Edit test" onClose={onClose}
      foot={<>
        <button type="button" className="btn ghost" style={{ color: 'var(--bad)', marginRight: 'auto' }} onClick={onDelete}>Delete</button>
        <button type="button" className="btn ghost" onClick={onClose}>Cancel</button>
        <button type="button" className="btn" disabled={busy} onClick={() => run(() => updateTest(row.id, f), r => r.ok && onClose())}>{busy ? 'Saving…' : 'Save changes'}</button>
      </>}>
      <Field label="Test name" req><input className="input" value={f.name} onChange={e => set({ name: e.target.value })} /></Field>
      <Field label="Test ID (link)" hint={row.started ? 'Students have taken this test; old links stop working if you change the ID.' : 'Used in the link students open: /test/<id>'}>
        <input className="input mono" value={f.slug} onChange={e => set({ slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '') })} />
      </Field>
      <div className="row" style={{ '--gap': '8px' } as React.CSSProperties}><button type="button" className="btn ghost sm" onClick={copyLink}>Copy student link</button>
        <span className="note mono" style={{ fontSize: 12 }}>{row.exam} · {row.typeLabel} · {row.q} questions</span></div>
      <Field label="Duration (minutes)" req hint="Section timers, if the exam has them, change in proportion">
        <input className="input" type="number" min={1} max={600} value={f.minutes} onChange={e => set({ minutes: Number(e.target.value) })} />
      </Field>
      <Field label="Who can take it" group hint="Free tests are open to everyone. Otherwise each ticked course unlocks it, and it shows in that course's folder.">
        <div className="chips">
          <button type="button" className="chip" aria-pressed={f.free} onClick={() => set({ free: !f.free })}>Free</button>
          {courses.filter(c => !c.exam || c.exam === row.exam).map(c => (
            <button key={c.id} type="button" className="chip" aria-pressed={f.courses.includes(c.id)}
              onClick={() => set({ courses: f.courses.includes(c.id) ? f.courses.filter(x => x !== c.id) : [...f.courses, c.id] })}>{c.name}</button>
          ))}
        </div>
      </Field>
      <Field label="Also list on the Tests screen under" hint="Optional. Tests already show in the folders of the courses ticked above.">
        <select className="input" value={f.nodeId} onChange={e => set({ nodeId: e.target.value })}>
          <option value="">Only in its courses' folders</option>{nodes.filter(n => n.exam === row.exam).map(n => <option key={n.id} value={n.id}>{n.path}</option>)}
        </select>
      </Field>
      <Field label="Status" group>
        <Chips options={['live', 'schedule', 'draft', 'archived']} labels={{ live: 'Live', schedule: 'Scheduled', draft: 'Draft', archived: 'Archived' }} value={f.status} onChange={v => set({ status: v as TestEdit['status'] })} />
      </Field>
      {f.status === 'schedule' && <div className="form-grid">
        <Field label="Go-live date"><input className="input" type="date" value={f.date} onChange={e => set({ date: e.target.value })} /></Field>
        <Field label="Time (IST)"><input className="input" type="time" value={f.time} onChange={e => set({ time: e.target.value })} /></Field>
      </div>}
      <Field label="Show solutions" group><Chips options={['after_submit', 'after_window']} labels={{ after_submit: 'Right after submit', after_window: 'After the window closes' }} value={f.solutions} onChange={v => set({ solutions: v as TestEdit['solutions'] })} /></Field>
      {f.solutions === 'after_window' && <Field label="Window closes on"><input className="input" type="date" value={f.windowEnd} onChange={e => set({ windowEnd: e.target.value })} /></Field>}
      <Field label="Ranking" group><Chips options={['all_india', 'batch', 'none']} labels={{ all_india: 'All-India percentile', batch: 'Batch rank only', none: 'No ranking' }} value={f.ranking} onChange={v => set({ ranking: v as TestEdit['ranking'] })} /></Field>
      <div className="note" style={{ fontSize: 13 }}>{row.views.toLocaleString('en-IN')} views · {row.started.toLocaleString('en-IN')} students started · {row.attempts.toLocaleString('en-IN')} submitted</div>
    </Drawer>
  );
}
