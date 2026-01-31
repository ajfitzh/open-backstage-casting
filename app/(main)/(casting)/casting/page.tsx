import { cookies } from 'next/headers';
import { 
  getShowById, 
  getActiveProduction, 
  getScenes, // 👈 Added this
  getCastingData // 👈 Added this to pre-fetch roles/auditionees if desired
} from '@/app/lib/baserow';
import CastingClient from '@/app/components/casting/CastingClient';

export default async function CastingPage() {
  const cookieStore = await cookies();
  const activeId = Number(cookieStore.get('active_production_id')?.value);
  
  // 1. Fetch the Production Object
  let productionData = null;
  if (activeId) {
    productionData = await getShowById(activeId);
  } 
  
  // Fallback if cookie is missing or production not found
  if (!productionData) {
    productionData = await getActiveProduction();
  }

  // 2. Extract Data using clean keys from mapShow()
  const productionId = productionData?.id || 0;
  const productionTitle = productionData?.title || "Select a Production";
  
  // 3. Extract Master Show ID
  // Note: Ensure your mapShow helper in baserow.ts includes: 
  // masterShowLink: row[DB.PRODUCTIONS.FIELDS.MASTER_SHOW_DATABASE]
  const masterShowLink = productionData?.masterShowLink || []; 
  const masterShowId = (Array.isArray(masterShowLink) && masterShowLink.length > 0) 
    ? masterShowLink[0].id 
    : null;

  // 4. 🚨 THE FIX: Fetch Scenes and Casting Data on the server
  // This prevents the "Cannot read properties of undefined (reading 'map')" error
  // by ensuring the client component starts with a full data set.
  const [scenes, castingData] = await Promise.all([
    getScenes(productionId),
    getCastingData(productionId)
  ]);

  return (
    <main className="min-h-screen bg-zinc-950">
      <CastingClient 
        productionId={productionId} 
        productionTitle={productionTitle}
        masterShowId={masterShowId}
        initialScenes={scenes} // 👈 Passing to CastingClient
        initialAuditionees={castingData.auditionees} // 👈 Passing to CastingClient
        initialAssignments={castingData.assignments}
        activeId={show.id} // 👈 Passing to CastingClient
      />
    </main>
  );
}