import { 
    getActiveProduction, 
    getAuditionees, 
    getAssignments, 
    getScenes,
    getProductionEvents 
} from '@/app/lib/baserow';
import WorkflowProgress from '@/app/components/dashboard/WorkflowProgress';
// import { OtherDashboardComponents... } 

export default async function HomePage() {
  const production = await getActiveProduction();
  
  if (!production) return <div className="p-10 text-zinc-500">No Active Production found.</div>;

  // 1. Fetch Data for Status Check
  const [auditionees, assignments, scenes, events] = await Promise.all([
      getAuditionees(production.id),
      getAssignments(production.id),
      getScenes(production.id),
      getProductionEvents(production.id)
  ]);

  // 2. Determine Status Logic
  const status = {
      hasAuditions: auditionees.length > 5, // Arbitrary threshold to imply "started"
      hasCast: assignments.length > 0,
      hasPoints: scenes.some((s: any) => s.load.music > 0 || s.load.dance > 0 || s.load.block > 0),
      hasSchedule: events.length > 0
  };

  return (
    <main className="p-8 bg-zinc-950 min-h-screen">
      <h1 className="text-xl font-black uppercase text-zinc-400 mb-6">Welcome Back, {production.title}</h1>
      
      {/* 🟢 THE NEW WORKFLOW TRACKER */}
      <WorkflowProgress status={status} />

      {/* Your existing dashboard widgets go here (Upcoming Rehearsals, etc.) */}
      {/* <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">...</div> */}
      
    </main>
  );
}