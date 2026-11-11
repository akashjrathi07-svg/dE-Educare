# DE Educare — notes for Claude

Read this file first and work from it. Do not re-explore the whole repo: open only the files the task needs.

## What this is

Online coaching for CAT, MBA-CET and OMETs (SNAP, NMAT, XAT, CMAT), owned by DE EDUCARE LLP and built by Digital Era.
Code and business details stay private to Digital Era. Never paste secrets, keys or student data into commits, issues or chat.

| Folder | What | Stack | Live at |
|---|---|---|---|
| `portal/` | Student portal (`/`) and staff admin (`/admin`) in one app, phone-OTP login, roles admin/content/faculty/support | Next.js 16 + React 19, `postgres` (Supabase, transaction pooler), Zod, Vitest | `portal.deeducare.com` (Vercel, root dir `portal`, region bom1) |
| `wordpress-theme/deeducare/` | Marketing website as a WordPress block theme (pages, enquiry forms, live blocks fed by the portal, Guru widget, page cache) | PHP, theme.json, plain JS/CSS | `deeducare.com` |
| `android-app/` | Trusted Web Activity wrapping the portal (`com.deeducare.app`) | Gradle, built by GitHub Actions | Play Store |
| `.github/workflows/` | `android-app.yml` (builds .aab/.apk), `keep-warm.yml` (pings portal and site every 5 min) | | |

Longer human docs: `portal/README.md` (run, go-live, SMS/DLT, WhatsApp OTP setup), `wordpress-theme/deeducare/README.md` (install, editing, Guru, links into the portal, speed), `android-app/PLAY-STORE.md`.

## Map of the portal (`portal/src`)

- `app/(student)/` student pages · `app/exam/[id]/exam-window.tsx` exam window · `app/admin/*` admin sections (bank, tests, courses, batches, students, classes, coupons, reviews, resources, interfaces)
- `app/api/*` routes: app, attempts, cron, guru, health, library, live, public (feeds the website), webhooks (Razorpay), whatsapp
- `lib/server/*` server-only logic: auth/OTP (`auth.ts`, `sms.ts`, `whatsapp.ts`), payments, enrol/access, Guru (`guru.ts`, Anthropic SDK), coins/XP, planner, live, questions, attempts, `db.ts`
- `lib/*.ts` pure logic with tests: `exam-logic`, `analysis`, `economy`, `question-import` (Word/Excel test upload), `db-url`
- `components/` guru, sidebar, planner-task, rich-text · `db/NNN_*.sql` migrations · `scripts/` migrate, seed, make-admin

## Map of the theme (`wordpress-theme/deeducare`)

`inc/content.php` default page content · `inc/page-builder*.php` page rebuild + section blocks · `inc/blocks.php` live blocks · `inc/lead.php`, `contact.php` forms · `inc/perf.php` page cache · `inc/seo.php` · `inc/exam-render.php`, `predict.php`, `reviews.php` · `assets/js/site.js`, `guru.js` · `assets/css/site.css`. Version lives in `style.css` (`Version:`).

## Commands

```bash
cd portal
npm install
npm run typecheck && npm test && npm run build   # run all three before every PR
npm run db:migrate                                # applies db/*.sql in order
npm run dev                                       # localhost:3000, OTP shown on screen while SMS_PROVIDER=console
cd ../wordpress-theme && zip -r deeducare.zip deeducare   # theme zip for upload
```

Env vars (names only, values live in Vercel): see `portal/.env.example` — DATABASE_URL, APP_URL, COOKIE_DOMAIN, WEBSITE_URL, SMS_PROVIDER, MSG91_*, WHATSAPP_*, ANTHROPIC_API_KEY, GURU_MODEL, RAZORPAY_*, CRON_SECRET, ANDROID_CERT_SHA256.

## Rules

- Next.js here is newer than your training data. Read `portal/AGENTS.md` and the docs in `portal/node_modules/next/dist/docs/` before using a Next API you are unsure of.
- Database: always the Supabase **transaction pooler**, no query pipelining (fixed in #6/#7/#9; don't reintroduce).
- Migrations are append-only: add `db/0NN_name.sql` with the next number, never edit an applied one.
- Never run `npm run db:seed -- --demo` against production.
- Payments unlock only after the Razorpay webhook signature is verified. Keep it that way.
- API keys stay server-side (`lib/server/*`, Vercel env). The website and app never hold keys.
- Website ↔ portal contract: the routes listed in the theme README ("Links into the portal") and `app/api/public/*` must keep working. Change both sides together.
- Theme changes: bump `Version:` in `style.css` and mention it in the PR title (e.g. "Website theme 2.2.2: …").
- Work on a branch and open a PR to `main`; Vercel builds the preview. Commit messages describe the user-visible change in plain English.
- Keep files small: if a file you touch grows past ~400 lines, split it by feature in the same PR.

## How sessions should run (saves tokens)

1. One feature or fix per chat. Read this file, then only the files that feature touches.
2. Before ending the chat, update **Current state** below (2–5 lines) in the same PR.
3. Start a fresh chat for the next feature.

## Current state (update at the end of every session)

- Last shipped: website theme 2.2.1 (instant page loads with background cache rebuild), WhatsApp login codes with SMS fallback and delivery reports (#17–#23, 26 Oct 2026).
- Android app built via Actions; Play Store listing in progress (see `android-app/PLAY-STORE.md`).
- Open: none recorded yet. Add open items here.
