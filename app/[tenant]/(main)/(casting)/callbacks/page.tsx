import { cookies } from 'next/headers';
import { getAuditionees, getShowById, getActiveProduction } from '@/app/lib/baserow';
import CallbackManager from '@/app/components/casting/CallbackClient';

export default async function CallbacksPage() {
  const cookieStore = await cookies();
  const activeId = cookieStore.get('active_production_id')?.value;
  
  let show = null;
  if (activeId) show = await getShowById(activeId);
  if (!show) show = await getActiveProduction();

  if (!show) return <div>No active production found.</div>;

  // Just one fetch!
  const auditionees = await getAuditionees(show.id);

  return (
    <main className="h-screen bg-black overflow-hidden">
      <CallbackManager 
        initialAuditionees={auditionees} 
        productionTitle={show.title}
      />
    </main>
  );
}