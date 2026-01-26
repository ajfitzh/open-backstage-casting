import { cookies } from 'next/headers';
import { 
    getActiveProduction, 
    getShowById, // <--- 1. Import this!
    getAssignments, 
    getComplianceData, 
    getPeople 
} from '@/app/lib/baserow';
import StaffClient from '@/app/components/staff/StaffClient';

export default async function RosterPage() {
  const cookieStore = await cookies();
  const activeId = Number(cookieStore.get('active_production_id')?.value);
  
  let productionTitle = "Cast Roster";
  let productionId = activeId || 0;

  // 2. LOGIC FIX:
  if (activeId) {
      // If we have a cookie, fetch THAT specific show
      const showData = await getShowById(activeId);
      
      // Baserow sometimes returns an array [obj] or just obj depending on the endpoint
      const prod = Array.isArray(showData) ? showData[0] : showData;
      
      if (prod) productionTitle = prod.Title;
  } else {
      // Fallback: If no cookie, get the default "Active" show
      const prod = await getActiveProduction(); 
      if (prod) {
          productionTitle = prod.Title;
          productionId = prod.id;
      }
  }

  // 3. Fetch Data using the determined ID
  const [assignments, people, compliance] = await Promise.all([
      getAssignments(productionId),
      getPeople(),
      getComplianceData(productionId)
  ]);

  return (
    <main className="h-full bg-zinc-950 overflow-hidden">
      <StaffClient 
        productionTitle={productionTitle} 
        assignments={assignments}
        people={people}
        compliance={compliance}
      />
    </main>
  );
}