import { BaserowClient } from "@/app/lib/BaserowClient";
import AnalyticsDashboard from "./analytics-client";

export const dynamic = "force-dynamic";

function parseLegacySales(jsonString: string) {
  if (!jsonString) return { sold: 0, capacity: 0, count: 0 };
  try {
    const cleanString = jsonString.replace(/""/g, '"');
    const data = JSON.parse(cleanString);
    if (!Array.isArray(data)) return { sold: 0, capacity: 0, count: 0 };
    let sold = 0; let capacity = 0;
    data.forEach((perf: any) => {
      sold += Number(perf.sold) || 0;
      capacity += Number(perf.total) || 0;
    });
    return { sold, capacity, count: data.length };
  } catch (e) {
    return { sold: 0, capacity: 0, count: 0 };
  }
}

export default async function AnalyticsPage() {
  const [rawData, allShows, allVenuesRaw, allSeasons] = await Promise.all([
    BaserowClient.getPerformances(),
    BaserowClient.getAllProductions(),
    BaserowClient.getAllVenues(),
    BaserowClient.getAllSeasons()
  ]);

  const allVenues = allVenuesRaw.map((v: any) => ({
    ...v,
    id: v.id,
    name: v['Venue Name'] || "Unknown Venue",
    capacity: Number(v['Seating Capacity']) || 0,
    marketingName: v['Public Name (Marketing)'] || null
  }));

  const venueCapMap = new Map<string, number>();
  allVenues.forEach((v: any) => {
    if (v.name) venueCapMap.set(v.name, v.capacity);
    if (v.marketingName) venueCapMap.set(v.marketingName, v.capacity);
  });

  const seasonDateMap = new Map<string, number>();
  allSeasons.forEach((s: any) => {
    if (s['Session Name'] && s['Start Date']) seasonDateMap.set(s['Session Name'], new Date(s['Start Date']).getTime());
  });

  const showsMap = new Map();
  allShows.forEach((meta: any) => {
    const showName = meta['Title'] || `Show ${meta.id}`;
    const typeValue = meta['Type']?.value || "";
    let type = "Other";
    if (typeValue === "Lite" || showName.toLowerCase().includes("lite")) type = "CYT Lite";
    else if (typeValue === "Main Stage") type = "Mainstage";

    const legacyJson = meta['Performances'] || meta['field_6177']; 
    const legacyStats = parseLegacySales(legacyJson);

    let venueName = "TBD";
    if (Array.isArray(meta['Venue']) && meta['Venue'].length > 0) venueName = meta['Venue'][0].value;
    else if (typeof meta['Venue'] === 'string') venueName = meta['Venue'];

    showsMap.set(meta.id, {
      id: meta.id,
      name: showName,
      season: meta['Session']?.value || "Other",
      type: type,
      venue: venueName,
      totalSold: Number(legacyStats.sold) || 0, 
      totalCapacity: Number(legacyStats.capacity) || 0,
      performances: Number(legacyStats.count) || 0,
      source: legacyStats.count > 0 ? "Legacy JSON" : "Inventory"
    });
  });

  rawData.forEach((row: any) => {
    const prodId = row['Production']?.[0]?.id;
    let show = showsMap.get(prodId);
    
    if (!show && row['Performance']) {
      const rawName = row['Performance'].split(" - ")[0];
      for (const s of showsMap.values()) {
        if (s.name === rawName) { show = s; break; }
      }
    }

    if (show) {
      const realVenueCap = venueCapMap.get(show.venue) || 0;
      const rowCap = Number(row['Total Inventory']) || 0;
      const performanceCap = realVenueCap ? Math.max(realVenueCap, rowCap) : rowCap;
      
      show.totalSold += Number(row['Tickets Sold']) || 0;
      show.totalCapacity += Number(performanceCap) || 0;
      show.performances += 1;
      show.source = show.source === "Legacy JSON" ? "Hybrid" : "Modern Linked";
    }
  });

  const showData = Array.from(showsMap.values()).map((show: any) => ({
    ...show,
    avgFill: show.totalCapacity > 0 ? Math.round((show.totalSold / show.totalCapacity) * 100) : 0,
    revenue: show.totalSold * 15
  })).sort((a: any, b: any) => {
    const dateA = seasonDateMap.get(a.season) || 0;
    const dateB = seasonDateMap.get(b.season) || 0;
    if (dateA !== dateB) return dateA - dateB;
    return b.totalSold - a.totalSold;
  });

  return (
    <main className="h-screen bg-zinc-950 text-zinc-100 flex flex-col overflow-hidden">
      {/* 📉 The Client Component now handles everything, including the top ribbon! */}
      <AnalyticsDashboard 
        performanceData={rawData} 
        showData={showData} 
        venues={allVenues}
        ticketPrice={15} 
      />
    </main>
  );
}
