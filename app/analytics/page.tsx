// app/analytics/page.jsx
import { getPerformanceAnalytics } from '@/app/lib/baserow';
import SalesChart from '@/components/charts/SalesChart';

export default async function AnalyticsPage() {
  // Next.js fetches this ON THE SERVER. Your API key is safe.
  const chartData = await getPerformanceAnalytics();

  return (
    <div className="p-8 bg-zinc-950 min-h-screen text-white">
      <h1 className="text-4xl font-black text-blue-500 mb-8">FINANCIALS</h1>
      
      {/* You would create SalesChart as a Client Component ('use client') 
         so it can use Recharts, but it receives the data perfectly cleaned 
         from the server!
      */}
      <SalesChart data={chartData} />
    </div>
  );
}