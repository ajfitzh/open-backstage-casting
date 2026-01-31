import { cookies } from 'next/headers';
import { 
    getCommitteeData, 
    getAuditionees, // <--- CHANGE THIS (was getAuditionSlots)
    getShowById, 
    getActiveProduction 
} from '@/app/lib/baserow';
import CommitteeClient from '@/app/components/committees/CommitteeClient'; // Ensuring path matches your error

export const dynamic = 'force-dynamic';

export default async function CommitteesPage() {
  const cookieStore = await cookies();
  const activeId = cookieStore.get('active_production_id')?.value;
  
  let show = null;
  if (activeId) show = await getShowById(activeId);
  if (!show) show = await getActiveProduction();

  if (!show) return <div className="p-20 text-center text-zinc-500">No active production found.</div>;

  // Fetch BOTH datasets securely on the server
  // We use getAuditionees() because it returns the list of students/actors
  const [volunteers, students] = await Promise.all([
      getCommitteeData(show.id),
      getAuditionees(show.id) 
  ]);

  return (
    <main className="h-screen bg-zinc-950 flex flex-col overflow-hidden">
      <CommitteeClient 
        volunteers={volunteers || []} // Safety fallback
        students={students || []}     // Safety fallback
        activeId={show.id}
      />
    </main>
  );
}