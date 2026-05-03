import { cookies } from 'next/headers';
import { getShowById, getActiveProduction } from '@/app/lib/baserow';
import AuditionsClient from '@/app/components/auditions/AuditionsClient';

// 🟢 1. Add params to the page signature
export default async function AuditionsPage({ params }: { params: { tenant: string } }) {
  // 🟢 2. Extract the tenant
  const tenant = params.tenant;
  
  const cookieStore = await cookies();
  let activeId = Number(cookieStore.get('active_production_id')?.value);
  let showTitle = "Select a Production";

  if (activeId) {
    // 🟢 3. Pass tenant to fetcher
    const showData = await getShowById(tenant, activeId);
    if (showData) {
      showTitle = showData.title; // Fixed case
    }
  } 
  
  if (!activeId || showTitle === "Select a Production") {
    // 🟢 4. Pass tenant to fallback fetcher
    const defaultShow = await getActiveProduction(tenant);
    if (defaultShow) {
      activeId = defaultShow.id;
      showTitle = defaultShow.title; // Fixed case
    }
  }

return (
    <main className="min-h-screen bg-black">
      {/* 🟢 Added tenant={tenant} here! */}
      <AuditionsClient tenant={tenant} productionId={activeId} productionTitle={showTitle} />
    </main>
  );
}