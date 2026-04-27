'use client';

import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-6 font-sans">
      <div className="max-w-md w-full text-center space-y-8">
        
        {/* Cutesy Flustered Visual */}
        <div className="relative">
          {/* Softened the 404 text so it looks a bit more faded in the background */}
          <h1 className="text-9xl font-black text-slate-800/40 select-none">404</h1>
          <div className="absolute inset-0 flex items-center justify-center">
            {/* Added a gentle bounce to the peek-a-boo emoji */}
            <span className="text-6xl animate-bounce">🫣</span>
          </div>
        </div>

        <div className="space-y-4">
          <h2 className="text-3xl font-black text-white tracking-tighter">
            Oh no! I forgot my lines...
          </h2>
          <p className="text-slate-400 leading-relaxed text-sm md:text-base">
            I&apos;m so sorry! This page totally slipped my mind. I swear I&apos;ll have it down by next week&apos;s rehearsal, I promise! <br/><br/>
            ...Wait, does anyone have a pencil? ✏️
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col gap-3 mt-4">
          <Link 
            href="/" 
            className="w-full bg-pink-500 hover:bg-pink-400 text-white font-black py-4 rounded-3xl transition-all uppercase tracking-widest text-xs shadow-lg shadow-pink-500/20"
          >
            Sneak Back Home 🩰
          </Link>
          
          <Link 
            href="/sandbox" 
            className="w-full bg-slate-900 hover:bg-slate-800 text-pink-300 font-black py-4 rounded-3xl transition-all uppercase tracking-widest text-xs border border-slate-800"
          >
            Hide in the Sandbox 🙈
          </Link>
        </div>

        <p className="text-slate-600 text-[11px] uppercase font-bold tracking-[0.2em] pt-4">
          Psst... prompt me from offstage! 🎭
        </p>
      </div>
    </div>
  );
}