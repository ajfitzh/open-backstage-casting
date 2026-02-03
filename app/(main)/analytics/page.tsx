import { getPerformanceAnalytics, getAllShows, getVenues } from "@/app/lib/baserow";
import AnalyticsDashboard from "./analytics-client";

export const revalidate = 0; // Force no-cache so logs run every time

// 1. PHYSICAL CAPACITIES (Source of Truth)
const VENUE_CAPACITIES: Record<string, number> = {
  "Kingdom Baptist Church": 204,
  "KBC": 204,
  "Spotsylvania High School": 1000,
  "Stafford High School": 1000,
  "River Club": 400,
};

export default async function AnalyticsPage() {
  console.log("--- STARTING ANALYTICS PAGE LOAD ---");

  const [rawData, allShows, allVenues] = await Promise.all([
    getPerformanceAnalytics(),
    getAllShows(),
    getVenues()
  ]);

  console.log(`Loaded ${rawData.length} performance rows and ${allShows.length} shows.`);

  // 2. BUILD DYNAMIC CAPACITY MAP
  const venueCapMap = new Map<string, number>();
  allVenues.forEach((v: any) => {
    if (v.name) venueCapMap.set(v.name, v.capacity);
    if (v.marketingName) venueCapMap.set(v.marketingName, v.capacity);
  });

  const metaMap = new Map(allShows.map((s: any) => [s.id, s]));
  const showsMap = new Map();

  rawData.forEach((row: any, index: number) => {
    const meta = row.productionId ? metaMap.get(row.productionId) : null;
    
    let showName = "Unknown";
    let season = "Other";
    let type = "Other";
    let venue = "Unknown Venue";

    if (meta) {
      showName = meta.title;
      season = meta.season?.value || meta.season || "Other";
      
      // --- DEBUGGING BLOCK START ---
      const typeId = meta.type?.id; 
      const typeValue = meta.type?.value || meta.type;

      // Only log the first few rows or specific shows to avoid flooding, 
      // but let's log ALL "Lite" candidates to be sure.
      const isLikelyLite = showName.toLowerCase().includes("lite") || typeValue === "Lite";
      
      if (isLikelyLite) {
         console.log(`\n[DEBUG] Processing: "${showName}"`);
         console.log(`   > Raw Type ID: ${typeId} (Type: ${typeof typeId})`);
         console.log(`   > Raw Type Value: "${typeValue}"`);
      }
      // --- DEBUGGING BLOCK END ---

      // 2. ID-BASED MAPPING
      if (typeId) {
        // Ensure we are matching numbers, handle string "2826" just in case
        const safeId = Number(typeId); 

        switch (safeId) {
          case 2824: // Main Stage
            type = "Mainstage";
            break;
          case 2826: // Lite
            type = "CYT Lite";
            break;
          case 2830: // CYT+
            type = "CYT+";
            break;
          case 2825: // Master Camp
            type = "Master Camp";
            break;
          default:
            type = typeValue !== "Other" ? typeValue : "Other";
        }
      } 
      // 3. FALLBACK: STRING MAPPING
      else if (typeValue && typeValue !== "Other") {
          if (typeValue === "Lite") type = "CYT Lite";
          else if (typeValue === "Main Stage") type = "Mainstage";
          else type = typeValue;
      } 
      // 4. LAST RESORT
      else {
          const lowerTitle = showName.toLowerCase();
          if (lowerTitle.includes("lite") || lowerTitle.includes("kids")) {
              type = "CYT Lite";
          } else if (lowerTitle.includes("cyt+")) {
              type = "CYT+";
          } else {
              type = "Other";
          }
      }

      if (isLikelyLite) {
          console.log(`   > FINAL DECISION: "${type}"`);
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

  console.log("--- FINAL TALLY ---");
  const liteCount = showData.filter((s:any) => s.type === "CYT Lite").length;
  console.log(`Shows categorized as "CYT Lite": ${liteCount}`);
  
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