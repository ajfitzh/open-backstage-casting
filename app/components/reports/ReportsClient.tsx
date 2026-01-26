"use client";

import React, { useMemo } from 'react';
import { 
  BarChart3, PieChart, TrendingUp, DollarSign, 
  Users, Ticket, AlertCircle, CheckCircle2,
  Calendar, CreditCard
} from 'lucide-react';

export default function ReportsClient({ productionTitle, assignments, people, compliance }: any) {
  
  // --- 📊 ANALYTICS ENGINE ---
  const stats = useMemo(() => {
    // 1. Cast Totals
    const uniqueIds = new Set(assignments.map((a: any) => a["Person"]?.[0]?.id).filter(Boolean));
    const totalCast = uniqueIds.size || 1; // Avoid divide by zero

    // 2. Financials (Mock Logic based on Compliance)
    // In real life, you'd check a "Paid" checkbox in the compliance data
    const paidCount = compliance.filter((c: any) => c.paidFees).length;
    const revenue = paidCount * 250; // Assuming $250 production fee
    const projectedRevenue = totalCast * 250;

    // 3. Compliance Health
    const fullyCleared = compliance.filter((c: any) => 
        c.signedAgreement && c.paidFees && c.headshotSubmitted && c.measurementsTaken
    ).length;

    // 4. Ticket Estimate (Mock logic: 20 tix per student)
    const ticketsSold = Math.floor(totalCast * 12.5); // Avg 12.5 sold so far
    const ticketGoal = totalCast * 20;

    return {
      totalCast,
      paidCount,
      revenue,
      projectedRevenue,
      fullyCleared,
      ticketsSold,
      ticketGoal,
      percentPaid: Math.round((paidCount / totalCast) * 100),
      percentCleared: Math.round((fullyCleared / totalCast) * 100)
    };
  }, [assignments, compliance]);

  return (
    <div className="flex flex-col h-full bg-zinc-950 text-white font-sans overflow-hidden">
      
      {/* HEADER */}
      <header className="h-20 border-b border-white/10 flex items-center justify-between px-8 bg-zinc-900/50 backdrop-blur-xl shrink-0">
        <div>
            <h1 className="text-[10px] font-black uppercase tracking-[0.2em] text-amber-500 mb-1">Business Office</h1>
            <h2 className="text-xl font-bold tracking-tighter text-white">{productionTitle} <span className="text-zinc-500">Financials</span></h2>
        </div>
        <div className="flex items-center gap-4">
            <span className="text-xs font-bold text-zinc-500 uppercase tracking-widest">Last Updated: Just Now</span>
            <button onClick={() => window.print()} className="bg-zinc-800 hover:bg-zinc-700 text-zinc-300 px-4 py-2 rounded-lg text-xs font-bold uppercase transition-all flex items-center gap-2">
                <BarChart3 size={14}/> Print Report
            </button>
        </div>
      </header>

      {/* MAIN CONTENT */}
      <main className="flex-1 overflow-y-auto p-8 custom-scrollbar">
        <div className="max-w-6xl mx-auto space-y-8">
            
            {/* 1. TOP LINE METRICS */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <StatCard 
                    label="Projected Revenue" 
                    value={`$${stats.projectedRevenue.toLocaleString()}`} 
                    sub={`$${stats.revenue.toLocaleString()} Collected`}
                    icon={<DollarSign size={20}/>} 
                    color="text-emerald-400" 
                    bg="bg-emerald-500/10" 
                    border="border-emerald-500/20"
                />
                <StatCard 
                    label="Production Fees" 
                    value={`${stats.percentPaid}%`} 
                    sub={`${stats.paidCount} / ${stats.totalCast} Students`}
                    icon={<CreditCard size={20}/>} 
                    color="text-blue-400" 
                    bg="bg-blue-500/10" 
                    border="border-blue-500/20"
                />
                <StatCard 
                    label="Compliance" 
                    value={`${stats.percentCleared}%`} 
                    sub="Fully Cleared Cast"
                    icon={<CheckCircle2 size={20}/>} 
                    color="text-purple-400" 
                    bg="bg-purple-500/10" 
                    border="border-purple-500/20"
                />
                <StatCard 
                    label="Ticket Sales" 
                    value={stats.ticketsSold.toLocaleString()} 
                    sub={`${Math.round((stats.ticketsSold/stats.ticketGoal)*100)}% of Goal`}
                    icon={<Ticket size={20}/>} 
                    color="text-amber-400" 
                    bg="bg-amber-500/10" 
                    border="border-amber-500/20"
                />
            </div>

            {/* 2. REVENUE TRACKER BAR */}
            <div className="bg-zinc-900 border border-white/5 rounded-3xl p-8 shadow-xl">
                <div className="flex justify-between items-end mb-4">
                    <h3 className="text-lg font-black uppercase italic tracking-tighter flex items-center gap-2">
                        <TrendingUp size={20} className="text-emerald-500"/> Revenue Tracker
                    </h3>
                    <div className="text-right">
                        <p className="text-2xl font-black text-white">${stats.revenue.toLocaleString()}</p>
                        <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest">Total Collected</p>
                    </div>
                </div>
                
                {/* Progress Bar */}
                <div className="h-6 bg-zinc-800 rounded-full overflow-hidden flex relative">
                    <div className="h-full bg-emerald-500 transition-all duration-1000" style={{ width: `${stats.percentPaid}%` }} />
                    <div className="h-full bg-emerald-900/30 transition-all duration-1000" style={{ width: `${100 - stats.percentPaid}%` }} />
                    
                    {/* Markers */}
                    <div className="absolute top-0 bottom-0 w-0.5 bg-black/20 left-[25%]"/>
                    <div className="absolute top-0 bottom-0 w-0.5 bg-black/20 left-[50%]"/>
                    <div className="absolute top-0 bottom-0 w-0.5 bg-black/20 left-[75%]"/>
                </div>
                <div className="flex justify-between text-[10px] text-zinc-600 font-bold uppercase mt-2">
                    <span>$0</span>
                    <span>25%</span>
                    <span>50%</span>
                    <span>75%</span>
                    <span>Goal: ${stats.projectedRevenue.toLocaleString()}</span>
                </div>
            </div>

            {/* 3. DETAILS GRID */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                
                {/* Outstanding Fees List */}
                <div className="bg-zinc-900 border border-white/5 rounded-3xl p-6 flex flex-col h-96">
                    <h3 className="text-sm font-black uppercase tracking-widest text-red-400 mb-4 flex items-center gap-2">
                        <AlertCircle size={16}/> Outstanding Fees
                    </h3>
                    <div className="flex-1 overflow-y-auto custom-scrollbar space-y-2 pr-2">
                        {compliance.filter((c: any) => !c.paidFees).map((student: any) => (
                            <div key={student.id} className="flex justify-between items-center p-3 bg-red-500/5 border border-red-500/10 rounded-xl hover:bg-red-500/10 transition-colors">
                                <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 rounded-full bg-red-900/20 text-red-500 flex items-center justify-center text-xs font-bold">
                                        {student.performerName.charAt(0)}
                                    </div>
                                    <span className="font-bold text-sm text-zinc-300">{student.performerName}</span>
                                </div>
                                <span className="text-xs font-mono text-red-400">-$250.00</span>
                            </div>
                        ))}
                        {compliance.filter((c: any) => !c.paidFees).length === 0 && (
                            <div className="text-center text-zinc-500 italic mt-10">All fees collected! 🎉</div>
                        )}
                    </div>
                </div>

                {/* Production Stats */}
                <div className="bg-zinc-900 border border-white/5 rounded-3xl p-6 flex flex-col h-96">
                    <h3 className="text-sm font-black uppercase tracking-widest text-blue-400 mb-4 flex items-center gap-2">
                        <PieChart size={16}/> Cast Breakdown
                    </h3>
                    <div className="flex-1 flex items-center justify-center relative">
                        {/* Fake Pie Chart Visualization using CSS Conic Gradients */}
                        <div className="w-48 h-48 rounded-full bg-zinc-800 relative"
                             style={{
                                 background: `conic-gradient(
                                     #3b82f6 0% 60%, 
                                     #a855f7 60% 85%, 
                                     #10b981 85% 100%
                                 )`
                             }}
                        >
                            <div className="absolute inset-4 bg-zinc-900 rounded-full flex flex-col items-center justify-center">
                                <span className="text-3xl font-black text-white">{stats.totalCast}</span>
                                <span className="text-[10px] uppercase font-bold text-zinc-500">Total Cast</span>
                            </div>
                        </div>
                    </div>
                    <div className="grid grid-cols-3 gap-2 mt-4">
                        <LegendItem label="Ensemble" color="bg-blue-500" value="60%" />
                        <LegendItem label="Supporting" color="bg-purple-500" value="25%" />
                        <LegendItem label="Leads" color="bg-emerald-500" value="15%" />
                    </div>
                </div>

            </div>

        </div>
      </main>
    </div>
  );
}

// --- SUB-COMPONENTS ---

function StatCard({ label, value, sub, icon, color, bg, border }: any) {
    return (
        <div className={`p-5 rounded-2xl border ${bg} ${border}`}>
            <div className="flex justify-between items-start mb-2">
                <div className={`p-2 rounded-lg ${color} bg-black/20`}>{icon}</div>
                <span className={`text-[10px] font-black uppercase tracking-widest ${color} opacity-80`}>{label}</span>
            </div>
            <div className="text-2xl font-black text-white">{value}</div>
            <div className="text-xs font-bold text-zinc-400 mt-1">{sub}</div>
        </div>
    )
}

function LegendItem({ label, color, value }: any) {
    return (
        <div className="text-center p-2 bg-zinc-800/50 rounded-lg">
            <div className={`w-2 h-2 rounded-full ${color} mx-auto mb-1`} />
            <div className="text-xs font-bold text-zinc-300">{label}</div>
            <div className="text-[10px] text-zinc-500">{value}</div>
        </div>
    )
}