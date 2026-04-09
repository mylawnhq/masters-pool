// Dynamically-served service worker. The body is wrapped in a route handler so
// the build ID gets baked in on every deploy — that guarantees the script is
// byte-different from any previously installed version, which forces the
// browser to install a fresh worker instead of reusing the old one.

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

function buildVersion() {
  return (
    process.env.NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA ||
    process.env.VERCEL_GIT_COMMIT_SHA ||
    process.env.NEXT_PUBLIC_BUILD_ID ||
    `dev-${Date.now()}`
  );
}

const SW_SOURCE = (version) => `// Mendoza's Masters Pool service worker — network-first, cache-as-fallback.
// version: ${version}
const VERSION = ${JSON.stringify(version)};
const CACHE_NAME = 'mmp-' + VERSION;

self.addEventListener('install', (event) => {
  // Replace any prior worker as soon as we install — never wait for tabs to
  // close. Critical so the home-screen PWA picks up new code on next open.
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    // Drop every cache that isn't the current version so old shells can't
    // come back and serve stale HTML or chunks.
    const keys = await caches.keys();
    await Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)));
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;

  let url;
  try { url = new URL(req.url); } catch { return; }
  if (url.origin !== self.location.origin) return;

  // Never cache the service worker itself or the manifest.
  if (url.pathname === '/sw.js' || url.pathname === '/manifest.json') {
    event.respondWith(fetch(req, { cache: 'no-store' }));
    return;
  }

  event.respondWith((async () => {
    try {
      // Always try the network first. Bypass any HTTP cache for navigations
      // so the document is fresh on every visit.
      const fetchOpts = req.mode === 'navigate' ? { cache: 'no-store' } : undefined;
      const fresh = await fetch(req, fetchOpts);
      if (fresh && fresh.ok && fresh.type === 'basic') {
        const cache = await caches.open(CACHE_NAME);
        // Stash a clone for offline fallback.
        cache.put(req, fresh.clone()).catch(() => {});
      }
      return fresh;
    } catch (err) {
      const cached = await caches.match(req);
      if (cached) return cached;
      if (req.mode === 'navigate') {
        const fallback = await caches.match('/');
        if (fallback) return fallback;
      }
      throw err;
    }
  })());
});

self.addEventListener('message', (event) => {
  if (event.data === 'SKIP_WAITING') self.skipWaiting();
});
`;

export async function GET() {
  const body = SW_SOURCE(buildVersion());
  return new Response(body, {
    status: 200,
    headers: {
      'Content-Type': 'application/javascript; charset=utf-8',
      // Allow this worker — even if it ends up served from a non-root path —
      // to control the entire origin.
      'Service-Worker-Allowed': '/',
      // Never cache the worker script itself, so update checks always hit
      // the network and see the latest body.
      'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0',
      Pragma: 'no-cache',
      Expires: '0',
    },
  });
}
