// Applies db/*.sql files in name order, once each. Usage: npm run db:migrate
import fs from 'node:fs';
import path from 'node:path';
import postgres from 'postgres';
import { loadEnv } from './env';

loadEnv();
const sql = postgres(process.env.DATABASE_URL!, { onnotice: () => {} });
const dir = path.resolve(import.meta.dirname, '../db');

await sql`create table if not exists schema_migrations (name text primary key, applied_at timestamptz not null default now())`;
const done = new Set((await sql`select name from schema_migrations`).map(r => r.name as string));
for (const file of fs.readdirSync(dir).filter(f => f.endsWith('.sql')).sort()) {
  if (done.has(file)) continue;
  const body = fs.readFileSync(path.join(dir, file), 'utf8').replace(/create table schema_migrations[^;]+;/, '');
  await sql.begin(async tx => {
    await tx.unsafe(body);
    await tx`insert into schema_migrations (name) values (${file})`;
  });
  console.log('applied', file);
}
await sql.end();
