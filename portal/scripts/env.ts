import fs from 'node:fs';
import path from 'node:path';

/** Loads .env.local / .env for CLI scripts (Next.js does this itself for the app). */
export function loadEnv() {
  for (const name of ['.env.local', '.env']) {
    const file = path.resolve(import.meta.dirname, '..', name);
    if (!fs.existsSync(file)) continue;
    for (const line of fs.readFileSync(file, 'utf8').split('\n')) {
      const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
      if (m && process.env[m[1]] === undefined) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '');
    }
  }
  if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL is not set');
}
