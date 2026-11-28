import { cookies } from 'next/headers';
import { getActiveProduction, getShowById, getAssignments, getPeople, getComplianceData } from '@/app/lib/baserow';
import StaffClient from '@/app/components/staff/StaffClient';

export default async function StaffPage({ params }: { params: Promise<{ tenant: string }> | { tenant: string } }) {
  const { tenant } = await params;
  const cookieStore = await cookies();
  const cookieId = Number(cookieStore.get('active_production_id')?.value);

  let show = Number.isFinite(cookieId) && cookieId > 0 ? await getShowById(tenant, cookieId) : null;
  if (!show) show = await getActiveProduction(tenant);

  const productionId = show?.id || 0;
  const productionTitle = show?.title || "Production Compliance";
  const productionType = show?.type || "";

  const [assignments, people, compliance] = await Promise.all([
    productionId ? getAssignments(tenant, productionId) : Promise.resolve([]),
    getPeople(tenant),
    getComplianceData(tenant, productionId),
  ]);

  return (
    <main className="h-screen bg-zinc-950 overflow-hidden">
      <StaffClient 
        productionId={productionId} 
        productionTitle={productionTitle} 
        productionType={productionType}
        assignments={assignments}
        people={people}
        compliance={compliance}
      />
    </main>
  );
}