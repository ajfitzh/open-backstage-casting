'use client';

import Link from 'next/link';
import { Home } from 'lucide-react';

export default function NotFound() {
  return (
    <div className="min-h-screen bg-black flex items-center justify-center p-6 font-sans text-white">
      <div className="max-w-md w-full text-center space-y-8 animate-in fade-in zoom-in-95 duration-500">
        
        {/* Sleek, subtle 404 background */}
        <div className="relative">
          <h1 className="text-7xl md:text-9xl font-black text-zinc-900 tracking-tighter select-none">404</h1>
        </div>

        <div className="space-y-3 relative z-10 -mt-12 md:-mt-16">
          <h2 className="text-2xl md:text-3xl font-black uppercase italic tracking-tighter text-zinc-100">
            Off Script.
          </h2>
          <p className="text-zinc-500 font-medium text-sm md:text-base leading-relaxed max-w-sm mx-auto">
            We couldn&apos;t find the page you&apos;re looking for. It might have been moved, deleted, or is still in rehearsals.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col gap-3 pt-4 max-w-xs mx-auto">
          <Link 
            href="/" 
            className="w-full bg-blue-600 hover:bg-blue-500 text-white font-black py-4 rounded-xl transition-all uppercase tracking-widest text-xs flex items-center justify-center gap-2 shadow-lg shadow-blue-500/20"
          >
            <Home size={16} /> Back to Dashboard
          </Link>
          
          {/* Optional Sandbox link for you while in Dev Mode */}
          {process.env.NODE_ENV === 'development' && (
            <Link 
              href="/sandbox" 
              className="w-full bg-zinc-900 hover:bg-zinc-800 text-zinc-400 font-bold py-4 rounded-xl transition-all uppercase tracking-widest text-[10px] border border-white/5"
            >
              Open E2E Sandbox
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}