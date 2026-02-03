import { getPerformanceAnalytics, getAllShows, getVenues } from "@/app/lib/baserow";
import AnalyticsDashboard from "./analytics-client";

// 🔴 DEBUG MODE: Force no-cache so you see logs every refresh
export const revalidate = 0; 

export default async function AnalyticsPage() {
  console.log("\n\n==================================================");
  console.log("🕵️‍♂️ STARTING ANALYTICS DIAGNOSTIC RUN");
  console.log("==================================================\n");

  const [rawData, allShows, allVenues] = await Promise.all([
    getPerformanceAnalytics(),
    getAllShows(),
    getVenues()
  ]);

  console.log(`✅ Loaded ${rawData.length} sales rows and ${allShows.length} show metadata records.`);

  // 1. BUILD CAPACITY MAP
  const venueCapMap = new Map<string, number>();
  allVenues.forEach((v: any) => {
    if (v.name) venueCapMap.set(v.name, v.capacity);
    if (v.marketingName) venueCapMap.set(v.marketingName, v.capacity);
  });

  // 2. PROCESS SHOWS
  const metaMap = new Map(allShows.map((s: any) => [s.id, s]));
  const showsMap = new Map();

  // Counters for the summary log
  let countLite = 0;
  let countMain = 0;
  let countOther = 0;

  rawData.forEach((row: any) => {
    const meta = row.productionId ? metaMap.get(row.productionId) : null;
    
    let showName = "Unknown";
    let season = "Other";
    let type = "Other";
    let venue = "Unknown Venue";
    let decisionReason = "Default"; // For logging

if (meta) {
      showName = meta.title;
      season = meta.season?.value || meta.season || "Other";
      
      // 🛡️ EXTRACT SAFE DATA
      const typeId = meta.type?.id; 
      const typeValue = meta.type?.value || meta.type;

      // 🎯 STRICT CATEGORIZATION (Priority: ID > Value > Safe Fallback)
      
      // 1. CHECK FOR LITE (ID 2826 is the smoking gun)
      if (typeId === 2826 || typeValue === "Lite") {
          type = "CYT Lite";
      } 
      // 2. CHECK FOR MAINSTAGE
      else if (typeId === 2824 || typeValue === "Main Stage") {
          type = "Mainstage";
      }
      // 3. CHECK FOR CYT+
      else if (typeId === 2830 || typeValue === "CYT+") {
          type = "CYT+";
      }
      // 4. EXISTING TAG PASSTHROUGH (e.g. "Master Camp", "CCT")
      else if (typeValue && typeValue !== "Other") {
          type = typeValue;
      }
      // 5. LAST RESORT FALLBACK (Only if DB is empty)
      else {
          const lower = showName.toLowerCase();
          
          // Only assume Lite if it explicitly says "Kids" or "Lite"
          // We REMOVED "Jr" from here to protect Little Mermaid Jr.
          if (lower.includes("lite") || lower.includes("kids")) {
              type = "CYT Lite";
          } else if (lower.includes("cyt+")) {
              type = "CYT+";
          } else {
              type = "Other";
          }
      }

      const rawVenue = meta.venue || meta.branch;
      venue = Array.isArray(rawVenue) ? rawVenue[0]?.value : rawVenue || "TBD";
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

  const showData = Array.from(showsMap.values()).map((show: any) => {
    // Tally for final report
    if (show.type === "CYT Lite") countLite++;
    else if (show.type === "Mainstage") countMain++;
    else countOther++;

    return {
      ...show,
      avgFill: show.totalCapacity > 0 ? Math.round((show.totalSold / show.totalCapacity) * 100) : 0
    };
  }).sort((a: any, b: any) => b.totalSold - a.totalSold);

  console.log("\n--------------------------------------------------");
  console.log("📊 FINAL CATEGORY COUNTS");
  console.log(`   Mainstage: ${countMain}`);
  console.log(`   CYT Lite:  ${countLite}  <-- IF THIS IS 0, CHECK THE LOGS ABOVE!`);
  console.log(`   Other:     ${countOther}`);
  console.log("--------------------------------------------------\n");

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