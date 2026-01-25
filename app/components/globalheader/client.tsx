"use client";

import { useState, useRef, useEffect } from 'react';
import { useFormStatus } from 'react-dom';
import Link from 'next/link';
import { usePathname } from 'next/navigation'; 
import { switchProduction } from '@/app/actions'; 
import { 
  LayoutGrid, LogOut, ChevronDown, 
  Users, Settings, Sparkles, Check,
  MapPin, Music, Calendar, Menu, X, ChevronsUpDown,
  BarChart3, UserSquare2, AlertOctagon,
  Tent, Star
} from 'lucide-react';

export default function GlobalHeaderClient({ shows, activeId }: { shows: any[], activeId: number }) {
  const [openMenu, setOpenMenu] = useState<'context' | 'nav' | null>(null);
  
  const contextRef = useRef<HTMLDivElement>(null);
  const navRef = useRef<HTMLDivElement>(null);
  const pathname = usePathname(); 

  // Close menus on click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (contextRef.current && !contextRef.current.contains(event.target as Node)) {
        if (openMenu === 'context') setOpenMenu(null);
      }
      if (navRef.current && !navRef.current.contains(event.target as Node)) {
        if (openMenu === 'nav') setOpenMenu(null);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [openMenu]);

  const activeShow = shows.find(s => s.id === activeId) || shows[0] || { title: "Select Production", branch: "None" };
  const user = { initials: "AF", name: "Austin Fitzhugh", role: "Artistic Director" };

  // --- GROUPING LOGIC (Dynamic Years) ---
  const groupedShows = shows.reduce((groups, show) => {
    const season = show.season || 'Unknown Season';
    if (!groups[season]) groups[season] = [];
    groups[season].push(show);
    return groups;
  }, {} as Record<string, typeof shows>);

  const sortedSeasons = Object.keys(groupedShows).sort((a, b) => b.localeCompare(a));

  // --- STYLING HELPER (Branch Colors) ---
  const getBranchColor = (location: string = "") => {
      if (location.includes('Stafford')) return 'text-amber-500';
      if (location.includes('NoVa')) return 'text-indigo-400';
      return 'text-emerald-500'; 
  };

  return (
    <header className="h-14 bg-zinc-950 border-b border-zinc-800 flex items-center justify-between px-4 shrink-0 relative z-50">
      
      {/* --- LEFT: CONTEXT SWITCHER --- */}
      <div className="flex items-center gap-3 relative" ref={contextRef}>
        <button 
            onClick={() => setOpenMenu(openMenu === 'context' ? null : 'context')}
            className={`group flex items-center gap-2 transition-all p-2 rounded-lg border border-transparent ${openMenu === 'context' ? 'bg-zinc-900 border-zinc-800 text-white' : 'text-zinc-400 hover:text-white'}`}
        >
            <div className={`p-1.5 rounded transition-colors ${openMenu === 'context' ? 'bg-white text-black' : 'bg-zinc-800 text-zinc-400 group-hover:text-white'}`}>
                <LayoutGrid size={16} />
            </div>
            <div className="flex flex-col items-start leading-none gap-0.5">
                <span className="font-bold text-[9px] uppercase tracking-widest text-zinc-500 group-hover:text-zinc-400">Context</span>
                <div className="flex items-center gap-1.5">
                    <span className={`font-bold text-sm max-w-[140px] sm:max-w-[240px] truncate ${getBranchColor(activeShow.location)}`}>
                        {activeShow.title}
                    </span>
                    <ChevronsUpDown size={10} className="text-zinc-600" />
                </div>
            </div>
        </button>

        {/* CONTEXT DROPDOWN */}
        {openMenu === 'context' && (
          <div className="absolute top-14 left-0 w-80 bg-zinc-950 border border-zinc-800 rounded-xl shadow-2xl shadow-black/80 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-100 z-50 flex flex-col max-h-[75vh]">
            <div className="bg-zinc-900/80 p-3 border-b border-zinc-800 sticky top-0 backdrop-blur-md z-10">
                <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider flex items-center gap-2">
                    <LayoutGrid size={12}/> Active Productions
                </span>
            </div>
            
            <div className="p-2 space-y-4 overflow-y-auto custom-scrollbar flex-1">
                {shows.length === 0 && <div className="p-4 text-xs text-zinc-500 italic text-center">No active shows found.</div>}
                
                {sortedSeasons.map(season => (
                <div key={season}>
                    <div className="px-3 py-1.5 mb-2 text-[10px] font-black text-zinc-400 uppercase tracking-widest flex items-center gap-2 bg-zinc-900/30 rounded-lg">
                        <Calendar size={10} className="text-zinc-600"/> {season}
                    </div>
                    <div className="space-y-1 pl-1">
                    {groupedShows[season].map((prod) => (
                        <form key={prod.id} action={switchProduction}>
                        <input type="hidden" name="productionId" value={prod.id} />
                        <input type="hidden" name="redirectPath" value={pathname} />
                        <ContextButton prod={prod} isActive={prod.id === activeId} />
                        </form>
                    ))}
                    </div>
                </div>
                ))}
            </div>
          </div>
        )}
      </div>

      {/* --- RIGHT: NAVIGATION MENU --- */}
      <div className="flex items-center gap-3" ref={navRef}>
        
        {/* User Info */}
        <div className="hidden md:flex flex-col items-end leading-tight mr-2">
          <span className="text-xs font-semibold text-zinc-200">{user.name}</span>
          <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-tighter">{user.role}</span>
        </div>

        {/* Hamburger */}
        <button 
            onClick={() => setOpenMenu(openMenu === 'nav' ? null : 'nav')}
            className={`p-2.5 rounded-full transition-all border ${openMenu === 'nav' ? 'bg-white text-black border-white' : 'bg-zinc-900 text-zinc-400 border-zinc-800 hover:text-white hover:border-zinc-700'}`}
        >
            {openMenu === 'nav' ? <X size={20} /> : <Menu size={20} />}
        </button>

        {/* Nav Dropdown */}
        {openMenu === 'nav' && (
            <div className="absolute top-16 right-4 w-64 bg-zinc-950 border border-zinc-800 rounded-2xl shadow-2xl shadow-black/80 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-100 z-50 flex flex-col max-h-[80vh]">
                
                <div className="p-2 overflow-y-auto custom-scrollbar">
                    
                    {/* ACTIVE */}
                    <div className="px-2 pt-2 pb-1 flex items-center justify-between">
                        <span className="text-[10px] font-bold text-emerald-600 uppercase tracking-wider">Active Workspace</span>
                    </div>
                    <MenuLink href="/casting" icon={<Users size={16} />} title="Casting" subtitle="Auditions & Callbacks" onClick={() => setOpenMenu(null)} />
                    
                    {/* PRODUCTION */}
                    <div className="px-2 pt-4 pb-1"><span className="text-[10px] font-bold text-blue-500 uppercase tracking-wider">Production</span></div>
                    <MenuLink href="/schedule" icon={<Calendar size={16} />} title="Scheduler" subtitle="Weekly Rehearsal Grid" onClick={() => setOpenMenu(null)} />

                    {/* COMPANY MANAGER */}
                    <div className="px-2 pt-4 pb-1"><span className="text-[10px] font-bold text-amber-500 uppercase tracking-wider">Company Manager</span></div>
                    <MenuLink href="/roster" icon={<UserSquare2 size={16} />} title="Cast List" subtitle="Roster & Compliance" onClick={() => setOpenMenu(null)} />
                    <MenuLink href="/conflicts" icon={<AlertOctagon size={16} />} title="Conflicts" subtitle="Availability Matrix" onClick={() => setOpenMenu(null)} />
                    <MenuLink href="/reports" icon={<BarChart3 size={16} />} title="Reports" subtitle="Demographics & Stats" onClick={() => setOpenMenu(null)} />

                    {/* SOON */}
                    <div className="px-2 pt-4 pb-1"><span className="text-[10px] font-bold text-zinc-700 uppercase tracking-wider">Coming Soon</span></div>
                    <div className="flex items-start gap-3 p-2 rounded-lg opacity-40 cursor-not-allowed">
                        <div className="mt-1 text-zinc-500"><Music size={16} /></div>
                        <div>
                            <div className="text-sm font-medium text-zinc-400">Script & Score</div>
                            <div className="text-xs text-zinc-600">Digital Perusal</div>
                        </div>
                    </div>
                </div>

                {/* Footer */}
                <div className="p-2 border-t border-zinc-800 bg-zinc-900/50 mt-auto">
                    <MenuLink href="/settings" icon={<Settings size={16} />} title="Settings" subtitle="System & Accounts" onClick={() => setOpenMenu(null)} />
                    <button className="w-full flex items-center gap-3 p-2 rounded-lg hover:bg-red-900/20 group transition-colors mt-1">
                        <div className="mt-1 text-zinc-500 group-hover:text-red-500"><LogOut size={16} /></div>
                        <div className="text-left">
                            <div className="text-sm font-medium text-zinc-400 group-hover:text-red-400">Sign Out</div>
                        </div>
                    </button>
                </div>
            </div>
        )}
      </div>
    </header>
  );
}

