import { cookies } from 'next/headers';
import { getShowById, getActiveProduction } from '@/app/lib/baserow';
import CastingClient from '@/app/components/casting/CastingClient';

export default async function CastingPage() {
  const cookieStore = await cookies();
  let activeId = Number(cookieStore.get('active_production_id')?.value);
  
  // 1. Fetch the Full Production Object
  let productionData = null;

  if (activeId) {
    productionData = await getShowById(activeId);
  } 
  
  // Fallback if no cookie
  if (!productionData) {
    productionData = await getActiveProduction();
  }

  // 2. Extract Key IDs
  const productionId = productionData?.id || 0;
  const productionTitle = productionData?.Title || "Select a Production";
  
  // 🔍 THE FIX: Get the Blueprint ID (Master Show)
  // This looks at the "Master Show Database" column in your Productions table
  const masterShowLink = productionData?.["Master Show Database"];
  const masterShowId = (masterShowLink && masterShowLink.length > 0) ? masterShowLink[0].id : null;

  return (
    <main className="min-h-screen bg-zinc-950">
      <CastingClient 
        productionId={productionId} 
        productionTitle={productionTitle}
        masterShowId={masterShowId} // <--- Passing the Blueprint ID
      />
    </main>
  );
} 