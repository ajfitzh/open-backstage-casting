import { cookies } from 'next/headers';
import { 
    getShowById, 
    getActiveProduction,
    getScenes,
    getRoles,
    getAssignments,
    getPeople
} from '@/app/lib/baserow';
import ConflictClient from '@/app/components/conflicts/ConflictClient';

export default async function ConflictsPage() {
  // 1. Context Resolution
  const cookieStore = await cookies();
  let activeId = Number(cookieStore.get('active_production_id')?.value);
  let showTitle = "Select a Production";

  if (activeId) {
    const showData = await getShowById(activeId);
    if (showData) showTitle = showData.Title;
  } else {
    const defaultShow = await getActiveProduction();
    if (defaultShow) {
      activeId = defaultShow.id;
      showTitle = defaultShow.Title;
    }
  }

  // 2. Fetch Data
  // We fetch EVERYTHING because the matrix needs to cross-reference multiple tables
  // In a real production app, we would filter these queries by productionId on the server
  // to save bandwidth, but for now we'll filter in the client logic we wrote.
  const [scenes, roles, assignments, people] = await Promise.all([
      getScenes(),
      getRoles(),
      getAssignments(),
      getPeople()
  ]);

  // 3. Filter Data for Active Show (Server-Side Optimization)
  // This keeps the Client payload lighter
  const activeAssignments = assignments.filter((a: any) => 
      a.Production && a.Production.some((p: any) => p.id === activeId)
  );

  const activeScenes = scenes.filter((s: any) => 
      s.Production && s.Production.some((p: any) => p.id === activeId)
  );

  // Note: Roles & People are filtered dynamically inside the Client component 
  // because "People" conflicts are universal (not per-show usually, unless structured that way)
  // and Roles are linked via Blueprint logic we implemented earlier.

  return (
    <main className="h-screen bg-zinc-950 overflow-hidden">
      <ConflictClient 
        scenes={activeScenes}
        roles={roles}
        assignments={activeAssignments}
        people={people}
        productionTitle={showTitle}
      />
    </main>
  );
}