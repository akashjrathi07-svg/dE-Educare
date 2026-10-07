import postgres from 'postgres';

declare global {
  // eslint-disable-next-line no-var
  var __deSql: ReturnType<typeof postgres> | undefined;
}

function connect() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error('DATABASE_URL is not set. Copy .env.example to .env.local and fill it in.');
  return postgres(url, {
    max: Number(process.env.DATABASE_POOL_MAX || 10),
    idle_timeout: 20,
    // Supabase's transaction pooler does not support prepared statements.
    prepare: !/pooler\.supabase\.com:6543/.test(url),
    transform: { undefined: null },
  });
}

/** Shared connection pool (reused across hot reloads in development). */
export const sql = globalThis.__deSql ?? (globalThis.__deSql = connect());
