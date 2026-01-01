/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { User, AlertTriangle, CheckCircle2, AlertOctagon, Layers, Zap, X } from "lucide-react";

interface Props {
  actor: any;
  allScenes: any[]; 
  stats: {
    sceneCount: number;
    hasAct1: boolean;
    hasAct2: boolean;
    assignments: Record<number, string>; 
    assignedRoleNames: string[];
  };
  onClose: () => void; // NEW PROP
}

export default function CastingInspector({ actor, allScenes, stats, onClose }: Props) {
  
  const safeString = (val: any): string => {
    if (val === null || val === undefined) return "";
    if (typeof val === 'string') return val;
    if (typeof val === 'number') return String(val);
    if (Array.isArray(val)) return val.length > 0 ? safeString(val[0].value || val[0]) : "";
    if (typeof val === 'object') return val.value ? safeString(val.value) : "";
    return String(val);
  };

  if (!actor) {
    return (
      <aside className="bg-zinc-950 p-8 border-l border-white/5 flex flex-col items-center justify-center text-center h-full relative">
        <button 
            onClick={onClose}
            className="absolute top-4 right-4 p-2 text-zinc-600 hover:text-zinc-400 hover:bg-zinc-900 rounded-lg transition-colors"
        >
            <X size={16} />
        </button>
        <div className="w-16 h-16 bg-zinc-900 rounded-full flex items-center justify-center mb-4">
            <User size={24} className="text-zinc-600" />
        </div>
        <h2 className="text-xs font-black uppercase tracking-wider text-zinc-500">Inspector Idle</h2>
        <p className="text-[10px] text-zinc-600 mt-2 max-w-[150px]">Select an actor to view timeline and quick changes.</p>
      </aside>
    );
  }

  // ... (Keep existing Violation logic and renderTimeline helper exactly the same) ...
  // VIOLATIONS
  const violations = [];
  if (stats.sceneCount < 3) violations.push({ level: 'error', msg: `Underutilized: Only in ${stats.sceneCount} scenes (Min 3).` });
  if (!stats.hasAct1) violations.push({ level: 'warn', msg: "Missing from Act 1." });
  if (!stats.hasAct2) violations.push({ level: 'warn', msg: "Missing from Act 2." });

  const act1Scenes = allScenes.filter(s => safeString(s.Act).includes('1'));
  const act2Scenes = allScenes.filter(s => safeString(s.Act).includes('2'));

  const headshotUrl = actor.Headshot && actor.Headshot[0]?.url 
    ? actor.Headshot[0].url 
    : "https://cdn.pixabay.com/photo/2015/10/05/22/37/blank-profile-picture-973460_1280.png";

  // --- TIMELINE RENDERER ---
  const renderTimeline = (scenes: any[]) => {
    return (
        <div className="grid grid-cols-4 gap-2">
            {scenes.map((scene, index) => {
                const roleInScene = stats.assignments[scene.id];
                const isAssigned = !!roleInScene;
                
                // Quick Change Logic
                const prevScene = scenes[index - 1];
                const roleInPrevScene = prevScene ? stats.assignments[prevScene.id] : null;
                const isQuickChange = isAssigned && roleInPrevScene && (roleInScene !== roleInPrevScene);

                return (
                    <div key={scene.id} className="relative group">
                        {isQuickChange && (
                            <div className="absolute -left-3 top-1/2 -translate-y-1/2 w-4 h-1 bg-red-500 z-20"></div>
                        )}
                        <div 
                            className={`
                                h-14 rounded-lg border flex flex-col items-center justify-center p-1 text-center relative transition-all overflow-hidden
                                ${isAssigned 
                                    ? 'bg-zinc-800 border-white/20 shadow-lg' 
                                    : 'bg-zinc-900 border-white/10' 
                                }
                                ${isQuickChange ? 'ring-1 ring-red-500' : ''}
                            `}
                        >
                            <span className={`text-[8px] font-bold mb-1 leading-none absolute top-1 left-1 ${isAssigned ? 'text-zinc-500' : 'text-zinc-600'}`}>
                                {index + 1}
                            </span>
                            {isAssigned ? (
                                <>
                                    <div className={`w-1.5 h-1.5 rounded-full mb-1 ${isQuickChange ? 'bg-red-500 animate-pulse' : 'bg-blue-500'}`}></div>
                                    <span className="text-[7px] font-bold text-white uppercase tracking-tighter leading-none w-full break-words px-0.5">
                                        {roleInScene}
                                    </span>
                                </>
                            ) : (
                                <div className="w-1.5 h-1.5 rounded-full bg-zinc-700"></div> 
                            )}
                            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-32 hidden group-hover:block bg-black border border-white/10 p-2 rounded z-50 pointer-events-none shadow-xl">
                                <p className="text-[9px] font-bold text-white">{safeString(scene["Scene Name"])}</p>
                                {isAssigned ? <p className="text-[9px] text-blue-400 mt-1">Role: {roleInScene}</p> : <p className="text-[9px] text-zinc-500 italic mt-1">Not in scene</p>}
                                {isQuickChange && (
                                    <div className="mt-2 pt-2 border-t border-white/10">
                                        <p className="text-[9px] text-red-500 font-bold flex items-center gap-1"><Zap size={10} /> Quick Change!</p>
                                        <p className="text-[8px] text-zinc-400">Switching from <span className="text-white">{roleInPrevScene}</span></p>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                );
            })}
        </div>
    );
  };

  return (
    <aside className="bg-zinc-950 flex flex-col h-full border-l border-white/5 overflow-hidden relative">
        {/* CLOSE BUTTON */}
        <button 
            onClick={onClose}
            className="absolute top-4 right-4 z-50 p-2 bg-zinc-950/80 text-zinc-500 hover:text-white hover:bg-zinc-800 rounded-lg border border-white/5 transition-all shadow-sm"
        >
            <X size={14} />
        </button>

        <header className="p-6 border-b border-white/5 bg-zinc-900/20 pr-12"> {/* Added padding-right to avoid overlap with close button */}
            <div className="flex items-center gap-4 mb-4">
                <img src={headshotUrl} className="w-16 h-16 rounded-2xl object-cover border-2 border-white/10 shadow-lg" />
                <div>
                    <h2 className="text-lg font-black italic text-white leading-none mb-2">{safeString(actor.Performer)}</h2>
                    <div className="flex flex-wrap gap-1">
                        {stats.assignedRoleNames && stats.assignedRoleNames.length > 0 ? (
                            stats.assignedRoleNames.map(r => (
                                <span key={r} className="text-[9px] font-bold uppercase bg-blue-500/10 text-blue-400 border border-blue-500/20 px-1.5 py-0.5 rounded">{r}</span>
                            ))
                        ) : (
                            <span className="text-[9px] text-zinc-600 italic">Uncast</span>
                        )}
                    </div>
                </div>
            </div>
            
            <div className="grid grid-cols-3 gap-2">
                {/* Stats boxes (same as before) */}
                <div className={`p-2 rounded-lg text-center border ${stats.sceneCount >= 3 ? 'bg-emerald-500/10 border-emerald-500/30' : 'bg-red-500/10 border-red-500/30'}`}>
                    <p className="text-[9px] font-black uppercase opacity-60">Scenes</p>
                    <p className={`text-xl font-black ${stats.sceneCount >= 3 ? 'text-emerald-400' : 'text-red-400'}`}>{stats.sceneCount}</p>
                </div>
                <div className={`p-2 rounded-lg text-center border ${stats.hasAct1 ? 'bg-blue-500/10 border-blue-500/30' : 'bg-zinc-800 border-white/5'}`}>
                    <p className="text-[9px] font-black uppercase opacity-60">Act 1</p>
                    <Layers size={16} className={`mx-auto mt-1 ${stats.hasAct1 ? 'text-blue-400' : 'text-zinc-600'}`} />
                </div>
                <div className={`p-2 rounded-lg text-center border ${stats.hasAct2 ? 'bg-purple-500/10 border-purple-500/30' : 'bg-zinc-800 border-white/5'}`}>
                    <p className="text-[9px] font-black uppercase opacity-60">Act 2</p>
                    <Layers size={16} className={`mx-auto mt-1 ${stats.hasAct2 ? 'text-purple-400' : 'text-zinc-600'}`} />
                </div>
            </div>
        </header>

        <div className="flex-1 overflow-y-auto p-6 space-y-8 custom-scrollbar">
            {violations.length > 0 && (
                <section className="space-y-2">
                     <h3 className="text-[10px] font-black uppercase tracking-widest text-zinc-500 mb-2 flex items-center gap-2">
                        <AlertTriangle size={12} className="text-amber-500" /> Alerts
                    </h3>
                    {violations.map((v, i) => (
                        <div key={i} className={`p-3 border rounded-xl flex gap-3 ${v.level === 'error' ? 'bg-red-900/10 border-red-500/30' : 'bg-amber-900/10 border-amber-500/30'}`}>
                            <AlertOctagon size={16} className={v.level === 'error' ? 'text-red-500' : 'text-amber-500'} />
                            <p className={`text-xs font-bold ${v.level === 'error' ? 'text-red-300' : 'text-amber-300'}`}>{v.msg}</p>
                        </div>
                    ))}
                </section>
            )}

            <section>
                <div className="flex items-center gap-4 mb-4">
                     <h3 className="text-[10px] font-black uppercase tracking-widest text-blue-400">Act 1</h3>
                     <div className="h-px flex-1 bg-blue-500/20"></div>
                </div>
                {renderTimeline(act1Scenes)}
            </section>

             <section>
                <div className="flex items-center gap-4 mb-4">
                     <h3 className="text-[10px] font-black uppercase tracking-widest text-purple-400">Act 2</h3>
                     <div className="h-px flex-1 bg-purple-500/20"></div>
                </div>
                {renderTimeline(act2Scenes)}
            </section>
        </div>
    </aside>
  );
}