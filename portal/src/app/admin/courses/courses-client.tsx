'use client';
import { useState } from 'react';
import { Chips, Drawer, Field, Head, Status, useAction } from '../ui';
import { saveCourse, type CourseInput } from './actions';

type Course = CourseInput & { slug: string; exam: string; students: number };

const VALIDITY = { till_exam: 'Till exam date', '6m': '6 months', '12m': '12 months' };
const GURU = { '10/day': '10 a day', '50/day': '50 a day', unlimited: 'Unlimited' };
const INCLUDES = ['Full mocks', 'Sectionals', 'Topic tests', 'Previous papers', 'Daily tests', 'Live classes', 'Recordings', 'Study material'];
const inr = (n: number) => n.toLocaleString('en-IN');
const blank = (examId: string | null): CourseInput => ({ id: null, name: '', examId, price: 0, mrp: 0, validity: 'till_exam', includes: ['Full mocks'], guru: '10/day', channels: ['web', 'app'], status: 'draft', description: '', features: [], badge: '' });

export function CoursesClient({ courses, exams }: { courses: Course[]; exams: { id: string; name: string }[] }) {
  const [form, setForm] = useState<CourseInput | null>(null);
  const { busy, run } = useAction();
  const set = (p: Partial<CourseInput>) => setForm(f => f && { ...f, ...p });

  return (
    <>
      <Head title="Courses & plans" sub="Products students can buy on the website and app">
        <button type="button" className="btn" onClick={() => setForm(blank(exams[0]?.id ?? null))}>New course</button>
      </Head>
      <div className="tbl-wrap">
        <div className="tbl" style={{ '--minw': '980px', '--cols': 'minmax(0,1.5fr) 90px 90px 120px minmax(0,1.4fr) 90px 90px 80px' } as React.CSSProperties}>
          <div className="tr th"><span>Course</span><span>Exam</span><span>Price</span><span>Validity</span><span>Includes</span><span>Guru</span><span>Students</span><span>Status</span></div>
          {courses.map(c => (
            <button key={c.id} type="button" className="tr" onClick={() => setForm({ ...c })}>
              <div className="stack" style={{ '--gap': '2px' } as React.CSSProperties}><span className="t">{c.name}</span><span className="s mono">{c.slug} · {c.channels.join(' + ')}</span></div>
              <span>{c.exam}</span>
              <span>{c.price ? '₹' + inr(c.price) : 'Free'}</span>
              <span>{VALIDITY[c.validity as keyof typeof VALIDITY]}</span>
              <span className="s">{c.includes.join(', ')}</span>
              <span>{GURU[c.guru as keyof typeof GURU]}</span>
              <span>{inr(c.students)}</span>
              <Status s={c.status === 'live' ? 'Live' : 'Draft'} />
            </button>
          ))}
        </div>
      </div>
      <p className="note">The checkout link for a course is <span className="mono">/checkout?plan=&lt;id&gt;</span>. Website buttons already point to these ids. Prices typed on the WordPress site are text, so update them there too when you change a price here.</p>

      {form && (
        <Drawer title={form.id ? 'Edit course' : 'New course'} onClose={() => setForm(null)}
          foot={<><button type="button" className="btn ghost" onClick={() => setForm(null)}>Cancel</button>
            <button type="button" className="btn" disabled={busy} onClick={() => run(() => saveCourse(form), r => r.ok && setForm(null))}>{busy ? 'Saving…' : 'Save course'}</button></>}>
          <Field label="Course name" req><input className="input" value={form.name} placeholder="CAT Test Series" onChange={e => set({ name: e.target.value })} /></Field>
          <Field label="Exam">
            <select className="input" value={form.examId ?? ''} onChange={e => set({ examId: e.target.value || null })}>
              <option value="">Any exam</option>{exams.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
            </select>
          </Field>
          <div className="form-grid" style={{ '--min': '160px' } as React.CSSProperties}>
            <Field label="Price (₹, incl. GST)"><input className="input" type="number" min={0} value={form.price} onChange={e => set({ price: Number(e.target.value) })} /></Field>
            <Field label="MRP (₹, shown struck through)"><input className="input" type="number" min={0} value={form.mrp} onChange={e => set({ mrp: Number(e.target.value) })} /></Field>
          </div>
          <Field label="Validity" group><Chips options={Object.keys(VALIDITY)} labels={VALIDITY} value={form.validity} onChange={v => set({ validity: v as string })} /></Field>
          <Field label="Includes" group hint="Shown on the plan card"><Chips options={INCLUDES} value={form.includes} onChange={v => set({ includes: v as string[] })} /></Field>
          <Field label="Guru quota" group><Chips options={Object.keys(GURU)} labels={GURU} value={form.guru} onChange={v => set({ guru: v as string })} /></Field>
          <Field label="Sell on" group><Chips options={['web', 'app']} labels={{ web: 'Web', app: 'App' }} value={form.channels} onChange={v => set({ channels: v as string[] })} /></Field>
          <Field label="Status" group><Chips options={['live', 'draft']} labels={{ live: 'Live', draft: 'Draft' }} value={form.status} onChange={v => set({ status: v as string })} /></Field>
          <Field label="Short description"><input className="input" value={form.description} onChange={e => set({ description: e.target.value })} /></Field>
          <Field label="Feature lines" hint="One per line, shown with ticks on the Plans page">
            <textarea className="input" rows={4} value={form.features.join('\n')} onChange={e => set({ features: e.target.value.split('\n') })} />
          </Field>
          <Field label="Badge"><input className="input" value={form.badge} placeholder="Most popular" onChange={e => set({ badge: e.target.value })} /></Field>
        </Drawer>
      )}
    </>
  );
}
