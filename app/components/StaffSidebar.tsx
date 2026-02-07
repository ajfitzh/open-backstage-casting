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

  // Accordion State for Expanded Mode
  // We track which groups are open by their label
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({});

  // Auto-expand the group if we are on a child route
  useEffect(() => {
    NAV_CONFIG.forEach(section => {
        section.items.forEach((item: any) => {
            if (item.children) {
                const isChildActive = item.children.some((child: any) => pathname.includes(child.href));
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

                        // ------------------------------------------------
                        // COLLAPSIBLE GROUP LOGIC
                        // ------------------------------------------------
                        if (item.isCollapsible && item.children) {
                            const isGroupOpen = openGroups[item.label] || false;
                            const isGroupActive = item.children.some((child: any) => pathname.includes(child.href));

                            // FILTER CHILDREN PERMISSIONS
                            const validChildren = item.children.filter((child: any) => 
                                !child.permission || hasPermission(globalRole, productionRole, child.permission as Permission)
                            );

                            if (validChildren.length === 0) return null;

                            // IF COLLAPSED: Use the Flyout Menu
                            if (isCollapsed) {
                                return (
                                    <FlyoutMenu 
                                        key={item.label}
                                        label={item.label}
                                        icon={item.icon}
                                        active={isGroupActive}
                                        items={validChildren}
                                        pathname={pathname}
                                    />
                                );
                            }

                            // IF EXPANDED: Use Standard Accordion
                            return (
                                <div key={item.label}>
                                    <button 
                                        onClick={() => toggleGroup(item.label)}
                                        className={`
                                            w-full flex items-center px-3 py-2 rounded-lg text-xs font-bold transition-all
                                            justify-between
                                            ${isGroupActive ? 'text-white' : 'text-zinc-400 hover:bg-white/5 hover:text-zinc-200'}
                                        `}
                                    >
                                        <div className="flex items-center">
                                            <item.icon size={18} className={`shrink-0 ${isGroupActive ? "text-purple-400" : "text-zinc-500"}`}/>
                                            <span className="ml-3 whitespace-nowrap overflow-hidden transition-all duration-300">
                                                {item.label}
                                            </span>
                                        </div>
                                        {isGroupOpen ? <ChevronDown size={14}/> : <ChevronRight size={14}/>}
                                    </button>
                                    
                                    {isGroupOpen && (
                                        <div className="mt-1 space-y-1 ml-4 pl-4 border-l border-white/10 animate-in slide-in-from-left-2 duration-200">
                                            {validChildren.map((child: any) => (
                                                <SubNavItem 
                                                    key={child.href}
                                                    href={child.href} 
                                                    icon={<child.icon size={14}/>} 
                                                    label={child.label} 
                                                    active={pathname === child.href} 
                                                    isCollapsed={false}
                                                />
                                            ))}
                                        </div>
                                    )}
                                </div>
                            );
                        }

                        // ------------------------------------------------
                        // STANDARD ITEM
                        // ------------------------------------------------
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
// COMPONENT: FLYOUT MENU (The "Industry Standard" Fix)
// ----------------------------------------------------------------------

function FlyoutMenu({ label, icon: Icon, active, items, pathname }: any) {
    const [isOpen, setIsOpen] = useState(false);
    const [coords, setCoords] = useState({ x: 0, y: 0 });
    const timeoutRef = useRef<NodeJS.Timeout | null>(null);

    const handleMouseEnter = (e: React.MouseEvent) => {
        if (timeoutRef.current) clearTimeout(timeoutRef.current);
        const rect = e.currentTarget.getBoundingClientRect();
        setCoords({ x: rect.right + 8, y: rect.top }); // Position to the right
        setIsOpen(true);
    };

    const handleMouseLeave = () => {
        // Add a small delay so user can bridge the gap between button and menu
        timeoutRef.current = setTimeout(() => setIsOpen(false), 100); 
    };

    return (
        <>
            <button 
                onMouseEnter={handleMouseEnter}
                onMouseLeave={handleMouseLeave}
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
                    {/* Header */}
                    <div className="px-3 py-2 text-xs font-black text-zinc-500 uppercase tracking-widest border-b border-white/5 mb-1">
                        {label}
                    </div>
                    {/* Links */}
                    <div className="flex flex-col gap-1">
                        {items.map((child: any) => {
                            const isActive = pathname === child.href;
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
                    
                    {/* Left Arrow to point at sidebar */}
                    <div 
                        className="absolute top-4 -left-1 w-2 h-2 bg-zinc-900 border-l border-b border-zinc-700 rotate-45" 
                    />
                </div>,
                document.body
            )}
        </>
    );
}

// ----------------------------------------------------------------------
// STANDARD COMPONENTS
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
        <>
            {React.cloneElement(children, {
                onMouseEnter: (e: React.MouseEvent) => {
                    const rect = e.currentTarget.getBoundingClientRect();
                    setCoords({ x: rect.right + 10, y: rect.top + (rect.height / 2) });
                    setIsHovered(true);
                },
                onMouseLeave: () => setIsHovered(false)
            })}
            
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
        </>
    );
}