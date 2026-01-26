"use client";

import React, { useMemo, useState } from 'react';
import { 
    Theater, Users, Image as ImageIcon, 
    Video, FileText, BarChart3, Palette, Box, Layers,
    ArrowUpRight, Target, CalendarClock, CheckCircle2,
    TrendingUp, AlertTriangle, LayoutGrid, Timer
} from 'lucide-react';

// --- MOCK CONSTANTS FOR PACE ---
const WEEKS_TOTAL = 10;
const CURRENT_WEEK = 4; // Mocking that we are in Week 4
const GOAL_WEEK_8 = 8;  // Super Saturday Target

export default function ProductionClient({ show, assignments, auditionees, scenes, assets }: any) {
    const [activeTab, setActiveTab] = useState<'overview' | 'progress'>('overview');
    
    return (
        <div className="flex flex-col h-full bg-zinc-950 text-white font-sans overflow-y-auto custom-scrollbar">
            
            {/* HEADER */}
            <header className="p-8 border-b border-white/10 bg-zinc-900/50 backdrop-blur-md sticky top-0 z-20">
                <div className="flex justify-between items-end">
                    <div className="flex items-center gap-4">
                        <div className="p-3 bg-purple-500/10 rounded-xl border border-purple-500/20 text-purple-400">
                            <Theater size={24} />
                        </div>
                        <div>
                            <div className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500">Creative Control</div>
                            <h1 className="text-2xl font-black italic uppercase tracking-tighter text-white">{show.Title}</h1>
                        </div>
                    </div>
                    
                    {/* TABS */}
                    <div className="flex bg-zinc-900 p-1 rounded-lg border border-white/5">
                        <button 
                            onClick={() => setActiveTab('overview')}
                            className={`px-4 py-2 rounded-md text-[10px] font-black uppercase transition-all ${activeTab === 'overview' ? 'bg-zinc-700 text-white shadow' : 'text-zinc-500 hover:text-white'}`}
                        >
                            Overview
                        </button>
                        <button 
                            onClick={() => setActiveTab('progress')}
                            className={`px-4 py-2 rounded-md text-[10px] font-black uppercase transition-all flex items-center gap-2 ${activeTab === 'progress' ? 'bg-blue-600 text-white shadow' : 'text-zinc-500 hover:text-white'}`}
                        >
                            <TrendingUp size={14}/> Progress
                        </button>
                    </div>
                </div>
            </header>

            <div className="p-8">
                {activeTab === 'overview' ? (
                    <OverviewView 
                        show={show} 
                        assignments={assignments} 
                        auditionees={auditionees} 
                        scenes={scenes} 
                        assets={assets} 
                    />
                ) : (
                    <ProgressView scenes={scenes} />
                )}
            </div>
        </div>
    );
}

