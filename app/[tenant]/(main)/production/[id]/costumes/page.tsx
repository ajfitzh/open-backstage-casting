// app/[tenant]/(main)/production/[id]/costumes/page.tsx
import { BaserowClient } from '@/app/lib/BaserowClient';
import CostumeWardrobeClient from '@/app/components/production/CostumePullSheet'; // Adjust path if needed

export const dynamic = 'force-dynamic';

export default async function CostumesPage({ 
  params 
}: { 
  params: Promise<{ tenant: string; id: string }> 
}) {
  const { tenant, id } = await params;
  const showId = parseInt(id);

  const [production, roster] = await Promise.all([
      BaserowClient.getProduction(tenant, showId),
      BaserowClient.getRosterForShow(tenant, showId)
  ]);

  if (!production) return <div className="p-10 text-zinc-500">Production not found.</div>;

  return (
    <main className="h-full bg-zinc-950">
      <CostumeWardrobeClient 
        productionTitle={production.title as string}
        performers={roster || []} 
      />
    </main>
  );
}