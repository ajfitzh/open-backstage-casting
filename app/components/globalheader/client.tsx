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
  ShieldCheck, BarChart3, UserSquare2, AlertOctagon
} from 'lucide-react';

export default function GlobalHeaderClient({ shows, activeId }: { shows: any[], activeId: number }) {
  const [openMenu, setOpenMenu] = useState<'context' | 'nav' | null>(null);
  
  const contextRef = useRef<HTMLDivElement>(null);
  const navRef = useRef<HTMLDivElement>(null);
  const pathname = usePathname(); 

  // Handle click outside
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

  const groupedShows = shows.reduce((groups, show) => {
    const season = show.season || 'Other';
    if (!groups[season]) groups[season] = [];
    groups[season].push(show);
    return groups;
  }, {} as Record<string, typeof shows>);

  const sortedSeasons = Object.keys(groupedShows).sort().reverse();

  return (
    <header className="h-14 bg-zinc-950 border-b border-zinc-800 flex items-center justify-between px-4 shrink-0 relative z-50">
      
      {/* --- LEFT: CONTEXT SWITCHER (Which Show?) --- */}
      <div className="flex items-center gap-3 relative" ref={contextRef}>
        <button 
            onClick={() => setOpenMenu(openMenu === 'context' ? null : 'context')}
            className={`group flex items-center gap-2 transition-all p-2 rounded-lg border border-transparent ${openMenu === 'context' ? 'bg-zinc-900 border-zinc-800 text-white' : 'text-zinc-400 hover:text-emerald-500'}`}
        >
            <div className={`p-1 rounded ${openMenu === 'context' ? 'bg-emerald-500 text-black' : 'bg-zinc-800 text-zinc-400 group-hover:text-emerald-500'}`}>
                <LayoutGrid size={16} />
            </div>
            <div className="flex flex-col items-start leading-none">
                <span className="font-bold text-xs uppercase tracking-widest text-zinc-500 group-hover:text-emerald-500 text-[10px]">Context</span>
                <div className="flex items-center gap-1">
                    <span className="font-bold text-sm text-zinc-200 max-w-[120px] sm:max-w-[200px] truncate">{activeShow.title}</span>
                    <ChevronsUpDown size={12} className="text-zinc-600" />
                </div>
            </div>
        </button>

        {/* CONTEXT DROPDOWN */}
        {openMenu === 'context' && (
          <div className="absolute top-14 left-0 w-80 bg-zinc-950 border border-zinc-800 rounded-xl shadow-2xl shadow-black/50 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-100 z-50 flex flex-col max-h-[75vh]">
            
            <div className="bg-zinc-900/50 p-3 border-b border-zinc-800 sticky top-0 backdrop-blur-md z-10">
                <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">Switch Active Production</span>
            </div>
            
            <div className="p-2 space-y-4 overflow-y-auto custom-scrollbar flex-1">
                {shows.length === 0 && <div className="p-2 text-xs text-zinc-500 italic">No active shows found.</div>}
                
                {sortedSeasons.map(season => (
                <div key={season}>
                    <div className="px-2 py-1 mb-1 text-[10px] font-bold text-zinc-500 uppercase tracking-widest flex items-center gap-2 border-b border-zinc-800/50">
                        <Calendar size={10} /> {season}
                    </div>
                    <div className="space-y-1">
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

      {/* --- RIGHT: NAVIGATION MENU (Where to go?) --- */}
      <div className="flex items-center gap-3" ref={navRef}>
        
        {/* User Profile (Desktop) */}
        <div className="hidden md:flex flex-col items-end leading-tight mr-2">
          <span className="text-xs font-semibold text-zinc-200">{user.name}</span>
          <span className="text-[10px] text-emerald-500 font-bold uppercase tracking-tighter">{user.role}</span>
        </div>

        {/* HAMBURGER BUTTON */}
        <button 
            onClick={() => setOpenMenu(openMenu === 'nav' ? null : 'nav')}
            className={`p-2.5 rounded-full transition-all border ${openMenu === 'nav' ? 'bg-white text-black border-white' : 'bg-zinc-900 text-zinc-400 border-zinc-800 hover:text-white hover:border-zinc-700'}`}
        >
            {openMenu === 'nav' ? <X size={20} /> : <Menu size={20} />}
        </button>

        {/* NAVIGATION DROPDOWN */}
        {openMenu === 'nav' && (
            <div className="absolute top-16 right-4 w-64 bg-zinc-950 border border-zinc-800 rounded-2xl shadow-2xl shadow-black/50 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-100 z-50 flex flex-col max-h-[80vh]">
                
                <div className="p-2 overflow-y-auto custom-scrollbar">
                    
                    {/* SECTION: ACTIVE */}
                    <div className="px-2 pt-2 pb-1"><span className="text-[10px] font-bold text-emerald-600 uppercase tracking-wider">Active</span></div>
                    <MenuLink href="/casting" icon={<Users size={16} />} title="Casting" subtitle="Auditions & Callbacks" onClick={() => setOpenMenu(null)} />
                    
                    {/* SECTION: PRODUCTION */}
                    <div className="px-2 pt-3 pb-1"><span className="text-[10px] font-bold text-blue-500 uppercase tracking-wider">Production</span></div>
                    <MenuLink href="/schedule" icon={<Calendar size={16} />} title="Scheduler" subtitle="Weekly Rehearsal Grid" onClick={() => setOpenMenu(null)} />

                    {/* SECTION: COMPANY MANAGEMENT (Formerly "Staff") */}
                    <div className="px-2 pt-3 pb-1"><span className="text-[10px] font-bold text-amber-500 uppercase tracking-wider">Company Manager</span></div>
                    <MenuLink href="/staff" icon={<UserSquare2 size={16} />} title="Cast List" subtitle="Roster & Contact Info" onClick={() => setOpenMenu(null)} />
                    <MenuLink href="/conflicts" icon={<AlertOctagon size={16} />} title="Conflicts" subtitle="Availability Matrix" onClick={() => setOpenMenu(null)} />
                    <MenuLink href="/staff" icon={<ShieldCheck size={16} />} title="Compliance" subtitle="Safety & Forms" onClick={() => setOpenMenu(null)} />
                    <MenuLink href="/staff" icon={<BarChart3 size={16} />} title="Reports" subtitle="Cast Health & Stats" onClick={() => setOpenMenu(null)} />

                    {/* SECTION: SOON */}
                    <div className="px-2 pt-3 pb-1"><span className="text-[10px] font-bold text-zinc-600 uppercase tracking-wider">Soon</span></div>
                    <div className="flex items-start gap-3 p-2 rounded-lg opacity-50 cursor-not-allowed">
                        <div className="mt-1 text-zinc-500"><Music size={16} /></div>
                        <div>
                            <div className="text-sm font-medium text-zinc-400">Script & Score</div>
                            <div className="text-xs text-zinc-600">Digital scripts</div>
                        </div>
                    </div>
                </div>

                {/* FOOTER */}
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

// --- SUB-COMPONENTS ---

function ContextButton({ prod, isActive }: { prod: any, isActive: boolean }) {
  const { pending } = useFormStatus();
  const locationColor = prod.location?.includes('Stafford') ? 'bg-amber-500' : 'bg-emerald-500';

  return (
    <button 
      disabled={pending} 
      className={`w-full flex items-center gap-3 p-2 rounded-lg transition-all text-left group ${isActive ? 'bg-zinc-800 text-white ring-1 ring-zinc-700' : 'hover:bg-zinc-900 text-zinc-400'}`}
    >
       <div className={`h-8 w-1 rounded-full shrink-0 transition-opacity ${pending ? 'opacity-50' : ''} ${locationColor}`} />
       
       <div className="flex-1 min-w-0">
          <div className="text-sm font-medium truncate text-zinc-200 group-hover:text-white">
            {prod.title}
          </div>
          <div className="flex items-center gap-2 mt-0.5">
            <div className="flex items-center gap-1 text-[10px] font-bold text-zinc-500 uppercase tracking-wide">
              <MapPin size={10} />
              {prod.location}
            </div>
            <span className="text-[8px] text-zinc-700">•</span>
            <div className="text-[10px] font-bold text-zinc-600 uppercase tracking-wide">
              {prod.type}
            </div>
          </div>
       </div>
       
       {isActive && !pending && <Check size={14} className="text-emerald-500" />}
       {pending && <Sparkles size={14} className="text-emerald-500 animate-spin" />}
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