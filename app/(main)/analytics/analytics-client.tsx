"use client";

import { useState, useMemo } from 'react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, 
  ResponsiveContainer, AreaChart, Area, PieChart, Pie, ScatterChart, Scatter, Legend, LineChart, Line, Cell,
  ComposedChart
} from 'recharts';
import { 
  LayoutGrid, BarChart2, Zap, Landmark, Search, 
  ArrowLeft, Users, Ticket, DollarSign, PieChart as PieIcon, 
  MapPin, TrendingUp, History, Building2, Calculator, Clock,
  BarChart3,
  Calendar
} from 'lucide-react';

const START_YEAR = 2010; 
// 🟢 EXPERT FIX: Contextual Tooltip
const ShowContextTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
        const data = payload[0].payload;
        const formatCurr = (val: number) => `$${val.toLocaleString()}`;
        return (
            <div className="bg-zinc-950 border border-zinc-800 p-4 rounded-2xl shadow-2xl min-w-[200px]">
                <p className="text-sm font-black text-white mb-1">{data.name}</p>
                <div className="flex items-center gap-2 mb-3 pb-3 border-b border-white/5">
                    <span className={`w-2 h-2 rounded-full ${data.tier === 'Mainstage' ? 'bg-blue-500' : data.tier === 'Lite' ? 'bg-amber-500' : 'bg-zinc-500'}`}></span>
                    <span className="text-[10px] uppercase font-black tracking-widest text-zinc-400">{data.tier}</span>
                </div>
                <div className="space-y-2">
                    <div className="flex justify-between items-center">
                        <span className="text-xs text-zinc-400">Total Sales</span>
                        <span className="text-xs font-bold text-white">{data.sales} <span className="text-[9px] text-zinc-600 font-normal">/ {Math.round(data.capacity)} cap</span></span>
                    </div>
                    <div className="flex justify-between items-center">
                        <span className="text-xs text-zinc-400">Fill Rate</span>
                        <span className={`text-xs font-bold ${data.fill > 75 ? 'text-emerald-400' : 'text-amber-400'}`}>{data.fill}%</span>
                    </div>
                    <div className="flex justify-between items-center pt-2 border-t border-white/5">
                        <span className="text-xs text-zinc-400">Est. Profit</span>
                        <span className="text-xs font-bold text-emerald-400">{formatCurr(data.profit)}</span>
                    </div>
                </div>
            </div>
        );
    }
    return null;
};

