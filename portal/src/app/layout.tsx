import type { Metadata, Viewport } from 'next';
import './globals.css';
import { currentUser } from '@/lib/server/auth';

export const metadata: Metadata = {
  title: { default: 'DE Educare', template: '%s · DE Educare' },
  description: 'Mock tests, AI analysis and live classes for CAT, MBA-CET and OMETs.',
  robots: { index: false },
};
export const viewport: Viewport = { themeColor: '#1F3A8A' };

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const user = await currentUser().catch(() => null);
  return (
    <html lang="en" data-theme={user?.theme ?? 'light'}>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        {/* eslint-disable-next-line @next/next/no-page-custom-font */}
        <link href="https://fonts.googleapis.com/css2?family=Manrope:wght@400;500;600;700;800&family=IBM+Plex+Mono:wght@500;600&display=swap" rel="stylesheet" />
      </head>
      <body>{children}</body>
    </html>
  );
}
