"use client";
import Link from 'next/link';
import { LayoutGrid, LogOut } from 'lucide-react'; // LayoutGrid looks like the "App" button

export default function GlobalHeader() {
  return (
    <header className="h-14 bg-zinc-950 border-b border-white/10 flex items-center justify-between px-4 shrink-0">
      
      {/* LEFT: App Switcher */}
      <div className="flex items-center gap-4">
        <Link 
            href="/" 
            className="flex items-center gap-2 text-zinc-400 hover:text-white transition-colors"
            title="Back to Hub"
        >
            <LayoutGrid size={20} />
            <span className="font-bold text-sm uppercase tracking-wider hidden sm:block">CYT Hub</span>
        </Link>

        {/* Vertical Divider */}
        <div className="h-4 w-px bg-white/10 mx-2" />

        {/* Current Context (Optional - could hook into your Show Context) */}
        <span className="text-zinc-500 text-xs font-mono truncate max-w-[200px]">
            Wizard of Oz (2026)
        </span>
      </div>

      {/* RIGHT: User & Logout */}
      <div className="flex items-center gap-4">
        {/* You can add a user avatar here later */}
        <div className="h-8 w-8 rounded-full bg-blue-600/20 flex items-center justify-center text-blue-400 text-xs font-bold border border-blue-600/30">
            AF
        </div>
        
        <button 
            onClick={() => {
                localStorage.clear();
                window.location.href = "/login";
            }}
            className="text-zinc-500 hover:text-red-400 transition-colors"
            title="Logout"
        >
            <LogOut size={18} />
        </button>
      </div>

    </header>
  );
}