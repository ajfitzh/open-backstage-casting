import { cookies } from 'next/headers';
import { 
    getAuditionees, 
    getShowById, 
    getActiveProduction 
} from '@/app/lib/baserow';
import ReportsClient from '@/app/components/reports/ReportsClient';

// Force dynamic rendering so cookies work on Vercel
export const dynamic = 'force-dynamic';

export default async function ReportsPage() {
  const cookieStore = await cookies();
  const activeId = cookieStore.get('active_production_id')?.value;
  
  // 1. Resolve Active Show (Clean Logic)
  let show = null;
  if (activeId) {
      show = await getShowById(activeId);
  }
  // Fallback if cookie is missing or invalid
  if (!show) {
      show = await getActiveProduction();
  }

  // Handle "No Show" state gracefully
  if (!show) {
    return (
        <div className="h-screen flex items-center justify-center text-zinc-500 font-bold uppercase tracking-widest">
            No active production selected.
        </div>
    );
  }

  // 2. Fetch Report Data
  // We use getAuditionees because it contains Name, Status (New/Returning), and Student ID.
  const reportData = await getAuditionees(show.id);

  return (
    <main className="min-h-screen bg-zinc-950 p-8 text-white">
      <h1 className="text-3xl font-black uppercase italic mb-8 tracking-tighter">
        Production Report <span className="text-zinc-600 not-italic">/ {show.title}</span>
      </h1>

      {/* 3. Pass to Client Component */}
      <ReportsClient 
        data={reportData}
        showTitle={show.title}
      />
    </main>
  );
}