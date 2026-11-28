import { isPostgresEnabled } from "@/db";
import { getOrganizationBySlugPg } from "@/app/lib/db/core-repo";
import { getVenueExplorerDataPg } from "@/app/lib/db/phase3-repo";
import VenueExplorerClient from "@/app/components/venues/VenueExplorerClient";

export const dynamic = "force-dynamic";

export default async function VenuesPage({
  params,
}: {
  params: Promise<{ tenant: string }> | { tenant: string };
}) {
  const { tenant } = await params;

  if (!isPostgresEnabled()) {
    return (
      <div className="p-12 text-center text-zinc-500 font-bold">
        Venue Explorer requires PostgreSQL.
      </div>
    );
  }

  const [venues, org] = await Promise.all([
    getVenueExplorerDataPg(tenant),
    getOrganizationBySlugPg(tenant),
  ]);

  const savedCostsRaw = org?.settings?.venueCostEstimates || {};
  const initialCostEstimates: Record<number, number> = {};
  for (const [k, v] of Object.entries(savedCostsRaw)) {
    const numId = Number(k);
    if (Number.isFinite(numId) && typeof v === "number") {
      initialCostEstimates[numId] = v;
    }
  }

  return (
    <main className="min-h-screen bg-zinc-950 p-4 sm:p-6 lg:p-8">
      <VenueExplorerClient
        tenant={tenant}
        venues={venues}
        initialCostEstimates={initialCostEstimates}
      />
    </main>
  );
}
