import { getPerformanceAnalytics, getAllShows, getVenues } from "@/app/lib/baserow"; // <--- Add getVenues
import AnalyticsDashboard from "./analytics-client";

export const revalidate = 60; 

export default async function AnalyticsPage() {
  // 1. FETCH EVERYTHING PARALLEL
  const [rawData, allShows, allVenues] = await Promise.all([
    getPerformanceAnalytics(),
    getAllShows(),
    getVenues() // <--- Fetch the Source of Truth
  ]);

  // 2. BUILD DYNAMIC CAPACITY MAP
  // This replaces the hardcoded list. It creates a lookup like:
  // { "Kingdom Baptist": 204, "Chancellor HS": 783 }
  const venueCapMap = new Map<string, number>();
  
  allVenues.forEach((v: any) => {
    if (v.name) venueCapMap.set(v.name, v.capacity);
    // Optional: Add mapping for the "Marketing Name" too, just in case
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
      type = meta.type?.value || meta.type || "Other";
      
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
    
    // 3. DYNAMIC CAPACITY LOGIC
    // Look up the venue in our database map
    const realVenueCap = venueCapMap.get(venue);
    
    // Logic: If we have a "Hard Limit" from the venues table, use it as the floor.
    // If the ticketing system (row.capacity) is somehow HIGHER (e.g. standing room), trust that.
    // But usually, row.capacity is LOWER (artificial scarcity), so we ignore it in favor of the real cap.
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
        ticketPrice={15} 
      />
    </div>
  );
}