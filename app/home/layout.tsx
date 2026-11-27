import React from 'react';
import Link from 'next/link';
import { Theater } from 'lucide-react';

export default function MarketingLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-50 font-sans selection:bg-blue-500/30 flex flex-col overflow-x-hidden">
      {/* GLOBAL NAVIGATION */}
      <header className="fixed top-0 w-full border-b border-white/10 bg-zinc-950/85 backdrop-blur-md z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 sm:h-20 flex items-center justify-between gap-3">
          <Link href="/home" className="flex items-center gap-2.5 sm:gap-3 group shrink-0 min-h-[44px]">
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-blue-500/10 flex items-center justify-center text-blue-400 border border-blue-500/20 group-hover:bg-blue-600 group-hover:text-white transition-colors shrink-0">
              <Theater size={20} />
            </div>
            <div className="flex flex-col">
              <span className="font-bold tracking-tight text-base sm:text-xl leading-none whitespace-nowrap">
                OPEN<span className="text-zinc-400 group-hover:text-blue-400 transition-colors">BACKSTAGE</span>
              </span>
              <span className="text-[10px] font-semibold text-blue-400 uppercase tracking-widest mt-0.5">
                Platform
              </span>
            </div>
          </Link>

          <nav className="flex items-center gap-2 sm:gap-5 text-sm font-semibold shrink-0">
            <Link
              href="/workspaces?choose=1"
              className="hidden sm:inline-flex items-center px-3 min-h-[44px] text-zinc-300 hover:text-white transition-colors text-xs uppercase tracking-wider whitespace-nowrap"
            >
              Organizations
            </Link>
            <Link
              href="/login"
              className="inline-flex items-center px-3 min-h-[44px] text-zinc-300 hover:text-white transition-colors text-xs uppercase tracking-wider whitespace-nowrap"
            >
              Sign In
            </Link>
            <Link
              href="/workspaces?choose=1"
              className="inline-flex items-center justify-center bg-white text-zinc-950 hover:bg-zinc-200 px-3.5 sm:px-5 min-h-[40px] rounded-xl transition-colors text-xs font-bold whitespace-nowrap shadow-sm"
            >
              Add Your Org
            </Link>
          </nav>
        </div>
      </header>

      {/* PAGE CONTENT */}
      <main className="flex-1 pt-16 sm:pt-20">
        {children}
      </main>

      {/* FOOTER */}
      <footer className="border-t border-white/10 bg-zinc-950 py-8 px-4 text-center text-xs font-medium text-zinc-400">
        &copy; {new Date().getFullYear()} Open Backstage. Open-Source Theater Management.
      </footer>
    </div>
  );
}
