"use client";

import React, { useState, useMemo } from 'react';
import { 
  BarChart3, Users, Ruler, Activity, 
  Wallet, Star, LayoutGrid, ArrowUpRight, 
  ArrowDownRight, CheckCircle2, UserPlus,
  Copy, DollarSign, Microscope, PieChart,
  TrendingUp, Ticket, Calendar, MapPin,
  PieChart as PieIcon
} from 'lucide-react';

export default function ReportsClient({ productionTitle, assignments, people, compliance }: any) {
  const [activeTab, setActiveTab] = useState<'health' | 'finance'>('health');

  // --- 🧠 ANALYTICS ENGINE ---
  const stats = useMemo(() => {
    // 1. Identify unique cast members (Heads, not Roles)
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
        // --- GENDER DETECTIVE ---
        // Handles Baserow "Select" objects { value: "Female" } and raw strings
        const rawGender = p["Gender"];
        let g = "";
        
        if (typeof rawGender === 'object' && rawGender !== null) {
            g = String(rawGender.value || "");
        } else {
            g = String(rawGender || "");
        }
        
        const normalizedGender = g.trim().toLowerCase();
        if (normalizedGender === 'female') female++;
        else if (normalizedGender === 'male') male++;

        // --- HEIGHT DETECTIVE ---
        const rawTotalInches = parseFloat(p["Height (Total Inches)"]);
        if (!isNaN(rawTotalInches) && rawTotalInches > 0) {
            totalHeightInches += rawTotalInches;
            heightCount++;
        } 
        else if (p["Height (Formatted)"] && p["Height (Formatted)"] !== "0'0\"") {
            const hStr = String(p["Height (Formatted)"]).replace('"', '');
            const parts = hStr.split("'");
            if (parts.length >= 2) {
                const ft = parseInt(parts[0]) || 0;
                const inch = parseFloat(parts[1]) || 0;
                totalHeightInches += (ft * 12) + inch;
                heightCount++;
            }
        }

        // --- EXPERIENCE / RETENTION ---
        const rawAssignments = p["Cast/Crew Assignments"];
        let rolesCount = 0;
        if (Array.isArray(rawAssignments)) {
            rolesCount = rawAssignments.length;
        } else if (typeof rawAssignments === 'string' && rawAssignments.trim() !== "") {
            rolesCount = rawAssignments.split(',').length;
        }
        totalPrevRoles += rolesCount;
        if (rolesCount > 2) veterans++;
    });

    // Percentages for the Pie Chart
    const fPercent = castSize > 0 ? Math.round((female / castSize) * 100) : 0;
    const mPercent = castSize > 0 ? Math.round((male / castSize) * 100) : 0;

    // --- BOX OFFICE DATA ---
    const ticketsSold = 412;
    const goal = 1200;
    const lastYearSameTime = 408; // Comparison metric
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
        ticketsSold,
        goal,
        momentum,
        daysToOpening: 22,
        revenue: ticketsSold * 15
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
                <button 
                  onClick={() => setActiveTab('health')} 
                  className={`px-4 py-1.5 rounded-md text-xs font-bold uppercase transition-all ${activeTab === 'health' ? 'bg-zinc-700 text-white shadow' : 'text-zinc-500 hover:text-zinc-300'}`}
                >
                    Show Health
                </button>
                <button 
                  onClick={() => setActiveTab('finance')} 
                  className={`px-4 py-1.5 rounded-md text-xs font-bold uppercase transition-all ${activeTab === 'finance' ? 'bg-emerald-900/50 text-emerald-400 shadow border border-emerald-500/20' : 'text-zinc-500 hover:text-zinc-300'}`}
                >
                    Box Office
                </button>
            </div>
        </header>

        {/* CONTENT AREA */}
        <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">
            
            {/* === TAB: SHOW HEALTH === */}
            {activeTab === 'health' && (
                <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
                    
                    {/* STAT CARDS */}
                    <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4">
                        <StatCard label="Cast Size" value={stats.castSize} sublabel="Unique Students" icon={<Users size={18} className="text-blue-400"/>} />
                        <StatCard label="Avg. Roles" value={stats.avgRolesPerKid} sublabel="Utilization" icon={<LayoutGrid size={18} className="text-emerald-400"/>} />
                        <StatCard label="Avg Height" value={stats.avgHeightStr} sublabel={`Sample: ${stats.heightSample}`} icon={<Ruler size={18} className="text-purple-400"/>} />
                        <StatCard label="Retention" value={`${stats.retentionRate}%`} sublabel="Veterans" icon={<Activity size={18} className="text-orange-400"/>} trend="up" />
                        <StatCard label="Total Roles" value={stats.totalRolesCurrent} sublabel="Assignments" icon={<Star size={18} className="text-yellow-400"/>} />
                        <StatCard label="Prev. Exp" value={stats.avgPrevExp} sublabel="Show Avg" icon={<TrendingUp size={18} className="text-zinc-400"/>} />
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        {/* GENDER PIE CHART (DONUT STYLE) */}
                        <div className="bg-zinc-900 border border-white/10 rounded-2xl p-8 shadow-xl">
                            <h3 className="text-xs font-black uppercase text-zinc-500 tracking-widest mb-10 flex items-center gap-2">
                                <PieIcon size={14}/> Gender Composition
                            </h3>
                            <div className="flex flex-col sm:flex-row items-center gap-12">
                                <div 
                                    className="relative w-44 h-44 rounded-full shadow-[0_0_50px_rgba(0,0,0,0.6)] shrink-0 transition-transform hover:scale-105 duration-500"
                                    style={{ background: `conic-gradient(#ec4899 0% ${stats.fPercent}%, #3b82f6 ${stats.fPercent}% 100%)` }}
                                >
                                    <div className="absolute inset-8 bg-zinc-900 rounded-full flex flex-col items-center justify-center border border-white/5 shadow-inner">
                                        <span className="text-3xl font-black text-white">{stats.castSize}</span>
                                        <span className="text-[9px] text-zinc-500 font-bold uppercase tracking-tighter">Students</span>
                                    </div>
                                </div>
                                <div className="flex-1 space-y-6 w-full">
                                    <LegendItem color="bg-pink-500" label="Female" percent={stats.fPercent} count={stats.female} />
                                    <div className="h-px bg-white/5" />
                                    <LegendItem color="bg-blue-500" label="Male" percent={stats.mPercent} count={stats.male} />
                                </div>
                            </div>
                        </div>

                        {/* ARTISTIC OBSERVATIONS */}
                        <div className="bg-zinc-900 border border-white/10 rounded-2xl p-8 shadow-xl flex flex-col">
                            <h3 className="text-xs font-black uppercase text-zinc-500 tracking-widest mb-6 flex items-center gap-2 italic">
                                <Microscope size={14}/> Artistic Observations
                            </h3>
                            <div className="space-y-4 flex-1">
                                <ObservationCard 
                                    icon={<LayoutGrid className="text-blue-500" size={18}/>}
                                    title="High Ensemble Density"
                                    desc={`The average student is performing ${stats.avgRolesPerKid} roles. This indicates a highly engaged ensemble with minimal 'downtime' for performers.`}
                                />
                                <ObservationCard 
                                    icon={<Activity className="text-emerald-500" size={18}/>}
                                    title="Retention Momentum"
                                    desc={`${stats.retentionRate}% of the cast are returning veterans. Institutional knowledge is high, which often speeds up tech week transitions.`}
                                />
                                <div className="p-4 bg-zinc-950/50 border border-white/5 rounded-2xl mt-4">
                                    <div className="text-[10px] font-black uppercase text-zinc-600 mb-2">Technical Note</div>
                                    <div className="text-[11px] text-zinc-500 leading-relaxed">
                                        Height data is currently verified for {stats.heightSample} of {stats.castSize} students. Costume leads should prioritize the remaining {stats.castSize - stats.heightSample} performers.
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* === TAB: BOX OFFICE & FINANCE === */}
            {activeTab === 'finance' && (
                <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-300">
                    
                    {/* TOP ROW MOMENTUM */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div className="bg-zinc-900 border border-white/10 p-8 rounded-3xl relative overflow-hidden group shadow-2xl">
                             <div className="absolute -right-6 -top-6 opacity-5 group-hover:opacity-10 transition-opacity"><Ticket size={160}/></div>
                             <h3 className="text-[10px] font-black uppercase text-blue-500 tracking-[0.2em] mb-2">Tickets Sold</h3>
                             <div className="text-6xl font-black text-white tracking-tighter">{stats.ticketsSold}</div>
                             <div className="mt-6 flex items-center gap-2 text-xs">
                                <div className="px-3 py-1 bg-emerald-900/30 text-emerald-400 rounded-full font-bold flex items-center gap-1.5 border border-emerald-500/20">
                                    <ArrowUpRight size={14}/> +{stats.momentum}
                                </div>
                                <span className="text-zinc-500 font-bold uppercase tracking-widest text-[10px]">vs. last fall (Same Day)</span>
                             </div>
                        </div>

                        <div className="bg-zinc-900 border border-white/10 p-8 rounded-3xl relative overflow-hidden group shadow-2xl">
                             <div className="absolute -right-6 -top-6 opacity-5 group-hover:opacity-10 transition-opacity"><TrendingUp size={160}/></div>
                             <h3 className="text-[10px] font-black uppercase text-emerald-500 tracking-[0.2em] mb-2">Gross Revenue</h3>
                             <div className="text-6xl font-black text-white tracking-tighter">${stats.revenue.toLocaleString()}</div>
                             <div className="mt-6 w-full bg-zinc-800 h-2 rounded-full overflow-hidden shadow-inner">
                                <div className="bg-emerald-500 h-full shadow-[0_0_15px_rgba(16,185,129,0.4)]" style={{ width: `${(stats.ticketsSold/stats.goal)*100}%` }} />
                             </div>
                             <div className="mt-3 text-[10px] text-zinc-500 font-black uppercase flex justify-between tracking-widest">
                                <span>{Math.round((stats.ticketsSold/stats.goal)*100)}% of Goal</span>
                                <span>Goal: {stats.goal} Tickets</span>
                             </div>
                        </div>

                        <div className="bg-zinc-900 border border-white/10 p-8 rounded-3xl flex flex-col justify-center items-center text-center shadow-2xl">
                             <Calendar size={40} className="text-blue-500 mb-3 animate-pulse"/>
                             <div className="text-5xl font-black text-white tracking-tighter">{stats.daysToOpening}</div>
                             <div className="text-[10px] font-black text-zinc-500 uppercase tracking-[0.3em] mt-2">Days To Opening</div>
                        </div>
                    </div>

                    {/* KRISTA'S SITE AUDITOR */}
                    <div className="bg-zinc-900 border border-white/10 rounded-3xl overflow-hidden shadow-2xl">
                        <div className="p-6 border-b border-white/10 flex justify-between items-center bg-zinc-950/40">
                            <div>
                                <h3 className="text-sm font-black uppercase text-zinc-200 tracking-[0.2em] flex items-center gap-3">
                                    <MapPin size={18} className="text-red-500"/> Site Auditor
                                </h3>
                                <p className="text-[11px] text-zinc-500 mt-1 font-medium">Class-based student distribution by campus location</p>
                            </div>
                        </div>
                        <div className="p-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                            <CampusCard name="River of Life" classes={3} students={59} color="text-emerald-400" />
                            <CampusCard name="River Club Church" classes={4} students={44} color="text-blue-400" />
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
        <div className="bg-zinc-900 border border-white/10 p-5 rounded-2xl shadow-lg hover:border-zinc-700 hover:bg-zinc-800/40 transition-all group">
            <div className="flex justify-between items-start mb-4">
                <div className="p-2.5 bg-black/40 rounded-xl border border-white/5 text-zinc-400 group-hover:text-white transition-colors group-hover:scale-110 duration-300">
                    {icon}
                </div>
                {trend === 'up' && (
                  <div className="text-[9px] font-black text-emerald-500 bg-emerald-500/10 px-2 py-0.5 rounded-full flex items-center gap-0.5 border border-emerald-500/20">
                    <ArrowUpRight size={10}/> 12%
                  </div>
                )}
            </div>
            <div className="text-3xl font-black text-white tracking-tighter">{value}</div>
            <div className="text-[10px] font-black text-zinc-500 uppercase tracking-widest mt-1 group-hover:text-zinc-400 transition-colors">{label}</div>
            <div className="text-[9px] text-zinc-600 font-bold leading-none mt-1.5">{sublabel}</div>
        </div>
    )
}

function LegendItem({ color, label, percent, count }: any) {
    return (
        <div className="flex items-center justify-between group">
            <div className="flex items-center gap-4">
                <div className={`w-4 h-4 rounded-full ${color} shadow-lg group-hover:scale-125 transition-transform`} />
                <span className="text-sm font-bold text-zinc-300 group-hover:text-white transition-colors">{label}</span>
            </div>
            <div className="text-right leading-none">
                <div className="text-2xl font-black text-white tracking-tighter">{percent}%</div>
                <div className="text-[10px] text-zinc-600 font-black uppercase tracking-tighter mt-1">{count} Students</div>
            </div>
        </div>
    )
}

function ObservationCard({ icon, title, desc }: any) {
    return (
        <div className="flex gap-5 p-5 bg-black/20 border border-white/5 rounded-2xl hover:bg-black/30 transition-all duration-300 group">
            <div className="shrink-0 group-hover:scale-110 transition-transform">{icon}</div>
            <div>
                <div className="text-sm font-black text-zinc-200 group-hover:text-white transition-colors tracking-tight">{title}</div>
                <div className="text-[11px] text-zinc-500 leading-relaxed mt-1.5 font-medium">{desc}</div>
            </div>
        </div>
    )
}

function CampusCard({ name, classes, students, color }: any) {
    return (
        <div className="bg-zinc-950/50 border border-white/5 p-5 rounded-2xl hover:bg-zinc-900 transition-colors group">
            <div className="text-xs font-black text-white truncate mb-4 group-hover:text-blue-400 transition-colors">{name}</div>
            <div className="space-y-3">
                <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-widest text-zinc-600">
                    <span>Classes</span>
                    <span className={`text-xs ${color}`}>{classes}</span>
                </div>
                <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-widest text-zinc-600">
                    <span>Students</span>
                    <span className={`text-xs ${color}`}>{students}</span>
                </div>
            </div>
        </div>
    )
}