import type { NextConfig } from 'next';

const config: NextConfig = {
  // Doubt-solver photo uploads go through server actions.
  experimental: { serverActions: { bodySizeLimit: '6mb' } },
  poweredByHeader: false,
  // The website's "Join free" buttons link to /signup; sign-up and sign-in are the same OTP screen.
  async headers() {
    return [{ source: '/sw.js', headers: [{ key: 'Cache-Control', value: 'no-cache, no-store, must-revalidate' }, { key: 'Content-Type', value: 'application/javascript; charset=utf-8' }] }];
  },
  async redirects() {
    return [{ source: '/signup', destination: '/login', permanent: false }];
  },
};

export default config;
