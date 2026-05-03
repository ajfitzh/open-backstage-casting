import { auth } from "@/auth";
import { getAuditionProduction, getAuditionSlots } from '@/app/lib/baserow';
import AuditionWizardClient from './AuditionWizardClient';

export default async function PublicAuditionPage({ params }: { params: { tenant: string } }) {
  const tenant = params.tenant;
  
  // 🟢 1. Grab the User's Identity (if they are logged in)
  const session = await auth();
  const userEmail = session?.user?.email || "";

  // 🟢 2. ALWAYS lock the form to the Upcoming show (Ignore the staff show cookie!)
  const activeProduction = await getAuditionProduction(tenant);

  if (!activeProduction) {
    return (
      <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 flex flex-col items-center justify-center p-4">
        <div className="bg-white dark:bg-zinc-900 p-8 rounded-3xl text-center max-w-md border border-zinc-200 dark:border-zinc-800 shadow-xl">
          <h2 className="text-2xl font-black dark:text-white uppercase italic mb-2 tracking-tighter">Auditions Closed</h2>
          <p className="text-zinc-500 dark:text-zinc-400 text-sm font-medium">
            We aren't currently accepting auditions for any upcoming shows. Please check back later!
          </p>
        </div>
      </div>
    );
  }

  const dynamicSlots = await getAuditionSlots(tenant, activeProduction.id);

  return (
    <main className="min-h-screen bg-zinc-50 dark:bg-zinc-950">
      <AuditionWizardClient 
        tenant={tenant} 
        productionId={activeProduction.id} 
        productionTitle={activeProduction.title} 
        slots={dynamicSlots} 
        initialEmail={userEmail} // 🟢 3. Pass the email to the client!
      />
    </main>
  );
}