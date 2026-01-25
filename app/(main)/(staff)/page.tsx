import { cookies } from 'next/headers';
import { getActiveProduction } from '@/app/lib/baserow';
import StaffClient from '@/app/components/staff/StaffClient';

export default async function StaffPage() {
  const cookieStore = await cookies();
  const activeId = Number(cookieStore.get('active_production_id')?.value);
  
  let productionTitle = "Production Team";
  
  // Default to 0 if no active ID found, Client handles the rest
  let productionId = activeId || 0; 

  if (activeId) {
      const prod = await getActiveProduction(); 
      if(prod) productionTitle = prod.Title;
  }

  return (
    <main className="h-screen bg-zinc-950 overflow-hidden">
      <StaffClient productionTitle={productionTitle} productionId={productionId} />
    </main>
  );
}