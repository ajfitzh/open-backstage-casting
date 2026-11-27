import { getScenes, getCastDemographics } from '@/app/lib/baserow';
import { getSelectedProduction } from '@/app/lib/production-context';
import DashboardClient from '@/app/components/dashboard/DashboardClient';
import WorkflowProgress from '@/app/components/dashboard/WorkflowProgress';
import { getAuditionees, getAssignments, getProductionEvents } from '@/app/lib/baserow';

export const dynamic = 'force-dynamic';

export default async function ProductionHubPage({ params }: { params: Promise<{ tenant: string }> | { tenant: string } }) {
  const { tenant } = await params;

  const { show: production } = await getSelectedProduction(tenant);
  
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
    <div className="p-4 sm:p-6 lg:p-8 bg-zinc-950 min-h-full text-white pb-24">
      <div className="flex justify-between items-center mb-6 sm:mb-8">
         <div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">{production.title} Production Hub</h1>
            <p className="text-zinc-400 text-sm mt-1">Real-time status tracking and analytics</p>
         </div>
      </div>

      <DashboardClient 
        scenes={scenes} 
        demographics={demographics} 
      />
      
      <div className="mt-12 pt-10 border-t border-white/10">
         <h3 className="text-xs font-semibold uppercase text-zinc-400 mb-4 tracking-wider">Global Progress</h3>
         <WorkflowProgress status={workflowStatus} productionId={production.id} />
      </div>
    </div>
  );
}