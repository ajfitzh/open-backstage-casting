import { cookies } from 'next/headers';
import { BaserowClient } from '@/app/lib/BaserowClient';
import ComplianceDashboard from '@/app/components/ComplianceDashboard'; 

export default async function RosterPage({ params }: { params: { tenant: string } }) {
  const tenant = params.tenant;
  
  const cookieStore = await cookies();
  const savedShowId = cookieStore.get('active_production_id')?.value;
  const showId = parseInt(savedShowId || "94", 10);

  if (isNaN(showId)) {
    return <div className="p-10 text-white font-bold">Error: Could not determine active show.</div>;
  }

  const [production, roster] = await Promise.all([
      BaserowClient.getProduction(tenant, showId),
      BaserowClient.getRosterForShow(tenant, showId)
  ]);

  return (
    <main className="h-full bg-zinc-950">
      <ComplianceDashboard 
        // 🟢 FIX: Safely cast the title to a string to satisfy TypeScript
        productionTitle={(production?.title as string) || "Active Production"} 
        students={roster}
      />
    </main>
  );
}