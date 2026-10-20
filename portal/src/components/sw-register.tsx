'use client';
import { useEffect } from 'react';

/** Registers the service worker that makes the portal installable and shows an offline page. */
export function SwRegister() {
  useEffect(() => {
    if ('serviceWorker' in navigator && process.env.NODE_ENV === 'production') {
      navigator.serviceWorker.register('/sw.js', { scope: '/' }).catch(() => {});
    }
  }, []);
  return null;
}
