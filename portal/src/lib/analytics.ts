/**
 * Tracking events from the browser, sent to the Meta Pixel and to Google Tag Manager's dataLayer
 * (GA4 event names). Does nothing for a tracker that is off (staff, or no ID set).
 */
type Fbq = (cmd: 'track' | 'trackCustom', name: string, params?: Record<string, unknown>, opts?: { eventID?: string }) => void;
type W = Window & { fbq?: Fbq; dataLayer?: Record<string, unknown>[] };

export const STANDARD_EVENTS = new Set(['PageView', 'ViewContent', 'Lead', 'CompleteRegistration', 'InitiateCheckout', 'AddPaymentInfo', 'Purchase', 'Contact', 'Search', 'Subscribe', 'StartTrial']);

/** Meta event name → GA4 event name. PageView is sent as virtual_page_view (see components/analytics.tsx). */
const GA4_NAMES: Record<string, string> = {
  PageView: 'virtual_page_view', CompleteRegistration: 'sign_up', InitiateCheckout: 'begin_checkout',
  AddPaymentInfo: 'add_payment_info', Purchase: 'purchase', ViewContent: 'view_item', Lead: 'generate_lead',
  StartTest: 'test_start', SubmitTest: 'test_submit',
};
const ECOMMERCE = new Set(['begin_checkout', 'add_payment_info', 'purchase', 'view_item']);

function toDataLayer(name: string, params: Record<string, unknown>, id?: string) {
  const dl = (window as W).dataLayer;
  if (!dl) return;
  const event = GA4_NAMES[name] ?? name.replace(/([a-z])([A-Z])/g, '$1_$2').toLowerCase();
  if (event === 'virtual_page_view') {
    dl.push({ event, page_location: location.href, page_path: location.pathname, page_title: document.title });
    return;
  }
  if (!ECOMMERCE.has(event)) {
    dl.push({ event, ...params });
    return;
  }
  // GA4 ecommerce shape; clear the previous ecommerce object first, as Google recommends.
  const ids = (params.content_ids as string[] | undefined) ?? [];
  dl.push({ ecommerce: null });
  dl.push({
    event,
    ...(params.payment_method ? { payment_type: params.payment_method } : {}),
    ecommerce: {
      currency: params.currency ?? 'INR',
      value: params.value,
      ...(event === 'purchase' && id ? { transaction_id: id } : {}),
      items: ids.map(item_id => ({ item_id, item_name: params.content_name, price: params.value, quantity: 1 })),
    },
  });
}

export function track(name: string, params: Record<string, unknown> = {}, once?: { name: string; id: string }) {
  if (typeof window === 'undefined') return;
  const fbq = (window as W).fbq;
  // eventID lets Meta drop a repeat of the same event (e.g. a refreshed success page).
  if (fbq) fbq(STANDARD_EVENTS.has(name) ? 'track' : 'trackCustom', name, params, once ? { eventID: `${once.name}-${once.id}` } : undefined);
  toDataLayer(name, params, once?.id);
}

/** Sends an event once per browser for a given id (a purchase, a submitted test), however often the page is opened. */
export function trackOnce(name: string, id: string, params: Record<string, unknown> = {}) {
  const key = `px:${name}:${id}`;
  try {
    if (localStorage.getItem(key)) return;
    localStorage.setItem(key, '1');
  } catch { /* private mode: send anyway, Meta drops repeats with the same eventID */ }
  track(name, params, { name, id });
}
