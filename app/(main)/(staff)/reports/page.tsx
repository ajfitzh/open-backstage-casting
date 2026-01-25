import { cookies } from 'next/headers';
import { 
    getAssignments, 
    getPeople, 
    getComplianceData, 
    getShowById, // <--- Make sure this is imported
    getActiveProduction 
} from '@/app/lib/baserow';
import ReportsClient from '@/app/components/reports/ReportsClient';

export default async function ReportsPage() {
  const cookieStore = await cookies();
  const activeId = Number(cookieStore.get('active_production_id')?.value);
  
  // 1. ROBUST TITLE FETCHING
  let productionTitle = "Production Report";
  
  if (activeId) {
      const show = await getShowById(activeId);
      // Baserow sometimes returns an array for single-row fetches, handle both
      const showData = Array.isArray(show) ? show[0] : show;
      if (showData) productionTitle = showData.Title;
  } else {
      // Fallback
      const defaultShow = await getActiveProduction();
      if (defaultShow) productionTitle = defaultShow.Title;
  }

  // 2. Fetch Data
  const [assignments, people, compliance] = await Promise.all([
      getAssignments(activeId),
      getPeople(),
      getComplianceData(activeId)
  ]);

  return (
    <main className="h-screen bg-zinc-950 overflow-hidden">
      <ReportsClient 
        productionTitle={productionTitle}
        assignments={assignments}
        people={people}
        compliance={compliance}
      />
    </main>
  );
}