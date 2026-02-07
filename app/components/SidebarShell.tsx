"use client";

import React, { useState, createContext, useContext } from 'react';
import { ChevronLeft, ChevronRight, PanelLeftClose, PanelLeftOpen } from 'lucide-react';

// 1. Create a Context so the children (StaffSidebar) can know the state
const SidebarContext = createContext<{ isCollapsed: boolean } | undefined>(undefined);

export function useSidebar() {
  const context = useContext(SidebarContext);
  if (!context) throw new Error("useSidebar must be used within a SidebarShell");
  return context;
}

export default function SidebarShell({ children }: { children: React.ReactNode }) {
  // Default to false, or read from localStorage if you want persistence
  const [isCollapsed, setIsCollapsed] = useState(false);

  return (
    <SidebarContext.Provider value={{ isCollapsed }}>
      <aside 
        className={`
          hidden md:flex h-full shrink-0 z-20 flex-col relative
          transition-all duration-300 ease-[cubic-bezier(0.25,1,0.5,1)]
          ${isCollapsed ? "w-[72px]" : "w-72"} 
        `}
      >
        {/* Toggle Button */}
        <button 
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="absolute -right-3 top-20 z-50 bg-zinc-900 border border-zinc-700 text-zinc-400 hover:text-white p-1 rounded-full shadow-xl transition-transform hover:scale-110"
            title={isCollapsed ? "Expand Sidebar" : "Collapse Sidebar"}
        >
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