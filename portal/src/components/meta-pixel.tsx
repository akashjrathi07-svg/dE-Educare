'use client';
import { usePathname } from 'next/navigation';
import { useEffect } from 'react';
import { track, trackOnce } from '@/lib/pixel';

type Fbq = ((...args: unknown[]) => void) & { callMethod?: (...a: unknown[]) => void; queue: unknown[]; push: unknown; loaded: boolean; version: string };

/** Meta's standard loader: queues calls until fbevents.js arrives. */
function loadPixel(id: string) {
  const w = window as Window & { fbq?: Fbq; _fbq?: Fbq };
  if (w.fbq) return;
  const n = function (...args: unknown[]) { if (n.callMethod) n.callMethod(...args); else n.queue.push(args); } as Fbq;
  n.push = n; n.loaded = true; n.version = '2.0'; n.queue = [];
  w.fbq = n;
  if (!w._fbq) w._fbq = n;
  const s = document.createElement('script');
  s.async = true;
  s.src = 'https://connect.facebook.net/en_US/fbevents.js';
  document.head.appendChild(s);
  n('init', id);
}

/**
 * Meta Pixel: PageView on every screen (including in-app navigation), and forms marked
 * data-pixel="EventName" send that event when submitted (used by server-rendered forms such as onboarding).
 */
export function MetaPixel({ id }: { id: string }) {
  const path = usePathname();
  useEffect(() => {
    loadPixel(id);
    const onSubmit = (e: SubmitEvent) => {
      const name = (e.target as HTMLElement | null)?.getAttribute?.('data-pixel');
      if (name) track(name);
    };
    document.addEventListener('submit', onSubmit);
    return () => document.removeEventListener('submit', onSubmit);
  }, [id]);
  useEffect(() => { track('PageView'); }, [path]);
  return null;
}

/** Sends one pixel event when a server-rendered page opens; with onceId, only once per browser for that id. */
export function PixelEvent({ name, params, onceId }: { name: string; params?: Record<string, unknown>; onceId?: string }) {
  const key = JSON.stringify(params ?? {});
  useEffect(() => {
    const p = JSON.parse(key) as Record<string, unknown>;
    if (onceId) trackOnce(name, onceId, p);
    else track(name, p);
  }, [name, key, onceId]);
  return null;
}
