import { cookies } from 'next/headers';
import { 
    getShowById, 
    getActiveProduction,
    getScenes,
    getRoles,
    getSceneAssignments,
    getPeople,
    getScheduleSlots, 
    getProductionEvents
} from '@/app/lib/baserow';
import SchedulerClient from '@/app/components/schedule/SchedulerClient';

export const dynamic = 'force-dynamic';

export default async function SchedulerPage() {
  const cookieStore = await cookies();
  const activeId = Number(cookieStore.get('active_production_id')?.value);
  
  // 🟢 1. ROBUST TITLE FETCHING
  let showTitle = "Select a Production";
  
  if (activeId) {
    try {
      // Try fetching specific show first
      const showData = await getShowById(activeId);
      if (showData && showData.title) {
        showTitle = showData.title;
      } else {
        // Fallback: Check if it matches the active production
        const activeProd = await getActiveProduction();
        if (activeProd && activeProd.id === activeId) {
          showTitle = activeProd.title;
        }
      }
    } catch (e) {
      console.error("Error fetching title:", e);
    }
  }

  // 🟢 2. FETCH DATA
  const [scenes, roles, sceneAssignments, people, existingSlots, events] = await Promise.all([
      getScenes(activeId),      
      getRoles(),               
      getSceneAssignments(activeId),
      getPeople(),
      getScheduleSlots(activeId),
      getProductionEvents(activeId) // ✅ Fetching production events for the active production
  ]);

  return (
    <main className="h-screen bg-zinc-950 overflow-hidden">
      <SchedulerClient 
        scenes={scenes || []}
        roles={roles || []}
        assignments={sceneAssignments || []}
        people={people || []}
        productionTitle={showTitle} // ✅ Passed correctly
        productionId={activeId}
        initialSchedule={existingSlots || []} 
        events={events || []}
      />
    </main>
  );
}