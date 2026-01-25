"use client";

import React, { useState, useMemo } from 'react';
import { 
  BarChart3, Users, Ruler, Activity, 
  Wallet, Star, LayoutGrid, ArrowUpRight, 
  ArrowDownRight, CheckCircle2, UserPlus,
  Copy, DollarSign, Microscope, PieChart
} from 'lucide-react';

export default function ReportsClient({ productionTitle, assignments, people, compliance }: any) {
  const [activeTab, setActiveTab] = useState<'health' | 'finance'>('health');

  // --- 🧠 THE ANALYTICS ENGINE (Optimized for Baserow/CSV) ---
  const stats = useMemo(() => {
    // 1. Filter for the current cast
    const castIds = new Set(
        assignments
        .filter((a: any) => a["Person"] && a["Person"].length > 0)
        .map((a: any) => a["Person"][0].id)
    );
    const castSize = castIds.size;
    const castMembers = people.filter((p: any) => castIds.has(p.id));

    // 2. Metric Accumulators
    let totalHeightInches = 0;
    let heightCount = 0;
    let male = 0; 
    let female = 0;
    let veterans = 0;
    let totalPrevRolesCount = 0;

    castMembers.forEach((p: any) => {
        // --- GENDER ---
        const g = p["Gender"] || "Unknown";
        if (g === 'Male') male++;
        else if (g === 'Female') female++;

        // --- HEIGHT (Detecting 5'7" vs 67.0) ---
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

        // --- EXPERIENCE (Retention) ---
        const rawPrevAssignments = p["Cast/Crew Assignments"];
        let rolesCount = 0;
        if (Array.isArray(rawPrevAssignments)) {
            rolesCount = rawPrevAssignments.length;
        } else if (typeof rawPrevAssignments === 'string' && rawPrevAssignments.trim() !== "") {
            rolesCount = rawPrevAssignments.split(',').length;
        }
        totalPrevRolesCount += rolesCount;
        if (rolesCount > 2) veterans++; // Criteria for "Veteran"
    });

    // 3. SNAPPY STATS CALCULATIONS
    const totalRolesCurrent = assignments.length;
    const avgRolesPerKid = castSize > 0 ? (totalRolesCurrent / castSize).toFixed(1) : "0";
    const avgHeight = heightCount > 0 ? Math.round(totalHeightInches / heightCount) : 0;
    const avgHeightStr = avgHeight > 0 ? `${Math.floor(avgHeight/12)}'${avgHeight%12}"` : "N/A";
    const avgPrevExp = castSize > 0 ? (totalPrevRolesCount / castSize).toFixed(1) : "0";

    // 4. FINANCIALS
    const FEE_PER_ACTOR = 250; 
    const potentialRev = castSize * FEE_PER_ACTOR;
    const collectedCount = Array.isArray(compliance) ? compliance.filter((c:any) => c.paidFees).length : 0;
    const collectedRev = collectedCount * FEE_PER_ACTOR;

    // 5. DUPLICATE DETECTOR
    const duplicates = [];
    const sortedPeople = [...people].sort((a,b) => (a["Full Name"] || "").localeCompare(b["Full Name"] || ""));
    for(let i=0; i<sortedPeople.length-1; i++) {
        const p1 = sortedPeople[i]; const p2 = sortedPeople[i+1];
        if ((p1.Email && p1.Email === p2.Email) || (p1["Full Name"] === p2["Full Name"] && p1["Full Name"] !== "")) {
             duplicates.push({ p1, p2, reason: "Match Detected" });
        }
    }

    return {
        castSize,
        totalRolesCurrent,
        avgRolesPerKid,
        male,
        female,
        avgHeightStr,
        avgPrevExp,
        heightSample: heightCount,
        retentionRate: castSize > 0 ? Math.round((veterans / castSize) * 100) : 0,
        potentialRev,
        collectedRev,
        collectedCount,
        duplicates
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
                    Business Office
                </button>
            </div>
        </header>

        {/* CONTENT */}
        <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">
            
            {activeTab === 'health' && (
                <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
                    
                    {/* SNAPPY TOP ROW */}
                    <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4">
                        <StatCard 
                            label="Students in Cast" 
                            value={stats.castSize} 
                            sublabel="Unique Performers"
                            icon={<Users size={20} className="text-blue-400"/>} 
                        />
                        <StatCard 
                            label="Total Roles" 
                            value={stats.totalRolesCurrent} 
                            sublabel="Total Assignments"
                            icon={<Star size={20} className="text-yellow-400"/>} 
                        />
                        <StatCard 
                            label="Avg. Roles / Kid" 
                            value={stats.avgRolesPerKid} 
                            sublabel="Ensemble Density"
                            icon={<LayoutGrid size={20} className="text-emerald-400"/>} 
                        />
                        <StatCard 
                            label="Avg Height" 
                            value={stats.avgHeightStr} 
                            sublabel={`Costumes: ${stats.heightSample} Ready`}
                            icon={<Ruler size={20} className="text-purple-400"/>} 
                        />
                        <StatCard 
                            label="Gender Ratio" 
                            value={`${stats.castSize > 0 ? Math.round((stats.female/stats.castSize)*100) : 0}% F`} 
                            sublabel={`${stats.male}M / ${stats.female}F`}
                            icon={<Users size={20} className="text-pink-400"/>} 
                        />
                        <StatCard 
                            label="Avg Experience" 
                            value={stats.avgPrevExp} 
                            sublabel="Prev. Roles Avg"
                            icon={<Activity size={20} className="text-orange-400"/>} 
                        />
                    </div>

                    {/* GRAPHS & OBSERVATIONS */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="bg-zinc-900 border border-white/10 rounded-2xl p-6 shadow-xl">
                            <h3 className="text-xs font-black uppercase text-zinc-500 tracking-widest mb-6 flex items-center gap-2">
                                <PieChart size={14}/> Cast Composition
                            </h3>
                            <div className="flex items-center gap-4 mb-4">
                                <div className="flex-1 h-6 bg-zinc-800 rounded-full overflow-hidden flex text-[10px] font-black shadow-inner">
                                    <div className="bg-pink-500 h-full flex items-center justify-center border-r border-black/10" style={{ width: `${(stats.female/stats.castSize)*100}%` }}>
                                        {Math.round((stats.female/stats.castSize)*100)}% FEMALE
                                    </div>
                                    <div className="bg-blue-500 h-full flex items-center justify-center" style={{ width: `${(stats.male/stats.castSize)*100}%` }}>
                                        {Math.round((stats.male/stats.castSize)*100)}% MALE
                                    </div>
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="bg-black/20 p-3 rounded-xl border border-white/5">
                                    <div className="text-[10px] text-zinc-500 font-bold uppercase mb-1">Retention Score</div>
                                    <div className="text-xl font-black text-emerald-500">{stats.retentionRate}%</div>
                                </div>
                                <div className="bg-black/20 p-3 rounded-xl border border-white/5">
                                    <div className="text-[10px] text-zinc-500 font-bold uppercase mb-1">Veterans</div>
                                    <div className="text-xl font-black text-blue-400">{Math.round(stats.castSize * (stats.retentionRate/100))}</div>
                                </div>
                            </div>
                        </div>

                        <div className="bg-zinc-900 border border-white/10 rounded-2xl p-6 shadow-xl flex flex-col">
                            <h3 className="text-xs font-black uppercase text-zinc-500 tracking-widest mb-4 flex items-center gap-2 italic">
                                <Microscope size={14}/> Artistic Observations
                            </h3>
                            <div className="space-y-4 flex-1">
                                <div className="flex gap-4 p-3 bg-blue-900/10 border border-blue-500/20 rounded-xl">
                                    <LayoutGrid className="text-blue-500 shrink-0" size={20}/>
                                    <div>
                                        <div className="text-sm font-bold text-blue-200">Ensemble Density is Healthy</div>
                                        <div className="text-[11px] text-zinc-500 leading-tight">Your average student is performing {stats.avgRolesPerKid} roles. This suggests a highly engaged ensemble.</div>
                                    </div>
                                </div>
                                <div className="flex gap-4 p-3 bg-purple-900/10 border border-purple-500/20 rounded-xl">
                                    <Ruler className="text-purple-500 shrink-0" size={20}/>
                                    <div>
                                        <div className="text-sm font-bold text-purple-200">Costume Readiness</div>
                                        <div className="text-[11px] text-zinc-500 leading-tight">{stats.heightSample} of {stats.castSize} heights recorded. Average cast height is {stats.avgHeightStr}.</div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {activeTab === 'finance' && (
                <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        <div className="bg-zinc-900 border border-white/10 rounded-2xl p-6 relative overflow-hidden group shadow-xl">
                            <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity"><Users size={120}/></div>
                            <h3 className="text-xs font-black uppercase text-emerald-500 tracking-widest mb-1">True Headcount</h3>
                            <div className="text-5xl font-black text-white mb-2">{stats.castSize}</div>
                            <p className="text-xs text-zinc-500">Unique students billed for {productionTitle}.</p>
                        </div>

                        <div className="bg-zinc-900 border border-white/10 rounded-2xl p-6 relative overflow-hidden group shadow-xl">
                            <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity"><Wallet size={120}/></div>
                            <h3 className="text-xs font-black uppercase text-amber-500 tracking-widest mb-1">Production Fees</h3>
                            <div className="text-5xl font-black text-white mb-2">${stats.collectedRev.toLocaleString()}</div>
                            <div className="w-full bg-zinc-800 h-2 rounded-full overflow-hidden mb-2 shadow-inner">
                                <div className="bg-amber-500 h-full shadow-[0_0_10px_rgba(245,158,11,0.5)]" style={{ width: `${(stats.collectedRev/stats.potentialRev)*100}%` }}/>
                            </div>
                            <p className="text-xs text-zinc-400 flex justify-between font-bold">
                                <span>{stats.collectedCount} Collected</span>
                                <span>${stats.potentialRev.toLocaleString()} Goal</span>
                            </p>
                        </div>

                        <div className="bg-zinc-900 border border-white/10 rounded-2xl p-6 flex flex-col justify-center items-center text-center border-dashed">
                             <UserPlus size={32} className="text-zinc-600 mb-2"/>
                            <div className="text-zinc-400 font-bold text-sm">Merge Accounts</div>
                            <p className="mt-2 text-[10px] text-zinc-500 px-6">
                                Found <strong>{stats.duplicates.length}</strong> potential duplicate accounts in Baserow.
                            </p>
                        </div>
                    </div>
                </div>
            )}
        </div>
    </div>
  );
}

// --- REUSABLE STAT CARD ---
function StatCard({ label, value, sublabel, icon }: any) {
    return (
        <div className="bg-zinc-900 border border-white/10 p-5 rounded-2xl shadow-lg group hover:border-blue-500/50 hover:bg-zinc-800/50 transition-all">
            <div className="flex justify-between items-start mb-4">
                <div className="p-2 bg-black/40 rounded-xl border border-white/5 group-hover:scale-110 transition-transform">{icon}</div>
            </div>
            <div className="text-3xl font-black text-white tracking-tighter">{value}</div>
            <div className="text-[10px] font-black text-zinc-500 uppercase tracking-widest mt-1 group-hover:text-zinc-300 transition-colors">{label}</div>
            <div className="text-[10px] text-zinc-600 mt-0.5 font-medium">{sublabel}</div>
        </div>
    )
}