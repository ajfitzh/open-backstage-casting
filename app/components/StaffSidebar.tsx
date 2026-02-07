/* eslint-disable react-hooks/set-state-in-effect */
"use client";

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Settings, ChevronDown, ChevronRight, Home, Layers } from 'lucide-react';
import { hasPermission, Permission } from '@/app/lib/permissions'; 
import { useSimulation } from '@/app/context/SimulationContext'; 
import { NAV_CONFIG } from '@/app/lib/nav-config'; 
import { useSidebar } from '@/app/components/SidebarShell';

export default function StaffSidebar() {
  const pathname = usePathname();
  const { role: globalRole, productionRole, isSimulating } = useSimulation();
  const { isCollapsed } = useSidebar(); 

  const isCastingRoute = pathname.includes('/auditions') || pathname.includes('/callbacks') || pathname.includes('/casting');
  const [isCastingOpen, setCastingOpen] = useState(isCastingRoute);

  useEffect(() => {
    if (isCastingRoute) setCastingOpen(true);
  }, [pathname, isCastingRoute]);

  return (
    <nav className={`w-full flex flex-col h-full bg-zinc-900 transition-all duration-300 ${isSimulating ? 'border-r-4 border-red-500/30' : ''}`}>
      
      {/* HEADER LOGO */}
      <Link href="/" className={`h-16 flex items-center border-b border-white/5 mb-4 shrink-0 hover:bg-white/5 transition-colors group ${isCollapsed ? 'justify-center px-0' : 'px-6'}`}>
        {isCollapsed ? (
            // Mini Logo
            <div className="flex items-center justify-center w-10 h-10 bg-blue-500/10 rounded-lg text-blue-500">
                <Layers size={24} />
            </div>
        ) : (
            // Full Logo
            <div className="flex flex-col">
                <h1 className="text-sm font-black tracking-tighter text-blue-500 group-hover:text-blue-400 transition-colors">
                OPEN<span className="text-white">BACKSTAGE</span>
                </h1>
                <span className="text-[9px] font-bold text-zinc-600 uppercase tracking-widest group-hover:text-zinc-500">
                    {isSimulating ? <span className="text-red-500 animate-pulse">GOD MODE ACTIVE</span> : "Staff Portal"}
                </span>
            </div>
        )}
      </Link>

      <div className="flex-1 overflow-y-auto px-3 space-y-6 custom-scrollbar">
        
        {NAV_CONFIG.map((section, idx) => {
           // FIX 1: Cast permission to strict type
           if (section.permission && !hasPermission(globalRole, productionRole, section.permission as Permission)) return null;

           // Dashboard Special Case
           if (section.title === "Dashboard") {
               return (
                  <div key={idx} className="space-y-1">
                     <NavItem 
                        href="/" 
                        icon={<Home size={18}/>} 
                        label="Dashboard" 
                        active={pathname === '/'} 
                        isCollapsed={isCollapsed} 
                     />
                  </div>
               )
           }

           return (
             <div key={idx} className="animate-in slide-in-from-left-2 duration-300">
                {/* Section Title - Hide if Collapsed */}
                {!isCollapsed && (
                    <div className={`text-[10px] font-black uppercase tracking-widest mb-2 px-2 flex items-center gap-2 truncate ${section.color || 'text-zinc-500'}`}>
                        {section.title}
                    </div>
                )}
                {/* If collapsed, just show a divider line to separate sections */}
                {isCollapsed && <div className="h-px bg-white/5 w-1/2 mx-auto mb-2" />}

                <div className="space-y-1">
                    {section.items.map((item: any) => {
                        // FIX 1: Cast permission
                        if (item.permission && !hasPermission(globalRole, productionRole, item.permission as Permission)) return null;

                        // Collapsible Group (e.g. Casting)
                        if (item.isCollapsible && item.children) {
                            return (
                                <div key={item.label}>
                                    <button 
                                        onClick={() => setCastingOpen(!isCastingOpen)}
                                        className={`
                                            w-full flex items-center px-3 py-2 rounded-lg text-xs font-bold transition-all
                                            ${isCollapsed ? 'justify-center' : 'justify-between'}
                                            ${isCastingRoute ? 'text-white' : 'text-zinc-400 hover:bg-white/5 hover:text-zinc-200'}
                                        `}
                                        title={isCollapsed ? item.label : undefined}
                                    >
                                        <div className="flex items-center">
                                            <item.icon size={18} className={`shrink-0 ${isCastingRoute ? "text-purple-400" : "text-zinc-500"}`}/>
                                            {/* FIX 2: Better Text Animation Logic */}
                                            <span className={`overflow-hidden transition-all duration-300 ease-in-out whitespace-nowrap ${isCollapsed ? 'w-0 opacity-0 ml-0' : 'w-auto opacity-100 ml-3'}`}>
                                                {item.label}
                                            </span>
                                        </div>
                                        {/* Hide Chevron if collapsed */}
                                        {!isCollapsed && (
                                            isCastingOpen ? <ChevronDown size={14}/> : <ChevronRight size={14}/>
                                        )}
                                    </button>
                                    
                                    {/* Sub Items */}
                                    {isCastingOpen && (
                                        <div className={`
                                            mt-1 space-y-1 animate-in slide-in-from-left-2 duration-200
                                            ${isCollapsed ? 'ml-0 flex flex-col items-center' : 'ml-4 pl-4 border-l border-white/10'}
                                        `}>
                                            {item.children.map((child: any) => (
                                                (!child.permission || hasPermission(globalRole, productionRole, child.permission as Permission)) && (
                                                    <SubNavItem 
                                                        key={child.href}
                                                        href={child.href} 
                                                        icon={<child.icon size={14}/>} 
                                                        label={child.label} 
                                                        active={pathname === child.href} 
                                                        isCollapsed={isCollapsed}
                                                    />
                                                )
                                            ))}
                                        </div>
                                    )}
                                </div>
                            );
                        }

                        // Standard Item
                        return (
                            <NavItem 
                                key={item.href}
                                href={item.href} 
                                icon={<item.icon size={18}/>} 
                                label={item.label} 
                                active={pathname === item.href} 
                                isCollapsed={isCollapsed}
                            />
                        );
                    })}
                </div>
             </div>
           );
        })}

      </div>

      <div className="p-3 border-t border-white/5">
        <NavItem 
            href="/settings" 
            icon={<Settings size={18}/>} 
            label="System Settings" 
            active={pathname === '/settings'} 
            isCollapsed={isCollapsed}
        />
      </div>
    </nav>
  );
}

