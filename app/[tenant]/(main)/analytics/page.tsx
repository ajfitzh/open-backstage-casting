// app/[tenant]/(main)/analytics/page.tsx
import { BaserowClient } from "@/app/lib/BaserowClient";
import { isPostgresEnabled } from "@/db";
import { getAnalyticsEnrichmentPg } from "@/app/lib/db/reporting-repo";
import { computeShowTicketStats } from "@/app/lib/reporting-helpers";
import AnalyticsDashboard from "./analytics-client";

export const dynamic = "force-dynamic";

function parseLegacySales(jsonString: string) {
  if (!jsonString) return { sold: 0, capacity: 0, count: 0 };
  try {
    const cleanString = jsonString.replace(/""/g, '"');
    const data = JSON.parse(cleanString);
    if (!Array.isArray(data)) return { sold: 0, capacity: 0, count: 0 };
    let sold = 0;
    let capacity = 0;
    data.forEach((perf: any) => {
      sold += Number(perf.sold) || 0;
      capacity += Number(perf.total) || 0;
    });
    return { sold, capacity, count: data.length };
  } catch {
    return { sold: 0, capacity: 0, count: 0 };
  }
}

export default async function AnalyticsPage({
  params,
}: {
  params: Promise<{ tenant: string }> | { tenant: string };
}) {
  const { tenant } = await params;

  const [rawData, allShows, allVenuesRaw, allSeasons, enrichment] = await Promise.all([
    BaserowClient.getPerformances(tenant),
    BaserowClient.getAllProductions(tenant),
    BaserowClient.getAllVenues(tenant),
    BaserowClient.getAllSeasons(tenant),
    isPostgresEnabled() ? getAnalyticsEnrichmentPg(tenant).catch(() => null) : Promise.resolve(null),
  ]);

  const allVenues = allVenuesRaw.map((v: any) => ({
    ...v,
    id: v.id,
    name: v["Venue Name"] || "Unknown Venue",
    capacity: Number(v["Seating Capacity"]) || 0,
    marketingName: v["Public Name (Marketing)"] || null,
  }));

  const venueCapMap = new Map<string, number>();
  allVenues.forEach((v: any) => {
    if (v.name) venueCapMap.set(v.name, v.capacity);
    if (v.marketingName) venueCapMap.set(v.marketingName, v.capacity);
  });

  const seasonDateMap = new Map<string, number>();
  allSeasons.forEach((s: any) => {
    if (s["Session Name"] && s["Start Date"]) {
      seasonDateMap.set(s["Session Name"], new Date(s["Start Date"]).getTime());
    }
  });

  // Group relational performances by show ID (or show name fallback)
  const relPerfsByShowId = new Map<
    number,
    { ticketsSold: number; capacity: number; ticketPrice?: number | null }[]
  >();
  const showsByName = new Map<string, number>();

  const showsMap = new Map<number, any>();
  allShows.forEach((meta: any) => {
    const showName = meta["Title"] || `Show ${meta.id}`;
    showsByName.set(showName, meta.id);

    const typeValue = meta["Type"]?.value || "";
    let type = "Other";
    if (typeValue === "Lite" || showName.toLowerCase().includes("lite")) type = "CYT Lite";
    else if (typeValue === "Main Stage") type = "Mainstage";

    const legacyJson = meta["Performances"] || meta["field_6177"];
    const legacyStats = parseLegacySales(legacyJson);

    let venueName = "TBD";
    if (Array.isArray(meta["Venue"]) && meta["Venue"].length > 0) venueName = meta["Venue"][0].value;
    else if (typeof meta["Venue"] === "string") venueName = meta["Venue"];

    showsMap.set(meta.id, {
      id: meta.id,
      name: showName,
      season: meta["Session"]?.value || "Other",
      type,
      venue: venueName,
      legacyStats,
    });
  });

  rawData.forEach((row: any) => {
    let prodId = row["Production"]?.[0]?.id as number | undefined;
    if (!prodId && row["Performance"]) {
      const rawName = String(row["Performance"]).split(" - ")[0];
      prodId = showsByName.get(rawName);
    }
    if (!prodId || !showsMap.has(prodId)) return;

    const show = showsMap.get(prodId);
    const realVenueCap = venueCapMap.get(show.venue) || 0;
    const rowCap = Number(row["Total Inventory"]) || 0;
    const performanceCap = realVenueCap ? Math.max(realVenueCap, rowCap) : rowCap;

    const list = relPerfsByShowId.get(prodId) || [];
    list.push({
      ticketsSold: Number(row["Tickets Sold"]) || 0,
      capacity: performanceCap,
      ticketPrice: enrichment?.perfPriceById.get(Number(row.id)) ?? null,
    });
    relPerfsByShowId.set(prodId, list);
  });

  const showData = Array.from(showsMap.values())
    .map((show: any) => {
      const stats = computeShowTicketStats({
        legacySold: show.legacyStats.sold,
        legacyCapacity: show.legacyStats.capacity,
        legacyCount: show.legacyStats.count,
        relationalPerformances: relPerfsByShowId.get(show.id) || [],
        productionTicketPrice: enrichment?.priceByExtProd.get(show.id) ?? null,
        fallbackTicketPrice: 15,
        actualStripeRevenueCents: enrichment?.stripeCentsByExtProd.get(show.id) ?? 0,
      });

      return {
        id: show.id,
        name: show.name,
        season: show.season,
        type: show.type,
        venue: show.venue,
        totalSold: stats.totalSold,
        totalCapacity: stats.totalCapacity,
        performances: stats.performances,
        avgFill: stats.avgFill,
        revenue: stats.revenue,
        source: stats.source,
      };
    })
    .sort((a: any, b: any) => {
      const dateA = seasonDateMap.get(a.season) || 0;
      const dateB = seasonDateMap.get(b.season) || 0;
      if (dateA !== dateB) return dateA - dateB;
      return b.totalSold - a.totalSold;
    });

  return (
    <main className="h-full min-h-screen bg-zinc-950 text-zinc-100 flex flex-col overflow-hidden">
      <AnalyticsDashboard
        tenant={tenant}
        performanceData={rawData}
        showData={showData}
        venues={allVenues}
        ticketPrice={15}
        initialRentEstimates={enrichment?.savedRentByVenueName || {}}
        venueIdByName={enrichment?.venueIdByName || {}}
      />
    </main>
  );
}
