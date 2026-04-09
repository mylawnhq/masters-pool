'use client';
import { useEffect } from 'react';

// Registers the network-first service worker and reloads the page as soon as
// a new version finishes installing in the background. Combined with the
// no-store Cache-Control headers and the dynamic SSR home page, this keeps
// the home-screen PWA from ever serving stale shell code.
export default function ServiceWorkerRegister() {
  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (!('serviceWorker' in navigator)) return;

    let reloadedForUpdate = false;

    // If the controlling worker changes mid-session, reload once so the new
    // assets take effect immediately. Guarded so we don't loop.
    const onControllerChange = () => {
      if (reloadedForUpdate) return;
      reloadedForUpdate = true;
      window.location.reload();
    };
    navigator.serviceWorker.addEventListener('controllerchange', onControllerChange);

    let cancelled = false;

    (async () => {
      try {
        const registration = await navigator.serviceWorker.register('/sw.js', {
          scope: '/',
          // Bypass the HTTP cache when the browser checks for an updated SW
          // script. Combined with no-store on /sw.js this guarantees fresh
          // bytes on every visit.
          updateViaCache: 'none',
        });
        if (cancelled) return;

        // If a worker is already waiting from a previous visit, tell it to
        // activate now so the user gets the new version on this load.
        if (registration.waiting) {
          registration.waiting.postMessage('SKIP_WAITING');
        }

        registration.addEventListener('updatefound', () => {
          const installing = registration.installing;
          if (!installing) return;
          installing.addEventListener('statechange', () => {
            if (
              installing.state === 'installed' &&
              navigator.serviceWorker.controller
            ) {
              // A new worker installed while the page already had a
              // controller — that means there's an update waiting. Skip the
              // waiting state so controllerchange fires and we reload.
              installing.postMessage('SKIP_WAITING');
            }
          });
        });

        // Force an explicit update check on every page load so a fresh
        // /sw.js (and therefore a new build ID) is fetched immediately.
        registration.update().catch(() => {});
      } catch {
        // Registration failures are non-fatal — the site still works
        // without a service worker.
      }
    })();

    return () => {
      cancelled = true;
      navigator.serviceWorker.removeEventListener('controllerchange', onControllerChange);
    };
  }, []);

  return null;
}
