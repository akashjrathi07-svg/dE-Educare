import type { MetadataRoute } from 'next';

/** Makes the portal installable ("Add to Home screen") and is what the Android app opens. */
export default function manifest(): MetadataRoute.Manifest {
  return {
    id: '/',
    name: 'DE Educare',
    short_name: 'DE Educare',
    description: 'Mock tests, AI analysis with Guru and live classes for CAT, MBA-CET and SNAP.',
    start_url: '/?source=app',
    scope: '/',
    display: 'standalone',
    orientation: 'portrait',
    background_color: '#F4F5F9',
    theme_color: '#1F3A8A',
    categories: ['education'],
    lang: 'en-IN',
    icons: [
      { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
      { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
      { src: '/icons/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
    shortcuts: [
      { name: 'Today’s free test', url: '/daily/cat', icons: [{ src: '/icons/icon-192.png', sizes: '192x192' }] },
      { name: 'My tests', url: '/tests', icons: [{ src: '/icons/icon-192.png', sizes: '192x192' }] },
      { name: 'Results', url: '/results', icons: [{ src: '/icons/icon-192.png', sizes: '192x192' }] },
    ],
  };
}
