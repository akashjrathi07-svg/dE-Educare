import type { Metadata, Viewport } from 'next';
import { IBM_Plex_Mono, Manrope } from 'next/font/google';
import './globals.css';
import { currentUser } from '@/lib/server/auth';
import { SwRegister } from '@/components/sw-register';
import { MetaPixel } from '@/components/meta-pixel';

// Meta Pixel for ads tracking; META_PIXEL_ID in Vercel overrides it, "off" turns it off.
const PIXEL_ID = (process.env.META_PIXEL_ID ?? '974008692441555').replace(/\D/g, '');

// Fonts are bundled with the portal (no request to Google at page load), with system fonts shown until they arrive.
const manrope = Manrope({ subsets: ['latin'], variable: '--font-manrope', display: 'swap' });
const plexMono = IBM_Plex_Mono({ subsets: ['latin'], weight: ['500', '600'], variable: '--font-plex', display: 'swap' });

export const metadata: Metadata = {
  title: { default: 'DE Educare', template: '%s · DE Educare' },
  description: 'Mock tests, AI analysis and live classes for CAT, MBA-CET and OMETs.',
  robots: { index: false },
  applicationName: 'DE Educare',
  appleWebApp: { capable: true, title: 'DE Educare', statusBarStyle: 'default' },
};
export const viewport: Viewport = { themeColor: '#1F3A8A' };

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const user = await currentUser().catch(() => null);
  // Staff visits (admin, faculty…) are not tracked.
  const pixel = PIXEL_ID && (!user || user.role === 'student') ? PIXEL_ID : '';
  return (
    <html lang="en" data-theme={user?.theme ?? 'light'} className={`${manrope.variable} ${plexMono.variable}`}>
      <body>{pixel && <MetaPixel id={pixel} />}{children}<SwRegister /></body>
    </html>
  );
}
