import { cookies } from 'next/headers';
import { getAssignments, getPeople, getComplianceData, getActiveProduction } from '@/app/lib/baserow';
import ReportsClient from '@/app/components/reports/ReportsClient';

export default async function ReportsPage() {
  const cookieStore = await cookies();
  const activeId = Number(cookieStore.get('active_production_id')?.value);
  
  // Default title
  let productionTitle = "Production Report";
  const activeShow = await getActiveProduction();
  if (activeShow) productionTitle = activeShow.Title;

  // Fetch Data
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