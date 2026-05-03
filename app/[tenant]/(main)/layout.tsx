// app/[tenant]/(main)/layout.tsx

import React from 'react';
import { auth } from "@/auth";
import { cookies } from "next/headers";
import { 
  getUserProfile, 
  getUserProductionRole, 
  getActiveProduction, 
  getShowById 
} from "@/app/lib/baserow";
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
  const currentTenant = params.tenant;
  
  const session = await auth();
  const email = session?.user?.email;
  
  // 1. Resolve User Identity
  const userProfile = email ? await getUserProfile(currentTenant, email) : null; 

  // 2. Resolve Production Context (from Cookies or Active Show)
  const cookieStore = await cookies();
  const cookieVal = cookieStore.get('active_production_id')?.value;
  
  let activeProduction = null;
  if (cookieVal) {
      activeProduction = await getShowById(currentTenant, cookieVal);
  }
  if (!activeProduction) {
      activeProduction = await getActiveProduction(currentTenant);
  }

  const activeId = activeProduction?.id;
  
  // 3. Resolve Production-Specific Role
  let productionRole = null;
  if (userProfile && activeId) {
      productionRole = await getUserProductionRole(currentTenant, Number(userProfile.id), activeId);
  }

  const globalRole = userProfile?.role || "Student";

  // 🟢 4. EXTRACT RBAC GROUPS
  // We handle both arrays and comma-separated strings (e.g., "Check In Team, Committee Team")
  const rawGroups = (session?.user as any)?.groups || "";
  const userGroups = typeof rawGroups === 'string' 
    ? rawGroups.split(',').map((g: string) => g.trim()).filter(Boolean) 
    : rawGroups;
  
  return (
    <TenantProvider tenant={currentTenant}>
      <div className="flex h-screen bg-zinc-950 text-white overflow-hidden font-sans">
        <SimulationProvider realGlobalRole={globalRole} realProductionRole={productionRole}>
            <SidebarShell>
              {/* 🟢 PASS DATA TO SIDEBAR: Fixes crash and enables group visibility */}
              <StaffSidebar 
                activeProductionId={activeId} 
                userGroups={userGroups} 
              />
            </SidebarShell>

            <div className="flex-1 flex flex-col min-w-0 relative">
              <div className="shrink-0 z-30">
                <GlobalHeader tenant={currentTenant} />
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