"use client";

import React, { useMemo, useState } from 'react';
import { 
    Theater, Users, Shirt, Hammer, Image as ImageIcon, 
    Video, FileText, BarChart3, Palette, Box, Layers,
    ArrowUpRight, Download, Filter, AlertTriangle
} from 'lucide-react';

export default function ProductionClient({ show, assignments, auditionees, scenes, assets }: any) {
    const [assetFilter, setAssetFilter] = useState("All");

    // --- 📊 1. DEMOGRAPHICS ENGINE (FIXED) ---
    const demographics = useMemo(() => {
        // Source of Truth: The Assignments Table
        const uniqueCastIds = new Set(
            assignments
                .map((a:any) => a.Person?.[0]?.id)
                .filter((id: any) => !!id)
        );
        
        const total = uniqueCastIds.size; // Real count from assignments

        // Demographics from Auditions Table (if available)
        // We match the IDs from Assignments to the Audition profiles
        const castProfiles = auditionees.filter((a:any) => uniqueCastIds.has(a.id));
        
        const males = castProfiles.filter((c:any) => c.Gender?.value === 'Male').length;
        const females = castProfiles.filter((c:any) => c.Gender?.value === 'Female').length;
        
        // Handle "Unknown" if audition data is missing
        const unknown = total - (males + females);

        return { total, males, females, unknown, castList: castProfiles };
    }, [assignments, auditionees]);

    // --- ⚖️ WORKLOAD ENGINE (FIXED) ---
    const workload = useMemo(() => {
        const counts: Record<string, number> = {};
        assignments.forEach((a:any) => {
            const name = a.Person?.[0]?.value || "Unknown Actor";
            if (name !== "Unknown Actor") {
                counts[name] = (counts[name] || 0) + 1;
            }
        });

        // Sort by assignment count
        const sorted = Object.entries(counts)
            .sort(([,a], [,b]) => b - a)
            .slice(0, 5);
            
        const totalAssignments = assignments.length;
        // Avoid division by zero
        const avgRoles = demographics.total > 0 
            ? (totalAssignments / demographics.total).toFixed(1) 
            : "0.0";

        return { topHeavy: sorted, avgRoles, totalAssignments };
    }, [assignments, demographics.total]);

    // --- 🎨 ASSET ENGINE ---
    const filteredAssets = useMemo(() => {
        if (!assets) return [];
        if (assetFilter === "All") return assets;
        return assets.filter((a:any) => a.Type?.value === assetFilter);
    }, [assets, assetFilter]);

    // --- 🎬 SCENE ENGINE (FIXED) ---
    const sceneStats = useMemo(() => {
        if (!scenes) return { count: 0, cues: 0 };
        
        // Fix: Force Number() to prevent string concatenation ("02" + "08" = "0208")
        const cues = scenes.reduce((acc: number, s: any) => {
            const val = s["Minimum Performers"];
            // Handle various Baserow number formats (string, number, or null)
            const num = parseFloat(val) || 0; 
            return acc + num;
        }, 0);

        return { count: scenes.length, cues };
    }, [scenes]);

    return (
        <div className="flex flex-col h-full bg-zinc-950 text-white font-sans overflow-y-auto custom-scrollbar">
            
            {/* HEADER */}
            <header className="p-8 border-b border-white/10 bg-zinc-900/50 backdrop-blur-md sticky top-0 z-20">
                <div className="flex items-center gap-4 mb-2">
                    <div className="p-3 bg-purple-500/10 rounded-xl border border-purple-500/20 text-purple-400">
                        <Theater size={24} />
                    </div>
                    <div>
                        <div className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500">Creative Control</div>
                        <h1 className="text-2xl font-black italic uppercase tracking-tighter text-white">{show.Title}</h1>
                    </div>
                </div>
            </header>

            <div className="p-8 space-y-8">

                {/* ROW 1: CAST METRICS */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    
                    {/* Card 1: Total Cast */}
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

                    {/* Card 2: Role Density */}
                    <div className="bg-zinc-900 border border-white/5 rounded-3xl p-6 relative overflow-hidden group">
                        <div className="absolute right-0 top-0 p-6 opacity-10 group-hover:opacity-20 transition-opacity text-emerald-500"><Layers size={64}/></div>
                        <div className="text-[10px] font-black uppercase tracking-widest text-zinc-500 mb-1">Workload</div>
                        <div className="text-4xl font-black text-white mb-2">{workload.avgRoles}</div>
                        <div className="text-xs font-bold text-emerald-500">Avg Roles / Kid</div>
                    </div>

                    {/* Card 3: "Heavy Lifters" */}
                    <div className="bg-zinc-900 border border-white/5 rounded-3xl p-5 col-span-2 flex flex-col justify-center relative overflow-hidden">
                        <div className="flex justify-between items-end mb-3 relative z-10">
                            <h3 className="text-xs font-black uppercase tracking-widest text-zinc-500 flex items-center gap-2">
                                <BarChart3 size={14} className="text-amber-500"/> Heaviest Workloads
                            </h3>
                            <span className="text-[9px] text-zinc-600 uppercase font-bold">Total Assignments: {workload.totalAssignments}</span>
                        </div>
                        <div className="grid grid-cols-2 md:grid-cols-5 gap-2 relative z-10">
                            {workload.topHeavy.map(([name, count], i) => (
                                <div key={i} className="bg-black/40 border border-white/5 rounded-lg p-2 flex flex-col items-center text-center hover:bg-white/5 transition-colors">
                                    <span className="text-lg font-black text-white leading-none">{count}</span>
                                    <span className="text-[9px] font-bold text-zinc-400 uppercase truncate w-full" title={name}>{name.split(' ')[0]}</span>
                                </div>
                            ))}
                            {workload.topHeavy.length === 0 && <div className="text-zinc-500 text-xs italic col-span-5 text-center">No assignments yet.</div>}
                        </div>
                    </div>
                </div>

                {/* ROW 2: VISUAL ASSETS */}
                <div>
                    <div className="flex justify-between items-end mb-4">
                        <h2 className="text-xl font-black uppercase italic tracking-tighter text-white flex items-center gap-2">
                            <Palette size={20} className="text-pink-500"/> Design Hub
                        </h2>
                        
                        <div className="flex bg-zinc-900 p-1 rounded-lg border border-white/5">
                            {['All', 'Image', 'PDF', 'Audio'].map(type => (
                                <button 
                                    key={type} 
                                    onClick={() => setAssetFilter(type)}
                                    className={`px-4 py-1.5 rounded-md text-[10px] font-black uppercase transition-all ${assetFilter === type ? 'bg-zinc-700 text-white shadow' : 'text-zinc-500 hover:text-white'}`}
                                >
                                    {type}
                                </button>
                            ))}
                        </div>
                    </div>

                    {filteredAssets.length === 0 ? (
                         <div className="w-full h-48 border-2 border-dashed border-zinc-800 rounded-3xl flex flex-col items-center justify-center text-zinc-600 gap-2">
                            <Box size={32} className="opacity-20"/>
                            <p className="text-sm font-bold uppercase">No Design Assets Uploaded</p>
                            <p className="text-[10px] text-zinc-500">Upload via the Library in Casting to see them here.</p>
                         </div>
                    ) : (
                        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
                            {filteredAssets.map((asset: any) => {
                                const type = asset.Type?.value || "File";
                                const isImage = type === 'Image' || asset.Link.match(/\.(jpeg|jpg|gif|png)$/i);
                                return (
                                    <a 
                                        key={asset.id} 
                                        href={asset.Link} 
                                        target="_blank" 
                                        className="group relative aspect-square bg-zinc-900 border border-white/10 rounded-2xl overflow-hidden hover:border-white/30 transition-all shadow-lg"
                                    >
                                        {isImage ? (
                                            <img src={asset.Link} className="w-full h-full object-cover opacity-60 group-hover:opacity-100 transition-opacity" />
                                        ) : (
                                            <div className="w-full h-full flex items-center justify-center text-zinc-600 group-hover:text-white transition-colors bg-zinc-800/50">
                                                {type === 'PDF' ? <FileText size={32}/> : type === 'Audio' ? <Video size={32}/> : <Box size={32}/>}
                                            </div>
                                        )}
                                        
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

                {/* ROW 3: SCENE BREAKDOWN (FIXED MATH) */}
                <div className="bg-zinc-900 border border-white/5 rounded-3xl p-6">
                    <div className="flex justify-between items-center mb-6">
                        <h3 className="text-sm font-black uppercase tracking-widest text-zinc-400 flex items-center gap-2">
                             Show Structure
                        </h3>
                        <span className="text-xs font-mono text-zinc-500 bg-zinc-950 border border-white/10 px-3 py-1 rounded-full">
                            {sceneStats.count} Scenes <span className="text-zinc-700">/</span> {sceneStats.cues} Total Cues
                        </span>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        {/* Act 1 */}
                        <div>
                            <h4 className="text-[10px] font-black uppercase text-blue-500 mb-3 border-b border-blue-500/20 pb-1 flex justify-between">
                                <span>Act 1</span>
                                <span>Type</span>
                            </h4>
                            <div className="space-y-1">
                                {scenes.filter((s:any) => s.Act?.value === 'Act 1').map((s:any) => (
                                    <div key={s.id} className="flex justify-between text-xs py-2 px-3 bg-zinc-950/50 border border-white/5 hover:border-white/10 rounded-lg transition-colors">
                                        <span className="font-bold text-zinc-300 truncate pr-4">{s["Scene Name"]}</span>
                                        <span className="text-[10px] font-black text-zinc-600 uppercase tracking-wider whitespace-nowrap">{s["Scene Type"]?.value || "Scene"}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                         {/* Act 2 */}
                         <div>
                            <h4 className="text-[10px] font-black uppercase text-purple-500 mb-3 border-b border-purple-500/20 pb-1 flex justify-between">
                                <span>Act 2</span>
                                <span>Type</span>
                            </h4>
                            <div className="space-y-1">
                                {scenes.filter((s:any) => s.Act?.value === 'Act 2').map((s:any) => (
                                    <div key={s.id} className="flex justify-between text-xs py-2 px-3 bg-zinc-950/50 border border-white/5 hover:border-white/10 rounded-lg transition-colors">
                                        <span className="font-bold text-zinc-300 truncate pr-4">{s["Scene Name"]}</span>
                                        <span className="text-[10px] font-black text-zinc-600 uppercase tracking-wider whitespace-nowrap">{s["Scene Type"]?.value || "Scene"}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>

            </div>
        </div>
    );
}