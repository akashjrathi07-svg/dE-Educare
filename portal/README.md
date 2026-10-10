# DE Educare portal + admin

One Next.js app for students (`/`) and staff (`/admin`). It uses one database and one login (phone OTP). What a person sees depends on their role.

| Who | Where | Can use |
|---|---|---|
| Student | `/` | Tests, exam window, results and analysis, plans and checkout, Guru, live classes, planner, library, doubt solver, community, profile and rewards |
| Admin | `/admin` | Everything below |
| Content | `/admin` | Overview, question bank, tests, exam interfaces |
| Faculty | `/admin` | Overview, batches, students (batch moves only), live classes |
| Support | `/admin` | Overview, students (grant plans, Guru credits, export) |

## Run it locally

```bash
cd portal
cp .env.example .env.local        # fill DATABASE_URL at least
npm install
npm run db:migrate                # creates the tables
npm run db:seed                   # exams, sections, topics, courses, rewards
npm run db:seed -- --demo         # OPTIONAL: sample questions, 504 tests, demo users. Not for production.
npm run dev                       # http://localhost:3000
```

While `SMS_PROVIDER=console`, the OTP shows on the login screen and in the server log. The demo seed creates admin `99999 00000` and faculty `99999 00001`.

Checks: `npm run typecheck`, `npm test`, `npm run build`.

## Go live

1. **Database.** Create a Supabase project. Under Project Settings → Database → Connection string, copy the "Session pooler" URL into `DATABASE_URL`. Then run `npm run db:migrate && npm run db:seed` from your machine with that URL. Do not run the `--demo` seed.
2. **Hosting.** Import the repo in Vercel and set **Root Directory = `portal`**. Add every variable from `.env.example` under Environment Variables. Use the domain `portal.deeducare.com`, which is the one the website's buttons point to.
3. **Login across website and portal.** Set `COOKIE_DOMAIN=.deeducare.com` and `APP_URL=https://portal.deeducare.com`.
4. **SMS.** Set `SMS_PROVIDER=msg91` and fill in `MSG91_AUTH_KEY` and `MSG91_TEMPLATE_ID`. The template needs a DLT-approved OTP message with an `##OTP##` variable.
5. **Payments.** Add your Razorpay `RAZORPAY_KEY_ID` and `RAZORPAY_KEY_SECRET`. In the Razorpay Dashboard → Webhooks, add `https://portal.deeducare.com/api/webhooks/razorpay` with the `payment.captured` event and a secret, then put that secret in `RAZORPAY_WEBHOOK_SECRET`. A plan unlocks only after the server verifies the signature. Without keys in production, checkout refuses to take payments.
6. **Guru (AI).** Set `ANTHROPIC_API_KEY`. The key stays on the server. Without it, Guru answers with fixed study tips.
7. **First admin.** Run `npm run make-admin -- 98765 43210`, sign in with that number, then open `/admin`. To add staff, use Admin → Students → open a person → Role, or run `npm run make-admin -- <number> faculty|content|support`.

## Day-to-day in the admin

- **Questions:** Question bank → Bulk import takes `public/question-import-template.csv`. Every row is checked first and problems are listed with row numbers (for example, "Did you mean …?"). Then the valid rows are imported. Filling `question_id` updates an existing question.
- **Tests:** Tests → New test. Pick the type and exam. The auto blueprint draws questions by difficulty % from live questions, or you can list question IDs yourself. Choose who can take the test (Free and/or plans) and where it appears on the Tests screen. Then publish, schedule or save it as a draft.
- **Plans:** Courses & plans. The id in the table is what the website's checkout links use (`/checkout?plan=cat-ts`). The website reads live prices and MRPs from here every 10 minutes.
- **Free tests:** any live test marked **Free** (except daily tests) is listed on the website's Free resources page under its exam (CAT, MBA-CET, SNAP …).
- **Free resources:** upload PDFs (up to 30 MB). Students read them view-only in Library → Notes, with their DE ID watermarked on every page. Tick "List on deeducare.com" to show one on the website's Free resources page.
- **Reviews:** students write reviews at `/review` (linked from Profile and the website). Approve them in Reviews; approved ones appear on the home page within 10 minutes.
- **Classes:** schedule a class for a batch, or as an open class for an exam group. Add the recording link afterwards; it also appears in the Library.
- **Exam interfaces:** rules such as the calculator, palette and language apply to an exam's tests straight away. Section timers apply to tests built after the change.

## Guru coins and XP

All numbers live in `src/lib/economy.ts`.

- **Daily coins:** 10 on a free account, 50 on any mock or test series plan, unlimited on coaching (grant the coaching plan from Admin → Students after enrolment). They refill at midnight IST and do not carry forward.
- **Bonus coins** never expire and are used after the daily coins: from XP (100 XP = 1 coin), streaks (7, 30, 100 days), monthly prizes, the rewards store and staff grants (Admin → Students).
- **Costs:** chat 1 · voice tutor reply 3 · photo doubt 2 · test analysis 1 (topic/daily), 2 (sectional), 3 (mock) · practice set 1 per 10 questions · full progress report 5 (≤10 tests) or 10. Coins are refunded if the AI can't answer.
- **XP:** topic/daily/practice test 2 · sectional 20 · mock 100, ×3 at 95%+ accuracy, ×2 at 85%+, ×1.5 at 70%+, plus 100/200 for a 95/99+ percentile mock. Planner task 5, helpful community answer 20.
- **Rewards store (XP):** bonus coins, a free mock, and capped coupons (5%/10% off a test series, 5%/10% off coaching).
- **Monthly prizes:** paid on the 1st by the cron in `vercel.json`. Set `CRON_SECRET` in Vercel → Settings → Environment Variables for it to run.

## Notes

- Percentiles are estimated from a score curve until a test has 200 attempts. After that they come from real scores. Peer time and accuracy appear once a question has 50 attempts.
- Schema changes go in a new `db/00N_*.sql` file. `npm run db:migrate` applies each file once.
