"use client";

import { useState, useRef, useEffect } from 'react';
import { useFormStatus } from 'react-dom';
import Link from 'next/link';
import { usePathname } from 'next/navigation'; 
import { switchProduction } from '@/app/actions'; 
import { 
  Menu, X, ChevronRight, ChevronsUpDown,
  LayoutGrid, Calendar, Users, UserSquare2, 
  AlertOctagon, BarChart3, ShieldCheck,
  Settings, LogOut, Check, Sparkles, MapPin, 
  Tent, Star, Home, Search
} from 'lucide-react';

export default function GlobalHeaderClient({ shows, activeId }: { shows: any[], activeId: number }) {
  const [isOpen, setIsOpen] = useState(false);
  const [showContextList, setShowContextList] = useState(false);
  
  const menuRef = useRef<HTMLDivElement>(null);
  const pathname = usePathname(); 

  // Close on click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen]);

  const activeShow = shows.find(s => s.id === activeId) || shows[0] || { title: "Select Production", branch: "None" };
  const user = { initials: "AF", name: "Austin Fitzhugh", role: "Artistic Director" };

  // Grouping Logic for the Switcher
  const groupedShows = shows.reduce((groups, show) => {
    const season = show.season || 'Other';
    if (!groups[season]) groups[season] = [];
    groups[season].push(show);
    return groups;
  }, {} as Record<string, typeof shows>);
  const sortedSeasons = Object.keys(groupedShows).sort((a, b) => b.localeCompare(a));

  return (
    <>
      {/* --- THE STRIP (Always Visible) --- */}
      <header className="h-16 bg-zinc-950 border-b border-zinc-800 flex items-center justify-between px-4 shrink-0 relative z-50">
        
        {/* LEFT: THE ONE MENU BUTTON */}
        <div className="flex items-center gap-4">
            <button 
                onClick={() => setIsOpen(!isOpen)}
                className="p-2 -ml-2 rounded-full hover:bg-zinc-800 text-zinc-400 hover:text-white transition-colors"
            >
                {isOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
            
            {/* CURRENT CONTEXT LABEL (Non-clickable, just info) */}
            <div className="flex flex-col">
                <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Current Production</span>
                <span className="text-sm font-bold text-white truncate max-w-[200px] sm:max-w-md">
                    {activeShow.title}
                </span>
            </div>
        </div>

        {/* RIGHT: USER (Visual only, distinct from nav) */}
        <div className="flex items-center gap-3">
             <div className="hidden md:flex flex-col items-end leading-tight">
                <span className="text-xs font-semibold text-zinc-200">{user.name}</span>
                <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-tighter">{user.role}</span>
            </div>
            <div className="w-8 h-8 rounded-full bg-emerald-600 flex items-center justify-center text-xs font-bold text-white shadow-lg shadow-emerald-900/20">
                {user.initials}
            </div>
        </div>
      </header>

      {/* --- THE MEGA DRAWER (The "One Menu") --- */}
      {isOpen && (
        <div className="fixed inset-0 z-40 flex">
            {/* Backdrop */}
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200" onClick={() => setIsOpen(false)} />
            
            {/* Sidebar Content */}
            <div ref={menuRef} className="relative w-80 bg-zinc-900 h-full border-r border-zinc-800 shadow-2xl flex flex-col animate-in slide-in-from-left duration-300">
                
                {/* 1. CONTEXT SWITCHER SECTION */}
                <div className="p-4 border-b border-white/5">
                    <button 
                        onClick={() => setShowContextList(!showContextList)}
                        className="w-full bg-zinc-950 border border-zinc-800 p-3 rounded-xl flex items-center justify-between group hover:border-zinc-700 transition-all"
                    >
                        <div className="flex items-center gap-3 overflow-hidden">
                            <div className="w-8 h-8 rounded-lg bg-emerald-500/20 flex items-center justify-center text-emerald-500 shrink-0">
                                <LayoutGrid size={16}/>
                            </div>
                            <div className="text-left overflow-hidden">
                                <div className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider">Active Show</div>
                                <div className="text-xs font-bold text-white truncate group-hover:text-emerald-400 transition-colors">
                                    {activeShow.title}
                                </div>
                            </div>
                        </div>
                        <ChevronsUpDown size={14} className="text-zinc-600"/>
                    </button>

                    {/* EXPANDABLE SHOW LIST */}
                    {showContextList && (
                        <div className="mt-2 pl-2 space-y-4 max-h-60 overflow-y-auto custom-scrollbar animate-in slide-in-from-top-2">
                             {sortedSeasons.map(season => (
                                <div key={season}>
                                    <div className="px-2 py-1 text-[9px] font-black text-zinc-600 uppercase tracking-widest">{season}</div>
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
                    )}
                </div>

                {/* 2. NAVIGATION LINKS */}
                <div className="flex-1 overflow-y-auto p-4 space-y-6 custom-scrollbar">
                    
                    {/* Workspace */}
                    <div>
                        <SectionHeader label="Daily Workspace" />
                        <div className="space-y-1">
                            <MenuLink onClick={() => setIsOpen(false)} href="/schedule" icon={<Calendar size={18}/>} label="Scheduler" active={pathname === '/schedule'} />
                            <MenuLink onClick={() => setIsOpen(false)} href="/casting" icon={<Users size={18}/>} label="Casting" active={pathname === '/casting'} />
                        </div>
                    </div>

                    {/* Company Manager */}
                    <div>
                        <SectionHeader label="Company Manager" />
                        <div className="space-y-1">
                            <MenuLink onClick={() => setIsOpen(false)} href="/roster" icon={<UserSquare2 size={18}/>} label="Roster & Forms" active={pathname === '/roster'} />
                            <MenuLink onClick={() => setIsOpen(false)} href="/conflicts" icon={<AlertOctagon size={18}/>} label="Conflicts" active={pathname === '/conflicts'} />
                            <MenuLink onClick={() => setIsOpen(false)} href="/reports" icon={<BarChart3 size={18}/>} label="Reports" active={pathname === '/reports'} />
                        </div>
                    </div>

                    {/* System */}
                    <div>
                        <SectionHeader label="System" />
                        <div className="space-y-1">
                            <MenuLink onClick={() => setIsOpen(false)} href="/settings" icon={<Settings size={18}/>} label="Settings" active={pathname === '/settings'} />
                        </div>
                    </div>
                </div>

                {/* 3. FOOTER */}
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

// --- SUB-COMPONENTS ---

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
                ${active 
                    ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-900/20' 
                    : 'text-zinc-400 hover:bg-zinc-800 hover:text-white'}
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
  
  let dotColor = 'bg-emerald-500'; 
  if (prod.location?.includes('Stafford')) dotColor = 'bg-amber-500';
  if (prod.location?.includes('NoVa')) dotColor = 'bg-indigo-500';

  return (
    <button disabled={pending} className="w-full flex items-center gap-3 p-2 rounded-lg hover:bg-zinc-800 transition-all text-left group">
       <div className={`w-1.5 h-1.5 rounded-full ${dotColor}`} />
       <div className="flex-1 min-w-0">
          <div className={`text-xs truncate ${isActive ? 'text-white font-bold' : 'text-zinc-400 group-hover:text-zinc-200'}`}>
            {prod.title}
          </div>
       </div>
       {isActive && !pending && <Check size={12} className="text-emerald-500" />}
       {pending && <Sparkles size={12} className="text-emerald-500 animate-spin" />}
    </button>
  );
}