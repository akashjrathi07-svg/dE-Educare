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
  // max_pipeline is a real postgres.js option that its type definitions leave out.
  const options: postgres.Options<Record<string, postgres.PostgresType>> & { max_pipeline: number } = {
    max: Number(process.env.DATABASE_POOL_MAX || 10),
    idle_timeout: pooled ? 5 : 20,
    max_lifetime: pooled ? 60 * 5 : null,
    connect_timeout: 10,
    // The transaction pooler does not support prepared statements.
    prepare: !pooled,
    // Never queue a second query on a busy connection: Supabase's pooler answers only the
    // first query of a pipelined batch, and the rest wait forever (porsager/postgres#970).
    max_pipeline: pooled ? 0 : 100,
    transform: { undefined: null },
  };
  return postgres(url, options);
}

/** Shared connection pool (reused across hot reloads in development). */
export const sql = globalThis.__deSql ?? (globalThis.__deSql = connect());
