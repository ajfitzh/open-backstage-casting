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
  Theater, GraduationCap, Home, Archive, Clock
} from 'lucide-react';

export default function GlobalHeaderClient({ shows, activeId }: { shows: any[], activeId: number }) {
  const [isNavOpen, setIsNavOpen] = useState(false);
  const [isContextOpen, setIsContextOpen] = useState(false);
  
  // NEW: Toggle state for the dropdown
  const [viewMode, setViewMode] = useState<'current' | 'archive'>('current');

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
  const activeShow = shows.find(s => s.id === activeId) || shows[0] || { title: "Select Production", branch: "None" };
  
  // Mock User (Placeholder for now)
  const user = { initials: "AF", name: "Austin Fitzhugh", role: "Artistic Director" };

  // 1. Group Shows by Season
  const groupedData = useMemo(() => {
    const groups: Record<string, typeof shows> = {};
    shows.forEach(show => {
      const season = show.season || 'Other';
      if (!groups[season]) groups[season] = [];
      groups[season].push(show);
    });
    
    // Sort seasons descending (assuming format "Season 12", "2025", etc.)
    // If strings, this roughly works. For better sorting, we might need a "season_order" field later.
    const seasons = Object.keys(groups).sort((a, b) => b.localeCompare(a, undefined, { numeric: true }));
    
    return { groups, seasons };
  }, [shows]);

  // 2. Determine "Current" vs "Archive"
  // Heuristic: The very first season in the sorted list is "Current". Everything else is "Archive".
  const currentSeason = groupedData.seasons[0];
  const archiveSeasons = groupedData.seasons.slice(1);

  return (
    <>
      {/* --- THE STRIP (Always Visible) --- */}
      <header className="h-16 bg-zinc-950 border-b border-zinc-800 flex items-center justify-between px-4 shrink-0 relative z-50">
        
        {/* LEFT: NAV & CONTEXT */}
        <div className="flex items-center gap-4">
          
          {/* HAMBURGER (Mobile) */}
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
                <div className="bg-zinc-950/80 p-3 border-b border-white/5 backdrop-blur-sm grid grid-cols-2 gap-2">
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
                </div>

                {/* B. LIST CONTENT */}
                <div className="p-2 space-y-4 overflow-y-auto custom-scrollbar flex-1">
                  
                  {/* VIEW: CURRENT */}
                  {viewMode === 'current' && (
                    <div className="animate-in slide-in-from-left-4 duration-300">
                        {currentSeason ? (
                           <div key={currentSeason}>
                              <div className="px-3 py-1.5 mb-1 text-[9px] font-black text-emerald-500 uppercase tracking-widest bg-emerald-900/10 border border-emerald-500/20 rounded flex items-center gap-2">
                                <Clock size={10} /> {currentSeason} (Active)
                              </div>
                              <div className="space-y-1">
                                {groupedData.groups[currentSeason].map(prod => (
                                  <ProductionItem key={prod.id} prod={prod} activeId={activeId} pathname={pathname} />
                                ))}
                              </div>
                           </div>
                        ) : (
                          <div className="p-4 text-center text-zinc-500 text-xs">No active seasons found.</div>
                        )}
                    </div>
                  )}

                  {/* VIEW: ARCHIVE */}
                  {viewMode === 'archive' && (
                    <div className="space-y-6 animate-in slide-in-from-right-4 duration-300">
                       {archiveSeasons.length > 0 ? (
                          archiveSeasons.map(season => (
                            <div key={season}>
                               <div className="px-3 py-1.5 mb-1 text-[9px] font-black text-zinc-500 uppercase tracking-widest bg-zinc-950/50 rounded">
                                 {season}
                               </div>
                               <div className="space-y-1">
                                 {groupedData.groups[season].map(prod => (
                                   <ProductionItem key={prod.id} prod={prod} activeId={activeId} pathname={pathname} />
                                 ))}
                               </div>
                            </div>
                          ))
                       ) : (
                          <div className="p-8 text-center opacity-50">
                             <Archive size={32} className="mx-auto mb-2 text-zinc-600" />
                             <p className="text-xs font-bold text-zinc-500">No archives yet.</p>
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
            <span className="text-xs font-semibold text-zinc-200">{user.name}</span>
            <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-tighter">{user.role}</span>
          </div>
          <div className="w-8 h-8 rounded-full bg-emerald-600 flex items-center justify-center text-xs font-bold text-white shadow-lg shadow-emerald-900/20 cursor-default ring-2 ring-zinc-900">
            {user.initials}
          </div>
        </div>

      </header>

      {/* --- THE NAV DRAWER (Mobile) --- */}
      {isNavOpen && (
        <div className="fixed inset-0 z-40 flex md:hidden">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200" onClick={() => setIsNavOpen(false)} />
          <div ref={navRef} className="relative w-72 bg-zinc-900 h-full border-r border-zinc-800 shadow-2xl flex flex-col animate-in slide-in-from-left duration-300">
            <div className="flex-1 overflow-y-auto p-4 space-y-6 custom-scrollbar pt-6">
              
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

              <SectionHeader label="Academy" />
              <div className="space-y-1">
                <MenuLink onClick={() => setIsNavOpen(false)} href="/education" icon={<GraduationCap size={18}/>} label="Class Manager" active={pathname === '/education'} />
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
        ${active ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-900/20' : 'text-zinc-400 hover:bg-zinc-800 hover:text-white'}
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
  
  // Dynamic Dot Color based on Location/Branch
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
      {/* Active Indicator Bar */}
      {isActive && <div className="absolute left-0 top-0 bottom-0 w-1 bg-emerald-500" />}

      {/* Status Dot */}
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