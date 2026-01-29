"use client";

import { useState, useRef, useEffect, useMemo } from 'react';
import { useFormStatus } from 'react-dom';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { switchProduction } from '@/app/actions';
import { 
  Menu, X, ChevronRight, ChevronsUpDown, Calendar, Users, 
  UserSquare2, AlertOctagon, BarChart3, Settings, LogOut, 
  Check, Sparkles, LayoutGrid, Mic2, Megaphone, 
  Theater, GraduationCap, Home, Archive, Clock,
  Bug, Wrench, Database
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
  const [viewMode, setViewMode] = useState<'current' | 'archive'>('current');
  const [showDebug, setShowDebug] = useState(false);

  const navRef = useRef<HTMLDivElement>(null);
  const contextRef = useRef<HTMLDivElement>(null);
  const pathname = usePathname();

  // Close menus on click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (navRef.current && !navRef.current.contains(event.target as Node)) {
        setIsNavOpen(false);
      }
      if (contextRef.current && !contextRef.current.contains(event.target as Node)) {
        setIsContextOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // --- DATA PREP ---
  const activeShow = shows.find(s => s.id === activeId) || shows[0] || { title: "Select Production", location: "Unknown" };
  
  const userInitials = user?.name 
    ? user.name.split(' ').map((n:string) => n[0]).join('').substring(0,2).toUpperCase() 
    : "??";
  const userRole = user?.role || "Guest";

  // 1. Group Shows by Season
  const groupedData = useMemo(() => {
    const groups: Record<string, typeof shows> = {};
    shows.forEach(show => {
      const season = show.season || 'Other';
      if (!groups[season]) groups[season] = [];
      groups[season].push(show);
    });
    
    // Sort seasons descending (e.g., 2025-2026 comes before 2024-2025)
    const seasons = Object.keys(groups).sort((a, b) => b.localeCompare(a, undefined, { numeric: true }));
    
    return { groups, seasons };
  }, [shows]);

  const currentSeason = groupedData.seasons[0];
  const archiveSeasons = groupedData.seasons.slice(1);

  return (
    <>
      {/* --- THE STRIP (Always Visible) --- */}
      <header className="h-16 bg-zinc-950 border-b border-zinc-800 flex items-center justify-between px-4 shrink-0 relative z-50">
        
        {/* LEFT: NAV & CONTEXT */}
        <div className="flex items-center gap-4">
          <button 
            onClick={(e) => { e.stopPropagation(); setIsNavOpen(!isNavOpen); setIsContextOpen(false); }}
            className="p-2 -ml-2 rounded-full hover:bg-zinc-800 text-zinc-400 hover:text-white transition-colors md:hidden"
          >
            {isNavOpen ? <X size={24} /> : <Menu size={24} />}
          </button>

          <div className="h-8 w-px bg-zinc-800 hidden sm:block"></div>

          {/* CONTEXT SWITCHER */}
          <div className="relative" ref={contextRef}>
            <button 
              onClick={() => { setIsContextOpen(!isContextOpen); setIsNavOpen(false); }}
              className={`flex flex-col items-start text-left group transition-all p-2 -my-2 rounded-lg ${isContextOpen ? 'bg-zinc-900' : 'hover:bg-zinc-900/50'}`}
            >
              <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest group-hover:text-zinc-400 transition-colors">
                Current Production
              </span>
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold text-white truncate max-w-[180px] sm:max-w-md group-hover:text-emerald-400 transition-colors">
                  {activeShow.title}
                </span>
                <ChevronsUpDown size={12} className={`text-zinc-600 group-hover:text-zinc-400 transition-transform ${isContextOpen ? 'rotate-180' : ''}`}/>
              </div>
            </button>

            {/* DROPDOWN MENU */}
            {isContextOpen && (
              <div className="absolute top-full left-0 mt-2 w-80 bg-zinc-900 border border-zinc-700 rounded-xl shadow-2xl overflow-hidden animate-in fade-in slide-in-from-top-2 z-50 flex flex-col max-h-[70vh]">
                
                {/* A. TOGGLE HEADER */}
                <div className="bg-zinc-950/80 p-3 border-b border-white/5 backdrop-blur-sm grid grid-cols-2 gap-2 relative">
                   <button 
                      onClick={() => setViewMode('current')}
                      className={`flex items-center justify-center gap-2 py-2 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all
                        ${viewMode === 'current' ? 'bg-emerald-600 text-white shadow-lg' : 'bg-zinc-800 text-zinc-500 hover:bg-zinc-700 hover:text-zinc-300'}
                      `}
                   >
                      <Sparkles size={12} /> Current
                   </button>
                   <button 
                      onClick={() => setViewMode('archive')}
                      className={`flex items-center justify-center gap-2 py-2 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all
                        ${viewMode === 'archive' ? 'bg-blue-600 text-white shadow-lg' : 'bg-zinc-800 text-zinc-500 hover:bg-zinc-700 hover:text-zinc-300'}
                      `}
                   >
                      <Archive size={12} /> History
                   </button>

                   {/* TINY HIDDEN WRENCH (DEBUG) */}
                   <button 
                     onClick={() => setShowDebug(!showDebug)}
                     className="absolute -top-1 -right-1 p-2 text-zinc-800 hover:text-amber-500 transition-colors"
                   >
                     <Wrench size={10} />
                   </button>
                </div>

                {/* B. LIST CONTENT */}
                <div className="p-2 space-y-4 overflow-y-auto custom-scrollbar flex-1">
                  
                  {/* DEBUG PANEL */}
                  {showDebug && (
                    <div className="p-3 bg-black/50 border border-amber-500/30 rounded-lg mb-2 font-mono text-[9px] text-amber-500 animate-in zoom-in-95">
                      <div className="flex items-center gap-2 mb-2 font-black border-b border-amber-500/20 pb-1">
                        <Bug size={10} /> RAW PRODUCTION STREAM
                      </div>
                      <div className="space-y-1">
                        <p>Total Records: {shows.length}</p>
                        <p>Current Season Key: {currentSeason}</p>
                        <p>Active ID: {activeId}</p>
                        <div className="pt-2 mt-2 border-t border-amber-500/20">
                          {shows.filter(s => s.isActive || s.season === currentSeason).map(s => (
                            <div key={s.id}>• ID:{s.id} | {s.title.substring(0,15)} | {s.season}</div>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* VIEW: CURRENT */}
                  {viewMode === 'current' && (
                    <div className="animate-in slide-in-from-left-4 duration-300">
                        {currentSeason ? (
                           <div key={currentSeason}>
                              <div className="px-3 py-1.5 mb-1 text-[9px] font-black text-emerald-500 uppercase tracking-widest bg-emerald-900/10 border border-emerald-500/20 rounded flex items-center gap-2">
                                <Clock size={10} /> {currentSeason} (Active Cycle)
                              </div>
                              <div className="space-y-1">
                                {groupedData.groups[currentSeason].map(prod => (
                                  <ProductionItem key={prod.id} prod={prod} activeId={activeId} pathname={pathname} />
                                ))}
                              </div>
                           </div>
                        ) : (
                          <div className="p-10 text-center opacity-30">
                            <Theater size={32} className="mx-auto mb-2" />
                            <p className="text-[10px] font-bold uppercase tracking-widest">No Active Shows</p>
                          </div>
                        )}
                    </div>
                  )}

                  {/* VIEW: ARCHIVE (ACCORDIONS) */}
                  {viewMode === 'archive' && (
                    <div className="space-y-2 animate-in slide-in-from-right-4 duration-300">
                       {archiveSeasons.length > 0 ? (
                          archiveSeasons.map(season => (
                            <details key={season} className="group">
                               <summary className="flex items-center justify-between px-3 py-2 text-[10px] font-black text-zinc-500 uppercase tracking-widest bg-zinc-950/50 rounded-lg cursor-pointer hover:bg-zinc-800 hover:text-zinc-300 transition-colors list-none select-none">
                                 <div className="flex items-center gap-2">
                                    <Calendar size={12} />
                                    <span>{season}</span>
                                 </div>
                                 <ChevronRight size={12} className="group-open:rotate-90 transition-transform duration-200" />
                               </summary>
                               <div className="pt-2 pl-2 space-y-1">
                                 {groupedData.groups[season].map(prod => (
                                   <ProductionItem key={prod.id} prod={prod} activeId={activeId} pathname={pathname} />
                                 ))}
                               </div>
                            </details>
                          ))
                       ) : (
                          <div className="p-8 text-center opacity-50">
                             <Archive size={32} className="mx-auto mb-2 text-zinc-600" />
                             <p className="text-xs font-bold text-zinc-500">History is empty.</p>
                          </div>
                       )}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* RIGHT: USER PROFILE */}
        <div className="flex items-center gap-3">
          <div className="hidden md:flex flex-col items-end leading-tight">
            <span className="text-xs font-semibold text-zinc-200">{user?.name || "Not Signed In"}</span>
            <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-tighter">{userRole}</span>
          </div>
          <div className="w-8 h-8 rounded-full bg-emerald-600 flex items-center justify-center text-xs font-bold text-white shadow-lg shadow-emerald-900/20 cursor-default ring-2 ring-zinc-900 overflow-hidden">
            {user?.image ? (
              <img src={user.image} alt={user.name} className="w-full h-full object-cover" />
            ) : (
              <span className="tracking-tighter">{userInitials}</span>
            )}
          </div>
        </div>
      </header>

      {/* --- THE NAV DRAWER (Mobile) --- */}
      {isNavOpen && (
        <div className="fixed inset-0 z-40 flex md:hidden">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200" onClick={() => setIsNavOpen(false)} />
          <div ref={navRef} className="relative w-72 bg-zinc-900 h-full border-r border-zinc-800 shadow-2xl flex flex-col animate-in slide-in-from-left duration-300">
            <div className="flex-1 overflow-y-auto p-4 space-y-6 pt-6">
              <SectionHeader label="Daily Workspace" />
              <div className="space-y-1">
                <MenuLink onClick={() => setIsNavOpen(false)} href="/schedule" icon={<Calendar size={18}/>} label="Scheduler" active={pathname === '/schedule'} />
                <MenuLink onClick={() => setIsNavOpen(false)} href="/auditions" icon={<Mic2 size={18}/>} label="Auditions" active={pathname === '/auditions'} />
                <MenuLink onClick={() => setIsNavOpen(false)} href="/callbacks" icon={<Megaphone size={18}/>} label="Callbacks" active={pathname === '/callbacks'} />
                <MenuLink onClick={() => setIsNavOpen(false)} href="/casting" icon={<LayoutGrid size={18}/>} label="Cast Grid" active={pathname === '/casting'} />
              </div>
              <SectionHeader label="Company Manager" />
              <div className="space-y-1">
                <MenuLink onClick={() => setIsNavOpen(false)} href="/roster" icon={<UserSquare2 size={18}/>} label="Roster & Forms" active={pathname === '/roster'} />
                <MenuLink onClick={() => setIsNavOpen(false)} href="/conflicts" icon={<AlertOctagon size={18}/>} label="Conflicts" active={pathname === '/conflicts'} />
                <MenuLink onClick={() => setIsNavOpen(false)} href="/reports" icon={<BarChart3 size={18}/>} label="Reports" active={pathname === '/reports'} />
              </div>
              <SectionHeader label="System" />
              <div className="space-y-1">
                <MenuLink onClick={() => setIsNavOpen(false)} href="/settings" icon={<Settings size={18}/>} label="Settings" active={pathname === '/settings'} />
              </div>
            </div>
            <div className="p-4 border-t border-white/5 bg-zinc-950/50">
              <button className="flex items-center gap-3 w-full p-2 text-zinc-500 hover:text-red-400 transition-colors">
                <LogOut size={16} />
                <span className="text-xs font-bold uppercase tracking-wider">Sign Out</span>
              </button>
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