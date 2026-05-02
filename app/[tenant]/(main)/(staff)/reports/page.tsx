import { cookies } from 'next/headers';
import { BaserowClient } from '@/app/lib/BaserowClient';
import ReportsClient from '@/app/components/reports/ReportsClient';

export const dynamic = 'force-dynamic';

// 🟢 1. Add params to the page signature
export default async function ReportsPage({ params }: { params: { tenant: string } }) {
  // 🟢 2. Extract the tenant
  const tenant = params.tenant;
  
  // 🟢 3. Await cookies (Best practice for Next.js 15+)
  const cookieStore = await cookies();
  const savedShowId = cookieStore.get('active_production_id')?.value;
  const showId = parseInt(savedShowId || "94", 10);

  if (isNaN(showId)) {
    return <div className="h-screen flex items-center justify-center text-zinc-500 font-bold uppercase tracking-widest">Error: No active production selected.</div>;
  }

  // 🟢 4. Pass the tenant string to the Client functions
  const [production, roster] = await Promise.all([
      BaserowClient.getProduction(tenant, showId),
      BaserowClient.getRosterForShow(tenant, showId)
  ]);

  // 🟢 FIX: Safely cast the title to a string to satisfy TypeScript
  const safeTitle = (production?.title as string) || "Active Show";

  return (
    <main className="min-h-screen bg-zinc-950 p-8 text-white">
      <h1 className="text-3xl font-black uppercase italic mb-8 tracking-tighter">
        Production Report <span className="text-zinc-600 not-italic">/ {safeTitle}</span>
      </h1>
      
      <ReportsClient 
        data={roster}
        showTitle={safeTitle}
      />
    </main>
  );
}