import type { NextConfig } from 'next';

const config: NextConfig = {
  // Doubt-solver photo uploads go through server actions.
  experimental: { serverActions: { bodySizeLimit: '6mb' } },
  poweredByHeader: false,
};

export default config;
