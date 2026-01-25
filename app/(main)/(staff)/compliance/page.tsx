import { cookies } from 'next/headers';
import { getComplianceData, getShowById, getActiveProduction } from '@/app/lib/baserow';
import ComplianceDashboard from '@/app/components/ComplianceDashboard';

export default async function CompliancePage() {
  // 1. Try to get ID from Cookie
  const cookieStore = await cookies();
  let activeId = Number(cookieStore.get('active_production_id')?.value);
  let showTitle = "Select a Production";

  // 2. Resolve the ID
  if (activeId) {
    // Case A: Cookie exists -> Fetch that specific show
    const showData = await getShowById(activeId);
    if (showData) {
      showTitle = showData.Title;
    }
  } 
  
  // 3. FALLBACK (The Fix): If no cookie (or invalid), fetch the default Active Show
  if (!activeId || showTitle === "Select a Production") {
    const defaultShow = await getActiveProduction();
    if (defaultShow) {
      activeId = defaultShow.id;
      showTitle = defaultShow.Title;
    }
  }

  // 4. Fetch Data using the Resolved ID (Cookie OR Default)
  const students = await getComplianceData(activeId);

  return (
    <main className="min-h-screen bg-zinc-950">
      <ComplianceDashboard students={students} productionTitle={showTitle} />
    </main>
  );
}