"use client";

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { 
  Users, Calendar, UserSquare2, 
  AlertOctagon, BarChart3, VenetianMask, 
  Settings
} from 'lucide-react';

export default function SideNav() {
  const pathname = usePathname();

  return (
    <nav className="w-56 bg-zinc-900 border-r border-white/5 flex flex-col h-full shrink-0 hidden md:flex">
      
      {/* SECTION 1: PRODUCTION */}
      <div className="p-4">
        <div className="text-[10px] font-black text-zinc-600 uppercase tracking-widest mb-2 px-2">
            Production
        </div>
        <div className="space-y-0.5">
            <NavItem href="/schedule" icon={<Calendar size={16}/>} label="Scheduler" active={pathname === '/schedule'} />
            <NavItem href="/casting" icon={<Users size={16}/>} label="Casting" active={pathname === '/casting'} />
        </div>
      </div>

      {/* SECTION 2: COMPANY */}
      <div className="px-4 pb-4">
        <div className="text-[10px] font-black text-zinc-600 uppercase tracking-widest mb-2 px-2">
            Company Manager
        </div>
        <div className="space-y-0.5">
            <NavItem href="/roster" icon={<UserSquare2 size={16}/>} label="Roster & Forms" active={pathname === '/roster'} />
            <NavItem href="/conflicts" icon={<AlertOctagon size={16}/>} label="Conflicts" active={pathname === '/conflicts'} />
            <NavItem href="/committees" icon={<VenetianMask size={16}/>} label="Committees" active={pathname === '/committees'} />
            <NavItem href="/reports" icon={<BarChart3 size={16}/>} label="Reports" active={pathname === '/reports'} />
        </div>
      </div>

      {/* SECTION 3: SYSTEM */}
      <div className="mt-auto p-4 border-t border-white/5">
        <NavItem href="/settings" icon={<Settings size={16}/>} label="Settings" active={pathname === '/settings'} />
      </div>

    </nav>
  );
}

function NavItem({ href, icon, label, active }: any) {
    return (
        <Link 
            href={href} 
            className={`
                flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-bold transition-all
                ${active 
                    ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' 
                    : 'text-zinc-400 hover:bg-white/5 hover:text-zinc-200 border border-transparent'}
            `}
        >
            {icon}
            {label}
        </Link>
    )
}