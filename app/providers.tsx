import './globals.css';
import type { Metadata } from 'next';
import { Providers } from '../app/providers';

// 🛑 THIS IS THE FIX FOR VERCEL
// This tells Next.js: "Do not try to build static HTML. 
// Render everything fresh on every request."
export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Open Backstage',
  description: 'CYT Production Hub',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      {/* 1. suppressHydrationWarning: Keeps extensions like ColorZilla happy.
          2. NO Header here: This ensures the Login page gets the full, empty screen.
      */}
      <body 
        className="bg-zinc-950 text-zinc-100 h-screen w-screen overflow-hidden"
        suppressHydrationWarning={true}
      >
        <Providers>
          {children}
        </Providers>
      </body>
    </html>
  );
}