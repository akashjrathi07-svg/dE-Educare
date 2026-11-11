import type { MetadataRoute } from 'next';

/** Search engines may read the public pages; admin, API and student pages stay out. */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: { userAgent: '*', allow: '/', disallow: ['/admin', '/api/', '/checkout', '/results', '/test/', '/exam', '/onboarding', '/delete-account'] },
    sitemap: 'https://portal.deeducare.com/sitemap.xml',
  };
}
