import { getActiveProduction, getAuditionSlots } from '@/app/lib/baserow';
import AuditionWizardClient from './AuditionWizardClient';

export default async function PublicAuditionPage({ params }: { params: { tenant: string } }) {
  const tenant = params.tenant;
  const activeProduction = await getActiveProduction(tenant);

  if (!activeProduction) {
    return (
      <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 flex flex-col items-center justify-center p-4">
        <div className="bg-white dark:bg-zinc-900 p-8 rounded-3xl text-center max-w-md border border-zinc-200 dark:border-zinc-800 shadow-xl">
          <h2 className="text-2xl font-black dark:text-white uppercase italic mb-2 tracking-tighter">No Active Show</h2>
          <p className="text-zinc-500 dark:text-zinc-400 text-sm font-medium">
            We aren't currently accepting auditions. Please check back later!
          </p>
        </div>
      </div>
    );
  }

  // 🟢 Fetch the dynamic slots directly from your new Baserow table!
  const dynamicSlots = await getAuditionSlots(tenant, activeProduction.id);

  return (
    <main className="min-h-screen bg-zinc-50 dark:bg-zinc-950">
      <AuditionWizardClient 
        tenant={tenant} 
        productionId={activeProduction.id} 
        productionTitle={activeProduction.title} 
        slots={dynamicSlots} 
      />
    </main>
  );
}