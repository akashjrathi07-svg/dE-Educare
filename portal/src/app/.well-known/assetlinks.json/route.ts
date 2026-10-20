/**
 * Digital Asset Links: proves the Android app (package com.deeducare.app) belongs to this site, so it opens
 * the portal full screen with no browser bar. ANDROID_CERT_SHA256 lists the app's signing certificate
 * fingerprints, comma separated: the "App signing key" SHA-256 from Play Console → Test and release → App integrity,
 * plus the upload key for testing the APK directly.
 */
export const dynamic = 'force-dynamic';

export function GET() {
  const prints = (process.env.ANDROID_CERT_SHA256 ?? '').split(',').map(s => s.trim().toUpperCase()).filter(s => /^([0-9A-F]{2}:){31}[0-9A-F]{2}$/.test(s));
  const body = prints.length
    ? [{ relation: ['delegate_permission/common.handle_all_urls'], target: { namespace: 'android_app', package_name: process.env.ANDROID_PACKAGE ?? 'com.deeducare.app', sha256_cert_fingerprints: prints } }]
    : [];
  return Response.json(body, { headers: { 'cache-control': 'public, max-age=3600' } });
}
