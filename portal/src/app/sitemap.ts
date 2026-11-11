import type { MetadataRoute } from 'next';

const BASE = 'https://portal.deeducare.com';

/** Public portal pages for search engines. Everything else needs a sign-in. */
export default function sitemap(): MetadataRoute.Sitemap {
  return [
    { path: '/login', priority: 0.8 },
    { path: '/privacy', priority: 0.3 },
    { path: '/terms', priority: 0.3 },
    { path: '/refunds', priority: 0.3 },
    { path: '/shipping', priority: 0.3 },
  ].map(p => ({ url: BASE + p.path, changeFrequency: 'monthly', priority: p.priority }));
}
