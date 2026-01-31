import React from 'react';
import { auth } from "@/auth"; 
import { cookies } from "next/headers";
import { getUserProfile, getUserProductionRole, getActiveProduction } from "@/app/lib/baserow"; 
import { SimulationProvider } from '@/app/context/SimulationContext'; 

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

  // Define defaults if no user found
  const globalRole = userProfile?.role || "Student";

  return (
    <div className="flex h-screen bg-zinc-950 text-white overflow-hidden font-sans">
      
      {/* 🚀 WRAPPER: Makes God Mode possible across the entire app */}
      <SimulationProvider realGlobalRole={globalRole} realProductionRole={productionRole}>
      
          {/* 1. PERSISTENT SIDEBAR (Desktop Only) */}
          <aside className="hidden md:flex h-full shrink-0 z-20">
            {/* Sidebar now pulls from Context, so we don't pass props */}
            <StaffSidebar />
          </aside>

          {/* 2. MAIN CONTENT AREA */}
          <div className="flex-1 flex flex-col min-w-0 relative">
            
            <div className="shrink-0 z-30">
              <GlobalHeader />
            </div>
            
            <main className="flex-1 overflow-y-auto relative custom-scrollbar bg-zinc-950">
              {children}
            </main>
            
          </div>

      </SimulationProvider>
    </div>
  );
}