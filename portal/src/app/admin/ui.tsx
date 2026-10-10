'use client';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { cloneElement, createContext, useCallback, useContext, useEffect, useId, useRef, useState } from 'react';

export type Result = { ok: boolean; message: string };

const ToastCtx = createContext<(m: string) => void>(() => {});
export const useToast = () => useContext(ToastCtx);

export function ToastHost({ children }: { children: React.ReactNode }) {
  const [msg, setMsg] = useState('');
  const t = useRef<ReturnType<typeof setTimeout>>(undefined);
  const show = useCallback((m: string) => { clearTimeout(t.current); setMsg(m); t.current = setTimeout(() => setMsg(''), 3200); }, []);
  return <ToastCtx.Provider value={show}>{children}{msg && <div className="toast" role="status">{msg}</div>}</ToastCtx.Provider>;
}

const NAV: [area: string, href: string, mark: string, label: string][] = [
  ['overview', '/admin', 'OV', 'Overview'], ['courses', '/admin/courses', 'CP', 'Courses & plans'], ['batches', '/admin/batches', 'BT', 'Batches'],
  ['students', '/admin/students', 'ST', 'Students'], ['classes', '/admin/classes', 'LC', 'Live classes'], ['bank', '/admin/bank', 'QB', 'Question bank'],
  ['tests', '/admin/tests', 'TS', 'Tests'], ['iface', '/admin/interfaces', 'EI', 'Exam interfaces'],
  ['resources', '/admin/resources', 'FR', 'Free resources'], ['reviews', '/admin/reviews', 'RV', 'Reviews'],
];

export function AdminNav({ areas, badges }: { areas: string[]; badges: Record<string, string> }) {
  const path = usePathname();
  return (
    <nav className="admin-nav" aria-label="Admin">
      {NAV.filter(n => areas.includes(n[0])).map(([area, href, mark, label]) => {
        const on = href === '/admin' ? path === href : path.startsWith(href);
        return (
          <Link key={area} href={href} aria-current={on ? 'page' : undefined} title={label}>
            <span className="m">{mark}</span><span className="l">{label}</span>
            {badges[area] && <span className="b">{badges[area]}</span>}
          </Link>
        );
      })}
    </nav>
  );
}

export function Head({ title, sub, children }: { title: string; sub: string; children?: React.ReactNode }) {
  return (
    <header className="row" style={{ justifyContent: 'space-between', alignItems: 'flex-end', '--gap': '16px' } as React.CSSProperties}>
      <div className="stack" style={{ '--gap': '4px' } as React.CSSProperties}>
        <h1 style={{ margin: 0, font: '800 30px/1.1 var(--sans)', letterSpacing: '-.03em' }}>{title}</h1>
        <span style={{ fontSize: 14, color: 'var(--muted)', fontWeight: 600 }}>{sub}</span>
      </div>
      {children && <div className="row">{children}</div>}
    </header>
  );
}

const STATUS_TAG: Record<string, string> = { Live: 'ok', 'Live now': 'live', Scheduled: 'pri', Draft: '', Recorded: '', Ended: '', Archived: '', Cancelled: 'bad' };
export const Status = ({ s }: { s: string }) => <span className={'tag ' + (STATUS_TAG[s] ?? '')}>{s}</span>;

export function Drawer({ title, onClose, children, foot }: { title: string; onClose: () => void; children: React.ReactNode; foot: React.ReactNode }) {
  useEffect(() => {
    const k = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', k);
    return () => window.removeEventListener('keydown', k);
  }, [onClose]);
  return (
    <>
      <div className="drawer-back" onClick={onClose} />
      <aside className="drawer" role="dialog" aria-modal="true" aria-label={title}>
        <div className="row" style={{ justifyContent: 'space-between', padding: '18px 22px', borderBottom: '1px solid var(--line)' }}>
          <h2 style={{ margin: 0, fontSize: 20, fontWeight: 800 }}>{title}</h2>
          <button type="button" className="btn ghost sm" onClick={onClose}>Close</button>
        </div>
        <div className="stack" style={{ flex: 1, overflowY: 'auto', padding: 22, '--gap': '16px' } as React.CSSProperties}>{children}</div>
        <div className="row" style={{ padding: '14px 22px', borderTop: '1px solid var(--line)', justifyContent: 'flex-end' }}>{foot}</div>
      </aside>
    </>
  );
}

/** Single or multi choice chips bound to a value. */
export function Chips<T extends string>({ options, value, onChange, labels }: { options: readonly T[]; value: T | T[]; onChange: (v: T | T[]) => void; labels?: Record<string, string> }) {
  const multi = Array.isArray(value);
  return (
    <div className="chips">
      {options.map(o => {
        const on = multi ? value.includes(o) : value === o;
        return (
          <button key={o} type="button" className="chip" aria-pressed={on}
            onClick={() => onChange(multi ? (on ? value.filter(x => x !== o) : [...value, o]) : o)}>{labels?.[o] ?? o}</button>
        );
      })}
    </div>
  );
}

/** A labelled form field. Use `group` for chips (a label would forward clicks to the first chip). */
export function Field({ label, req, hint, span, group, children }: { label: string; req?: boolean; hint?: string; span?: boolean; group?: boolean; children: React.ReactElement<{ id?: string }> }) {
  const id = useId();
  if (group) {
    return (
      <div className={'field' + (span ? ' span' : '')} role="group" aria-label={label}>
        <span>{label}{req && <b className="req"> *</b>}</span>{children}{hint && <span className="hint">{hint}</span>}
      </div>
    );
  }
  return (
    <div className={'field' + (span ? ' span' : '')}>
      <label htmlFor={id} style={{ fontSize: 12, fontWeight: 800, color: 'var(--muted)' }}>{label}{req && <b className="req"> *</b>}</label>
      {cloneElement(children, { id })}
      {hint && <span className="hint">{hint}</span>}
    </div>
  );
}

/** Runs a server action, shows its message and refreshes the page data. */
export function useAction() {
  const toast = useToast();
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const run = useCallback(async (fn: () => Promise<Result>, after?: (r: Result) => void) => {
    setBusy(true);
    try {
      const r = await fn();
      toast(r.message);
      if (r.ok) router.refresh();
      after?.(r);
      return r;
    } catch {
      toast('Something went wrong. Please try again.');
      return { ok: false, message: '' };
    } finally { setBusy(false); }
  }, [toast, router]);
  return { busy, run };
}
