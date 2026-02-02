"use client";

import { useState, useMemo } from 'react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, 
  ResponsiveContainer, Cell, AreaChart, Area, PieChart, Pie 
} from 'recharts';
import { 
  LayoutGrid, BarChart2, Zap, Info, Landmark, Search, 
  ArrowLeft, Users, Ticket, DollarSign, PieChart as PieIcon 
} from 'lucide-react';

export default function AnalyticsDashboard({ performanceData, showData, ticketPrice }: { performanceData: any[], showData: any[], ticketPrice: number }) {
  const [activeTab, setActiveTab] = useState<'overview' | 'seasons'>('overview');
  const [selectedShow, setSelectedShow] = useState<any | null>(null);
  const [searchTerm, setSearchTerm] = useState("");

  // --- FILTERED DATA ---
  const filteredShows = useMemo(() => {
    if (!searchTerm) return showData;
    return showData.filter(s => s.name.toLowerCase().includes(searchTerm.toLowerCase()));
  }, [showData, searchTerm]);

  // --- AGGREGATE STATS ---
  const aggregateStats = useMemo(() => {
    const totalRev = filteredShows.reduce((acc, curr) => acc + (curr.totalSold * ticketPrice), 0);
    const avgFill = Math.round(filteredShows.reduce((acc, curr) => acc + curr.avgFill, 0) / (filteredShows.length || 1));
    return { totalRev, avgFill, count: filteredShows.length };
  }, [filteredShows, ticketPrice]);

  // --- SIMULATED VELOCITY (Adjusted for Selected Show) ---
  const velocityData = useMemo(() => {
    // If a show is selected, we scale the curve to match its actual final fill rate
    const maxFill = selectedShow ? selectedShow.avgFill : 85; 
    
    const points = [];
    for (let i = 0; i <= 42; i++) {
      const day = 42 - i;
      // Logistic Growth (S-Curve) logic
      const standardCurve = 1 / (1 + Math.exp(-0.15 * (i - 30))); // Base S-Curve 0 to 1
      const targetPace = Math.floor(standardCurve * 100); // Standard 100% sellout track
      
      // The "Actual" line scales to meet the specific show's final fill %
      const actualPace = i > 35 ? null : Math.floor(standardCurve * maxFill); 

      points.push({
        name: `T-${day}`,
        target: targetPace,
        actual: actualPace,
      });
    }
    return points;
  }, [selectedShow]);

  // --- SEASON DATA ---
  const seasonData = useMemo(() => {
    const seasons: Record<string, any> = {};
    showData.forEach(show => {
      const s = show.season || "Other";
      if (!seasons[s]) seasons[s] = { name: s, totalSold: 0, totalCapacity: 0, revenue: 0 };
      seasons[s].totalSold += show.totalSold;
      seasons[s].totalCapacity += show.totalCapacity;
      seasons[s].revenue += (show.totalSold * ticketPrice);
    });
    return Object.values(seasons).sort((a: any, b: any) => b.name.localeCompare(a.name));
  }, [showData, ticketPrice]);

  // --- RENDER HELPERS ---
  const formatCurrency = (val: number) => `$${val.toLocaleString()}`;

  return (
    <div className="h-full flex flex-col bg-zinc-950 text-zinc-200">
      
      {/* HEADER & TABS */}
      <div className="px-6 py-4 border-b border-white/5 flex justify-between items-center shrink-0">
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

        {/* SEARCH BAR (Only visible in overview) */}
        {!selectedShow && activeTab === 'overview' && (
          <div className="relative group">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500 group-focus-within:text-white transition-colors" size={14} />
            <input 
              type="text" 
              placeholder="Search shows..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="bg-zinc-900 border border-zinc-800 rounded-full pl-9 pr-4 py-1.5 text-xs font-bold text-white placeholder:text-zinc-600 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 w-64"
            />
          </div>
        )}
      </div>

      <div className="flex-1 overflow-hidden relative">
        
        {/* === DRILL DOWN: SINGLE SHOW VIEW === */}
        {selectedShow ? (
           <div className="absolute inset-0 overflow-y-auto p-8 animate-in slide-in-from-right-8 fade-in duration-300 custom-scrollbar">
              
              {/* HEADER */}
              <div className="flex flex-col md:flex-row gap-6 justify-between items-start md:items-end mb-8 border-b border-white/5 pb-8">
                <div>
                   <div className="text-[10px] font-black text-emerald-500 uppercase tracking-widest mb-2">Production Analytics</div>
                   <h1 className="text-4xl font-black text-white tracking-tighter">{selectedShow.name}</h1>
                   <p className="text-zinc-500 mt-2 font-medium">Season: {selectedShow.season || "Unknown"}</p>
                </div>
                <div className="flex gap-4">
                   <MetricCard label="Revenue" value={formatCurrency(selectedShow.totalSold * ticketPrice)} icon={<DollarSign size={16} className="text-emerald-500"/>} />
                   <MetricCard label="Fill Rate" value={`${selectedShow.avgFill}%`} icon={<Users size={16} className="text-blue-500"/>} />
                   <MetricCard label="Tickets" value={selectedShow.totalSold.toLocaleString()} icon={<Ticket size={16} className="text-amber-500"/>} />
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                 {/* CHART 1: VELOCITY */}
                 <div className="lg:col-span-2 bg-zinc-900/50 border border-white/5 p-6 rounded-3xl">
                    <h3 className="text-xs font-black text-white uppercase tracking-widest mb-6 flex items-center gap-2">
                      <Zap size={16} className="text-amber-500" /> Sales Velocity vs Target
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

                 {/* CHART 2: BREAKDOWN */}
                 <div className="bg-zinc-900/50 border border-white/5 p-6 rounded-3xl">
                    <h3 className="text-xs font-black text-white uppercase tracking-widest mb-6 flex items-center gap-2">
                      <PieIcon size={16} className="text-blue-500" /> Capacity Breakdown
                    </h3>
                    <div className="h-[200px] relative">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={[
                              { name: 'Sold', value: selectedShow.totalSold },
                              { name: 'Empty', value: selectedShow.totalCapacity - selectedShow.totalSold },
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
                      {/* Centered Label */}
                      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                         <div className="text-center">
                            <div className="text-2xl font-black text-white">{selectedShow.avgFill}%</div>
                            <div className="text-[9px] uppercase tracking-widest text-zinc-500">Filled</div>
                         </div>
                      </div>
                    </div>
                    
                    <div className="mt-8 space-y-3">
                       <div className="flex justify-between text-xs font-bold text-zinc-400">
                          <span className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-emerald-500"/> Sold Seats</span>
                          <span className="text-white">{selectedShow.totalSold.toLocaleString()}</span>
                       </div>
                       <div className="flex justify-between text-xs font-bold text-zinc-400">
                          <span className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-zinc-800"/> Unsold Inventory</span>
                          <span className="text-white">{(selectedShow.totalCapacity - selectedShow.totalSold).toLocaleString()}</span>
                       </div>
                    </div>
                 </div>
              </div>
           </div>
        ) : (
          /* === MAIN DASHBOARD VIEW === */
          <div className="absolute inset-0 overflow-y-auto p-8 custom-scrollbar">
            
            {activeTab === 'overview' && (
              <div className="space-y-8">
                 {/* Top Level Stats */}
                 <div className="grid grid-cols-3 gap-4">
                    <div className="bg-zinc-900 border border-white/5 p-4 rounded-2xl flex flex-col justify-center">
                       <span className="text-[10px] uppercase tracking-widest text-zinc-500">Total Revenue</span>
                       <span className="text-2xl font-black text-white">{formatCurrency(aggregateStats.totalRev)}</span>
                    </div>
                    <div className="bg-zinc-900 border border-white/5 p-4 rounded-2xl flex flex-col justify-center">
                       <span className="text-[10px] uppercase tracking-widest text-zinc-500">Avg Fill Rate</span>
                       <span className="text-2xl font-black text-emerald-500">{aggregateStats.avgFill}%</span>
                    </div>
                    <div className="bg-zinc-900 border border-white/5 p-4 rounded-2xl flex flex-col justify-center">
                       <span className="text-[10px] uppercase tracking-widest text-zinc-500">Productions</span>
                       <span className="text-2xl font-black text-blue-500">{aggregateStats.count}</span>
                    </div>
                 </div>

                 <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* LEFT: INTERACTIVE CHART */}
                    <div className="lg:col-span-2 bg-zinc-900/50 border border-white/5 p-6 rounded-[2.5rem]">
                       <h3 className="text-xs font-black text-white uppercase tracking-widest mb-6 flex items-center gap-2">
                          <LayoutGrid size={16} className="text-emerald-500" /> Performance Comparison
                       </h3>
                       <div className="h-[400px]">
                          <ResponsiveContainer width="100%" height="100%">
                             <BarChart 
                                data={filteredShows} 
                                onClick={(data: any) => { // FIXED: Added 'any' type here
                                   if (data && data.activePayload) {
                                      setSelectedShow(data.activePayload[0].payload);
                                   }
                                }}
                                className="cursor-pointer"
                             >
                                <CartesianGrid strokeDasharray="3 3" stroke="#18181b" vertical={false} />
                                <XAxis dataKey="name" stroke="#3f3f46" tick={{fill: '#71717a', fontSize: 10}} interval={0} angle={-45} textAnchor="end" height={60} />
                                <YAxis stroke="#3f3f46" tick={{fill: '#71717a', fontSize: 10}} />
                                <Tooltip 
                                  cursor={{fill: '#ffffff', opacity: 0.05}}
                                  contentStyle={{ backgroundColor: '#09090b', borderColor: '#27272a', borderRadius: '16px' }} 
                                />
                                <Bar dataKey="avgFill" name="Fill %" radius={[4, 4, 0, 0]}>
                                  {filteredShows.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={entry.avgFill >= 90 ? '#10b981' : entry.avgFill >= 70 ? '#3b82f6' : '#f59e0b'} />
                                  ))}
                                </Bar>
                             </BarChart>
                          </ResponsiveContainer>
                       </div>
                       <div className="text-center text-[10px] text-zinc-500 uppercase tracking-widest mt-4">
                          Click any bar to view show details
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
                                <p className="text-[10px] font-black text-zinc-500 uppercase">{show.season}</p>
                                <div className={`w-2 h-2 rounded-full ${show.avgFill > 75 ? 'bg-emerald-500' : 'bg-amber-500'}`} />
                             </div>
                             <p className="text-sm font-bold text-white mb-1 group-hover:text-blue-400 transition-colors">{show.name}</p>
                             <div className="flex gap-3 text-[10px] font-medium text-zinc-400">
                                <span>{show.avgFill}% Sold</span>
                                <span>•</span>
                                <span>{formatCurrency(show.totalSold * ticketPrice)}</span>
                             </div>
                          </button>
                       ))}
                    </div>
                 </div>
              </div>
            )}

            {activeTab === 'seasons' && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-in fade-in">
                 {seasonData.map(season => (
                    <div key={season.name} className="bg-zinc-900 border border-white/5 p-6 rounded-3xl hover:border-white/10 transition-colors">
                       <div className="flex justify-between items-start mb-6">
                          <div>
                             <h4 className="text-lg font-black text-white">{season.name}</h4>
                             <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mt-1">Season Summary</p>
                          </div>
                          <Landmark className="text-zinc-700" size={24} />
                       </div>
                       
                       <div className="space-y-4">
                          <div className="flex justify-between items-center p-3 bg-black/20 rounded-xl">
                             <span className="text-[10px] uppercase font-bold text-zinc-500">Revenue</span>
                             <span className="text-sm font-black text-emerald-500">{formatCurrency(season.revenue)}</span>
                          </div>
                          
                          <div className="space-y-2">
                             <div className="flex justify-between text-[10px] font-bold text-zinc-400 uppercase">
                                <span>Fill Rate</span>
                                <span>{Math.round((season.totalSold / season.totalCapacity) * 100)}%</span>
                             </div>
                             <div className="h-2 w-full bg-zinc-800 rounded-full overflow-hidden">
                                <div className="h-full bg-blue-600" style={{ width: `${(season.totalSold / season.totalCapacity) * 100}%` }} />
                             </div>
                          </div>
                       </div>
                    </div>
                 ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// --- SUBCOMPONENTS ---

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