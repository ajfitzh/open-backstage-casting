"use client";

import { useState, useRef, useEffect } from 'react';
import { useFormStatus } from 'react-dom';
import Link from 'next/link';
import { usePathname } from 'next/navigation'; // 👈 IMPORT THIS
import { switchProduction } from '@/app/actions'; 
import { 
  LayoutGrid, LogOut, ChevronRight, ChevronDown, 
  Users, ClipboardCheck, Settings, Sparkles, Check,
  MapPin, Music, Calendar 
} from 'lucide-react';

export default function GlobalHeaderClient({ shows, activeId }: { shows: any[], activeId: number }) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  
  // 1. Get the current URL path (e.g. "/casting" or "/staff")
  const pathname = usePathname(); 

  // ... (Keep existing useEffect for click outside) ...
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

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
      
      {/* ... Left Logo Section ... */}
      <div className="flex items-center gap-3" ref={menuRef}>
        <button 
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            className={`group flex items-center gap-2 transition-all p-2 rounded-lg border border-transparent ${isMenuOpen ? 'bg-zinc-900 border-zinc-800 text-white' : 'text-zinc-400 hover:text-emerald-500'}`}
        >
            <LayoutGrid size={18} className={isMenuOpen ? "text-emerald-500" : "group-hover:rotate-90 transition-transform duration-300"} />
            <span className="font-bold text-xs uppercase tracking-widest hidden sm:block">Open Backstage</span>
            <ChevronDown size={14} className={`transition-transform duration-200 ${isMenuOpen ? 'rotate-180 text-emerald-500' : ''}`} />
        </button>

        {isMenuOpen && (
          <div className="absolute top-16 left-4 w-80 bg-zinc-950 border border-zinc-800 rounded-xl shadow-2xl shadow-black/50 overflow-hidden animate-in fade-in zoom-in-95 duration-100 origin-top-left">
            
            <div className="bg-zinc-900/50 p-2 border-b border-zinc-800">
               <div className="px-2 pt-2 pb-1 flex justify-between items-center">
                  <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">Switch Context</span>
                  <span className="text-[10px] font-mono text-zinc-600 bg-zinc-900 px-1.5 py-0.5 rounded border border-zinc-800">v1.0.4</span>
               </div>
               
               <div className="space-y-1 max-h-[60vh] overflow-y-auto custom-scrollbar">
                 {shows.length === 0 && <div className="p-2 text-xs text-zinc-500 italic">No active shows found.</div>}
                 
                 {sortedSeasons.map(season => (
                   <div key={season} className="mb-3">
                     <div className="px-2 py-1 text-[10px] font-bold text-zinc-500 uppercase tracking-widest flex items-center gap-1">
                        <Calendar size={10} />
                        {season}
                     </div>

                     <div className="space-y-0.5">
                       {groupedShows[season].map((prod) => (
                         <form key={prod.id} action={switchProduction}>
                           <input type="hidden" name="productionId" value={prod.id} />
                           {/* 2. 👇 PASS THE CURRENT PATH TO THE SERVER */}
                           <input type="hidden" name="redirectPath" value={pathname} />
                           
                           <ContextButton prod={prod} isActive={prod.id === activeId} />
                         </form>
                       ))}
                     </div>
                   </div>
                 ))}
               </div>
            </div>

            {/* ... Navigation Links Section (Unchanged) ... */}
            <div className="p-2 space-y-1">
              <div className="px-2 pt-2 pb-1"><span className="text-[10px] font-bold text-emerald-600 uppercase tracking-wider">Active</span></div>
              <MenuLink href="/casting" icon={<Users size={16} />} title="Casting" subtitle="Auditions & Callbacks" onClick={() => setIsMenuOpen(false)} />
              <div className="px-2 pt-3 pb-1"><span className="text-[10px] font-bold text-blue-500 uppercase tracking-wider">Production</span></div>
              <MenuLink href="/staff" icon={<ClipboardCheck size={16} />} title="Staff Deck" subtitle="Compliance & Reports" onClick={() => setIsMenuOpen(false)} />
              <div className="px-2 pt-3 pb-1"><span className="text-[10px] font-bold text-zinc-600 uppercase tracking-wider">Soon</span></div>
              <div className="flex items-start gap-3 p-2 rounded-lg opacity-50 cursor-not-allowed">
                 <div className="mt-1 text-zinc-500"><Music size={16} /></div>
                 <div>
                    <div className="text-sm font-medium text-zinc-400">Script & Score</div>
                    <div className="text-xs text-zinc-600">Digital scripts</div>
                 </div>
              </div>
            </div>
            
            <div className="p-2 border-t border-zinc-800 bg-zinc-900/30">
               <MenuLink href="/settings" icon={<Settings size={16} />} title="Settings" subtitle="Manage Context" onClick={() => setIsMenuOpen(false)} />
            </div>
          </div>
        )}

        {/* ... Breadcrumb (Unchanged) ... */}
        {!isMenuOpen && (
          <>
            <ChevronRight size={14} className="text-zinc-700" />
            <div className="flex items-center gap-2 px-2 py-1 bg-zinc-900 rounded-md border border-zinc-800">
              <div className={`w-2 h-2 rounded-full animate-pulse ${activeShow.location?.includes('Stafford') ? 'bg-amber-500' : 'bg-emerald-500'}`} />
              <span className="text-zinc-300 text-xs font-medium max-w-[150px] truncate">
                 {activeShow.title}
              </span>
            </div>
          </>
        )}
      </div>

      {/* ... Right User Section (Unchanged) ... */}
      <div className="flex items-center gap-4">
        <div className="hidden md:flex flex-col items-end leading-tight">
          <span className="text-xs font-semibold text-zinc-200">{user.name}</span>
          <span className="text-[10px] text-emerald-500 font-bold uppercase tracking-tighter">{user.role}</span>
        </div>
        <div className="h-8 w-8 rounded-lg bg-emerald-600/10 flex items-center justify-center text-emerald-500 text-xs font-bold border border-emerald-600/20">
            {user.initials}
        </div>
        <div className="h-4 w-px bg-zinc-800" />
        <button className="text-zinc-500 hover:text-red-400 transition-colors p-1"><LogOut size={18} /></button>
      </div>
    </header>
  );
}

// ... ContextButton and MenuLink components (Unchanged) ...
function ContextButton({ prod, isActive }: { prod: any, isActive: boolean }) {
  const { pending } = useFormStatus();
  const locationColor = prod.location?.includes('Stafford') ? 'bg-amber-500' : 'bg-emerald-500';

  return (
    <button 
      disabled={pending} 
      className={`w-full flex items-center gap-3 p-2 rounded-lg transition-colors text-left group ${isActive ? 'bg-zinc-800 text-white shadow-sm' : 'hover:bg-zinc-800/50 text-zinc-400'}`}
    >
       <div className={`h-8 w-1 rounded-full shrink-0 ${locationColor}`} />
       
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
       
       {isActive && <Check size={14} className="text-emerald-500" />}
       {pending && <Sparkles size={14} className="text-zinc-500 animate-spin" />}
    </button>
  );
}

function MenuLink({ href, icon, title, subtitle, onClick }: any) {
  return (
    <Link href={href} onClick={onClick} className="flex items-start gap-3 p-2 rounded-lg hover:bg-zinc-800 group transition-colors">
      <div className="mt-1 text-zinc-500 group-hover:text-emerald-500">{icon}</div>
      <div>
        <div className="text-sm font-medium text-zinc-300 group-hover:text-white">{title}</div>
        <div className="text-xs text-zinc-500 group-hover:text-zinc-400">{subtitle}</div>
      </div>
    </Link>
  );
}