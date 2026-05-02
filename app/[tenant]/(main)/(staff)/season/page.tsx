import { cookies } from 'next/headers';
import { getActiveProduction, getAssignments, getPeople, getComplianceData } from '@/app/lib/baserow';
import StaffClient from '@/app/components/staff/StaffClient';

// 🟢 1. Add params to the page signature
export default async function StaffPage({ params }: { params: { tenant: string } }) {
  // 🟢 2. Extract the tenant
  const tenant = params.tenant;
  
  const cookieStore = await cookies();
  
  // 1. Try to get ID from cookie
  let productionId = Number(cookieStore.get('active_production_id')?.value);
  
  // 2. SAFETY NET: If cookie fails (ID is 0 or NaN), fetch the Active Production from DB
  let productionTitle = "Production Team";
  
  if (!productionId) {
     // 🟢 3. Pass tenant to Baserow fetchers
     const activeProd = await getActiveProduction(tenant);
     if (activeProd) {
        productionId = activeProd.id; // ✅ This saves you! Sets ID to 23 (or actual ID)
        productionTitle = activeProd.title;
     }
  } else {
     // We have an ID, but we still need the title
     const activeProd = await getActiveProduction(tenant);
     if (activeProd) productionTitle = activeProd.title;
  }

  // 3. Now fetch data using the GUARANTEED valid productionId and tenant!
  const assignments = await getAssignments(tenant, productionId); // ✅ Now filters properly
  const people = await getPeople(tenant);
  const compliance = await getComplianceData(tenant, productionId);

  return (
    <main className="h-screen bg-zinc-950 overflow-hidden">
      <StaffClient 
        productionId={productionId} 
        productionTitle={productionTitle} 
        assignments={assignments}
        people={people}
        compliance={compliance}
      />
    </main>
  );
}