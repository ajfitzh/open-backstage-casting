// app/[tenant]/(main)/production/[id]/casting/page.tsx
import { BaserowClient } from '@/app/lib/BaserowClient';
import CastGridClient from '@/app/components/casting/CastingClient'; 

export const dynamic = 'force-dynamic';

export default async function CastGridPage({ 
  params 
}: { 
  params: Promise<{ tenant: string; id: string }> 
}) {
  const { tenant, id } = await params;
  const showId = parseInt(id);

  // 🟢 FIXED: Fetch ALL the data the component actually needs
  const [production, assignments, roles, scenes, roster] = await Promise.all([
      BaserowClient.getProduction(tenant, showId),
      BaserowClient.getAssignmentsForShow(tenant, showId),
      BaserowClient.getRolesForShow(tenant, showId),
      BaserowClient.getScenesForShow(tenant, showId),
      BaserowClient.getRosterForShow(tenant, showId)
  ]);

  if (!production) return <div className="p-10 text-zinc-500">Production context lost.</div>;

  return (
    <main className="h-full bg-zinc-950">
      <CastGridClient 
        tenant={tenant}
        activeId={showId}               // 🟢 Renamed from 'id' to 'activeId'
        assignments={assignments || []} // 🟢 Renamed from 'initialAssignments'
        blueprintRoles={roles || []}    // 🟢 Renamed from 'roles'
        allScenes={scenes || []}        // 🟢 Added missing scenes
        roster={roster || []}           // 🟢 Added missing roster
      />
    </main>
  );
}