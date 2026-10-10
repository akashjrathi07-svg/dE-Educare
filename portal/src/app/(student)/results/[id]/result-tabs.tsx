'use client';
import { useState } from 'react';
import Link from 'next/link';
import { fmt, type Analysis } from '@/lib/analysis';
import { askGuru } from '@/components/guru';
import { ReportQuestion } from './report-question';

const TABS = [['overview', 'Overview'], ['time', 'Time & solutions'], ['section', 'Section-wise'], ['topic', 'Topic-wise'], ['difficulty', 'Difficulty'], ['swot', 'SWOT']] as const;
const DIFF: Record<string, string> = { easy: 'ok', medium: 'mid', hard: 'bad' };
const RES = { ok: ['Correct', 'var(--ok)'], bad: ['Wrong', 'var(--bad)'], skip: ['Skipped', 'var(--muted)'] } as const;
const cap = (s: string) => s[0].toUpperCase() + s.slice(1);
const pct = (n: number | null) => (n == null ? '—' : n + '%');

/** Plain-language verdict from the percentile. */
function verdict(p: number) {
  if (p >= 95) return ['Excellent attempt', 'You are in the top 5%. Keep the mock rhythm and polish the few gaps below.', 'ok'];
  if (p >= 85) return ['Strong attempt', 'Top 15%. A few fixes in the topics below can move you into the 95+ band.', 'ok'];
  if (p >= 70) return ['On track', 'Solid base. Most of your lost marks are in a handful of topics; fix those first.', 'mid'];
  return ['Building up', 'This is a starting point. Work on the three topics below with topic tests before your next mock.', 'bad'];
}

