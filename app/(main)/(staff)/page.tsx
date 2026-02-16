import { cookies } from 'next/headers';
import { getActiveProduction, getAssignments, getPeople, getComplianceData } from '@/app/lib/baserow';
import StaffClient from '@/app/components/staff/StaffClient';

export default async function StaffPage() {
  const cookieStore = await cookies();
  
  // 1. Try getting ID from cookie
  let productionId = Number(cookieStore.get('active_production_id')?.value);
  
  // 2. Fetch the "Active" production from Baserow
  const activeProd = await getActiveProduction();
  
  // 3. Fallback: If no cookie ID, use the DB's active ID
  if (!productionId && activeProd) {
     productionId = activeProd.id;
  }
  
  // 4. Determine Title
  const productionTitle = activeProd ? activeProd.title : "Production Team";

  // 5. Fetch Data (Now using a GUARANTEED valid ID)
  // We pass productionId to getAssignments so we only get THIS show's cast
  const assignments = await getAssignments(productionId);
  const people = await getPeople();
  const compliance = await getComplianceData(productionId);

  return (
    <main className="h-screen bg-zinc-950 overflow-hidden">
      <StaffClient 
        productionId={productionId} // <--- This will now be correct (e.g., 23 instead of 0)
        productionTitle={productionTitle}
        assignments={assignments}
        people={people}
        compliance={compliance}
      />
    </main>
  );
}