import { cookies } from 'next/headers';
import { BaserowClient } from '@/app/lib/BaserowClient';
import CommitteeClient from '@/app/components/committees/CommitteeClient'; 

export const dynamic = 'force-dynamic';

export default async function CommitteesPage() {
  const cookieStore = cookies();
  const savedShowId = cookieStore.get('active_production_id')?.value;
  const showId = parseInt(savedShowId || "94", 10);

  if (isNaN(showId)) {
    return <div className="p-10 text-zinc-500">Error: Could not determine active show.</div>;
  }

  // Fetch BOTH datasets securely on the server
  // We use getRosterForShow to get the cast size!
  const [volunteers, students] = await Promise.all([
      BaserowClient.getCommitteePrefsForShow(showId),
      BaserowClient.getRosterForShow(showId) 
  ]);

  return (
    <main className="h-screen bg-zinc-950 flex flex-col overflow-hidden">
      <CommitteeClient 
        volunteers={volunteers} 
        students={students}     
        activeId={showId}
      />
    </main>
  );
}
