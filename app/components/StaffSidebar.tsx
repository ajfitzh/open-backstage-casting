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

interface StaffSidebarProps {
  activeProductionId?: string | number;
  userGroups?: string[];
}

export default function StaffSidebar({ activeProductionId, userGroups = [] }: StaffSidebarProps) {
  const pathname = usePathname();
  const { role: globalRole, productionRole, isSimulating } = useSimulation();
  const { isCollapsed } = useSidebar(); 

  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({});

  // 🟢 FIX 1: A bulletproof RBAC evaluation helper to stop truthy/falsy bugs
  const canSee = (entity: any) => {
      // If it has neither, everyone sees it
      if (!entity.permission && !entity.group) return true;
      
      // If it has a permission and you pass it, you see it
      if (entity.permission && hasPermission(globalRole, productionRole, entity.permission as Permission)) return true;
      
      // If it has a group and you are in it, you see it
      if (entity.group && userGroups.includes(entity.group)) return true;
      
      // Otherwise, hide it.
      return false;
  };

  // 🟢 FIX 2: Helper to accurately determine if a path is active, even in multi-tenant URLs
  const isPathActive = (href: string) => {
      if (!pathname) return false;
      if (href === '/') return pathname === '/';
      return pathname.includes(href);
  };

  useEffect(() => {
    NAV_CONFIG.forEach(section => {
        section.items.forEach((item: any) => {
            if (item.children) {
                // Now uses the safer isPathActive check
                const isChildActive = item.children.some((child: any) => isPathActive(child.href));
                if (isChildActive) {
                    setOpenGroups(prev => ({ ...prev, [item.label]: true }));
                }
            }
        });
    });
  }, [pathname]);

  const toggleGroup = (label: string) => {
    setOpenGroups(prev => ({ ...prev, [label]: !prev[label] }));
  };

  const getFinalHref = (href: string) => {
    if (!href) return "/";
    return activeProductionId 
      ? href.replace('/active/', `/${activeProductionId}/`) 
      : href;
  };

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
           if (!canSee(section)) return null;

           if (section.title === "Dashboard") {
               return (
                  <div key={idx} className="space-y-1">
                     <NavItem href="/" icon={<Home size={18}/>} label="Dashboard" active={isPathActive('/')} isCollapsed={isCollapsed} />
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
                        // Using the new helper
                        if (!canSee(item)) return null;

                        const itemHref = getFinalHref(item.href);

                        if (item.isCollapsible && item.children) {
                            const isGroupOpen = openGroups[item.label] || false;
                            const isGroupActive = item.children.some((child: any) => isPathActive(child.href));

                            // Validate children using the new helper
                            const validChildren = item.children.filter((child: any) => canSee(child));

                            if (validChildren.length === 0) return null;

                            if (isCollapsed) {
                                return (
                                    <FlyoutMenu 
                                        key={item.label}
                                        label={item.label}
                                        icon={item.icon}
                                        active={isGroupActive}
                                        items={validChildren.map((c: any) => ({ ...c, href: getFinalHref(c.href) }))}
                                        pathname={pathname}
                                    />
                                );
                            }

                            return (
                                <div key={item.label}>
                                    <button 
                                        onClick={() => toggleGroup(item.label)}
                                        className={`w-full flex items-center px-3 py-2 rounded-lg text-xs font-bold transition-all justify-between ${isGroupActive ? 'text-white' : 'text-zinc-400 hover:bg-white/5 hover:text-zinc-200'}`}
                                    >
                                        <div className="flex items-center">
                                            <item.icon size={18} className={`shrink-0 ${isGroupActive ? "text-purple-400" : "text-zinc-500"}`}/>
                                            <span className="ml-3 truncate">{item.label}</span>
                                        </div>
                                        {isGroupOpen ? <ChevronDown size={14}/> : <ChevronRight size={14}/>}
                                    </button>
                                    {isGroupOpen && (
                                        <div className="mt-1 space-y-1 ml-4 pl-4 border-l border-white/10 animate-in slide-in-from-left-2 duration-200">
                                            {validChildren.map((child: any) => (
                                                <SubNavItem key={child.href} href={getFinalHref(child.href)} icon={<child.icon size={14}/>} label={child.label} active={isPathActive(child.href)} isCollapsed={false} />
                                            ))}
                                        </div>
                                    )}
                                </div>
                            );
                        }

                        return (
                            <NavItem key={itemHref} href={itemHref} icon={<item.icon size={18}/>} label={item.label} active={isPathActive(item.href)} isCollapsed={isCollapsed} />
                        );
                    })}
                </div>
             </div>
           );
        })}
      </div>

      <div className="p-3 border-t border-white/5">
        <NavItem href="/settings" icon={<Settings size={18}/>} label="System Settings" active={isPathActive('/settings')} isCollapsed={isCollapsed} />
      </div>
    </nav>
  );
}

