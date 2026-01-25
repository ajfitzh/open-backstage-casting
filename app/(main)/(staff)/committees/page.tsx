import { cookies } from 'next/headers';
import { getCommitteePreferences, getAuditionSlots } from '@/app/lib/baserow';
import CommitteeDashboard from '@/app/components/committees/CommitteeClient';

/**
 * SERVER COMPONENT
 * Fetches the raw data required for the committee management dashboard.
 */
export default async function CommitteesPage() {
  // 1. Get the current show context from the user's cookies
  const cookieStore = await cookies();
  const activeId = Number(cookieStore.get('active_production_id')?.value);

  // 2. Fetch data from Baserow. 
  // We pass the activeId so the server only grabs relevant records 
  // for the current show (Little Mermaid, etc.)
  const [prefData, studentData] = await Promise.all([
    getCommitteePreferences(activeId),
    getAuditionSlots(activeId)
  ]);

  return (
    <main className="h-screen bg-zinc-950 overflow-hidden">
      {/* We pass the fetched data as initial props to avoid 
          flickering, but we also pass activeId so the client 
          component can re-fetch if the user switches shows. 
      */}
      <CommitteeDashboard 
        activeId={activeId} 
        initialPrefs={prefData} 
        initialStudents={studentData} 
      />
    </main>
  );
}