"use client";

import { useState, useRef, useEffect, useMemo } from 'react';
import { useFormStatus } from 'react-dom';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { signOut } from "next-auth/react";
import { switchProduction } from '@/app/actions';
import { useSimulation } from '@/app/context/SimulationContext'; 
import { 
  Menu, X, ChevronRight, ChevronsUpDown, Calendar, 
  Check, Sparkles, Archive, Clock, Rocket, Bug, Wrench, Settings, LogOut,
  Theater, UserSquare2, AlertOctagon, BarChart3, GraduationCap, LayoutGrid, Mic2, Megaphone,
  User2Icon
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

  // 🚀 CONNECT TO THE MATRIX
  const { role: effectiveRole, isSimulating } = useSimulation();

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

  // --- DYNAMIC DATA BUCKETING ---
  const groupedData = useMemo(() => {
    const active: Record<string, any[]> = {};
    const upcoming: Record<string, any[]> = {};
    const archive: Record<string, any[]> = {};
    const allSeasons = new Set<string>();

    shows.forEach(show => {
      const season = show.season || 'Other';
      allSeasons.add(season);

      // Prioritize explicit Active flag
      if (show.isActive) {
        if (!active[season]) active[season] = [];
        active[season].push(show);
      } 
      // Then check for Upcoming/Pre-Production status
      else if (show.status === 'Upcoming' || show.status === 'Pre-Production') {
        if (!upcoming[season]) upcoming[season] = [];
        upcoming[season].push(show);
      } 
      // Everything else belongs in the history bin
      else {
        if (!archive[season]) archive[season] = [];
        archive[season].push(show);
      }
    });

    const seasons = Array.from(allSeasons).sort((a, b) => 
      b.localeCompare(a, undefined, { numeric: true })
    );

    return { active, upcoming, archive, seasons };
  }, [shows]);

  const activeShow = shows.find(s => s.id === activeId) || shows[0] || { title: "Select Production", location: "Unknown" };
  const userInitials = user?.name 
    ? user.name.split(' ').map((n:string) => n[0]).join('').substring(0,2).toUpperCase() 
    : "??";

  return (
    <>
      <header className="h-16 bg-zinc-950 border-b border-zinc-800 flex items-center justify-between px-4 shrink-0 relative z-50">
        
        {/* LEFT: NAV & CONTEXT */}
        <div className="flex items-center gap-4">
          <button onClick={() => setIsNavOpen(!isNavOpen)} className="p-2 -ml-2 text-zinc-400 md:hidden">
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
                
                {/* TABS */}
                <div className="bg-zinc-950/80 p-3 border-b border-white/5 grid grid-cols-2 gap-2">
                   <button 
                     onClick={() => setViewMode('current')} 
                     className={`py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${viewMode === 'current' ? 'bg-emerald-600 text-white shadow-lg' : 'bg-zinc-800 text-zinc-500'}`}
                   >
                     Current
                   </button>
                   <button 
                     onClick={() => setViewMode('archive')} 
                     className={`py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${viewMode === 'archive' ? 'bg-blue-600 text-white shadow-lg' : 'bg-zinc-800 text-zinc-500'}`}
                   >
                     History
                   </button>
                </div>

                <div className="p-2 overflow-y-auto flex-1 custom-scrollbar">
                  {/* TAB: CURRENT (Active & Upcoming) */}
                  {viewMode === 'current' && (
                    <div className="space-y-6">
                      {groupedData.seasons.map(season => {
                        const hasActive = groupedData.active[season]?.length > 0;
                        const hasUpcoming = groupedData.upcoming[season]?.length > 0;

                        if (!hasActive && !hasUpcoming) return null;

                        return (
                          <div key={season} className="space-y-3">
                            <div className="px-3 py-1 text-[9px] font-black text-zinc-500 uppercase tracking-widest bg-zinc-950/50 rounded">
                              Season {season}
                            </div>
                            
                            {hasActive && (
                              <div className="space-y-1">
                                <div className="px-3 flex items-center gap-2 text-[8px] font-bold text-emerald-500 uppercase italic">
                                  <Clock size={10} /> Now Playing
                                </div>
                                {groupedData.active[season].map(prod => (
                                  <ProductionItem key={prod.id} prod={prod} activeId={activeId} pathname={pathname} />
                                ))}
                              </div>
                            )}

                            {hasUpcoming && (
                              <div className="space-y-1">
                                <div className="px-3 flex items-center gap-2 text-[8px] font-bold text-amber-500 uppercase italic">
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

                  {/* TAB: HISTORY (Archived) */}
                  {viewMode === 'archive' && (
                    <div className="space-y-2">
                      {groupedData.seasons.map(season => (
                        groupedData.archive[season] && (
                          <details key={season} className="group">
                            <summary className="flex items-center justify-between px-3 py-2 text-[10px] font-black text-zinc-500 uppercase bg-zinc-950/50 rounded-lg cursor-pointer hover:bg-zinc-800 list-none">
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

        {/* RIGHT: TOOLS & PROFILE */}
        <div className="flex items-center gap-4">
          <button 
            onClick={() => setShowDebug(!showDebug)} 
            className={`p-2 rounded-full transition-all ${showDebug ? 'text-amber-500 bg-amber-500/10' : 'text-zinc-700 hover:text-zinc-400'}`}
          >
            <Wrench size={18} />
          </button>
          
          <div className="relative" ref={profileRef}>
            <button onClick={() => setIsProfileOpen(!isProfileOpen)} className="flex items-center gap-3 group">
              <div className="hidden md:flex flex-col items-end leading-tight text-right">
                <span className="text-xs font-bold text-zinc-200 group-hover:text-white transition-colors">{user?.name || "Sign In"}</span>
                
                {/* 🚨 FIX: USE DYNAMIC ROLE FROM CONTEXT */}
                <span className={`text-[10px] font-black uppercase tracking-tighter ${isSimulating ? 'text-red-500 animate-pulse' : 'text-zinc-500'}`}>
                    {effectiveRole || "Guest"}
                </span>

              </div>
              <div className={`w-8 h-8 rounded-full bg-zinc-800 border flex items-center justify-center text-xs font-bold text-zinc-400 group-hover:border-emerald-500/50 transition-all ${isSimulating ? 'border-red-500/50 ring-2 ring-red-500/20' : 'border-zinc-700'}`}>
                {user?.image ? <img src={user.image} alt="User Avatar" className="w-full h-full rounded-full object-cover" /> : userInitials}
              </div>
            </button>

            {isProfileOpen && (
              <div className="absolute top-full right-0 mt-2 w-48 bg-zinc-900 border border-zinc-700 rounded-xl shadow-2xl p-1 z-50 animate-in fade-in slide-in-from-top-2">
                <div className="px-3 py-2 border-b border-white/5 bg-zinc-950/50 rounded-t-lg mb-1">
                  <p className="text-[9px] font-black text-zinc-500 uppercase tracking-widest mb-0.5">Session Account</p>
                  <p className="text-[11px] font-bold text-white truncate">{user?.email || "No email linked"}</p>
                </div>
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
            )}
          </div>
        </div>
      </header>

      {/* MOBILE NAV DRAWER */}
      {isNavOpen && (
        <div className="fixed inset-0 z-[100] flex md:hidden">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setIsNavOpen(false)} />
          <div ref={navRef} className="relative w-72 bg-zinc-900 h-full border-r border-zinc-800 shadow-2xl flex flex-col animate-in slide-in-from-left duration-300">
            <div className="flex-1 overflow-y-auto p-4 space-y-6 pt-10">
              
              <SectionHeader label="Workspace" />
              <div className="space-y-1">
                <MenuLink onClick={() => setIsNavOpen(false)} href="/schedule" icon={<Calendar size={18}/>} label="Scheduler" active={pathname === '/schedule'} />
                <MenuLink onClick={() => setIsNavOpen(false)} href="/auditions" icon={<Mic2 size={18}/>} label="Auditions" active={pathname === '/auditions'} />
                <MenuLink onClick={() => setIsNavOpen(false)} href="/casting" icon={<LayoutGrid size={18}/>} label="Cast Grid" active={pathname === '/casting'} />
              </div>

              <SectionHeader label="Company" />
              <div className="space-y-1">
                <MenuLink onClick={() => setIsNavOpen(false)} href="/roster" icon={<UserSquare2 size={18}/>} label="Roster" active={pathname === '/roster'} />
                <MenuLink onClick={() => setIsNavOpen(false)} href="/reports" icon={<BarChart3 size={18}/>} label="Analytics" active={pathname === '/reports'} />
              </div>

              {/* 🟢 NEW ACADEMY SECTION */}
              <SectionHeader label="Academy" />
              <div className="space-y-1">
                <MenuLink onClick={() => setIsNavOpen(false)} href="/education" icon={<GraduationCap size={18}/>} label="Class Manager" active={pathname === '/education'} />
                <MenuLink onClick={() => setIsNavOpen(false)} href="/education/hiring" icon={<UserSquare2 size={18}/>} label="Hiring Portal" active={pathname === '/education/hiring'} />
              <MenuLink onClick={() => setIsNavOpen(false)} href="/education/portal" icon={<User2Icon size={18}/>} label="Faculty Portal" active={pathname === '/education/hiring'} />
              
              </div>

            </div>
            <div className="p-4 border-t border-white/5 bg-zinc-950/50">
               <button onClick={() => signOut({ callbackUrl: "/login" })} className="flex items-center gap-3 w-full p-2 text-zinc-500 hover:text-red-400 transition-colors">
                  <LogOut size={16} /> <span className="text-xs font-bold uppercase">Sign Out</span>
               </button>
            </div>
          </div>
        </div>
      )}

      {/* DEBUG CONSOLE */}
      {showDebug && (
        <div className="fixed bottom-4 right-4 w-80 bg-black/90 border border-amber-500/50 rounded-xl p-4 font-mono text-[10px] text-amber-500 z-[100] shadow-2xl backdrop-blur-xl animate-in zoom-in-95">
          <p className="font-black border-b border-amber-500/20 mb-2 pb-1 flex items-center gap-2"><Bug size={12}/> DATA STREAM DEBUG</p>
          <div className="space-y-1">
            <p>Total Records: {shows.length}</p>
            <p className="mt-2 text-white font-black italic">ACTIVE / UPCOMING MAP:</p>
            {shows.filter(s => s.isActive || s.status === 'Upcoming' || s.status === 'Pre-Production').map(s => (
              <div key={s.id}>• {s.title} (Status: {s.status})</div>
            ))}
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
  return (
    <button
      disabled={pending}
      className={`w-full flex items-start gap-3 p-2 rounded-lg transition-all text-left group ${isActive ? 'bg-zinc-800 ring-1 ring-zinc-700' : 'hover:bg-zinc-800/50'}`}
    >
      <div className={`w-1.5 h-1.5 rounded-full mt-1.5 shrink-0 ${prod.location?.includes('Fred') ? 'bg-emerald-500' : 'bg-zinc-500'}`} />
      <div className="flex-1 min-w-0">
        <div className={`text-xs truncate ${isActive ? 'text-white font-bold' : 'text-zinc-300'}`}>{prod.title}</div>
        <div className="text-[9px] font-black text-zinc-600 uppercase tracking-tight">
          {prod.location || "Unknown"} • {prod.status}
        </div>
      </div>
      {pending && <Sparkles size={12} className="text-emerald-500 animate-spin" />}
    </button>
  );
}