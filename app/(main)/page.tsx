"use client";
import { useEffect, useState } from 'react';
import { getActiveProduction } from '@/app/lib/baserow'; // Assuming this import path is correct
import { Loader2, Users, ClipboardList, Settings } from 'lucide-react'; // Added icons for the menu

export default function RootPage() {
  const [loading, setLoading] = useState(true);
  const [showName, setShowName] = useState("");

  useEffect(() => {
    async function init() {
      try {
        const show = await getActiveProduction();
        if (show) {
            // 1. Still save the ID for context
            localStorage.setItem('activeShowId', show.id.toString());
            setShowName(show.Name || "Current Production"); // Adjust '.Name' to match your Baserow column
        }
      } catch (e) {
        console.error("Failed to fetch show:", e);
      } finally {
        // 2. STOP the loader, but DO NOT redirect.
        setLoading(false); 
      }
    }
    init();
  }, []);

  // STATE 1: LOADING (Keep your original cool spinner)
  if (loading) {
    return (
      <div className="h-screen bg-zinc-950 flex flex-col items-center justify-center text-white gap-4">
          <Loader2 className="animate-spin text-blue-500" size={48} />
          <h2 className="text-sm font-bold uppercase tracking-widest text-zinc-500">Loading Context...</h2>
      </div>
    );
  }

  // STATE 2: THE DASHBOARD (This is what they see when loading finishes)
  return (
    <div className="min-h-screen bg-zinc-950 text-white p-8 font-sans flex flex-col items-center">
      
      {/* Header */}
      <div className="max-w-4xl w-full mb-12 border-b border-zinc-800 pb-6 flex justify-between items-end">
        <div>
            <h1 className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-emerald-400">
                CYT PRODUCTION HUB
            </h1>
            <p className="text-zinc-400 mt-2">
                Active Context: <span className="text-emerald-400 font-mono">{showName}</span>
            </p>
        </div>
      </div>

      {/* The Menu Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-4xl w-full">
        
        {/* Card 1: Link to Auditions (The page you were redirecting to) */}
        <a 
          href="/auditions" 
          className="group block p-6 bg-zinc-900 rounded-xl border border-zinc-800 hover:border-blue-500 hover:bg-zinc-800/50 transition-all duration-200"
        >
          <div className="mb-4 p-3 bg-blue-500/10 w-fit rounded-lg text-blue-400 group-hover:text-blue-300">
            <Users size={24} />
          </div>
          <h2 className="text-xl font-bold mb-2 group-hover:text-blue-400">Casting & Auditions</h2>
          <p className="text-zinc-500 text-sm">Process audition forms, manage callbacks, and build the cast list.</p>
        </a>

        {/* Card 2: Placeholder for future tools */}
        <div className="p-6 bg-zinc-900/40 rounded-xl border border-zinc-800/50 opacity-60 cursor-not-allowed">
          <div className="mb-4 p-3 bg-zinc-700/20 w-fit rounded-lg text-zinc-600">
            <ClipboardList size={24} />
          </div>
          <h2 className="text-xl font-bold mb-2 text-zinc-600">Stage Management</h2>
          <p className="text-zinc-600 text-sm">Reports and attendance tracking. (Coming Phase 2)</p>
        </div>

      </div>
    </div>
  );
}