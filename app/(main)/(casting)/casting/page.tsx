import { cookies } from 'next/headers';
import { getShowById, getActiveProduction } from '@/app/lib/baserow';
import CastingClient from '@/app/components/casting/CastingClient';
export default async function CastingPage() {
  // 1. Try to get ID from Cookie
  const cookieStore = await cookies();
  let activeId = Number(cookieStore.get('active_production_id')?.value);
  let showTitle = "Select a Production";

  // 2. Resolve the ID
  if (activeId) {
    const showData = await getShowById(activeId);
    if (showData) {
      showTitle = showData.Title;
    }
  } 
  
  // 3. FALLBACK: If no cookie, fetch the default Active Show
  if (!activeId || showTitle === "Select a Production") {
    const defaultShow = await getActiveProduction();
    if (defaultShow) {
      activeId = defaultShow.id;
      showTitle = defaultShow.Title;
    }
  }

  // 4. Pass the resolved context to the Client App
  return (
    <main className="min-h-screen bg-zinc-950">
      <CastingClient productionId={activeId} productionTitle={showTitle} />
    </main>
  );
}