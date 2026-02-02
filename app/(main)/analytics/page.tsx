import { getPerformanceAnalytics } from "@/app/lib/baserow";
import AnalyticsDashboard from "./analytics-client";

export const revalidate = 60; // Cache for 60 seconds

export default async function AnalyticsPage() {
  // 1. Fetch all raw performance data
  const rawData = await getPerformanceAnalytics();

  // 2. AGGREGATE: Group individual performances into "Shows"
  // The raw data is per-performance (e.g. "Friday Night", "Saturday Matinee")
  // We want to combine them into "The Wizard of Oz"
  const showsMap = new Map();

  rawData.forEach((row: any) => {
    // Clean up the name. Assuming format might be "Show Name - Date" or just "Show Name"
    // We split by " - " and take the first part as the Show Title
    const nameParts = row.name.split(" - ");
    const showName = nameParts[0] || "Unknown Show";
    const season = nameParts[1] || "General"; // Try to guess season from name if present

    if (!showsMap.has(showName)) {
      showsMap.set(showName, {
        id: showName, // Use name as ID for aggregation
        name: showName,
        season: season,
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

  // 3. Calculate final stats per show (Avg Fill, etc.)
  const showData = Array.from(showsMap.values()).map(show => ({
    ...show,
    avgFill: show.totalCapacity > 0 ? Math.round((show.totalSold / show.totalCapacity) * 100) : 0
  })).sort((a, b) => b.totalSold - a.totalSold); // Sort by best sellers

  return (
    <div className="h-[calc(100vh-4rem)] overflow-hidden bg-zinc-950">
      <AnalyticsDashboard 
        performanceData={rawData} 
        showData={showData} 
        ticketPrice={15} // Default ticket price estimate
      />
    </div>
  );
}