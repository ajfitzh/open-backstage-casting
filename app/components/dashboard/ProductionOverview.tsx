"use client";

import React, { useMemo } from 'react';
import { User, Ruler, Sparkles, PieChart } from 'lucide-react';

export default function ProductionOverview({ demographics }: { demographics: any[] }) {
  
  // 🧠 STATS ENGINE
  const stats = useMemo(() => {
    if (!demographics.length) return null;

    const total = demographics.length;
    
    // 1. Average Age
    const validAges = demographics.filter(p => p.age > 0);
    const avgAge = validAges.length > 0 
      ? Math.round(validAges.reduce((acc, p) => acc + p.age, 0) / validAges.length) 
      : 0;

    // 2. Average Height (Inches to Ft'In")
    const validHeights = demographics.filter(p => p.height > 0);
    const avgHeightInches = validHeights.length > 0
        ? Math.round(validHeights.reduce((acc, p) => acc + p.height, 0) / validHeights.length)
        : 0;
    const feet = Math.floor(avgHeightInches / 12);
    const inches = avgHeightInches % 12;

    // 3. Experience (Show Count)
    const avgShows = Math.round(demographics.reduce((acc, p) => acc + p.showCount, 0) / total);

    // 4. Gender Breakdown
    const genderMap = new Map();
    demographics.forEach(p => {
        const g = p.gender?.value || "Unknown";
        genderMap.set(g, (genderMap.get(g) || 0) + 1);
    });
    
    // Convert to simplified chart data
    const chartData = Array.from(genderMap.entries()).map(([k, v]: any) => ({
        label: k,
        value: v,
        percent: Math.round((v / total) * 100)
    }));

    return { total, avgAge, feet, inches, avgShows, chartData };
  }, [demographics]);

  if (!stats) return <div className="text-zinc-500 italic">No cast data available.</div>;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 animate-in fade-in duration-500">
        
        {/* CARD 1: AGE */}
        <div className="bg-zinc-900 border border-white/10 rounded-xl p-6 relative overflow-hidden group hover:border-blue-500/30 transition-colors">
            <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                <User size={64} />
            </div>
            <div className="relative z-10">
                <h3 className="text-3xl font-black text-white">{stats.avgAge}</h3>
                <p className="text-xs uppercase font-bold text-zinc-500 tracking-wider mt-1">Average Age</p>
                <div className="mt-4 text-xs text-zinc-400">
                    Youngest: <span className="text-white">{Math.min(...demographics.map(p => p.age || 99))}</span> • 
                    Oldest: <span className="text-white">{Math.max(...demographics.map(p => p.age || 0))}</span>
                </div>
            </div>
        </div>

        {/* CARD 2: HEIGHT */}
        <div className="bg-zinc-900 border border-white/10 rounded-xl p-6 relative overflow-hidden group hover:border-emerald-500/30 transition-colors">
            <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                <Ruler size={64} />
            </div>
            <div className="relative z-10">
                <h3 className="text-3xl font-black text-white">{stats.feet}&apos; {stats.inches}&quot;</h3>
                <p className="text-xs uppercase font-bold text-zinc-500 tracking-wider mt-1">Average Height</p>
                <div className="mt-4 h-1 w-full bg-zinc-800 rounded-full overflow-hidden">
                    <div className="h-full bg-emerald-500 w-[60%]" />
                </div>
            </div>
        </div>

        {/* CARD 3: EXPERIENCE */}
        <div className="bg-zinc-900 border border-white/10 rounded-xl p-6 relative overflow-hidden group hover:border-amber-500/30 transition-colors">
            <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                <Sparkles size={64} />
            </div>
            <div className="relative z-10">
                <h3 className="text-3xl font-black text-white">{stats.avgShows}</h3>
                <p className="text-xs uppercase font-bold text-zinc-500 tracking-wider mt-1">Avg. Past Shows</p>
                <div className="mt-4 text-xs text-zinc-400">
                    Total collective experience: <br/>
                    <span className="text-white font-bold">{demographics.reduce((acc, p) => acc + p.showCount, 0)} productions</span>
                </div>
            </div>
        </div>

        {/* CARD 4: BREAKDOWN */}
        <div className="bg-zinc-900 border border-white/10 rounded-xl p-6 relative overflow-hidden group hover:border-purple-500/30 transition-colors">
            <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                <PieChart size={64} />
            </div>
            <div className="relative z-10">
                <h3 className="text-3xl font-black text-white">{stats.total}</h3>
                <p className="text-xs uppercase font-bold text-zinc-500 tracking-wider mt-1">Cast Size</p>
                <div className="mt-4 flex gap-1 h-2 rounded-full overflow-hidden">
                    {stats.chartData.map((d, i) => (
                        <div 
                            key={d.label} 
                            style={{ width: `${d.percent}%` }} 
                            className={`h-full ${i % 2 === 0 ? 'bg-purple-500' : 'bg-blue-500'}`} 
                            title={`${d.label}: ${d.value}`}
                        />
                    ))}
                </div>
            </div>
        </div>

    </div>
  );
}