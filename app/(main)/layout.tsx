import React from 'react';
import { auth } from "@/auth"; // Authentication session
import { cookies } from "next/headers";
import { getUserProfile, getUserProductionRole, getActiveProduction } from "@/app/lib/baserow"; // Data Fetchers

import GlobalHeader from '@/app/components/globalappheader/globalappheader';
import StaffSidebar from '@/app/components/StaffSidebar';

export default async function MainLayout({ children }: { children: React.ReactNode }) {
  // 1. Fetch Session & User
  const session = await auth();
  const email = session?.user?.email;
  const userProfile = email ? await getUserProfile(email) : null;

  // 2. Determine Active Production (Context)
  const cookieStore = await cookies();
  const activeId = Number(cookieStore.get('active_production_id')?.value);
  
  // 3. Fetch Context-Aware Role
  // "What is this user's job on THIS specific show?"
  let productionRole = null;
  
  if (userProfile) {
      if (activeId) {
          // If a specific show is selected in cookies
          productionRole = await getUserProductionRole(Number(userProfile.id), activeId);
      } else {
          // Fallback: Check the default active production
          const defaultShow = await getActiveProduction();
          if (defaultShow) {
              productionRole = await getUserProductionRole(Number(userProfile.id), defaultShow.id);
          }
      }
  }

  // Define defaults if no user found (e.g. public view or error)
  const globalRole = userProfile?.role || "Student";

  return (
    <div className="flex h-screen bg-zinc-950 text-white overflow-hidden font-sans">
      {/* 1. PERSISTENT SIDEBAR (Desktop Only) */}
      <aside className="hidden md:flex h-full shrink-0 z-20">
        {/* 🚀 PASS THE ROLES DOWN HERE */}
        <StaffSidebar 
            globalRole={globalRole} 
            productionRole={productionRole} 
        />
      </aside>

      {/* 2. MAIN CONTENT AREA */}
      <div className="flex-1 flex flex-col min-w-0 relative">
        
        {/* A. Global Header */}
        <div className="shrink-0 z-30">
          <GlobalHeader />
        </div>
        
        {/* B. Scrollable Page Content */}
        <main className="flex-1 overflow-y-auto relative custom-scrollbar bg-zinc-950">
          {children}
        </main>
        
      </div>
    </div>
  );
}