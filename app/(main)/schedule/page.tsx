import { cookies } from 'next/headers';
import { 
    getShowById, 
    getActiveProduction,
    getScenes,
    getRoles,
    getAssignments,
    getPeople,
    getScheduleSlots // 🟢 NEW IMPORT
} from '@/app/lib/baserow';
import SchedulerClient from '@/app/components/schedule/SchedulerClient';

export const dynamic = 'force-dynamic';

export default async function SchedulerPage() {
  const cookieStore = await cookies();
  let activeId = Number(cookieStore.get('active_production_id')?.value);
  let showTitle = "Select a Production";

  if (activeId) {
    const showData = await getShowById(activeId);
    if (showData && !Array.isArray(showData)) showTitle = showData.title;
  } else {
    const defaultShow = await getActiveProduction();
    if (defaultShow) {
      activeId = defaultShow.id;
      showTitle = defaultShow.title;
    }
  }

  // Fetch ALL necessary data
  const [scenes, roles, assignments, people, existingSlots] = await Promise.all([
      getScenes(activeId),      
      getRoles(),               
      getAssignments(activeId), 
      getPeople(),
      getScheduleSlots(activeId) // 🟢 Fetch the saved slots
  ]);

  return (
    <main className="h-screen bg-zinc-950 overflow-hidden">
      <SchedulerClient 
        scenes={scenes || []}
        roles={roles || []}
        assignments={assignments || []}
        people={people || []}
        productionTitle={showTitle}
        productionId={activeId}
        initialSchedule={existingSlots || []} // 🟢 Pass them to Client
      />
    </main>
  );
}