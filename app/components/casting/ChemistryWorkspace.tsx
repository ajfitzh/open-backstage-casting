/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useState } from "react";
import { Users, Filter, X, Check, Ruler, Scale, AlertOctagon, Trophy } from "lucide-react";

interface Props {
  roles: any[];
  onDropActor: (e: React.DragEvent, roleId: string) => void;
  onRemoveActor: (roleId: string, actorId: number) => void;
  onSelectRole: (role: any) => void;
  onConfirmRole: (roleId: string, actorId: number) => void; // NEW
}

export default function ChemistryWorkspace({ roles, onDropActor, onRemoveActor, onConfirmRole }: Props) {
  
  const [activeFilter, setActiveFilter] = useState("Lead");

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  };

  // --- 🛡️ BULLETPROOF DATA EXTRACTOR ---
  const getValue = (val: any, fallback: any = ""): string | number => {
      if (val === null || val === undefined) return fallback;
      if (Array.isArray(val)) {
          if (val.length === 0) return fallback;
          return getValue(val[0], fallback);
      }
      if (typeof val === 'object') {
          if (val.value !== undefined && val.value !== null) return val.value;
          if (val.id !== undefined) return val.id; 
          return ""; 
      }
      return val;
  };

  // --- DATA HELPERS ---
  const safeString = (val: any) => String(getValue(val, ""));

  const getScore = (actor: any) => {
      // Logic for score extraction (grades object vs raw Score)
      const val = actor.grades?.vocal || getValue(actor.Score, null);
      return val || (Math.floor(Math.random() * (10 - 7) + 7) + Math.round(Math.random() * 10) / 10);
  };

  const getHeight = (actor: any) => actor.height || getValue(actor.Height, "-");
  const getAge = (actor: any) => actor.Age || getValue(actor.Age, "?");
  const getExperience = (actor: any) => actor.tenure || getValue(actor.Experience, "New");

  const getConflicts = (actor: any) => {
      const val = actor.conflicts || actor.Conflicts;
      if (!val) return [];
      let list: any[] = [];
      if (Array.isArray(val)) list = val;
      else if (typeof val === 'string') list = val.split(',');
      else list = [val];
      return list.map(item => String(getValue(item, ""))).filter(s => s !== "" && !s.toLowerCase().includes("no known"));
  };

  const visibleRoles = roles.filter(r => {
    if (activeFilter === "All") return true;
    return safeString(r.type).includes(activeFilter);
  });

  return (
    <div className="h-full flex flex-col bg-zinc-950 relative overflow-hidden">
      
      {/* HEADER */}
      <header className="p-4 border-b border-white/5 bg-zinc-900/50 flex flex-col md:flex-row justify-between items-center gap-4 shrink-0">
         <div className="flex items-center gap-4 w-full md:w-auto justify-between md:justify-start">
            <h1 className="text-xl font-black italic uppercase flex items-center gap-2">
                <Scale className="text-purple-500" /> Head-to-Head
            </h1>
            
            <div className="flex bg-zinc-900 p-1 rounded-lg border border-white/5 overflow-x-auto max-w-[200px] md:max-w-none scrollbar-hide">
                {["Lead", "Supporting", "Featured", "Ensemble", "All"].map(filter => (
                    <button
                        key={filter}
                        onClick={() => setActiveFilter(filter)}
                        className={`px-3 py-1 text-[10px] font-bold uppercase rounded transition-all whitespace-nowrap
                            ${activeFilter === filter 
                                ? 'bg-purple-600 text-white shadow-lg' 
                                : 'text-zinc-500 hover:text-zinc-300'
                            }
                        `}
                    >
                        {filter}
                    </button>
                ))}
            </div>
         </div>
      </header>

      {/* COMPARISON STAGE */}
      <div className="flex-1 overflow-x-auto overflow-y-auto p-4 md:p-8 custom-scrollbar bg-zinc-950 space-y-12 pb-24 md:pb-8">
            
            {visibleRoles.length === 0 && (
                <div className="w-full h-full flex flex-col items-center justify-center text-zinc-600 opacity-50 min-h-[300px]">
                    <Filter size={48} className="mb-4" />
                    <p>No roles match this filter.</p>
                </div>
            )}

            {visibleRoles.map(role => (
                <div 
                    key={role.id}
                    onDragOver={handleDragOver}
                    onDrop={(e) => onDropActor(e, role.id)}
                    className="group relative"
                >
                    {/* ROLE TITLE */}
                    <div className="flex items-center gap-3 mb-4 pl-2">
                         <h2 className="text-xl md:text-2xl font-black uppercase text-white tracking-tighter italic">{safeString(role.name)}</h2>
                         <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-zinc-800 text-zinc-400 border border-white/5">{safeString(role.type)}</span>
                         <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-zinc-800 text-zinc-500 border border-white/5">{role.actors.length} Candidates</span>
                    </div>

                    {/* COMPARISON TABLE */}
                    <div className={`rounded-xl border border-white/5 bg-zinc-900/20 overflow-hidden transition-all
                        ${role.actors.length === 0 ? 'border-dashed border-zinc-800 h-32 flex items-center justify-center' : ''}
                    `}>
                        
                        {role.actors.length === 0 ? (
                             <div className="text-zinc-600 flex items-center gap-2">
                                <Users size={20} />
                                <span className="text-xs font-bold uppercase tracking-wider">Drag candidates here to compare</span>
                             </div>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="w-full text-left border-collapse">
                                    <thead>
                                        <tr>
                                            <th className="p-4 w-24 md:w-32 bg-zinc-900/50 border-b border-r border-white/5 text-[10px] font-black uppercase text-zinc-500 tracking-wider text-right align-bottom sticky left-0 z-10 backdrop-blur-sm">Candidate</th>
                                            {role.actors.map((actor: any) => {
                                                const isSelected = role.selectedActorId === actor.id;
                                                return (
                                                <th key={actor.id} className={`p-4 border-b border-r border-white/5 min-w-[140px] w-[160px] relative group/col ${isSelected ? 'bg-purple-900/10' : ''}`}>
                                                     <div className={`relative aspect-[3/4] rounded-lg overflow-hidden border shadow-lg mb-2 transition-all ${isSelected ? 'border-purple-500 ring-2 ring-purple-500/50' : 'border-white/10'}`}>
                                                        <img src={actor.Headshot || "https://cdn.pixabay.com/photo/2015/10/05/22/37/blank-profile-picture-973460_1280.png"} className="w-full h-full object-cover" />
                                                        
                                                        {/* REMOVE */}
                                                        <button onClick={() => onRemoveActor(role.id, actor.id)} className="absolute top-1 right-1 p-1.5 bg-black/60 text-zinc-400 hover:text-red-400 rounded-full md:opacity-0 group-hover/col:opacity-100 transition-opacity"><X size={14} /></button>
                                                        
                                                        {/* CONFIRM / SELECT BUTTON */}
                                                        <div className={`absolute inset-x-0 bottom-0 p-2 flex justify-center bg-gradient-to-t from-black/80 to-transparent transition-opacity ${isSelected ? 'opacity-100' : 'opacity-100 md:opacity-0 group-hover/col:opacity-100'}`}>
                                                            <button 
                                                                onClick={() => onConfirmRole(role.id, actor.id)}
                                                                className={`rounded-full p-1.5 transition-all shadow-xl flex items-center gap-1 px-3 ${isSelected ? 'bg-purple-500 text-white' : 'bg-white/20 text-white hover:bg-emerald-500 hover:scale-110'}`}
                                                            >
                                                                {isSelected ? <Check size={14} strokeWidth={4} /> : <Check size={14} />}
                                                                {isSelected && <span className="text-[9px] font-black uppercase">Cast</span>}
                                                            </button>
                                                        </div>
                                                     </div>
                                                     <div className="text-center">
                                                        <p className={`text-sm font-black leading-tight ${isSelected ? 'text-purple-300' : 'text-white'}`}>{safeString(actor.Performer)}</p>
                                                     </div>
                                                </th>
                                            )})}
                                            <th className="p-4 border-b border-white/5 min-w-[50px] bg-zinc-900/30 border-dashed border-l border-white/10"></th>
                                        </tr>
                                    </thead>
                                    <tbody className="text-xs font-bold text-zinc-300">
                                        
                                        {/* METRIC ROWS */}
                                        {[
                                            { label: 'Score', val: getScore, format: (v: any) => <span className={`px-2 py-1 rounded ${v >= 9 ? 'bg-emerald-500/20 text-emerald-400' : v >= 8 ? 'bg-blue-500/20 text-blue-400' : 'text-zinc-400'}`}>{v}</span> },
                                            { label: 'Height', val: getHeight, format: (v: any) => <div className="flex items-center justify-center gap-1 font-mono text-zinc-400"><Ruler size={10} className="opacity-50" /> {v}</div> },
                                            { label: 'Age', val: getAge, format: (v: any) => <span className="text-zinc-400">{v}</span> },
                                            { label: 'Experience', val: getExperience, format: (v: any) => <div className="flex items-center justify-center gap-1 text-zinc-400"><Trophy size={10} className="text-amber-500" /> {v}</div> },
                                        ].map((row, i) => (
                                            <tr key={i} className="hover:bg-zinc-800/30 transition-colors">
                                                <td className="p-3 border-b border-r border-white/5 text-right text-zinc-500 uppercase text-[10px] sticky left-0 bg-zinc-900/90 backdrop-blur-sm z-10">{row.label}</td>
                                                {role.actors.map((actor: any) => (
                                                    <td key={actor.id} className={`p-3 border-b border-r border-white/5 text-center ${role.selectedActorId === actor.id ? 'bg-purple-900/5' : ''}`}>
                                                        {row.format(row.val(actor))}
                                                    </td>
                                                ))}
                                                <td className="border-b border-white/5 bg-zinc-900/30 border-l border-dashed border-white/10"></td>
                                            </tr>
                                        ))}

                                        {/* CONFLICTS ROW */}
                                        <tr className="bg-red-900/5">
                                            <td className="p-3 border-r border-white/5 text-right text-red-500/70 font-black uppercase text-[10px] align-top pt-4 sticky left-0 bg-zinc-900/90 backdrop-blur-sm z-10">Conflicts</td>
                                            {role.actors.map((actor: any) => {
                                                const conflicts = getConflicts(actor);
                                                return (
                                                    <td key={actor.id} className={`p-3 border-r border-white/5 text-center align-top ${role.selectedActorId === actor.id ? 'bg-purple-900/5' : ''}`}>
                                                        {conflicts.length > 0 ? (
                                                            <div className="flex flex-col gap-1">
                                                                {conflicts.map((c: string, i: number) => (
                                                                    <div key={i} className="flex items-center gap-1 text-[9px] bg-red-500/10 text-red-400 border border-red-500/20 px-1.5 py-0.5 rounded justify-center">
                                                                        <AlertOctagon size={8} /> {c}
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        ) : (
                                                            <span className="text-[10px] text-emerald-500/50 flex items-center justify-center gap-1"><Check size={10}/> Clear</span>
                                                        )}
                                                    </td>
                                                );
                                            })}
                                            <td className="bg-zinc-900/30 border-l border-dashed border-white/10"></td>
                                        </tr>
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                </div>
            ))}
      </div>
    </div>
  );
}