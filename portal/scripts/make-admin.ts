// Gives a phone number a staff role. Creates the account if it doesn't exist yet.
// Usage: npm run make-admin -- 98765 43210            (admin)
//        npm run make-admin -- 98765 43210 faculty    (faculty | content | support | admin | student)
import crypto from 'node:crypto';
import postgres from 'postgres';
import { loadEnv } from './env';

loadEnv();
const args = process.argv.slice(2);
const ROLES = ['admin', 'faculty', 'content', 'support', 'student'];
const role = ROLES.includes(args.at(-1) ?? '') ? args.pop()! : 'admin';
const digits = args.join('').replace(/\D/g, '').replace(/^(91|0)(?=\d{10}$)/, '');
if (!/^[6-9]\d{9}$/.test(digits)) {
  console.error('Give a 10-digit Indian mobile number, e.g. npm run make-admin -- 9876543210');
  process.exit(1);
}
const phone = '+91' + digits;
const sql = postgres(process.env.DATABASE_URL!, { onnotice: () => {} });
const [u] = await sql`
  insert into users (phone, de_id, role, onboarded) values (${phone}, ${'DE-' + new Date().getFullYear() + '-' + crypto.randomInt(100000, 1000000)}, ${role}, false)
  on conflict (phone) do update set role = excluded.role returning name, de_id, role`;
console.log(`${phone} (${u.name ?? 'no name yet'}, ${u.de_id}) is now ${u.role}. Sign in at /login with this number, then open /admin.`);
await sql.end();
