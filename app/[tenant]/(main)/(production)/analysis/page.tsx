import { cookies } from 'next/headers';
import { BaserowClient } from '@/app/lib/BaserowClient';
import SceneAnalysisClient from './SceneAnalysisClient';

export const dynamic = 'force-dynamic';

// 🟢 1. Add params to the page signature
export default async function AnalysisPage({ params }: { params: { tenant: string } }) {
  // 🟢 2. Extract the tenant
  const tenant = params.tenant;
  
  // 🟢 3. Await cookies (Best practice for Next.js 15+)
  const cookieStore = await cookies();
  const savedShowId = cookieStore.get('active_production_id')?.value;
  const showId = parseInt(savedShowId || "94", 10);

  if (isNaN(showId)) {
    return <div className="p-10 text-zinc-500">Error: Could not determine active show.</div>;
  }

  // 🟢 4. Pass the tenant string to the Client functions
  const [production, scenes] = await Promise.all([
     BaserowClient.getProduction(tenant, showId),
     BaserowClient.getScenesForShow(tenant, showId)
  ]);

  // Safely cast title for TypeScript
  const safeTitle = (production?.title as string) || "Active Production";

  return (
    <main className="min-h-screen bg-zinc-950 flex flex-col text-white">
      <header className="p-8 border-b border-white/10 flex justify-between items-center bg-zinc-900/50">
        <div>
           <h1 className="text-2xl font-black uppercase tracking-tight">Production Assessment</h1>
           <p className="text-zinc-400 text-sm mt-1">
             Calibrating difficulty for <span className="text-white font-bold">{safeTitle}</span>
           </p>
        </div>
      </header>
      
      {/* Sort scenes by order before passing to client */}
      <SceneAnalysisClient scenes={scenes.sort((a, b) => a.order - b.order)} />
    </main>
  );
}