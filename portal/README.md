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
4. **SMS.** Set `SMS_PROVIDER=msg91` and fill in `MSG91_AUTH_KEY` and `MSG91_TEMPLATE_ID`. See **Login codes by SMS** below for the message text.
5. **Payments.** Add your Razorpay `RAZORPAY_KEY_ID` and `RAZORPAY_KEY_SECRET`. In the Razorpay Dashboard → Webhooks, add `https://portal.deeducare.com/api/webhooks/razorpay` with the `payment.captured` event and a secret, then put that secret in `RAZORPAY_WEBHOOK_SECRET`. A plan unlocks only after the server verifies the signature. Without keys in production, checkout refuses to take payments.
6. **Guru (AI).** Set `ANTHROPIC_API_KEY`. The key stays on the server. Without it, Guru answers with fixed study tips.
7. **First admin.** Run `npm run make-admin -- 98765 43210`, sign in with that number, then open `/admin`. To add staff, use Admin → Students → open a person → Role, or run `npm run make-admin -- <number> faculty|content|support`.

## Login codes by SMS

In India every OTP SMS must use a template registered on the DLT portal (Jio, Airtel, Vodafone Idea or BSNL) under your company's entity ID and sender ID (header), for example `DEEDUC`.

1. **DLT portal:** register a *Service Implicit* template of type OTP with this text. `{#var#}` is DLT's placeholder for the code:
   > `{#var#} is your DE Educare login code. It is valid for 10 minutes. Do not share it with anyone. - DE EDUCARE`
2. **MSG91 → OTP → Create template:** paste the same text with MSG91's placeholder, and add the DLT template ID it was approved under:
   > `##OTP## is your DE Educare login code. It is valid for 10 minutes. Do not share it with anyone. - DE EDUCARE`
3. **Vercel:** set `SMS_PROVIDER=msg91`, `MSG91_AUTH_KEY` and `MSG91_TEMPLATE_ID` (the MSG91 template ID), then redeploy.

If a code doesn't arrive, the Vercel log shows `MSG91 did not send the OTP:` with MSG91's reason (wrong template, sender ID not approved, no balance…), and the login screen asks the student to try again.

## Day-to-day in the admin

- **Questions:** Question bank → **Add many (Excel or Word)**.
  - **Excel or CSV:** upload your own sheet with headings like Question, Option A–D, Answer, Solution, Topic, Difficulty, or use the full template `public/question-import-template.csv`.
  - **Paste from Word or PDF:** number the questions, write options as (A) (B) (C) (D), and add `Answer:` and `Solution:` lines. A `Directions:` or `Passage:` line keeps a group of questions together as a set. Questions with no options and a number as the answer become TITA.
  - Pick the exam, section, topic, difficulty and marks once for the whole upload. Tick "Add new topics" to create topics that aren't in the list yet.
  - Everything is checked first, with a preview and the problems listed. Filling `question_id` updates an existing question.
- **Tests:** Tests → New test. Pick the type and exam.
  - The auto blueprint draws questions by difficulty % from live questions, unused questions first; or you can list question IDs yourself.
  - **How many tests** makes a whole numbered series at once: "CAT Mock" × 10 gives CAT Mock 1 … 10 with IDs `cat-m-1` … `cat-m-10`, and no question repeats inside the series.
  - Choose who can take the test (Free and/or plans) and where it appears on the Tests screen. Then publish, schedule or save it as a draft.
- **Enrolling students:** Students → **Enrol students** (admin and support).
  - Enter the mobile number (a new number gets a DE Educare ID), the course and the batch, and how they paid: UPI, cash, bank, cheque, card, EMI or free. Paste a list to enrol a whole batch.
  - Paid enrolments get an invoice number like online orders.
  - Online buyers unlock their plan automatically, and coaching buyers join the course's newest batch with free seats. **Needs a batch** lists anyone with a coaching plan but no batch.
- **Uploading whole tests:** Tests → Upload tests.
  - The **Word test template** (`public/test-upload-template.docx`) holds the test itself:
    - `Test:` and `Section:` lines, then for each question `Topic:` (it carries on until the next one), the question (`Q.1)`), options `a)`–`d)`, `Answer:` and `Explanation:`.
    - Add `e)` only for questions that have five options. Each question keeps exactly the options written.
    - `D.51-55)` with a passage, directions, table or picture before question 51 makes questions 51–55 one RC/DILR set: they share the passage and are always picked together.
    - Pictures in the Word file are uploaded and shown in the exam and the solutions.
  - The **Excel details template** (`public/question-details-template.xlsx`) has one row per question number with:
    - Subtopic, Type (Single / Multiple / Numeric), Difficulty Level (Very Easy … Very Hard), ideal time, marks and negative marks.
    - Concepts, Source (e.g. `CAT 2023 Slot 2`), and optionally Correct Answer(s).
  - A `Subject` path like `Quant (QA) > Percentages > Successive change` also fills section, topic and subtopic.
  - Very Easy and Very Hard are saved as Easy and Hard with a `very easy` / `very hard` tag.
  - These details feed the analysis, practice sets, the auto test builder and Guru: Guru sees each student's weakest topics and how many unseen bank questions each one has.
  - Upload the Word file and the Excel sheet together. One all-in-one Excel sheet (`public/test-upload-template.xlsx`) also works.