// ... Sub-components Below ...
function FlyoutMenu({ label, icon: Icon, active, items, pathname }: any) {
    const [isOpen, setIsOpen] = useState(false);
    const [coords, setCoords] = useState({ x: 0, y: 0 });
    const timeoutRef = useRef<NodeJS.Timeout | null>(null);

    const handleMouseEnter = (e: React.MouseEvent) => {
        if (timeoutRef.current) clearTimeout(timeoutRef.current);
        const rect = e.currentTarget.getBoundingClientRect();
        setCoords({ x: rect.right + 8, y: rect.top });
        setIsOpen(true);
    };

    const handleMouseLeave = () => {
        timeoutRef.current = setTimeout(() => setIsOpen(false), 100); 
    };

    return (
        <div 
            onMouseEnter={handleMouseEnter} 
            onMouseLeave={handleMouseLeave} 
            className="w-full relative"
        >
            <button 
                className={`
                    w-full flex items-center justify-center px-3 py-2 rounded-lg text-xs font-bold transition-all
                    ${active ? 'text-white bg-white/5' : 'text-zinc-400 hover:bg-white/5 hover:text-zinc-200'}
                `}
            >
                <Icon size={18} className={active ? "text-purple-400" : "text-zinc-500"}/>
            </button>

            {isOpen && createPortal(
                <div 
                    onMouseEnter={() => { if (timeoutRef.current) clearTimeout(timeoutRef.current); }}
                    onMouseLeave={() => setIsOpen(false)}
                    style={{ top: coords.y, left: coords.x }}
                    className="fixed z-[9999] bg-zinc-900 border border-zinc-700 rounded-lg shadow-2xl p-2 w-48 animate-in fade-in zoom-in-95 duration-100"
                >
                    <div className="px-3 py-2 text-xs font-black text-zinc-500 uppercase tracking-widest border-b border-white/5 mb-1">
                        {label}
                    </div>
                    <div className="flex flex-col gap-1">
                        {items.map((child: any) => {
                            const isActive = pathname?.includes(child.href);
                            const ChildIcon = child.icon;
                            return (
                                <Link 
                                    key={child.href}
                                    href={child.href}
                                    onClick={() => setIsOpen(false)}
                                    className={`
                                        flex items-center gap-3 px-3 py-2 rounded-md text-xs font-medium transition-colors
                                        ${isActive 
                                            ? 'bg-zinc-800 text-white' 
                                            : 'text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200'}
                                    `}
                                >
                                    <ChildIcon size={14} />
                                    {child.label}
                                </Link>
                            )
                        })}
                    </div>
                    <div className="absolute top-4 -left-1 w-2 h-2 bg-zinc-900 border-l border-b border-zinc-700 rotate-45" />
                </div>,
                document.body
            )}
        </div>
    );
}

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
            <span className="ml-3 truncate">{label}</span>
        </Link>
    )
}

function SidebarTooltip({ children, text, isCollapsed }: { children: React.ReactElement, text: string, isCollapsed: boolean }) {
    const [coords, setCoords] = useState<{ x: number, y: number } | null>(null);
    const [isHovered, setIsHovered] = useState(false);

    if (!isCollapsed) return children;

    return (
        <div 
            onMouseEnter={(e: React.MouseEvent) => {
                const rect = e.currentTarget.getBoundingClientRect();
                setCoords({ x: rect.right + 10, y: rect.top + (rect.height / 2) });
                setIsHovered(true);
            }}
            onMouseLeave={() => setIsHovered(false)}
            className="w-full relative"
        >
            {children}
            {isHovered && coords && createPortal(
                <div 
                    className="fixed z-[9999] px-2 py-1 bg-zinc-900 text-white text-[10px] font-bold rounded border border-white/10 shadow-xl animate-in fade-in zoom-in-95 duration-100 whitespace-nowrap pointer-events-none"
                    style={{ top: coords.y, left: coords.x, transform: 'translateY(-50%)' }}
                >
                    {text}
                    <div className="absolute top-1/2 -left-1 w-2 h-2 bg-zinc-900 border-l border-b border-white/10 -translate-y-1/2 rotate-45" />
                </div>,
                document.body
            )}
        </div>
    );
}