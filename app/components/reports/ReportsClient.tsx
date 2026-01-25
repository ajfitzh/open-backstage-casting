"use client";

import React, { useState, useMemo } from 'react';
import { 
  BarChart3, Users, Ruler, Activity, 
  Wallet, AlertTriangle, ArrowUpRight, 
  ArrowDownRight, CheckCircle2, UserPlus,
  Copy, DollarSign, Microscope
} from 'lucide-react';

export default function ReportsClient({ productionTitle, assignments, people, compliance }: any) {
  const [activeTab, setActiveTab] = useState<'health' | 'finance'>('health');

  // --- 🧠 ANALYTICS ENGINE (Optimized for your CSV) ---
  const stats = useMemo(() => {
    // 1. Identify current cast
    const castIds = new Set(
        assignments
        .filter((a: any) => a["Person"] && a["Person"].length > 0)
        .map((a: any) => a["Person"][0].id)
    );
    const castSize = castIds.size;
    const castMembers = people.filter((p: any) => castIds.has(p.id));

    // 2. Metrics Accumulators
    let totalHeightInches = 0;
    let heightCount = 0;
    let male = 0; 
    let female = 0;
    let veterans = 0;
    let totalExperiencePoints = 0;

    castMembers.forEach((p: any) => {
        // --- GENDER ---
        const g = p["Gender"] || "Unknown";
        if (g === 'Male') male++;
        else if (g === 'Female') female++;

        // --- HEIGHT ---
        // Priority 1: Height (Total Inches) from your CSV
        const rawTotalInches = parseFloat(p["Height (Total Inches)"]);
        if (!isNaN(rawTotalInches) && rawTotalInches > 0) {
            totalHeightInches += rawTotalInches;
            heightCount++;
        } 
        // Priority 2: Fallback to parsing "Height (Formatted)" e.g. 5'7.0"
        else if (p["Height (Formatted)"] && p["Height (Formatted)"] !== "0'0\"") {
            const hStr = p["Height (Formatted)"].replace('"', '');
            const parts = hStr.split("'");
            if (parts.length >= 2) {
                const ft = parseInt(parts[0]) || 0;
                const inch = parseFloat(parts[1]) || 0;
                totalHeightInches += (ft * 12) + inch;
                heightCount++;
            }
        }

        // --- EXPERIENCE / RETENTION ---
        // Using "Cast/Crew Assignments" as a proxy for experience 
        // (Counting how many roles/assignments they have listed)
        const roles = p["Cast/Crew Assignments"] ? p["Cast/Crew Assignments"].split(',') : [];
        totalExperiencePoints += roles.length;
        if (roles.length > 2) veterans++; // If they have 3+ roles listed, they're likely veterans
    });

    const avgHeight = heightCount > 0 ? Math.round(totalHeightInches / heightCount) : 0;
    const avgHeightStr = avgHeight > 0 ? `${Math.floor(avgHeight/12)}'${avgHeight%12}"` : "N/A";
    const avgExp = castSize > 0 ? (totalExperiencePoints / castSize).toFixed(1) : "0";

    // 3. Financials
    const FEE_PER_ACTOR = 250; 
    const potentialRev = castSize * FEE_PER_ACTOR;
    const collectedCount = Array.isArray(compliance) ? compliance.filter((c:any) => c.paidFees).length : 0;
    const collectedRev = collectedCount * FEE_PER_ACTOR;

    return {
        castSize,
        male,
        female,
        avgHeightStr,
        avgExp,
        heightSample: heightCount,
        retentionRate: castSize > 0 ? Math.round((veterans / castSize) * 100) : 0,
        potentialRev,
        collectedRev,
        collectedCount
    };
  }, [assignments, people, compliance]);

  return (
    <div className="flex flex-col h-screen bg-zinc-950 text-white font-sans">
        {/* HEADER */}
        <header className="h-16 border-b border-white/10 bg-zinc-900 flex items-center justify-between px-6 shrink-0">
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
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <StatCard label="Total Cast" value={stats.castSize} sublabel="Active Assignments" icon={<Users size={20} className="text-blue-400"/>} />
                        <StatCard label="Avg Height" value={stats.avgHeightStr} sublabel={`Costumes: ${stats.heightSample} measured`} icon={<Ruler size={20} className="text-purple-400"/>} />
                        <StatCard label="Avg Experience" value={stats.avgExp} sublabel="Roles per student" icon={<Activity size={20} className="text-amber-400"/>} />
                        <StatCard label="Gender Ratio" value={`${stats.castSize > 0 ? Math.round((stats.female/stats.castSize)*100) : 0}% F`} sublabel={`${stats.male}M / ${stats.female}F`} icon={<Users size={20} className="text-pink-400"/>} />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="bg-zinc-900 border border-white/10 rounded-xl p-6">
                            <h3 className="text-xs font-black uppercase text-zinc-500 tracking-widest mb-4">Cast Composition</h3>
                            <div className="flex items-center gap-4 mb-2">
                                <div className="flex-1 h-4 bg-zinc-800 rounded-full overflow-hidden flex text-[10px] font-bold">
                                    <div className="bg-pink-500 h-full flex items-center justify-center" style={{ width: `${(stats.female/stats.castSize)*100}%` }}>{stats.female}F</div>
                                    <div className="bg-blue-500 h-full flex items-center justify-center" style={{ width: `${(stats.male/stats.castSize)*100}%` }}>{stats.male}M</div>
                                </div>
                            </div>
                            <p className="mt-4 text-[11px] text-zinc-600">
                                Gender balance is derived from the "Gender" column in the People table.
                            </p>
                        </div>

                        <div className="bg-zinc-900 border border-white/10 rounded-xl p-6 flex flex-col justify-center">
                             <div className="text-zinc-500 font-bold mb-2 flex items-center gap-2 italic">
                                <Microscope size={16}/> Show Health Observations
                             </div>
                             <ul className="text-xs text-zinc-400 space-y-2 list-disc pl-4">
                                <li><strong>Retention:</strong> Approx {stats.retentionRate}% of cast are considered "Veterans" based on role history.</li>
                                <li><strong>Costumes:</strong> {stats.heightSample === stats.castSize ? "100% of cast measured!" : `Missing ${stats.castSize - stats.heightSample} measurements.`}</li>
                             </ul>
                        </div>
                    </div>
                </div>
            )}

            {activeTab === 'finance' && (
                <div className="space-y-6">
                     <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        <div className="bg-zinc-900 border border-white/10 rounded-xl p-6">
                            <h3 className="text-xs font-black uppercase text-emerald-500 tracking-widest mb-1">True Headcount</h3>
                            <div className="text-4xl font-black text-white">{stats.castSize}</div>
                            <p className="text-xs text-zinc-500 mt-2">Unique students currently assigned in Baserow.</p>
                        </div>
                        <div className="bg-zinc-900 border border-white/10 rounded-xl p-6">
                            <h3 className="text-xs font-black uppercase text-amber-500 tracking-widest mb-1">Production Fees</h3>
                            <div className="text-4xl font-black text-white">${stats.collectedRev.toLocaleString()}</div>
                            <p className="text-xs text-zinc-500 mt-2">{stats.collectedCount} of {stats.castSize} fees collected.</p>
                        </div>
                    </div>
                </div>
            )}
        </div>
    </div>
  );
}

function StatCard({ label, value, sublabel, icon }: any) {
    return (
        <div className="bg-zinc-900 border border-white/10 p-5 rounded-xl shadow-lg group hover:border-blue-500/50 transition-all">
            <div className="flex justify-between items-start mb-4">
                <div className="p-2 bg-black/40 rounded-lg border border-white/5">{icon}</div>
            </div>
            <div className="text-2xl font-black text-white tracking-tight">{value}</div>
            <div className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider mt-1">{label}</div>
            <div className="text-[10px] text-zinc-600 mt-0.5">{sublabel}</div>
        </div>
    )
}