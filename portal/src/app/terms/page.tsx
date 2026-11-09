import Link from 'next/link';
import { H, LegalPage } from '@/components/legal';

export const metadata = { title: 'Terms and conditions', robots: { index: true } };

/** Terms of use and sale for the website, portal and app. */
export default function Terms() {
  return (
    <LegalPage title="Terms and conditions">
      <p>These terms apply to deeducare.com, the student portal (portal.deeducare.com) and the DE Educare app, run by DE EDUCARE LLP, Mumbai. By creating an account or buying a plan you agree to them.</p>

      <H>What we sell</H>
      <p>We sell online exam preparation: mock tests, test series, practice sets, AI analysis and online coaching access. We do not sell physical products; everything is delivered to your account online, as described in our <Link href="/shipping">shipping and delivery policy</Link>.</p>

      <H>Your account</H>
      <ul>
        <li>You sign in with your mobile number and a one-time code. Keep your phone and codes to yourself.</li>
        <li>One account is for one student. Sharing your account, or letting others take tests on it, is not allowed and may lead to the account being suspended.</li>
        <li>Give correct details. You can update them in Profile, or <Link href="/delete-account">delete your account</Link> at any time.</li>
      </ul>

      <H>Buying a plan</H>
      <ul>
        <li>Prices are shown in Indian rupees on the plans page, including applicable taxes, before you pay. Coupons apply only as described with them.</li>
        <li>Payments are processed securely by Razorpay. We do not see or store your card, UPI or bank details.</li>
        <li>After a successful payment, access to what you bought is added to your account, usually within seconds, for the validity shown with the plan.</li>
        <li>Plans are one-time payments and do not renew automatically.</li>
        <li>If you cannot get access after paying, or face a problem using what you bought, we will grant access from our end or refund you, as set out in our <Link href="/refunds">cancellation and refund policy</Link>.</li>
      </ul>

      <H>Using the content</H>
      <ul>
        <li>All questions, solutions, videos, notes and analysis belong to DE EDUCARE LLP and are for your personal study only.</li>
        <li>Do not copy, record, screenshot for sharing, resell or publish them, or try to download them in bulk.</li>
        <li>Do not try to break, overload or get around the security of the portal.</li>
      </ul>
      <p>We may suspend access, without refund, if these rules are broken.</p>

      <H>Results and analysis</H>
      <p>Scores, percentiles, ranks and college predictions are estimates based on our tests and past data, to help you prepare. They are not a promise of any exam result or admission. Guru, our AI mentor, can make mistakes; check important answers with your mentors.</p>

      <H>Changes and availability</H>
      <p>We keep improving tests and features and may change them, as long as what you paid for stays available for its validity. We aim to keep the portal running at all times, but it may occasionally be down for maintenance. If an outage stops you using a paid test, contact us and we will help, including under our refund policy.</p>

      <H>Liability</H>
      <p>To the extent the law allows, our total liability for any claim about a purchase is limited to the amount you paid for it.</p>

      <H>Privacy</H>
      <p>How we handle your data is explained in our <Link href="/privacy">privacy policy</Link>.</p>

      <H>Law and disputes</H>
      <p>These terms are governed by the laws of India. Please contact us first so we can try to resolve any problem; any dispute is subject to the courts of Mumbai, Maharashtra.</p>
    </LegalPage>
  );
}
