"use client";

import { useState } from 'react';
import { 
  BarChart3, PieChart, TrendingUp, Users, 
  Download, Filter, ChevronDown 
} from 'lucide-react';

export default function ReportsClient({ data, showTitle }: { data: any[], showTitle: string }) {
  const [activeTab, setActiveTab] = useState<'overview' | 'cast' | 'financial'>('overview');

  // Calculate Metrics safely
  const totalCast = data.length;
  const newStudents = data.filter(d => (d.status || "").toLowerCase().includes('new')).length;
  const returningStudents = totalCast - newStudents;
  const retentionRate = totalCast > 0 ? Math.round((returningStudents / totalCast) * 100) : 0;

  return (
    <div className="space-y-6">
      {/* Header Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <StatCard 
          label="Total Cast" 
          value={totalCast} 
          icon={<Users size={20}/>} 
          color="bg-blue-500/10 text-blue-400 border-blue-500/20" 
        />
        <StatCard 
          label="New Students" 
          value={newStudents} 
          icon={<TrendingUp size={20}/>} 
          color="bg-emerald-500/10 text-emerald-400 border-emerald-500/20" 
        />
        <StatCard 
          label="Retention Rate" 
          value={`${retentionRate}%`} 
          icon={<PieChart size={20}/>} 
          color="bg-purple-500/10 text-purple-400 border-purple-500/20" 
        />
      </div>

      {/* Main Content Area */}
      <div className="bg-zinc-900/50 border border-white/5 rounded-3xl p-6">
        <div className="flex justify-between items-center mb-6">
            <h3 className="text-xl font-black text-white italic tracking-tight flex items-center gap-2">
                <BarChart3 className="text-zinc-500" size={24} />
                Cast Composition
            </h3>
            <button className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-zinc-500 hover:text-white transition-colors bg-zinc-900 border border-white/5 px-4 py-2 rounded-xl">
                <Download size={14} /> Export CSV
            </button>
        </div>

        {/* Cast List Table */}
        <div className="overflow-hidden rounded-xl border border-white/5 bg-zinc-950/50">
            <table className="w-full text-left text-sm">
                <thead className="bg-zinc-900/50 text-xs font-black uppercase tracking-widest text-zinc-500">
                    <tr>
                        <th className="p-4">Performer</th>
                        <th className="p-4">Status</th>
                        <th className="p-4 text-right">Role ID</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                    {data.map((student: any) => (
                        <tr key={student.id} className="hover:bg-white/5 transition-colors">
                            <td className="p-4">
                                <div className="flex items-center gap-3">
                                    {/* 🚨 FIX: Safety check for name */}
                                    <div className="w-8 h-8 rounded-full bg-zinc-800 text-zinc-400 flex items-center justify-center text-xs font-black border border-white/5">
                                        {(student.name || "?").charAt(0).toUpperCase()}
                                    </div>
                                    <span className="font-bold text-zinc-200">
                                        {student.name || "Unknown Name"}
                                    </span>
                                </div>
                            </td>
                            <td className="p-4">
                                <span className={`px-2 py-1 rounded-md text-[10px] font-black uppercase tracking-wide border ${
                                    (student.status || "").toLowerCase().includes('new') 
                                    ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' 
                                    : 'bg-zinc-800 text-zinc-500 border-white/5'
                                }`}>
                                    {student.status || "Unknown"}
                                </span>
                            </td>
                            <td className="p-4 text-right font-mono text-xs text-zinc-600">
                                {student.id}
                            </td>
                        </tr>
                    ))}
                    {data.length === 0 && (
                        <tr>
                            <td colSpan={3} className="p-8 text-center text-zinc-500 italic">
                                No data found for {showTitle}
                            </td>
                        </tr>
                    )}
                </tbody>
            </table>
        </div>
      </div>
    </div>
  );
}

function StatCard({ label, value, icon, color }: any) {
    return (
        <div className={`p-6 rounded-2xl border ${color} flex items-center gap-4`}>
            <div className="p-3 bg-zinc-950 rounded-xl border border-white/5 opacity-80">
                {icon}
            </div>
            <div>
                <div className="text-3xl font-black">{value}</div>
                <div className="text-[10px] font-black uppercase tracking-widest opacity-60">{label}</div>
            </div>
        </div>
    )
}