import { cookies } from 'next/headers';
import { 
    getShowById, 
    getActiveProduction,
    getScenes,
    getRoles,
    getAssignments,
    getPeople,
    getProductionEvents // Fetch events if we want to show existing schedule
} from '@/app/lib/baserow';
import SchedulerClient from '@/app/components/schedule/SchedulerClient';

export default async function SchedulerPage() {
  const cookieStore = await cookies();
  let activeId = Number(cookieStore.get('active_production_id')?.value);
  let showTitle = "Select a Production";

  if (activeId) {
    const showData = await getShowById(activeId);
    if (showData && !Array.isArray(showData)) showTitle = showData.Title;
  } else {
    const defaultShow = await getActiveProduction();
    if (defaultShow) {
      activeId = defaultShow.id;
      showTitle = defaultShow.Title;
    }
  }

  // Fetch ALL necessary data to calculate who is in what scene
  const [scenes, roles, assignments, people] = await Promise.all([
      getScenes(activeId),      // Filtered for this show
      getRoles(),               // All roles (blueprint)
      getAssignments(activeId), // Filtered cast list
      getPeople()               // Names/Photos
  ]);

  return (
    <main className="h-screen bg-zinc-950 overflow-hidden">
      <SchedulerClient 
        scenes={scenes}
        roles={roles}
        assignments={assignments}
        people={people}
        productionTitle={showTitle}
        productionId={activeId}
      />
    </main>
  );
}