- **Coupons:** Coupons → New coupon. Set % or ₹ off (with an optional cap), how many times it can be used, an end date, and whether it applies to every plan, test series, coaching or chosen plans. Students type the code at checkout, or a link can carry it: `/checkout?plan=cat-ts&coupon=CAT500`. "Reward coupons" lists the personal coupons students got from the rewards store.
- **Plans:** Courses & plans. The id in the table is what the website's checkout links use (`/checkout?plan=cat-ts`). The website reads live prices and MRPs from here every 10 minutes.
- **Free tests:** any live test marked **Free** (except daily tests) is listed on the website's Free resources page under its exam (CAT, MBA-CET, SNAP …).
- **Free resources:** upload PDFs (up to 30 MB). Students read them view-only in Library → Notes, with their DE ID watermarked on every page. Tick "List on deeducare.com" to show one on the website's Free resources page.
- **Reviews:** students write reviews at `/review` (linked from Profile and the website). Approve them in Reviews; approved ones appear on the home page within 10 minutes.
- **Classes:** schedule a class for a batch, or as an open class for an exam group. Add the recording link afterwards; it also appears in the Library.
- **Exam interfaces:** rules such as the calculator, palette and language apply to an exam's tests straight away. Section timers apply to tests built after the change.

## Guru coins and XP

All numbers live in `src/lib/economy.ts`.

- **Daily coins:** 10 on a free account, 50 on any mock or test series plan, unlimited on coaching (grant the coaching plan from Admin → Students after enrolment). They refill at midnight IST and do not carry forward.
- **Bonus coins** never expire and are used after the daily coins: from XP (10 XP = 1 coin), streaks (7, 30, 100 days), monthly prizes, the rewards store and staff grants (Admin → Students).
- **Costs:** chat 1 · voice tutor reply 3 · photo doubt 2 · test analysis 1 (topic/daily), 2 (sectional), 3 (mock) · practice set 1 per 10 questions · full progress report 5 (≤10 tests) or 10. Coins are refunded if the AI can't answer.
- **XP:** topic/daily/practice test 2 · sectional 20 · mock 100, ×3 at 95%+ accuracy, ×2 at 85%+, ×1.5 at 70%+, plus 100/200 for a 95/99+ percentile mock. Planner task 5, helpful community answer 20.
- **Rewards store (XP):** bonus coins, a free mock, and capped coupons (5%/10% off a test series, 5%/10% off coaching).
- **Monthly prizes:** paused. The prize table is in `economy.ts` and the payout route is `/api/cron/monthly-prizes`; to switch it on, add `"crons": [{ "path": "/api/cron/monthly-prizes", "schedule": "30 1 1 * *" }]` to `vercel.json` and set `CRON_SECRET` in Vercel.

## API for the website, the app and the AI mentor

Every API below accepts either the `de_session` cookie (portal and website) or an `Authorization: Bearer <token>` header (the app). One DE Educare ID, one history, one coin balance everywhere.

| Endpoint | What it does |
|---|---|
| `POST /api/app/auth/otp` `{phone}` | Sends the sign-in code by SMS |
| `POST /api/app/auth/verify` `{phone, code}` | Returns `{token, user, isNew}`. Store the token securely in the app. Valid for 60 days |
| `POST /api/app/auth/logout` | Ends that session |
| `GET /api/guru` | Recent Guru messages, first name and today's coins |
| `POST /api/guru` `{text, page, mode}` | Streams Guru's reply as plain text. `mode` is `chat` (1 coin) or `voice` (3 coins, teacher style). Headers `X-Guru-Left` and `X-Guru-Bonus` give the new balance |
| `POST /api/guru/teach` `{topic, level, style, page}` | A lesson as JSON for Guru's Teach mode (idea, steps, worked example, traps, check question, what to learn next). `level` is `basic`, `standard` or `advanced`; `style` is `new`, `simpler`, `another` or `deeper`. 3 coins, refunded if no lesson comes back |
| `POST /api/public/guru-preview` `{q}` | For visitors who are not signed in: 3 questions a day, then `{done: true}` |

`page` names where the student is (for example `Website · CAT`, `App · Mock result`, `Live class · Quant`), and Guru uses it as context. The AI mentor for live lectures should use the same `/api/guru` messages and coins, with its own `page` value, so a student's lecture questions show up in the same history on web and app.

The website is allowed by CORS through `WEBSITE_URL`. Signed-in students on the website use the shared cookie, which needs `COOKIE_DOMAIN=.deeducare.com`.

## Notes

- Percentiles are estimated from a score curve until a test has 200 attempts. After that they come from real scores. Peer time and accuracy appear once a question has 50 attempts.
- Schema changes go in a new `db/00N_*.sql` file. `npm run db:migrate` applies each file once.
