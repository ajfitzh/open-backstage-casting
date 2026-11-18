"use client";

import React, { createContext, useContext, useSyncExternalStore } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

// 1. Create Context
const SidebarContext = createContext<{ isCollapsed: boolean } | undefined>(undefined);

const SIDEBAR_STORAGE_KEY = 'sidebar-collapsed';
const SIDEBAR_STORAGE_EVENT = 'sidebar-collapsed-change';

function subscribeSidebar(onStoreChange: () => void) {
  window.addEventListener('storage', onStoreChange);
  window.addEventListener(SIDEBAR_STORAGE_EVENT, onStoreChange);
  return () => {
    window.removeEventListener('storage', onStoreChange);
    window.removeEventListener(SIDEBAR_STORAGE_EVENT, onStoreChange);
  };
}

function getSidebarSnapshot(): boolean {
  try {
    const savedState = localStorage.getItem(SIDEBAR_STORAGE_KEY);
    return savedState !== null ? Boolean(JSON.parse(savedState)) : false;
  } catch {
    return false;
  }
}

function getSidebarServerSnapshot(): boolean {
  return false;
}

export function useSidebar() {
  const context = useContext(SidebarContext);
  if (!context) throw new Error("useSidebar must be used within a SidebarShell");
  return context;
}

export default function SidebarShell({ children }: { children: React.ReactNode }) {
  // Default to FALSE (Expanded) on server, sync with localStorage on client
  const isCollapsed = useSyncExternalStore(
    subscribeSidebar,
    getSidebarSnapshot,
    getSidebarServerSnapshot
  );

  // 2. Save preference whenever it changes
  const toggleSidebar = () => {
    const newState = !isCollapsed;
    localStorage.setItem(SIDEBAR_STORAGE_KEY, JSON.stringify(newState));
    window.dispatchEvent(new Event(SIDEBAR_STORAGE_EVENT));
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