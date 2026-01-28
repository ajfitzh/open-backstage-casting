"use client";

import React from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts';

export default function SalesChart({ data }) {
  if (!data || data.length === 0) {
    return (
      <div className="h-64 flex items-center justify-center border border-dashed border-zinc-800 rounded-xl">
        <p className="text-zinc-500">No sales data available yet.</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* 🎟️ TICKET VOLUME CHART */}
      <div className="bg-zinc-900/50 border border-white/5 p-6 rounded-2xl">
        <div className="mb-6">
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <span className="w-2 h-2 bg-emerald-500 rounded-full"></span>
            Performance Capacity
          </h2>
          <p className="text-xs text-zinc-500">Tickets Sold vs. Empty Seats per show</p>
        </div>

        {/* This container ensures Recharts has a real height to work with */}
        <div className="h-[400px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#27272a" vertical={false} />
              <XAxis 
                dataKey="name" 
                stroke="#71717a" 
                fontSize={10}
                tickFormatter={(val) => val.split('@')[0]} // Shortens "Nov 22... @ 7pm"
              />
              <YAxis stroke="#71717a" fontSize={10} />
              <Tooltip 
                contentStyle={{ 
                    backgroundColor: '#09090b', 
                    border: '1px solid #27272a', 
                    borderRadius: '12px',
                    fontSize: '12px'
                }}
                cursor={{ fill: 'rgba(255,255,255,0.05)' }}
              />
              <Legend wrapperStyle={{ paddingTop: '20px', fontSize: '12px' }} />
              <Bar 
                dataKey="sold" 
                stackId="a" 
                fill="#10b981" 
                name="Sold" 
                radius={[0, 0, 0, 0]} 
              />
              <Bar 
                dataKey="empty" 
                stackId="a" 
                fill="#27272a" 
                name="Remaining" 
                radius={[4, 4, 0, 0]} 
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* 📈 FILL RATE HIGHLIGHTS */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {data.slice(-3).map((perf, i) => (
          <div key={i} className="p-4 bg-zinc-900/50 border border-white/5 rounded-xl">
            <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">{perf.name.split('@')[0]}</p>
            <p className="text-2xl font-black text-white">{perf.fillRate}% <span className="text-sm font-normal text-zinc-500">Full</span></p>
            <div className="w-full bg-zinc-800 h-1.5 rounded-full mt-2 overflow-hidden">
                <div 
                    className="bg-blue-500 h-full transition-all duration-1000" 
                    style={{ width: `${perf.fillRate}%` }}
                ></div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}