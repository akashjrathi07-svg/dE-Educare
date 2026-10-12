'use client';
import { useState } from 'react';
import { Chips, Drawer, Field, Head, Status, useAction } from '../ui';
import { saveCoupon, setCouponActive, type CouponInput } from './actions';

type Row = CouponInput & { id: string; used: number; owner: string | null; paid: number; given: number };
const inr = (n: number) => '₹' + Math.round(n).toLocaleString('en-IN');
const blank = (): CouponInput => ({ id: null, code: '', kind: 'percent', value: 10, cap: 0, maxUses: 0, validTill: '', scope: '', courseIds: [], active: true });
const SCOPE = { '': 'Every plan', test_series: 'Test series & mocks', coaching: 'Coaching', courses: 'Chosen plans' };

export function CouponsClient({ rows, courses, rewards, switchLink }: { rows: Row[]; courses: { id: string; name: string; category: string }[]; rewards: boolean; switchLink: React.ReactNode }) {
  const [form, setForm] = useState<CouponInput | null>(null);
  const { busy, run } = useAction();
  const set = (p: Partial<CouponInput>) => setForm(f => f && { ...f, ...p });
  const off = (r: CouponInput) => r.kind === 'percent' ? `${r.value}% off${r.cap ? ` (up to ${inr(r.cap)})` : ''}` : `${inr(r.value)} off`;
  const today = new Date().toISOString().slice(0, 10);

  return (
    <>
      <Head title="Coupons" sub={rewards ? 'Personal coupons students won or redeemed with XP' : 'Discount codes students type at checkout'}>
        {switchLink}
        {!rewards && <button type="button" className="btn" onClick={() => setForm(blank())}>New coupon</button>}
      </Head>
      <div className="tbl-wrap">
        <div className="tbl" style={{ '--minw': '900px', '--cols': 'minmax(0,1fr) minmax(0,1.2fr) minmax(0,1.3fr) 90px 110px 110px 100px' } as React.CSSProperties}>
          <div className="tr th"><span>Code</span><span>Discount</span><span>Applies to</span><span>Used</span><span>Valid till</span><span>Given away</span><span>Status</span></div>
          {rows.length === 0 && <div className="empty">{rewards ? 'No reward coupons yet.' : 'No coupons yet. Make one with New coupon.'}</div>}
          {rows.map(r => {
            const expired = !!r.validTill && r.validTill < today;
            const full = r.maxUses > 0 && r.used >= r.maxUses;
            return (
              <button key={r.id} type="button" className="tr" onClick={() => !rewards && setForm({ ...r })} style={{ cursor: rewards ? 'default' : undefined }}>
                <div className="stack" style={{ '--gap': '2px' } as React.CSSProperties}><span className="t mono">{r.code}</span>{r.owner && <span className="s">{r.owner}</span>}</div>
                <span>{off(r)}</span>
                <span className="s">{r.scope === 'courses' ? courses.filter(c => r.courseIds.includes(c.id)).map(c => c.name).join(', ') : SCOPE[r.scope]}</span>
                <span className="mono">{r.used}{r.maxUses ? ` / ${r.maxUses}` : ''}</span>
                <span className="s">{r.validTill ? new Date(r.validTill).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : 'No end date'}</span>
                <span className="mono">{r.paid ? `${inr(r.given)} · ${r.paid}` : '—'}</span>
                <Status s={!r.active ? 'Paused' : expired ? 'Expired' : full ? 'Used up' : 'Live'} />
              </button>
            );
          })}
        </div>
      </div>
      {!rewards && <p className="note">Students type the code on the checkout page. The website&apos;s plan buttons can also carry one: <span className="mono">/checkout?plan=cat-ts&amp;coupon=CAT500</span>.</p>}

      {form && (
        <Drawer title={form.id ? 'Edit coupon' : 'New coupon'} onClose={() => setForm(null)}
          foot={<>
            {form.id && <button type="button" className="btn ghost" disabled={busy} onClick={() => run(() => setCouponActive(form.id!, !form.active), r => r.ok && setForm(null))}>{form.active ? 'Pause' : 'Make live'}</button>}
            <button type="button" className="btn" disabled={busy} onClick={() => run(() => saveCoupon(form), r => r.ok && setForm(null))}>{busy ? 'Saving…' : 'Save coupon'}</button>
          </>}>
          <Field label="Code" req hint="What students type at checkout"><input className="input mono" value={form.code} placeholder="CAT500" onChange={e => set({ code: e.target.value.toUpperCase().replace(/\s+/g, '') })} /></Field>
          <Field label="Discount" group><Chips options={['percent', 'flat']} labels={{ percent: '% off', flat: '₹ off' }} value={form.kind} onChange={v => set({ kind: v as 'percent' | 'flat' })} /></Field>
          <div className="form-grid" style={{ '--min': '150px' } as React.CSSProperties}>
            <Field label={form.kind === 'percent' ? 'Percent off' : 'Rupees off'} req><input className="input" type="number" min={1} value={form.value} onChange={e => set({ value: Number(e.target.value) })} /></Field>
            {form.kind === 'percent' && <Field label="Most it can take off (₹)" hint="0 = no limit"><input className="input" type="number" min={0} value={form.cap} onChange={e => set({ cap: Number(e.target.value) })} /></Field>}
            <Field label="How many times" hint="0 = unlimited"><input className="input" type="number" min={0} value={form.maxUses} onChange={e => set({ maxUses: Number(e.target.value) })} /></Field>
            <Field label="Valid till" hint="Blank = no end date"><input className="input" type="date" value={form.validTill} onChange={e => set({ validTill: e.target.value })} /></Field>
          </div>
          <Field label="Applies to" group><Chips options={Object.keys(SCOPE) as CouponInput['scope'][]} labels={SCOPE} value={form.scope} onChange={v => set({ scope: v as CouponInput['scope'] })} /></Field>
          {form.scope === 'courses' && (
            <div className="chips">
              {courses.map(c => <button key={c.id} type="button" className="chip" aria-pressed={form.courseIds.includes(c.id)} onClick={() => set({ courseIds: form.courseIds.includes(c.id) ? form.courseIds.filter(x => x !== c.id) : [...form.courseIds, c.id] })}>{c.name}</button>)}
            </div>
          )}
          <Field label="Status" group><Chips options={['on', 'off']} labels={{ on: 'Live', off: 'Paused' }} value={form.active ? 'on' : 'off'} onChange={v => set({ active: v === 'on' })} /></Field>
        </Drawer>
      )}
    </>
  );
}
