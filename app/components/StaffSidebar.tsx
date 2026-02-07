/* eslint-disable react-hooks/set-state-in-effect */
"use client";

import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
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
            <div className="flex items-center justify-center w-10 h-10 bg-blue-500/10 rounded-lg text-blue-500">
                <Layers size={24} />
            </div>
        ) : (
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
                {!isCollapsed && (
                    <div className={`text-[10px] font-black uppercase tracking-widest mb-2 px-2 flex items-center gap-2 truncate ${section.color || 'text-zinc-500'}`}>
                        {section.title}
                    </div>
                )}
                {isCollapsed && <div className="h-px bg-white/5 w-1/2 mx-auto mb-2" />}

                <div className="space-y-1">
                    {section.items.map((item: any) => {
                        if (item.permission && !hasPermission(globalRole, productionRole, item.permission as Permission)) return null;

                        // Collapsible Group
                        if (item.isCollapsible && item.children) {
                            return (
                                <div key={item.label}>
                                    <SidebarTooltip text={item.label} isCollapsed={isCollapsed}>
                                        <button 
                                            onClick={() => setCastingOpen(!isCastingOpen)}
                                            className={`
                                                w-full flex items-center px-3 py-2 rounded-lg text-xs font-bold transition-all
                                                ${isCollapsed ? 'justify-center' : 'justify-between'}
                                                ${isCastingRoute ? 'text-white' : 'text-zinc-400 hover:bg-white/5 hover:text-zinc-200'}
                                            `}
                                        >
                                            <div className="flex items-center">
                                                <item.icon size={18} className={`shrink-0 ${isCastingRoute ? "text-purple-400" : "text-zinc-500"}`}/>
                                                <span className={`overflow-hidden transition-all duration-300 ease-in-out whitespace-nowrap ${isCollapsed ? 'w-0 opacity-0 ml-0' : 'w-auto opacity-100 ml-3'}`}>
                                                    {item.label}
                                                </span>
                                            </div>
                                            {!isCollapsed && (
                                                isCastingOpen ? <ChevronDown size={14}/> : <ChevronRight size={14}/>
                                            )}
                                        </button>
                                    </SidebarTooltip>
                                    
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
// COMPONENT: NAV ITEM (Wrapped in Tooltip)
// ----------------------------------------------------------------------

function NavItem({ href, icon, label, active, isCollapsed }: any) {
    return (
        <SidebarTooltip text={label} isCollapsed={isCollapsed}>
            <Link 
                href={href} 
                className={`
                    flex items-center px-3 py-2 rounded-lg text-xs font-bold transition-all relative
                    ${isCollapsed ? 'justify-center' : ''}
                    ${active 
                        ? 'bg-zinc-800 text-white border border-white/5 shadow-sm' 
                        : 'text-zinc-400 hover:bg-white/5 hover:text-zinc-200 border border-transparent'}
                `}
            >
                <div className="shrink-0">{icon}</div>
                <span className={`
                    overflow-hidden whitespace-nowrap transition-all duration-300 ease-in-out
                    ${isCollapsed ? 'w-0 opacity-0 ml-0' : 'w-auto opacity-100 ml-3'}
                `}>
                    {label}
                </span>
            </Link>
        </SidebarTooltip>
    )
}

function SubNavItem({ href, icon, label, active, isCollapsed }: any) {
    return (
        <SidebarTooltip text={label} isCollapsed={isCollapsed}>
            <Link 
                href={href} 
                className={`
                    flex items-center px-3 py-2 rounded-lg text-xs font-medium transition-all relative
                    ${isCollapsed ? 'justify-center w-full' : ''}
                    ${active 
                        ? 'text-white bg-white/5' 
                        : 'text-zinc-500 hover:text-zinc-300'}
                `}
            >
                <div className="shrink-0">{icon}</div>
                <span className={`
                    overflow-hidden whitespace-nowrap transition-all duration-300 ease-in-out
                    ${isCollapsed ? 'w-0 opacity-0 ml-0' : 'w-auto opacity-100 ml-3'}
                `}>
                    {label}
                </span>
            </Link>
        </SidebarTooltip>
    )
}

// ----------------------------------------------------------------------
// HELPER: FLOATING TOOLTIP PORTAL
// ----------------------------------------------------------------------

function SidebarTooltip({ children, text, isCollapsed }: { children: React.ReactElement, text: string, isCollapsed: boolean }) {
    const [coords, setCoords] = useState<{ x: number, y: number } | null>(null);
    const [isHovered, setIsHovered] = useState(false);

    // Only enable if collapsed
    if (!isCollapsed) return children;

    const handleMouseEnter = (e: React.MouseEvent) => {
        const rect = e.currentTarget.getBoundingClientRect();
        setCoords({
            x: rect.right + 10, // 10px offset from right of sidebar
            y: rect.top + (rect.height / 2) // Centered vertically
        });
        setIsHovered(true);
    };

    const handleMouseLeave = () => {
        setIsHovered(false);
    };

    return (
        <>
            {React.cloneElement(children, {
                onMouseEnter: handleMouseEnter,
                onMouseLeave: handleMouseLeave
            })}
            
            {isHovered && coords && createPortal(
                <div 
                    className="fixed z-[9999] px-2 py-1 bg-zinc-900 text-white text-[10px] font-bold rounded border border-white/10 shadow-xl animate-in fade-in zoom-in-95 duration-100 whitespace-nowrap pointer-events-none"
                    style={{
                        top: coords.y,
                        left: coords.x,
                        transform: 'translateY(-50%)'
                    }}
                >
                    {text}
                    {/* Tiny Arrow pointing left */}
                    <div className="absolute top-1/2 -left-1 w-2 h-2 bg-zinc-900 border-l border-b border-white/10 -translate-y-1/2 rotate-45" />
                </div>,
                document.body
            )}
        </>
    );
}