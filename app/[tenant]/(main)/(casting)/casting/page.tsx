import { cookies } from 'next/headers';
import { BaserowClient } from '@/app/lib/BaserowClient';
import CastingClient from '@/app/components/casting/CastingClient';

export default async function CastingPage() {
  const cookieStore = cookies();
  
  // 🚨 THE FIX: Look for the exact cookie name your Context Switcher uses
  const savedShowId = cookieStore.get('active_production_id')?.value;

  // Default to 94 (Little Mermaid) if no cookie exists
  const showId = parseInt(savedShowId || "94", 10);

  if (isNaN(showId)) {
    return <div className="p-10 text-white font-bold">Error: Could not determine active show.</div>;
  }

  const [roles, scenes, roster, assignments] = await Promise.all([
    BaserowClient.getRolesForShow(showId),
    BaserowClient.getScenesForShow(showId),
    BaserowClient.getRosterForShow(showId),
    BaserowClient.getAssignmentsForShow(showId),
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
