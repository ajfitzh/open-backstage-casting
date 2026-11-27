// app/[tenant]/(main)/(staff)/reports/page.tsx
import { cookies } from "next/headers";
import { BaserowClient } from "@/app/lib/BaserowClient";
import { getActiveProduction } from "@/app/lib/baserow";
import { isPostgresEnabled } from "@/db";
import { getProductionFinancialReportPg } from "@/app/lib/db/reporting-repo";
import ReportsClient from "@/app/components/reports/ReportsClient";

export const dynamic = "force-dynamic";

export default async function ReportsPage({
  params,
}: {
  params: Promise<{ tenant: string }> | { tenant: string };
}) {
  const { tenant } = await params;

  const cookieStore = await cookies();
  const savedShowId = cookieStore.get("active_production_id")?.value;
  let showId = savedShowId ? parseInt(savedShowId, 10) : NaN;

  if (Number.isNaN(showId)) {
    const activeShow = await getActiveProduction(tenant);
    showId = activeShow?.id ?? NaN;
  }

  if (Number.isNaN(showId)) {
    return (
      <div className="h-screen flex items-center justify-center text-zinc-500 font-bold uppercase tracking-widest">
        Error: No active production selected.
      </div>
    );
  }

  const financialReport = isPostgresEnabled()
    ? await getProductionFinancialReportPg(tenant, showId).catch(() => null)
    : null;

  if (financialReport) {
    return (
      <main className="min-h-screen bg-zinc-950 p-4 sm:p-6 lg:p-8 text-white pb-20">
        <h1 className="text-3xl font-black uppercase italic mb-6 tracking-tighter">
          Reports &amp; Fees{" "}
          <span className="text-zinc-500 not-italic">/ {financialReport.productionTitle}</span>
        </h1>
        <ReportsClient report={financialReport} />
      </main>
    );
  }

  // Fallback for non-Postgres environments
  const [production, roster] = await Promise.all([
    BaserowClient.getProduction(tenant, showId),
    BaserowClient.getRosterForShow(tenant, showId),
  ]);
  const safeTitle = (production?.title as string) || "Active Show";

  return (
    <main className="min-h-screen bg-zinc-950 p-4 sm:p-6 lg:p-8 text-white pb-20">
      <h1 className="text-3xl font-black uppercase italic mb-6 tracking-tighter">
        Reports &amp; Fees <span className="text-zinc-500 not-italic">/ {safeTitle}</span>
      </h1>
      <ReportsClient
        report={{
          productionTitle: safeTitle,
          productionFee: 0,
          ticketPrice: 15,
          summary: {
            totalCast: roster.length,
            newStudents: 0,
            returningStudents: roster.length,
            paidCount: 0,
            unpaidCount: roster.length,
            feesCollected: 0,
            feesOutstanding: 0,
            onlineBoxOfficeRevenue: 0,
            onlineTicketsSold: 0,
            totalPerfTicketsSold: 0,
            totalPerfCapacity: 0,
            estimatedBoxOfficeTotal: 0,
            combinedProjectedRevenue: 0,
          },
          ledger: roster.map((r: any) => ({
            personId: Number(r.id) || 0,
            name: r.name || "Unknown",
            email: "",
            auditionStatus: r.status || "Cast",
            isReturning: true,
            feePaid: false,
            feeStatus: "Unpaid",
            ticketsCredited: 0,
            ticketRevenueCredited: 0,
          })),
          performances: [],
        }}
      />
    </main>
  );
}
