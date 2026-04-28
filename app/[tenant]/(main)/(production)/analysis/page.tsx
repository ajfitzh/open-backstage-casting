import { cookies } from 'next/headers';
import { BaserowClient } from '@/app/lib/BaserowClient';
import SceneAnalysisClient from './SceneAnalysisClient';

export const dynamic = 'force-dynamic';

export default async function AnalysisPage() {
  const cookieStore = cookies();
  const savedShowId = cookieStore.get('active_production_id')?.value;
  const showId = parseInt(savedShowId || "94", 10);

  if (isNaN(showId)) {
    return <div className="p-10 text-zinc-500">Error: Could not determine active show.</div>;
  }

  // Fetch production title and perfectly structured scenes
  const [production, scenes] = await Promise.all([
     BaserowClient.getProduction(showId),
     BaserowClient.getScenesForShow(showId)
  ]);

  return (
    <main className="min-h-screen bg-zinc-950 flex flex-col text-white">
      <header className="p-8 border-b border-white/10 flex justify-between items-center bg-zinc-900/50">
        <div>
           <h1 className="text-2xl font-black uppercase tracking-tight">Production Assessment</h1>
           <p className="text-zinc-400 text-sm mt-1">
             Calibrating difficulty for <span className="text-white font-bold">{production?.title || "Active Production"}</span>
           </p>
        </div>
      </header>
      
      {/* Sort scenes by order before passing to client */}
      <SceneAnalysisClient scenes={scenes.sort((a, b) => a.order - b.order)} />
    </main>
  );
}
