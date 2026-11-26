// app/[tenant]/(main)/production/[id]/costumes/page.tsx
import { BaserowClient } from '@/app/lib/BaserowClient';
import { isPostgresEnabled } from '@/db';
import { getCastWithMeasurementsPg } from '@/app/lib/db/wardrobe-academy-repo';
import { getGarmentInventoryWithQr } from '@/app/actions/wardrobe';
import CostumePullSheet from '@/app/components/production/CostumePullSheet';

export const dynamic = 'force-dynamic';

export default async function CostumesPage({
  params,
}: {
  params: Promise<{ tenant: string; id: string }>;
}) {
  const { tenant, id } = await params;
  const showId = parseInt(id, 10);

  if (Number.isNaN(showId)) {
    return <div className="p-10 text-zinc-500">Invalid production ID.</div>;
  }

  const [production, pgMeasurements, inventoryRes] = await Promise.all([
    BaserowClient.getProduction(tenant, showId),
    isPostgresEnabled() ? getCastWithMeasurementsPg(tenant, showId).catch(() => null) : Promise.resolve(null),
    getGarmentInventoryWithQr(tenant).catch(() => ({ success: true as const, items: [] })),
  ]);

  if (!production) {
    return <div className="p-10 text-zinc-500">Production not found.</div>;
  }

  let castWithMeasurements = pgMeasurements;
  if (castWithMeasurements === null) {
    const roster = await BaserowClient.getRosterForShow(tenant, showId).catch(() => []);
    castWithMeasurements = (roster || []).map((r: any) => ({
      personId: Number(r.id) || 0,
      name: r.name || 'Unknown Actor',
      role: r.status || 'Cast',
      height: null,
      chest: null,
      waist: null,
      hips: null,
      inseam: null,
      girth: null,
      neck: null,
      hatHead: null,
      shoeSize: null,
      gloveSize: null,
      measuredAt: null,
    }));
  }

  return (
    <main className="min-h-full bg-zinc-950 p-6 lg:p-8">
      <CostumePullSheet
        tenant={tenant}
        productionId={showId}
        showTitle={String(production.title || 'Production')}
        castWithMeasurements={castWithMeasurements}
        initialGarments={inventoryRes.items || []}
      />
    </main>
  );
}
