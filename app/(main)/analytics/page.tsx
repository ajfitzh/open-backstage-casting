import { getPerformanceAnalytics, getAllShows, getVenues } from "@/app/lib/baserow";
import AnalyticsDashboard from "./analytics-client";

export const revalidate = 60; 

// 1. PHYSICAL CAPACITIES (Source of Truth)
const VENUE_CAPACITIES: Record<string, number> = {
  "Kingdom Baptist Church": 204,
  "KBC": 204,
  "Spotsylvania High School": 1000,
  "Stafford High School": 1000,
  "River Club": 400,
};

export default async function AnalyticsPage() {
  const [rawData, allShows, allVenues] = await Promise.all([
    getPerformanceAnalytics(),
    getAllShows(),
    getVenues()
  ]);

  // 2. BUILD DYNAMIC CAPACITY MAP
  const venueCapMap = new Map<string, number>();
  allVenues.forEach((v: any) => {
    if (v.name) venueCapMap.set(v.name, v.capacity);
    if (v.marketingName) venueCapMap.set(v.marketingName, v.capacity);
  });

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
      
      // 🛠️ ROBUST TYPE DETECTION
      // 1. Try the direct field value
      const rawType = meta.type?.value || meta.type;
      
      // 2. If valid, use it. If missing/Other, try to guess from Title.
      if (rawType && rawType !== "Other") {
          type = rawType;
      } else {
          // Fallback: Guess based on Title keywords
          const lowerTitle = showName.toLowerCase();
          if (lowerTitle.includes("lite") || lowerTitle.includes("kids")) {
              type = "Lite";
          } else if (lowerTitle.includes("cyt+")) {
              type = "CYT+"; // Will fall into "Other" unless you add a tier for it
          } else {
              type = "Other";
          }
      }

      const rawVenue = meta.venue || meta.branch;
      venue = Array.isArray(rawVenue) ? rawVenue[0]?.value : rawVenue || "TBD";
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
        venue: venue,
        totalSold: 0,
        totalCapacity: 0,
        performances: 0
      });
    }

    const show = showsMap.get(showName);
    
    // 3. CAPACITY LOGIC
    const realVenueCap = venueCapMap.get(venue);
    const performanceCap = realVenueCap ? Math.max(realVenueCap, row.capacity) : row.capacity;

    show.totalSold += row.sold;
    show.totalCapacity += performanceCap;
    show.performances += 1;
  });

  const showData = Array.from(showsMap.values()).map((show: any) => ({
    ...show,
    avgFill: show.totalCapacity > 0 ? Math.round((show.totalSold / show.totalCapacity) * 100) : 0
  })).sort((a: any, b: any) => b.totalSold - a.totalSold);

  return (
    <div className="h-[calc(100vh-4rem)] overflow-hidden bg-zinc-950">
      <AnalyticsDashboard 
        performanceData={rawData} 
        showData={showData} 
        venues={allVenues}
        ticketPrice={15} 
      />
    </div>
  );
}