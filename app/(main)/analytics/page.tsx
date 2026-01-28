// app/analytics/page.jsx
import { getPerformanceAnalytics } from '@/app/lib/baserow';
import SalesChart from '@/app/components/charts/SalesChart';

export default async function AnalyticsPage() {
  // We call this without an ID to get the "Global View" (All shows 2017+)
  const chartData = await getPerformanceAnalytics();
// ADD THIS LINE:
  if (chartData.length === 0) {
    console.log("DEBUG: check Table 637 permissions and Vercel Tokens.");
  } else {
    console.log("✅ First Row Sample:", JSON.stringify(chartData[0]));
  }
  // DEBUG: This will show up in your TERMINAL (not browser)
  console.log(`📊 Found ${chartData.length} performances for analytics.`);

  return (
    <div className="p-8 bg-zinc-950 min-h-screen text-white">
      <header className="mb-10">
        <h1 className="text-4xl font-black tracking-tight text-blue-500">
          SHOW <span className="text-white">FINANCIALS</span>
        </h1>
        <p className="text-zinc-500 text-sm mt-2">
          {chartData.length > 0 
            ? `Analyzing ${chartData.length} performances from 2017 to Present` 
            : "No performance data found in Table 637."}
        </p>
      </header>

      <div className="space-y-8">
        {chartData.length > 0 ? (
          <SalesChart data={chartData} />
        ) : (
          <div className="p-20 border border-dashed border-zinc-800 rounded-3xl text-center">
             <p className="text-zinc-500">The performances table is empty or the API connection failed.</p>
             <p className="text-xs text-zinc-700 mt-2">Check your Vercel Environment Variables for Token/URL.</p>
          </div>
        )}
      </div>
    </div>
  );
}