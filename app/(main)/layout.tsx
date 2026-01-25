import React from 'react';
import GlobalHeader from '@/app/components/globalappheader/globalappheader';
import StaffSidebar from '@/app/components/StaffSidebar';

export default function MainLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-screen bg-zinc-950 text-white overflow-hidden font-sans">
      {/* 1. PERSISTENT SIDEBAR (Desktop Only) */}
      {/* We render the Sidebar here at the layout level. 
          The 'hidden md:flex' class ensures it vanishes on mobile, 
          letting the GlobalHeader's drawer handle navigation there.
      */}
      <aside className="hidden md:flex h-full shrink-0 z-20">
        <StaffSidebar />
      </aside>

      {/* 2. MAIN CONTENT AREA (The rest of the screen) */}
      <div className="flex-1 flex flex-col min-w-0 relative">
        
        {/* A. Global Header (Context Switcher & User Profile) */}
        {/* Stays fixed at the top of the content area */}
        <div className="shrink-0 z-30">
          <GlobalHeader />
        </div>
        
        {/* B. Scrollable Page Content */}
        {/* This <main> becomes the scroll container for the app.
            'flex-1' ensures it takes all remaining vertical space.
            'overflow-y-auto' handles the scrolling internally.
        */}
        <main className="flex-1 overflow-y-auto relative custom-scrollbar bg-zinc-950">
          {children}
        </main>
        
      </div>
    </div>
  );
}