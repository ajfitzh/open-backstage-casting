import React from 'react';
import Link from 'next/link';
import { Theater } from 'lucide-react';

export default function MarketingLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-50 font-sans selection:bg-blue-500/30 flex flex-col">
      {/* GLOBAL NAVIGATION */}
      <header className="fixed top-0 w-full border-b border-white/5 bg-zinc-950/80 backdrop-blur-md z-50">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          
          <Link href="/home" className="flex items-center gap-3 group">
            <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center text-blue-500 border border-blue-500/20 group-hover:bg-blue-500 group-hover:text-white transition-all shadow-[0_0_15px_rgba(59,130,246,0.2)]">
              <Theater size={20} />
            </div>
            <div className="flex flex-col">
                <span className="font-black tracking-tighter text-xl leading-none">OPEN<span className="text-zinc-500 group-hover:text-blue-400 transition-colors">BACKSTAGE</span></span>
                <span className="text-[9px] font-black text-blue-500 uppercase tracking-widest">Platform</span>
            </div>
          </Link>

          <nav className="flex items-center gap-6 text-sm font-bold">
            <Link href="/login" className="text-zinc-400 hover:text-white transition-colors uppercase tracking-widest text-xs">Staff Login</Link>
            <Link href="#contact" className="bg-white text-black hover:bg-zinc-200 px-5 py-2.5 rounded-full transition-all uppercase tracking-widest text-xs shadow-xl">
                Get Hosted
            </Link>
          </nav>

        </div>
      </header>

      {/* PAGE CONTENT */}
      <main className="flex-1 pt-20">
        {children}
      </main>
      
      {/* FOOTER */}
      <footer className="border-t border-white/5 bg-zinc-950 py-8 text-center text-xs font-bold text-zinc-600 uppercase tracking-widest">
         &copy; {new Date().getFullYear()} Open Backstage. Open Source Theater Management.
      </footer>
    </div>
  );
}