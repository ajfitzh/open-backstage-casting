import { cookies } from 'next/headers';
import { 
    getActiveProduction, 
    getAssignments, 
    getComplianceData, // <--- We fetch this too now
    getPeople 
} from '@/app/lib/baserow';
import StaffClient from '@/app/components/staff/StaffClient';

export default async function RosterPage() {
  const cookieStore = await cookies();
  const activeId = Number(cookieStore.get('active_production_id')?.value);
  
  let productionTitle = "Cast Roster";
  let productionId = activeId || 0;

  if (activeId) {
      const prod = await getActiveProduction(); 
      if(prod) productionTitle = prod.Title;
  }

  // ⚡ Fetch EVERYTHING we need for a "Super Roster"
  // We fetch Assignments (Who is here?), People (Contact Info), and Compliance (Paperwork)
  const [assignments, people, compliance] = await Promise.all([
      getAssignments(productionId),
      getPeople(),
      getComplianceData(productionId)
  ]);

  return (
    <main className="h-screen bg-zinc-950 overflow-hidden">
      <StaffClient 
        productionTitle={productionTitle} 
        assignments={assignments}
        people={people}
        complianceData={compliance} // <--- Pass the "Traffic Light" data
      />
    </main>
  );
}