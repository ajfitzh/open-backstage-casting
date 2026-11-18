import { cookies } from 'next/headers';
import { BaserowClient } from '@/app/lib/BaserowClient';
import { getActiveProduction } from '@/app/lib/baserow';
import CastingClient from '@/app/components/casting/CastingClient';

// 🟢 1. Add params to the page signature
export default async function CastingPage({ params }: { params: { tenant: string; id?: string } }) {
  // 🟢 2. Extract the tenant
  const tenant = params.tenant;
  
  const cookieStore = await cookies(); // Note: cookies() should be awaited in Next.js 15+
  
  // Prefer route [id] if numeric, then cookie, then the tenant's active production
  const routeShowId = params.id ? parseInt(params.id, 10) : NaN;
  const savedShowId = cookieStore.get('active_production_id')?.value;
  let showId = !isNaN(routeShowId) ? routeShowId : (savedShowId ? parseInt(savedShowId, 10) : NaN);

  if (isNaN(showId)) {
    const activeShow = await getActiveProduction(tenant);
    showId = activeShow?.id ?? NaN;
  }

  if (isNaN(showId)) {
    return <div className="p-10 text-white font-bold">Error: Could not determine active show.</div>;
  }

  // 🟢 3. Pass the tenant down into your Client methods!
  const [roles, scenes, roster, assignments] = await Promise.all([
    BaserowClient.getRolesForShow(tenant, showId),
    BaserowClient.getScenesForShow(tenant, showId),
    BaserowClient.getRosterForShow(tenant, showId),
    BaserowClient.getAssignmentsForShow(tenant, showId),
  ]);

  return (
    <CastingClient 
      tenant={tenant}
      activeId={showId}
      blueprintRoles={roles}
      allScenes={scenes}
      roster={roster}
      assignments={assignments as any} 
    />
  );
}