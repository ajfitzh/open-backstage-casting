import { getPerformanceAnalytics, getAllShows } from "@/app/lib/baserow";
import AnalyticsDashboard from "./analytics-client";

export const revalidate = 60; 

export default async function AnalyticsPage() {
  const [rawData, allShows] = await Promise.all([
    getPerformanceAnalytics(),
    getAllShows()
  ]);

  const metaMap = new Map(allShows.map((s: any) => [s.id, s]));
  const showsMap = new Map();

  rawData.forEach((row: any) => {
    const meta = row.productionId ? metaMap.get(row.productionId) : null;
    
    let showName = "Unknown";
    let season = "Other";
    let type = "Other";
    let venue = "Unknown Venue";

    if (meta) {
      showName = meta.title;
      season = meta.season?.value || meta.season || "Other";
      type = meta.type?.value || meta.type || "Other";
      
      // 🛠️ FIX: Prioritize the specific Venue Link. 
      // If null, fall back to Branch, then TBD.
      venue = meta.venue || meta.branch || "TBD"; 
    } else {
      const parts = row.name.split(" - ");
      showName = parts[0];
    }

    if (!showsMap.has(showName)) {
      showsMap.set(showName, {
        id: row.productionId || showName,
        name: showName,
        season: season,
        type: type,
        venue: venue, // Now contains specific venue (e.g. "Fredericksburg Academy")
        totalSold: 0,
        totalCapacity: 0,
        performances: 0
      });
    }

    const show = showsMap.get(showName);
    show.totalSold += row.sold;
    show.totalCapacity += row.capacity;
    show.performances += 1;
  });
  // 4. Calculate final stats
  const showData = Array.from(showsMap.values()).map(show => ({
    ...show,
    avgFill: show.totalCapacity > 0 ? Math.round((show.totalSold / show.totalCapacity) * 100) : 0
  })).sort((a, b) => b.totalSold - a.totalSold);

  return (
    <div className="h-[calc(100vh-4rem)] overflow-hidden bg-zinc-950">
      <AnalyticsDashboard 
        performanceData={rawData} 
        showData={showData} 
        ticketPrice={15} 
      />
    </div>
  );
}