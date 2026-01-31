import React from 'react';
import { cookies } from 'next/headers';
import { 
  getActiveProduction, 
  getShowById, 
  getConflicts, 
  getProductionEvents,
  getAssignments 
} from '@/app/lib/baserow';
import { Users, Calendar, AlertTriangle } from 'lucide-react';
import ConflictsClient from '@/app/components/conflicts/ConflictsClient'; // Assuming you have a client component for the filters/log

export const dynamic = 'force-dynamic';

export default async function ConflictsPage() {
  // 1. 🔍 RESOLVE CONTEXT (The Fix)
  const cookieStore = await cookies();
  const cookieId = cookieStore.get('active_production_id')?.value;
  
  let production = null;
  if (cookieId) production = await getShowById(cookieId);
  if (!production) production = await getActiveProduction();

  if (!production) return <div className="p-10 text-zinc-500">No Active Production found.</div>;

  // 2. 📡 FETCH DATA FOR THIS SPECIFIC SHOW
  const [conflicts, events, assignments] = await Promise.all([
    getConflicts(production.id),
    getProductionEvents(production.id),
    getAssignments(production.id) // Fetches the specific cast list for this show
  ]);

  // 3. 🧹 CLEAN DATA FOR UI
  // Create a unique list of actors for the sidebar filter
  const actors = Array.from(new Set(
    assignments
      .filter((a: any) => a.personName)
      .map((a: any) => ({ id: a.personId, name: a.personName }))
  )).sort((a: any, b: any) => a.name.localeCompare(b.name));

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
             Managing attendance for <span className="text-white font-bold">{production.title}</span>
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

      {/* CLIENT COMPONENT (Handles Filtering & Layout) */}
      <ConflictsClient 
        initialConflicts={conflicts} 
        actors={actors} // Pass the correct cast list here
        events={events}
        showTitle={production.title}
      />

    </main>
  );
}