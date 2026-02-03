"use client";

import { useState, useMemo } from 'react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, 
  ResponsiveContainer, Cell, AreaChart, Area, PieChart, Pie, ScatterChart, Scatter, ZAxis, Legend, LineChart, Line
} from 'recharts';
import { 
  LayoutGrid, BarChart2, Zap, Landmark, Search, 
  ArrowLeft, Users, Ticket, DollarSign, PieChart as PieIcon, 
  Crown, Sparkles, Box, Tent, MapPin, TrendingUp, History, Building2, Calculator, Coins, BarChart3
} from 'lucide-react';

export default function AnalyticsDashboard({ 
  performanceData, 
  showData, 
  venues, 
  ticketPrice 
}: { 
  performanceData: any[], 
  showData: any[], 
  venues: any[], 
  ticketPrice: number 
}) {
  const [activeTab, setActiveTab] = useState<'overview' | 'seasons'>('overview');
  const [selectedShow, setSelectedShow] = useState<any | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  
  // 🆕 NEW STATE FOR CHART MODES (Fill %, Raw Sales #, Profit $)
  const [chartMode, setChartMode] = useState<'fill' | 'sales' | 'profit'>('fill');
  
  const [rentEstimates, setRentEstimates] = useState<Record<string, number>>({
      "Fredericksburg Academy": 2500,
      "Spotsylvania High School": 3000,
      "King George High School": 1500,
      "Kingdom Baptist Church": 500
  });

  const handleRentChange = (venueName: string, val: string) => {
      const num = parseInt(val.replace(/[^0-9]/g, '')) || 0;
      setRentEstimates(prev => ({ ...prev, [venueName]: num }));
  };

  // 1. NORMALIZE TIERS
  const tieredShows = useMemo(() => {
    return showData.map(show => {
      let tier = "Other";
      const typeLower = (show.type || "").toLowerCase();
      if (typeLower.includes("main")) tier = "Mainstage";
      else if (typeLower.includes("lite")) tier = "Lite";
      return { ...show, tier };
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

  // --- SPLIT STATS ---
  const tierStats = useMemo(() => {
    const calcStats = (shows: any[]) => {
      if (!shows.length) return { avgFill: 0, revenue: 0, count: 0 };
      const totalRev = shows.reduce((acc, curr) => acc + (curr.totalSold * ticketPrice), 0);
      const totalCap = shows.reduce((acc, curr) => acc + curr.totalCapacity, 0);
      const totalSold = shows.reduce((acc, curr) => acc + curr.totalSold, 0);
      const avgFill = totalCap > 0 ? Math.round((totalSold / totalCap) * 100) : 0;
      return { avgFill, revenue: totalRev, count: shows.length };
    };

    return {
      mainstage: calcStats(filteredShows.filter(s => s.tier === "Mainstage")),
      lite: calcStats(filteredShows.filter(s => s.tier === "Lite")),
      other: calcStats(filteredShows.filter(s => s.tier === "Other")),
    };
  }, [filteredShows, ticketPrice]);

  // --- VENUE INTELLIGENCE CARD STATS ---
  const venueStats = useMemo(() => {
    const venueMap: Record<string, { name: string, count: number, totalRev: number, totalFill: number, shows: number }> = {};
    
    filteredShows.forEach(show => {
        const vName = show.venue || "Unknown Venue";
        if (!venueMap[vName]) venueMap[vName] = { name: vName, count: 0, totalRev: 0, totalFill: 0, shows: 0 };
        
        venueMap[vName].count += 1;
        venueMap[vName].totalRev += (show.totalSold * ticketPrice);
        venueMap[vName].totalFill += show.avgFill;
        venueMap[vName].shows += 1;
    });

    const venueList = Object.values(venueMap);
    const mostUsed = [...venueList].sort((a,b) => b.count - a.count)[0] || { name: "N/A", count: 0 };
    const mostProfitable = [...venueList].sort((a,b) => b.totalRev - a.totalRev)[0] || { name: "N/A", totalRev: 0 };
    const highestFill = [...venueList].map(v => ({ ...v, avgFill: Math.round(v.totalFill / v.shows) })).sort((a,b) => b.avgFill - a.avgFill)[0] || { name: "N/A", avgFill: 0 };

    return { mostUsed, mostProfitable, highestFill };
  }, [filteredShows, ticketPrice]);

  // --- 🆕 CHART DATA GENERATOR ---
  const chartData = useMemo(() => {
    // Group shows by Season
    const seasonMap: Record<string, any> = {};
    const chronologicalShows = [...showData].reverse(); 

    chronologicalShows.forEach(show => {
        const season = show.season || "Unknown";
        if (!seasonMap[season]) seasonMap[season] = { name: season };
        
        const vKey = show.venue;
        const rent = rentEstimates[vKey] || 0;
        
        // Calculate Metrics
        const fill = show.avgFill;
        const sold = show.totalSold; // NEW: Raw Ticket Count
        const revenue = show.totalSold * ticketPrice;
        const profit = revenue - rent;

        if (!seasonMap[season][vKey]) {
            seasonMap[season][vKey] = { fill, profit, sold, count: 1 };
        } else {
            const prev = seasonMap[season][vKey];
            seasonMap[season][vKey] = {
                fill: prev.fill + fill,
                profit: prev.profit + profit,
                sold: prev.sold + sold,
                count: prev.count + 1
            };
        }
    });

    // Flatten for Recharts
    return Object.values(seasonMap).map((s: any) => {
        const result: any = { name: s.name };
        Object.keys(s).forEach(key => {
            if (key !== 'name') {
                // Average the values for the season (e.g. "Average Tickets Sold Per Show")
                if (chartMode === 'fill') {
                    result[key] = Math.round(s[key].fill / s[key].count);
                } else if (chartMode === 'sales') {
                    result[key] = Math.round(s[key].sold / s[key].count);
                } else {
                    result[key] = Math.round(s[key].profit / s[key].count);
                }
            }
        });
        return result;
    });
  }, [showData, chartMode, rentEstimates, ticketPrice]);

  // --- ENRICHED VENUE LIST (SCORECARDS) ---
  const enrichedVenues = useMemo(() => {
      if (!venues || !venues.length) return [];
      
      return venues.map(v => {
          const stats = showData.filter(s => s.venue === v.name);
          const totalRevenue = stats.reduce((acc, s) => acc + (s.totalSold * ticketPrice), 0);
          const avgFill = stats.length ? Math.round(stats.reduce((acc, s) => acc + s.avgFill, 0) / stats.length) : 0;
          return { ...v, trackedShows: stats.length, totalRevenue, avgFill };
      }).sort((a,b) => b.trackedShows - a.trackedShows); 
  }, [venues, showData, ticketPrice]);

  // --- RENDER HELPERS ---
  const formatCurrency = (val: number) => `$${val.toLocaleString()}`;

  // Helper for Chart Titles
  const getChartTitle = () => {
      if (chartMode === 'sales') return "Ticket Volume (Raw Sales)";
      if (chartMode === 'profit') return "Profitability Simulator";
      return "Fill Rate Trends";
  };
  const getChartSub = () => {
      if (chartMode === 'sales') return "Avg. Tickets Sold Per Production";
      if (chartMode === 'profit') return "Net Profit Per Show (Est)";
      return "Venue Performance Over Time";
  };

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
          <div className="absolute inset-0 overflow-y-auto p-8 custom-scrollbar space-y-12">
            
            {activeTab === 'overview' && (
              <>
                 <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                 
                     {/* 1. THE SPLIT METRICS HEADER */}
                     <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                        {/* MAINSTAGE */}
                        <div className="bg-zinc-900/50 border border-white/5 p-6 rounded-3xl relative overflow-hidden group hover:border-blue-500/30 transition-colors">
                           <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                              <Crown size={100} />
                           </div>
                           <div className="relative z-10">
                              <h3 className="text-[10px] font-black text-blue-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                                 <Crown size={14} /> Mainstage
                              </h3>
                              <div className="flex flex-col gap-1">
                                 <span className="text-3xl font-black text-white">{tierStats.mainstage.avgFill}%</span>
                                 <span className="text-[10px] uppercase tracking-widest text-zinc-500">Avg Fill Rate</span>
                              </div>
                              <div className="mt-4 pt-4 border-t border-white/5 flex justify-between items-center">
                                 <span className="text-xs font-bold text-white">{formatCurrency(tierStats.mainstage.revenue)}</span>
                                 <span className="text-[9px] font-bold text-zinc-500">{tierStats.mainstage.count} Shows</span>
                              </div>
                           </div>
                        </div>

                        {/* LITE */}
                        <div className="bg-zinc-900/50 border border-white/5 p-6 rounded-3xl relative overflow-hidden group hover:border-amber-500/30 transition-colors">
                           <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                              <Sparkles size={100} />
                           </div>
                           <div className="relative z-10">
                              <h3 className="text-[10px] font-black text-amber-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                                 <Sparkles size={14} /> CYT Lite
                              </h3>
                              <div className="flex flex-col gap-1">
                                 <span className="text-3xl font-black text-white">{tierStats.lite.avgFill}%</span>
                                 <span className="text-[10px] uppercase tracking-widest text-zinc-500">Avg Fill Rate</span>
                              </div>
                              <div className="mt-4 pt-4 border-t border-white/5 flex justify-between items-center">
                                 <span className="text-xs font-bold text-white">{formatCurrency(tierStats.lite.revenue)}</span>
                                 <span className="text-[9px] font-bold text-zinc-500">{tierStats.lite.count} Shows</span>
                              </div>
                           </div>
                        </div>

                        {/* OTHER */}
                        <div className="bg-zinc-900/50 border border-white/5 p-6 rounded-3xl relative overflow-hidden group hover:border-zinc-500/30 transition-colors">
                           <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                              <Tent size={100} />
                           </div>
                           <div className="relative z-10">
                              <h3 className="text-[10px] font-black text-zinc-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                                 <Tent size={14} /> Other Programs
                              </h3>
                              <div className="flex flex-col gap-1">
                                 <span className="text-3xl font-black text-white">{tierStats.other.avgFill}%</span>
                                 <span className="text-[10px] uppercase tracking-widest text-zinc-500">Avg Fill Rate</span>
                              </div>
                              <div className="mt-4 pt-4 border-t border-white/5 flex justify-between items-center">
                                 <span className="text-xs font-bold text-white">{formatCurrency(tierStats.other.revenue)}</span>
                                 <span className="text-[9px] font-bold text-zinc-500">{tierStats.other.count} Shows</span>
                              </div>
                           </div>
                        </div>

                        {/* VENUE INTELLIGENCE CARD */}
                        <div className="bg-gradient-to-br from-zinc-900 to-black border border-white/5 p-6 rounded-3xl relative overflow-hidden">
                           <div className="absolute top-0 right-0 p-4 opacity-10">
                              <MapPin size={100} />
                           </div>
                           <div className="relative z-10 h-full flex flex-col justify-between">
                              <h3 className="text-[10px] font-black text-emerald-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                                 <MapPin size={14} /> Venue Intelligence
                              </h3>
                              
                              <div className="space-y-4">
                                 <div>
                                    <p className="text-[9px] text-zinc-500 uppercase tracking-widest mb-1">Most Frequent</p>
                                    <p className="text-sm font-bold text-white truncate" title={venueStats.mostUsed.name}>
                                       {venueStats.mostUsed.name}
                                    </p>
                                    <p className="text-[10px] text-emerald-500">{venueStats.mostUsed.count} Productions</p>
                                 </div>
                                 
                                 <div className="pt-3 border-t border-white/5">
                                    <p className="text-[9px] text-zinc-500 uppercase tracking-widest mb-1">Highest Fill Rate</p>
                                    <p className="text-sm font-bold text-white truncate" title={venueStats.highestFill.name}>
                                       {venueStats.highestFill.name}
                                    </p>
                                    <p className="text-[10px] text-blue-500">{venueStats.highestFill.avgFill}% Average</p>
                                 </div>
                              </div>
                           </div>
                        </div>
                     </div>

                     <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                        {/* SCATTER CHART */}
                        <div className="lg:col-span-2 bg-zinc-900/50 border border-white/5 p-6 rounded-[2.5rem]">
                           <h3 className="text-xs font-black text-white uppercase tracking-widest mb-6 flex items-center gap-2">
                              <LayoutGrid size={16} className="text-emerald-500" /> Efficiency Matrix
                           </h3>
                           <div className="h-[400px]">
                              <ResponsiveContainer width="100%" height="100%">
                                 <ScatterChart margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#18181b" />
                                    <XAxis type="number" dataKey="totalCapacity" name="Total Seats" unit=" seats" stroke="#3f3f46" tick={{fill: '#71717a', fontSize: 10}} />
                                    <YAxis type="number" dataKey="avgFill" name="Fill Rate" unit="%" stroke="#3f3f46" tick={{fill: '#71717a', fontSize: 10}} />
                                    <ZAxis type="number" dataKey="totalSold" range={[50, 400]} name="Tickets Sold" />
                                    <Tooltip 
                                      cursor={{ strokeDasharray: '3 3' }}
                                      content={({ active, payload }) => {
                                          if (active && payload && payload.length) {
                                            const data = payload[0].payload;
                                            return (
                                              <div className="bg-zinc-950 border border-zinc-800 p-3 rounded-xl shadow-xl min-w-[180px]">
                                                <p className="text-xs font-bold text-white mb-1">{data.name}</p>
                                                
                                                <div className="flex items-center gap-1.5 mb-2 text-[10px] text-zinc-400 border-b border-zinc-800 pb-2">
                                                   <MapPin size={10} /> 
                                                   <span className="truncate max-w-[150px]">{data.venue}</span>
                                                </div>

                                                <div className="grid grid-cols-2 gap-2 text-[10px]">
                                                   <div>
                                                      <span className="text-zinc-500 block uppercase tracking-tighter">Capacity</span>
                                                      <span className="text-zinc-300 font-bold">{Math.round(data.totalCapacity).toLocaleString()}</span>
                                                   </div>
                                                   <div>
                                                      <span className="text-zinc-500 block uppercase tracking-tighter">Fill Rate</span>
                                                      <span className={data.avgFill < 50 ? "text-red-500 font-bold" : "text-emerald-500 font-bold"}>{data.avgFill}%</span>
                                                   </div>
                                                </div>
                                                <p className="text-[9px] text-zinc-600 mt-2 uppercase tracking-widest text-right">{data.tier}</p>
                                              </div>
                                            );
                                          }
                                          return null;
                                      }}
                                    />
                                    <Legend />
                                    <Scatter name="Mainstage" data={filteredShows.filter(s => s.tier === 'Mainstage')} fill="#3b82f6" shape="circle" onClick={(data: any) => setSelectedShow(data)} className="cursor-pointer opacity-80 hover:opacity-100" />
                                    <Scatter name="CYT Lite" data={filteredShows.filter(s => s.tier === 'Lite')} fill="#f59e0b" shape="triangle" onClick={(data: any) => setSelectedShow(data)} className="cursor-pointer opacity-80 hover:opacity-100" />
                                    <Scatter name="Other" data={filteredShows.filter(s => s.tier === 'Other')} fill="#71717a" shape="square" onClick={(data: any) => setSelectedShow(data)} className="cursor-pointer opacity-80 hover:opacity-100" />
                                 </ScatterChart>
                              </ResponsiveContainer>
                           </div>
                        </div>

                        {/* LIST VIEW */}
                        <div className="space-y-4 max-h-[500px] overflow-y-auto pr-2 custom-scrollbar">
                           {filteredShows.map(show => (
                              <button 
                                key={show.id} 
                                onClick={() => setSelectedShow(show)}
                                className="w-full text-left group bg-zinc-900 border border-white/5 p-4 rounded-2xl hover:bg-zinc-800 transition-all hover:scale-[1.02] active:scale-95"
                              >
                                 <div className="flex justify-between items-start mb-2">
                                    <div className="flex items-center gap-2">
                                       {show.tier === 'Mainstage' && <Crown size={12} className="text-blue-500"/>}
                                       {show.tier === 'Lite' && <Sparkles size={12} className="text-amber-500"/>}
                                       {show.tier === 'Other' && <Box size={12} className="text-zinc-500"/>}
                                       <p className="text-[10px] font-black text-zinc-500 uppercase">{show.season}</p>
                                    </div>
                                    <div className={`w-2 h-2 rounded-full ${show.avgFill > 75 ? 'bg-emerald-500' : 'bg-red-500'}`} />
                                 </div>
                                 <p className="text-sm font-bold text-white mb-1 group-hover:text-blue-400 transition-colors truncate">{show.name}</p>
                                 
                                 <div className="flex items-center gap-1 text-[10px] text-zinc-500 mb-2">
                                    <MapPin size={10} />
                                    <span className="truncate">{show.venue}</span>
                                 </div>

                                 <div className="flex gap-3 text-[10px] font-medium text-zinc-400">
                                    <span>{show.avgFill}% Sold</span>
                                    <span>•</span>
                                    <span>{Math.round(show.totalCapacity).toLocaleString()} cap.</span>
                                 </div>
                              </button>
                           ))}
                        </div>
                     </div>
                 </div>

                 {/* === NEW: VENUE DEEP DIVE === */}
                 <div className="pt-8 border-t border-white/5 animate-in fade-in slide-in-from-bottom-8 duration-700">
                    <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-6 gap-4">
                        <div>
                             <h3 className="text-xl font-black text-white uppercase italic tracking-tighter flex items-center gap-3">
                                <MapPin size={24} className="text-emerald-500"/> 
                                Venue Intelligence
                                <span className="text-xs font-bold text-zinc-500 not-italic tracking-normal bg-zinc-900 px-3 py-1 rounded-full border border-white/5">
                                    Real Capacity Data
                                </span>
                            </h3>
                        </div>
                        
                        {/* 🆕 CHART TOGGLER */}
                        <div className="flex bg-zinc-900 border border-white/5 p-1 rounded-xl gap-1">
                            <button
                                onClick={() => setChartMode('fill')}
                                className={`px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider flex items-center gap-2 transition-all ${chartMode === 'fill' ? 'bg-zinc-800 text-white shadow-lg' : 'text-zinc-500 hover:text-zinc-300'}`}
                            >
                                <TrendingUp size={12}/> Fill Trends
                            </button>
                            <button
                                onClick={() => setChartMode('sales')}
                                className={`px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider flex items-center gap-2 transition-all ${chartMode === 'sales' ? 'bg-purple-500/10 text-purple-400 shadow-lg border border-purple-500/20' : 'text-zinc-500 hover:text-zinc-300'}`}
                            >
                                <Ticket size={12}/> Ticket Vol.
                            </button>
                             <button
                                onClick={() => setChartMode('profit')}
                                className={`px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider flex items-center gap-2 transition-all ${chartMode === 'profit' ? 'bg-emerald-500/10 text-emerald-400 shadow-lg border border-emerald-500/20' : 'text-zinc-500 hover:text-zinc-300'}`}
                            >
                                <Coins size={12}/> Profit Model
                            </button>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                        
                        {/* 1. TREND/PROFIT CHART */}
                        <div className="lg:col-span-2 bg-zinc-900/50 border border-white/5 p-8 rounded-[2.5rem] relative overflow-hidden">
                            <div className="flex justify-between items-end mb-6 relative z-10">
                                <div>
                                    <h4 className="text-xs font-black text-zinc-400 uppercase tracking-widest mb-1 flex items-center gap-2">
                                        {chartMode === 'fill' ? <TrendingUp size={14}/> : chartMode === 'sales' ? <BarChart3 size={14}/> : <Calculator size={14}/>} 
                                        {getChartTitle()}
                                    </h4>
                                    <p className="text-2xl font-black text-white">
                                        {getChartSub()}
                                    </p>
                                </div>
                                <div className="flex gap-4 text-[10px] font-bold uppercase tracking-widest">
                                    <span className="flex items-center gap-2 text-emerald-400"><div className="w-2 h-2 rounded-full bg-emerald-500"/>Top Performer</span>
                                    <span className="flex items-center gap-2 text-blue-400"><div className="w-2 h-2 rounded-full bg-blue-500"/>Consistent</span>
                                </div>
                            </div>
                            
                            <div className="h-[350px] relative z-10">
                                <ResponsiveContainer width="100%" height="100%">
                                    <LineChart data={chartData} margin={{ top: 20, right: 30, left: 0, bottom: 0 }}>
                                        <CartesianGrid strokeDasharray="3 3" stroke="#18181b" vertical={false} />
                                        <XAxis dataKey="name" stroke="#52525b" tick={{fontSize: 10}} axisLine={false} tickLine={false} dy={10} />
                                        <YAxis 
                                            stroke="#52525b" 
                                            tick={{fontSize: 10}} 
                                            axisLine={false} 
                                            tickLine={false} 
                                            unit={chartMode === 'fill' ? "%" : ""} 
                                            tickFormatter={(val) => {
                                                if (chartMode === 'profit') return `$${val/1000}k`;
                                                if (chartMode === 'sales') return val.toLocaleString();
                                                return val;
                                            }}
                                        />
                                        <Tooltip 
                                            contentStyle={{ backgroundColor: '#09090b', borderColor: '#27272a', borderRadius: '12px' }}
                                            itemStyle={{ fontSize: '12px', fontWeight: 'bold' }}
                                            formatter={(val: any) => {
                                                if (chartMode === 'profit') return formatCurrency(val);
                                                if (chartMode === 'sales') return `${val} Tickets`;
                                                return `${val}%`;
                                            }}
                                        />
                                        {/* Dynamic Lines for Top Venues */}
                                        {enrichedVenues.slice(0, 3).map((v, i) => (
                                            <Line 
                                                key={v.name}
                                                type="monotone" 
                                                dataKey={v.name} 
                                                stroke={[ '#10b981', '#3b82f6', '#f59e0b' ][i]} 
                                                strokeWidth={3}
                                                dot={{ r: 4, fill: '#09090b', strokeWidth: 2 }}
                                                activeDot={{ r: 6 }}
                                                connectNulls
                                            />
                                        ))}
                                    </LineChart>
                                </ResponsiveContainer>
                            </div>

                            {/* Background Watermark for Profit Mode */}
                            {chartMode === 'profit' && (
                                <div className="absolute -bottom-10 -right-10 text-emerald-900/10 pointer-events-none">
                                    <DollarSign size={300} strokeWidth={1} />
                                </div>
                            )}
                        </div>

                        {/* 2. VENUE SCORECARDS / RENT INPUTS */}
                        <div className="space-y-4 max-h-[500px] overflow-y-auto custom-scrollbar pr-2">
                            {enrichedVenues.map((v) => (
                                <div key={v.id} className={`border p-5 rounded-2xl group transition-all relative ${
                                    chartMode === 'profit' 
                                    ? 'bg-zinc-900 border-emerald-500/30 hover:bg-zinc-800' 
                                    : 'bg-zinc-900 border-white/5 hover:border-emerald-500/30'
                                }`}>
                                    <div className="flex justify-between items-start mb-3">
                                        <div className="flex items-center gap-2">
                                            <div className="p-2 bg-zinc-800 rounded-lg text-zinc-400 group-hover:bg-emerald-500/10 group-hover:text-emerald-500 transition-colors">
                                                <Building2 size={16}/>
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <h4 className="text-sm font-bold text-white group-hover:text-emerald-400 transition-colors truncate max-w-[120px]" title={v.name}>{v.name}</h4>
                                                <p className="text-[10px] text-zinc-500 font-medium uppercase tracking-wider">{v.type}</p>
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <span className="text-lg font-black text-white">{v.capacity}</span>
                                            <span className="block text-[9px] text-zinc-600 font-bold uppercase tracking-tighter">Seat Cap</span>
                                        </div>
                                    </div>
                                    
                                    {/* DYNAMIC CONTENT AREA */}
                                    {chartMode !== 'profit' ? (
                                        <div className="grid grid-cols-2 gap-2 mt-4 pt-4 border-t border-white/5">
                                            <div>
                                                <div className="flex items-center gap-1.5 text-zinc-500 mb-1">
                                                    <History size={10} />
                                                    <span className="text-[9px] uppercase tracking-widest font-bold">History</span>
                                                </div>
                                                <div className="text-xs font-bold text-zinc-300">
                                                    {v.historicalShows} <span className="text-zinc-600 font-medium">Productions</span>
                                                </div>
                                            </div>
                                            <div>
                                                <div className="flex items-center gap-1.5 text-zinc-500 mb-1">
                                                    <TrendingUp size={10} />
                                                    <span className="text-[9px] uppercase tracking-widest font-bold">Avg Fill</span>
                                                </div>
                                                <div className={`text-xs font-bold ${v.avgFill > 80 ? 'text-emerald-500' : v.avgFill > 60 ? 'text-blue-500' : 'text-zinc-400'}`}>
                                                    {v.avgFill || 0}%
                                                </div>
                                            </div>
                                        </div>
                                    ) : (
                                        /* RENT INPUT MODE */
                                        <div className="mt-4 pt-4 border-t border-emerald-500/20">
                                            <label className="text-[9px] uppercase tracking-widest font-bold text-emerald-400 mb-1 flex items-center gap-1">
                                                <Coins size={10} /> Est. Rent (Per Show)
                                            </label>
                                            <div className="relative">
                                                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500 text-xs font-bold">$</span>
                                                <input 
                                                    type="text" 
                                                    className="w-full bg-zinc-950 border border-zinc-700 rounded-lg py-1.5 pl-6 pr-3 text-sm font-bold text-white focus:outline-none focus:border-emerald-500 transition-colors"
                                                    value={rentEstimates[v.name] || ""}
                                                    placeholder="0"
                                                    onChange={(e) => handleRentChange(v.name, e.target.value)}
                                                />
                                            </div>
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>
                 </div>
              </>
            )}

            {activeTab === 'seasons' && (
              <div className="p-8 text-center text-zinc-500 italic">
                  Season history view is being updated...
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
                    <span className="text-[10px] font-bold text-zinc-500 flex items-center gap-1">
                        <MapPin size={10} /> {show.venue}
                    </span>
                </div>
                <h1 className="text-4xl font-black text-white tracking-tighter">{show.name}</h1>
                <p className="text-zinc-500 mt-2 font-medium">Season: {show.season || "Unknown"}</p>
            </div>
            <div className="flex gap-4">
                <MetricCard label="Revenue" value={`$${(show.totalSold * ticketPrice).toLocaleString()}`} icon={<DollarSign size={16} className="text-emerald-500"/>} />
                <MetricCard label="Fill Rate" value={`${show.avgFill}%`} icon={<Users size={16} className="text-blue-500"/>} />
                <MetricCard label="Venue Cap" value={Math.round(show.totalCapacity).toLocaleString()} icon={<Ticket size={16} className="text-zinc-500"/>} />
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