import { cookies } from 'next/headers';
import { BaserowClient } from '@/app/lib/BaserowClient';
import ReportsClient from '@/app/components/reports/ReportsClient';

export const dynamic = 'force-dynamic';

export default async function ReportsPage() {
  const cookieStore = cookies();
  const savedShowId = cookieStore.get('active_production_id')?.value;
  const showId = parseInt(savedShowId || "94", 10);

  if (isNaN(showId)) {
    return <div className="h-screen flex items-center justify-center text-zinc-500 font-bold uppercase tracking-widest">Error: No active production selected.</div>;
  }

  // Fetch perfectly typed data using our single source of truth
  const [production, roster] = await Promise.all([
      BaserowClient.getProduction(showId),
      BaserowClient.getRosterForShow(showId)
  ]);

  return (
    <main className="min-h-screen bg-zinc-950 p-8 text-white">
      <h1 className="text-3xl font-black uppercase italic mb-8 tracking-tighter">
        Production Report <span className="text-zinc-600 not-italic">/ {production?.title || "Active Show"}</span>
      </h1>
      
      <ReportsClient 
        data={roster}
        showTitle={production?.title || "Active Show"}
      />
    </main>
  );
}
