"use client";

import React, { useMemo } from 'react';
import { 
  BarChart3, PieChart, TrendingUp, DollarSign, 
  Users, Ticket, AlertCircle, CheckCircle2,
  Calendar, CreditCard, ShoppingBag, Gift, Wallet
} from 'lucide-react';

export default function ReportsClient({ productionTitle, assignments, people, compliance }: any) {
  
  // --- 📊 ANALYTICS ENGINE ---
  const stats = useMemo(() => {
    // 1. Cast Totals
    const uniqueIds = new Set(assignments.map((a: any) => a["Person"]?.[0]?.id).filter(Boolean));
    const totalCast = uniqueIds.size || 1; 

    // 2. Financials (Income)
    const paidCount = compliance.filter((c: any) => c.paidFees).length;
    const feeRevenue = paidCount * 250; 
    
    // Mock Extra Revenue (In real app, fetch from "Transactions" table)
    const concessionsRevenue = 1450.00; 
    const rafflesRevenue = 800.00;
    
    const totalRevenue = feeRevenue + concessionsRevenue + rafflesRevenue;
    const projectedRevenue = (totalCast * 250) + 2500; // Fees + Est. Ancillary

    // 3. Compliance Health
    const fullyCleared = compliance.filter((c: any) => 
        c.signedAgreement && c.paidFees && c.headshotSubmitted && c.measurementsTaken
    ).length;

    // 4. Ticket Estimate
    const ticketsSold = Math.floor(totalCast * 12.5); 
    const ticketGoal = totalCast * 20;

    // 5. MOCK EXPENSE DATA (Committee Budgets)
    const expenses = [
        { name: "Sets & Construction", budget: 2000, spent: 1850 },
        { name: "Costumes", budget: 1500, spent: 1625 }, // Over budget example
        { name: "Tech (Sound/Light)", budget: 3000, spent: 450 },
        { name: "Props", budget: 500, spent: 120 },
        { name: "Publicity", budget: 800, spent: 300 },
        { name: "Green Room", budget: 400, spent: 350 },
        { name: "Hair & Makeup", budget: 300, spent: 45 },
        { name: "Concessions Stock", budget: 600, spent: 200 }, // Spend money to make money
    ];

    const totalExpenses = expenses.reduce((acc, curr) => acc + curr.spent, 0);
    const totalBudget = expenses.reduce((acc, curr) => acc + curr.budget, 0);

    return {
      totalCast,
      paidCount,
      feeRevenue,
      concessionsRevenue,
      rafflesRevenue,
      totalRevenue,
      projectedRevenue,
      fullyCleared,
      ticketsSold,
      ticketGoal,
      expenses,
      totalExpenses,
      totalBudget,
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
            <span className="text-xs font-bold text-zinc-500 uppercase tracking-widest">Net Income: <span className="text-emerald-400">${(stats.totalRevenue - stats.totalExpenses).toLocaleString()}</span></span>
            <button onClick={() => window.print()} className="bg-zinc-800 hover:bg-zinc-700 text-zinc-300 px-4 py-2 rounded-lg text-xs font-bold uppercase transition-all flex items-center gap-2">
                <BarChart3 size={14}/> Print Report
            </button>
        </div>
      </header>

      {/* MAIN CONTENT */}
      <main className="flex-1 overflow-y-auto p-8 custom-scrollbar">
        <div className="max-w-7xl mx-auto space-y-8">
            
            {/* 1. INCOME STREAMS ROW */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <StatCard 
                    label="Production Fees" 
                    value={`$${stats.feeRevenue.toLocaleString()}`} 
                    sub={`${stats.paidCount}/${stats.totalCast} Paid`}
                    icon={<CreditCard size={20}/>} 
                    color="text-blue-400" 
                    bg="bg-blue-500/10" 
                    border="border-blue-500/20"
                />
                <StatCard 
                    label="Ticket Sales" 
                    value={stats.ticketsSold.toLocaleString()} 
                    sub={`${Math.round((stats.ticketsSold/stats.ticketGoal)*100)}% of Goal`}
                    icon={<Ticket size={20}/>} 
                    color="text-emerald-400" 
                    bg="bg-emerald-500/10" 
                    border="border-emerald-500/20"
                />
                <StatCard 
                    label="Concessions" 
                    value={`$${stats.concessionsRevenue.toLocaleString()}`} 
                    sub="Gross Revenue"
                    icon={<ShoppingBag size={20}/>} 
                    color="text-pink-400" 
                    bg="bg-pink-500/10" 
                    border="border-pink-500/20"
                />
                <StatCard 
                    label="Raffles / 50-50" 
                    value={`$${stats.rafflesRevenue.toLocaleString()}`} 
                    sub="Gross Revenue"
                    icon={<Gift size={20}/>} 
                    color="text-purple-400" 
                    bg="bg-purple-500/10" 
                    border="border-purple-500/20"
                />
            </div>

            {/* 2. TOTAL REVENUE BAR */}
            <div className="bg-zinc-900 border border-white/5 rounded-3xl p-8 shadow-xl">
                <div className="flex justify-between items-end mb-4">
                    <h3 className="text-lg font-black uppercase italic tracking-tighter flex items-center gap-2">
                        <TrendingUp size={20} className="text-emerald-500"/> Total Revenue
                    </h3>
                    <div className="text-right">
                        <p className="text-2xl font-black text-white">${stats.totalRevenue.toLocaleString()}</p>
                        <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest">Target: ${stats.projectedRevenue.toLocaleString()}</p>
                    </div>
                </div>
                
                {/* Progress Bar */}
                <div className="h-6 bg-zinc-800 rounded-full overflow-hidden flex relative">
                    <div className="h-full bg-emerald-500 transition-all duration-1000" style={{ width: `${(stats.feeRevenue / stats.projectedRevenue) * 100}%` }} title="Fees" />
                    <div className="h-full bg-pink-500 transition-all duration-1000" style={{ width: `${(stats.concessionsRevenue / stats.projectedRevenue) * 100}%` }} title="Concessions" />
                    <div className="h-full bg-purple-500 transition-all duration-1000" style={{ width: `${(stats.rafflesRevenue / stats.projectedRevenue) * 100}%` }} title="Raffles" />
                </div>
                
                <div className="flex gap-4 mt-3 justify-center">
                    <LegendItem color="bg-emerald-500" label="Fees" />
                    <LegendItem color="bg-pink-500" label="Concessions" />
                    <LegendItem color="bg-purple-500" label="Raffles" />
                </div>
            </div>

            {/* 3. EXPENSES & COLLECTIONS GRID */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                
                {/* A. COMMITTEE BUDGETS (The Expense Area) */}
                <div className="bg-zinc-900 border border-white/5 rounded-3xl p-6 flex flex-col h-96">
                    <div className="flex justify-between items-center mb-6">
                        <h3 className="text-sm font-black uppercase tracking-widest text-amber-500 flex items-center gap-2">
                            <Wallet size={16}/> Committee Budgets
                        </h3>
                        <span className="text-[10px] font-bold text-zinc-500 uppercase">
                            ${stats.totalExpenses.toLocaleString()} / ${stats.totalBudget.toLocaleString()}
                        </span>
                    </div>
                    
                    <div className="flex-1 overflow-y-auto custom-scrollbar space-y-4 pr-2">
                        {stats.expenses.map((item, i) => {
                            const percent = Math.min((item.spent / item.budget) * 100, 100);
                            const isOver = item.spent > item.budget;
                            
                            return (
                                <div key={i} className="group">
                                    <div className="flex justify-between items-end mb-1">
                                        <span className="text-xs font-bold text-zinc-300 group-hover:text-white transition-colors">{item.name}</span>
                                        <span className={`text-[10px] font-mono ${isOver ? 'text-red-400 font-bold' : 'text-zinc-500'}`}>
                                            ${item.spent} / ${item.budget}
                                        </span>
                                    </div>
                                    <div className="h-2 bg-black rounded-full overflow-hidden">
                                        <div 
                                            className={`h-full rounded-full ${isOver ? 'bg-red-500' : 'bg-zinc-600 group-hover:bg-blue-500'} transition-all`} 
                                            style={{ width: `${percent}%` }}
                                        />
                                    </div>
                                </div>
                            )
                        })}
                    </div>
                </div>

                {/* B. OUTSTANDING FEES (Collections) */}
                <div className="bg-zinc-900 border border-white/5 rounded-3xl p-6 flex flex-col h-96">
                    <h3 className="text-sm font-black uppercase tracking-widest text-red-400 mb-4 flex items-center gap-2">
                        <AlertCircle size={16}/> Outstanding Production Fees
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
                            <div className="h-full flex flex-col items-center justify-center text-zinc-500">
                                <CheckCircle2 size={32} className="text-emerald-500 mb-2"/>
                                <p className="italic">All fees collected!</p>
                            </div>
                        )}
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

function LegendItem({ label, color }: any) {
    return (
        <div className="flex items-center gap-2">
            <div className={`w-2 h-2 rounded-full ${color}`} />
            <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">{label}</span>
        </div>
    )
}