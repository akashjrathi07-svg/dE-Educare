/**
 * On Vercel, use Supabase's transaction pooler (port 6543). Session mode (5432 on the
 * pooler host) ties a database connection to each serverless instance; when Vercel
 * pauses an instance mid-request the connection stays stuck, the pool fills up and
 * pages hang. Same host and credentials, so we switch the port here.
 */
export function poolerUrl(url: string) {
  return url.replace(/(@[^/:]*pooler\.supabase\.com):5432\b/, '$1:6543');
}
