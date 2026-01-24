"use client";
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { getActiveProduction } from '@/app/lib/baserow'; 
import { Loader2, Users, ClipboardList, Settings, BookOpen, LayoutTemplate } from 'lucide-react'; 

export default function RootPage() {
  const [loading, setLoading] = useState(true);
  const [showName, setShowName] = useState("");

  useEffect(() => {
    async function init() {
      try {
        const show = await getActiveProduction();
        if (show) {
            localStorage.setItem('activeShowId', show.id.toString());
            setShowName(show.Name || "Current Production"); 
        }
      } catch (e) {
        console.error("Failed to fetch show:", e);
      } finally {
        setLoading(false); 
      }
    }
    init();
  }, []);

  if (loading) {
    return (
      <div className="h-full flex flex-col items-center justify-center text-white gap-4">
          <Loader2 className="animate-spin text-blue-500" size={48} />
          <h2 className="text-sm font-bold uppercase tracking-widest text-zinc-500">Loading Context...</h2>
      </div>
    );
  }

  return (
    // FIX: Using h-full (fits layout) and max-w-7xl (wider dashboard)
    <div className="h-full bg-zinc-950 text-white p-6 md:p-10 font-sans flex flex-col items-center overflow-y-auto custom-scrollbar">
      
      {/* Header */}
      <div className="max-w-7xl w-full mb-10 border-b border-zinc-800 pb-6 flex flex-col md:flex-row justify-between md:items-end gap-4">
        <div>
            <h1 className="text-3xl md:text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-purple-400 to-emerald-400 tracking-tighter italic uppercase">
                Open Backstage
            </h1>
            <p className="text-zinc-400 mt-2 text-sm md:text-base font-medium">
                Production Hub <span className="text-zinc-600 mx-2">/</span> <span className="text-emerald-400 font-mono font-bold tracking-wide">{showName}</span>
            </p>
        </div>
        <div className="text-xs font-mono text-zinc-500 bg-zinc-900/50 px-3 py-1 rounded-full border border-zinc-800/50">
            v1.0.4-beta
        </div>
      </div>

      {/* The Menu Grid - Wider and Responsive */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 max-w-7xl w-full pb-12">
        
        {/* --- 1. CASTING (Blue) --- */}
        <Link 
          href="/auditions" 
          className="group relative flex flex-col p-6 bg-zinc-900 rounded-3xl border border-zinc-800 hover:border-blue-500/50 hover:bg-zinc-900/80 transition-all duration-300 hover:-translate-y-1 shadow-lg shadow-black/50"
        >
          <div className="flex justify-between items-start mb-8">
            <div className="p-4 bg-blue-500/10 w-fit rounded-2xl text-blue-400 group-hover:text-blue-300 group-hover:scale-110 transition-transform">
                <Users size={32} />
            </div>
            <span className="text-[10px] font-black uppercase text-zinc-500 bg-zinc-950 px-3 py-1.5 rounded-full border border-zinc-800 group-hover:border-blue-500/30 group-hover:text-blue-400">Active</span>
          </div>
          <div className="mt-auto">
            <h2 className="text-2xl font-bold mb-2 text-zinc-100 group-hover:text-blue-400 transition-colors">Casting</h2>
            <p className="text-zinc-500 text-sm leading-relaxed">
                Auditions, Callbacks, and Cast Lists.
            </p>
          </div>
        </Link>

        {/* --- 2. STAFF DECK (Emerald) --- */}
        <Link 
          href="/committees" 
          className="group relative flex flex-col p-6 bg-zinc-900 rounded-3xl border border-zinc-800 hover:border-emerald-500/50 hover:bg-zinc-900/80 transition-all duration-300 hover:-translate-y-1 shadow-lg shadow-black/50"
        >
          <div className="flex justify-between items-start mb-8">
            <div className="p-4 bg-emerald-500/10 w-fit rounded-2xl text-emerald-400 group-hover:text-emerald-300 group-hover:scale-110 transition-transform">
                <ClipboardList size={32} />
            </div>
            <span className="text-[10px] font-black uppercase text-zinc-500 bg-zinc-950 px-3 py-1.5 rounded-full border border-zinc-800 group-hover:border-emerald-500/30 group-hover:text-emerald-400">Production</span>
          </div>
          <div className="mt-auto">
            <h2 className="text-2xl font-bold mb-2 text-zinc-100 group-hover:text-emerald-400 transition-colors">Staff Deck</h2>
            <p className="text-zinc-500 text-sm leading-relaxed">
                Reports, Attendance, and Committees.
            </p>
          </div>
        </Link>

        {/* --- 3. ASSETS (Amber) --- */}
        <div className="group relative flex flex-col p-6 bg-zinc-900/40 rounded-3xl border border-zinc-800/50 hover:border-amber-500/30 hover:bg-zinc-900/60 transition-all duration-300 cursor-not-allowed opacity-75">
          <div className="flex justify-between items-start mb-8">
            <div className="p-4 bg-amber-500/10 w-fit rounded-2xl text-amber-500/50 group-hover:text-amber-400 group-hover:scale-110 transition-transform">
                <BookOpen size={32} />
            </div>
            <span className="text-[10px] font-black uppercase text-zinc-700 bg-zinc-950/50 px-3 py-1.5 rounded-full border border-zinc-800/50">Soon</span>
          </div>
          <div className="mt-auto">
            <h2 className="text-2xl font-bold mb-2 text-zinc-500 group-hover:text-amber-500/80 transition-colors">Script & Score</h2>
            <p className="text-zinc-600 text-sm leading-relaxed">
                Digital scripts and rehearsal tracks.
            </p>
          </div>
        </div>

        {/* --- 4. SHOW SETTINGS (Zinc) --- */}
        <div className="group relative flex flex-col p-6 bg-zinc-900/40 rounded-3xl border border-zinc-800/50 hover:border-white/20 hover:bg-zinc-900/60 transition-all duration-300 cursor-not-allowed opacity-75">
          <div className="flex justify-between items-start mb-8">
            <div className="p-4 bg-white/5 w-fit rounded-2xl text-zinc-500 group-hover:text-zinc-300 group-hover:scale-110 transition-transform">
                <Settings size={32} />
            </div>
          </div>
          <div className="mt-auto">
            <h2 className="text-2xl font-bold mb-2 text-zinc-500 group-hover:text-white transition-colors">Settings</h2>
            <p className="text-zinc-600 text-sm leading-relaxed">
                Manage show context and users.
            </p>
          </div>
        </div>

      </div>
    </div>
  );
}