// ----------------------------------------------------------------------
// HELPER COMPONENTS (FIXED ANIMATIONS)
// ----------------------------------------------------------------------

function NavItem({ href, icon, label, active, isCollapsed }: any) {
    return (
        <Link 
            href={href} 
            title={isCollapsed ? label : undefined}
            className={`
                flex items-center px-3 py-2 rounded-lg text-xs font-bold transition-all
                ${isCollapsed ? 'justify-center' : ''}
                ${active 
                    ? 'bg-zinc-800 text-white border border-white/5 shadow-sm' 
                    : 'text-zinc-400 hover:bg-white/5 hover:text-zinc-200 border border-transparent'}
            `}
        >
            <div className="shrink-0">{icon}</div>
            
            {/* FIX 2: Use CSS transitions instead of unmounting */}
            <span className={`
                overflow-hidden whitespace-nowrap transition-all duration-300 ease-in-out
                ${isCollapsed ? 'w-0 opacity-0 ml-0' : 'w-auto opacity-100 ml-3'}
            `}>
                {label}
            </span>
        </Link>
    )
}

function SubNavItem({ href, icon, label, active, isCollapsed }: any) {
    return (
        <Link 
            href={href} 
            title={isCollapsed ? label : undefined}
            className={`
                flex items-center px-3 py-2 rounded-lg text-xs font-medium transition-all
                ${isCollapsed ? 'justify-center w-full' : ''}
                ${active 
                    ? 'text-white bg-white/5' 
                    : 'text-zinc-500 hover:text-zinc-300'}
            `}
        >
            <div className="shrink-0">{icon}</div>
            
            {/* FIX 2: Use CSS transitions instead of unmounting */}
            <span className={`
                overflow-hidden whitespace-nowrap transition-all duration-300 ease-in-out
                ${isCollapsed ? 'w-0 opacity-0 ml-0' : 'w-auto opacity-100 ml-3'}
            `}>
                {label}
            </span>
        </Link>
    )
}