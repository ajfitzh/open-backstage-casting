// app/[tenant]/(main)/production/[id]/analysis/page.tsx
import { BaserowClient } from '@/app/lib/BaserowClient';
import SceneAnalysisClient from './SceneAnalysisClient';

export const dynamic = 'force-dynamic';

export default async function AnalysisPage({ 
  params 
}: { 
  params: { tenant: string; id: string } 
}) {
  const { tenant, id } = await params; // Next.js 15 pattern
  const showId = parseInt(id);

  if (isNaN(showId)) {
    return (
      <div className="p-10 text-center bg-zinc-950 min-h-screen flex items-center justify-center">
        <div className="text-zinc-500 font-bold uppercase tracking-widest text-sm">
          ⚠️ Error: Invalid Production ID
        </div>
      </div>
    );
  }

  const [production, scenes] = await Promise.all([
     BaserowClient.getProduction(tenant, showId),
     BaserowClient.getScenesForShow(tenant, showId)
  ]);

  if (!production) {
    return (
      <div className="p-10 text-center bg-zinc-950 min-h-screen flex items-center justify-center">
        <div className="text-zinc-500 font-bold uppercase tracking-widest text-sm">
          📋 Production Not Found
        </div>
      </div>
    );
  }

  // 🟢 FIX: Explicitly cast to string to satisfy TypeScript ReactNode check
  const displayTitle = String(production.title || "Active Production");

  return (
    <main className="min-h-screen bg-zinc-950 flex flex-col text-white">
      <header className="p-8 border-b border-white/10 flex justify-between items-center bg-zinc-900/50">
        <div>
           <h1 className="text-2xl font-black uppercase tracking-tight">Production Assessment</h1>
           <p className="text-zinc-400 text-sm mt-1">
             Calibrating difficulty for <span className="text-white font-bold">{displayTitle}</span>
           </p>
        </div>
      </header>
      
      <SceneAnalysisClient scenes={(scenes || []).sort((a, b) => a.order - b.order)} />
    </main>
  );
}