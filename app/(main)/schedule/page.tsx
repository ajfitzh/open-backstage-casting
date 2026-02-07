// inside app/education/planning/page.tsx (or your Scheduler page)

import { 
    getShowById, 
    getActiveProduction,
    getScenes,
    getRoles,
    getSceneAssignments, // 🟢 1. Update Import
    getPeople,
    getScheduleSlots 
} from '@/app/lib/baserow';
import SchedulerClient from '@/app/components/schedule/SchedulerClient';
import { cookies } from 'next/dist/server/request/cookies';

export const dynamic = 'force-dynamic';

export default async function SchedulerPage() {
  const cookieStore = await cookies();
  let activeId = Number(cookieStore.get('active_production_id')?.value);
  let showTitle = "Select a Production";

  // ... (Keep your show title logic) ...

  // 🟢 2. Fetch getSceneAssignments instead of getAssignments
  const [scenes, roles, sceneAssignments, people, existingSlots] = await Promise.all([
      getScenes(activeId),      
      getRoles(),               
      getSceneAssignments(activeId), // <--- CHANGE THIS LINE
      getPeople(),
      getScheduleSlots(activeId) 
  ]);

  return (
    <main className="h-screen bg-zinc-950 overflow-hidden">
      <SchedulerClient 
        scenes={scenes || []}
        roles={roles || []}
        assignments={sceneAssignments || []} // <--- Pass the correct data here
        people={people || []}
        productionTitle={showTitle}
        productionId={activeId}
        initialSchedule={existingSlots || []} 
      />
    </main>
  );
}