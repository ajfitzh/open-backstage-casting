import { cookies } from 'next/headers';
import { BaserowClient } from '@/app/lib/BaserowClient';
import { getActiveProduction, getShowById } from '@/app/lib/baserow'; // 🟢 Added imports
import ComplianceDashboard from '@/app/components/ComplianceDashboard'; 

export const dynamic = 'force-dynamic';

export default async function RosterPage({ params }: { params: { tenant: string } }) {
  const tenant = params.tenant;
  
  const cookieStore = await cookies();
  const cookieId = cookieStore.get('active_production_id')?.value;
  
  let show = null;
  if (cookieId) show = await getShowById(tenant, Number(cookieId));
  if (!show) show = await getActiveProduction(tenant);

  if (!show) {
    return (
      <main className="h-full bg-zinc-950 flex flex-col items-center justify-center p-10 text-center">
          <div className="w-16 h-16 bg-zinc-800 rounded-full flex items-center justify-center mb-4">
              <span className="text-2xl">📋</span>
          </div>
          <h2 className="text-xl font-bold text-white mb-2">No Active Show Found</h2>
          <p className="text-zinc-400 max-w-md">Please select a production from the global header to view the cast roster and compliance dashboard.</p>
      </main>
    );
  }

  const showId = show.id;

  const [production, roster] = await Promise.all([
      BaserowClient.getProduction(tenant, showId),
      BaserowClient.getRosterForShow(tenant, showId)
  ]);

  return (
    <main className="h-full bg-zinc-950">
      <ComplianceDashboard 
        productionTitle={(production?.title as string) || show.title || "Active Production"} 
        students={roster}
      />
    </main>
  );
}