import { requireStaff, normalisePhone } from '@/lib/server/auth';
import { sql } from '@/lib/server/db';
import { getSettings, androidFingerprints } from '@/lib/server/settings';
import { Head } from '../ui';
import { AppSettings, Copy } from './app-client';

export const metadata = { title: 'Android app' };

const REPO = 'https://github.com/akashjrathi07-svg/dE-Educare';
const FULL = `Prepare for CAT, MAH MBA-CET and SNAP with DE Educare mock tests, in your pocket.

REAL EXAM-STYLE MOCKS
• Full mocks, sectionals and topic tests in each exam's real interface, pattern and timing
• CAT Test Series, 10 CAT Mocks, CET Test Series and SNAP 15 Mocks
• A free daily test every morning, no card needed

SOLUTIONS AND ANALYSIS AFTER EVERY TEST
• Go through every question with its solution, Previous / Next
• Score, accuracy, time per question and difficulty-wise charts
• Estimated percentile and All-India rank
• Weak topics and the next tests to take

GURU, YOUR AI MENTOR
• Ask any doubt by chat or voice, or snap a photo of a question
• Teach mode: learn any topic step by step with a worked example and a quick check
• Practice sets built from your weak topics

One login on the app and deeducare.com. Your tests, scores and Guru history stay in sync.`;

/** Everything needed to put the Android app on Google Play, in order, with what is done ticked. */
export default async function AndroidApp() {
  await requireStaff('app');
  const [s, prints] = await Promise.all([getSettings(['android_sha256', 'review_phone', 'review_otp']), androidFingerprints()]);
  const reviewPhone = process.env.REVIEW_PHONE ? normalisePhone(process.env.REVIEW_PHONE) : s.review_phone;
  const reviewOtp = process.env.REVIEW_OTP || s.review_otp;
  const [reviewer] = reviewPhone ? await sql`
    select (select count(*)::int from entitlements e where e.user_id = u.id and (e.ends_at is null or e.ends_at > now())) as plans
    from users u where u.phone = ${reviewPhone}` : [];
  const local = (reviewPhone ?? '').replace(/^\+91/, '');
  const steps: [boolean | null, string, React.ReactNode][] = [
    [null, 'Build the app on GitHub', <>Open <a className="link" href={`${REPO}/actions/workflows/android-app.yml`} target="_blank" rel="noopener">GitHub → Actions → Android app</a> → <b>Run workflow</b> → Run (about 5 minutes; a build also starts by itself when the app changes). Open the finished run and download <b>de-educare-android-…</b> (the <code>.aab</code> for Play Store and an <code>.apk</code> to try on your phone). On the first run also download <b>upload-key-KEEP-SAFE</b> and keep it safe (Google Drive): every update needs it.</>],
    [prints.length > 0, 'Paste the app fingerprint here', <>The run’s summary shows <b>Upload key SHA-256</b>. Paste it in the box below and Save. This removes the browser bar at the top of the app. After step 4 you add a second one.</>],
    [!!(reviewPhone && reviewOtp && reviewer?.plans), 'Set the review login here', <>Google’s reviewers can’t get an OTP. Enter a spare mobile number and Save: it gets a free account with the CAT Test Series and SNAP mocks, and signs in with the 6-digit code instead of an OTP.</>],
    [null, 'Create the app in Play Console', <>At <a className="link" href="https://play.google.com/console" target="_blank" rel="noopener">play.google.com/console</a> (one-time US$25, as an organisation: DE EDUCARE LLP, which needs a D-U-N-S number) → <b>Create app</b> → name <b>DE Educare</b>, App, Free. Fill the store listing and App content with the texts below. Then <b>Testing → Internal testing → Create release</b>, upload the <code>.aab</code>, add your team’s Gmail addresses as testers and roll out. Then <b>App integrity → App signing</b>: copy the <b>App signing key certificate SHA-256</b> into the box below (on a new line) and Save.</>],
    [null, 'Go live', <>Test the internal build on a phone (sign in, a test, a payment, Guru). Then <b>Production → Create release</b> with the same <code>.aab</code> and send for review (1–7 days). New personal accounts must first run a closed test with 12 testers for 14 days; organisation accounts don’t.</>],
  ];
  return (
    <>
      <Head title="Android app" sub="Put DE Educare on Google Play. The app opens this portal, so every portal change reaches the app at once." />
      <ol className="stack" style={{ '--gap': '10px', listStyle: 'none', padding: 0, margin: 0 } as React.CSSProperties}>
        {steps.map(([done, title, body], i) => (
          <li key={title} className="card pad row" style={{ gap: 14, alignItems: 'flex-start', flexWrap: 'nowrap' }}>
            <span className={'tag ' + (done ? 'ok' : '')} style={{ minWidth: 30, justifyContent: 'center' }}>{done ? '✓' : i + 1}</span>
            <div className="stack" style={{ '--gap': '4px', fontSize: 14, lineHeight: 1.55 } as React.CSSProperties}><b>{title}</b><span className="muted">{body}</span></div>
          </li>
        ))}
      </ol>

      <AppSettings initial={{ fingerprints: s.android_sha256.split(',').filter(Boolean).join('\n'), reviewPhone: local, reviewOtp }} />
      {prints.length > 0 && <p className="note">Live at <a className="link" href="/.well-known/assetlinks.json" target="_blank">/.well-known/assetlinks.json</a> · {prints.length} fingerprint{prints.length > 1 ? 's' : ''}.</p>}

      <div className="card pad stack" style={{ '--gap': '14px' } as React.CSSProperties}>
        <b style={{ fontSize: 16 }}>Texts for Play Console</b>
        <Copy label="App name" text="DE Educare: CAT, CET & SNAP Mocks" />
        <Copy label="Short description" text="CAT, MBA-CET & SNAP mock tests with solutions, analysis and an AI mentor." />
        <Copy label="Full description" text={FULL} />
        <Copy label="Privacy policy URL" text="https://portal.deeducare.com/privacy" />
        <Copy label="Account deletion URL" text="https://portal.deeducare.com/delete-account" />
        <Copy label="App access (instructions for reviewers)" text={reviewPhone && reviewOtp
          ? `Sign-in uses a one-time code. Use this review account:\n1. Enter mobile number ${local} and tap Send OTP.\n2. Enter code ${reviewOtp}.\nThe account has the CAT Test Series and SNAP 15 Mocks unlocked.`
          : 'Set the review login above first; the instructions appear here.'} />
        <p className="note" style={{ margin: 0 }}>
          Graphics: icon, feature graphic and screenshots are in the repository folder <a className="link" href={`${REPO}/tree/main/android-app/store`} target="_blank" rel="noopener">android-app/store</a>.
          Category Education · Ads: No · Target audience 18+ · Content rating: answer No to violence, gambling etc.; users interact (Guru chat): Yes.
          Data safety: phone, name, email (optional), app activity, photos (optional), messages (Guru), purchase history; shared with Anthropic (AI answers), Razorpay (payments) and Meta (ads measurement); encrypted in transit; users can request deletion.
        </p>
      </div>
    </>
  );
}
