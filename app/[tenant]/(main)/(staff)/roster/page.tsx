import { cookies } from 'next/headers';
import { BaserowClient } from '@/app/lib/BaserowClient';
// Assuming StaffClient wraps ComplianceDashboard, but let's just use ComplianceDashboard directly to keep it clean!
import ComplianceDashboard from '@/app/components/ComplianceDashboard'; 

export default async function RosterPage() {
  const cookieStore = cookies();
  const savedShowId = cookieStore.get('active_production_id')?.value;
  const showId = parseInt(savedShowId || "94", 10);

  if (isNaN(showId)) {
    return <div className="p-10 text-white font-bold">Error: Could not determine active show.</div>;
  }

  // Fetch only the two things we need!
  const [production, roster] = await Promise.all([
      BaserowClient.getProduction(showId),
      BaserowClient.getRosterForShow(showId)
  ]);

  return (
    <main className="h-full bg-zinc-950">
      <ComplianceDashboard 
        productionTitle={production?.title || "Active Production"} 
        students={roster}
      />
    </main>
  );
}
