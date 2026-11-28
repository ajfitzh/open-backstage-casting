import { isPostgresEnabled } from "@/db";
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

  const venues = await getVenueExplorerDataPg(tenant);

  return (
    <main className="min-h-screen bg-zinc-950 p-4 sm:p-6 lg:p-8">
      <VenueExplorerClient tenant={tenant} venues={venues} />
    </main>
  );
}
