import './globals.css';
import { Analytics } from '@vercel/analytics/react';

export const metadata = {
  title: "Mendoza's Masters Pool — 2026",
  description: 'Track picks, standings, and earnings for the 2026 Masters Pool',
  icons: {
    icon: "data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><text y='.9em' font-size='90'>⛳</text></svg>",
  },
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        {children}
        <Analytics />
      </body>
    </html>
  );
}
