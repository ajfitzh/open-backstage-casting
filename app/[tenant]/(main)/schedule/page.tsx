import { cookies } from 'next/headers';
import { BaserowClient } from '@/app/lib/BaserowClient';
import SchedulerClient from '@/app/components/schedule/SchedulerClient';

export default async function SchedulePage() {
  const cookieStore = cookies();
  
  // Use the exact same global state logic we used for Casting
  const savedShowId = cookieStore.get('active_production_id')?.value;
  const showId = parseInt(savedShowId || "94", 10);

  if (isNaN(showId)) {
    return <div className="p-10 text-white font-bold">Error: Could not determine active show.</div>;
  }

  // Fetch ALL data needed for the schedule board in parallel
  const [
    events, 
    allSlots, 
    conflicts, 
    scenes, 
    assignments, 
    roster
  ] = await Promise.all([
    BaserowClient.getEventsForShow(showId),
    BaserowClient.getSlotsForShow(showId), // Pulls a large batch from the table
    BaserowClient.getConflictsForShow(showId),
    BaserowClient.getScenesForShow(showId),
    BaserowClient.getAssignmentsForShow(showId),
    BaserowClient.getRosterForShow(showId),
  ]);

  // Clean up: Only keep the slots that belong to the events for THIS show
  const eventIds = new Set(events.map(e => e.id));
  const showSlots = allSlots.filter(slot => slot.eventId && eventIds.has(slot.eventId));

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
