// app/layout.tsx
import { CastingProvider } from '@/lib/CastingContext';
import './globals.css';

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <body className="bg-zinc-950 text-zinc-100 flex h-screen overflow-hidden">
        <CastingProvider>
          {/* Simple Sidebar */}
          <nav className="w-64 border-r border-zinc-800 p-6 flex flex-col gap-4">
            <h1 className="text-xl font-bold mb-8 text-blue-400">Open Backstage</h1>
            <div className="flex flex-col gap-2">
              <button className="text-left p-2 hover:bg-zinc-900 rounded">Auditions</button>
              <button className="text-left p-2 hover:bg-zinc-900 rounded">Callbacks</button>
              <button className="text-left p-2 hover:bg-zinc-900 rounded font-bold text-white border-l-2 border-blue-500 pl-4">Casting</button>
            </div>
          </nav>
          
          <main className="flex-1 overflow-auto bg-zinc-900/50">
            {children}
          </main>
        </CastingProvider>
      </body>
    </html>
  );
}