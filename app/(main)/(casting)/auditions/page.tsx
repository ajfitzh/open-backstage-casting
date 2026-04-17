import { cookies } from 'next/headers';
import { getShowById, getActiveProduction } from '@/app/lib/baserow';
import AuditionsClient from '@/app/components/auditions/AuditionsClient';

export default async function AuditionsPage() {
  const cookieStore = await cookies();
  let activeId = Number(cookieStore.get('active_production_id')?.value);
  let showTitle = "Select a Production";

  if (activeId) {
    const showData = await getShowById(activeId);
    if (showData) {
      showTitle = showData.title; // Fixed case
    }
  } 
  
  if (!activeId || showTitle === "Select a Production") {
    const defaultShow = await getActiveProduction();
    if (defaultShow) {
      activeId = defaultShow.id;
      showTitle = defaultShow.title; // Fixed case
    }
  }

  return (
    <main className="min-h-screen bg-black">
      <AuditionsClient productionId={activeId} productionTitle={showTitle} />
    </main>
  );
}