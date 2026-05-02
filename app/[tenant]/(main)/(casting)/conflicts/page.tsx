import { cookies } from 'next/headers';
import { BaserowClient } from '@/app/lib/BaserowClient';
import { AlertTriangle } from 'lucide-react';
import ConflictsClient from '@/app/components/conflicts/ConflictsClient';

export const dynamic = 'force-dynamic';

// 🟢 1. Add params to the page signature
export default async function ConflictsPage({ params }: { params: { tenant: string } }) {
  // 🟢 2. Extract the tenant
  const tenant = params.tenant;

  // 🟢 3. Await cookies
  const cookieStore = await cookies();
  
  // 1. Unify the Global State logic
  const savedShowId = cookieStore.get('active_production_id')?.value;
  const showId = parseInt(savedShowId || "94", 10);

  if (isNaN(showId)) {
    return <div className="p-10 text-white font-bold">Error: Could not determine active show.</div>;
  }

  // 🟢 4. Pass the tenant down into your Client methods!
  const [production, conflicts, roster] = await Promise.all([
    BaserowClient.getProduction(tenant, showId),
    BaserowClient.getConflictsForShow(tenant, showId),
    BaserowClient.getRosterForShow(tenant, showId)
  ]);

  // 3. Map the roster into a simple array for the sidebar dropdown
  const actors = roster.map(r => ({ id: r.id, name: r.name }));

  // Safely cast title for TypeScript
  const safeTitle = (production?.title as string) || "Active Production";

  return (
    <main className="h-screen flex flex-col bg-zinc-950 text-white overflow-hidden">
      
      {/* HEADER */}
      <header className="px-8 py-6 border-b border-white/10 shrink-0 bg-zinc-900/50 backdrop-blur-md flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-black uppercase tracking-tight flex items-center gap-3">
            <AlertTriangle className="text-amber-500" /> 
            Conflict Matrix
          </h1>
          <p className="text-zinc-400 text-sm mt-1">
             Managing attendance for <span className="text-white font-bold">{safeTitle}</span>
          </p>
        </div>
        
        {/* Quick Stats */}
        <div className="flex gap-6 text-right">
           <div>
              <div className="text-2xl font-black text-white">{conflicts.length}</div>
              <div className="text-[10px] uppercase font-bold text-zinc-500 tracking-wider">Total Entries</div>
           </div>
        </div>
      </header>

      {/* CLIENT COMPONENT */}
      <ConflictsClient 
        initialConflicts={conflicts} 
        actors={actors} 
        showTitle={safeTitle}
        events={[]}
      />
    </main>
  );
}