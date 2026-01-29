"use client";

import { 
  Drama, 
  MapPin, 
  ChevronDown, 
  Settings, 
  LogOut, 
  Monitor
} from 'lucide-react';
import Link from 'next/link';
import { useState, useRef, useEffect } from 'react';
import { switchProduction } from '@/app/actions';
import { signOut } from "next-auth/react"; // Standard NextAuth logout

export default function GlobalHeaderClient({ shows, activeId, user }: { shows: any[], activeId: number, user: any }) {
  // State for both dropdowns
  const [isProdMenuOpen, setIsProdMenuOpen] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  
  const activeShow = shows.find(s => s.id === activeId) || shows[0];
  
  // Refs for click-outside detection
  const prodMenuRef = useRef<HTMLDivElement>(null);
  const userMenuRef = useRef<HTMLDivElement>(null);

  // Close menus when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (prodMenuRef.current && !prodMenuRef.current.contains(event.target as Node)) {
        setIsProdMenuOpen(false);
      }
      if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
        setIsUserMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <header className="flex h-16 shrink-0 items-center gap-2 border-b border-white/5 bg-zinc-900/50 px-6 backdrop-blur-xl">
      
      {/* LEFT: Logo & Production Switcher */}
      <div className="flex items-center gap-4">
        <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-400">
          <Drama className="size-5" />
        </div>
        
        <div className="h-6 w-px bg-white/10" />

        <div className="relative" ref={prodMenuRef}>
          <button 
            onClick={() => setIsProdMenuOpen(!isProdMenuOpen)}
            className="flex items-center gap-2 rounded-lg px-2 py-1 text-sm font-medium hover:bg-white/5 transition-colors"
          >
            <span className="font-bold text-white tracking-tight">{activeShow?.title || 'Select Production'}</span>
            <ChevronDown className={`size-4 text-zinc-500 transition-transform duration-200 ${isProdMenuOpen ? 'rotate-180' : ''}`} />
          </button>

          {isProdMenuOpen && (
            <div className="absolute top-full left-0 mt-2 w-64 rounded-xl border border-white/10 bg-zinc-900 p-2 shadow-2xl z-50 animate-in fade-in zoom-in-95 duration-100">
              <div className="mb-2 px-2 py-1.5 text-xs font-bold uppercase text-zinc-500 tracking-widest">
                Active Productions
              </div>
              {shows.map((show) => (
                <form key={show.id} action={switchProduction}>
                  <input type="hidden" name="productionId" value={show.id} />
                  <button 
                    className={`w-full flex flex-col items-start gap-0.5 rounded-lg px-3 py-2 text-sm transition-colors
                      ${activeId === show.id 
                        ? 'bg-emerald-500/10 text-emerald-400' 
                        : 'text-zinc-400 hover:bg-white/5 hover:text-zinc-100'
                      }`}
                  >
                    <span className="font-bold">{show.title}</span>
                    <span className="flex items-center gap-1 text-[10px] uppercase tracking-wide opacity-80">
                      <MapPin className="size-3" /> {show.location}
                    </span>
                  </button>
                </form>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* RIGHT: User Avatar Menu */}
      <div className="ml-auto flex items-center gap-4">
        
        {user ? (
          <div className="relative" ref={userMenuRef}>
            <button 
              onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
              className="group flex items-center gap-3 pl-2 pr-1 py-1 rounded-full hover:bg-white/5 transition-all border border-transparent hover:border-white/5"
            >
              {/* Name and Role (Hidden on mobile to save space) */}
              <div className="text-right hidden sm:block">
                <div className="text-xs font-bold text-white leading-none mb-1">{user.name}</div>
                <div className="text-[10px] font-medium text-zinc-500 leading-none">{user.role}</div>
              </div>
              
              {/* Avatar Circle */}
              <div className="size-8 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-xs font-black text-white shadow-lg shadow-indigo-500/20 ring-2 ring-transparent group-hover:ring-white/10 transition-all">
                {user.initials}
              </div>
            </button>

            {/* Dropdown Menu */}
            {isUserMenuOpen && (
              <div className="absolute top-full right-0 mt-2 w-56 rounded-xl border border-white/10 bg-zinc-900 p-1 shadow-2xl z-50 animate-in fade-in zoom-in-95 duration-100">
                
                {/* Mobile-only header info */}
                <div className="sm:hidden px-3 py-2 border-b border-white/5 mb-1">
                  <div className="font-bold text-white">{user.name}</div>
                  <div className="text-xs text-zinc-500">{user.role}</div>
                </div>

                <Link 
                  href="/settings" 
                  className="flex items-center gap-3 px-3 py-2 text-sm font-medium text-zinc-300 hover:text-white hover:bg-white/5 rounded-lg transition-colors"
                  onClick={() => setIsUserMenuOpen(false)}
                >
                  <Settings className="size-4" />
                  Settings
                </Link>
                
                <button className="w-full flex items-center gap-3 px-3 py-2 text-sm font-medium text-zinc-300 hover:text-white hover:bg-white/5 rounded-lg transition-colors text-left">
                  <Monitor className="size-4" />
                  Display
                </button>

                <div className="h-px bg-white/5 my-1" />
                
                <button 
                  onClick={() => signOut()}
                  className="w-full flex items-center gap-3 px-3 py-2 text-sm font-medium text-red-400 hover:bg-red-500/10 rounded-lg transition-colors text-left"
                >
                  <LogOut className="size-4" />
                  Sign Out
                </button>
              </div>
            )}
          </div>
        ) : (
          /* Fallback Login Button if no user found */
          <Link href="/api/auth/signin" className="px-4 py-2 bg-white text-black text-xs font-bold rounded-lg hover:bg-zinc-200 transition-colors">
            Log In
          </Link>
        )}
      </div>
    </header>
  );
}