export function ResultTabs({ data, solutionsOpen, percentile }: { data: Analysis; solutionsOpen: boolean; percentile: number }) {
  const [tab, setTab] = useState<(typeof TABS)[number][0]>('overview');
  const [open, setOpen] = useState<number | null>(null);
  const peerWord = data.peersReady ? 'Peers' : 'Ideal';

  return (
    <>
      <div className="seg" role="tablist">
        {TABS.map(([id, t]) => <button key={id} type="button" role="tab" aria-current={tab === id} onClick={() => setTab(id)}>{t}</button>)}
      </div>
      {!data.peersReady && <p className="note" style={{ marginTop: -10 }}>Peer times and accuracy appear once 50 students have answered a question. Until then we compare with the ideal time set by faculty.</p>}

      {tab === 'overview' && (() => {
        const [title, line, tone] = verdict(percentile);
        const tot = data.sections.reduce((a, x) => ({ c: a.c + x.c, w: a.w + x.w, skip: a.skip + x.skip, n: a.n + x.n }), { c: 0, w: 0, skip: 0, n: 0 });
        const lost = data.timeRows.filter(r => r.marks < 0).reduce((a, r) => a + r.marks, 0);
        const fixes = data.topics.filter(t => t.status === 'Weak').slice(0, 3);
        return (
          <div className="stack" style={{ '--gap': '16px' } as React.CSSProperties}>
            <div className={'card pad stack ov-verdict ' + tone} style={{ '--gap': '4px' } as React.CSSProperties}>
              <b style={{ fontSize: 20 }}>{title}</b>
              <span style={{ fontSize: 14, lineHeight: 1.5 }}>{line}</span>
            </div>
            <div className="grid" style={{ '--min': '260px', '--gap': '12px' } as React.CSSProperties}>
              <div className="card pad stack" style={{ '--gap': '12px' } as React.CSSProperties}>
                <span className="eyebrow">Section by section</span>
                {data.sections.map(x => (
                  <div key={x.sectionId} className="stack" style={{ '--gap': '5px' } as React.CSSProperties}>
                    <div className="row" style={{ justifyContent: 'space-between', fontSize: 13, fontWeight: 800 }}><span>{x.name}</span><span>{x.score} marks · {x.acc}% accurate</span></div>
                    <div className="bar"><i style={{ width: Math.max(3, x.acc) + '%', background: x.acc >= 75 ? 'var(--ok-solid)' : x.acc >= 50 ? 'var(--amber)' : 'var(--bad-solid)' }} /></div>
                    <span className="muted" style={{ fontSize: 12 }}>{x.c} right · {x.w} wrong · {x.skip} skipped</span>
                  </div>
                ))}
              </div>
              <div className="card pad stack" style={{ '--gap': '12px' } as React.CSSProperties}>
                <span className="eyebrow">Where your marks went</span>
                <div className="ov-split" aria-label={`${tot.c} correct, ${tot.w} wrong, ${tot.skip} skipped`}>
                  <i style={{ flex: tot.c, background: 'var(--ok-solid)' }} /><i style={{ flex: tot.w, background: 'var(--bad-solid)' }} /><i style={{ flex: tot.skip, background: 'var(--line)' }} />
                </div>
                <div className="row" style={{ fontSize: 13, fontWeight: 700 }}>
                  <span><b style={{ color: 'var(--ok)' }}>{tot.c}</b> correct</span><span><b style={{ color: 'var(--bad)' }}>{tot.w}</b> wrong</span><span><b>{tot.skip}</b> skipped</span>
                </div>
                <span className="muted" style={{ fontSize: 13, lineHeight: 1.5 }}>
                  {lost < 0 ? `Wrong answers cost you ${Math.abs(lost)} mark${lost === -1 ? '' : 's'} in negative marking. ` : 'No marks lost to negative marking. '}
                  {data.timeStats.find(t => t.k === 'Time sinks')?.v !== '0' ? `${data.timeStats.find(t => t.k === 'Time sinks')?.v} question(s) took far longer than they should.` : 'Your pacing was steady.'}
                </span>
              </div>
            </div>
            <div className="card pad stack" style={{ '--gap': '10px' } as React.CSSProperties}>
              <span className="eyebrow">Fix these first</span>
              {fixes.length === 0 && <span className="muted" style={{ fontSize: 14 }}>No weak topics in this test. Try a harder sectional next.</span>}
              {fixes.map((t, i) => (
                <div key={t.topic} className="row" style={{ justifyContent: 'space-between', '--gap': '10px' } as React.CSSProperties}>
                  <span className="row" style={{ '--gap': '10px', flexWrap: 'nowrap' } as React.CSSProperties}><span className="ov-n">{i + 1}</span><span className="stack" style={{ '--gap': '1px' } as React.CSSProperties}><b style={{ fontSize: 14 }}>{t.topic}</b><span className="muted" style={{ fontSize: 12 }}>{t.section} · {t.verdict}{t.hist != null ? ` · ${t.hist}% over your last 5 tests` : ''}</span></span></span>
                  {t.node ? <Link href={`/tests?node=${t.node}`} className="btn sm">Topic test</Link> : <button type="button" className="btn ghost sm" onClick={() => askGuru(`Explain ${t.topic} and give me 3 practice questions.`)}>Ask Guru</button>}
                </div>
              ))}
            </div>
            <p className="note">Want the full picture? Open <b>Time & solutions</b> for every question, or <b>Topic-wise</b> and <b>SWOT</b> for the in-depth analysis.</p>
          </div>
        );
      })()}

      {tab === 'time' && (
        <div className="stack" style={{ '--gap': '14px' } as React.CSSProperties}>
          <div className="grid" style={{ '--min': '170px', '--gap': '10px' } as React.CSSProperties}>
            {data.timeStats.map(s => (
              <div key={s.k} className="card pad stack" style={{ '--gap': '4px', padding: 16 } as React.CSSProperties}>
                <span className="eyebrow">{s.k}</span>
                <span style={{ font: '800 30px/1 var(--sans)', letterSpacing: '-.03em' }}>{s.v}</span>
                <span className="muted" style={{ fontSize: 12, fontWeight: 700 }}>{s.s}</span>
              </div>
            ))}
          </div>
          <div className="tbl-wrap">
            <div className="tbl" style={{ '--minw': '780px', '--cols': '44px minmax(0,1.4fr) 70px minmax(0,1.6fr) 66px 76px 56px 78px' } as React.CSSProperties}>
              <div className="tr th"><span>Q</span><span>Topic</span><span>Level</span><span>Your time vs {peerWord.toLowerCase()}</span><span>Diff</span><span>Result</span><span>Peers ✓</span><span /></div>
              {data.timeRows.map(r => (
                <div key={r.n} style={{ borderTop: '1px solid var(--line2)' }}>
                  <div className="tr" style={{ borderTop: 0 }}>
                    <span className="mono muted">{r.n}</span>
                    <span className="stack" style={{ '--gap': '1px' } as React.CSSProperties}><span className="t">{r.topic}</span><span className="s">{r.section}</span></span>
                    <span className={'tag ' + DIFF[r.difficulty]}>{cap(r.difficulty)}</span>
                    <div className="vs">
                      <div><span className="lbl">You</span><div className="bar"><i style={{ width: r.youPct + '%', background: r.sink ? 'var(--sink)' : 'var(--pri)' }} /></div><span className="val">{fmt(r.you)}</span></div>
                      <div><span className="lbl">{peerWord}</span><div className="bar"><i style={{ width: r.refPct + '%', background: 'var(--faint)' }} /></div><span className="val muted">{fmt(r.peer ?? r.ideal)}</span></div>
                    </div>
                    <span className="mono" style={{ fontSize: 12, color: r.slow ? 'var(--bad)' : 'var(--ok)' }}>{(r.delta >= 0 ? '+' : '−') + fmt(Math.abs(r.delta))}</span>
                    <span style={{ fontWeight: 800, color: RES[r.result][1] }}>{RES[r.result][0]}{r.result === 'bad' && r.marks < 0 ? ` · ${r.marks}` : ''}</span>
                    <span className="mono">{pct(r.peerAcc)}</span>
                    <button type="button" className="btn chip sm" onClick={() => setOpen(open === r.n ? null : r.n)} aria-expanded={open === r.n}>{open === r.n ? 'Hide' : 'Solution'}</button>
                  </div>
                  {open === r.n && (
                    <div className="sol">
                      {r.setText && <div className="pre muted" style={{ fontSize: 13, lineHeight: 1.55 }}>{r.setText}</div>}
                      <div className="pre" style={{ lineHeight: 1.55, fontWeight: 600 }}>{r.text}</div>
                      <div className="muted" style={{ fontSize: 13 }}>Your answer: <b style={{ color: 'var(--ink)' }}>{r.yours}</b> · Correct: <b style={{ color: 'var(--ok)' }}>{r.right}</b></div>
                      {solutionsOpen
                        ? <div className="pre" style={{ lineHeight: 1.6 }}>{r.solution || 'Solution coming soon.'}</div>
                        : <div className="muted">Solutions open after the test window closes.</div>}
                      {solutionsOpen && r.video && <a href={r.video} target="_blank" rel="noopener noreferrer" className="link">Watch the video solution →</a>}
                      <div className="row" style={{ gap: 16, fontSize: 12, fontWeight: 800, color: 'var(--muted)' }}>
                        <span>Your time: {fmt(r.you)}</span><span>Peer average: {r.peer != null ? fmt(r.peer) : '—'}</span><span>Topper: {r.topper != null ? fmt(r.topper) : '—'}</span><span style={{ color: 'var(--priInk)' }}>Ideal: {fmt(r.ideal)}</span>
                      </div>
                      <ReportQuestion questionId={r.questionId} />
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {tab === 'section' && (
        <div className="tbl-wrap">
          <div className="tbl" style={{ '--minw': '780px', '--cols': 'minmax(0,1.2fr) 90px 90px minmax(0,1.7fr) minmax(0,1.1fr)' } as React.CSSProperties}>
            <div className="tr th"><span>Section</span><span>Score</span><span>Attempted</span><span>Accuracy · you vs peers</span><span>Time · you / {peerWord.toLowerCase()}</span></div>
            {data.sections.map(s => (
              <div key={s.sectionId} className="tr" style={{ padding: '16px 18px', fontSize: 14 }}>
                <span className="stack" style={{ '--gap': '2px' } as React.CSSProperties}><span style={{ fontWeight: 800 }}>{s.name}</span><span className="s">{s.c} correct · {s.w} wrong · {s.skip} skipped</span></span>
                <span>{s.score}</span>
                <span>{s.c + s.w} / {s.n}</span>
                <div className="vs">
                  <div><span className="lbl">You</span><div className="bar"><i style={{ width: Math.max(2, s.acc) + '%', background: s.acc >= 67 ? 'var(--ok-solid)' : s.acc >= 34 ? 'var(--amber)' : 'var(--bad-solid)' }} /></div><span className="val">{s.acc}%</span></div>
                  <div><span className="lbl">Peers</span><div className="bar"><i style={{ width: (s.peerAcc ?? 0) + '%', background: 'var(--faint)' }} /></div><span className="val muted">{pct(s.peerAcc)}</span></div>
                </div>
                <span className="mono"><span style={{ color: s.you > s.ref * 1.15 ? 'var(--bad)' : 'var(--ok)' }}>{fmt(s.you)}</span> / {fmt(s.ref)}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {tab === 'topic' && (
        <div className="tbl-wrap">
          <div className="tbl" style={{ '--minw': '760px', '--cols': 'minmax(0,1.4fr) 92px minmax(0,1fr) minmax(0,1.2fr) 52px 76px 96px' } as React.CSSProperties}>
            <div className="tr th"><span>Topic</span><span>This test</span><span>Time · you / {peerWord.toLowerCase()}</span><span>Accuracy · last 5</span><span>Peers</span><span>Status</span><span /></div>
            {data.topics.map(t => {
              const sc = t.status === 'Weak' ? 'bad' : t.status === 'Strong' ? 'ok' : 'mid';
              return (
                <div key={t.topic} className="tr">
                  <span className="stack" style={{ '--gap': '1px' } as React.CSSProperties}><span className="t">{t.topic}</span><span className="s">{t.section}</span></span>
                  <span style={{ fontWeight: 800, color: RES[t.result][1] }}>{t.verdict}</span>
                  <span className="mono" style={{ fontSize: 12 }}><span style={{ color: t.slow ? 'var(--bad)' : 'var(--ok)' }}>{fmt(t.you)}</span> / {fmt(t.ref)}</span>
                  <div className="row" style={{ flexWrap: 'nowrap' }}><div className="bar"><i style={{ width: (t.hist ?? 0) + '%', background: `var(--${sc === 'mid' ? 'mid-ink' : sc + '-ink'})` }} /></div><span className="val mono" style={{ width: 40, textAlign: 'right', fontSize: 12 }}>{pct(t.hist)}</span></div>
                  <span className="mono muted" style={{ fontSize: 12 }}>{pct(t.peerAcc)}</span>
                  <span className={'tag ' + sc}>{t.status}</span>
                  {t.node ? <Link href={`/tests?node=${t.node}`} className="btn sm">Topic test</Link> : <span />}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {tab === 'difficulty' && (
        <div className="stack" style={{ '--gap': '14px' } as React.CSSProperties}>
          <div className="grid" style={{ '--min': '260px' } as React.CSSProperties}>
            {data.difficulty.map(d => (
              <div key={d.d} className="card pad stack" style={{ '--gap': '14px' } as React.CSSProperties}>
                <div className="row" style={{ justifyContent: 'space-between' }}><span className={'tag ' + DIFF[d.d]} style={{ fontSize: 12, padding: '5px 10px' }}>{cap(d.d)}</span><span className="muted" style={{ fontSize: 12, fontWeight: 700 }}>{d.n} Q · {d.c}✓ {d.w}✗ {d.skip} skip</span></div>
                <div className="row" style={{ gap: 22, alignItems: 'flex-end' }}>
                  <div className="stack" style={{ '--gap': '0' } as React.CSSProperties}><span className="muted" style={{ fontSize: 12, fontWeight: 700 }}>Your accuracy</span><span style={{ font: '800 40px/1 var(--sans)', letterSpacing: '-.04em' }}>{d.acc}%</span></div>
                  <div className="stack" style={{ '--gap': '0' } as React.CSSProperties}><span className="muted" style={{ fontSize: 12, fontWeight: 700 }}>Peers</span><span className="muted" style={{ font: '800 24px/1 var(--sans)' }}>{pct(d.peerAcc)}</span></div>
                </div>
                <div className="vs">
                  <div><span className="lbl">You</span><div className="bar"><i style={{ width: Math.max(2, d.acc) + '%' }} /></div></div>
                  <div><span className="lbl">Peers</span><div className="bar"><i style={{ width: (d.peerAcc ?? 0) + '%', background: 'var(--faint)' }} /></div></div>
                </div>
                <div className="row" style={{ justifyContent: 'space-between', fontSize: 13, fontWeight: 700, paddingTop: 10, borderTop: '1px solid var(--line2)' }}>
                  <span className="muted">Avg time</span><span className="mono nowrap"><span style={{ color: d.slow ? 'var(--bad)' : 'var(--ok)' }}>{fmt(d.avgYou)}</span> / {fmt(d.avgRef)}</span>
                </div>
                <span className="muted" style={{ fontSize: 13, lineHeight: 1.5 }}>{d.note}</span>
              </div>
            ))}
          </div>
          <div className="card pad stack">
            <b style={{ fontSize: 14 }}>Where your time went</b>
            <div className="row" style={{ height: 16, borderRadius: 8, overflow: 'hidden', gap: 0, flexWrap: 'nowrap' }}>
              {data.timeSplit.map(t => <div key={t.d} title={`${cap(t.d)} · ${fmt(t.t)}`} style={{ width: t.pct + '%', height: '100%', background: `var(--${DIFF[t.d] === 'mid' ? 'mid-ink' : DIFF[t.d] + '-ink'})` }} />)}
            </div>
            <div className="row" style={{ gap: 16 }}>
              {data.timeSplit.map(t => <span key={t.d} className="row" style={{ gap: 6, fontSize: 12, fontWeight: 700 }}><span style={{ width: 10, height: 10, borderRadius: 3, background: `var(--${DIFF[t.d] === 'mid' ? 'mid-ink' : DIFF[t.d] + '-ink'})` }} />{cap(t.d)} · {fmt(t.t)} ({t.pct}%)</span>)}
            </div>
          </div>
        </div>
      )}

      {tab === 'swot' && (
        <div className="grid" style={{ '--min': '300px' } as React.CSSProperties}>
          {([
            ['S', 'Strengths', 'Fast and accurate. Keep warm with one test a week.', 'ok', data.swot.strengths, 'Take a mixed sectional', '/tests'],
            ['W', 'Weaknesses', 'Concept gaps. Fix with topic tests.', 'bad', data.swot.weaknesses, 'Open weak topic tests', null],
            ['O', 'Opportunities', 'Marks within easy reach that slipped.', 'mid', data.swot.opportunities, 'Practise easy-mark drills', '/tests'],
            ['T', 'Threats', 'Time sinks and negative marks.', 'review', data.swot.threats, 'Ask Guru for a time strategy', 'guru'],
          ] as const).map(([m, h, sub, tone, items, cta, href]) => (
            <div key={m} className="card pad stack" style={{ '--gap': '12px' } as React.CSSProperties}>
              <div className="row" style={{ gap: 12, flexWrap: 'nowrap' }}>
                <span className="swot-mark" style={{ background: `var(--${tone}-bg)`, color: `var(--${tone === 'mid' ? 'mid' : tone}-ink)` }}>{m}</span>
                <div className="stack" style={{ '--gap': '0' } as React.CSSProperties}><span style={{ fontSize: 16, fontWeight: 800 }}>{h}</span><span className="muted" style={{ fontSize: 12, fontWeight: 700 }}>{sub}</span></div>
              </div>
              <div className="stack" style={{ '--gap': '6px' } as React.CSSProperties}>
                {items.length ? items.map(i => <div key={i.topic} className="swot-item"><span style={{ fontSize: 13, fontWeight: 800 }}>{i.topic}</span><span className="muted" style={{ fontSize: 12, fontWeight: 700, textAlign: 'right' }}>{i.detail}</span></div>)
                  : <div className="swot-item"><span style={{ fontSize: 13, fontWeight: 800 }}>Nothing flagged this time</span></div>}
              </div>
              {href === 'guru'
                ? <button type="button" className="link" style={{ marginTop: 'auto', alignSelf: 'flex-start' }} onClick={() => askGuru(`My time sinks in this test were ${data.swot.threats.map(t => t.topic).join(', ') || 'none'}. Give me a time strategy for my next mock.`)}>{cta} →</button>
                : <Link href={href ?? (items[0]?.node ? `/tests?node=${items[0].node}` : '/tests')} className="link" style={{ marginTop: 'auto' }}>{cta} →</Link>}
            </div>
          ))}
        </div>
      )}
    </>
  );
}
