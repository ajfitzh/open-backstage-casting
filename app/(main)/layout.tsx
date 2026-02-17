import React from 'react';
import { auth } from "@/auth"; 
import { cookies } from "next/headers";
import { getUserProfile, getUserProductionRole, getActiveProduction } from "@/app/lib/baserow"; 
import { SimulationProvider } from '@/app/context/SimulationContext'; 

import GlobalHeader from '@/app/components/globalappheader/globalappheader';
import StaffSidebar from '@/app/components/StaffSidebar';
import SidebarShell from '@/app/components/SidebarShell'; 

export default async function MainLayout({ 
  children,
  modal // 🟢 1. Add the modal prop here
}: { 
  children: React.ReactNode,
  modal: React.ReactNode // 🟢 2. Define its type
}) {
  // 1. Fetch Session & User
  const session = await auth();
  const email = session?.user?.email;
  const userProfile = email ? await getUserProfile(email) : null;

  // 2. Determine Active Production (Context)
  const cookieStore = await cookies();
  const activeId = Number(cookieStore.get('active_production_id')?.value);
  
  // 3. Fetch Context-Aware Role
  let productionRole = null;
  
  if (userProfile) {
      if (activeId) {
          productionRole = await getUserProductionRole(Number(userProfile.id), activeId);
      } else {
          const defaultShow = await getActiveProduction();
          if (defaultShow) {
              productionRole = await getUserProductionRole(Number(userProfile.id), defaultShow.id);
          }
      }
  }

  const globalRole = userProfile?.role || "Student";

  return (
    <div className="flex h-screen bg-zinc-950 text-white overflow-hidden font-sans">
      
      {/* 🚀 WRAPPER: Makes God Mode possible across the entire app */}
      <SimulationProvider realGlobalRole={globalRole} realProductionRole={productionRole}>
      
          {/* 1. COLLAPSIBLE SIDEBAR SHELL */}
          <SidebarShell>
            <StaffSidebar />
          </SidebarShell>

          {/* 2. MAIN CONTENT AREA */}
          <div className="flex-1 flex flex-col min-w-0 relative">
            
            <div className="shrink-0 z-30">
              <GlobalHeader />
            </div>
            
            <main className="flex-1 overflow-y-auto relative custom-scrollbar bg-zinc-950">
              {children}
            </main>

            {/* 🟢 3. Render the Modal Slot here */}
            {/* It sits on top of the main content because of z-index in the Modal component */}
            {modal} 
            
          </div>

      </SimulationProvider>
    </div>
  );
}