// --- SUB-COMPONENT: FANCY CONTEXT BUTTON ---

function ContextButton({ prod, isActive }: { prod: any, isActive: boolean }) {
  const { pending } = useFormStatus();
  
  // 1. Branch Logic (Color)
  let branchColor = 'bg-emerald-500'; 
  if (prod.location?.includes('Stafford')) branchColor = 'bg-amber-500';
  if (prod.location?.includes('NoVa')) branchColor = 'bg-indigo-500';

  // 2. Type Logic (Icon & Style)
  const isMain = prod.type?.includes('Main');
  const isCamp = prod.type?.includes('Camp');
  const isLite = prod.type?.includes('Lite');

  return (
    <button 
      disabled={pending} 
      className={`w-full flex items-stretch gap-3 p-2 rounded-lg transition-all text-left group relative overflow-hidden ${isActive ? 'bg-zinc-800 ring-1 ring-zinc-600' : 'hover:bg-zinc-900'}`}
    >
       {/* Color Strip */}
       <div className={`w-1 rounded-full shrink-0 transition-opacity ${pending ? 'opacity-50' : 'opacity-100'} ${branchColor}`} />
       
       <div className="flex-1 min-w-0 flex flex-col justify-center">
          <div className={`text-sm truncate pr-6 ${isActive ? 'text-white font-bold' : 'text-zinc-300 group-hover:text-white font-medium'}`}>
            {prod.title}
          </div>
          
          <div className="flex items-center gap-2 mt-1">
            {/* Branch Badge */}
            <div className="flex items-center gap-1 text-[9px] font-bold text-zinc-500 uppercase tracking-wide">
              <MapPin size={9} />
              {prod.location?.replace("Fredericksburg", "Fred'bg") || "Unknown"}
            </div>
            
            <span className="text-[8px] text-zinc-700">•</span>
            
            {/* Type Badge */}
            {isCamp ? (
                <span className="flex items-center gap-1 text-[9px] font-bold text-purple-400 uppercase tracking-wide bg-purple-500/10 px-1.5 py-0.5 rounded border border-purple-500/20">
                    <Tent size={8}/> Camp
                </span>
            ) : isLite ? (
                <span className="flex items-center gap-1 text-[9px] font-bold text-zinc-400 uppercase tracking-wide bg-zinc-800 px-1.5 py-0.5 rounded border border-zinc-700">
                    Lite
                </span>
            ) : (
                <span className="flex items-center gap-1 text-[9px] font-bold text-amber-200 uppercase tracking-wide bg-amber-500/10 px-1.5 py-0.5 rounded border border-amber-500/20">
                    <Star size={8}/> Main
                </span>
            )}
          </div>
       </div>
       
       {isActive && !pending && <div className="absolute right-3 top-1/2 -translate-y-1/2"><Check size={16} className="text-emerald-500" /></div>}
       {pending && <div className="absolute right-3 top-1/2 -translate-y-1/2"><Sparkles size={16} className="text-emerald-500 animate-spin" /></div>}
    </button>
  );
}

function MenuLink({ href, icon, title, subtitle, onClick }: any) {
  return (
    <Link href={href} onClick={onClick} className="flex items-start gap-3 p-2 rounded-lg hover:bg-zinc-800 group transition-colors">
      <div className="mt-1 text-zinc-500 group-hover:text-white transition-colors">{icon}</div>
      <div>
        <div className="text-sm font-medium text-zinc-300 group-hover:text-white transition-colors">{title}</div>
        <div className="text-xs text-zinc-500 group-hover:text-zinc-400 transition-colors">{subtitle}</div>
      </div>
    </Link>
  );
}