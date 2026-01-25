import { cookies } from 'next/headers';
import { 
    getShowById, 
    getActiveProduction,
    getScenes,
    getRoles,
    getAssignments,
    getPeople,
    getConflicts // <--- Make sure this is exported in baserow.ts
} from '@/app/lib/baserow';
import ConflictClient from '@/app/components/conflicts/ConflictClient';

export default async function ConflictsPage() {
  // 1. Context Resolution
  const cookieStore = await cookies();
  let activeId = Number(cookieStore.get('active_production_id')?.value);
  let showTitle = "Select a Production";

  // Determine Active Show
  if (activeId) {
    const showData = await getShowById(activeId);
    // Safety check: getShowById might return an object or null
    if (showData && !Array.isArray(showData)) {
        showTitle = showData.Title;
    }
  } else {
    const defaultShow = await getActiveProduction();
    if (defaultShow) {
      activeId = defaultShow.id;
      showTitle = defaultShow.Title;
    }
  }

  // 2. Fetch Data (Optimized with Server-Side Filtering)
  // passing 'activeId' tells the API to only send rows for this specific show.
  const [scenes, roles, assignments, people, conflicts] = await Promise.all([
      getScenes(activeId),       // ⚡ Filtered by API
      getRoles(),                // Generic (Roles are often Master-linked)
      getAssignments(activeId),  // ⚡ Filtered by API (Fixes 200 row limit)
      getPeople(),               // Generic contact info
      getConflicts(activeId)     // ⚡ Filtered by API (Table 623)
  ]);

  return (
    <main className="h-screen bg-zinc-950 overflow-hidden">
      <ConflictClient 
        scenes={scenes}
        roles={roles}
        assignments={assignments}
        people={people}
        conflictRows={conflicts} // <--- Pass the raw conflict data here
        productionTitle={showTitle}
      />
    </main>
  );
}