// ============================================================================
// 1. OVERVIEW TAB (Your Existing Dashboard)
// ============================================================================
function OverviewView({ show, assignments, auditionees, scenes, assets }: any) {
    const [assetFilter, setAssetFilter] = useState("All");

    // --- LOGIC: DEMOGRAPHICS (Fixed Gender) ---
    const demographics = useMemo(() => {
        const uniqueCastIds = new Set(assignments.map((a:any) => a.Person?.[0]?.id).filter(Boolean));
        const total = uniqueCastIds.size;
        const castProfiles = auditionees.filter((a:any) => uniqueCastIds.has(a.id));
        
        const getGender = (c: any) => {
            const g = c.Gender;
            if (typeof g === 'object' && g?.value) return g.value;
            if (typeof g === 'string') return g;
            return "Unknown";
        };

        const males = castProfiles.filter((c:any) => getGender(c) === 'Male').length;
        const females = castProfiles.filter((c:any) => getGender(c) === 'Female').length;
        const unknown = total - (males + females);

        return { total, males, females, unknown };
    }, [assignments, auditionees]);

    // --- LOGIC: WORKLOAD ---
    const workload = useMemo(() => {
        const counts: Record<string, number> = {};
        assignments.forEach((a:any) => {
            const name = a.Person?.[0]?.value || "Unknown";
            if (name !== "Unknown") counts[name] = (counts[name] || 0) + 1;
        });

        const sorted = Object.entries(counts).sort(([,a], [,b]) => b - a).slice(0, 5);
        const avgRoles = demographics.total > 0 ? (assignments.length / demographics.total).toFixed(1) : "0.0";

        return { topHeavy: sorted, avgRoles, totalAssignments: assignments.length };
    }, [assignments, demographics.total]);

    // --- LOGIC: ASSETS ---
    const filteredAssets = useMemo(() => {
        if (!assets) return [];
        if (assetFilter === "All") return assets;
        return assets.filter((a:any) => {
             const typeVal = typeof a.Type === 'object' ? a.Type?.value : a.Type;
             return typeVal === assetFilter;
        });
    }, [assets, assetFilter]);

    // --- LOGIC: SCENES ---
    const sceneStats = useMemo(() => {
        if (!scenes) return { count: 0, cues: 0 };
        const cues = scenes.reduce((acc: number, s: any) => acc + (parseFloat(s["Minimum Performers"]) || 0), 0);
        return { count: scenes.length, cues };
    }, [scenes]);

    return (
        <div className="space-y-8 animate-in slide-in-from-right-8 duration-500">
             {/* ROW 1: CAST METRICS */}
             <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <div className="bg-zinc-900 border border-white/5 rounded-3xl p-6 relative overflow-hidden group">
                    <div className="absolute right-0 top-0 p-6 opacity-10 group-hover:opacity-20 transition-opacity text-blue-500"><Users size={64}/></div>
                    <div className="text-[10px] font-black uppercase tracking-widest text-zinc-500 mb-1">Total Cast</div>
                    <div className="text-4xl font-black text-white mb-2">{demographics.total}</div>
                    <div className="flex items-center gap-2 text-xs font-bold text-zinc-400">
                        {demographics.males > 0 && <span className="bg-blue-900/30 text-blue-400 px-1.5 py-0.5 rounded">{demographics.males} M</span>}
                        {demographics.females > 0 && <span className="bg-pink-900/30 text-pink-400 px-1.5 py-0.5 rounded">{demographics.females} F</span>}
                        {demographics.unknown > 0 && <span className="bg-zinc-800 text-zinc-500 px-1.5 py-0.5 rounded">{demographics.unknown} ?</span>}
                    </div>
                </div>

                <div className="bg-zinc-900 border border-white/5 rounded-3xl p-6 relative overflow-hidden group">
                    <div className="absolute right-0 top-0 p-6 opacity-10 group-hover:opacity-20 transition-opacity text-emerald-500"><Layers size={64}/></div>
                    <div className="text-[10px] font-black uppercase tracking-widest text-zinc-500 mb-1">Workload</div>
                    <div className="text-4xl font-black text-white mb-2">{workload.avgRoles}</div>
                    <div className="text-xs font-bold text-emerald-500">Avg Roles / Kid</div>
                </div>

                <div className="bg-zinc-900 border border-white/5 rounded-3xl p-5 col-span-2 flex flex-col justify-center relative overflow-hidden">
                    <div className="flex justify-between items-end mb-3 relative z-10">
                        <h3 className="text-xs font-black uppercase tracking-widest text-zinc-500 flex items-center gap-2">
                            <BarChart3 size={14} className="text-amber-500"/> Heaviest Workloads
                        </h3>
                        <span className="text-[9px] text-zinc-600 uppercase font-bold">Total Assignments: {workload.totalAssignments}</span>
                    </div>
                    <div className="grid grid-cols-5 gap-2 relative z-10">
                        {workload.topHeavy.map(([name, count], i) => (
                            <div key={i} className="bg-black/40 border border-white/5 rounded-lg p-2 flex flex-col items-center text-center">
                                <span className="text-lg font-black text-white leading-none">{count}</span>
                                <span className="text-[9px] font-bold text-zinc-400 uppercase truncate w-full" title={name}>{name.split(' ')[0]}</span>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* ROW 2: ASSETS */}
            <div>
                <div className="flex justify-between items-end mb-4">
                    <h2 className="text-xl font-black uppercase italic tracking-tighter text-white flex items-center gap-2">
                        <Palette size={20} className="text-pink-500"/> Design Hub
                    </h2>
                    <div className="flex bg-zinc-900 p-1 rounded-lg border border-white/5">
                        {['All', 'Image', 'PDF', 'Audio'].map(type => (
                            <button key={type} onClick={() => setAssetFilter(type)} className={`px-4 py-1.5 rounded-md text-[10px] font-black uppercase transition-all ${assetFilter === type ? 'bg-zinc-700 text-white shadow' : 'text-zinc-500 hover:text-white'}`}>{type}</button>
                        ))}
                    </div>
                </div>
                {filteredAssets.length === 0 ? (
                     <div className="w-full h-32 border-2 border-dashed border-zinc-800 rounded-3xl flex flex-col items-center justify-center text-zinc-600 gap-2">
                        <Box size={24} className="opacity-20"/>
                        <p className="text-xs font-bold uppercase">No Design Assets Uploaded</p>
                     </div>
                ) : (
                    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
                        {filteredAssets.map((asset: any) => {
                            const type = typeof asset.Type === 'object' ? asset.Type?.value : asset.Type || "File";
                            const isImage = type === 'Image' || asset.Link.match(/\.(jpeg|jpg|gif|png)$/i);
                            return (
                                <a key={asset.id} href={asset.Link} target="_blank" className="group relative aspect-square bg-zinc-900 border border-white/10 rounded-2xl overflow-hidden hover:border-white/30 transition-all">
                                    {isImage ? <img src={asset.Link} className="w-full h-full object-cover opacity-60 group-hover:opacity-100 transition-opacity" /> : <div className="w-full h-full flex items-center justify-center text-zinc-600 group-hover:text-white transition-colors bg-zinc-800/50"><Box size={32}/></div>}
                                    <div className="absolute inset-x-0 bottom-0 p-3 bg-gradient-to-t from-black/90 to-transparent">
                                        <p className="text-xs font-bold text-white truncate">{asset.Name}</p>
                                        <p className="text-[9px] font-black text-zinc-400 uppercase">{type}</p>
                                    </div>
                                </a>
                            )
                        })}
                    </div>
                )}
            </div>

            {/* ROW 3: SCENES */}
            <div className="bg-zinc-900 border border-white/5 rounded-3xl p-6">
                <div className="flex justify-between items-center mb-6">
                    <h3 className="text-sm font-black uppercase tracking-widest text-zinc-400 flex items-center gap-2">Show Structure</h3>
                    <span className="text-xs font-mono text-zinc-500 bg-zinc-950 border border-white/10 px-3 py-1 rounded-full">{sceneStats.count} Scenes</span>
                </div>
                <div className="grid grid-cols-2 gap-8">
                     {['Act 1', 'Act 2'].map(act => (
                        <div key={act}>
                            <h4 className="text-[10px] font-black uppercase text-zinc-500 mb-3 border-b border-white/10 pb-1">{act}</h4>
                            <div className="space-y-1">
                                {scenes.filter((s:any) => {
                                    const a = typeof s.Act === 'object' ? s.Act?.value : s.Act;
                                    return a === act;
                                }).map((s:any) => (
                                    <div key={s.id} className="flex justify-between text-xs py-2 px-3 bg-zinc-950/50 border border-white/5 rounded-lg">
                                        <span className="font-bold text-zinc-300">{s["Scene Name"]}</span>
                                        <span className="text-[10px] font-black text-zinc-600 uppercase">{typeof s["Scene Type"] === 'object' ? s["Scene Type"]?.value : s["Scene Type"]}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                     ))}
                </div>
            </div>
        </div>
    )
}

// ============================================================================
// 2. PROGRESS TAB (The "Killer Feature")
// ============================================================================
function ProgressView({ scenes }: any) {
    // --- MOCK STATE for the "Progress" ---
    // In a real app, this would be saved in a new table "SceneProgress"
    const [progress, setProgress] = useState<Record<string, Record<string, number>>>(() => {
        const initial: any = {};
        scenes.forEach((s: any) => {
            // Mock some random progress for the demo
            initial[s.id] = {
                music: Math.random() > 0.5 ? 2 : 0, // 0=New, 1=Draft, 2=Polished
                dance: Math.random() > 0.7 ? 1 : 0,
                block: Math.random() > 0.3 ? 2 : 0,
            }
        });
        return initial;
    });

    const toggleStatus = (sceneId: string, type: 'music' | 'dance' | 'block') => {
        setProgress(prev => ({
            ...prev,
            [sceneId]: {
                ...prev[sceneId],
                [type]: (prev[sceneId][type] + 1) % 3
            }
        }));
    };

    const getStatusColor = (val: number) => {
        if (val === 2) return 'bg-emerald-500 border-emerald-400 text-white shadow-[0_0_10px_rgba(16,185,129,0.4)]'; // Polished
        if (val === 1) return 'bg-amber-500 border-amber-400 text-black'; // Draft/Working
        return 'bg-zinc-800 border-zinc-700 text-zinc-500 opacity-50'; // New
    };

    // --- CALCULATE PACE METRICS ---
    const metrics = useMemo(() => {
        let totalUnits = 0;
        let completedUnits = 0;

        scenes.forEach((s: any) => {
            const type = typeof s["Scene Type"] === 'object' ? s["Scene Type"]?.value : s["Scene Type"];
            // Determine required disciplines based on Scene Type
            const hasMusic = type === 'Song' || type === 'Mixed' || type === 'Dance';
            const hasDance = type === 'Dance' || type === 'Mixed';
            const hasBlock = true; // Everything has blocking

            if (hasMusic) totalUnits++;
            if (hasDance) totalUnits++;
            if (hasBlock) totalUnits++;

            const p = progress[s.id];
            if (hasMusic && p?.music === 2) completedUnits++;
            if (hasDance && p?.dance === 2) completedUnits++;
            if (hasBlock && p?.block === 2) completedUnits++;
        });

        const percentComplete = Math.round((completedUnits / totalUnits) * 100);
        
        // Velocity: Units completed per week
        const velocity = completedUnits / CURRENT_WEEK; 
        const remainingUnits = totalUnits - completedUnits;
        const weeksNeeded = velocity > 0 ? remainingUnits / velocity : 99;
        const projectedFinishWeek = CURRENT_WEEK + weeksNeeded;
        
        const isOnTrack = projectedFinishWeek <= GOAL_WEEK_8;

        return { totalUnits, completedUnits, percentComplete, velocity, projectedFinishWeek, isOnTrack };
    }, [scenes, progress]);

    return (
        <div className="space-y-8 animate-in slide-in-from-right-8 duration-500">
            
            {/* 1. PACE DASHBOARD */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                
                {/* VELOCITY CARD */}
                <div className={`col-span-2 rounded-3xl p-8 border relative overflow-hidden ${metrics.isOnTrack ? 'bg-zinc-900 border-white/10' : 'bg-red-900/10 border-red-500/20'}`}>
                    <div className="flex justify-between items-start mb-6 relative z-10">
                        <div>
                            <h3 className="text-sm font-black uppercase tracking-widest text-zinc-400 flex items-center gap-2">
                                <Target size={16} className={metrics.isOnTrack ? "text-blue-500" : "text-red-500"}/> 
                                Burn-Up Projection
                            </h3>
                            <h2 className="text-4xl font-black text-white mt-2">
                                {metrics.percentComplete}% <span className="text-lg text-zinc-500 font-bold">Show Ready</span>
                            </h2>
                        </div>
                        <div className="text-right">
                             <div className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider ${metrics.isOnTrack ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-red-500/10 text-red-400 border border-red-500/20'}`}>
                                {metrics.isOnTrack ? "On Track" : "Behind Schedule"}
                             </div>
                        </div>
                    </div>

                    {/* Timeline Bar */}
                    <div className="relative h-12 bg-black/40 rounded-xl border border-white/5 flex items-center px-4 mb-2 z-10">
                        {/* Progress Fill */}
                        <div className="absolute left-0 top-0 bottom-0 bg-blue-600/20 rounded-l-xl transition-all duration-1000" style={{ width: `${(CURRENT_WEEK / WEEKS_TOTAL) * 100}%` }}></div>
                        
                        {/* Markers */}
                        <div className="w-full flex justify-between text-[10px] font-black uppercase text-zinc-500 relative z-20">
                            <span>Start</span>
                            <span className={CURRENT_WEEK >= 4 ? "text-white" : ""}>Wk 4 (Now)</span>
                            <span>Wk 8 (Goal)</span>
                            <span>Wk 10 (Show)</span>
                        </div>
                        
                        {/* The Projected Finish Line */}
                        <div 
                            className="absolute top-0 bottom-0 w-1 bg-red-500 shadow-[0_0_10px_rgba(239,68,68,0.8)] z-30 transition-all duration-1000"
                            style={{ left: `${Math.min((metrics.projectedFinishWeek / WEEKS_TOTAL) * 100, 100)}%` }}
                        />
                    </div>
                    <p className="text-xs text-zinc-500 text-center relative z-10">
                        At current pace ({metrics.velocity.toFixed(1)} items/wk), we finish in <strong>Week {Math.round(metrics.projectedFinishWeek)}</strong>.
                        {metrics.projectedFinishWeek > 8 && <span className="text-red-400 ml-2 font-bold"><AlertTriangle size={12} className="inline mb-0.5"/> Risk: Missing Costume Parade target.</span>}
                    </p>
                </div>

                {/* STATS CARD */}
                <div className="bg-zinc-900 border border-white/5 rounded-3xl p-8 flex flex-col justify-center gap-4">
                     <div className="flex justify-between items-center pb-4 border-b border-white/5">
                        <span className="text-xs font-bold text-zinc-500 uppercase">Items Cleared</span>
                        <span className="text-xl font-black text-white">{metrics.completedUnits} <span className="text-sm text-zinc-600">/ {metrics.totalUnits}</span></span>
                     </div>
                     <div className="flex justify-between items-center pb-4 border-b border-white/5">
                        <span className="text-xs font-bold text-zinc-500 uppercase">Current Velocity</span>
                        <span className="text-xl font-black text-blue-400">{metrics.velocity.toFixed(1)} <span className="text-[10px] text-zinc-600 font-bold uppercase">/ Wk</span></span>
                     </div>
                     <div className="flex justify-between items-center">
                        <span className="text-xs font-bold text-zinc-500 uppercase">Target Date</span>
                        <span className="text-xl font-black text-emerald-400">Week {GOAL_WEEK_8}</span>
                     </div>
                </div>
            </div>

            {/* 2. THE MATRIX (Interactive Checklist) */}
            <div className="bg-zinc-900 border border-white/5 rounded-3xl overflow-hidden shadow-2xl">
                <div className="p-6 border-b border-white/5 bg-zinc-900/80 backdrop-blur-xl flex justify-between items-center sticky top-0 z-30">
                    <h3 className="text-lg font-black uppercase italic text-white flex items-center gap-2">
                        <CalendarClock size={20} className="text-purple-500"/> Production Tracker
                    </h3>
                    <div className="flex gap-4 text-[10px] font-bold uppercase text-zinc-500">
                        <div className="flex items-center gap-1"><div className="w-2 h-2 bg-zinc-800 rounded-full"/> New</div>
                        <div className="flex items-center gap-1"><div className="w-2 h-2 bg-amber-500 rounded-full"/> Draft</div>
                        <div className="flex items-center gap-1"><div className="w-2 h-2 bg-emerald-500 rounded-full"/> Polished</div>
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                        <thead className="bg-zinc-950 text-zinc-500 uppercase text-[10px] font-black tracking-widest border-b border-white/5">
                            <tr>
                                <th className="px-6 py-4 w-12">#</th>
                                <th className="px-6 py-4">Scene</th>
                                <th className="px-6 py-4 text-center w-32">Music</th>
                                <th className="px-6 py-4 text-center w-32">Dance</th>
                                <th className="px-6 py-4 text-center w-32">Block</th>
                                <th className="px-6 py-4 text-center w-24">Ready?</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                            {scenes.map((s: any, i: number) => {
                                const type = typeof s["Scene Type"] === 'object' ? s["Scene Type"]?.value : s["Scene Type"];
                                const hasMusic = type === 'Song' || type === 'Mixed' || type === 'Dance';
                                const hasDance = type === 'Dance' || type === 'Mixed';
                                const p = progress[s.id] || { music: 0, dance: 0, block: 0 };
                                const isReady = (!hasMusic || p.music === 2) && (!hasDance || p.dance === 2) && (p.block === 2);

                                return (
                                    <tr key={s.id} className="hover:bg-white/5 transition-colors group">
                                        <td className="px-6 py-4 font-mono text-zinc-600">{i + 1}</td>
                                        <td className="px-6 py-4 font-bold text-zinc-300">
                                            {s["Scene Name"]}
                                            <span className="ml-2 text-[9px] font-normal text-zinc-600 border border-zinc-800 px-1.5 py-0.5 rounded uppercase">{type}</span>
                                        </td>
                                        
                                        {/* MUSIC TOGGLE */}
                                        <td className="px-6 py-4 text-center">
                                            {hasMusic ? (
                                                <button onClick={() => toggleStatus(s.id, 'music')} className={`w-full py-1.5 rounded text-[10px] font-black uppercase transition-all ${getStatusColor(p.music)}`}>
                                                    {p.music === 2 ? "Done" : p.music === 1 ? "Draft" : "-"}
                                                </button>
                                            ) : <span className="text-zinc-800 text-xs">-</span>}
                                        </td>

                                        {/* DANCE TOGGLE */}
                                        <td className="px-6 py-4 text-center">
                                            {hasDance ? (
                                                <button onClick={() => toggleStatus(s.id, 'dance')} className={`w-full py-1.5 rounded text-[10px] font-black uppercase transition-all ${getStatusColor(p.dance)}`}>
                                                    {p.dance === 2 ? "Done" : p.dance === 1 ? "Draft" : "-"}
                                                </button>
                                            ) : <span className="text-zinc-800 text-xs">-</span>}
                                        </td>

                                        {/* BLOCKING TOGGLE */}
                                        <td className="px-6 py-4 text-center">
                                            <button onClick={() => toggleStatus(s.id, 'block')} className={`w-full py-1.5 rounded text-[10px] font-black uppercase transition-all ${getStatusColor(p.block)}`}>
                                                {p.block === 2 ? "Done" : p.block === 1 ? "Draft" : "-"}
                                            </button>
                                        </td>

                                        {/* STATUS ICON */}
                                        <td className="px-6 py-4 text-center">
                                            {isReady ? <CheckCircle2 size={18} className="mx-auto text-emerald-500"/> : <div className="w-1.5 h-1.5 rounded-full bg-zinc-800 mx-auto"/>}
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    )
}