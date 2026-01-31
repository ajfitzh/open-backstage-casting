/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useState } from "react";
import { Users, Filter, X, Check, Ruler, Scale, AlertOctagon } from "lucide-react";

// --- 🛠️ UTILITIES ---
const safeVal = (val: any, fallback: string | number = "-") => {
  if (val === undefined || val === null) return fallback;
  if (Array.isArray(val)) return val[0]?.value ?? val[0] ?? fallback;
  if (typeof val === "object") return val.value ?? val.id ?? fallback;
  return val;
};
// 🛡️ REFACTORED HELPERS
const getSceneName = (scene: any) => {
  const val = scene.name || scene["Scene Name"];
  return typeof val === 'object' ? val.value : (val || "Untitled Scene");
};

const getSceneType = (scene: any) => {
  const val = scene.type || scene["Scene Type"];
  // If Baserow returns a Select object, grab the .value
  return typeof val === 'object' ? val.value : (val || "Scene");
};

const getSceneAct = (scene: any) => {
  const val = scene.act || scene.Act;
  return typeof val === 'object' ? val.value : (val || "");
};
// --- 📊 METRICS CONFIGURATION ---
// 🚨 REFACTORED: Now uses lowercase clean keys from your baserow.ts getAuditionees()
const METRICS = [
  { 
    label: "Vocal", 
    getValue: (a: any) => a.vocalScore, // matched to F.VOCAL_SCORE
    format: (v: any) => (
      <span className={`px-2 py-1 rounded font-mono text-xs ${v >= 4 ? 'bg-emerald-500/20 text-emerald-400' : v >= 3 ? 'bg-blue-500/20 text-blue-400' : 'text-zinc-500'}`}>
        {Number(v || 0).toFixed(1)}
      </span>
    )
  },
  { 
    label: "Acting", 
    getValue: (a: any) => a.actingScore, // matched to F.ACTING_SCORE
    format: (v: any) => (
      <span className={`px-2 py-1 rounded font-mono text-xs ${v >= 4 ? 'bg-purple-500/20 text-purple-400' : v >= 3 ? 'bg-blue-500/20 text-blue-400' : 'text-zinc-500'}`}>
        {Number(v || 0).toFixed(1)}
      </span>
    )
  },
  { 
    label: "Height", 
    getValue: (a: any) => a.height || "-", 
    format: (v: any) => <div className="flex justify-center items-center gap-1 font-mono text-zinc-400 text-xs"><Ruler size={10} className="opacity-50" /> {v}</div> 
  },
  { 
    label: "Age", 
    getValue: (a: any) => a.age || "?", 
    format: (v: any) => <span className="text-zinc-400 text-xs">{v}</span> 
  }
];

