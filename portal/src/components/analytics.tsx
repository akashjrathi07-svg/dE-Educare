'use client';
import { usePathname } from 'next/navigation';
import { useEffect } from 'react';
import { track, trackOnce } from '@/lib/analytics';

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

/** Google Tag Manager's standard loader. */
function loadGtm(id: string, userId: string) {
  const w = window as Window & { dataLayer?: Record<string, unknown>[] };
  if (document.getElementById('gtm-js')) return;
  w.dataLayer = w.dataLayer || [];
  if (userId) w.dataLayer.push({ user_id: userId });
  w.dataLayer.push({ 'gtm.start': Date.now(), event: 'gtm.js' });
  const s = document.createElement('script');
  s.id = 'gtm-js';
  s.async = true;
  s.src = `https://www.googletagmanager.com/gtm.js?id=${encodeURIComponent(id)}`;
  document.head.appendChild(s);
}

/** Google Analytics 4 (gtag.js). Shares the dataLayer with Tag Manager. */
function loadGa(id: string, userId: string) {
  const w = window as Window & { dataLayer?: unknown[]; gtag?: (...args: unknown[]) => void };
  if (w.gtag) return;
  w.dataLayer = w.dataLayer || [];
  // gtag must push the arguments object itself, not an array.
  w.gtag = function () { w.dataLayer!.push(arguments); };
  w.gtag('js', new Date());
  w.gtag('config', id, userId ? { user_id: userId } : {});
  const s = document.createElement('script');
  s.async = true;
  s.src = `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(id)}`;
  document.head.appendChild(s);
}

/**
 * Meta Pixel, Google Analytics and Google Tag Manager: a page view on every screen (including in-app navigation), and forms marked
 * data-pixel="EventName" send that event when submitted (used by server-rendered forms such as onboarding).
 */
export function Analytics({ pixelId, gaId, gtmId, userId }: { pixelId: string; gaId: string; gtmId: string; userId: string }) {
  const path = usePathname();
  useEffect(() => {
    if (pixelId) loadPixel(pixelId);
    if (gaId) loadGa(gaId, userId);
    if (gtmId) loadGtm(gtmId, userId);
    const onSubmit = (e: SubmitEvent) => {
      const name = (e.target as HTMLElement | null)?.getAttribute?.('data-pixel');
      if (name) track(name);
    };
    document.addEventListener('submit', onSubmit);
    return () => document.removeEventListener('submit', onSubmit);
  }, [pixelId, gaId, gtmId, userId]);
  useEffect(() => { track('PageView'); }, [path]);
  return null;
}

/** Sends one tracking event when a server-rendered page opens; with onceId, only once per browser for that id. */
export function PixelEvent({ name, params, onceId }: { name: string; params?: Record<string, unknown>; onceId?: string }) {
  const key = JSON.stringify(params ?? {});
  useEffect(() => {
    const p = JSON.parse(key) as Record<string, unknown>;
    if (onceId) trackOnce(name, onceId, p);
    else track(name, p);
  }, [name, key, onceId]);
  return null;
}
