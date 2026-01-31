import { cookies } from 'next/headers';
import { 
    getActiveProduction, getShowById, getAssignments, 
    getAuditionees, getScenes, getProductionAssets, getCastDemographics 
} from '@/app/lib/baserow';
import ProductionClient from '@/app/components/production/ProductionClient';

export default async function ProductionPage() {
  const cookieStore = await cookies();
  const activeId = Number(cookieStore.get('active_production_id')?.value);

  // 1. Fetch Show Context
  const show = activeId ? await getShowById(activeId) : await getActiveProduction();
  const activeProdId = show?.id || 0;

  // 2. Fetch Artistic Data
// Fetch all data in parallel
  const [assignments, auditionees, scenes, assets, population] = await Promise.all([
      getAssignments(activeProdId),
      getAuditionees(activeProdId),
      getScenes(activeProdId),
      getProductionAssets(activeProdId),
      getCastDemographics() // 👈 Fetch full population stats
  ]);

  return (
    <main className="h-screen bg-zinc-950 overflow-hidden">
        <ProductionClient 
            show={show}
            assignments={assignments}
            auditionees={auditionees}
            scenes={scenes}
            assets={assets}
            population={population}
        />
    </main>
  );
}