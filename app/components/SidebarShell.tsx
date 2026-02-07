"use client";

import React, { useState, createContext, useContext, useEffect } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

// 1. Create Context
const SidebarContext = createContext<{ isCollapsed: boolean } | undefined>(undefined);

export function useSidebar() {
  const context = useContext(SidebarContext);
  if (!context) throw new Error("useSidebar must be used within a SidebarShell");
  return context;
}

export default function SidebarShell({ children }: { children: React.ReactNode }) {
  // Default to FALSE (Expanded) to match server-side rendering
  const [isCollapsed, setIsCollapsed] = useState(false);
  // Add a generic "mounted" flag to prevent hydration mismatches
  const [isMounted, setIsMounted] = useState(false);

  // 2. Load preference from localStorage on client mount
  useEffect(() => {
    setIsMounted(true);
    const savedState = localStorage.getItem('sidebar-collapsed');
    if (savedState !== null) {
      setIsCollapsed(JSON.parse(savedState));
    }
  }, []);

  // 3. Save preference whenever it changes (but only after mounting)
  const toggleSidebar = () => {
    const newState = !isCollapsed;
    setIsCollapsed(newState);
    localStorage.setItem('sidebar-collapsed', JSON.stringify(newState));
  };

  // Prevent flash of incorrect state if possible, or just render default
  // Ideally, you just render the default state and let it snap into place.
  
  return (
    <SidebarContext.Provider value={{ isCollapsed }}>
      <aside 
        className={`
          hidden md:flex h-full shrink-0 z-50 flex-col relative
          transition-all duration-300 ease-[cubic-bezier(0.25,1,0.5,1)]
          overflow-visible 
          ${isCollapsed ? "w-[72px]" : "w-72"} 
        `}
      >
        {/* Toggle Button */}
        <button 
            onClick={toggleSidebar}
            className="absolute -right-3 top-20 z-50 bg-zinc-900 border border-zinc-700 text-zinc-400 hover:text-white p-1 rounded-full shadow-xl transition-transform hover:scale-110 flex items-center justify-center"
            title={isCollapsed ? "Expand Sidebar" : "Collapse Sidebar"}
        >
            {/* Show icon based on state */}
            {isCollapsed ? <ChevronRight size={14}/> : <ChevronLeft size={14}/>}
        </button>

        {/* Content Container */}
        <div className="h-full w-full overflow-hidden bg-zinc-950 border-r border-zinc-800">
            {children}
        </div>
      </aside>
    </SidebarContext.Provider>
  );
}