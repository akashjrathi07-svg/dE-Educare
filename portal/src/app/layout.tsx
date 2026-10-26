import type { Metadata, Viewport } from 'next';
import { IBM_Plex_Mono, Manrope } from 'next/font/google';
import './globals.css';
import { currentUser } from '@/lib/server/auth';
import { SwRegister } from '@/components/sw-register';

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
  return (
    <html lang="en" data-theme={user?.theme ?? 'light'} className={`${manrope.variable} ${plexMono.variable}`}>
      <body>{children}<SwRegister /></body>
    </html>
  );
}
