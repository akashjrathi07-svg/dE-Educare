/** Meta Pixel events from the browser. Does nothing when the pixel is off (staff, or no pixel ID). */
type Fbq = (cmd: 'track' | 'trackCustom', name: string, params?: Record<string, unknown>, opts?: { eventID?: string }) => void;

export const STANDARD_EVENTS = new Set(['PageView', 'ViewContent', 'Lead', 'CompleteRegistration', 'InitiateCheckout', 'AddPaymentInfo', 'Purchase', 'Contact', 'Search', 'Subscribe', 'StartTrial']);

export function track(name: string, params: Record<string, unknown> = {}, eventID?: string) {
  if (typeof window === 'undefined') return;
  const fbq = (window as Window & { fbq?: Fbq }).fbq;
  if (!fbq) return;
  // eventID lets Meta drop a repeat of the same event (e.g. a refreshed success page).
  fbq(STANDARD_EVENTS.has(name) ? 'track' : 'trackCustom', name, params, eventID ? { eventID } : undefined);
}

/** Sends an event once per browser for a given id (a purchase, a submitted test), however often the page is opened. */
export function trackOnce(name: string, id: string, params: Record<string, unknown> = {}) {
  const key = `px:${name}:${id}`;
  try {
    if (localStorage.getItem(key)) return;
    localStorage.setItem(key, '1');
  } catch { /* private mode: send anyway, Meta drops repeats with the same eventID */ }
  track(name, params, `${name}-${id}`);
}
