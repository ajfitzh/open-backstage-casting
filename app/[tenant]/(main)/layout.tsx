// app/[tenant]/(main)/layout.tsx

import React from 'react';
import { auth } from "@/auth";
import { cookies } from "next/headers";
import { getUserProfile, getUserProductionRole, getActiveProduction, getShowById } from "@/app/lib/baserow";
import { SimulationProvider } from '@/app/context/SimulationContext';
import { TenantProvider } from '@/app/components/TenantProvider';
import GlobalHeader from '@/app/components/globalappheader/globalappheader';
import StaffSidebar from '@/app/components/StaffSidebar';
import SidebarShell from '@/app/components/SidebarShell';

export default async function MainLayout({ 
  children,
  modal,
  params 
}: { 
  children: React.ReactNode,
  modal: React.ReactNode, 
  params: { tenant: string } 
}) {
  const currentTenant = params.tenant; // 🟢 Extract tenant
  
  const session = await auth();
  const email = session?.user?.email;
  
  // 🟢 Pass tenant to getUserProfile
  const userProfile = email ? await getUserProfile(currentTenant, email) : null; 

  const cookieStore = await cookies();
  const cookieVal = cookieStore.get('active_production_id')?.value;
  
  // 🟢 Resolve production context using tenant
  let activeProduction = null;
  if (cookieVal) {
      activeProduction = await getShowById(currentTenant, cookieVal);
  }
  if (!activeProduction) {
      activeProduction = await getActiveProduction(currentTenant);
  }

  const activeId = activeProduction?.id;
  
  let productionRole = null;
  if (userProfile && activeId) {
      // 🟢 Pass tenant to getUserProductionRole
      productionRole = await getUserProductionRole(currentTenant, Number(userProfile.id), activeId);
  }

  const globalRole = userProfile?.role || "Student";
  
  return (
    <TenantProvider tenant={currentTenant}>
      <div className="flex h-screen bg-zinc-950 text-white overflow-hidden font-sans">
        <SimulationProvider realGlobalRole={globalRole} realProductionRole={productionRole}>
            <SidebarShell>
              <StaffSidebar />
            </SidebarShell>

            <div className="flex-1 flex flex-col min-w-0 relative">
              <div className="shrink-0 z-30">
                <GlobalHeader />
              </div>
              <main className="flex-1 overflow-y-auto relative custom-scrollbar bg-zinc-950">
                {children}
              </main>
              {modal}
            </div>
        </SimulationProvider>
      </div>
    </TenantProvider>
  );
}