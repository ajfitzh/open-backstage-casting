import { cookies } from 'next/headers';
import { getAuditionees, getShowById, getActiveProduction } from '@/app/lib/baserow';
import CallbackManager from '@/app/components/casting/CallbackClient';

// 🟢 1. Add params to the page signature
export default async function CallbacksPage({ params }: { params: { tenant: string } }) {
  // 🟢 2. Extract the tenant
  const tenant = params.tenant;
  
  // 🟢 3. Await cookies (Best practice for Next.js 15+)
  const cookieStore = await cookies();
  const activeId = cookieStore.get('active_production_id')?.value;
  
  let show = null;
  
  // 🟢 4. Pass the tenant string to the fetchers
  if (activeId) show = await getShowById(tenant, activeId);
  if (!show) show = await getActiveProduction(tenant);

  if (!show) return <div className="p-10 text-white font-bold">No active production found.</div>;

  // 🟢 5. Pass tenant to fetch the auditionees for this specific workspace
  const auditionees = await getAuditionees(tenant, show.id);

  return (
    <main className="h-screen bg-black overflow-hidden">
      <CallbackManager 
        initialAuditionees={auditionees} 
        productionTitle={(show.title as string) || "Active Production"}
      />
    </main>
  );
}