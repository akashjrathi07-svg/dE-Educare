import 'server-only';

/** Origins of the marketing website allowed to call /api/public/* (WEBSITE_URL plus its www twin). */
function allowedOrigins() {
  const site = (process.env.WEBSITE_URL || 'https://deeducare.com').replace(/\/$/, '');
  const u = new URL(site);
  const bare = u.hostname.replace(/^www\./, '');
  return new Set([`${u.protocol}//${bare}`, `${u.protocol}//www.${bare}`]);
}

/** CORS headers for the website. Credentials are allowed so the shared login cookie is sent. */
export function corsHeaders(req: Request): Record<string, string> {
  const origin = req.headers.get('origin');
  const h: Record<string, string> = { Vary: 'Origin' };
  if (origin && allowedOrigins().has(origin)) {
    h['Access-Control-Allow-Origin'] = origin;
    h['Access-Control-Allow-Credentials'] = 'true';
    h['Access-Control-Allow-Methods'] = 'GET, OPTIONS';
  }
  return h;
}
