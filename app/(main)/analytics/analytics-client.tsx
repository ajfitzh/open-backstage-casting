"use client";

import { useState, useMemo } from 'react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, 
  ResponsiveContainer, Cell, AreaChart, Area, PieChart, Pie, ScatterChart, Scatter, ZAxis
} from 'recharts';
import { 
  LayoutGrid, BarChart2, Zap, Landmark, Search, 
  ArrowLeft, Users, Ticket, DollarSign, PieChart as PieIcon, 
  Crown, Sparkles // Icons for Mainstage vs Lite
} from 'lucide-react';

export default function AnalyticsDashboard({ performanceData, showData, ticketPrice }: { performanceData: any[], showData: any[], ticketPrice: number }) {
  const [activeTab, setActiveTab] = useState<'overview' | 'seasons'>('overview');
  const [selectedShow, setSelectedShow] = useState<any | null>(null);
  const [searchTerm, setSearchTerm] = useState("");

  // 1. ENRICH DATA WITH TIERS
  // We assume if the average venue capacity per performance is > 300, it's a Mainstage
  const tieredShows = useMemo(() => {
    return showData.map(show => {
      const avgCapacity = show.totalCapacity / (show.performances || 1);
      const tier = avgCapacity > 300 ? "Mainstage" : "Lite";
      return { ...show, tier, avgCapacity };
    });
  }, [showData]);

  // --- FILTERED DATA ---
  const filteredShows = useMemo(() => {
    let data = tieredShows;
    if (searchTerm) {
      data = data.filter(s => s.name.toLowerCase().includes(searchTerm.toLowerCase()));
    }
    return data;
  }, [tieredShows, searchTerm]);

  // --- SPLIT STATS (The "True" Analysis) ---
  const tierStats = useMemo(() => {
    const calcStats = (shows: any[]) => {
      if (!shows.length) return { avgFill: 0, revenue: 0, count: 0 };
      const totalRev = shows.reduce((acc, curr) => acc + (curr.totalSold * ticketPrice), 0);
      // We calculate Fill Rate based on TOTAL seats available in that tier, not averaging percentages
      const totalCap = shows.reduce((acc, curr) => acc + curr.totalCapacity, 0);
      const totalSold = shows.reduce((acc, curr) => acc + curr.totalSold, 0);
      const avgFill = totalCap > 0 ? Math.round((totalSold / totalCap) * 100) : 0;
      return { avgFill, revenue: totalRev, count: shows.length };
    };

    return {
      mainstage: calcStats(filteredShows.filter(s => s.tier === "Mainstage")),
      lite: calcStats(filteredShows.filter(s => s.tier === "Lite")),
      total: calcStats(filteredShows)
    };
  }, [filteredShows, ticketPrice]);

  // --- RENDER HELPERS ---
  const formatCurrency = (val: number) => `$${val.toLocaleString()}`;

  return (
    <div className="h-full flex flex-col bg-zinc-950 text-zinc-200">
      
      {/* HEADER & TABS */}
      <div className="px-6 py-4 border-b border-white/5 flex justify-between items-center shrink-0 bg-zinc-950/50 backdrop-blur-md sticky top-0 z-10">
        <div className="flex gap-2">
          {selectedShow ? (
            <button 
              onClick={() => setSelectedShow(null)}
              className="px-4 py-2 rounded-xl flex items-center gap-2 text-xs font-black uppercase tracking-widest bg-zinc-800 hover:bg-zinc-700 transition-colors text-white"
            >
              <ArrowLeft size={14} /> Back to Dashboard
            </button>
          ) : (
            <>
              <TabButton active={activeTab === 'overview'} onClick={() => setActiveTab('overview')} icon={<BarChart2 size={14}/>} label="Overview" />
              <TabButton active={activeTab === 'seasons'} onClick={() => setActiveTab('seasons')} icon={<Landmark size={14}/>} label="Season History" />
            </>
          )}
        </div>

        {!selectedShow && activeTab === 'overview' && (
          <div className="relative group">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500 group-focus-within:text-white transition-colors" size={14} />
            <input 
              type="text" 
              placeholder="Search shows..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="bg-zinc-900 border border-zinc-800 rounded-full pl-9 pr-4 py-1.5 text-xs font-bold text-white placeholder:text-zinc-600 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 w-64 transition-all"
            />
          </div>
        )}
      </div>

      <div className="flex-1 overflow-hidden relative bg-zinc-950">
        
        {/* === DRILL DOWN: SINGLE SHOW VIEW === */}
        {selectedShow ? (
           <SingleShowView show={selectedShow} ticketPrice={ticketPrice} />
        ) : (
          /* === MAIN DASHBOARD VIEW === */
          <div className="absolute inset-0 overflow-y-auto p-8 custom-scrollbar">
            
            {activeTab === 'overview' && (
              <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                 
                 {/* 1. THE SPLIT METRICS HEADER */}
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* MAINSTAGE CARD */}
                    <div className="bg-zinc-900/50 border border-white/5 p-6 rounded-3xl relative overflow-hidden group hover:border-blue-500/30 transition-colors">
                       <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                          <Crown size={120} />
                       </div>
                       <div className="relative z-10">
                          <h3 className="text-xs font-black text-blue-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                             <Crown size={14} /> Mainstage Performance
                          </h3>
                          <div className="flex gap-8">
                             <div>
                                <p className="text-[10px] text-zinc-500 uppercase tracking-widest">Avg Fill Rate</p>
                                <p className={`text-3xl font-black ${tierStats.mainstage.avgFill < 50 ? 'text-red-500' : 'text-white'}`}>
                                   {tierStats.mainstage.avgFill}%
                                </p>
                             </div>
                             <div>
                                <p className="text-[10px] text-zinc-500 uppercase tracking-widest">Revenue</p>
                                <p className="text-3xl font-black text-white">{formatCurrency(tierStats.mainstage.revenue)}</p>
                             </div>
                          </div>
                          <p className="mt-4 text-[10px] text-zinc-500">
                             Across {tierStats.mainstage.count} large-venue productions
                          </p>
                       </div>
                    </div>

                    {/* LITE CARD */}
                    <div className="bg-zinc-900/50 border border-white/5 p-6 rounded-3xl relative overflow-hidden group hover:border-amber-500/30 transition-colors">
                       <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                          <Sparkles size={120} />
                       </div>
                       <div className="relative z-10">
                          <h3 className="text-xs font-black text-amber-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                             <Sparkles size={14} /> CYT Lite Performance
                          </h3>
                          <div className="flex gap-8">
                             <div>
                                <p className="text-[10px] text-zinc-500 uppercase tracking-widest">Avg Fill Rate</p>
                                <p className="text-3xl font-black text-white">
                                   {tierStats.lite.avgFill}%
                                </p>
                             </div>
                             <div>
                                <p className="text-[10px] text-zinc-500 uppercase tracking-widest">Revenue</p>
                                <p className="text-3xl font-black text-white">{formatCurrency(tierStats.lite.revenue)}</p>
                             </div>
                          </div>
                          <p className="mt-4 text-[10px] text-zinc-500">
                             Across {tierStats.lite.count} small-venue productions
                          </p>
                       </div>
                    </div>
                 </div>

                 <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* LEFT: SCATTER CHART (Better for showing outliers) */}
                    <div className="lg:col-span-2 bg-zinc-900/50 border border-white/5 p-6 rounded-[2.5rem]">
                       <h3 className="text-xs font-black text-white uppercase tracking-widest mb-6 flex items-center gap-2">
                          <LayoutGrid size={16} className="text-emerald-500" /> Efficiency Matrix: Fill % vs Venue Size
                       </h3>
                       <div className="h-[400px]">
                          <ResponsiveContainer width="100%" height="100%">
                             <ScatterChart margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#18181b" />
                                <XAxis type="number" dataKey="avgCapacity" name="Venue Size" unit=" seats" stroke="#3f3f46" tick={{fill: '#71717a', fontSize: 10}} />
                                <YAxis type="number" dataKey="avgFill" name="Fill Rate" unit="%" stroke="#3f3f46" tick={{fill: '#71717a', fontSize: 10}} />
                                <ZAxis type="number" dataKey="totalSold" range={[50, 400]} name="Tickets Sold" />
                                <Tooltip 
                                  cursor={{ strokeDasharray: '3 3' }}
                                  content={({ active, payload }) => {
                                      if (active && payload && payload.length) {
                                        const data = payload[0].payload;
                                        return (
                                          <div className="bg-zinc-950 border border-zinc-800 p-3 rounded-xl shadow-xl">
                                            <p className="text-xs font-bold text-white mb-1">{data.name}</p>
                                            <p className="text-[10px] text-zinc-400">Venue: {Math.round(data.avgCapacity)} seats</p>
                                            <p className="text-[10px] text-zinc-400">Fill: <span className={data.avgFill < 50 ? "text-red-500 font-bold" : "text-emerald-500 font-bold"}>{data.avgFill}%</span></p>
                                            <p className="text-[10px] text-zinc-500 mt-1 uppercase tracking-widest">{data.tier}</p>
                                          </div>
                                        );
                                      }
                                      return null;
                                  }}
                                />
                                <Legend />
                                <Scatter name="Mainstage" data={filteredShows.filter(s => s.tier === 'Mainstage')} fill="#3b82f6" shape="circle" onClick={(data: any) => setSelectedShow(data)} className="cursor-pointer opacity-80 hover:opacity-100" />
                                <Scatter name="CYT Lite" data={filteredShows.filter(s => s.tier === 'Lite')} fill="#f59e0b" shape="triangle" onClick={(data: any) => setSelectedShow(data)} className="cursor-pointer opacity-80 hover:opacity-100" />
                             </ScatterChart>
                          </ResponsiveContainer>
                       </div>
                       <div className="text-center text-[10px] text-zinc-500 uppercase tracking-widest mt-4">
                          Click any point to inspect production
                       </div>
                    </div>

                    {/* RIGHT: LIST VIEW */}
                    <div className="space-y-4 max-h-[500px] overflow-y-auto pr-2 custom-scrollbar">
                       {filteredShows.map(show => (
                          <button 
                            key={show.id} 
                            onClick={() => setSelectedShow(show)}
                            className="w-full text-left group bg-zinc-900 border border-white/5 p-4 rounded-2xl hover:bg-zinc-800 transition-all hover:scale-[1.02] active:scale-95"
                          >
                             <div className="flex justify-between items-start mb-2">
                                <div className="flex items-center gap-2">
                                   {show.tier === 'Mainstage' ? <Crown size={12} className="text-blue-500"/> : <Sparkles size={12} className="text-amber-500"/>}
                                   <p className="text-[10px] font-black text-zinc-500 uppercase">{show.season}</p>
                                </div>
                                <div className={`w-2 h-2 rounded-full ${show.avgFill > 75 ? 'bg-emerald-500' : 'bg-red-500'}`} />
                             </div>
                             <p className="text-sm font-bold text-white mb-1 group-hover:text-blue-400 transition-colors truncate">{show.name}</p>
                             <div className="flex gap-3 text-[10px] font-medium text-zinc-400">
                                <span>{show.avgFill}% Sold</span>
                                <span>•</span>
                                <span>{Math.round(show.avgCapacity)} cap.</span>
                             </div>
                          </button>
                       ))}
                    </div>
                 </div>
              </div>
            )}

            {activeTab === 'seasons' && (
              <div className="p-8 text-center text-zinc-500 italic">
                  Season history view is being updated to support tiered breakdown.
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// --- SUBCOMPONENTS ---

function SingleShowView({ show, ticketPrice }: { show: any, ticketPrice: number }) {
    // Re-implemented standard S-Curve for single view
    const velocityData = useMemo(() => {
        const points = [];
        const maxFill = show.avgFill;
        for (let i = 0; i <= 42; i++) {
          const standardCurve = 1 / (1 + Math.exp(-0.15 * (i - 30)));
          const target = Math.floor(standardCurve * 100); 
          const actual = i > 35 ? null : Math.floor(standardCurve * maxFill); 
          points.push({ name: `T-${42 - i}`, target, actual });
        }
        return points;
    }, [show]);

    return (
        <div className="absolute inset-0 overflow-y-auto p-8 animate-in slide-in-from-right-8 fade-in duration-300 custom-scrollbar">
            <div className="flex flex-col md:flex-row gap-6 justify-between items-start md:items-end mb-8 border-b border-white/5 pb-8">
            <div>
                <div className="flex items-center gap-2 mb-2">
                    <span className={`text-[10px] font-black uppercase tracking-widest px-2 py-1 rounded-full ${show.tier === 'Mainstage' ? 'bg-blue-500/10 text-blue-500' : 'bg-amber-500/10 text-amber-500'}`}>
                        {show.tier} Production
                    </span>
                </div>
                <h1 className="text-4xl font-black text-white tracking-tighter">{show.name}</h1>
                <p className="text-zinc-500 mt-2 font-medium">Season: {show.season || "Unknown"}</p>
            </div>
            <div className="flex gap-4">
                <MetricCard label="Revenue" value={`$${(show.totalSold * ticketPrice).toLocaleString()}`} icon={<DollarSign size={16} className="text-emerald-500"/>} />
                <MetricCard label="Fill Rate" value={`${show.avgFill}%`} icon={<Users size={16} className="text-blue-500"/>} />
                <MetricCard label="Venue Cap" value={Math.round(show.avgCapacity).toLocaleString()} icon={<Ticket size={16} className="text-zinc-500"/>} />
            </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 bg-zinc-900/50 border border-white/5 p-6 rounded-3xl">
                <h3 className="text-xs font-black text-white uppercase tracking-widest mb-6 flex items-center gap-2">
                    <Zap size={16} className="text-amber-500" /> Sales Velocity
                </h3>
                <div className="h-[300px]">
                    <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={velocityData}>
                        <defs>
                        <linearGradient id="colorActual" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                            <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                        </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="#18181b" />
                        <XAxis dataKey="name" stroke="#3f3f46" tick={{fontSize: 10}} />
                        <YAxis stroke="#3f3f46" tick={{fontSize: 10}} />
                        <Tooltip contentStyle={{ backgroundColor: '#09090b', borderColor: '#27272a', borderRadius: '12px' }} />
                        <Area type="monotone" dataKey="target" stroke="#52525b" strokeWidth={2} strokeDasharray="5 5" fill="transparent" name="Target Pace" />
                        <Area type="monotone" dataKey="actual" stroke="#10b981" strokeWidth={3} fill="url(#colorActual)" name="Actual Sales" />
                    </AreaChart>
                    </ResponsiveContainer>
                </div>
                </div>

                <div className="bg-zinc-900/50 border border-white/5 p-6 rounded-3xl">
                <h3 className="text-xs font-black text-white uppercase tracking-widest mb-6 flex items-center gap-2">
                    <PieIcon size={16} className="text-blue-500" /> Capacity
                </h3>
                <div className="h-[200px] relative">
                    <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                        <Pie
                        data={[
                            { name: 'Sold', value: show.totalSold },
                            { name: 'Empty', value: show.totalCapacity - show.totalSold },
                        ]}
                        innerRadius={60}
                        outerRadius={80}
                        paddingAngle={5}
                        dataKey="value"
                        >
                        <Cell fill="#10b981" />
                        <Cell fill="#27272a" />
                        </Pie>
                        <Tooltip contentStyle={{ backgroundColor: '#09090b', borderColor: '#27272a', borderRadius: '12px' }} />
                    </PieChart>
                    </ResponsiveContainer>
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                        <div className="text-center">
                        <div className="text-2xl font-black text-white">{show.avgFill}%</div>
                        <div className="text-[9px] uppercase tracking-widest text-zinc-500">Filled</div>
                        </div>
                    </div>
                </div>
                </div>
            </div>
        </div>
    );
}

function TabButton({ active, onClick, icon, label }: { active: boolean, onClick: () => void, icon: any, label: string }) {
  return (
    <button 
      onClick={onClick}
      className={`px-4 py-2 rounded-xl flex items-center gap-2 text-[10px] font-black uppercase tracking-widest transition-all ${active ? 'bg-white text-black shadow-lg scale-105' : 'text-zinc-500 hover:text-zinc-300 hover:bg-zinc-900'}`}
    >
      {icon} {label}
    </button>
  );
}

function MetricCard({ label, value, icon }: { label: string, value: string, icon: any }) {
   return (
      <div className="bg-zinc-900 border border-white/5 px-4 py-3 rounded-xl min-w-[120px]">
         <div className="flex justify-between items-center mb-1">
            <span className="text-[9px] font-black uppercase tracking-widest text-zinc-500">{label}</span>
            {icon}
         </div>
         <div className="text-lg font-black text-white">{value}</div>
      </div>
   )
}