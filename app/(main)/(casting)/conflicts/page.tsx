import { cookies } from 'next/headers';
import { 
    getShowById, 
    getActiveProduction,
    getScenes,
    getRoles,
    getAssignments,
    getPeople,
    getConflicts,
    getProductionEvents // <--- Import this
} from '@/app/lib/baserow';
import ConflictClient from '@/app/components/conflicts/ConflictClient';

export default async function ConflictsPage() {
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

  // Fetch ALL the data
  const [scenes, roles, assignments, people, conflicts, events] = await Promise.all([
      getScenes(activeId),
      getRoles(),
      getAssignments(activeId),
      getPeople(),
      getConflicts(activeId),
      getProductionEvents(activeId) // <--- Fetch the calendar
  ]);

  return (
    <main className="h-screen bg-zinc-950 overflow-hidden">
      <ConflictClient 
        scenes={scenes}
        roles={roles}
        assignments={assignments}
        people={people}
        conflictRows={conflicts}
        eventRows={events} // <--- Pass it to client
        productionTitle={showTitle}
      />
    </main>
  );
}