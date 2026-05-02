import { cookies } from 'next/headers';
import { BaserowClient } from '@/app/lib/BaserowClient';
import SchedulerClient from '@/app/components/schedule/SchedulerClient';

// 🟢 1. Add params to the page signature
export default async function SchedulePage({ params }: { params: { tenant: string } }) {
  // 🟢 2. Extract the tenant
  const tenant = params.tenant;

  // 🟢 3. Await cookies
  const cookieStore = await cookies();
  
  // Use the exact same global state logic we used for Casting
  const savedShowId = cookieStore.get('active_production_id')?.value;
  const showId = parseInt(savedShowId || "94", 10);

  if (isNaN(showId)) {
    return <div className="p-10 text-white font-bold">Error: Could not determine active show.</div>;
  }

  // 🟢 4. Pass the tenant string to ALL BaserowClient fetchers
  // Fetch ALL data needed for the schedule board in parallel
  const [
    events, 
    allSlots, 
    conflicts, 
    scenes, 
    assignments, 
    roster
  ] = await Promise.all([
    BaserowClient.getEventsForShow(tenant, showId),
    BaserowClient.getSlotsForShow(tenant, showId), // Pulls a large batch from the table
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