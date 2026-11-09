import Link from 'next/link';
import { H, LegalPage } from '@/components/legal';

export const metadata = { title: 'Shipping and delivery', robots: { index: true } };

/** Shipping and delivery policy: everything is delivered online, nothing is shipped. */
export default function Shipping() {
  return (
    <LegalPage title="Shipping and delivery">
      <H>No physical products</H>
      <p>DE Educare sells only online products: mock tests, test series, practice sets and online coaching access for CAT, MBA-CET, OMETs and other exams. We do not sell or ship any physical goods, so there are no shipping charges, no delivery address and no courier tracking.</p>

      <H>How you receive what you buy</H>
      <ul>
        <li>Your purchase is delivered to your DE Educare account, the one linked to your mobile number, on the student portal (<a href="https://portal.deeducare.com">portal.deeducare.com</a>) and the DE Educare app.</li>
        <li>Access is usually active within a few seconds of a successful payment. Open <b>Tests</b> in the portal to start.</li>
        <li>If the bank takes longer to confirm a payment, access starts automatically as soon as it is confirmed, normally within 15 minutes.</li>
        <li>A payment confirmation and invoice are shown on screen after payment and kept in your account.</li>
      </ul>

      <H>Validity</H>
      <p>Each plan shows its validity (for example, until the exam date) on the plans page before you pay. Access stays active for that period on web and app.</p>

      <H>If access does not start</H>
      <p>If you paid but cannot see your tests within 24 hours, contact us with your registered mobile number and payment reference. We will activate your access, or refund you in full if we cannot, as set out in our <Link href="/refunds">cancellation and refund policy</Link>.</p>
    </LegalPage>
  );
}
