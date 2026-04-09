/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,

  // Force the HTML document and the manifest/service worker to bypass any
  // intermediate cache so PWAs added to a home screen always pull the latest
  // shell. Hashed JS/CSS chunks under /_next/static stay long-cacheable
  // because their filenames change on every deploy.
  async headers() {
    const noStore = [
      { key: 'Cache-Control', value: 'no-store, no-cache, must-revalidate, max-age=0' },
      { key: 'Pragma', value: 'no-cache' },
      { key: 'Expires', value: '0' },
    ];
    return [
      { source: '/', headers: noStore },
      { source: '/admin', headers: noStore },
      { source: '/manifest.json', headers: noStore },
      { source: '/sw.js', headers: noStore },
    ];
  },

  // Map the canonical /sw.js URL (which gets root scope by default) to the
  // dynamic route handler that bakes the build ID into the worker source.
  async rewrites() {
    return [
      { source: '/sw.js', destination: '/api/sw' },
    ];
  },
};

module.exports = nextConfig;
