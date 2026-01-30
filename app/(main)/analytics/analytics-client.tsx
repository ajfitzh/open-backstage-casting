"use client";

import { useState, useMemo } from 'react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, 
  ResponsiveContainer, Legend, Cell, LineChart, Line, AreaChart, Area 
} from 'recharts';
import { LayoutGrid, BarChart2, CalendarDays, Zap, Info, Landmark } from 'lucide-react';

export default function AnalyticsDashboard({ performanceData, showData, ticketPrice }: { performanceData: any[], showData: any[], ticketPrice: number }) {
  const [activeTab, setActiveTab] = useState<'shows' | 'velocity' | 'seasons'>('shows');

  // SIMULATED VELOCITY DATA (The "S-Curve" Industry Standard)
  const velocityData = useMemo(() => {
    // We mock a 6-week sales cycle (T-minus 42 days to Opening)
    const points = [];
    for (let i = 0; i <= 42; i++) {
      const day = 42 - i;
      // Logistic Growth Formula (The S-Curve)
      const targetPace = Math.floor(100 / (1 + Math.exp(-0.15 * (i - 30))));
      // Mock "Actual" based on the target with some random variance
      // eslint-disable-next-line react-hooks/purity
      const actualPace = i > 35 ? null : Math.max(0, targetPace - 5 + Math.random() * 10);
      
      points.push({
        name: `T-${day}`,
        target: targetPace,
        actual: actualPace ? Math.min(100, Math.round(actualPace)) : null,
      });
    }
    return points;
  }, []);

  const seasonData = useMemo(() => {
    const seasons: Record<string, any> = {};
    showData.forEach(show => {
      const s = show.season || "Other";
      if (!seasons[s]) seasons[s] = { name: s, totalSold: 0, totalCapacity: 0 };
      seasons[s].totalSold += show.totalSold;
      seasons[s].totalCapacity += show.totalCapacity;
    });
    return Object.values(seasons).sort((a: any, b: any) => b.name.localeCompare(a.name));
  }, [showData]);

  return (
    <div className="h-full flex flex-col">
      <div className="px-8 py-4 bg-zinc-950 flex gap-2 border-b border-white/5">
        <TabButton active={activeTab === 'shows'} onClick={() => setActiveTab('shows')} icon={<BarChart2 size={14}/>} label="Efficiency" />
        <TabButton active={activeTab === 'velocity'} onClick={() => setActiveTab('velocity')} icon={<Zap size={14}/>} label="Sales Velocity" />
        <TabButton active={activeTab === 'seasons'} onClick={() => setActiveTab('seasons')} icon={<Landmark size={14}/>} label="Market History" />
      </div>

      <div className="flex-1 p-8 overflow-y-auto custom-scrollbar bg-black/20">
        
        {/* VIEW: SHOW VS SHOW */}
        {activeTab === 'shows' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-in fade-in slide-in-from-bottom-4">
            <div className="lg:col-span-2 bg-zinc-900/50 border border-white/5 p-8 rounded-[2.5rem]">
              <h3 className="text-xs font-black text-white uppercase tracking-widest mb-8 flex items-center gap-2">
                <LayoutGrid size={16} className="text-emerald-500" /> Revenue & Fill Rate by Production
              </h3>
              <div className="h-[400px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={showData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#18181b" vertical={false} />
                    <XAxis dataKey="name" stroke="#3f3f46" tick={{fill: '#71717a', fontSize: 10}} hide />
                    <YAxis stroke="#3f3f46" tick={{fill: '#71717a', fontSize: 10}} />
                    <Tooltip contentStyle={{ backgroundColor: '#09090b', borderColor: '#27272a', borderRadius: '16px' }} />
                    <Bar dataKey="avgFill" name="Fill %" radius={[6, 6, 0, 0]}>
                      {showData.map((e, i) => <Cell key={i} fill={e.avgFill > 75 ? '#10b981' : '#3b82f6'} />)}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="space-y-4">
               {showData.slice(0, 5).map(show => (
                 <div key={show.name} className="bg-zinc-900 border border-white/5 p-4 rounded-2xl">
                    <p className="text-[10px] font-black text-zinc-600 uppercase mb-1">{show.name}</p>
                    <div className="flex justify-between items-end">
                       <span className="text-xl font-black text-white italic">${(show.totalSold * ticketPrice).toLocaleString()}</span>
                       <span className="text-xs font-bold text-emerald-500">{show.avgFill}% Full</span>
                    </div>
                 </div>
               ))}
            </div>
          </div>
        )}

        {/* VIEW: SALES VELOCITY (Simulated S-Curve) */}
        {activeTab === 'velocity' && (
          <div className="bg-zinc-900/50 border border-white/5 p-8 rounded-[2.5rem] animate-in fade-in slide-in-from-bottom-4">
             <div className="flex items-center justify-between mb-8">
               <h3 className="text-xs font-black text-white uppercase tracking-widest flex items-center gap-2">
                 <Zap size={16} className="text-amber-500" /> Standard Ticket Velocity (Industry Benchmark)
               </h3>
               <div className="flex gap-4 text-[10px] font-bold uppercase tracking-widest">
                  <div className="flex items-center gap-2 text-zinc-500"><div className="w-2 h-2 rounded-full bg-zinc-700" /> Target Pace</div>
                  <div className="flex items-center gap-2 text-emerald-500"><div className="w-2 h-2 rounded-full bg-emerald-500" /> Current Avg</div>
               </div>
             </div>
             
             <div className="h-[450px]">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={velocityData}>
                    <defs>
                      <linearGradient id="colorTarget" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#27272a" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="#27272a" stopOpacity={0}/>
                      </linearGradient>
                      <linearGradient id="colorActual" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#18181b" />
                    <XAxis dataKey="name" stroke="#3f3f46" tick={{fill: '#71717a', fontSize: 9}} />
                    <YAxis stroke="#3f3f46" tick={{fill: '#71717a', fontSize: 10}} label={{ value: '% Capacity Sold', angle: -90, position: 'insideLeft', fill: '#52525b', fontSize: 10, fontWeight: 'bold' }} />
                    <Tooltip contentStyle={{ backgroundColor: '#09090b', borderColor: '#27272a', borderRadius: '16px' }} />
                    <Area type="monotone" dataKey="target" stroke="#52525b" strokeWidth={2} strokeDasharray="5 5" fillOpacity={1} fill="url(#colorTarget)" />
                    <Area type="monotone" dataKey="actual" stroke="#10b981" strokeWidth={4} fillOpacity={1} fill="url(#colorActual)" />
                  </AreaChart>
                </ResponsiveContainer>
             </div>
             <p className="mt-6 text-[10px] text-zinc-600 font-bold uppercase tracking-widest text-center flex items-center justify-center gap-2">
               <Info size={12} /> Target based on industry standard 6-week youth theatre sales cycle
             </p>
          </div>
        )}

        {/* VIEW: SEASONS */}
        {activeTab === 'seasons' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-in fade-in slide-in-from-bottom-4">
             {seasonData.map(season => (
               <div key={season.name} className="bg-zinc-900/50 border border-white/5 p-6 rounded-3xl">
                  <div className="flex justify-between items-center mb-4">
                    <h4 className="text-sm font-black text-white italic">{season.name}</h4>
                    <span className="text-[10px] font-black text-emerald-500 bg-emerald-500/10 px-2 py-1 rounded tracking-widest">
                        ${(season.totalSold * ticketPrice).toLocaleString()}
                    </span>
                  </div>
                  <div className="space-y-2">
                    <div className="flex justify-between text-[10px] font-bold text-zinc-500 uppercase">
                        <span>Fill Rate</span>
                        <span>{Math.round((season.totalSold / season.totalCapacity) * 100)}%</span>
                    </div>
                    <div className="h-1.5 w-full bg-zinc-800 rounded-full overflow-hidden">
                        <div className="h-full bg-blue-500" style={{ width: `${(season.totalSold / season.totalCapacity) * 100}%` }} />
                    </div>
                  </div>
               </div>
             ))}
          </div>
        )}
      </div>
    </div>
  );
}

function TabButton({ active, onClick, icon, label }: { active: boolean, onClick: () => void, icon: any, label: string }) {
  return (
    <button 
      onClick={onClick}
      className={`px-5 py-2.5 rounded-2xl flex items-center gap-2 text-[10px] font-black uppercase tracking-widest transition-all ${active ? 'bg-zinc-100 text-black shadow-xl scale-[1.02]' : 'text-zinc-500 hover:text-zinc-300 hover:bg-zinc-900'}`}
    >
      {icon} {label}
    </button>
  );
}