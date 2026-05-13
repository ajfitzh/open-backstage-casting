// app/[tenant]/(main)/layout.tsx

import React from 'react';
import { auth } from "@/auth";
import { 
  getUserProfile, 
  getUserProductionRole, 
  getActiveProduction 
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
  params: Promise<{ tenant: string }> | { tenant: string } 
}) {
  const resolvedParams = await params;
  const currentTenant = resolvedParams.tenant;
  
  const session = await auth();
  const email = session?.user?.email;
  
  // 1. Resolve User Identity
  const userProfile = email ? await getUserProfile(currentTenant, email) : null; 

  // 🟢 2. NO MORE COOKIES! Strictly DB-driven active show fallback
  const activeProduction = await getActiveProduction(currentTenant);
  const activeId = activeProduction?.id;
  
  // 3. Resolve Production-Specific Role
  let productionRole = null;
  if (userProfile && activeId) {
      productionRole = await getUserProductionRole(currentTenant, Number(userProfile.id), activeId);
  }

  const globalRole = userProfile?.role || "Student";
  const rawGroups = (session?.user as any)?.groups || "";
  const userGroups = typeof rawGroups === 'string' 
    ? rawGroups.split(',').map((g: string) => g.trim()).filter(Boolean) 
    : rawGroups;
  
  return (
    <TenantProvider tenant={currentTenant}>
      <div className="flex h-screen bg-zinc-950 text-white overflow-hidden font-sans">
        <SimulationProvider realGlobalRole={globalRole} realProductionRole={productionRole}>
            <SidebarShell>
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