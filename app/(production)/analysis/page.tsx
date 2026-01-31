// app/(production)/analysis/page.tsx
import { getActiveProduction, getScenes } from '@/app/lib/baserow';
import SceneAnalysisClient from './SceneAnalysisClient';

export default async function AnalysisPage() {
  const production = await getActiveProduction();
  
  if (!production) return <div className="p-10 text-zinc-500">No Active Production found.</div>;

  const scenes = await getScenes(production.id);

  return (
    <main className="min-h-screen bg-zinc-950 flex flex-col text-white">
      <header className="p-8 border-b border-white/10 flex justify-between items-center bg-zinc-900/50">
        <div>
           <h1 className="text-2xl font-black uppercase tracking-tight">Production Assessment</h1>
           <p className="text-zinc-400 text-sm mt-1">
             Step 4 of 5: Rate the difficulty of each scene to calibrate the schedule.
           </p>
        </div>
      </header>
      
      <SceneAnalysisClient scenes={scenes} />
    </main>
  );
}