import Link from 'next/link';
import { requireUser } from '@/lib/server/auth';
import { sql } from '@/lib/server/db';
import { xpTotals, streakOf, leaderboard, myRank, type Board } from '@/lib/server/xp';
import { availableCredits } from '@/lib/server/access';
import { levelOf, COIN_COST, XP_BASE, XP_PER_COIN, STREAK_COINS, DAILY_COINS, COIN_LABEL } from '@/lib/economy';
import { wallet, coinHistory } from '@/lib/server/coins';
import { initials, rupees } from '@/lib/server/shell';
import { logoutAction } from '@/app/login/actions';
import { updateProfile } from './actions';
import { ConvertXp, RedeemButton } from './redeem-button';

export const metadata = { title: 'Profile & rewards' };

export default async function Profile({ searchParams }: { searchParams: Promise<{ board?: string }> }) {
  const u = await requireUser('/profile');
  const sp = await searchParams;
  const board: Board = sp.board === 'month' || sp.board === 'all' ? sp.board : 'week';
  const [xp, streak, top, me, credits, store, exams, [stats], [{ helpful }], orders, coupons, coins, history] = await Promise.all([
    xpTotals(u.id), streakOf(u.id), leaderboard(board, u.exam_group, 5), myRank(u.id, board, u.exam_group), availableCredits(u.id),
    sql`select * from reward_items where active order by sort`, sql`select code, name from exams order by sort`,
    sql`
      select count(*) filter (where t.type in ('full_mock','pyq'))::int as mocks, coalesce(max(a.percentile) filter (where t.type in ('full_mock','pyq')), 0)::float as best
      from attempts a join tests t on t.id = a.test_id where a.user_id = ${u.id} and a.status = 'submitted'`,
    sql`select count(*)::int as helpful from community_answers where user_id = ${u.id} and helpful`,
    sql`select o.invoice_no, o.amount_paise, o.paid_at, c.name from orders o join courses c on c.id = o.course_id where o.user_id = ${u.id} and o.status = 'paid' order by o.paid_at desc`,
    sql`select code, kind, value, valid_till, max_discount_paise, category from coupons where user_id = ${u.id} and active and used < coalesce(max_uses, 1) and (valid_till is null or valid_till >= current_date)`,
    wallet(u.id), coinHistory(u.id, 8),
  ]);
  const lv = levelOf(xp.earned);
  const badges = [
    [String(streak.best), `${streak.best}-day streak`, `Current ${streak.current}`, 'oklch(0.65 0.19 45)', streak.best >= 7],
    ['90', '90+ percentile', stats.best >= 90 ? `Best ${stats.best.toFixed(1)}` : 'Not yet', 'var(--pri)', stats.best >= 90],
    ['HP', 'Helper', `${helpful} helpful answer${helpful === 1 ? '' : 's'}`, 'oklch(0.55 0.14 160)', helpful >= 5],
    ['10', '10 mocks done', `${Math.min(stats.mocks, 10)} of 10`, 'oklch(0.55 0.15 280)', stats.mocks >= 10],
    ['99', '99 percentile', stats.best >= 99 ? 'Unlocked' : 'Locked', 'oklch(0.6 0.15 70)', stats.best >= 99],
  ] as const;
  const joined = new Date(u.created_at).toLocaleDateString('en-IN', { month: 'short', year: 'numeric' });

  return (
    <>
      <div className="hero row" style={{ gap: 20 }}>
        <span className="avatar lg">{initials(u.name)}</span>
        <div className="stack" style={{ flex: 1, minWidth: 220, '--gap': '10px' } as React.CSSProperties}>
          <div className="row" style={{ justifyContent: 'space-between', alignItems: 'baseline' }}>
            <div className="stack" style={{ '--gap': '0' } as React.CSSProperties}>
              <div style={{ font: '800 26px var(--sans)', letterSpacing: '-.02em' }}>{u.name}</div>
              <div style={{ fontSize: 13, color: 'rgba(255,255,255,.7)', fontWeight: 600 }}>{u.target_exam ?? 'CAT'}{u.city ? ' · ' + u.city : ''} · joined {joined} · {u.de_id}</div>
            </div>
            <div className="mono" style={{ fontSize: 11, letterSpacing: '.08em', textTransform: 'uppercase', color: 'var(--amber)' }}>{lv.name} · {xp.earned.toLocaleString('en-IN')} XP earned</div>
          </div>
          <div className="bar" style={{ background: 'rgba(255,255,255,.18)' }}><i style={{ width: lv.progress + '%', background: 'var(--amber)' }} /></div>
          <div style={{ fontSize: 12, color: 'rgba(255,255,255,.7)', fontWeight: 700 }}>{lv.next ? `${(lv.next.at - xp.earned).toLocaleString('en-IN')} XP to ${lv.next.name}` : 'Top level reached'}</div>
        </div>
      </div>
      <Link href="/review" className="card pad row" style={{ justifyContent: 'space-between', color: 'var(--ink)', '--gap': '12px' } as React.CSSProperties}>
        <span className="stack" style={{ '--gap': '2px' } as React.CSSProperties}><b style={{ fontSize: 15 }}>Write a review</b><span className="muted" style={{ fontSize: 13 }}>Tell other students how DE Educare works for you. Approved reviews show on deeducare.com.</span></span>
        <span style={{ color: '#F2A900', fontSize: 20, letterSpacing: 1 }} aria-hidden="true">★★★★★</span>
      </Link>

      <div className="grid" style={{ '--min': '300px', '--gap': '16px', alignItems: 'start' } as React.CSSProperties}>
        <section className="card pad stack" id="coins" style={{ '--gap': '14px' } as React.CSSProperties}>
          <div className="row" style={{ justifyContent: 'space-between' }}>
            <h2 className="h2" style={{ fontSize: 16 }}>Guru coins</h2>
            <span className="note">Daily coins refill at midnight</span>
          </div>
          <div className="grid" style={{ '--min': '120px', '--gap': '10px' } as React.CSSProperties}>
            <div className="coin-box"><span className="coin-v">{coins.dailyLeft == null ? '∞' : coins.dailyLeft}</span><span className="coin-k">{coins.limit == null ? 'Unlimited today' : `of ${coins.limit} left today`}</span></div>
            <div className="coin-box bonus"><span className="coin-v">{coins.bonus.toLocaleString('en-IN')}</span><span className="coin-k">bonus coins · never expire</span></div>
          </div>
          <div className="stack" style={{ '--gap': '6px' } as React.CSSProperties}>
            <span className="label">Turn XP into bonus coins · {XP_PER_COIN} XP = 1 coin · you have {xp.balance.toLocaleString('en-IN')} XP</span>
            <ConvertXp balance={xp.balance} />
          </div>
          <details className="coin-rules">
            <summary>What things cost and how to earn</summary>
            <div className="grid" style={{ '--min': '200px', '--gap': '12px' } as React.CSSProperties}>
              <div className="stack" style={{ '--gap': '4px' } as React.CSSProperties}>
                <b style={{ fontSize: 13 }}>Spend coins</b>
                {[['Chat with Guru', COIN_COST.chat], ['Voice tutor reply', COIN_COST.voice], ['Doubt from a photo', COIN_COST.doubt], ['Topic or daily test analysis', COIN_COST.analysis.topic], ['Sectional analysis', COIN_COST.analysis.sectional], ['Full mock analysis + plan', COIN_COST.analysis.full_mock], ['Practice set (per 10 questions)', COIN_COST.practicePer10], ['Full progress report', `${COIN_COST.reportSmall}–${COIN_COST.reportLarge}`]].map(([k, v]) => (
                  <div key={k} className="row" style={{ justifyContent: 'space-between', fontSize: 13 }}><span>{k}</span><b>{v}</b></div>
                ))}
              </div>
              <div className="stack" style={{ '--gap': '4px' } as React.CSSProperties}>
                <b style={{ fontSize: 13 }}>Daily coins by plan</b>
                <div className="row" style={{ justifyContent: 'space-between', fontSize: 13 }}><span>Free account</span><b>{DAILY_COINS.free}</b></div>
                <div className="row" style={{ justifyContent: 'space-between', fontSize: 13 }}><span>Mock or test series plan</span><b>{DAILY_COINS.test_series}</b></div>
                <div className="row" style={{ justifyContent: 'space-between', fontSize: 13 }}><span>Coaching</span><b>Unlimited</b></div>
                <b style={{ fontSize: 13, marginTop: 8 }}>Earn XP</b>
                <div className="row" style={{ justifyContent: 'space-between', fontSize: 13 }}><span>Daily or topic test</span><b>{XP_BASE.topic}</b></div>
                <div className="row" style={{ justifyContent: 'space-between', fontSize: 13 }}><span>Sectional</span><b>{XP_BASE.sectional}</b></div>
                <div className="row" style={{ justifyContent: 'space-between', fontSize: 13 }}><span>Full mock</span><b>{XP_BASE.full_mock}</b></div>
                <span className="muted" style={{ fontSize: 12, lineHeight: 1.5 }}>Accuracy 95%+ triples it, 85%+ doubles it, 70%+ adds half. A 95+ percentile mock adds 100 XP, 99+ adds 200. Streaks of {STREAK_COINS.map(s => `${s[0]} days`).join(', ')} pay {STREAK_COINS.map(s => s[1]).join(', ')} bonus coins.</span>
              </div>
            </div>
          </details>
          {history.length > 0 && (
            <div className="stack" style={{ '--gap': '4px' } as React.CSSProperties}>
              <span className="label">Recent</span>
              {history.map((h, i) => (
                <div key={i} className="row" style={{ justifyContent: 'space-between', fontSize: 13 }}>
                  <span>{COIN_LABEL[h.kind] ?? h.kind}{h.pool === 'bonus' && h.coins < 0 ? ' · bonus' : ''}</span>
                  <span className="mono" style={{ color: h.coins > 0 ? 'var(--ok)' : 'var(--muted)' }}>{h.pool === 'unlimited' ? 'included' : (h.coins > 0 ? '+' : '') + h.coins}</span>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>

      <div className="grid" style={{ '--min': '130px', '--gap': '10px' } as React.CSSProperties}>
        {badges.map(([mark, name, sub, bg, on]) => (
          <div key={name} className="card stack" style={{ padding: 14, borderRadius: 16, '--gap': '8px', opacity: on ? 1 : 0.5 } as React.CSSProperties}>
            <span style={{ width: 34, height: 34, borderRadius: 10, background: on ? bg : 'var(--faint)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', font: '800 11px var(--sans)' }}>{mark}</span>
            <span style={{ fontSize: 13, fontWeight: 800 }}>{name}</span>
            <span className="muted" style={{ fontSize: 11, fontWeight: 600 }}>{sub}</span>
          </div>
        ))}
      </div>

      <div className="grid" style={{ '--min': '330px', '--gap': '16px', alignItems: 'start' } as React.CSSProperties}>
        <section className="list">
          <div className="row" style={{ justifyContent: 'space-between', padding: '14px 16px' }}>
            <h2 className="h2" style={{ fontSize: 16 }}>Leaderboard</h2>
            <nav className="seg sm">{(['week', 'month', 'all'] as const).map(b => <Link key={b} href={`/profile?board=${b}`} aria-current={board === b}>{b === 'all' ? 'All-time' : b[0].toUpperCase() + b.slice(1)}</Link>)}</nav>
          </div>
          {top.map(r => (
            <div key={r.id} className="row" style={{ padding: '11px 16px', gap: 12, flexWrap: 'nowrap', background: r.id === u.id ? 'var(--priSoft)' : undefined }}>
              <span className="mono" style={{ width: 38, fontSize: 13, color: r.rank <= 3 ? 'oklch(0.6 0.15 70)' : 'var(--muted)' }}>#{r.rank}</span>
              <span style={{ flex: 1, fontSize: 14, fontWeight: r.id === u.id ? 800 : 700 }}>{r.id === u.id ? `You (${r.name})` : r.name}</span>
              <span className="mono muted" style={{ fontSize: 13 }}>{r.xp.toLocaleString('en-IN')} XP</span>
            </div>
          ))}
          {!top.some(r => r.id === u.id) && (
            <div className="row" style={{ padding: '11px 16px', gap: 12, flexWrap: 'nowrap', background: 'var(--priSoft)' }}>
              <span className="mono" style={{ width: 38, fontSize: 13, color: 'var(--pri)' }}>#{me.rank}</span>
              <span style={{ flex: 1, fontSize: 14, fontWeight: 800 }}>You</span>
              <span className="mono muted" style={{ fontSize: 13 }}>{me.xp.toLocaleString('en-IN')} XP</span>
            </div>
          )}
          <div style={{ padding: '12px 16px', fontSize: 12, fontWeight: 700, color: 'var(--streak-ink)', background: 'var(--streak-bg)' }}>Climb the board with tests and good scores. Every 100 XP is worth 1 bonus Guru coin.</div>
        </section>

        <section className="list">
          <div className="row" style={{ justifyContent: 'space-between', alignItems: 'baseline', padding: '14px 16px' }}>
            <h2 className="h2" style={{ fontSize: 16 }}>Rewards store</h2>
            <span className="mono" style={{ fontSize: 12, color: 'var(--pri)' }}>{xp.balance.toLocaleString('en-IN')} XP to spend</span>
          </div>
          <div className="stack" style={{ padding: '0 16px 14px', '--gap': '6px', borderTop: 0 } as React.CSSProperties}>
            {(credits.mock > 0 || credits.sectional > 0) && <div className="alert ok" style={{ fontSize: 12 }}>You have {credits.mock ? `${credits.mock} free mock credit${credits.mock > 1 ? 's' : ''}` : ''}{credits.mock && credits.sectional ? ' and ' : ''}{credits.sectional ? `${credits.sectional} free sectional credit${credits.sectional > 1 ? 's' : ''}` : ''}. Open any locked test to use one.</div>}
          </div>
          {store.map(s => (
            <div key={s.id} className="row" style={{ padding: '12px 16px', gap: 12, flexWrap: 'nowrap' }}>
              <div className="stack" style={{ flex: 1, '--gap': '2px' } as React.CSSProperties}><span style={{ fontSize: 14, fontWeight: 800 }}>{s.name}</span><span className="mono" style={{ fontSize: 12, color: 'var(--pri)' }}>{s.cost_xp.toLocaleString('en-IN')} XP</span></div>
              <RedeemButton id={s.id} need={Math.max(0, s.cost_xp - xp.balance)} />
            </div>
          ))}
        </section>
      </div>

      {(coupons.length > 0 || orders.length > 0) && (
        <div className="grid" style={{ '--min': '330px', '--gap': '16px', alignItems: 'start' } as React.CSSProperties}>
          {coupons.length > 0 && (
            <section className="list">
              <div style={{ padding: '14px 16px', fontWeight: 800 }}>Your coupons</div>
              {coupons.map(c => <div key={c.code} className="row" style={{ padding: '11px 16px', justifyContent: 'space-between' }}><span className="mono" style={{ fontWeight: 700 }}>{c.code}</span><span className="muted" style={{ fontSize: 13 }}>{c.kind === 'flat' ? rupees(Number(c.value)) + ' off' : c.value + '% off'}{c.max_discount_paise ? ' (up to ' + rupees(c.max_discount_paise) + ')' : ''}{c.category ? ' · ' + (c.category === 'coaching' ? 'coaching' : 'test series') : ''} · till {new Date(c.valid_till).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}</span></div>)}
            </section>
          )}
          {orders.length > 0 && (
            <section className="list">
              <div style={{ padding: '14px 16px', fontWeight: 800 }}>Purchases</div>
              {orders.map(o => <div key={o.invoice_no} className="row" style={{ padding: '11px 16px', justifyContent: 'space-between' }}><span style={{ fontWeight: 700 }}>{o.name}</span><span className="mono muted" style={{ fontSize: 12 }}>{rupees(o.amount_paise)} · {o.invoice_no}</span></div>)}
            </section>
          )}
        </div>
      )}

      <form action={updateProfile} className="card pad stack" style={{ '--gap': '14px' } as React.CSSProperties}>
        <h2 className="h2" style={{ fontSize: 16 }}>Your details</h2>
        <div className="form-grid">
          <label className="field"><span>Name</span><input className="input" name="name" defaultValue={u.name ?? ''} maxLength={80} /></label>
          <label className="field"><span>Email (for receipts)</span><input className="input" name="email" type="email" defaultValue={u.email ?? ''} /></label>
          <label className="field"><span>City</span><input className="input" name="city" defaultValue={u.city ?? ''} /></label>
          <label className="field"><span>Preparing for</span><select className="input" name="exam" defaultValue={u.target_exam ?? 'CAT'}>{exams.map(e => <option key={e.code} value={e.code}>{e.name}</option>)}</select></label>
          <label className="field"><span>Target percentile</span><input className="input" name="target" type="number" min={50} max={100} step="0.1" defaultValue={u.target_percentile ?? 99} /></label>
          <label className="field"><span>Mobile (login)</span><input className="input" value={u.phone} disabled /></label>
        </div>
        <div className="row" style={{ justifyContent: 'space-between' }}>
          <button className="btn">Save details</button>
          <button className="btn ghost" formAction={logoutAction}>Sign out</button>
        </div>
      </form>
    </>
  );
}
