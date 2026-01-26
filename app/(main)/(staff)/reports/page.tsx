import { cookies } from 'next/headers';
import { 
    getAssignments, 
    getPeople, 
    getComplianceData,
    getShowById, 
    getActiveProduction 
} from '@/app/lib/baserow';
import ReportsClient from '@/app/components/reports/ReportsClient';

export default async function ReportsPage() {
  const cookieStore = await cookies();
  const activeId = Number(cookieStore.get('active_production_id')?.value);
  
  let productionTitle = "Production Report";
  
  if (activeId) {
      const show = await getShowById(activeId);
      const showData = Array.isArray(show) ? show[0] : show;
      if (showData) productionTitle = showData.Title;
  } else {
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
    <main className="h-full bg-zinc-950 overflow-hidden">
      <ReportsClient 
        productionTitle={productionTitle} 
        assignments={assignments}
        people={people}
        compliance={compliance}
      />
    </main>
  );
}