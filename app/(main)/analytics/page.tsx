import { getPerformanceAnalytics, getAllShows, getVenues, getSeasons } from "@/app/lib/baserow";
import AnalyticsDashboard from "./analytics-client";

export const revalidate = 0;

// 🛠️ HELPER: Parse legacy JSON
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

const toUSD = (amount: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(amount);

export default async function AnalyticsPage() {
  const [rawData, allShows, allVenues, allSeasons] = await Promise.all([
    getPerformanceAnalytics(),
    getAllShows(),
    getVenues(),
    getSeasons()
  ]);

  // 1. MAPS
  const venueCapMap = new Map<string, number>();
  allVenues.forEach((v: any) => {
    if (v.name) venueCapMap.set(v.name, v.capacity);
    if (v.marketingName) venueCapMap.set(v.marketingName, v.capacity);
  });

  const seasonDateMap = new Map<string, number>();
  allSeasons.forEach((s: any) => {
    if (s.name && s.startDate) seasonDateMap.set(s.name, new Date(s.startDate).getTime());
  });

  // 2. BUILD SHOWS
  const showsMap = new Map();
  allShows.forEach((meta: any) => {
    const showName = meta.title || `Show ${meta.id}`;
    
    // Categorization
    const typeValue = meta.type?.value || meta.type || "";
    let type = "Other";
    if (typeValue === "Lite" || showName.toLowerCase().includes("lite")) type = "CYT Lite";
    else if (typeValue === "Main Stage") type = "Mainstage";

    // Legacy Data
    const legacyJson = meta.Performances || meta.field_6177; 
    const legacyStats = parseLegacySales(legacyJson);

    showsMap.set(meta.id, {
      id: meta.id,
      name: showName,
      season: meta.season?.value || meta.season || "Other",
      type: type,
      venue: Array.isArray(meta.venue) ? meta.venue[0]?.value : meta.venue || "TBD",
      totalSold: legacyStats.sold,
      totalCapacity: legacyStats.capacity,
      performances: legacyStats.count,
      source: legacyStats.count > 0 ? "Legacy JSON" : "Inventory"
    });
  });

  // 3. LINK DATA
  rawData.forEach((row: any) => {
    let show = showsMap.get(row.productionId);
    if (!show) {
      const rawName = row.name.split(" - ")[0];
      for (const s of showsMap.values()) {
        if (s.name === rawName) { show = s; break; }
      }
    }
    if (show) {
      const realVenueCap = venueCapMap.get(show.venue);
      const performanceCap = realVenueCap ? Math.max(realVenueCap, row.capacity) : row.capacity;
      show.totalSold += row.sold;
      show.totalCapacity += performanceCap;
      show.performances += 1;
      if (show.source === "Legacy JSON") show.source = "Hybrid";
      else show.source = "Modern Linked";
    }
  });

  // 4. SORT & PREP
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

  // 5. SUMMARY STATS (Top Header)
  const categories = ["Mainstage", "CYT Lite", "Other"];
  const summaryStats = categories.map(cat => {
    const shows = showData.filter((s: any) => s.type === cat);
    const totalSold = shows.reduce((acc, s) => acc + s.totalSold, 0);
    const totalCap = shows.reduce((acc, s) => acc + s.totalCapacity, 0);
    const totalRev = shows.reduce((acc, s) => acc + s.revenue, 0);
    const count = shows.length;
    return {
      label: cat === "Other" ? "OTHER PROGRAMS" : cat.toUpperCase(),
      fillRate: totalCap > 0 ? Math.round((totalSold / totalCap) * 100) : 0,
      revenue: totalRev,
      count: count,
      perShowAvg: count > 0 ? Math.round(totalRev / count) : 0
    };
  });

  return (
    // 🚨 CSS FIX: h-screen instead of min-h-screen
    <div className="h-screen bg-zinc-950 text-zinc-100 flex flex-col overflow-hidden">
      
      {/* 🟢 TOP PROFIT MODEL SUMMARY */}
      <div className="w-full border-b border-zinc-800 bg-zinc-900/50 p-6 shrink-0">
        <div className="max-w-[1920px] mx-auto">
          <h2 className="text-xs font-bold text-zinc-500 uppercase tracking-widest mb-4">Profit Model & Efficiency</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {summaryStats.map((stat) => (
              <div key={stat.label} className="bg-zinc-900 border border-zinc-800 p-4 rounded-lg flex flex-col justify-between">
                <div>
                  <div className="flex justify-between items-start mb-2">
                    <h3 className="text-lg font-black text-white tracking-tight">{stat.label}</h3>
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${stat.fillRate > 80 ? 'bg-emerald-500/10 text-emerald-400' : 'bg-zinc-800 text-zinc-400'}`}>{stat.fillRate}% FILL</span>
                  </div>
                  <div className="text-2xl font-medium text-white tabular-nums tracking-tighter mb-1">{toUSD(stat.revenue)}</div>
                  <div className="text-xs text-zinc-500">across {stat.count} Productions</div>
                </div>
                <div className="mt-3 pt-3 border-t border-zinc-800 flex justify-between items-center">
                  <span className="text-[10px] font-semibold text-zinc-500 uppercase">Avg / Show</span>
                  <span className="text-sm font-bold text-emerald-400 tabular-nums">{toUSD(stat.perShowAvg)}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* 📉 MAIN DASHBOARD */}
      <div className="flex-1 overflow-hidden relative">
        <AnalyticsDashboard 
          performanceData={rawData} 
          showData={showData} 
          venues={allVenues}
          ticketPrice={15} 
        />
      </div>
    </div>
  );
}