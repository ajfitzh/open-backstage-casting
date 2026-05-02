import { cookies } from 'next/headers';
import { BaserowClient } from '@/app/lib/BaserowClient';
import CastingClient from '@/app/components/casting/CastingClient';

// 🟢 1. Add params to the page signature
export default async function CastingPage({ params }: { params: { tenant: string } }) {
  // 🟢 2. Extract the tenant
  const tenant = params.tenant;
  
  const cookieStore = await cookies(); // Note: cookies() should be awaited in Next.js 15+
  
  // Look for the exact cookie name your Context Switcher uses
  const savedShowId = cookieStore.get('active_production_id')?.value;

  // Default to 94 (Little Mermaid) if no cookie exists
  const showId = parseInt(savedShowId || "94", 10);

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
      activeId={showId}
      blueprintRoles={roles}
      allScenes={scenes}
      roster={roster}
      assignments={assignments as any} 
    />
  );
}