import './globals.css';
import { Analytics } from '@vercel/analytics/react';

export const metadata = {
  title: "Mendoza's Masters Pool — 2026",
  description: 'Track picks, standings, and earnings for the 2026 Masters Pool',
  manifest: '/manifest.json',
  applicationName: "Mendoza's Masters Pool",
  appleWebApp: {
    capable: true,
    title: 'Masters Pool',
    statusBarStyle: 'black-translucent',
  },
  icons: {
    icon: [
      { url: '/icon-192.png', sizes: '192x192', type: 'image/png' },
      { url: '/icon-512.png', sizes: '512x512', type: 'image/png' },
    ],
    apple: { url: '/apple-touch-icon.png', sizes: '180x180', type: 'image/png' },
  },
};

export const viewport = {
  themeColor: '#006B54',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head>
        {/* Apple splash screens — matched to common iPhone resolutions */}
        <link
          rel="apple-touch-startup-image"
          href="/apple-splash-1290x2796.png"
          media="(device-width: 430px) and (device-height: 932px) and (-webkit-device-pixel-ratio: 3)"
        />
        <link
          rel="apple-touch-startup-image"
          href="/apple-splash-1170x2532.png"
          media="(device-width: 390px) and (device-height: 844px) and (-webkit-device-pixel-ratio: 3)"
        />
        <link
          rel="apple-touch-startup-image"
          href="/apple-splash-750x1334.png"
          media="(device-width: 375px) and (device-height: 667px) and (-webkit-device-pixel-ratio: 2)"
        />
      </head>
      <body>
        {children}
        <Analytics />
      </body>
    </html>
  );
}
