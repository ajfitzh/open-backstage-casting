import { cookies } from 'next/headers';
import { 
    getShowById, 
    getActiveProduction,
    getScenes, 
    getRoles, 
    getAssignments, 
    getPeople 
} from '@/app/lib/baserow';
import SchedulerClient from '@/app/components/schedule/SchedulerClient'; // Make sure path matches

export default async function SchedulePage() {
  // 1. Context Resolution
  const cookieStore = await cookies();
  let activeId = Number(cookieStore.get('active_production_id')?.value);
  
  // Fallback to default
  if (!activeId) {
    const defaultShow = await getActiveProduction();
    if (defaultShow) activeId = defaultShow.id;
  }

  // 2. Fetch ALL Data needed for the matrix
  // (In real production, filter these queries by Show ID on server for performance)
  const [scenes, roles, assignments, people] = await Promise.all([
      getScenes(),
      getRoles(),
      getAssignments(),
      getPeople()
  ]);

  // 3. Filter for Active Show
  const activeScenes = scenes.filter((s: any) => 
      s.Production && s.Production.some((p: any) => p.id === activeId)
  );
  
  const activeAssignments = assignments.filter((a: any) => 
      a.Production && a.Production.some((p: any) => p.id === activeId)
  );

  return (
    <main className="min-h-screen bg-zinc-950">
      <SchedulerClient 
        productionId={activeId}
        scenes={activeScenes}
        roles={roles}
        assignments={activeAssignments}
        people={people}
      />
    </main>
  );
}