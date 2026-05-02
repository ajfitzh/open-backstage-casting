import { getActiveProduction, getScenes, getCastDemographics } from '@/app/lib/baserow';
import DashboardClient from '@/app/components/dashboard/DashboardClient';
import WorkflowProgress from '@/app/components/dashboard/WorkflowProgress';
import { getAuditionees, getAssignments, getProductionEvents } from '@/app/lib/baserow';

export const dynamic = 'force-dynamic';

// 🟢 1. Add params to the page signature
export default async function ProductionHubPage({ params }: { params: { tenant: string } }) {
  // 🟢 2. Extract the tenant
  const tenant = params.tenant;
  
  // 🟢 3. Pass the tenant string to the initial fetcher
  const production = await getActiveProduction(tenant);
  
  if (!production) return <div className="p-10 text-zinc-500">No Active Production</div>;

  // 🟢 4. Pass the tenant string to ALL the parallel fetchers
  const [scenes, demographics, auditionees, assignments, events] = await Promise.all([
      getScenes(tenant, production.id),
      getCastDemographics(tenant),
      getAuditionees(tenant, production.id),
      getAssignments(tenant, production.id),
      getProductionEvents(tenant, production.id)
  ]);

  const hasOverride = (key: string) => {
     return production.workflowOverrides?.some((tag: any) => tag.value === key);
  };

  const workflowStatus = {
      hasAuditions: auditionees.length > 5 || hasOverride('Auditions'),
      hasCallbacks: assignments.length > 0 || hasOverride('Callbacks'), 
      hasCast: assignments.length > 0 || hasOverride('Casting'),
      hasPoints: scenes.some((s: any) => s.load && (s.load.music > 0 || s.load.dance > 0 || s.load.block > 0)) || hasOverride('Calibration'),
      hasSchedule: events.length > 0 || hasOverride('Scheduling')
  };

  return (
    <main className="p-8 bg-zinc-950 min-h-screen text-white pb-24">
      <div className="flex justify-between items-center mb-8">
         <div>
            <h1 className="text-3xl font-black uppercase tracking-tight">{production.title} Production Hub</h1>
            <p className="text-zinc-400 text-sm mt-1">Real-time status tracking and analytics</p>
         </div>
      </div>

      <DashboardClient 
        scenes={scenes} 
        demographics={demographics} 
      />
      
      <div className="mt-12 pt-12 border-t border-white/5 opacity-50 hover:opacity-100 transition-opacity">
         <h3 className="text-xs font-bold uppercase text-zinc-500 mb-4 tracking-widest">Global Progress</h3>
         <WorkflowProgress status={workflowStatus} productionId={production.id} />
      </div>
    </main>
  );
}