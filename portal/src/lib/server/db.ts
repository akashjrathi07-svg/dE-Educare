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
  // POOLER_MODE=1 applies the pooler settings to any database (to test them locally).
  const pooled = /pooler\.supabase\.com/.test(url) || process.env.POOLER_MODE === '1';
  // max_pipeline is a real postgres.js option that its type definitions leave out.
  const options: postgres.Options<Record<string, postgres.PostgresType>> & { max_pipeline: number } = {
    max: Number(process.env.DATABASE_POOL_MAX || 10),
    // Keep connections for a while between requests: opening one (TLS + pooler login) costs more than most queries.
    idle_timeout: pooled ? 30 : 60,
    max_lifetime: pooled ? 60 * 10 : null,
    connect_timeout: 10,
    // The transaction pooler does not support prepared statements.
    prepare: !pooled,
    // Never queue a second query on a busy connection: Supabase's pooler answers only the
    // first query of a pipelined batch, and the rest wait forever (porsager/postgres#970).
    max_pipeline: pooled ? 0 : 100,
    transform: { undefined: null },
  };
  const sql = postgres(url, options);
  if (pooled) sql.begin = reservedBegin(sql) as typeof sql.begin;
  return sql;
}

/**
 * sql.begin for the pooler settings. With max_pipeline 0, postgres.js never reserves the
 * connection for its own sql.begin and every transaction fails with UNSAFE_TRANSACTION.
 * This runs the transaction on a reserved connection instead: BEGIN, the callback, COMMIT
 * (ROLLBACK on error). The callback gets the same tagged-template API (tx`…`, tx(obj), tx.json).
 */
function reservedBegin(sql: ReturnType<typeof postgres>) {
  return async function begin(a: unknown, b?: unknown) {
    const fn = (typeof a === 'function' ? a : b) as (tx: postgres.ReservedSql) => unknown;
    const mode = typeof a === 'string' ? a.replace(/[^a-z ]/gi, '') : '';
    const tx = await sql.reserve();
    try {
      await tx.unsafe('begin ' + mode);
      const x = fn(tx);
      const result = await (Array.isArray(x) ? Promise.all(x) : x);
      await tx`commit`;
      return result;
    } catch (e) {
      await tx`rollback`.catch(() => {});
      throw e;
    } finally {
      tx.release();
    }
  };
}

/** Shared connection pool (reused across hot reloads in development). */
export const sql = globalThis.__deSql ?? (globalThis.__deSql = connect());
