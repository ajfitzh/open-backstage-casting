import { cookies } from 'next/headers';
import { BaserowClient } from '@/app/lib/BaserowClient';
import { getActiveProduction, getShowById } from '@/app/lib/baserow'; // 🟢 Added imports
import SchedulerClient from '@/app/components/schedule/SchedulerClient';

export const dynamic = 'force-dynamic'; // 🟢 Ensure Next.js never statically caches this view

export default async function SchedulePage({ params }: { params: { tenant: string } }) {
  const tenant = params.tenant;
  const cookieStore = await cookies();
  
  // 🟢 1. Intelligent Active Show Resolution
  const cookieId = cookieStore.get('active_production_id')?.value;
  let show = null;
  
  if (cookieId) show = await getShowById(tenant, Number(cookieId));
  if (!show) show = await getActiveProduction(tenant); // Fallback to current season's show

  // 🟢 2. Empty State (No Active Show)
  if (!show) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-4 bg-zinc-950">
          <div className="w-16 h-16 bg-zinc-800 rounded-full flex items-center justify-center mb-4">
              <span className="text-2xl">📅</span>
          </div>
          <h2 className="text-xl font-bold text-white mb-2">No Active Show Found</h2>
          <p className="text-zinc-400 max-w-md">There is no active production set. Please select a production from the global header to view the schedule.</p>
      </div>
    );
  }

  const showId = show.id;

  // 🟢 3. Fetch ALL data needed for the schedule board in parallel
  const [
    events, 
    allSlots, 
    conflicts, 
    scenes, 
    assignments, 
    roster
  ] = await Promise.all([
    BaserowClient.getEventsForShow(tenant, showId),
    BaserowClient.getSlotsForShow(tenant, showId),
    BaserowClient.getConflictsForShow(tenant, showId),
    BaserowClient.getScenesForShow(tenant, showId),
    BaserowClient.getAssignmentsForShow(tenant, showId),
    BaserowClient.getRosterForShow(tenant, showId),
  ]);

  // Clean up: Only keep the slots that belong to the events for THIS show
  const eventIds = new Set(events.map((e: any) => e.id));
  const showSlots = allSlots.filter((slot: any) => slot.eventId && eventIds.has(slot.eventId));

  return (
    <SchedulerClient 
      activeId={showId}
      events={events}
      slots={showSlots}
      conflicts={conflicts}
      scenes={scenes}
      assignments={assignments}
      roster={roster}
    />
  );
}