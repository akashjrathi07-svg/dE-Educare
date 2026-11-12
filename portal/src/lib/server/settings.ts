import 'server-only';
import { sql } from './db';

/** Settings staff change in Admin (no redeploy). An environment variable of the same purpose still wins if set. */
export async function getSettings(keys: string[]): Promise<Record<string, string>> {
  const rows = await sql`select key, value from app_settings where key = any(${keys})`;
  return Object.fromEntries(keys.map(k => [k, rows.find(r => r.key === k)?.value ?? '']));
}

export async function setSettings(values: Record<string, string>, userId: string) {
  for (const [key, value] of Object.entries(values)) {
    await sql`insert into app_settings (key, value, updated_by) values (${key}, ${value}, ${userId})
      on conflict (key) do update set value = excluded.value, updated_at = now(), updated_by = excluded.updated_by`;
  }
}

/** SHA-256 fingerprints in AA:BB:… form, from any mix of commas, spaces and new lines. */
export function parseFingerprints(text: string) {
  return [...new Set(text.toUpperCase().split(/[\s,;]+/).map(s => s.trim()).filter(s => /^([0-9A-F]{2}:){31}[0-9A-F]{2}$/.test(s)))];
}

export async function androidFingerprints() {
  const env = parseFingerprints(process.env.ANDROID_CERT_SHA256 ?? '');
  const { android_sha256 } = await getSettings(['android_sha256']);
  return [...new Set([...env, ...parseFingerprints(android_sha256)])];
}
