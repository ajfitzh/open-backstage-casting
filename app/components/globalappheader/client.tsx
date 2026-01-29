"use client";

import { useState, useRef, useEffect, useMemo } from 'react';
import { useFormStatus } from 'react-dom';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { signOut } from "next-auth/react";
import { switchProduction } from '@/app/actions';
import { 
  Menu, X, ChevronRight, ChevronsUpDown, Calendar, Users, 
  UserSquare2, AlertOctagon, BarChart3, Settings, LogOut, 
  Check, Sparkles, LayoutGrid, Mic2, Megaphone, 
  Theater, GraduationCap, Home, Archive, Clock,
  Bug, Wrench, UserCircle2, Rocket
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

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (navRef.current && !navRef.current.contains(event.target as Node)) setIsNavOpen(false);
      if (contextRef.current && !contextRef.current.contains(event.target as Node)) setIsContextOpen(false);
      if (profileRef.current && !profileRef.current.contains(event.target as Node)) setIsProfileOpen(false);
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // --- DYNAMIC DATA GROUPING (Engineering the "Zero-Touch" Logic) ---
  const groupedData = useMemo(() => {
    const active: Record<string, any[]> = {};
    const upcoming: Record<string, any[]> = {};
    const archive: Record<string, any[]> = {};
    const allSeasons = new Set<string>();

    shows.forEach(show => {
      const season = show.season || 'Other';
      allSeasons.add(season);

      // Check for Active flag first
      if (show.isActive) {
        if (!active[season]) active[season] = [];
        active[season].push(show);
      } 
      // Then check if it is explicitly marked as Upcoming
      else if (show.status === 'Upcoming' || show.status === 'Pre-Production') {
        if (!upcoming[season]) upcoming[season] = [];
        upcoming[season].push(show);
      } 
      // Everything else (Archived) goes to the history bins
      else {
        if (!archive[season]) archive[season] = [];
        archive[season].push(show);
      }
    });

    const seasons = Array.from(allSeasons).sort((a, b) => b.localeCompare(a, undefined, { numeric: true }));
    return { active, upcoming, archive, seasons };
  }, [shows]);

  const activeShow = shows.find(s => s.id === activeId) || shows[0] || { title: "Select Production" };
  const userInitials = user?.name 
    ? user.name.split(' ').map((n:string) => n[0]).join('').substring(0,2).toUpperCase() 
    : "??";

  return (
    <>
      <header className="h-16 bg-zinc-950 border-b border-zinc-800 flex items-center justify-between px-4 shrink-0 relative z-50">
        
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
              <div className="absolute top-full left-0 mt-2 w-80 bg-zinc-900 border border-zinc-700 rounded-xl shadow-2xl overflow-hidden z-50 flex flex-col max-h-[75vh] animate-in fade-in slide-in-from-top-2">
                {/* TAB TOGGLE */}
                <div className="bg-zinc-950/80 p-3 border-b border-white/5 grid grid-cols-2 gap-2">
                   <button onClick={() => setViewMode('current')} className={`py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${viewMode === 'current' ? 'bg-emerald-600 text-white shadow-lg' : 'bg-zinc-800 text-zinc-500'}`}>Current</button>
                   <button onClick={() => setViewMode('archive')} className={`py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${viewMode === 'archive' ? 'bg-blue-600 text-white shadow-lg' : 'bg-zinc-800 text-zinc-500'}`}>History</button>
                </div>

                <div className="p-2 overflow-y-auto flex-1 space-y-4 custom-scrollbar">
                  {/* TAB: CURRENT (Includes Active & Upcoming) */}
                  {viewMode === 'current' && (
                    <div className="space-y-6">
                      {groupedData.seasons.map(season => {
                        const hasActive = groupedData.active[season]?.length > 0;
                        const hasUpcoming = groupedData.upcoming[season]?.length > 0;

                        if (!hasActive && !hasUpcoming) return null;

                        return (
                          <div key={season} className="space-y-3">
                            <div className="px-3 py-1.5 text-[9px] font-black text-zinc-400 uppercase tracking-widest bg-zinc-950/50 border border-white/5 rounded-md">
                              Season {season}
                            </div>
                            
                            {/* ACTIVE SUB-SECTION */}
                            {hasActive && (
                              <div className="space-y-1">
                                <div className="px-3 flex items-center gap-2 text-[8px] font-bold text-emerald-500 uppercase tracking-tighter">
                                  <Clock size={10} /> Now Playing
                                </div>
                                {groupedData.active[season].map(prod => (
                                  <ProductionItem key={prod.id} prod={prod} activeId={activeId} pathname={pathname} />
                                ))}
                              </div>
                            )}

                            {/* UPCOMING SUB-SECTION */}
                            {hasUpcoming && (
                              <div className="space-y-1">
                                <div className="px-3 flex items-center gap-2 text-[8px] font-bold text-amber-500 uppercase tracking-tighter">
                                  <Rocket size={10} /> Pre-Production
                                </div>
                                {groupedData.upcoming[season].map(prod => (
                                  <ProductionItem key={prod.id} prod={prod} activeId={activeId} pathname={pathname} />
                                ))}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {/* TAB: HISTORY (Archived only) */}
                  {viewMode === 'archive' && (
                    <div className="space-y-2">
                      {groupedData.seasons.map(season => (
                        groupedData.archive[season] && (
                          <details key={season} className="group">
                            <summary className="flex items-center justify-between px-3 py-2 text-[10px] font-black text-zinc-500 uppercase tracking-widest bg-zinc-950/50 rounded-lg cursor-pointer hover:bg-zinc-800 transition-colors list-none">
                              <div className="flex items-center gap-2"><Calendar size={12} /><span>{season}</span></div>
                              <ChevronRight size={12} className="group-open:rotate-90 transition-transform duration-200" />
                            </summary>
                            <div className="pt-2 pl-2 space-y-1">
                              {groupedData.archive[season].map(prod => (
                                <ProductionItem key={prod.id} prod={prod} activeId={activeId} pathname={pathname} />
                              ))}
                            </div>
                          </details>
                        )
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="flex items-center gap-4">
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
                {user?.image ? <img alt="profile image" src={user.image} className="w-full h-full object-cover" /> : userInitials}
              </div>
            </button>

            {isProfileOpen && (
              <div className="absolute top-full right-0 mt-2 w-48 bg-zinc-900 border border-zinc-700 rounded-xl shadow-2xl overflow-hidden z-50 animate-in fade-in slide-in-from-top-2">
                <div className="p-3 border-b border-white/5 bg-zinc-950/50">
                  <p className="text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-1">Session</p>
                  <p className="text-xs font-bold text-white truncate">{user?.email || "Guest Mode"}</p>
                </div>
                <div className="p-1">
                  <Link href="/settings" className="flex items-center gap-2 w-full p-2 text-xs font-bold text-zinc-400 hover:bg-zinc-800 hover:text-white rounded-lg transition-colors">
                    <Settings size={14} /> Settings
                  </Link>
                  <button 
                    onClick={() => signOut({ callbackUrl: "/login" })}
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

      {/* DEBUG OVERLAY */}
      {showDebug && (
        <div className="fixed bottom-4 right-4 w-96 max-h-[80vh] bg-black/90 border-2 border-amber-500/50 rounded-2xl shadow-2xl z-[9999] flex flex-col overflow-hidden backdrop-blur-xl animate-in zoom-in-95">
          <div className="p-3 bg-amber-500 text-black font-black text-[10px] uppercase tracking-[0.2em] flex justify-between items-center">
             <div className="flex items-center gap-2"><Bug size={14}/> Baserow Data Stream</div>
             <button onClick={() => setShowDebug(false)}><X size={14}/></button>
          </div>
          <div className="p-4 overflow-y-auto space-y-4 custom-scrollbar font-mono text-[10px] text-amber-500">
             <div className="grid grid-cols-2 gap-2">
               <div className="p-2 bg-zinc-900 rounded">Total Records: {shows.length}</div>
             </div>
             <div>
                <p className="mb-2 border-b border-amber-500/20 pb-1 font-black italic">ACTIVE / UPCOMING MAP:</p>
                {shows.filter(s => s.isActive || s.status === 'Upcoming').map(s => (
                  <div key={s.id} className="mb-2 p-2 bg-white/5 rounded border border-white/5">
                    <p className="text-white font-bold">{s.title || "--- NO TITLE ---"}</p>
                    <p>Status: {s.status} | Active: {String(s.isActive)}</p>
                  </div>
                ))}
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
      className={`flex items-center gap-4 px-3 py-3 rounded-xl transition-all ${active ? 'bg-emerald-600 text-white shadow-lg' : 'text-zinc-400 hover:bg-zinc-800 hover:text-white'}`}
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
  
  return (
    <button
      disabled={pending}
      className={`w-full flex items-start gap-3 p-2 rounded-lg transition-all text-left group relative overflow-hidden ${isActive ? 'bg-zinc-800 ring-1 ring-zinc-600' : 'hover:bg-zinc-800/50'}`}
    >
      {isActive && <div className="absolute left-0 top-0 bottom-0 w-1 bg-emerald-500" />}
      <div className={`w-1.5 h-1.5 rounded-full ${dotColor} mt-1.5 shrink-0 ${isActive ? 'ml-1' : ''}`} />
      <div className="flex-1 min-w-0">
        <div className={`text-xs truncate ${isActive ? 'text-white font-bold' : 'text-zinc-300 group-hover:text-white'}`}>
          {prod.title}
        </div>
        <div className="flex items-center gap-1.5 text-[9px] font-bold text-zinc-600 uppercase tracking-tight mt-0.5">
          <span>{prod.location || "Unknown"}</span>
          <span className="opacity-50">•</span>
          <span className={prod.status === 'Upcoming' ? 'text-amber-500/70' : ''}>{prod.status || "Show"}</span>
        </div>
      </div>
      <div className="mt-0.5">
        {isActive && !pending && <Check size={12} className="text-emerald-500" />}
        {pending && <Sparkles size={12} className="text-emerald-500 animate-spin" />}
      </div>
    </button>
  );
}