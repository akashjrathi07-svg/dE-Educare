'use client';
import { useEffect, useRef, useState } from 'react';

/**
 * View-only PDF reader: downloads the file in parts, renders each page to a
 * canvas with pdf.js and overlays the student's DE ID. There is no download
 * or print button. (A determined user can still screenshot; the watermark is
 * the deterrent.)
 */
export function PdfReader({ id, parts, mark }: { id: string; parts: number; mark: string }) {
  const box = useRef<HTMLDivElement>(null);
  const [state, setState] = useState<{ status: 'loading' | 'ready' | 'error'; pages: number; progress: number }>({ status: 'loading', pages: 0, progress: 0 });
  const [zoom, setZoom] = useState(1);
  const cache = useRef<Uint8Array | null>(null);

  useEffect(() => {
    let cancelled = false;
    let doc: { cleanup?: () => unknown } | null = null;
    (async () => {
      try {
        const chunks: Uint8Array[] = [];
        for (let n = 0; n < parts && !cache.current; n++) {
          const r = await fetch(`/api/library/${id}/part/${n}`, { cache: 'no-store' });
          if (!r.ok) throw new Error('load');
          chunks.push(new Uint8Array(await r.arrayBuffer()));
          if (cancelled) return;
          setState(s => ({ ...s, progress: Math.round(((n + 1) / parts) * 100) }));
        }
        if (!cache.current) {
          const all = new Uint8Array(chunks.reduce((a, c) => a + c.length, 0));
          chunks.reduce((off, c) => { all.set(c, off); return off + c.length; }, 0);
          cache.current = all;
        }
        // pdf.js takes ownership of the buffer, so give it a copy and keep ours for zooming.
        const data = cache.current.slice();

        const pdfjs = await import('pdfjs-dist/legacy/build/pdf.mjs');
        pdfjs.GlobalWorkerOptions.workerSrc = new URL('pdfjs-dist/legacy/build/pdf.worker.min.mjs', import.meta.url).toString();
        const pdf = await pdfjs.getDocument({ data }).promise;
        doc = pdf;
        if (cancelled) return;
        const host = box.current!;
        host.innerHTML = '';
        const width = Math.min(host.clientWidth, 900) * zoom;
        const dpr = Math.min(window.devicePixelRatio || 1, 2);
        for (let i = 1; i <= pdf.numPages; i++) {
          const page = await pdf.getPage(i);
          if (cancelled) return;
          const base = page.getViewport({ scale: 1 });
          const vp = page.getViewport({ scale: (width / base.width) * dpr });
          const wrap = document.createElement('div');
          wrap.className = 'pdf-page';
          wrap.style.width = width + 'px';
          wrap.dataset.mark = mark;
          const c = document.createElement('canvas');
          c.width = vp.width;
          c.height = vp.height;
          c.style.width = width + 'px';
          c.style.height = vp.height / dpr + 'px';
          wrap.appendChild(c);
          host.appendChild(wrap);
          await page.render({ canvas: c, canvasContext: c.getContext('2d')!, viewport: vp }).promise;
          if (i === 1) setState({ status: 'ready', pages: pdf.numPages, progress: 100 });
        }
      } catch (e) {
        console.error('PDF reader:', e);
        if (!cancelled) setState(s => ({ ...s, status: 'error' }));
      }
    })();
    return () => { cancelled = true; doc?.cleanup?.(); };
  }, [id, parts, mark, zoom]);

  return (
    <div className="stack" style={{ '--gap': '12px' } as React.CSSProperties}>
      <div className="row" style={{ justifyContent: 'space-between' }}>
        <span className="note">{state.status === 'loading' ? `Opening… ${state.progress}%` : state.status === 'ready' ? `${state.pages} pages` : ''}</span>
        <div className="row" style={{ '--gap': '6px' } as React.CSSProperties}>
          <button type="button" className="btn ghost sm" onClick={() => setZoom(z => Math.max(0.6, +(z - 0.2).toFixed(1)))} aria-label="Zoom out">−</button>
          <span className="mono" style={{ fontSize: 12, minWidth: 40, textAlign: 'center' }}>{Math.round(zoom * 100)}%</span>
          <button type="button" className="btn ghost sm" onClick={() => setZoom(z => Math.min(2, +(z + 0.2).toFixed(1)))} aria-label="Zoom in">+</button>
        </div>
      </div>
      {state.status === 'error' && <div className="alert err">Couldn’t open this file. Check your connection and refresh.</div>}
      <div ref={box} className="pdf-box" onContextMenu={e => e.preventDefault()} />
    </div>
  );
}
