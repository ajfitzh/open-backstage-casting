"use client";

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Users, Mic2, Layers, Calendar } from 'lucide-react';

export default function CastingSidebar() {
  const pathname = usePathname();

  return (
    <nav className="w-56 bg-zinc-900 border-r border-white/5 flex flex-col h-full shrink-0 hidden md:flex">
      
      {/* HEADER LABEL */}
      <div className="p-4">
        <div className="text-[10px] font-black text-zinc-600 uppercase tracking-widest mb-2 px-2">
            Casting Deck
        </div>
        
        {/* NAV LINKS */}
        <div className="space-y-0.5">
            <NavItem 
                href="/casting" 
                icon={<Users size={16}/>} 
                label="Dashboard" 
                active={pathname === '/casting'} 
            />
            <NavItem 
                href="/auditions" 
                icon={<Mic2 size={16}/>} 
                label="Auditions" 
                active={pathname.startsWith('/auditions')} 
            />
            <NavItem 
                href="/callbacks" 
                icon={<Layers size={16}/>} 
                label="Callbacks" 
                active={pathname.startsWith('/callbacks')} 
            />
            <NavItem 
                href="/conflicts" 
                icon={<Calendar size={16}/>} 
                label="Conflicts" 
                active={pathname.startsWith('/conflicts')} 
            />
        </div>
      </div>

    </nav>
  );
}

// --- SUB-COMPONENT: SHARED NAV ITEM STYLE ---
function NavItem({ href, icon, label, active }: any) {
    return (
        <Link 
            href={href} 
            className={`
                flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-bold transition-all
                ${active 
                    ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20' 
                    : 'text-zinc-400 hover:bg-white/5 hover:text-zinc-200 border border-transparent'}
            `}
        >
            {icon}
            {label}
        </Link>
    )
}