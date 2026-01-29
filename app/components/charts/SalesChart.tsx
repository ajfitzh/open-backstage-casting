"use client";

import React, { useMemo } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell
} from 'recharts';
import { Ticket, Users, TrendingUp, AlertCircle } from 'lucide-react';

export default function SalesChart({ data }) {
  // Memoize calculations to prevent unnecessary re-renders
  const stats = useMemo(() => {
    if (!data?.length) return null;
    const totalSold = data.reduce((acc, curr) => acc + curr.sold, 0);
    const avgFill = Math.round(data.reduce((acc, curr) => acc + curr.fillRate, 0) / data.length);
    const maxCapacity = data.reduce((acc, curr) => acc + curr.capacity, 0);
    return { totalSold, avgFill, maxCapacity };
  }, [data]);

  if (!data || data.length === 0) {
    return (
      <div className="h-64 flex flex-col items-center justify-center border-2 border-dashed border-zinc-800 rounded-3xl bg-zinc-900/20">
        <AlertCircle className="text-zinc-700 mb-2" size={32} />
        <p className="text-zinc-500 font-medium">No sales data available for this production.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* 📊 TOP-LEVEL SUMMARY METRICS */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <StatCard 
          label="Total Tickets Sold" 
          value={stats?.totalSold.toLocaleString()} 
          sub={`Out of ${stats?.maxCapacity.toLocaleString()} available`}
          icon={<Ticket className="text-emerald-500" size={20} />} 
        />
        <StatCard 
          label="Avg. House Fill" 
          value={`${stats?.avgFill}%`} 
          sub="Across all performances"
          icon={<Users className="text-blue-500" size={20} />} 
        />
        <StatCard 
          label="Performance Count" 
          value={data.length} 
          sub="Scheduled shows"
          icon={<TrendingUp className="text-purple-500" size={20} />} 
        />
      </div>

      {/* 🎟️ MAIN CAPACITY CHART */}
      <div className="bg-zinc-900/40 border border-white/5 p-6 rounded-3xl backdrop-blur-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
          <div>
            <h2 className="text-xl font-black text-white tracking-tight italic">PERFORMANCE LOAD</h2>
            <p className="text-xs text-zinc-500 uppercase tracking-widest font-bold">Inventory vs. Actuals</p>
          </div>
          <div className="flex gap-4 text-[10px] font-bold uppercase tracking-tighter text-zinc-400">
             <div className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-emerald-500"></span> Sold</div>
             <div className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-zinc-800"></span> Empty</div>
          </div>
        </div>

        <div className="h-[350px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} margin={{ top: 0, right: 0, left: -25, bottom: 0 }}>
              <CartesianGrid strokeDasharray="4 4" stroke="#18181b" vertical={false} />
              <XAxis 
                dataKey="name" 
                stroke="#3f3f46" 
                fontSize={9}
                fontWeight={700}
                tickLine={false}
                axisLine={false}
                tickFormatter={(val) => val.split('@')[0]} 
              />
              <YAxis 
                stroke="#3f3f46" 
                fontSize={9} 
                fontWeight={700}
                tickLine={false}
                axisLine={false} 
              />
              <Tooltip 
                cursor={{ fill: '#27272a', opacity: 0.4 }}
                content={<CustomTooltip />}
              />
              <Bar dataKey="sold" stackId="a" fill="#10b981" radius={[0, 0, 0, 0]} />
              <Bar dataKey="empty" stackId="a" fill="#27272a" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}

// Sub-components for a cleaner main export
function StatCard({ label, value, sub, icon }) {
  return (
    <div className="p-5 bg-zinc-900/40 border border-white/5 rounded-2xl relative overflow-hidden group">
      <div className="absolute right-[-10px] top-[-10px] opacity-5 group-hover:scale-110 transition-transform">
        {React.cloneElement(icon, { size: 80 })}
      </div>
      <div className="flex items-center gap-3 mb-2">
        <div className="p-2 bg-zinc-950 rounded-lg border border-white/5">{icon}</div>
        <p className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">{label}</p>
      </div>
      <p className="text-3xl font-black text-white tracking-tighter">{value}</p>
      <p className="text-[10px] text-zinc-600 font-bold mt-1">{sub}</p>
    </div>
  );
}

function CustomTooltip({ active, payload, label }) {
  if (active && payload && payload.length) {
    const sold = payload[0].value;
    const empty = payload[1].value;
    const total = sold + empty;
    const rate = Math.round((sold / total) * 100);

    return (
      <div className="bg-zinc-950 border border-zinc-800 p-4 rounded-xl shadow-2xl">
        <p className="text-[10px] font-black text-emerald-500 uppercase mb-2 tracking-widest">{label}</p>
        <div className="space-y-1.5">
          <div className="flex justify-between gap-8">
            <span className="text-xs text-zinc-500 font-bold">Sold:</span>
            <span className="text-xs text-white font-black">{sold}</span>
          </div>
          <div className="flex justify-between gap-8">
            <span className="text-xs text-zinc-500 font-bold">Remaining:</span>
            <span className="text-xs text-white font-black">{empty}</span>
          </div>
          <div className="pt-2 mt-2 border-t border-zinc-800 flex justify-between">
            <span className="text-xs text-blue-400 font-bold tracking-tighter uppercase">House Fill:</span>
            <span className="text-xs text-blue-400 font-black">{rate}%</span>
          </div>
        </div>
      </div>
    );
  }
  return null;
}