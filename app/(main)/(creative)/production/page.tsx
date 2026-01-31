// app/(production)/dashboard/page.tsx
import { getActiveProduction, getScenes } from '@/app/lib/baserow'; // Import getScenes
import ProductionTracker from '@/app/components/dashboard/ProductionTracker'; // Import component

export default async function DashboardPage() {
  const production = await getActiveProduction();
  
  if (!production) return <div>No Active Production</div>;

  // Fetch the data
  const scenes = await getScenes(production.id);

  return (
    <main className="p-8 bg-zinc-950 min-h-screen text-white">
      <h1 className="text-3xl font-black uppercase mb-8">{production.title} Dashboard</h1>
      
      {/* Render the Tracker */}
      <ProductionTracker scenes={scenes} />
      
    </main>
  );
}