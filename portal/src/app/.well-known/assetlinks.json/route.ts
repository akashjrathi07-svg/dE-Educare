import { androidFingerprints } from '@/lib/server/settings';

/**
 * Digital Asset Links: proves the Android app (package com.deeducare.app) belongs to this site, so it opens
 * the portal full screen with no browser bar. The fingerprints come from Admin → Android app (or the
 * ANDROID_CERT_SHA256 environment variable): the Play Console "App signing key" SHA-256 plus the upload key.
 */
export const dynamic = 'force-dynamic';

export async function GET() {
  const prints = await androidFingerprints().catch(() => []);
  const body = prints.length
    ? [{ relation: ['delegate_permission/common.handle_all_urls'], target: { namespace: 'android_app', package_name: process.env.ANDROID_PACKAGE ?? 'com.deeducare.app', sha256_cert_fingerprints: prints } }]
    : [];
  return Response.json(body, { headers: { 'cache-control': 'public, max-age=300' } });
}
