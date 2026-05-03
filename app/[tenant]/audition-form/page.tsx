import { auth } from "@/auth";
// 🟢 FIXED: getExistingAuditions is now imported from baserow!
import { getAuditionProduction, getAuditionSlots, getExistingAuditions } from '@/app/lib/baserow';
import AuditionWizardClient from './AuditionWizardClient';

export default async function PublicAuditionPage({ params }: { params: { tenant: string } }) {
  const tenant = params.tenant;
  
  // 1. Grab User Identity & Role
  const session = await auth();
  const userEmail = session?.user?.email || "";
  const userRole = (session?.user as any)?.role || "Guest";
  const isGuest = userRole === "Guest"; // True if they need a password!

  // 2. ALWAYS lock the form to the Upcoming show
  const activeProduction = await getAuditionProduction(tenant);

  if (!activeProduction) {
    return (
      <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 flex flex-col items-center justify-center p-4">
        <div className="bg-white dark:bg-zinc-900 p-8 rounded-3xl text-center max-w-md border border-zinc-200 dark:border-zinc-800 shadow-xl">
          <h2 className="text-2xl font-black dark:text-white uppercase italic mb-2 tracking-tighter">Auditions Closed</h2>
          <p className="text-zinc-500 dark:text-zinc-400 text-sm font-medium">
            We aren&apos;t currently accepting auditions for any upcoming shows. Please check back later! </p>
        </div>
      </div>
    );
  }

  // 3. Fetch Slots & Existing Auditions for the Hub
  const dynamicSlots = await getAuditionSlots(tenant, activeProduction.id);
  const existingAuditions = await getExistingAuditions(tenant, userEmail, activeProduction.id);

  return (
    <main className="min-h-screen bg-zinc-50 dark:bg-zinc-950">
      <AuditionWizardClient 
        tenant={tenant} 
        productionId={activeProduction.id} 
        productionTitle={activeProduction.title} 
        slots={dynamicSlots} 
        initialEmail={userEmail}
        isGuest={isGuest} 
        initialExistingAuditions={existingAuditions} 
      />
    </main>
  );
}