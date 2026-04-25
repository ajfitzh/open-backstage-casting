'use client';

import Link from 'next/link';

export default function SandboxMenu() {
  return (
    <div className="min-h-screen bg-slate-950 p-6 md:p-12 font-sans text-slate-200">
      
      {/* BRANDING HEADER */}
      <div className="max-w-5xl mx-auto flex items-center justify-between mb-12">
        <div className="flex items-center space-x-2 select-none">
          <span className="font-black text-white tracking-widest text-2xl">CYT</span>
          <span className="text-indigo-500 font-light text-2xl">|</span>
          <span className="text-slate-400 font-normal lowercase text-xl">open-backstage</span>
        </div>
        <div className="flex items-center gap-4">
          <span className="px-3 py-1 bg-indigo-500/10 text-indigo-400 text-[10px] font-black uppercase tracking-widest rounded-full border border-indigo-500/20">
            Volunteer Hub
          </span>
        </div>
      </div>

      <div className="max-w-5xl mx-auto space-y-12">
        
        {/* HERO SECTION */}
        <div className="space-y-4">
          <h1 className="text-4xl md:text-6xl font-black text-white tracking-tighter">
            The Sandbox <span className="text-indigo-500">.</span>
          </h1>
          <p className="text-slate-400 max-w-2xl leading-relaxed">
            Welcome to the digital backstage. Use the tools below to manage live audition flows, 
            track student status, and ensure the lobby runs smoothly.
          </p>
        </div>

        {/* FEATURE GRID */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          
          {/* AUDITION CHECK-IN CARD */}
          <Link href="/sandbox/check-in" className="group">
            <div className="h-full bg-slate-900 border border-slate-800 rounded-3xl p-8 hover:border-indigo-500/50 transition-all hover:shadow-2xl hover:shadow-indigo-500/10 relative overflow-hidden">
              {/* Decorative Glow */}
              <div className="absolute -right-4 -top-4 w-24 h-24 bg-indigo-600/10 blur-3xl group-hover:bg-indigo-600/20 transition-colors"></div>
              
              <div className="relative z-10 space-y-6">
                <div className="w-12 h-12 bg-indigo-600 rounded-2xl flex items-center justify-center text-2xl shadow-lg shadow-indigo-500/20">
                  📋
                </div>
                <div>
                  <h3 className="text-xl font-bold text-white mb-2">Check-In Desk</h3>
                  <p className="text-slate-500 text-sm leading-relaxed">
                    Live roster management, status tracking, and paperwork verification for all 76 students.
                  </p>
                </div>
                <div className="pt-4 flex items-center text-indigo-400 font-black text-[10px] uppercase tracking-[0.2em] group-hover:gap-2 transition-all">
                  Open Application &rarr;
                </div>
              </div>
            </div>
          </Link>

          {/* BACKUP & EXPORT CARD */}
          <div className="bg-slate-900/50 border border-slate-800/50 rounded-3xl p-8 opacity-60 flex flex-col justify-between">
            <div className="space-y-6">
              <div className="w-12 h-12 bg-slate-800 rounded-2xl flex items-center justify-center text-2xl">
                💾
              </div>
              <div>
                <h3 className="text-xl font-bold text-slate-300 mb-2">Data & Backups</h3>
                <p className="text-slate-600 text-sm leading-relaxed">
                  Export the current roster to CSV for paper-trail backups or Director&apos;s call sheets.
                </p>
              </div>
            </div>
            <div className="pt-8 text-[9px] font-black text-slate-700 uppercase tracking-widest italic">
              Included in Check-In App
            </div>
          </div>

          {/* WALK-IN REGISTRATION CARD */}
          <div className="bg-slate-900/50 border border-slate-800/50 rounded-3xl p-8 opacity-60 flex flex-col justify-between">
            <div className="space-y-6">
              <div className="w-12 h-12 bg-slate-800 rounded-2xl flex items-center justify-center text-2xl">
                👤
              </div>
              <div>
                <h3 className="text-xl font-bold text-slate-300 mb-2">Walk-In Entry</h3>
                <p className="text-slate-600 text-sm leading-relaxed">
                  Quickly add new students who show up without a prior registration.
                </p>
              </div>
            </div>
            <div className="pt-8 text-[9px] font-black text-slate-700 uppercase tracking-widest italic">
              Included in Check-In App
            </div>
          </div>

        </div>

        {/* FOOTER ACTION */}
        <div className="pt-12 border-t border-slate-900 flex flex-col md:flex-row justify-between items-center gap-6">
          <p className="text-slate-600 text-[10px] font-bold uppercase tracking-widest">
            Logged in as: <span className="text-slate-400">Sandbox Admin</span>
          </p>
          <button 
            onClick={() => {
              // Clear the sandbox cookie and go home
              document.cookie = "sandbox_access=; path=/; expires=Thu, 01 Jan 1970 00:00:01 GMT;";
              window.location.href = '/';
            }}
            className="text-rose-500/50 hover:text-rose-500 text-[10px] font-black uppercase tracking-widest transition-colors"
          >
            Exit Sandbox Mode
          </button>
        </div>

      </div>
    </div>
  );
}