/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import React, { useState } from "react";
import { 
  Users, Filter, X, Check, Ruler, Scale, AlertOctagon, Crown 
} from "lucide-react";

// ============================================================================
// 1. CONFIGURATION & TYPES
// ============================================================================

const METRICS = [
  { 
    label: "Vocal", 
    getValue: (a: any) => a.vocalScore, 
    format: (v: any) => (
      <span className={`px-2 py-1 rounded font-mono text-xs ${v >= 4 ? 'bg-emerald-500/20 text-emerald-400' : v >= 3 ? 'bg-blue-500/20 text-blue-400' : 'text-zinc-600'}`}>
        {Number(v || 0).toFixed(1)}
      </span>
    )
  },
  { 
    label: "Acting", 
    getValue: (a: any) => a.actingScore, 
    format: (v: any) => (
      <span className={`px-2 py-1 rounded font-mono text-xs ${v >= 4 ? 'bg-purple-500/20 text-purple-400' : v >= 3 ? 'bg-blue-500/20 text-blue-400' : 'text-zinc-600'}`}>
        {Number(v || 0).toFixed(1)}
      </span>
    )
  },
  { 
    label: "Height", 
    getValue: (a: any) => a.height, 
    format: (v: any) => (
      <div className="flex justify-center items-center gap-1 font-mono text-zinc-400 text-xs">
        <Ruler size={10} className="opacity-50" /> {v || "-"}
      </div>
    )
  },
  { 
    label: "Age", 
    getValue: (a: any) => a.age, 
    format: (v: any) => <span className="text-zinc-500 text-xs">{v || "?"}</span> 
  }
];

interface ChemistryProps {
  roles: any[];
  onRemoveActor: (roleId: number, actorId: number) => void;
  onPromoteActor: (roleId: number, actorId: number) => void;
  onDropActor: (e: React.DragEvent, roleIdStr: string) => void;
}

// ============================================================================
// 2. SUB-COMPONENT: COMPARISON CARD
// ============================================================================

