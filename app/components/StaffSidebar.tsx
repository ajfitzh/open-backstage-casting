"use client";

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { 
  Users, Calendar, UserSquare2, 
  AlertOctagon, BarChart3, VenetianMask, 
  Settings, ChevronDown, ChevronRight,
  Mic2, Megaphone, LayoutGrid, GraduationCap
} from 'lucide-react';

export default function StaffSidebar() {
  const pathname = usePathname();
  
  // Auto-expand Casting Suite if we are inside it
  const isCastingRoute = pathname.includes('/auditions') || pathname.includes('/callbacks') || pathname.includes('/casting');
  const [isCastingOpen, setCastingOpen] = useState(isCastingRoute);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (isCastingRoute) setCastingOpen(true);
  }, [pathname, isCastingRoute]);

  return (
    <nav className="w-64 bg-zinc-900 border-r border-white/5 flex flex-col h-full shrink-0">
      
      {/* BRAND HEADER */}
      <div className="h-16 flex items-center px-6 border-b border-white/5 mb-4 shrink-0">
        <h1 className="text-sm font-black tracking-tighter text-blue-500">
          OPEN<span className="text-white">BACKSTAGE</span>
        </h1>
      </div>

      <div className="flex-1 overflow-y-auto px-4 space-y-8 custom-scrollbar">
        
        {/* --- ZONE 1: CREATIVE TEAM --- */}
        <div>
            <div className="text-[10px] font-black text-blue-500 uppercase tracking-widest mb-2 px-2 flex items-center gap-2">
                Creative Team
            </div>
            <div className="space-y-1">
                <NavItem href="/schedule" icon={<Calendar size={18}/>} label="Scheduler" active={pathname === '/schedule'} />
                
                {/* Collapsible Casting Suite */}
                <div>
                    <button 
                        onClick={() => setCastingOpen(!isCastingOpen)}
                        className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-bold transition-all ${isCastingRoute ? 'text-white' : 'text-zinc-400 hover:bg-white/5 hover:text-zinc-200'}`}
                    >
                        <div className="flex items-center gap-3">
                            <Users size={18} className={isCastingRoute ? "text-purple-400" : "text-zinc-500"}/>
                            <span>Casting Suite</span>
                        </div>
                        {isCastingOpen ? <ChevronDown size={14}/> : <ChevronRight size={14}/>}
                    </button>

                    {isCastingOpen && (
                        <div className="mt-1 ml-4 pl-4 border-l border-white/10 space-y-1 animate-in slide-in-from-left-2 duration-200">
                            <SubNavItem href="/auditions" icon={<Mic2 size={14}/>} label="Auditions" active={pathname === '/auditions'} />
                            <SubNavItem href="/callbacks" icon={<Megaphone size={14}/>} label="Callbacks" active={pathname === '/callbacks'} />
                            <SubNavItem href="/casting" icon={<LayoutGrid size={14}/>} label="Cast Grid" active={pathname === '/casting'} />
                        </div>
                    )}
                </div>
            </div>
        </div>

        {/* --- ZONE 2: LOGISTICS & OPS --- */}
        <div>
            <div className="text-[10px] font-black text-emerald-500 uppercase tracking-widest mb-2 px-2 flex items-center gap-2">
                Logistics & Ops
            </div>
            <div className="space-y-1">
                <NavItem href="/roster" icon={<UserSquare2 size={18}/>} label="Master Roster" active={pathname === '/roster'} />
                <NavItem href="/conflicts" icon={<AlertOctagon size={18}/>} label="Conflict Matrix" active={pathname === '/conflicts'} />
                <NavItem href="/committees" icon={<VenetianMask size={18}/>} label="Committees" active={pathname === '/committees'} />
            </div>
        </div>

        {/* --- ZONE 3: BUSINESS OFFICE --- */}
        <div>
            <div className="text-[10px] font-black text-amber-500 uppercase tracking-widest mb-2 px-2 flex items-center gap-2">
                Business Office
            </div>
            <div className="space-y-1">
                <NavItem href="/reports" icon={<BarChart3 size={18}/>} label="Reports & Fees" active={pathname === '/reports'} />
            </div>
        </div>

        {/* --- ZONE 4: ACADEMY --- */}
        <div>
            <div className="text-[10px] font-black text-pink-500 uppercase tracking-widest mb-2 px-2 flex items-center gap-2">
                Academy
            </div>
            <div className="space-y-1">
                <NavItem href="/education" icon={<GraduationCap size={18}/>} label="Class Manager" active={pathname === '/education'} />
            </div>
        </div>

      </div>

      {/* FOOTER */}
      <div className="p-4 border-t border-white/5">
        <NavItem href="/settings" icon={<Settings size={18}/>} label="System Settings" active={pathname === '/settings'} />
      </div>

    </nav>
  );
}

// --- SUB-COMPONENTS ---

function NavItem({ href, icon, label, active }: any) {
    return (
        <Link 
            href={href} 
            className={`
                flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-bold transition-all
                ${active 
                    ? 'bg-zinc-800 text-white border border-white/5 shadow-sm' 
                    : 'text-zinc-400 hover:bg-white/5 hover:text-zinc-200 border border-transparent'}
            `}
        >
            {icon}
            {label}
        </Link>
    )
}

function SubNavItem({ href, icon, label, active }: any) {
    return (
        <Link 
            href={href} 
            className={`
                flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-medium transition-all
                ${active 
                    ? 'text-white bg-white/5' 
                    : 'text-zinc-500 hover:text-zinc-300'}
            `}
        >
            {icon}
            {label}
        </Link>
    )
}