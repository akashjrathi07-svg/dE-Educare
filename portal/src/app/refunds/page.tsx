import Link from 'next/link';
import { H, LegalPage } from '@/components/legal';

export const metadata = { title: 'Cancellation and refunds', robots: { index: true } };

/** Cancellation, returns and refund policy for online exams. */
export default function Refunds() {
  return (
    <LegalPage title="Cancellation and refunds">
      <p>Everything DE Educare sells is online: mock tests, test series, practice sets and analysis. There is no physical product to return, so this policy explains when we refund a payment or fix your access instead.</p>

      <H>Returns</H>
      <p>As there are no physical goods, there are no returns or exchanges. Online access cannot be returned once it has been delivered to your account.</p>

      <H>When we refund or restore your access</H>
      <p>If something goes wrong after you buy, we will either give you access from our end or refund you in full. This applies when:</p>
      <ul>
        <li>you paid but the plan or exam was not added to your account;</li>
        <li>you cannot open or take the tests you paid for because of a problem on our side, and we cannot fix it;</li>
        <li>you were charged twice, or charged more than the price shown, for the same purchase;</li>
        <li>the payment failed but money was deducted from your account (Razorpay or your bank normally returns this by itself within 5–7 working days; if it does not, contact us).</li>
      </ul>
      <p>Tell us within 7 days of the payment, with your registered mobile number and payment reference. We first try to give you working access; if we cannot within 3 working days, or you prefer a refund in one of the cases above, we refund the full amount.</p>

      <H>When a refund is not given</H>
      <ul>
        <li>You change your mind after access has been delivered and the product works as described.</li>
        <li>Tests from the plan have already been taken or the plan has been used in full.</li>
        <li>Your score, rank or exam result is not what you expected.</li>
        <li>Access was suspended because the account was shared or the content was copied, against our <Link href="/terms">terms and conditions</Link>.</li>
      </ul>

      <H>Cancellation</H>
      <p>Plans are one-time payments, not subscriptions, so nothing renews and there is nothing to cancel. You can stop using the portal at any time and <Link href="/delete-account">delete your account</Link>; this does not by itself refund a payment.</p>

      <H>How refunds are paid</H>
      <p>Approved refunds go back to the original payment method (UPI, card or netbanking) through Razorpay. We start the refund within 2 working days of approving it; your bank usually shows it within 5–7 working days. We email or WhatsApp you when it is processed.</p>
    </LegalPage>
  );
}