function RoleComparisonCard({ 
  role, 
  onDropActor, 
  onRemoveActor, 
  onPromoteActor 
}: { 
  role: any; 
  onDropActor: (e: React.DragEvent, id: string) => void;
  onRemoveActor: (roleId: number, actorId: number) => void;
  onPromoteActor: (roleId: number, actorId: number) => void;
}) {
  
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  };

  const hasCandidates = role.actors && role.actors.length > 0;

  return (
    <div 
      onDragOver={handleDragOver}
      onDrop={(e) => onDropActor(e, String(role.id))}
      className="group relative"
    >
      {/* HEADER */}
      <div className="flex items-center gap-3 mb-4 pl-2 border-l-2 border-purple-500/50">
         <h2 className="text-xl font-black uppercase text-white tracking-tighter italic">{role.name}</h2>
         <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-zinc-800 text-zinc-400 border border-white/5">{role.type || "Role"}</span>
         <span className={`text-[10px] font-bold px-2 py-0.5 rounded border border-white/5 ${hasCandidates ? 'bg-purple-500/20 text-purple-300' : 'bg-zinc-800 text-zinc-500'}`}>
            {role.actors?.length || 0} Candidates
         </span>
      </div>

      {/* BODY */}
      <div className={`rounded-xl border border-white/5 bg-zinc-900/20 overflow-hidden transition-all ${!hasCandidates ? 'border-dashed border-zinc-800 h-32 flex items-center justify-center' : ''}`}>
        
        {!hasCandidates ? (
             <div className="text-zinc-600 flex items-center gap-2">
                <Users size={20} />
                <span className="text-xs font-bold uppercase tracking-wider">Drag candidates here</span>
             </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr>
                  <th className="p-4 w-24 bg-zinc-900/50 border-b border-r border-white/5 text-[10px] font-black uppercase text-zinc-500 tracking-wider text-right align-bottom sticky left-0 z-10 backdrop-blur-sm">
                    Candidate
                  </th>
                  
                  {role.actors.map((actor: any) => (
                      <th key={actor.id} className="p-4 border-b border-r border-white/5 min-w-[140px] w-[160px] relative group/col">
                         
                         {/* AVATAR + ACTIONS */}
                         <div className="relative aspect-[3/4] rounded-lg overflow-hidden border border-white/10 shadow-lg mb-2 group/image">
                            <img 
                                src={actor.headshot || "https://placehold.co/400x600/111/444?text=No+Img"} 
                                className="w-full h-full object-cover" 
                                alt={actor.name}
                            />
                            
                            {/* REMOVE BUTTON (Top Right) */}
                            <button 
                                onClick={() => onRemoveActor(role.id, actor.id)} 
                                className="absolute top-1 right-1 p-1.5 bg-black/60 text-zinc-400 hover:text-red-400 rounded-full opacity-0 group-hover/image:opacity-100 transition-opacity z-20"
                                title="Remove Candidate"
                            >
                                <X size={14} />
                            </button>

                            {/* CROWN BUTTON (Center Overlay) */}
                            {role.actors.length > 1 && (
                                <div className="absolute inset-0 flex items-center justify-center bg-black/60 opacity-0 group-hover/image:opacity-100 transition-opacity z-10">
                                    <button 
                                        onClick={() => onPromoteActor(role.id, actor.id)}
                                        className="bg-emerald-500 text-black p-3 rounded-full transform scale-90 hover:scale-110 transition-transform shadow-xl hover:bg-emerald-400"
                                        title="Cast this actor (Removes others)"
                                    >
                                        <Crown size={20} fill="currentColor" />
                                    </button>
                                </div>
                            )}
                         </div>
                         
                         <div className="text-center px-1">
                            <p className="text-sm font-black leading-tight line-clamp-2 text-white">
                                {actor.name || "Unknown"} 
                            </p>
                         </div>
                      </th>
                    ))}
                  <th className="p-4 border-b border-white/5 min-w-[50px] bg-zinc-900/30 border-dashed border-l border-white/10"></th>
                </tr>
              </thead>
              <tbody className="text-xs font-bold text-zinc-300">
                  {/* METRICS ROWS */}
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
                  
                  {/* CONFLICTS ROW */}
                  <tr className="bg-red-900/5">
                      <td className="p-3 border-r border-white/5 text-right text-red-500/70 font-black uppercase text-[10px] align-top pt-4 sticky left-0 bg-zinc-900/90 backdrop-blur-sm z-10">
                        Conflicts
                      </td>
                      {role.actors.map((actor: any) => {
                          const conflictData = actor.conflicts; 
                          // Handle string "A, B" or array ["A", "B"]
                          const conflicts = Array.isArray(conflictData) 
                            ? conflictData 
                            : (typeof conflictData === 'string' ? conflictData.split(',') : []);

                          const cleanConflicts = conflicts.filter((c: string) => c && !c.includes("No known"));

                          return (
                              <td key={actor.id} className="p-3 border-r border-white/5 text-center align-top">
                                  {cleanConflicts.length > 0 ? (
                                      <div className="flex flex-col gap-1 items-center">
                                          {cleanConflicts.slice(0, 3).map((c: string, i: number) => (
                                              <div key={i} className="flex items-center gap-1 text-[9px] bg-red-500/10 text-red-400 border border-red-500/20 px-1.5 py-0.5 rounded w-fit max-w-[140px] truncate">
                                                  <AlertOctagon size={8} className="shrink-0" /> {c}
                                              </div>
                                          ))}
                                          {cleanConflicts.length > 3 && <span className="text-[9px] text-red-500/50">+{cleanConflicts.length - 3} more</span>}
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

// ============================================================================
// 3. MAIN COMPONENT
// ============================================================================

export default function ChemistryWorkspace({ roles = [], onDropActor, onRemoveActor, onPromoteActor }: ChemistryProps) {
  const [activeFilter, setActiveFilter] = useState("All");

  const visibleRoles = roles.filter((r: { type: any; }) => 
    activeFilter === "All" || (r.type && String(r.type).includes(activeFilter))
  );

  return (
    <div className="h-full flex flex-col bg-zinc-950 relative overflow-hidden">
      {/* HEADER & FILTERS */}
      <header className="px-4 py-3 border-b border-white/5 bg-zinc-900/50 flex flex-col md:flex-row justify-between items-center gap-4 shrink-0 backdrop-blur-md z-30">
         <div className="flex items-center gap-4 w-full md:w-auto">
            <h1 className="text-sm font-black italic uppercase flex items-center gap-2 text-zinc-400">
                <Scale className="text-purple-500" size={16} /> Head-to-Head
            </h1>
            <div className="h-6 w-px bg-white/10 mx-2 hidden md:block"></div>
            
            <div className="flex bg-zinc-900 p-0.5 rounded-lg border border-white/5 overflow-x-auto max-w-[250px] md:max-w-none scrollbar-hide">
                {["All", "Lead", "Supporting", "Featured", "Ensemble"].map(filter => (
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

      {/* CANVAS */}
      <div className="flex-1 overflow-x-auto overflow-y-auto p-4 md:p-8 custom-scrollbar bg-zinc-950 space-y-12 pb-24 md:pb-8">
            {visibleRoles.length === 0 && (
                <div className="w-full h-full flex flex-col items-center justify-center text-zinc-600 opacity-50 min-h-[300px]">
                    <Filter size={48} className="mb-4" />
                    <p>No roles match this filter.</p>
                </div>
            )}

            {visibleRoles.map((role: any) => (
               <RoleComparisonCard 
                  key={role.id}
                  role={role}
                  onDropActor={onDropActor}
                  onRemoveActor={onRemoveActor}
                  onPromoteActor={onPromoteActor}
               />
            ))}
      </div>
    </div>
  );
}