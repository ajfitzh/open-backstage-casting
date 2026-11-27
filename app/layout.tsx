import './globals.css';
import type { Metadata, Viewport } from 'next';
import { Inter, JetBrains_Mono } from 'next/font/google';
import { ToastProvider } from '@/app/components/ToastProvider';
import CapacitorBootstrap from '@/app/components/CapacitorBootstrap';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  variable: '--font-jetbrains-mono',
  display: 'swap',
});

export const dynamic = 'force-dynamic';

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
  themeColor: '#09090b',
};

export const metadata: Metadata = {
  title: 'Open Backstage',
  description: 'Open-source theater & performing arts production hub',
  icons: {
    icon: '/logo.svg',
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`dark ${inter.variable} ${jetbrainsMono.variable}`}>
      <body
        className="bg-zinc-950 text-zinc-100 min-h-screen antialiased font-sans"
        suppressHydrationWarning={true}
      >
        <CapacitorBootstrap />
        <ToastProvider>{children}</ToastProvider>
      </body>
    </html>
  );
}
