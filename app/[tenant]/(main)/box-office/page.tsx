// app/[tenant]/(main)/box-office/page.tsx
import { cookies } from "next/headers";
import { getActiveProduction, getShowById } from "@/app/lib/baserow";
import { isPostgresEnabled } from "@/db";
import { getBoxOfficeDashboardPg } from "@/app/lib/db/tickets-repo";
import BoxOfficeClient from "@/app/components/tickets/BoxOfficeClient";

export const dynamic = "force-dynamic";

export default async function BoxOfficePage({
  params,
}: {
  params: Promise<{ tenant: string }> | { tenant: string };
}) {
  const { tenant } = await params;

  if (!isPostgresEnabled()) {
    return (
      <div className="p-12 text-center text-zinc-500 font-bold">
        Box Office requires PostgreSQL.
      </div>
    );
  }

  const cookieStore = await cookies();
  const cookieId = cookieStore.get("active_production_id")?.value;
  let show = cookieId ? await getShowById(tenant, Number(cookieId)) : null;
  if (!show) show = await getActiveProduction(tenant);

  if (!show) {
    return (
      <div className="p-20 text-center text-zinc-500 font-bold uppercase tracking-widest">
        No Active Production Found
      </div>
    );
  }

  const dashboard = await getBoxOfficeDashboardPg(tenant, Number(show.id));
  if (!dashboard) {
    return (
      <div className="p-20 text-center text-zinc-500 font-bold">
        Could not load Box Office data.
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-zinc-950 p-4 sm:p-6 lg:p-8">
      <BoxOfficeClient
        tenant={tenant}
        productionId={dashboard.productionId}
        productionTitle={dashboard.productionTitle}
        venueId={dashboard.venueId}
        venueName={dashboard.venueName}
        defaultTicketPrice={dashboard.defaultTicketPrice}
        initialPerformances={dashboard.performances}
        initialStats={dashboard.stats}
        initialOrders={dashboard.orders}
      />
    </main>
  );
}
