"use client";

import React, { useState, useMemo } from 'react';
import { 
  BarChart3, Users, Ruler, Activity, 
  Wallet, Star, LayoutGrid, ArrowUpRight, 
  ArrowDownRight, CheckCircle2, UserPlus,
  Copy, DollarSign, Microscope, PieChart,
  TrendingUp, Ticket, Calendar, MapPin
} from 'lucide-react';

export default function ReportsClient({ productionTitle, assignments, people, compliance }: any) {
  const [activeTab, setActiveTab] = useState<'health' | 'finance'>('health');

  // --- 🧠 ANALYTICS ENGINE (Optimized for People.csv & Box Office) ---
  const stats = useMemo(() => {
    // 1. Identify current cast
    const castIds = new Set(
        assignments
        .filter((a: any) => a["Person"] && a["Person"].length > 0)
        .map((a: any) => a["Person"][0].id)
    );
    const castSize = castIds.size;
    const castMembers = people.filter((p: any) => castIds.has(p.id));

    let totalHeightInches = 0;
    let heightCount = 0;
    let female = 0; 
    let male = 0;
    let veterans = 0;
    let totalPrevRoles = 0;

    castMembers.forEach((p: any) => {
        // --- GENDER FIX (Direct CSV Match) ---
        const g = String(p["Gender"] || "").trim();
        if (g === 'Female') female++;
        else if (g === 'Male') male++;

        // --- HEIGHT (From "Height (Total Inches)") ---
        const rawTotalInches = parseFloat(p["Height (Total Inches)"]);
        if (!isNaN(rawTotalInches) && rawTotalInches > 0) {
            totalHeightInches += rawTotalInches;
            heightCount++;
        }

        // --- EXPERIENCE (Retention) ---
        const rawAssignments = p["Cast/Crew Assignments"];
        let rolesCount = 0;
        if (Array.isArray(rawAssignments)) rolesCount = rawAssignments.length;
        else if (typeof rawAssignments === 'string' && rawAssignments.trim() !== "") {
            rolesCount = rawAssignments.split(',').length;
        }
        totalPrevRoles += rolesCount;
        if (rolesCount > 2) veterans++;
    });

    const fPercent = castSize > 0 ? Math.round((female / castSize) * 100) : 0;
    const mPercent = castSize > 0 ? Math.round((male / castSize) * 100) : 0;

    // --- MOCK TICKET DATA (Momentum Logic) ---
    const ticketsSold = 412;
    const goal = 1200;
    const daysToOpening = 22;
    const lastYearSameTime = 408; // "At this point last fall, we sold 4 fewer"
    const momentum = ticketsSold - lastYearSameTime;

    return {
        castSize,
        female,
        male,
        fPercent,
        mPercent,
        totalRolesCurrent: assignments.length,
        avgRolesPerKid: castSize > 0 ? (assignments.length / castSize).toFixed(1) : "0",
        avgHeightStr: heightCount > 0 ? `${Math.floor((totalHeightInches/heightCount)/12)}'${Math.round((totalHeightInches/heightCount)%12)}"` : "N/A",
        heightSample: heightCount,
        retentionRate: castSize > 0 ? Math.round((veterans / castSize) * 100) : 0,
        veterans,
        avgPrevExp: castSize > 0 ? (totalPrevRoles / castSize).toFixed(1) : "0",
        // Ticket Stats
        ticketsSold,
        goal,
        daysToOpening,
        momentum,
        revenue: ticketsSold * 15 // Assuming $15 avg ticket
    };
  }, [assignments, people, compliance]);

  return (
    <div className="flex flex-col h-screen bg-zinc-950 text-white font-sans">
        
        {/* HEADER */}
        <header className="h-16 border-b border-white/10 bg-zinc-900 flex items-center justify-between px-6 shrink-0 z-30">
            <h1 className="text-lg font-black uppercase italic tracking-wider flex items-center gap-2 text-zinc-400">
                <BarChart3 className="text-blue-500" /> {productionTitle} Reports
            </h1>
            
            <div className="flex bg-black/20 p-1 rounded-lg border border-white/5">
                <button onClick={() => setActiveTab('health')} className={`px-4 py-1.5 rounded-md text-xs font-bold uppercase transition-all ${activeTab === 'health' ? 'bg-zinc-700 text-white shadow' : 'text-zinc-500 hover:text-zinc-300'}`}>
                    Show Health
                </button>
                <button onClick={() => setActiveTab('finance')} className={`px-4 py-1.5 rounded-md text-xs font-bold uppercase transition-all ${activeTab === 'finance' ? 'bg-emerald-900/50 text-emerald-400 shadow border border-emerald-500/20' : 'text-zinc-500 hover:text-zinc-300'}`}>
                    Box Office
                </button>
            </div>
        </header>

        {/* CONTENT */}
        <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">
            
            {activeTab === 'health' && (
                <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
                    
                    {/* SNAPPY STATS */}
                    <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4">
                        <StatCard label="Cast Size" value={stats.castSize} sublabel="Unique Students" icon={<Users size={18} className="text-blue-400"/>} />
                        <StatCard label="Avg. Roles" value={stats.avgRolesPerKid} sublabel="Utilization" icon={<LayoutGrid size={18} className="text-emerald-400"/>} />
                        <StatCard label="Avg Height" value={stats.avgHeightStr} sublabel={`Sample: ${stats.heightSample}`} icon={<Ruler size={18} className="text-purple-400"/>} />
                        <StatCard label="Retention" value={`${stats.retentionRate}%`} sublabel="Veterans" icon={<Activity size={18} className="text-orange-400"/>} trend="up" />
                        <StatCard label="Total Roles" value={stats.totalRolesCurrent} sublabel="Assignments" icon={<Star size={18} className="text-yellow-400"/>} />
                        <StatCard label="Prev. Exp" value={stats.avgPrevExp} sublabel="Show Avg" icon={<TrendingUp size={18} className="text-zinc-400"/>} />
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        {/* GENDER PIE CHART */}
                        <div className="bg-zinc-900 border border-white/10 rounded-2xl p-6 shadow-xl">
                            <h3 className="text-xs font-black uppercase text-zinc-500 tracking-widest mb-8 flex items-center gap-2">
                                <PieChart size={14}/> Gender Composition
                            </h3>
                            <div className="flex items-center gap-10">
                                <div 
                                    className="relative w-40 h-40 rounded-full shadow-[0_0_50px_rgba(0,0,0,0.5)] shrink-0"
                                    style={{ background: `conic-gradient(#ec4899 0% ${stats.fPercent}%, #3b82f6 ${stats.fPercent}% 100%)` }}
                                >
                                    <div className="absolute inset-6 bg-zinc-900 rounded-full flex flex-col items-center justify-center border border-white/5 shadow-inner">
                                        <span className="text-2xl font-black text-white">{stats.castSize}</span>
                                        <span className="text-[8px] text-zinc-500 font-bold uppercase tracking-tighter">Total</span>
                                    </div>
                                </div>
                                <div className="flex-1 space-y-4">
                                    <LegendItem color="bg-pink-500" label="Female" percent={stats.fPercent} count={stats.female} />
                                    <div className="h-px bg-white/5" />
                                    <LegendItem color="bg-blue-500" label="Male" percent={stats.mPercent} count={stats.male} />
                                </div>
                            </div>
                        </div>

                        {/* EXPERIENCE BOX */}
                        <div className="bg-zinc-900 border border-white/10 rounded-2xl p-6 shadow-xl flex flex-col">
                            <h3 className="text-xs font-black uppercase text-zinc-500 tracking-widest mb-6 flex items-center gap-2 italic">
                                <Microscope size={14}/> Artistic Observations
                            </h3>
                            <div className="space-y-4 flex-1">
                                <ObservationCard 
                                    icon={<LayoutGrid className="text-blue-500" size={18}/>}
                                    title="High Ensemble Density"
                                    desc={`The average student is performing ${stats.avgRolesPerKid} roles, suggesting a highly complex, multi-layered production.`}
                                />
                                <ObservationCard 
                                    icon={<Activity className="text-emerald-500" size={18}/>}
                                    title="Retention Momentum"
                                    desc={`${stats.retentionRate}% of the cast are returning veterans. This indicates high student satisfaction and institutional knowledge.`}
                                />
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {activeTab === 'finance' && (
                <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
                    
                    {/* BOX OFFICE HEADER */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="bg-zinc-900 border border-white/10 p-6 rounded-2xl relative overflow-hidden group">
                             <div className="absolute -right-4 -top-4 opacity-5 group-hover:opacity-10 transition-opacity"><Ticket size={120}/></div>
                             <h3 className="text-[10px] font-black uppercase text-blue-500 tracking-widest mb-1">Tickets Sold</h3>
                             <div className="text-5xl font-black text-white">{stats.ticketsSold}</div>
                             <div className="mt-4 flex items-center gap-2 text-xs">
                                <div className="px-2 py-0.5 bg-emerald-900/30 text-emerald-400 rounded-full font-bold flex items-center gap-1">
                                    <ArrowUpRight size={12}/> +{stats.momentum}
                                </div>
                                <span className="text-zinc-500 font-medium">vs. last fall (same day)</span>
                             </div>
                        </div>

                        <div className="bg-zinc-900 border border-white/10 p-6 rounded-2xl relative overflow-hidden group">
                             <div className="absolute -right-4 -top-4 opacity-5 group-hover:opacity-10 transition-opacity"><TrendingUp size={120}/></div>
                             <h3 className="text-[10px] font-black uppercase text-emerald-500 tracking-widest mb-1">Est. Revenue</h3>
                             <div className="text-5xl font-black text-white">${stats.revenue.toLocaleString()}</div>
                             <div className="mt-4 w-full bg-zinc-800 h-1.5 rounded-full overflow-hidden">
                                <div className="bg-emerald-500 h-full" style={{ width: `${(stats.ticketsSold/stats.goal)*100}%` }} />
                             </div>
                             <div className="mt-2 text-[10px] text-zinc-500 font-bold uppercase flex justify-between">
                                <span>{Math.round((stats.ticketsSold/stats.goal)*100)}% of Goal</span>
                                <span>Goal: {stats.goal}</span>
                             </div>
                        </div>

                        <div className="bg-zinc-900 border border-white/10 p-6 rounded-2xl flex flex-col justify-center items-center text-center">
                             <Calendar size={32} className="text-blue-500 mb-2 animate-pulse"/>
                             <div className="text-2xl font-black text-white">{stats.daysToOpening}</div>
                             <div className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">Days until opening</div>
                        </div>
                    </div>

                    {/* KRISTA'S CAMPUS VIEW */}
                    <div className="bg-zinc-900 border border-white/10 rounded-2xl overflow-hidden shadow-xl">
                        <div className="p-4 border-b border-white/10 flex justify-between items-center bg-zinc-950/30">
                            <div>
                                <h3 className="text-xs font-black uppercase text-zinc-400 tracking-widest flex items-center gap-2">
                                    <MapPin size={14} className="text-red-500"/> Site Auditor
                                </h3>
                                <p className="text-[10px] text-zinc-500 mt-1 italic">Quick-reference for campus-based class distribution</p>
                            </div>
                        </div>
                        <div className="p-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                            <CampusCard name="River of Life" classes={3} students={59} color="text-emerald-400" />
                            <CampusCard name="River Club" classes={4} students={44} color="text-blue-400" />
                            <CampusCard name="Hope Presbyterian" classes={3} students={31} color="text-purple-400" />
                            <CampusCard name="Highway Assembly" classes={2} students={20} color="text-amber-400" />
                        </div>
                    </div>

                </div>
            )}
        </div>
    </div>
  );
}

// --- SUB-COMPONENTS ---

function StatCard({ label, value, sublabel, icon, trend }: any) {
    return (
        <div className="bg-zinc-900 border border-white/10 p-4 rounded-xl shadow-lg hover:border-zinc-700 transition-all group">
            <div className="flex justify-between items-start mb-3">
                <div className="p-2 bg-black/40 rounded-lg border border-white/5 text-zinc-400 group-hover:text-white transition-colors">{icon}</div>
                {trend === 'up' && <div className="text-[10px] font-black text-emerald-500 bg-emerald-500/10 px-1.5 py-0.5 rounded flex items-center gap-0.5"><ArrowUpRight size={10}/> 12%</div>}
            </div>
            <div className="text-2xl font-black text-white tracking-tighter">{value}</div>
            <div className="text-[10px] font-black text-zinc-500 uppercase tracking-widest mt-1">{label}</div>
            <div className="text-[9px] text-zinc-600 font-medium leading-none mt-1">{sublabel}</div>
        </div>
    )
}

function LegendItem({ color, label, percent, count }: any) {
    return (
        <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
                <div className={`w-3 h-3 rounded-full ${color} shadow-[0_0_10px_rgba(0,0,0,0.5)]`} />
                <span className="text-xs font-bold text-zinc-400">{label}</span>
            </div>
            <div className="text-right leading-none">
                <div className="text-lg font-black text-white">{percent}%</div>
                <div className="text-[9px] text-zinc-600 font-bold uppercase">{count} Students</div>
            </div>
        </div>
    )
}

function ObservationCard({ icon, title, desc }: any) {
    return (
        <div className="flex gap-4 p-4 bg-black/20 border border-white/5 rounded-2xl hover:bg-black/30 transition-colors">
            <div className="shrink-0">{icon}</div>
            <div>
                <div className="text-sm font-bold text-zinc-200">{title}</div>
                <div className="text-xs text-zinc-500 leading-snug mt-1">{desc}</div>
            </div>
        </div>
    )
}

function CampusCard({ name, classes, students, color }: any) {
    return (
        <div className="bg-zinc-950/50 border border-white/5 p-4 rounded-xl">
            <div className="text-xs font-black text-white truncate mb-3">{name}</div>
            <div className="space-y-2">
                <div className="flex justify-between items-center text-[10px] font-bold uppercase text-zinc-500">
                    <span>Classes</span>
                    <span className={color}>{classes}</span>
                </div>
                <div className="flex justify-between items-center text-[10px] font-bold uppercase text-zinc-500">
                    <span>Students</span>
                    <span className={color}>{students}</span>
                </div>
            </div>
        </div>
    )
}