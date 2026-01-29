"use client";

import { useState, useRef, useEffect, useMemo } from 'react';
import { useFormStatus } from 'react-dom';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { signOut } from "next-auth/react"; // Add this for the logout button
import { switchProduction } from '@/app/actions';
import { 
  Menu, X, ChevronRight, ChevronsUpDown, Calendar, Users, 
  UserSquare2, AlertOctagon, BarChart3, Settings, LogOut, 
  Check, Sparkles, LayoutGrid, Mic2, Megaphone, 
  Theater, GraduationCap, Home, Archive, Clock,
  Bug, Wrench, UserCircle2
} from 'lucide-react';

export default function GlobalHeaderClient({ 
  shows, 
  activeId, 
  user 
}: { 
  shows: any[], 
  activeId: number, 
  user?: any 
}) {
  const [isNavOpen, setIsNavOpen] = useState(false);
  const [isContextOpen, setIsContextOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [viewMode, setViewMode] = useState<'current' | 'archive'>('current');
  const [showDebug, setShowDebug] = useState(false);

  const navRef = useRef<HTMLDivElement>(null);
  const contextRef = useRef<HTMLDivElement>(null);
  const profileRef = useRef<HTMLDivElement>(null);
  const pathname = usePathname();

  // Close menus on click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (navRef.current && !navRef.current.contains(event.target as Node)) setIsNavOpen(false);
      if (contextRef.current && !contextRef.current.contains(event.target as Node)) setIsContextOpen(false);
      if (profileRef.current && !profileRef.current.contains(event.target as Node)) setIsProfileOpen(false);
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // --- DATA LOGIC ---
  const activeShow = shows.find(s => s.id === activeId) || shows[0] || { title: "Select Production" };
  
  const userInitials = user?.name 
    ? user.name.split(' ').map((n:string) => n[0]).join('').substring(0,2).toUpperCase() 
    : "??";

  // 1. Grouping
  const groupedData = useMemo(() => {
    const groups: Record<string, typeof shows> = {};
    shows.forEach(show => {
      const season = show.season || 'Other';
      if (!groups[season]) groups[season] = [];
      groups[season].push(show);
    });
    const seasons = Object.keys(groups).sort((a, b) => b.localeCompare(a, undefined, { numeric: true }));
    return { groups, seasons };
  }, [shows]);

  // 2. "Current" vs "Archive" Logic
  // NEW: Instead of just picking the first season, we explicitly find all shows where isActive is true
  const currentShows = useMemo(() => shows.filter(s => s.isActive), [shows]);
  const currentSeasonLabel = currentShows[0]?.season || groupedData.seasons[0] || "Active";
  const archiveSeasons = groupedData.seasons.filter(s => s !== currentSeasonLabel);

  return (
    <>
      <header className="h-16 bg-zinc-950 border-b border-zinc-800 flex items-center justify-between px-4 shrink-0 relative z-50">
        
        {/* LEFT: NAV & CONTEXT */}
        <div className="flex items-center gap-4">
          <button onClick={() => setIsNavOpen(!isNavOpen)} className="p-2 -ml-2 rounded-full hover:bg-zinc-800 text-zinc-400 md:hidden">
            {isNavOpen ? <X size={24} /> : <Menu size={24} />}
          </button>

          <div className="relative" ref={contextRef}>
            <button 
              onClick={() => setIsContextOpen(!isContextOpen)}
              className={`flex flex-col items-start p-2 rounded-lg transition-all ${isContextOpen ? 'bg-zinc-900' : 'hover:bg-zinc-900/50'}`}
            >
              <span className="text-[10px] font-black text-zinc-600 uppercase tracking-widest">Production Context</span>
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold text-white">{activeShow.title}</span>
                <ChevronsUpDown size={12} className="text-zinc-600"/>
              </div>
            </button>

            {isContextOpen && (
              <div className="absolute top-full left-0 mt-2 w-80 bg-zinc-900 border border-zinc-700 rounded-xl shadow-2xl overflow-hidden z-50 flex flex-col max-h-[70vh] animate-in fade-in slide-in-from-top-2">
                <div className="bg-zinc-950/80 p-3 border-b border-white/5 grid grid-cols-2 gap-2">
                   <button onClick={() => setViewMode('current')} className={`py-2 rounded-lg text-[10px] font-black uppercase tracking-widest ${viewMode === 'current' ? 'bg-emerald-600 text-white' : 'bg-zinc-800 text-zinc-500'}`}>Current</button>
                   <button onClick={() => setViewMode('archive')} className={`py-2 rounded-lg text-[10px] font-black uppercase tracking-widest ${viewMode === 'archive' ? 'bg-blue-600 text-white' : 'bg-zinc-800 text-zinc-500'}`}>History</button>
                </div>

                <div className="p-2 overflow-y-auto flex-1">
                  {viewMode === 'current' && (
                    <div className="space-y-1">
                      <div className="px-3 py-1 mb-2 text-[9px] font-black text-emerald-500 uppercase tracking-widest flex items-center gap-2">
                         <Clock size={10} /> Active Production Cycle
                      </div>
                      {currentShows.length > 0 ? (
                        currentShows.map(prod => <ProductionItem key={prod.id} prod={prod} activeId={activeId} pathname={pathname} />)
                      ) : (
                        <p className="p-8 text-center text-xs text-zinc-600 italic">No shows are currently marked "Active" in Baserow.</p>
                      )}
                    </div>
                  )}

                  {viewMode === 'archive' && (
                    <div className="space-y-2">
                      {archiveSeasons.map(season => (
                        <details key={season} className="group">
                           <summary className="flex items-center justify-between px-3 py-2 text-[10px] font-black text-zinc-500 uppercase tracking-widest bg-zinc-950/50 rounded-lg cursor-pointer hover:bg-zinc-800 list-none">
                             <div className="flex items-center gap-2"><Calendar size={12} /><span>{season}</span></div>
                             <ChevronRight size={12} className="group-open:rotate-90 transition-transform" />
                           </summary>
                           <div className="pt-2 pl-2 space-y-1">
                             {groupedData.groups[season].map(prod => <ProductionItem key={prod.id} prod={prod} activeId={activeId} pathname={pathname} />)}
                           </div>
                        </details>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* RIGHT: DEBUG & USER */}
        <div className="flex items-center gap-4">
          {/* PERMANENT DEBUG WRENCH */}
          <button 
            onClick={() => setShowDebug(!showDebug)}
            className={`p-2 rounded-full transition-colors ${showDebug ? 'bg-amber-500/20 text-amber-500' : 'text-zinc-700 hover:text-zinc-400'}`}
          >
            <Wrench size={18} />
          </button>

          <div className="relative" ref={profileRef}>
            <button 
              onClick={() => setIsProfileOpen(!isProfileOpen)}
              className="flex items-center gap-3 group"
            >
              <div className="hidden md:flex flex-col items-end leading-tight">
                <span className="text-xs font-semibold text-zinc-200 group-hover:text-white transition-colors">{user?.name || "Sign In"}</span>
                <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-tighter">{user?.role || "Guest"}</span>
              </div>
              <div className="w-9 h-9 rounded-full bg-zinc-800 border border-zinc-700 flex items-center justify-center text-xs font-bold text-zinc-400 shadow-xl group-hover:border-emerald-500/50 transition-all overflow-hidden">
                {user?.image ? <img src={user.image} className="w-full h-full object-cover" /> : userInitials}
              </div>
            </button>

            {isProfileOpen && (
              <div className="absolute top-full right-0 mt-2 w-48 bg-zinc-900 border border-zinc-700 rounded-xl shadow-2xl overflow-hidden z-50 animate-in fade-in slide-in-from-top-2">
                <div className="p-3 border-b border-white/5">
                  <p className="text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-1">Signed in as</p>
                  <p className="text-xs font-bold text-white truncate">{user?.email || "Guest Account"}</p>
                </div>
                <div className="p-1">
                  <Link href="/settings" className="flex items-center gap-2 w-full p-2 text-xs font-bold text-zinc-400 hover:bg-zinc-800 hover:text-white rounded-lg transition-colors">
                    <Settings size={14} /> Settings
                  </Link>
                  <button 
                    onClick={() => signOut()}
                    className="flex items-center gap-2 w-full p-2 text-xs font-bold text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
                  >
                    <LogOut size={14} /> Sign Out
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* FLOATING DEBUG CONSOLE */}
      {showDebug && (
        <div className="fixed bottom-4 right-4 w-96 max-h-[80vh] bg-black/90 border-2 border-amber-500/50 rounded-2xl shadow-2xl z-[9999] flex flex-col overflow-hidden backdrop-blur-xl animate-in zoom-in-95">
          <div className="p-3 bg-amber-500 text-black font-black text-[10px] uppercase tracking-[0.2em] flex justify-between items-center">
             <div className="flex items-center gap-2"><Bug size={14}/> Baserow Data Stream</div>
             <button onClick={() => setShowDebug(false)}><X size={14}/></button>
          </div>
          <div className="p-4 overflow-y-auto space-y-4 custom-scrollbar font-mono text-[10px] text-amber-500">
             <div className="grid grid-cols-2 gap-2">
               <div className="p-2 bg-zinc-900 rounded">Total Records: {shows.length}</div>
               <div className="p-2 bg-zinc-900 rounded text-emerald-500">Active Found: {currentShows.length}</div>
             </div>
             <div>
                <p className="mb-2 border-b border-amber-500/20 pb-1 font-black">ACTIVE SHOWS IN MEMORY:</p>
                {currentShows.map(s => (
                  <div key={s.id} className="mb-2 p-2 bg-white/5 rounded border border-white/5">
                    <p className="text-white font-bold">{s.title || "--- NO TITLE ---"}</p>
                    <p>ID: {s.id} | Season: {s.season}</p>
                    <p>isActive: {String(s.isActive)}</p>
                  </div>
                ))}
             </div>
             <div>
                <p className="mb-2 border-b border-amber-500/20 pb-1 font-black">RAW FIRST RECORD KEYS:</p>
                <pre className="text-[8px] opacity-70">{shows[0] ? JSON.stringify(Object.keys(shows[0]), null, 2) : "No data"}</pre>
             </div>
          </div>
        </div>
      )}
    </>
  );
}
// --- SUB COMPONENTS ---

function ProductionItem({ prod, activeId, pathname }: { prod: any, activeId: number, pathname: string }) {
  return (
    <form action={switchProduction}>
      <input type="hidden" name="productionId" value={prod.id} />
      <input type="hidden" name="redirectPath" value={pathname} />
      <ContextButton prod={prod} isActive={prod.id === activeId} />
    </form>
  )
}

function SectionHeader({ label }: { label: string }) {
  return <div className="px-3 mb-2 text-[10px] font-black text-zinc-600 uppercase tracking-widest">{label}</div>
}

function MenuLink({ href, icon, label, active, onClick }: any) {
  return (
    <Link 
      href={href} 
      onClick={onClick}
      className={`
        flex items-center gap-4 px-3 py-3 rounded-xl transition-all
        ${active ? 'bg-emerald-600 text-white shadow-lg' : 'text-zinc-400 hover:bg-zinc-800 hover:text-white'}
      `}
    >
      {icon}
      <span className="font-bold text-sm">{label}</span>
      {active && <ChevronRight size={14} className="ml-auto opacity-50"/>}
    </Link>
  )
}

function ContextButton({ prod, isActive }: { prod: any, isActive: boolean }) {
  const { pending } = useFormStatus();
  let dotColor = 'bg-zinc-500';
  const loc = (prod.location || "").toLowerCase();
  if (loc.includes('fred')) dotColor = 'bg-emerald-500'; 
  if (loc.includes('stafford')) dotColor = 'bg-amber-500'; 
  if (loc.includes('nova')) dotColor = 'bg-indigo-500';
  if (loc.includes('spotsy')) dotColor = 'bg-blue-500';

  return (
    <button
      disabled={pending}
      className={`
        w-full flex items-start gap-3 p-2 rounded-lg transition-all text-left group relative overflow-hidden
        ${isActive ? 'bg-zinc-800 ring-1 ring-zinc-600' : 'hover:bg-zinc-800/50'}
      `}
    >
      {isActive && <div className="absolute left-0 top-0 bottom-0 w-1 bg-emerald-500" />}
      <div className={`w-1.5 h-1.5 rounded-full ${dotColor} mt-1.5 shrink-0 ${isActive ? 'ml-1' : ''}`} />
      <div className="flex-1 min-w-0">
        <div className={`text-xs truncate ${isActive ? 'text-white font-bold' : 'text-zinc-300 group-hover:text-white'}`}>
          {prod.title}
        </div>
        <div className="flex items-center gap-1.5 text-[9px] font-bold text-zinc-600 uppercase tracking-tight mt-0.5 group-hover:text-zinc-500">
          <span>{prod.location || "Unknown"}</span>
          <span className="opacity-50">•</span>
          <span>{prod.type || "Show"}</span>
        </div>
      </div>
      <div className="mt-0.5">
        {isActive && !pending && <Check size={12} className="text-emerald-500" />}
        {pending && <Sparkles size={12} className="text-emerald-500 animate-spin" />}
      </div>
    </button>
  );
}