const toUSD = (amount: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(amount);
// 🟢 HELPER 4: Standardize the term for sorting
const getTerm = (show: any, perfData: any[] = []) => {
    const textToSearch = `${getBaserowString(show.session || show.Session || show.season)} ${getBaserowString(show.name || show.Title)}`.toLowerCase();
    if (textToSearch.includes('fall')) return "Fall";
    if (textToSearch.includes('winter')) return "Winter";
    if (textToSearch.includes('spring')) return "Spring";
    if (textToSearch.includes('summer')) return "Summer";
    return "Unknown";
};
// 🟢 HELPER 1: Safely grab underlying text from Baserow objects
const getBaserowString = (field: any): string => {
    if (!field) return "";
    if (typeof field === "string") return field;
    if (Array.isArray(field)) {
        if (field.length === 0) return "";
        return getBaserowString(field[0]);
    }
    if (typeof field === "object") {
        return getBaserowString(field.value || field.name || field.text || "");
    }
    return String(field);
};

// 🟢 HELPER 2: Restores the "20xx-20xx" string even if show.season only says "Spring"
const extractSeasonString = (show: any, perfData: any[] = []) => {
    let seasonStr = getBaserowString(show.season || show['Season (linked)'] || show.Season) || "Unknown";
    
    if (seasonStr.match(/20\d{2}/)) return seasonStr;

    // Cross-reference performanceData for the real Season string
    if (perfData && perfData.length > 0) {
        const perf = perfData.find(p => Array.isArray(p.Production) && p.Production.length > 0 && p.Production[0].id === show.id);
        if (perf) {
            const prodStr = perf.Production[0].value || "";
            const m = prodStr.match(/20\d{2}-20\d{2}/);
            if (m) return m[0];
        }
    }
    return seasonStr;
};

// 🟢 HELPER 3: Ultimate Year Extraction (Now parses embedded Legacy JSON!)
const extractYear = (show: any, perfData: any[] = []) => {
    // 1. Check standard fields
    const seasonStr = extractSeasonString(show, perfData);
    const seasonMatches = seasonStr.match(/20\d{2}/g) || [];
    
    const nameStr = getBaserowString(show.name || show['Full Title'] || show.Title);
    const nameMatches = nameStr.match(/20\d{2}/g) || [];
    
    // 2. Check embedded Legacy JSON (Like 101 Dalmatians)
    // We safely stringify it in case it was passed as an actual array or object
    const perfString = typeof show.Performances === 'string' ? show.Performances : JSON.stringify(show.Performances || show.performances || "");
    const perfMatches = perfString.match(/20\d{2}/g) || [];
    
    // Combine all found years and take the highest one
    const allMatches = [...seasonMatches, ...nameMatches, ...perfMatches].map(y => parseInt(y, 10));
    if (allMatches.length > 0) {
        return Math.max(...allMatches); 
    }

    // 3. Ultimate fallback: check relational performance dates
    if (perfData && perfData.length > 0) {
        const perf = perfData.find(p => Array.isArray(p.Production) && p.Production.length > 0 && p.Production[0].id === show.id);
        if (perf && perf.Date) {
            const m = perf.Date.match(/20\d{2}/);
            if (m) return parseInt(m[0], 10);
        }
    }
    
    return 0; // If it returns 0, it gets filtered out of Post-COVID
};

export default function AnalyticsDashboard({ 
  showData, venues, ticketPrice, performanceData
}: { 
  performanceData: any[], showData: any[], venues: any[], ticketPrice: number 
}) {

  const [activeTab, setActiveTab] = useState<'overview' | 'seasons'>('overview');
  const [selectedShow, setSelectedShow] = useState<any | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [chartMode, setChartMode] = useState<'fill' | 'sales' | 'profit'>('sales');
  
  const [era, setEra] = useState<'Post-COVID' | 'All Time'>('Post-COVID');
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

  const activeEraShows = useMemo(() => {
    return showData.filter(show => {
        if (era === 'All Time') return true;
        const year = extractYear(show, performanceData); // Passed performanceData here
        return year >= 2021; // Post-COVID threshold
    });
  }, [showData, era, performanceData]);

  const tieredShows = useMemo(() => {
    return activeEraShows.map(show => {
      let tier = "Other";
      const typeLower = getBaserowString(show.type || show.Type).toLowerCase();
      
      if (typeLower.includes("main")) tier = "Mainstage";
      else if (typeLower.includes("lite") || typeLower.includes("cyt+")) tier = "Lite";
      
      return { ...show, tier };
    });
  }, [activeEraShows]);

  const summaryStats = useMemo(() => {
    const categories = ["Mainstage", "Lite", "Other"];
    return categories.map(cat => {
      const shows = tieredShows.filter(s => s.tier === cat);
      const count = shows.length;
      
      const totalSold = shows.reduce((acc, s) => acc + (s.totalSold || 0), 0);
      const totalRev = shows.reduce((acc, s) => acc + (s.revenue || ((s.totalSold || 0) * ticketPrice)), 0);
      const totalRent = shows.reduce((acc, s) => {
          const venueStr = getBaserowString(s.venue || s.Venue);
          return acc + (rentEstimates[venueStr] || 0);
      }, 0);
      
      const totalProfit = totalRev - totalRent;
      return {
        label: cat === "Other" ? "OTHER SHOWS" : cat.toUpperCase(),
        avgProfit: count > 0 ? Math.round(totalProfit / count) : 0,
        avgSold: count > 0 ? Math.round(totalSold / count) : 0,
      };
    });
  }, [tieredShows, rentEstimates, ticketPrice]);

  const filteredShows = useMemo(() => {
    let data = tieredShows;
    if (searchTerm) {
        data = data.filter(s => {
            const nameStr = getBaserowString(s.name || s['Full Title'] || s.Title);
            return nameStr.toLowerCase().includes(searchTerm.toLowerCase());
        });
    }
    return data;
  }, [tieredShows, searchTerm]);

  // 🟢 EXPERT FIX 1: Show-by-Show Chronological Timeline
  // 🟢 EXPERT FIX 1: Show-by-Show Chronological Timeline
  const chartData = useMemo(() => {
    const termOrder: Record<string, number> = { "Fall": 1, "Winter": 2, "Spring": 3, "Summer": 4, "Unknown": 5 };
    
    // 👇 CHANGED: Now pulling from tieredShows so we have access to show.tier
    return [...tieredShows]
      .filter(show => extractYear(show, performanceData) >= START_YEAR)
      .map(show => {
        const year = extractYear(show, performanceData);
        const term = getTerm(show, performanceData);
        const vKey = getBaserowString(show.venue || show.Venue) || "Unknown";
        const rent = rentEstimates[vKey] || 0;
        
        const sales = show.totalSold || 0;
        const profit = (sales * ticketPrice) - rent;
        
        return {
            name: getBaserowString(show.name || show['Full Title'] || show.Title),
            shortName: getBaserowString(show.name || show['Full Title'] || show.Title).split(' ')[0], // Cleaner X-Axis
            year,
            termOrder: termOrder[term],
            fill: show.avgFill || 0,
            sales: sales,
            profit: profit,
            capacity: show.totalCapacity || 0,
            venue: vKey,
            tier: show.tier // Now this exists!
        };
    }).sort((a, b) => {
        if (a.year !== b.year) return a.year - b.year; 
        return a.termOrder - b.termOrder; 
    });
  }, [tieredShows, rentEstimates, ticketPrice, performanceData]); // 👇 CHANGED: updated dependency

  // 🟢 EXPERT FIX 2: Year-Over-Year Averages (Not Sums)
  const seasonHistoryData = useMemo(() => {
    const sMap: Record<string, { name: string, totalMain: number, countMain: number, totalLite: number, countLite: number }> = {};
    
    // 👇 CHANGED: Now pulling from tieredShows
    tieredShows.forEach(show => {
        const season = extractSeasonString(show, performanceData);
        if (season === "Other" || season === "Unknown Season" || season === "Unknown") return;
        
        if (!sMap[season]) sMap[season] = { name: season, totalMain: 0, countMain: 0, totalLite: 0, countLite: 0 };
        
        const sold = show.totalSold || 0;
        if (show.tier === 'Mainstage') { // Now this condition will actually trigger!
            sMap[season].totalMain += sold;
            sMap[season].countMain += 1;
        } else {
            sMap[season].totalLite += sold;
            sMap[season].countLite += 1;
        }
    });
    
    return Object.values(sMap).map(s => ({
        name: s.name,
        "Mainstage Avg": s.countMain ? Math.round(s.totalMain / s.countMain) : 0,
        "Lite/Other Avg": s.countLite ? Math.round(s.totalLite / s.countLite) : 0,
    })).sort((a, b) => a.name.localeCompare(b.name));
  }, [tieredShows, performanceData]); // 👇 CHANGED: updated dependency

  // 🟢 EXPERT FIX 3: Rhythm Matrix (Sales AND Fill overlay)
  const rhythmData = useMemo(() => {
    const rMap: Record<string, { totalFill: number, totalSold: number, count: number }> = {
        "Fall": { totalFill: 0, totalSold: 0, count: 0 },
        "Winter": { totalFill: 0, totalSold: 0, count: 0 },
        "Spring": { totalFill: 0, totalSold: 0, count: 0 },
        "Summer": { totalFill: 0, totalSold: 0, count: 0 },
    };
    
    activeEraShows.forEach(show => {
        const term = getTerm(show, performanceData);
        const sold = show.totalSold || 0;
        
        if (rMap[term] && sold > 0) {
            rMap[term].totalFill += show.avgFill || 0;
            rMap[term].totalSold += sold;
            rMap[term].count += 1;
        }
    });
    
    return ["Fall", "Winter", "Spring", "Summer"].map(term => ({
        name: term, 
        avgFill: rMap[term].count ? Math.round(rMap[term].totalFill / rMap[term].count) : 0, 
        avgSold: rMap[term].count ? Math.round(rMap[term].totalSold / rMap[term].count) : 0
    }));
  }, [activeEraShows, performanceData]);

  const enrichedVenues = useMemo(() => {
      if (!venues || !venues.length) return [];
      return venues.map(v => {
          const stats = activeEraShows.filter(s => getBaserowString(s.venue || s.Venue) === v.name);
          const totalRevenue = stats.reduce((acc, s) => acc + ((s.totalSold || 0) * ticketPrice), 0);
          const avgFill = stats.length ? Math.round(stats.reduce((acc, s) => acc + (s.avgFill || 0), 0) / stats.length) : 0;
          return { ...v, trackedShows: stats.length, totalRevenue, avgFill };
      }).filter(v => v.trackedShows > 0).sort((a,b) => b.trackedShows - a.trackedShows); 
  }, [venues, activeEraShows, ticketPrice]);

  const formatCurrency = (val: number) => `$${val.toLocaleString()}`;
  const getChartTitle = () => chartMode === 'sales' ? "Ticket Volume (Raw Sales)" : chartMode === 'profit' ? "Profitability Simulator" : "Fill Rate Trends";
  const getChartSub = () => chartMode === 'sales' ? "Avg. Tickets Sold Per Production" : chartMode === 'profit' ? "Net Profit Per Show (Est)" : "Venue Performance Over Time";

  return (
    <div className="h-full flex flex-col bg-zinc-950 text-zinc-200">
      
      <div className="px-6 py-3 border-b border-white/5 bg-zinc-900/40 flex flex-wrap gap-4 shrink-0">
        {summaryStats.map(stat => (
           <div key={stat.label} className="flex items-center gap-4 bg-zinc-900/50 border border-white/5 py-2 px-4 rounded-xl shadow-sm">
               <div className="text-[10px] font-black text-zinc-500 uppercase w-20 leading-tight">{stat.label}</div>
               <div className="w-px h-6 bg-white/5" />
               <div>
                  <div className="text-[9px] text-zinc-500 uppercase tracking-widest">Avg Profit</div>
                  <div className="text-sm font-bold text-emerald-400">{toUSD(stat.avgProfit)}</div>
               </div>
               <div className="w-px h-6 bg-white/5" />
               <div>
                  <div className="text-[9px] text-zinc-500 uppercase tracking-widest">Avg Size</div>
                  <div className="text-sm font-bold text-white">{stat.avgSold.toLocaleString()} <span className="text-[9px] text-zinc-600 font-normal">tix</span></div>
               </div>
           </div>
        ))}
      </div>

      <div className="px-6 py-4 border-b border-white/5 flex justify-between items-center shrink-0 bg-zinc-950/50 backdrop-blur-md sticky top-0 z-10">
        <div className="flex gap-2">
          {selectedShow ? (
            <button onClick={() => setSelectedShow(null)} className="px-4 py-2 rounded-xl flex items-center gap-2 text-xs font-black uppercase tracking-widest bg-zinc-800 hover:bg-zinc-700 transition-colors text-white">
              <ArrowLeft size={14} /> Back to Dashboard
            </button>
          ) : (
            <>
              <TabButton active={activeTab === 'overview'} onClick={() => setActiveTab('overview')} icon={<BarChart2 size={14}/>} label="Overview" />
              <TabButton active={activeTab === 'seasons'} onClick={() => setActiveTab('seasons')} icon={<Landmark size={14}/>} label="Season History" />
            </>
          )}
        </div>

        {!selectedShow && (
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 bg-zinc-900 border border-zinc-800 rounded-xl p-1">
                <div className="px-2 text-zinc-500"><Clock size={14}/></div>
                <button onClick={() => setEra('Post-COVID')} className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase transition-all ${era === 'Post-COVID' ? 'bg-blue-600 text-white shadow-md' : 'text-zinc-500 hover:text-white hover:bg-zinc-800'}`}>Post-2021</button>
                <button onClick={() => setEra('All Time')} className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase transition-all ${era === 'All Time' ? 'bg-blue-600 text-white shadow-md' : 'text-zinc-500 hover:text-white hover:bg-zinc-800'}`}>All Time</button>
            </div>
            
            {activeTab === 'overview' && (
              <div className="relative group">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500 group-focus-within:text-white transition-colors" size={14} />
                <input 
                  type="text" placeholder="Search shows..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)}
                  className="bg-zinc-900 border border-zinc-800 rounded-full pl-9 pr-4 py-1.5 text-xs font-bold text-white placeholder:text-zinc-600 focus:outline-none focus:ring-2 focus:ring-blue-500/50 w-48 transition-all"
                />
              </div>
            )}
          </div>
        )}
      </div>

      <div className="flex-1 overflow-hidden relative bg-zinc-950">
        {selectedShow ? (
           <SingleShowView show={selectedShow} ticketPrice={ticketPrice} />
        ) : (
          <div className="absolute inset-0 overflow-y-auto p-8 custom-scrollbar space-y-8">
            
            {activeTab === 'overview' && (
              <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                  <div className="flex flex-col xl:flex-row gap-6 h-auto xl:h-[450px]">
                      <div className="flex-1 bg-zinc-900/50 border border-white/5 p-6 rounded-[2rem] flex flex-col">
                          <div className="flex justify-between items-start mb-6">
                              <div>
                                  <h4 className="text-xs font-black text-zinc-400 uppercase tracking-widest mb-1 flex items-center gap-2">
                                      {chartMode === 'fill' ? <TrendingUp size={14}/> : chartMode === 'sales' ? <BarChart3 size={14}/> : <Calculator size={14}/>} 
                                      {getChartTitle()}
                                  </h4>
                                  <p className="text-xl font-black text-white">{getChartSub()}</p>
                              </div>
                              <div className="flex bg-zinc-950 border border-white/5 p-1 rounded-lg gap-1">
                                  {['fill', 'sales', 'profit'].map((mode) => (
                                    <button
                                      key={mode} onClick={() => setChartMode(mode as any)}
                                      className={`px-3 py-1.5 rounded-md text-[9px] font-bold uppercase tracking-wider transition-all ${chartMode === mode ? 'bg-zinc-800 text-white shadow-lg' : 'text-zinc-500 hover:text-zinc-300'}`}
                                    >
                                      {mode}
                                    </button>
                                  ))}
                              </div>
                          </div>

                          <div className="flex-1 min-h-[250px] w-full">
<ResponsiveContainer width="100%" height="100%">
    <BarChart data={chartData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#18181b" vertical={false} />
        <XAxis dataKey="shortName" stroke="#52525b" tick={{fontSize: 10}} axisLine={false} tickLine={false} dy={10} />
        <YAxis 
            stroke="#52525b" tick={{fontSize: 10}} axisLine={false} tickLine={false} 
            tickFormatter={(val) => chartMode === 'profit' ? `$${val/1000}k` : chartMode === 'fill' ? `${val}%` : val} 
        />
        <Tooltip cursor={{fill: '#27272a', opacity: 0.4}} content={<ShowContextTooltip />} />
        
        <Bar dataKey={chartMode} radius={[4, 4, 0, 0]} maxBarSize={50}>
            {chartData.map((entry, index) => (
                <Cell 
                    key={`cell-${index}`} 
                    fill={entry.tier === 'Mainstage' ? '#3b82f6' : entry.tier === 'Lite' ? '#f59e0b' : '#71717a'} 
                    className="transition-all duration-300 hover:opacity-80"
                />
            ))}
        </Bar>
    </BarChart>
</ResponsiveContainer>

                          </div>
                      </div>

                      <div className="w-full xl:w-[350px] flex flex-col gap-4">
                          <div className="flex justify-between items-center px-2">
                             <h3 className="text-xs font-black text-white uppercase tracking-widest flex items-center gap-2"><MapPin size={14} className="text-emerald-500"/> Venues</h3>
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
                                        <div className={`text-xs font-bold ${v.avgFill > 40 ? 'text-emerald-500' : v.avgFill > 20 ? 'text-amber-500' : 'text-zinc-500'}`}>{v.avgFill}% Fill</div>
                                    </div>
                                    <div className="flex items-center gap-2 mt-2 bg-zinc-950 rounded-lg p-1 border border-zinc-800">
                                        <span className="text-[9px] font-bold text-zinc-600 pl-2 uppercase">Rent $</span>
                                        <input type="text" className="bg-transparent text-xs font-bold text-white w-full focus:outline-none" value={rentEstimates[v.name] || ""} placeholder="0" onChange={(e) => handleRentChange(v.name, e.target.value)} />
                                    </div>
                                </div>
                              ))}
                          </div>
                      </div>
                  </div>

                  <div className="max-h-[400px] overflow-y-auto custom-scrollbar space-y-2 pr-2 mt-8">
                     {filteredShows.map(show => (
                        <button key={show.id} onClick={() => setSelectedShow(show)} className="w-full text-left group bg-zinc-900 border border-white/5 p-3 rounded-xl hover:bg-zinc-800 transition-all flex justify-between items-center">
                          <div className="overflow-hidden">
                             <div className="flex items-center gap-2 mb-1">
                                 <span className={`w-1.5 h-1.5 rounded-full ${show.tier === 'Mainstage' ? 'bg-blue-500' : show.tier === 'Lite' ? 'bg-amber-500' : 'bg-zinc-600'}`} />
                                 <p className="text-[9px] font-black text-zinc-500 uppercase">{show.season}</p>
                             </div>
                             <p className="text-xs font-bold text-white group-hover:text-blue-400 truncate">{show.name}</p>
                          </div>
                          <div className={`text-xs font-black ${show.avgFill > 40 ? 'text-emerald-500' : show.avgFill > 20 ? 'text-amber-500' : 'text-zinc-500'}`}>{show.avgFill}%</div>
                        </button>
                     ))}
                  </div>
              </div>
            )}

            {activeTab === 'seasons' && (
              <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 space-y-6">
                 
                 <div className="bg-zinc-900/50 border border-white/5 p-6 rounded-[2rem] h-[400px] flex flex-col">
                    <div className="mb-6">
                        <h4 className="text-xs font-black text-zinc-400 uppercase tracking-widest mb-1 flex items-center gap-2"><History size={14}/> Year-Over-Year Growth</h4>
                        <p className="text-xl font-black text-white">Total Tickets Sold by Season</p>
                    </div>
                    <div className="flex-1 w-full min-h-0">
                        <ResponsiveContainer width="100%" height="100%">
<BarChart data={seasonHistoryData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
    <CartesianGrid strokeDasharray="3 3" stroke="#18181b" vertical={false} />
    <XAxis dataKey="name" stroke="#52525b" tick={{fontSize: 10}} axisLine={false} tickLine={false} dy={10} />
    <YAxis stroke="#52525b" tick={{fontSize: 10}} axisLine={false} tickLine={false} />
    <Tooltip cursor={{fill: '#27272a', opacity: 0.4}} contentStyle={{ backgroundColor: '#09090b', borderColor: '#27272a', borderRadius: '12px' }} />
    <Legend />
    {/* Updated DataKeys */}
    <Bar dataKey="Mainstage Avg" stackId="a" fill="#3b82f6" radius={[0, 0, 4, 4]} />
    <Bar dataKey="Lite/Other Avg" stackId="a" fill="#f59e0b" radius={[4, 4, 0, 0]} />
</BarChart>

                        </ResponsiveContainer>
                    </div>
                 </div>

                 <div className="bg-zinc-900/50 border border-white/5 p-6 rounded-[2rem] h-[300px] flex flex-col">
                    <div className="mb-6 flex justify-between items-end">
                        <div>
                            <h4 className="text-xs font-black text-zinc-400 uppercase tracking-widest mb-1 flex items-center gap-2"><Calendar size={14}/> Seasonal Rhythm</h4>
                            <p className="text-xl font-black text-white">Average Tickets Sold (Fall vs Spring)</p>
                        </div>
                        <div className="text-[10px] text-zinc-500 uppercase font-bold tracking-widest bg-zinc-950 px-3 py-1 rounded-lg border border-white/5">Calculated from Selected Era</div>
                    </div>
                    <div className="flex-1 w-full min-h-0">
                        <ResponsiveContainer width="100%" height="100%">
<ComposedChart data={rhythmData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }} layout="vertical">
    <CartesianGrid strokeDasharray="3 3" stroke="#18181b" horizontal={false} />
    <XAxis type="number" xAxisId="left" stroke="#52525b" tick={{fontSize: 10}} axisLine={false} tickLine={false} />
    <XAxis type="number" xAxisId="right" orientation="top" hide /> {/* Hidden axis for Fill % */}
    <YAxis dataKey="name" type="category" yAxisId="left" stroke="#52525b" tick={{fontSize: 10, fontWeight: 'bold'}} axisLine={false} tickLine={false} width={60} />
    <Tooltip cursor={{fill: '#27272a', opacity: 0.4}} contentStyle={{ backgroundColor: '#09090b', borderColor: '#27272a', borderRadius: '12px' }} />
    
    <Bar dataKey="avgSold" yAxisId="left" fill="#10b981" radius={[0, 4, 4, 0]} barSize={30} name="Avg Tickets Sold">
        {rhythmData.map((entry, index) => (
            <Cell key={`cell-${index}`} fill={entry.avgSold > 1200 ? '#10b981' : entry.avgSold > 800 ? '#3b82f6' : '#f59e0b'} />
        ))}
    </Bar>
    {/* The New Overlay Line for Fill Percentage */}
    <Line dataKey="avgFill" yAxisId="right" type="monotone" stroke="#ec4899" strokeWidth={3} dot={{r: 4}} name="Avg Fill %" />
</ComposedChart>

                        </ResponsiveContainer>
                    </div>
                 </div>

              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function SingleShowView({ show, ticketPrice }: { show: any, ticketPrice: number }) {
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
                    <span className={`text-[10px] font-black uppercase tracking-widest px-2 py-1 rounded-full ${show.tier === 'Mainstage' ? 'bg-blue-500/10 text-blue-500' : 'bg-amber-500/10 text-amber-500'}`}>{show.tier} Production</span>
                    <span className="text-[10px] font-bold text-zinc-500 flex items-center gap-1"><MapPin size={10} /> {show.venue}</span>
                </div>
                <h1 className="text-4xl font-black text-white tracking-tighter">{show.name}</h1>
                <p className="text-zinc-500 mt-2 font-medium">Season: {show.season || "Unknown"}</p>
            </div>
            <div className="flex gap-4">
                <MetricCard label="Revenue" value={`$${(show.totalSold * ticketPrice).toLocaleString()}`} icon={<DollarSign size={16} className="text-emerald-500"/>} />
                <MetricCard label="Tickets" value={show.totalSold.toLocaleString()} icon={<Ticket size={16} className="text-blue-500"/>} />
                <MetricCard label="Venue Cap" value={Math.round(show.totalCapacity).toLocaleString()} icon={<Users size={16} className="text-zinc-500"/>} />
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
                        <Cell fill="#3b82f6" />
                        <Cell fill="#27272a" />
                        </Pie>
                        <Tooltip contentStyle={{ backgroundColor: '#09090b', borderColor: '#27272a', borderRadius: '12px' }} />
                    </PieChart>
                    </ResponsiveContainer>
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                        <div className="text-center">
                        <div className={`text-2xl font-black ${show.avgFill > 40 ? 'text-emerald-400' : show.avgFill > 20 ? 'text-amber-400' : 'text-white'}`}>{show.avgFill}%</div>
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
