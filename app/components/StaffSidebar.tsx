/* eslint-disable react-hooks/set-state-in-effect */
"use client";

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Settings, ChevronDown, ChevronRight, Home } from 'lucide-react';
import { hasPermission } from '@/app/lib/permissions'; 
import { useSimulation } from '@/app/context/SimulationContext'; 
import { NAV_CONFIG } from '@/app/lib/nav-config'; 

export default function StaffSidebar() {
  const pathname = usePathname();
  const { role: globalRole, productionRole, isSimulating } = useSimulation();

  const isCastingRoute = pathname.includes('/auditions') || pathname.includes('/callbacks') || pathname.includes('/casting');
  const [isCastingOpen, setCastingOpen] = useState(isCastingRoute);

  useEffect(() => {
    if (isCastingRoute) setCastingOpen(true);
  }, [pathname, isCastingRoute]);

  return (
    <nav className={`w-64 bg-zinc-900 border-r border-white/5 flex flex-col h-full shrink-0 transition-colors duration-500 ${isSimulating ? 'border-red-500/30' : ''}`}>
      
      {/* HEADER LOGO */}
      <Link href="/" className="h-16 flex items-center px-6 border-b border-white/5 mb-4 shrink-0 hover:bg-white/5 transition-colors group">
        <div className="flex flex-col">
            <h1 className="text-sm font-black tracking-tighter text-blue-500 group-hover:text-blue-400 transition-colors">
            OPEN<span className="text-white">BACKSTAGE</span>
            </h1>
            <span className="text-[9px] font-bold text-zinc-600 uppercase tracking-widest group-hover:text-zinc-500">
                {isSimulating ? <span className="text-red-500 animate-pulse">GOD MODE ACTIVE</span> : "Staff Portal"}
            </span>
        </div>
      </Link>

      <div className="flex-1 overflow-y-auto px-4 space-y-8 custom-scrollbar">
        
        {NAV_CONFIG.map((section, idx) => {
           // 1. Check Section Permissions
           if (section.permission && !hasPermission(globalRole, productionRole, section.permission)) return null;

           // 2. Render Dashboard separately (no header)
           if (section.title === "Dashboard") {
               return (
                  <div key={idx} className="space-y-1">
                     <NavItem href="/" icon={<Home size={18}/>} label="Dashboard" active={pathname === '/'} />
                  </div>
               )
           }

           return (
             <div key={idx} className="animate-in slide-in-from-left-2 duration-300">
                <div className={`text-[10px] font-black uppercase tracking-widest mb-2 px-2 flex items-center gap-2 ${section.color || 'text-zinc-500'}`}>
                    {section.title}
                </div>
                <div className="space-y-1">
                    {section.items.map((item: any) => {
                        // 3. Check Item Permissions
                        if (item.permission && !hasPermission(globalRole, productionRole, item.permission)) return null;

                        // 4. Handle Collapsible (Casting Suite)
                        if (item.isCollapsible && item.children) {
                            return (
                                <div key={item.label}>
                                    <button 
                                        onClick={() => setCastingOpen(!isCastingOpen)}
                                        className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-bold transition-all ${isCastingRoute ? 'text-white' : 'text-zinc-400 hover:bg-white/5 hover:text-zinc-200'}`}
                                    >
                                        <div className="flex items-center gap-3">
                                            <item.icon size={18} className={isCastingRoute ? "text-purple-400" : "text-zinc-500"}/>
                                            <span>{item.label}</span>
                                        </div>
                                        {isCastingOpen ? <ChevronDown size={14}/> : <ChevronRight size={14}/>}
                                    </button>
                                    
                                    {isCastingOpen && (
                                        <div className="mt-1 ml-4 pl-4 border-l border-white/10 space-y-1 animate-in slide-in-from-left-2 duration-200">
                                            {item.children.map((child: any) => (
                                                (!child.permission || hasPermission(globalRole, productionRole, child.permission)) && (
                                                    <SubNavItem 
                                                        key={child.href}
                                                        href={child.href} 
                                                        icon={<child.icon size={14}/>} 
                                                        label={child.label} 
                                                        active={pathname === child.href} 
                                                    />
                                                )
                                            ))}
                                        </div>
                                    )}
                                </div>
                            );
                        }

                        // 5. Standard Item
                        return (
                            <NavItem 
                                key={item.href}
                                href={item.href} 
                                icon={<item.icon size={18}/>} 
                                label={item.label} 
                                active={pathname === item.href} 
                            />
                        );
                    })}
                </div>
             </div>
           );
        })}

      </div>

      <div className="p-4 border-t border-white/5">
        <NavItem href="/settings" icon={<Settings size={18}/>} label="System Settings" active={pathname === '/settings'} />
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