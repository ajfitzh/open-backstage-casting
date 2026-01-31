"use client";

import React, { useMemo, useState } from 'react';
import { 
    Theater, Users, Image as ImageIcon, 
    Video, FileText, BarChart3, Palette, Box, Layers,
    ArrowUpRight, Target, CalendarClock, CheckCircle2,
    TrendingUp, AlertTriangle, LayoutGrid, Timer,
    Ruler, GraduationCap, Sparkles
} from 'lucide-react';

// --- CONSTANTS ---
const WEEKS_TOTAL = 10;
const CURRENT_WEEK = 4; // Mocking that we are in Week 4
const GOAL_WEEK_8 = 8;  // Super Saturday Target

export default function ProductionClient({ show, assignments, auditionees, scenes, assets, population = [] }: any) {
    const [activeTab, setActiveTab] = useState<'overview' | 'progress'>('overview');
    
    // Safety check
    if (!show) return <div className="h-screen flex items-center justify-center text-zinc-500 font-mono">Loading Show Data...</div>;

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
                            <h1 className="text-2xl font-black italic uppercase tracking-tighter text-white">{show.title}</h1>
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
                        population={population} 
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
// 1. OVERVIEW TAB (Analytics & Assets)
// ============================================================================
function OverviewView({ assignments, population, scenes, assets }: any) {
    const [assetFilter, setAssetFilter] = useState("All");

    // --- LOGIC: CAST ANALYTICS ---
    const stats = useMemo(() => {
        // 1. Filter Population
        const activeIds = new Set(assignments.map((a:any) => a.personId).filter(Boolean));
        const activeCast = population.filter((p:any) => activeIds.has(p.id));
        
        const total = activeCast.length;

        // 2. Gender
        const males = activeCast.filter((p:any) => (p.gender || "").trim() === 'Male').length;
        const females = activeCast.filter((p:any) => (p.gender || "").trim() === 'Female').length;
        
        // 3. Experience
        const exp = { green: 0, journey: 0, pro: 0 };
        activeCast.forEach((p:any) => {
            const count = p.showCount || 0;
            if (count <= 2) exp.green++;
            else if (count <= 5) exp.journey++;
            else exp.pro++;
        });

        // 4. Age
        const validAges = activeCast.map((p:any) => p.age).filter((a:number) => a > 0);
        const avgAge = validAges.length ? (validAges.reduce((a:number,b:number)=>a+b,0) / validAges.length).toFixed(1) : "N/A";
        const minAge = validAges.length ? Math.min(...validAges) : 0;
        const maxAge = validAges.length ? Math.max(...validAges) : 0;

        // 5. Height (Converted to Feet/Inches)
        const validHeights = activeCast.map((p:any) => p.height).filter((h:number) => h > 0);
        let avgHeightStr = "N/A";
        
        if (validHeights.length > 0) {
            const avgInches = validHeights.reduce((a:number,b:number)=>a+b,0) / validHeights.length;
            const feet = Math.floor(avgInches / 12);
            const inches = Math.round(avgInches % 12);
            avgHeightStr = `${feet}' ${inches}"`;
        }

        return { total, males, females, exp, avgAge, minAge, maxAge, avgHeightStr };
    }, [assignments, population]);

    // --- LOGIC: ASSETS ---
    const filteredAssets = useMemo(() => {
        if (!assets) return [];
        return assetFilter === "All" ? assets : assets.filter((a:any) => a.type === assetFilter);
    }, [assets, assetFilter]);

    return (
        <div className="space-y-8 animate-in slide-in-from-right-8 duration-500">
             
             {/* ROW 1: THE BIG NUMBERS */}
             <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                
                {/* 1. CAST COUNT */}
                <div className="bg-zinc-900 border border-white/5 rounded-3xl p-6 relative overflow-hidden group hover:border-white/10 transition-all">
                    <div className="absolute right-0 top-0 p-6 opacity-5 group-hover:opacity-10 transition-opacity text-blue-500"><Users size={80}/></div>
                    <div className="text-[10px] font-black uppercase tracking-widest text-zinc-500 mb-1">Total Cast</div>
                    <div className="text-4xl font-black text-white mb-3">{stats.total}</div>
                    
                    {/* Gender Bar */}
                    <div className="w-full h-1.5 bg-zinc-800 rounded-full flex overflow-hidden mb-2">
                        <div style={{ width: `${stats.total ? (stats.males / stats.total) * 100 : 0}%` }} className="bg-blue-500"/>
                        <div style={{ width: `${stats.total ? (stats.females / stats.total) * 100 : 0}%` }} className="bg-pink-500"/>
                    </div>
                    <div className="flex justify-between text-[9px] font-bold text-zinc-500 uppercase tracking-wider">
                        <span><span className="text-blue-400">{stats.males}</span> Male</span>
                        <span><span className="text-pink-400">{stats.females}</span> Fem</span>
                    </div>
                </div>

                {/* 2. EXPERIENCE LEVEL */}
                <div className="bg-zinc-900 border border-white/5 rounded-3xl p-6 relative overflow-hidden group hover:border-white/10 transition-all">
                    <div className="absolute right-0 top-0 p-6 opacity-5 group-hover:opacity-10 transition-opacity text-amber-500"><Sparkles size={80}/></div>
                    <div className="text-[10px] font-black uppercase tracking-widest text-zinc-500 mb-1">Experience</div>
                    <div className="flex items-center gap-4">
                         <div className="text-4xl font-black text-white">{stats.exp.pro}</div>
                         <div className="text-xs text-purple-400 font-bold uppercase leading-tight">Veterans<br/>(6+ Shows)</div>
                    </div>

                    <div className="mt-4 flex gap-1 h-12 items-end">
                        {/* Green Bar */}
                        <div className="flex-1 flex flex-col justify-end gap-1 group/bar">
                            <span className="text-[9px] font-bold text-emerald-500 text-center opacity-0 group-hover/bar:opacity-100 transition-opacity">{stats.exp.green}</span>
                            <div className="w-full bg-emerald-500/20 border-t border-emerald-500 rounded-sm hover:bg-emerald-500 transition-all" style={{ height: stats.total ? `${(stats.exp.green / stats.total) * 100}%` : '0%' }}></div>
                            <span className="text-[8px] font-black text-zinc-600 text-center uppercase">Green</span>
                        </div>
                        {/* Journey Bar */}
                        <div className="flex-1 flex flex-col justify-end gap-1 group/bar">
                            <span className="text-[9px] font-bold text-amber-500 text-center opacity-0 group-hover/bar:opacity-100 transition-opacity">{stats.exp.journey}</span>
                            <div className="w-full bg-amber-500/20 border-t border-amber-500 rounded-sm hover:bg-amber-500 transition-all" style={{ height: stats.total ? `${(stats.exp.journey / stats.total) * 100}%` : '0%' }}></div>
                            <span className="text-[8px] font-black text-zinc-600 text-center uppercase">Mid</span>
                        </div>
                        {/* Pro Bar */}
                        <div className="flex-1 flex flex-col justify-end gap-1 group/bar">
                            <span className="text-[9px] font-bold text-purple-500 text-center opacity-0 group-hover/bar:opacity-100 transition-opacity">{stats.exp.pro}</span>
                            <div className="w-full bg-purple-500/20 border-t border-purple-500 rounded-sm hover:bg-purple-500 transition-all" style={{ height: stats.total ? `${(stats.exp.pro / stats.total) * 100}%` : '0%' }}></div>
                            <span className="text-[8px] font-black text-zinc-600 text-center uppercase">Pro</span>
                        </div>
                    </div>
                </div>

                {/* 3. AGE SPECS */}
                <div className="bg-zinc-900 border border-white/5 rounded-3xl p-6 relative overflow-hidden group hover:border-white/10 transition-all">
                    <div className="absolute right-0 top-0 p-6 opacity-5 group-hover:opacity-10 transition-opacity text-emerald-500"><GraduationCap size={80}/></div>
                    <div className="text-[10px] font-black uppercase tracking-widest text-zinc-500 mb-1">Avg Age</div>
                    <div className="text-4xl font-black text-white mb-2">{stats.avgAge}</div>
                    <div className="flex gap-2 mt-4">
                        <div className="bg-zinc-950 rounded-lg px-3 py-2 border border-white/5 flex-1">
                            <div className="text-[9px] text-zinc-500 font-bold uppercase">Youngest</div>
                            <div className="text-lg font-bold text-white">{stats.minAge}</div>
                        </div>
                        <div className="bg-zinc-950 rounded-lg px-3 py-2 border border-white/5 flex-1">
                            <div className="text-[9px] text-zinc-500 font-bold uppercase">Oldest</div>
                            <div className="text-lg font-bold text-white">{stats.maxAge}</div>
                        </div>
                    </div>
                </div>

                {/* 4. HEIGHT SPECS (UPDATED) */}
                <div className="bg-zinc-900 border border-white/5 rounded-3xl p-6 relative overflow-hidden group hover:border-white/10 transition-all">
                    <div className="absolute right-0 top-0 p-6 opacity-5 group-hover:opacity-10 transition-opacity text-pink-500"><Ruler size={80}/></div>
                    <div className="text-[10px] font-black uppercase tracking-widest text-zinc-500 mb-1">Avg Height</div>
                    
                    {/* 🚨 FIX: Display Feet/Inches String */}
                    <div className="text-4xl font-black text-white mb-2">{stats.avgHeightStr}</div>
                    
                    <p className="text-xs text-zinc-500 mt-2 leading-relaxed">
                        Data collected from {stats.total} cast members.
                    </p>
                </div>
            </div>

            {/* ROW 2: ASSETS & SCENES */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                
                {/* 1. ASSET GRID (Design Hub) */}
                <div className="lg:col-span-3">
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
                                const isImage = asset.type === 'Image' || (asset.link && asset.link.match(/\.(jpeg|jpg|gif|png)$/i));
                                return (
                                    <a key={asset.id} href={asset.link} target="_blank" className="group relative aspect-square bg-zinc-900 border border-white/10 rounded-2xl overflow-hidden hover:border-white/30 transition-all">
                                        {isImage ? <img src={asset.link} className="w-full h-full object-cover opacity-60 group-hover:opacity-100 transition-opacity" /> : <div className="w-full h-full flex items-center justify-center text-zinc-600 group-hover:text-white transition-colors bg-zinc-800/50"><Box size={32}/></div>}
                                        <div className="absolute inset-x-0 bottom-0 p-3 bg-gradient-to-t from-black/90 to-transparent">
                                            <p className="text-xs font-bold text-white truncate">{asset.name}</p>
                                            <p className="text-[9px] font-black text-zinc-400 uppercase">{asset.type}</p>
                                        </div>
                                    </a>
                                )
                            })}
                        </div>
                    )}
                </div>

                {/* 2. SCENE LIST */}
                <div className="lg:col-span-3 bg-zinc-900 border border-white/5 rounded-3xl p-6">
                    <div className="flex justify-between items-center mb-6">
                        <h3 className="text-sm font-black uppercase tracking-widest text-zinc-400 flex items-center gap-2">Show Structure</h3>
                        <span className="text-xs font-mono text-zinc-500 bg-zinc-950 border border-white/10 px-3 py-1 rounded-full">{scenes.length} Scenes</span>
                    </div>
                    <div className="grid grid-cols-2 gap-8">
                         {['Act 1', 'Act 2'].map(act => (
                            <div key={act}>
                                <h4 className="text-[10px] font-black uppercase text-zinc-500 mb-3 border-b border-white/10 pb-1">{act}</h4>
                                <div className="space-y-1">
                                    {scenes.filter((s:any) => {
                                        return s.act === act || (act === 'Act 1' && s.act === 'I') || (act === 'Act 2' && s.act === 'II');
                                    }).map((s:any) => (
                                        <div key={s.id} className="flex justify-between text-xs py-2 px-3 bg-zinc-950/50 border border-white/5 rounded-lg">
                                            <span className="font-bold text-zinc-300">{s.name}</span>
                                            <span className="text-[10px] font-black text-zinc-600 uppercase">{s.type}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                         ))}
                    </div>
                </div>
            </div>
        </div>
    )
}

// ============================================================================
// 2. PROGRESS TAB
// ============================================================================
function ProgressView({ scenes }: any) {
    const [progress, setProgress] = useState<Record<string, Record<string, number>>>(() => {
        const initial: any = {};
        scenes.forEach((s: any) => {
            initial[s.id] = {
                music: Math.random() > 0.5 ? 2 : 0, 
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
        if (val === 2) return 'bg-emerald-500 border-emerald-400 text-white shadow-[0_0_10px_rgba(16,185,129,0.4)]'; 
        if (val === 1) return 'bg-amber-500 border-amber-400 text-black'; 
        return 'bg-zinc-800 border-zinc-700 text-zinc-500 opacity-50'; 
    };

    // --- CALCULATE PACE METRICS ---
    const metrics = useMemo(() => {
        let totalUnits = 0;
        let completedUnits = 0;

        scenes.forEach((s: any) => {
            const type = s.type;
            const hasMusic = type === 'Song' || type === 'Mixed' || type === 'Dance';
            const hasDance = type === 'Dance' || type === 'Mixed';
            const hasBlock = true; 

            if (hasMusic) totalUnits++;
            if (hasDance) totalUnits++;
            if (hasBlock) totalUnits++;

            const p = progress[s.id];
            if (hasMusic && p?.music === 2) completedUnits++;
            if (hasDance && p?.dance === 2) completedUnits++;
            if (hasBlock && p?.block === 2) completedUnits++;
        });

        const percentComplete = totalUnits > 0 ? Math.round((completedUnits / totalUnits) * 100) : 0;
        
        const velocity = completedUnits / (CURRENT_WEEK || 1); 
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
                        <div className="absolute left-0 top-0 bottom-0 bg-blue-600/20 rounded-l-xl transition-all duration-1000" style={{ width: `${(CURRENT_WEEK / WEEKS_TOTAL) * 100}%` }}></div>
                        <div className="w-full flex justify-between text-[10px] font-black uppercase text-zinc-500 relative z-20">
                            <span>Start</span>
                            <span className={CURRENT_WEEK >= 4 ? "text-white" : ""}>Wk 4 (Now)</span>
                            <span>Wk 8 (Goal)</span>
                            <span>Wk 10 (Show)</span>
                        </div>
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

            {/* 2. THE MATRIX */}
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
                                const type = s.type;
                                const hasMusic = type === 'Song' || type === 'Mixed' || type === 'Dance';
                                const hasDance = type === 'Dance' || type === 'Mixed';
                                const p = progress[s.id] || { music: 0, dance: 0, block: 0 };
                                const isReady = (!hasMusic || p.music === 2) && (!hasDance || p.dance === 2) && (p.block === 2);

                                return (
                                    <tr key={s.id} className="hover:bg-white/5 transition-colors group">
                                        <td className="px-6 py-4 font-mono text-zinc-600">{i + 1}</td>
                                        <td className="px-6 py-4 font-bold text-zinc-300">
                                            {s.name}
                                            <span className="ml-2 text-[9px] font-normal text-zinc-600 border border-zinc-800 px-1.5 py-0.5 rounded uppercase">{type}</span>
                                        </td>
                                        
                                        <td className="px-6 py-4 text-center">
                                            {hasMusic ? (
                                                <button onClick={() => toggleStatus(s.id, 'music')} className={`w-full py-1.5 rounded text-[10px] font-black uppercase transition-all ${getStatusColor(p.music)}`}>
                                                    {p.music === 2 ? "Done" : p.music === 1 ? "Draft" : "-"}
                                                </button>
                                            ) : <span className="text-zinc-800 text-xs">-</span>}
                                        </td>

                                        <td className="px-6 py-4 text-center">
                                            {hasDance ? (
                                                <button onClick={() => toggleStatus(s.id, 'dance')} className={`w-full py-1.5 rounded text-[10px] font-black uppercase transition-all ${getStatusColor(p.dance)}`}>
                                                    {p.dance === 2 ? "Done" : p.dance === 1 ? "Draft" : "-"}
                                                </button>
                                            ) : <span className="text-zinc-800 text-xs">-</span>}
                                        </td>

                                        <td className="px-6 py-4 text-center">
                                            <button onClick={() => toggleStatus(s.id, 'block')} className={`w-full py-1.5 rounded text-[10px] font-black uppercase transition-all ${getStatusColor(p.block)}`}>
                                                {p.block === 2 ? "Done" : p.block === 1 ? "Draft" : "-"}
                                            </button>
                                        </td>

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