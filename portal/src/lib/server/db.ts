import postgres from 'postgres';
import { poolerUrl } from '../db-url';

declare global {
  // eslint-disable-next-line no-var
  var __deSql: ReturnType<typeof postgres> | undefined;
}

function connect() {
  const raw = process.env.DATABASE_URL;
  if (!raw) throw new Error('DATABASE_URL is not set. Copy .env.example to .env.local and fill it in.');
  const url = poolerUrl(raw);
  const pooled = /pooler\.supabase\.com/.test(url);
  return postgres(url, {
    max: Number(process.env.DATABASE_POOL_MAX || (pooled ? 5 : 10)),
    idle_timeout: pooled ? 5 : 20,
    max_lifetime: pooled ? 60 * 5 : null,
    connect_timeout: 10,
    // The transaction pooler does not support prepared statements.
    prepare: !pooled,
    transform: { undefined: null },
  });
}

/** Shared connection pool (reused across hot reloads in development). */
export const sql = globalThis.__deSql ?? (globalThis.__deSql = connect());
