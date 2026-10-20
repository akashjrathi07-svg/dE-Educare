# DE Educare Android app: build and Play Store launch

The app is a Trusted Web Activity: it opens the student portal (https://portal.deeducare.com) full screen, with the
same login, tests, Guru, payments and results. Anything changed in the portal shows in the app at once, so app
updates are only needed for the icon, name or Android settings.

- Package name: `com.deeducare.app` (cannot change after the first upload)
- Android 6.0 and newer (minSdk 23), targets Android 16 (API 36)
- Store graphics: `store/` (icon, feature graphic, phone screenshots)

## 1. Build the app (GitHub, about 5 minutes)

1. GitHub → **Actions** → **Android app** → **Run workflow**.
2. When it finishes, open the run. Under **Artifacts** download:
   - `de-educare-android-<n>`: the `.aab` (upload to Play Store) and `.apk` (install on a phone to try it).
   - `upload-key-KEEP-SAFE` (first run only): the upload key and its passwords.
3. First run only: save the upload key somewhere safe (it is needed for every update), then add it to GitHub so
   later builds use the same key: **Settings → Secrets and variables → Actions → New repository secret**:
   - `ANDROID_KEYSTORE_BASE64`: contents of `ANDROID_KEYSTORE_BASE64.txt`
   - `ANDROID_KEYSTORE_PASSWORD`, `ANDROID_KEY_ALIAS`, `ANDROID_KEY_PASSWORD`: from `passwords.txt`

   Then delete the `upload-key-KEEP-SAFE` artifact from the run.
4. The run's summary shows the **upload key SHA-256**. In Vercel → the portal project → Settings → Environment
   Variables, add `ANDROID_CERT_SHA256` with that value, and redeploy. This lets the app open without a browser bar.

## 2. Create the Play Store listing

You need a Google Play developer account (play.google.com/console, one-time US$25, as an organisation:
DE EDUCARE LLP, which also needs a D-U-N-S number).

**Create app** → App name `DE Educare` · App · Free · accept the declarations.

### Store listing
- **App name:** DE Educare: CAT, CET & SNAP Mocks
- **Short description (80 chars):** CAT, MBA-CET & SNAP mock tests with AI analysis and Guru, your AI mentor.
- **Full description:**

```
Prepare for CAT, MAH MBA-CET and SNAP with DE Educare, Mumbai's test-prep team, in your pocket.

REAL EXAM-STYLE MOCKS
• Full mocks, sectionals and topic tests in the real exam interface and timing
• CAT Test Series, 10 CAT Mocks, CET Test Series and SNAP 15 Mocks
• A free daily test every morning, no card needed

AI ANALYSIS AFTER EVERY TEST
• Section scores, accuracy and time per question
• Estimated percentile and All-India rank
• Weak topics and the next tests to take

GURU, YOUR AI MENTOR
• Ask any doubt by chat or voice, or snap a photo of a question
• Teach mode: learn any topic step by step with a worked example and a quick check
• Practice sets built from your weak topics

COACHING AND LIVE CLASSES
• Live classes, recordings and mentors for CAT 2027 and MBA-CET
• Study planner, library and student community

One login on the app and deeducare.com. Your tests, scores and Guru history stay in sync.
```

- **App icon:** `store/play-icon-512.png`
- **Feature graphic:** `store/play-feature-1024x500.png`
- **Phone screenshots:** `store/1-login.png` … `store/5-guru-teach.png`. They were taken from the
  test copy; once real tests are live, retake the dashboard and tests screens from the app for a better listing.
- **Category:** Education · **Email:** deteam@gmail.com · **Phone:** +91 8830165057 · **Website:** https://deeducare.com

### App content (Policy → App content)
- **Privacy policy:** https://portal.deeducare.com/privacy
- **App access:** login with an OTP is required, and Google's reviewers can't receive SMS. Set up a review login:
  in Vercel add `REVIEW_PHONE` (a spare 10-digit number, e.g. one of your office numbers) and `REVIEW_OTP`
  (any 6 digits), redeploy, then in Admin → Students enrol that number in the CAT Test Series. In Play Console give:
  "Phone: <REVIEW_PHONE> · tap Send OTP · Code: <REVIEW_OTP>". That number never gets an SMS and only works with
  that code. Remove both variables after approval if you like.
- **Ads:** No ads.
- **Content rating:** Education reference; answer No to violence, sexual content, gambling and so on. Users can
  interact (community, Guru chat): Yes.
- **Target audience:** 18 and over (college students and graduates).
- **News app:** No. **Government app:** No. **Financial features:** None (payments go through Razorpay in the portal).
- **Data safety:**
  - Collected: Phone number, Name, Email (optional) — Personal info; App activity (test answers, scores);
    Photos (doubt photos, optional); Messages (Guru chats); Purchase history.
  - Shared: Guru messages, doubts and results are processed by Anthropic (AI) to answer; payments by Razorpay.
  - Encrypted in transit: Yes. Users can request deletion: Yes.
- **Account deletion URL:** https://portal.deeducare.com/delete-account

## 3. Release

1. **Testing → Internal testing → Create release**: upload the `.aab`, add your team's Gmail addresses as
   testers, and roll out. Install from the opt-in link and check sign-in, a test, payment and Guru.
2. **Play App Signing** (shown on first upload, keep it on). Then **Test and release → App integrity → App signing**:
   copy the **App signing key certificate SHA-256** and add it to `ANDROID_CERT_SHA256` in Vercel next to the
   upload key, comma separated. Redeploy the portal. Without this, the Play Store build shows a small browser bar.
3. New personal developer accounts must run a closed test with 12 testers for 14 days before production;
   organisation accounts can go straight to **Production → Create release** with the same `.aab`.
4. Review usually takes 1–7 days.

## Updates

Change the portal and the app updates itself. Only for an icon, name or Android setting change: edit `android-app/`,
run the workflow (the version number goes up automatically) and upload the new `.aab` as a new release.
