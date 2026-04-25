'use client';

import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-6 font-sans">
      <div className="max-w-md w-full text-center space-y-8">
        
        {/* Goofy Visual */}
        <div className="relative">
          <h1 className="text-9xl font-black text-slate-900 select-none">404</h1>
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-6xl">🎭</span>
          </div>
        </div>

        <div className="space-y-4">
          <h2 className="text-3xl font-black text-white tracking-tighter">
            STAGE FRIGHT!
          </h2>
          <p className="text-slate-400 leading-relaxed">
            Oh no! You just walked on stage, but it looks like you&apos;re in the 
            wrong production. This page isn&apos;t in the script, and the Director 
            is looking very confused.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col gap-3">
          <Link 
            href="/" 
            className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-black py-4 rounded-2xl transition-all uppercase tracking-widest text-xs shadow-lg shadow-indigo-500/20"
          >
            Back to Stage Left (Home)
          </Link>
          
          <Link 
            href="/sandbox" 
            className="w-full bg-slate-900 hover:bg-slate-800 text-slate-400 font-black py-4 rounded-2xl transition-all uppercase tracking-widest text-xs border border-slate-800"
          >
            Return to the Sandbox
          </Link>
        </div>

        <p className="text-slate-600 text-[10px] uppercase font-bold tracking-[0.2em]">
          Intermission is over. Get back to your places.
        </p>
      </div>
    </div>
  );
}