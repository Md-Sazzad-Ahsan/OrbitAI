import './globals.css';
import ClientLayout from './client-layout';
import { Suspense } from 'react';
import PWAInstaller from '../components/PWAInstaller';

export const metadata = {
  title: 'OrbitAI',
  description: 'A modern web application',
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'),
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'OrbitAI',
  },
  formatDetection: {
    telephone: false,
  },
  icons: {
    icon: '/icons/icon-192x192.png',
    shortcut: '/icons/icon-192x192.png',
    apple: '/icons/icon-192x192.png',
  },
};

export const viewport = {
  themeColor: '#0a0a0a',
  width: 'device-width',
  initialScale: 1.0,
  maximumScale: 1.0,
  userScalable: false,
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head>
        <link rel="manifest" href="/manifest.json" />
        <meta name="theme-color" content="#0a0a0a" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      </head>
      <body className="min-h-screen bg-gray-50 dark:bg-gray-900 antialiased">
        <Suspense fallback={null}>
          <ClientLayout>
            {children}
            <PWAInstaller />
          </ClientLayout>
        </Suspense>
      </body>
    </html>
  );
}
