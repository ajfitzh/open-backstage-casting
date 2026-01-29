// app/analytics/page.jsx
import { getPerformanceAnalytics } from '@/app/lib/baserow';
import SalesChart from '@/app/components/charts/SalesChart';
import { LayoutDashboard, FileWarning, RefreshCcw } from 'lucide-react';

export default async function AnalyticsPage() {
  const chartData = await getPerformanceAnalytics();
  const hasData = chartData && chartData.length > 0;

  return (
    <div className="p-8 bg-zinc-950 min-h-screen text-white selection:bg-blue-500/30">
      <header className="flex flex-col md:flex-row md:items-end justify-between mb-12 gap-6">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <LayoutDashboard className="text-blue-500" size={18} />
            <span className="text-[10px] font-black text-zinc-500 uppercase tracking-[0.2em]">Open Backstage Core</span>
          </div>
          <h1 className="text-5xl font-black tracking-tighter">
            SHOW <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-500 to-emerald-500">ANALYTICS</span>
          </h1>
          <p className="text-zinc-500 text-sm font-medium mt-3 max-w-lg leading-relaxed">
            Real-time house management and ticket velocity tracking for Fredericksburg production cycles.
          </p>
        </div>

        {hasData && (
          <div className="flex items-center gap-3 px-4 py-2 bg-zinc-900/50 border border-white/5 rounded-full">
            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
            <span className="text-[10px] font-black uppercase tracking-widest text-zinc-300">
              {chartData.length} Performances Tracked
            </span>
          </div>
        )}
      </header>

      <main>
        {hasData ? (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-1000">
            <SalesChart data={chartData} />
          </div>
        ) : (
          <EmptyState />
        )}
      </main>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center py-32 px-6 border-2 border-dashed border-zinc-900 rounded-[3rem] text-center">
      <div className="p-6 bg-zinc-900/50 rounded-3xl mb-6">
        <FileWarning className="text-zinc-700" size={48} />
      </div>
      <h3 className="text-xl font-bold text-white mb-2 tracking-tight">No Financial Identity Found</h3>
      <p className="text-zinc-500 text-sm max-w-sm mb-8 leading-relaxed">
        We couldn't retrieve records from Table 637. Ensure your environment tokens have read access to the Performance Database.
      </p>
      <button className="flex items-center gap-2 px-6 py-3 bg-white text-black text-xs font-black uppercase tracking-widest rounded-full hover:bg-blue-500 hover:text-white transition-all active:scale-95">
        <RefreshCcw size={14} />
        Check Connection
      </button>
    </div>
  );
}