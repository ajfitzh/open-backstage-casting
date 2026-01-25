"use client";

import React, { useState, useMemo } from 'react';
import { 
  BarChart3, Users, Ruler, Activity, 
  Wallet, AlertTriangle, ArrowUpRight, 
  ArrowDownRight, CheckCircle2, UserPlus,
  Copy, DollarSign
} from 'lucide-react';

export default function ReportsClient({ productionTitle, assignments, people, compliance }: any) {
  const [activeTab, setActiveTab] = useState<'health' | 'finance'>('health');

  // --- 🧠 ANALYTICS ENGINE ---
  const stats = useMemo(() => {
    // 1. Unique Cast List
    const castIds = new Set(assignments.map((a: any) => a["Person"]?.[0]?.id));
    const castSize = castIds.size;
    
    // 2. Hydrate Cast Members
    const castMembers = people.filter((p: any) => castIds.has(p.id));

    // 3. Demographics (Mocking Height/Age if missing, usually in "Bio" field)
    let totalHeightInches = 0;
    let heightCount = 0;
    let male = 0; 
    let female = 0;
    let veterans = 0;

    castMembers.forEach((p: any) => {
        // Gender Logic
        const g = p["Gender"]?.value?.value || "Unknown";
        if (g === 'Male') male++;
        else if (g === 'Female') female++;

        // Height Logic (Parsing "5'4" or "64")
        const hStr = p["Height"] || ""; 
        if (hStr) {
            // Simple parser for 5'4"
            const parts = hStr.split("'");
            if (parts.length === 2) {
                totalHeightInches += (parseInt(parts[0]) * 12) + parseInt(parts[1]);
                heightCount++;
            }
        }

        // Veteran Logic (Based on 'Past Productions' count if available, or Join Date)
        // For now, let's assume if ID < 50 they are veterans (Mock logic)
        if (p.id < 50) veterans++;
    });

    const avgHeight = heightCount > 0 ? Math.round(totalHeightInches / heightCount) : 0;
    const avgHeightStr = avgHeight > 0 ? `${Math.floor(avgHeight/12)}'${avgHeight%12}"` : "N/A";

    // 4. Financials (Krista's Data)
    // Production Fee is usually fixed, e.g., $250
    const FEE_PER_ACTOR = 250; 
    const potentialRev = castSize * FEE_PER_ACTOR;
    const collectedCount = compliance.filter((c:any) => c.paidFees).length;
    const collectedRev = collectedCount * FEE_PER_ACTOR;

    // 5. Duplicate Detection
    // Finds people with same Last Name and similar First Name, or same Email
    const duplicates = [];
    const sortedPeople = [...people].sort((a,b) => (a["Full Name"] || "").localeCompare(b["Full Name"] || ""));
    
    for(let i=0; i<sortedPeople.length-1; i++) {
        const p1 = sortedPeople[i];
        const p2 = sortedPeople[i+1];
        const name1 = p1["Full Name"] || "";
        const name2 = p2["Full Name"] || "";
        
        // Simple fuzzy check: Same first 3 letters of last name + same first letter of first name
        // Or exact email match
        const email1 = p1["Email"];
        const email2 = p2["Email"];

        if ((email1 && email2 && email1 === email2) || (name1 === name2 && name1 !== "")) {
             duplicates.push({ p1, p2, reason: "Identical Name/Email" });
        }
    }

    return {
        castSize,
        male,
        female,
        avgHeightStr,
        veterans,
        rookies: castSize - veterans,
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
        <header className="h-16 border-b border-white/10 bg-zinc-900 flex items-center justify-between px-6 shrink-0">
            <h1 className="text-lg font-black uppercase italic tracking-wider flex items-center gap-2 text-zinc-400">
                <BarChart3 className="text-blue-500" /> {productionTitle} Reports
            </h1>
            
            {/* TABS */}
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
                    Business Office
                </button>
            </div>
        </header>

        {/* CONTENT */}
        <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">
            
            {/* --- TAB: SHOW HEALTH --- */}
            {activeTab === 'health' && (
                <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
                    
                    {/* TOP ROW STATS */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <StatCard 
                            label="Total Cast" 
                            value={stats.castSize} 
                            sublabel="Active Assignments"
                            icon={<Users size={20} className="text-blue-400"/>} 
                        />
                        <StatCard 
                            label="Retention Rate" 
                            value={`${stats.retentionRate}%`} 
                            sublabel="Returning Students"
                            icon={<Activity size={20} className="text-emerald-400"/>}
                            trend="up" 
                        />
                         <StatCard 
                            label="Avg Height" 
                            value={stats.avgHeightStr} 
                            sublabel="Costume Estimate"
                            icon={<Ruler size={20} className="text-purple-400"/>} 
                        />
                         <StatCard 
                            label="Gender Ratio" 
                            value={`${Math.round((stats.female/stats.castSize)*100)}% F`} 
                            sublabel={`${stats.male}M / ${stats.female}F`}
                            icon={<Users size={20} className="text-pink-400"/>} 
                        />
                    </div>

                    {/* VETERAN CHART */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="bg-zinc-900 border border-white/10 rounded-xl p-6">
                            <h3 className="text-xs font-black uppercase text-zinc-500 tracking-widest mb-4">Experience Breakdown</h3>
                            <div className="flex items-center gap-4 mb-2">
                                <div className="flex-1 h-4 bg-zinc-800 rounded-full overflow-hidden flex">
                                    <div className="bg-emerald-500" style={{ width: `${stats.retentionRate}%` }} />
                                    <div className="bg-blue-500" style={{ width: `${100 - stats.retentionRate}%` }} />
                                </div>
                            </div>
                            <div className="flex justify-between text-xs font-medium text-zinc-400">
                                <span className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-emerald-500"/> {stats.veterans} Veterans (Retention)</span>
                                <span className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-blue-500"/> {stats.rookies} New Students</span>
                            </div>
                            <p className="mt-4 text-[11px] text-zinc-600 leading-relaxed">
                                High retention indicates strong program health. A healthy mix (60% Vet / 40% New) ensures mentorship while growing the base.
                            </p>
                        </div>

                         <div className="bg-zinc-900 border border-white/10 rounded-xl p-6 flex flex-col justify-center items-center text-center opacity-70 border-dashed">
                            <Activity size={40} className="text-zinc-700 mb-2"/>
                            <div className="text-zinc-500 font-bold">Historical Comparison</div>
                            <div className="text-xs text-zinc-600">Need last year's data to calculate Year-Over-Year growth.</div>
                        </div>
                    </div>
                </div>
            )}

            {/* --- TAB: BUSINESS OFFICE (KRISTA) --- */}
            {activeTab === 'finance' && (
                <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
                    
                    {/* KRISTA'S HEADACHE SOLVERS */}
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        
                        {/* 1. REAL HEADCOUNT */}
                        <div className="bg-zinc-900 border border-white/10 rounded-xl p-6 relative overflow-hidden">
                            <div className="absolute top-0 right-0 p-4 opacity-10"><Users size={100}/></div>
                            <h3 className="text-xs font-black uppercase text-emerald-500 tracking-widest mb-1">True Headcount</h3>
                            <div className="text-4xl font-black text-white mb-2">{stats.castSize}</div>
                            <p className="text-xs text-zinc-400">
                                This is the distinct count of students assigned to roles in <strong>{productionTitle}</strong>. 
                                <br/><br/>
                                <span className="text-emerald-400 font-bold">Use this number</span> for invoicing National, not the registration list.
                            </p>
                        </div>

                        {/* 2. REVENUE TRACKER */}
                        <div className="bg-zinc-900 border border-white/10 rounded-xl p-6 relative overflow-hidden">
                            <div className="absolute top-0 right-0 p-4 opacity-10"><Wallet size={100}/></div>
                            <h3 className="text-xs font-black uppercase text-amber-500 tracking-widest mb-1">Production Fees</h3>
                            <div className="text-4xl font-black text-white mb-2">
                                ${stats.collectedRev.toLocaleString()}
                            </div>
                            <div className="w-full bg-zinc-800 h-1.5 rounded-full overflow-hidden mb-2">
                                <div className="bg-amber-500 h-full" style={{ width: `${(stats.collectedRev/stats.potentialRev)*100}%` }}/>
                            </div>
                            <p className="text-xs text-zinc-400 flex justify-between">
                                <span>Collected: {stats.collectedCount}</span>
                                <span>Outstanding: {stats.castSize - stats.collectedCount}</span>
                            </p>
                        </div>

                        {/* 3. TICKET/REFUND LOG (Placeholder) */}
                         <div className="bg-zinc-900 border border-white/10 rounded-xl p-6 flex flex-col justify-center items-center text-center border-dashed">
                             <DollarSign size={32} className="text-zinc-600 mb-2"/>
                            <div className="text-zinc-400 font-bold text-sm">Offline Refund Log</div>
                            <button className="mt-2 text-[10px] bg-zinc-800 hover:bg-zinc-700 px-3 py-1 rounded text-zinc-300 transition-colors">
                                + Log Manual Refund
                            </button>
                            <p className="mt-2 text-[10px] text-zinc-600">
                                Track refunds here to reconcile with Authorize.net statements.
                            </p>
                        </div>
                    </div>

                    {/* DUPLICATE ACCOUNT DETECTOR */}
                    <div className="bg-zinc-900 border border-white/10 rounded-xl overflow-hidden">
                        <div className="p-4 border-b border-white/10 flex justify-between items-center">
                            <div>
                                <h3 className="text-xs font-black uppercase text-zinc-400 tracking-widest flex items-center gap-2">
                                    <UserPlus size={14} className="text-red-500"/> Duplicate Account Detector
                                </h3>
                                <p className="text-[10px] text-zinc-500 mt-1">
                                    These accounts have matching names or emails. Please verify and merge in National.
                                </p>
                            </div>
                            <span className="bg-red-900/30 text-red-400 px-2 py-1 rounded text-xs font-bold border border-red-500/20">
                                {stats.duplicates.length} Potential Issues
                            </span>
                        </div>
                        
                        <div className="max-h-64 overflow-y-auto custom-scrollbar">
                            <table className="w-full text-left border-collapse">
                                <thead className="bg-zinc-950 text-[10px] font-bold text-zinc-600 uppercase">
                                    <tr>
                                        <th className="p-3">Record A</th>
                                        <th className="p-3">Record B</th>
                                        <th className="p-3">Conflict Reason</th>
                                        <th className="p-3 text-right">Action</th>
                                    </tr>
                                </thead>
                                <tbody className="text-xs text-zinc-400 divide-y divide-white/5">
                                    {stats.duplicates.map((dup: any, i: number) => (
                                        <tr key={i} className="hover:bg-white/5">
                                            <td className="p-3">
                                                <div className="text-white font-bold">{dup.p1["Full Name"]}</div>
                                                <div className="text-[10px] text-zinc-500">{dup.p1.Email}</div>
                                            </td>
                                            <td className="p-3">
                                                <div className="text-white font-bold">{dup.p2["Full Name"]}</div>
                                                <div className="text-[10px] text-zinc-500">{dup.p2.Email}</div>
                                            </td>
                                            <td className="p-3 text-red-400 font-medium">
                                                {dup.reason}
                                            </td>
                                            <td className="p-3 text-right">
                                                <button className="flex items-center gap-1 ml-auto text-[10px] bg-zinc-800 hover:bg-zinc-700 px-2 py-1 rounded">
                                                    <Copy size={10}/> Copy IDs
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                    {stats.duplicates.length === 0 && (
                                        <tr>
                                            <td colSpan={4} className="p-8 text-center text-zinc-600 italic">
                                                <CheckCircle2 size={24} className="mx-auto mb-2 text-emerald-900"/>
                                                No duplicate accounts detected.
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>

                </div>
            )}

        </div>
    </div>
  );
}

// --- SUB-COMPONENT: STAT CARD ---
function StatCard({ label, value, sublabel, icon, trend }: any) {
    return (
        <div className="bg-zinc-900 border border-white/10 p-5 rounded-xl flex flex-col justify-between shadow-lg relative group overflow-hidden">
            <div className="flex justify-between items-start mb-2">
                <div className="p-2 bg-black/40 rounded-lg border border-white/5 text-zinc-400 group-hover:text-white transition-colors">
                    {icon}
                </div>
                {trend === 'up' && <div className="text-emerald-500 flex items-center gap-0.5 text-[10px] font-bold bg-emerald-900/20 px-1.5 py-0.5 rounded"><ArrowUpRight size={10}/> +5%</div>}
                {trend === 'down' && <div className="text-red-500 flex items-center gap-0.5 text-[10px] font-bold bg-red-900/20 px-1.5 py-0.5 rounded"><ArrowDownRight size={10}/> -2%</div>}
            </div>
            
            <div>
                <div className="text-2xl font-black text-white tracking-tight">{value}</div>
                <div className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider mt-1">{label}</div>
                <div className="text-[10px] text-zinc-600 mt-0.5 truncate">{sublabel}</div>
            </div>
        </div>
    )
}