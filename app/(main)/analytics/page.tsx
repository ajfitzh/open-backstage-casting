import { getPerformanceAnalytics } from "@/app/lib/baserow";
import AnalyticsDashboard from "./analytics-client";

export const revalidate = 60; // Cache for 60 seconds

// 🛠️ HELPER: Cleans the raw Baserow data
// Handles: '[{"id": 3, "value": "Willy Wonka - Spring"}]' -> { title: "Willy Wonka", season: "Spring" }
function cleanName(rawInput: any) {
  let text = rawInput;

  // 1. If it's a JSON string (starts with [ or {), parse it first
  if (typeof rawInput === 'string' && (rawInput.startsWith('[') || rawInput.startsWith('{'))) {
    try {
      const parsed = JSON.parse(rawInput);
      if (Array.isArray(parsed) && parsed.length > 0) {
        text = parsed[0].value || parsed[0].name || rawInput;
      } else if (typeof parsed === 'object') {
        text = parsed.value || parsed.name || rawInput;
      }
    } catch (e) {
      // If parsing fails, just keep using the string as-is
    }
  }

  // 2. Now split by " - " to separate Title from Season
  // Expected format: "Show Title - Season Name - Year"
  if (typeof text === 'string') {
    const parts = text.split(" - ");
    return {
      title: parts[0]?.trim() || "Unknown Show",
      season: parts[1]?.trim() || "General", 
    };
  }

  return { title: "Unknown Show", season: "General" };
}

export default async function AnalyticsPage() {
  // 1. Fetch all raw performance data
  const rawData = await getPerformanceAnalytics();

  // 2. AGGREGATE: Group individual performances into "Shows"
  const showsMap = new Map();

  rawData.forEach((row: any) => {
    // Use the helper to get clean data
    const { title, season } = cleanName(row.name);

    if (!showsMap.has(title)) {
      showsMap.set(title, {
        id: title, 
        name: title,  // <--- Clean Name
        season: season, // <--- Clean Season
        totalSold: 0,
        totalCapacity: 0,
        performances: 0
      });
    }

    const show = showsMap.get(title);
    show.totalSold += row.sold;
    show.totalCapacity += row.capacity;
    show.performances += 1;
  });

  // 3. Calculate final stats per show
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