// --- 🧩 SUB-COMPONENT: The Role Card ---
function RoleComparisonCard({ 
  role, 
  onDropActor, 
  onRemoveActor, 
  onConfirmRole 
}: { 
  role: any; 
  onDropActor: (e: React.DragEvent, id: string) => void;
  onRemoveActor: (roleId: string, actorId: number) => void;
  onConfirmRole: (roleId: string, actorId: number) => void;
}) {
  
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  };

  return (
    <div 
      onDragOver={handleDragOver}
      onDrop={(e) => onDropActor(e, String(role.id))}
      className="group relative"
    >
      {/* ROLE HEADER */}
      <div className="flex items-center gap-3 mb-4 pl-2 border-l-2 border-purple-500/50">
         <h2 className="text-xl font-black uppercase text-white tracking-tighter italic">{role.name}</h2>
         <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-zinc-800 text-zinc-400 border border-white/5">{role.type || "Role"}</span>
         <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-zinc-800 text-zinc-500 border border-white/5">{role.actors?.length || 0} Candidates</span>
      </div>

      {/* TABLE CONTAINER */}
      <div className={`rounded-xl border border-white/5 bg-zinc-900/20 overflow-hidden transition-all ${(!role.actors || role.actors.length === 0) ? 'border-dashed border-zinc-800 h-32 flex items-center justify-center' : ''}`}>
        
        {(!role.actors || role.actors.length === 0) ? (
             <div className="text-zinc-600 flex items-center gap-2">
                <Users size={20} />
                <span className="text-xs font-bold uppercase tracking-wider">Drag candidates here</span>
             </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr>
                  <th className="p-4 w-24 md:w-32 bg-zinc-900/50 border-b border-r border-white/5 text-[10px] font-black uppercase text-zinc-500 tracking-wider text-right align-bottom sticky left-0 z-10 backdrop-blur-sm">
                    Candidate
                  </th>
                  
                  {role.actors.map((actor: any) => {
                    const isSelected = role.selectedActorIds?.includes(actor.id);
                    return (
                      <th key={actor.id} className={`p-4 border-b border-r border-white/5 min-w-[140px] w-[160px] relative group/col ${isSelected ? 'bg-purple-900/10' : ''}`}>
                         <div className={`relative aspect-[3/4] rounded-lg overflow-hidden border shadow-lg mb-2 transition-all ${isSelected ? 'border-purple-500 ring-2 ring-purple-500/50' : 'border-white/10'}`}>
                            {/* 🚨 FIX: Using actor.headshot */}
                            <img 
                                title={actor.name} 
                                src={actor.headshot || "https://placehold.co/400x600/111/444?text=No+Img"} 
                                className="w-full h-full object-cover" 
                                alt=""
                            />
                            
                            <button onClick={() => onRemoveActor(String(role.id), actor.id)} className="absolute top-1 right-1 p-1.5 bg-black/60 text-zinc-400 hover:text-red-400 rounded-full opacity-0 group-hover/col:opacity-100 transition-opacity z-20">
                                <X size={14} />
                            </button>
                            
                            <div className={`absolute inset-x-0 bottom-0 p-2 flex justify-center bg-gradient-to-t from-black/90 to-transparent transition-opacity ${isSelected ? 'opacity-100' : 'opacity-0 group-hover/col:opacity-100'}`}>
                                <button onClick={() => onConfirmRole(String(role.id), actor.id)} className={`rounded-full shadow-xl flex items-center justify-center gap-1 px-3 py-1.5 transition-all text-xs font-bold ${isSelected ? 'bg-purple-600 text-white' : 'bg-white text-black hover:bg-emerald-400'}`}>
                                    {isSelected ? <><Check size={12} /> CAST</> : "SELECT"}
                                </button>
                            </div>
                         </div>
                         
                         <div className="text-center px-1">
                            {/* 🚨 FIX: Using actor.name */}
                            <p className={`text-sm font-black leading-tight line-clamp-2 ${isSelected ? 'text-purple-300' : 'text-white'}`}>
                                {actor.name || "Unknown"} 
                            </p>
                         </div>
                      </th>
                    )})}
                  <th className="p-4 border-b border-white/5 min-w-[50px] bg-zinc-900/30 border-dashed border-l border-white/10"></th>
                </tr>
              </thead>
              <tbody className="text-xs font-bold text-zinc-300">
                  {METRICS.map((metric, i) => (
                      <tr key={i} className="hover:bg-zinc-800/30 transition-colors">
                          <td className="p-3 border-b border-r border-white/5 text-right text-zinc-500 uppercase text-[10px] sticky left-0 bg-zinc-900/90 backdrop-blur-sm z-10">
                            {metric.label}
                          </td>
                          {role.actors.map((actor: any) => (
                              <td key={actor.id} className="p-3 border-b border-r border-white/5 text-center">
                                  {metric.format(metric.getValue(actor))}
                              </td>
                          ))}
                          <td className="border-b border-white/5 bg-zinc-900/30 border-l border-dashed border-white/10"></td>
                      </tr>
                  ))}
                  
                  <tr className="bg-red-900/5">
                      <td className="p-3 border-r border-white/5 text-right text-red-500/70 font-black uppercase text-[10px] align-top pt-4 sticky left-0 bg-zinc-900/90 backdrop-blur-sm z-10">
                        Conflicts
                      </td>
                      {role.actors.map((actor: any) => {
                          const conflictStr = actor.conflicts || "";
                          const conflicts = typeof conflictStr === 'string' 
                            ? conflictStr.split(',').filter((c: string) => c && !c.includes("No known")) 
                            : [];

                          return (
                              <td key={actor.id} className="p-3 border-r border-white/5 text-center align-top">
                                  {conflicts.length > 0 ? (
                                      <div className="flex flex-col gap-1 items-center">
                                          {conflicts.slice(0, 3).map((c: string, i: number) => (
                                              <div key={i} className="flex items-center gap-1 text-[9px] bg-red-500/10 text-red-400 border border-red-500/20 px-1.5 py-0.5 rounded w-fit max-w-[140px] truncate">
                                                  <AlertOctagon size={8} className="shrink-0" /> {c}
                                              </div>
                                          ))}
                                          {conflicts.length > 3 && <span className="text-[9px] text-red-500/50">+{conflicts.length - 3} more</span>}
                                      </div>
                                  ) : <span className="text-[10px] text-emerald-500/50 flex items-center justify-center gap-1"><Check size={10}/> Clear</span>}
                              </td>
                          )
                      })}
                      <td className="bg-zinc-900/30 border-l border-dashed border-white/10"></td>
                  </tr>
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

// --- 🚀 MAIN COMPONENT ---
// (Remains largely the same, but ensure props match CastingClient)
export default function ChemistryWorkspace({ roles = [], onDropActor, onRemoveActor, onConfirmRole }: Props) {
  const [activeFilter, setActiveFilter] = useState("Lead");

  const visibleRoles = roles.filter(r => 
    activeFilter === "All" || (r.type && String(r.type).includes(activeFilter))
  );

  return (
    <div className="h-full flex flex-col bg-zinc-950 relative overflow-hidden">
      <header className="p-4 border-b border-white/5 bg-zinc-900/50 flex flex-col md:flex-row justify-between items-center gap-4 shrink-0 backdrop-blur-md z-30">
         <div className="flex items-center gap-4 w-full md:w-auto justify-between md:justify-start">
            <h1 className="text-xl font-black italic uppercase flex items-center gap-2 text-white">
                <Scale className="text-purple-500" /> Head-to-Head
            </h1>
            
            <div className="flex bg-zinc-900 p-1 rounded-lg border border-white/5 overflow-x-auto max-w-[200px] md:max-w-none scrollbar-hide">
                {["Lead", "Supporting", "Featured", "Ensemble", "All"].map(filter => (
                    <button
                        key={filter}
                        onClick={() => setActiveFilter(filter)}
                        className={`px-3 py-1 text-[10px] font-bold uppercase rounded transition-all whitespace-nowrap ${activeFilter === filter ? 'bg-purple-600 text-white shadow-lg' : 'text-zinc-500 hover:text-zinc-300'}`}
                    >
                        {filter}
                    </button>
                ))}
            </div>
         </div>
      </header>

      <div className="flex-1 overflow-x-auto overflow-y-auto p-4 md:p-8 custom-scrollbar bg-zinc-950 space-y-12 pb-24 md:pb-8">
            {visibleRoles.length === 0 && (
                <div className="w-full h-full flex flex-col items-center justify-center text-zinc-600 opacity-50 min-h-[300px]">
                    <Filter size={48} className="mb-4" />
                    <p>No roles match this filter.</p>
                </div>
            )}

            {visibleRoles.map(role => (
               <RoleComparisonCard 
                  key={role.id}
                  role={role}
                  onDropActor={onDropActor}
                  onRemoveActor={onRemoveActor}
                  onConfirmRole={onConfirmRole}
               />
            ))}
      </div>
    </div>
  );
}