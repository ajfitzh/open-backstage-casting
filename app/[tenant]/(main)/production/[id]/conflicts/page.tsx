// app/[tenant]/(main)/production/[id]/conflicts/page.tsx
import { BaserowClient } from '@/app/lib/BaserowClient';
import ConflictsClient from '@/app/components/conflicts/ConflictsClient';
export const dynamic = 'force-dynamic';

export default async function ConflictMatrixPage({ 
  params 
}: { 
  params: Promise<{ tenant: string; id: string }> 
}) {
  const { tenant, id } = await params;
  const showId = parseInt(id);

  const [production, conflicts, events] = await Promise.all([
      BaserowClient.getProduction(tenant, showId),
      BaserowClient.getConflictsForShow(tenant, showId),
      BaserowClient.getEventsForShow(tenant, showId)
  ]);

  if (!production) return <div className="p-10 text-zinc-500">Production not found.</div>;

  return (
    <main className="h-full bg-zinc-950">
      <ConflictsClient 
        initialConflicts={conflicts || []}
        events={events || []} showTitle={''} actors={[]}      />
    </main>
  );
}