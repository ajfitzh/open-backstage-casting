"use client";

import { useState, useMemo } from 'react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, 
  ResponsiveContainer, AreaChart, Area, PieChart, Pie, ScatterChart, Scatter, ZAxis, Legend, LineChart, Line, Cell
} from 'recharts';
import { 
  LayoutGrid, BarChart2, Zap, Landmark, Search, 
  ArrowLeft, Users, Ticket, DollarSign, PieChart as PieIcon, 
  MapPin, TrendingUp, History, Building2, Calculator, Coins, BarChart3
} from 'lucide-react';

// ✂️ CONFIG: Hide any seasons before this year to prevent "blank space"
const START_YEAR = 2017; 

export default function AnalyticsDashboard({ 
  performanceData, showData, venues, ticketPrice 
}: { 
  performanceData: any[], showData: any[], venues: any[], ticketPrice: number 
}) {
  const [activeTab, setActiveTab] = useState<'overview' | 'seasons'>('overview');
  const [selectedShow, setSelectedShow] = useState<any | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
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

  // --- CHART DATA GENERATOR (FIXED SORTING + DATE LIMIT) ---
  const chartData = useMemo(() => {
    const seasonMap: Record<string, any> = {};
    
    // Use data as-is (already sorted Ascending from page.tsx)
    const chronologicalShows = [...showData]; 

    chronologicalShows.forEach(show => {
        const season = show.season || "Unknown";
        
        // 1. Skip junk data
        if (season === "Other" || season === "Unknown Season") return;

        // ✂️ 2. CUTOFF FILTER: Parse year and hide old seasons
        const startYear = parseInt(season.split('-')[0]);
        if (!isNaN(startYear) && startYear < START_YEAR) return;

        if (!seasonMap[season]) seasonMap[season] = { name: season };
        
        const vKey = show.venue;
        const rent = rentEstimates[vKey] || 0;
        const fill = show.avgFill;
        const sold = show.totalSold;
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

    // Sort by Season Name (2017... 2018... 2025)
    return Object.values(seasonMap).map((s: any) => {
        const result: any = { name: s.name };
        Object.keys(s).forEach(key => {
            if (key !== 'name') {
                if (chartMode === 'fill') result[key] = Math.round(s[key].fill / s[key].count);
                else if (chartMode === 'sales') result[key] = Math.round(s[key].sold / s[key].count);
                else result[key] = Math.round(s[key].profit / s[key].count);
            }
        });
        return result;
    }).sort((a: any, b: any) => a.name.localeCompare(b.name));

  }, [showData, chartMode, rentEstimates, ticketPrice]);

  // --- ENRICHED VENUE LIST ---
  const enrichedVenues = useMemo(() => {
      if (!venues || !venues.length) return [];
      return venues.map(v => {
          const stats = showData.filter(s => s.venue === v.name);
          const totalRevenue = stats.reduce((acc, s) => acc + (s.totalSold * ticketPrice), 0);
          const avgFill = stats.length ? Math.round(stats.reduce((acc, s) => acc + s.avgFill, 0) / stats.length) : 0;
          return { ...v, trackedShows: stats.length, totalRevenue, avgFill };
      }).sort((a,b) => b.trackedShows - a.trackedShows); 
  }, [venues, showData, ticketPrice]);

  // RENDER HELPERS
  const formatCurrency = (val: number) => `$${val.toLocaleString()}`;
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
      
      {/* TABS */}
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

      {/* CONTENT AREA */}
      <div className="flex-1 overflow-hidden relative bg-zinc-950">
        
        {selectedShow ? (
           <SingleShowView show={selectedShow} ticketPrice={ticketPrice} />
        ) : (
          <div className="absolute inset-0 overflow-y-auto p-8 custom-scrollbar space-y-8">
            
            {activeTab === 'overview' && (
              <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                  
                  {/* --- TOP ROW: CHART + VENUE --- */}
                  <div className="flex flex-col xl:flex-row gap-6 h-auto xl:h-[450px]">
                      
                      {/* MAIN CHART */}
                      <div className="flex-1 bg-zinc-900/50 border border-white/5 p-6 rounded-[2rem] flex flex-col">
                          <div className="flex justify-between items-start mb-6">
                              <div>
                                  <h4 className="text-xs font-black text-zinc-400 uppercase tracking-widest mb-1 flex items-center gap-2">
                                      {chartMode === 'fill' ? <TrendingUp size={14}/> : chartMode === 'sales' ? <BarChart3 size={14}/> : <Calculator size={14}/>} 
                                      {getChartTitle()}
                                  </h4>
                                  <p className="text-xl font-black text-white">{getChartSub()}</p>
                              </div>
                              
                              {/* CHART TOGGLES */}
                              <div className="flex bg-zinc-950 border border-white/5 p-1 rounded-lg gap-1">
                                  {['fill', 'sales', 'profit'].map((mode) => (
                                    <button
                                      key={mode}
                                      onClick={() => setChartMode(mode as any)}
                                      className={`px-3 py-1.5 rounded-md text-[9px] font-bold uppercase tracking-wider transition-all ${chartMode === mode ? 'bg-zinc-800 text-white shadow-lg' : 'text-zinc-500 hover:text-zinc-300'}`}
                                    >
                                      {mode}
                                    </button>
                                  ))}
                              </div>
                          </div>

                          <div className="flex-1 min-h-[250px] w-full">
                              <ResponsiveContainer width="100%" height="100%">
                                  <LineChart data={chartData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                                      <CartesianGrid strokeDasharray="3 3" stroke="#18181b" vertical={false} />
                                      <XAxis dataKey="name" stroke="#52525b" tick={{fontSize: 10}} axisLine={false} tickLine={false} dy={10} />
                                      <YAxis stroke="#52525b" tick={{fontSize: 10}} axisLine={false} tickLine={false} 
                                          tickFormatter={(val) => chartMode === 'profit' ? `$${val/1000}k` : val} 
                                      />
                                      <Tooltip 
                                          contentStyle={{ backgroundColor: '#09090b', borderColor: '#27272a', borderRadius: '12px' }}
                                          formatter={(val: any) => chartMode === 'profit' ? formatCurrency(val) : val} 
                                      />
                                      {enrichedVenues.slice(0, 5).map((v, i) => (
                                          <Line 
                                              key={v.name}
                                              type="monotone" 
                                              dataKey={v.name} 
                                              stroke={[ '#10b981', '#3b82f6', '#f59e0b', '#ec4899', '#8b5cf6' ][i]} 
                                              strokeWidth={3}
                                              dot={false}
                                              connectNulls
                                          />
                                      ))}
                                  </LineChart>
                              </ResponsiveContainer>
                          </div>
                      </div>

                      {/* VENUE LIST (SIDEBAR) */}
                      <div className="w-full xl:w-[350px] flex flex-col gap-4">
                          <div className="flex justify-between items-center px-2">
                             <h3 className="text-xs font-black text-white uppercase tracking-widest flex items-center gap-2">
                                <MapPin size={14} className="text-emerald-500"/> Venues
                             </h3>
                             <span className="text-[9px] text-zinc-500 uppercase font-bold">Adjust Rent</span>
                          </div>
                          <div className="flex-1 overflow-y-auto custom-scrollbar space-y-3 pr-2 max-h-[400px]">
                              {enrichedVenues.map((v) => (
                                <div key={v.id} className="bg-zinc-900 border border-white/5 p-4 rounded-xl group hover:border-emerald-500/30 transition-colors">
                                    <div className="flex justify-between items-start mb-2">
                                        <div className="truncate pr-2">
                                            <h4 className="text-sm font-bold text-white truncate" title={v.name}>{v.name}</h4>
                                            <p className="text-[10px] text-zinc-500 uppercase">{v.capacity} Seats</p>
                                        </div>
                                        <div className={`text-xs font-bold ${v.avgFill > 70 ? 'text-emerald-500' : 'text-zinc-500'}`}>{v.avgFill}% Fill</div>
                                    </div>
                                    <div className="flex items-center gap-2 mt-2 bg-zinc-950 rounded-lg p-1 border border-zinc-800">
                                        <span className="text-[9px] font-bold text-zinc-600 pl-2 uppercase">Rent $</span>
                                        <input 
                                          type="text" 
                                          className="bg-transparent text-xs font-bold text-white w-full focus:outline-none"
                                          value={rentEstimates[v.name] || ""}
                                          placeholder="0"
                                          onChange={(e) => handleRentChange(v.name, e.target.value)}
                                        />
                                    </div>
                                </div>
                              ))}
                          </div>
                      </div>
                  </div>

                  {/* --- BOTTOM ROW: EFFICIENCY MATRIX & LIST --- */}
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mt-8">
                     {/* SCATTER PLOT */}
                     <div className="lg:col-span-2 bg-zinc-900/50 border border-white/5 p-6 rounded-[2rem]">
                        <h3 className="text-xs font-black text-white uppercase tracking-widest mb-6 flex items-center gap-2">
                           <LayoutGrid size={16} className="text-blue-500" /> Efficiency Matrix
                        </h3>
                        <div className="h-[350px]">
                           <ResponsiveContainer width="100%" height="100%">
                              <ScatterChart margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
                                 <CartesianGrid strokeDasharray="3 3" stroke="#18181b" />
                                 <XAxis type="number" dataKey="totalCapacity" name="Seats" stroke="#3f3f46" tick={{fontSize: 10}} />
                                 <YAxis type="number" dataKey="avgFill" name="Fill %" stroke="#3f3f46" tick={{fontSize: 10}} />
                                 <Tooltip 
                                    cursor={{ strokeDasharray: '3 3' }}
                                    content={({ active, payload }) => {
                                        if (active && payload && payload.length) {
                                            const data = payload[0].payload;
                                            return (
                                                <div className="bg-zinc-950 border border-zinc-800 p-3 rounded-lg shadow-xl">
                                                    <p className="text-xs font-bold text-white">{data.name}</p>
                                                    <p className="text-[10px] text-zinc-400">{data.venue}</p>
                                                    <div className="mt-2 text-[10px] font-mono">
                                                        <div className="text-emerald-500">Fill: {data.avgFill}%</div>
                                                        <div className="text-zinc-500">Cap: {data.totalCapacity}</div>
                                                    </div>
                                                </div>
                                            );
                                        }
                                        return null;
                                    }}
                                 />
                                 <Legend />
                                 <Scatter name="Mainstage" data={filteredShows.filter(s => s.tier === 'Mainstage')} fill="#3b82f6" onClick={(d) => setSelectedShow(d)} className="cursor-pointer opacity-80" />
                                 <Scatter name="Lite" data={filteredShows.filter(s => s.tier === 'Lite')} fill="#f59e0b" onClick={(d) => setSelectedShow(d)} className="cursor-pointer opacity-80" />
                              </ScatterChart>
                           </ResponsiveContainer>
                        </div>
                     </div>

                     {/* SHOW LIST */}
                     <div className="max-h-[400px] overflow-y-auto custom-scrollbar space-y-2 pr-2">
                        {filteredShows.map(show => (
                           <button 
                             key={show.id} 
                             onClick={() => setSelectedShow(show)}
                             className="w-full text-left group bg-zinc-900 border border-white/5 p-3 rounded-xl hover:bg-zinc-800 transition-all flex justify-between items-center"
                           >
                             <div className="overflow-hidden">
                                <div className="flex items-center gap-2 mb-1">
                                    <span className={`w-1.5 h-1.5 rounded-full ${show.tier === 'Mainstage' ? 'bg-blue-500' : show.tier === 'Lite' ? 'bg-amber-500' : 'bg-zinc-600'}`} />
                                    <p className="text-[9px] font-black text-zinc-500 uppercase">{show.season}</p>
                                </div>
                                <p className="text-xs font-bold text-white group-hover:text-blue-400 truncate">{show.name}</p>
                             </div>
                             <div className={`text-xs font-black ${show.avgFill > 75 ? 'text-emerald-500' : 'text-zinc-600'}`}>{show.avgFill}%</div>
                           </button>
                        ))}
                     </div>
                  </div>
              </div>
            )}

            {activeTab === 'seasons' && (
              <div className="p-8 text-center text-zinc-500 italic">Season history view is being updated...</div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ... (Keep SingleShowView and TabButton/MetricCard as they were, they are fine)
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