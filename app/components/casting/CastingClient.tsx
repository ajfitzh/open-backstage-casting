"use client";

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { 
  Users, Filter, X, Check, Ruler, Scale, AlertOctagon, 
  LayoutGrid, StretchHorizontal 
} from "lucide-react";
import { generateCastingRows, syncCastingChanges } from '@/app/lib/actions';
import CallbackActorModal from './CallbackActorModal';

// ============================================================================
// 1. TYPES & CONFIG
// ============================================================================

type BaserowLink = { id: number; value: string };

type AssignmentRow = {
  id: number; 
  role: BaserowLink[];   
  person: BaserowLink[]; // Can hold multiple for Head-to-Head
  production: { id: number }[];
  savedScenes?: BaserowLink[];   
  _pendingScenes?: BaserowLink[]; 
  auditionInfo?: any; 
  auditionGrades?: any;
};

type BlueprintRole = {
  id: number;
  name: string; 
  activeScenes: BaserowLink[]; 
  type?: string; // e.g. "Lead", "Ensemble"
};

type Scene = {
  id: number;
  name: string;
  order: number;
};

interface CastingClientProps {
  assignments: AssignmentRow[];
  blueprintRoles: BlueprintRole[];
  allScenes: Scene[];
  activeId: number; 
}

// --- METRICS CONFIG FOR CHEMISTRY VIEW ---
const METRICS = [
  { 
    label: "Vocal", 
    getValue: (a: any) => a.vocalScore, 
    format: (v: any) => (
      <span className={`px-2 py-1 rounded font-mono text-xs ${v >= 4 ? 'bg-emerald-500/20 text-emerald-400' : v >= 3 ? 'bg-blue-500/20 text-blue-400' : 'text-zinc-500'}`}>
        {Number(v || 0).toFixed(1)}
      </span>
    )
  },
  { 
    label: "Acting", 
    getValue: (a: any) => a.actingScore, 
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

// ============================================================================
// 2. SUB-COMPONENT: CHEMISTRY WORKSPACE
// ============================================================================

function ChemistryWorkspace({ roles = [], onRemoveActor }: { roles: any[], onRemoveActor: any }) {
  const [activeFilter, setActiveFilter] = useState("All");

  const visibleRoles = roles.filter((r) => 
    activeFilter === "All" || (r.type && String(r.type).includes(activeFilter))
  );

  return (
    <div className="h-full flex flex-col bg-zinc-950 relative overflow-hidden">
      {/* FILTER HEADER */}
      <header className="px-4 py-3 border-b border-white/5 bg-zinc-900/50 flex flex-row justify-between items-center gap-4 shrink-0 backdrop-blur-md z-30">
         <div className="flex items-center gap-4 w-full">
            <h1 className="text-sm font-black italic uppercase flex items-center gap-2 text-zinc-400">
                <Scale className="text-purple-500" size={16} /> Head-to-Head
            </h1>
            <div className="h-6 w-px bg-white/10 mx-2"></div>
            <div className="flex bg-zinc-900 p-0.5 rounded-lg border border-white/5">
                {["All", "Lead", "Supporting", "Featured", "Ensemble"].map(filter => (
                    <button
                        key={filter}
                        onClick={() => setActiveFilter(filter)}
                        className={`px-3 py-1 text-[10px] font-bold uppercase rounded transition-all ${activeFilter === filter ? 'bg-purple-600 text-white shadow-lg' : 'text-zinc-500 hover:text-zinc-300'}`}
                    >
                        {filter}
                    </button>
                ))}
            </div>
         </div>
      </header>

      {/* CARDS CONTAINER */}
      <div className="flex-1 overflow-y-auto p-4 md:p-8 custom-scrollbar bg-zinc-950 space-y-12 pb-24 md:pb-8">
            {visibleRoles.length === 0 && (
                <div className="flex flex-col items-center justify-center text-zinc-600 opacity-50 min-h-[300px]">
                    <Filter size={48} className="mb-4" />
                    <p>No roles match this filter.</p>
                </div>
            )}

            {visibleRoles.map((role) => (
               <div key={role.id} className="group relative">
                  {/* ROLE HEADER */}
                  <div className="flex items-center gap-3 mb-4 pl-2 border-l-2 border-purple-500/50">
                    <h2 className="text-xl font-black uppercase text-white tracking-tighter italic">{role.name}</h2>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-zinc-800 text-zinc-400 border border-white/5">{role.type || "Role"}</span>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-zinc-800 text-zinc-500 border border-white/5">{role.actors?.length || 0} Candidates</span>
                  </div>

                  {/* TABLE */}
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
                              <th className="p-4 w-24 bg-zinc-900/50 border-b border-r border-white/5 text-[10px] font-black uppercase text-zinc-500 tracking-wider text-right align-bottom sticky left-0 z-10 backdrop-blur-sm">
                                Candidate
                              </th>
                              {role.actors.map((actor: any) => (
                                  <th key={actor.id} className="p-4 border-b border-r border-white/5 min-w-[140px] w-[160px] relative group/col">
                                    <div className="relative aspect-[3/4] rounded-lg overflow-hidden border border-white/10 shadow-lg mb-2">
                                        <img src={actor.headshot || "/placeholder.png"} className="w-full h-full object-cover" alt="" />
                                        <button onClick={() => onRemoveActor(role.id, actor.id)} className="absolute top-1 right-1 p-1.5 bg-black/60 text-zinc-400 hover:text-red-400 rounded-full opacity-0 group-hover/col:opacity-100 transition-opacity z-20">
                                            <X size={14} />
                                        </button>
                                    </div>
                                    <div className="text-center px-1">
                                        <p className="text-sm font-black leading-tight line-clamp-2 text-white">{actor.name}</p>
                                    </div>
                                  </th>
                              ))}
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
                              {/* CONFLICTS ROW */}
                              <tr className="bg-red-900/5">
                                  <td className="p-3 border-r border-white/5 text-right text-red-500/70 font-black uppercase text-[10px] align-top pt-4 sticky left-0 bg-zinc-900/90 backdrop-blur-sm z-10">
                                    Conflicts
                                  </td>
                                  {role.actors.map((actor: any) => (
                                      <td key={actor.id} className="p-3 border-r border-white/5 text-center align-top">
                                          {(actor.conflicts?.length > 0) ? (
                                              <div className="flex flex-col gap-1 items-center">
                                                  {actor.conflicts.slice(0, 3).map((c: string, i: number) => (
                                                      <div key={i} className="flex items-center gap-1 text-[9px] bg-red-500/10 text-red-400 border border-red-500/20 px-1.5 py-0.5 rounded w-fit max-w-[140px] truncate">
                                                          <AlertOctagon size={8} className="shrink-0" /> {c}
                                                      </div>
                                                  ))}
                                              </div>
                                          ) : <span className="text-[10px] text-emerald-500/50 flex items-center justify-center gap-1"><Check size={10}/> Clear</span>}
                                      </td>
                                  ))}
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


// ============================================================================
// 3. MAIN COMPONENT: CASTING CLIENT
// ============================================================================

export default function CastingClient({ 
  assignments = [], 
  blueprintRoles = [], 
  allScenes = [], 
  activeId 
}: CastingClientProps) {
  const router = useRouter();
  
  // State
  const [viewMode, setViewMode] = useState<"matrix" | "chemistry">("matrix"); // 🟢 TOGGLE STATE
  const [rows, setRows] = useState<AssignmentRow[]>(assignments);
  const [selectedStudent, setSelectedStudent] = useState<{ id: number; name: string } | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const hasInitialized = useRef(false);

  useEffect(() => { setRows(assignments); }, [assignments]);

  // AUTO-INIT
  useEffect(() => {
    const initGrid = async () => {
      if (assignments.length > 0 || hasInitialized.current) return;
      hasInitialized.current = true;
      setIsLoading(true);
      try {
        const result = await generateCastingRows(activeId);
        if (result.success) router.refresh(); 
        else setIsLoading(false);
      } catch (e) { setIsLoading(false); }
    };
    initGrid();
  }, [assignments.length, activeId, router]);

  useEffect(() => {
    if (assignments.length > 0 && isLoading) setIsLoading(false);
  }, [assignments.length, isLoading]);

  // ACTIONS
  const handleDraftAutoFill = () => {
    const draftState = rows.map((row) => {
      const roleId = row.role?.[0]?.id;
      const blueprint = blueprintRoles.find(bp => bp.id === roleId);
      if (blueprint && blueprint.activeScenes?.length > 0) {
        return { ...row, _pendingScenes: blueprint.activeScenes };
      }
      return row;
    });
    setRows(draftState);
  };

  const handleSave = async () => {
    setIsSaving(true);
    const changes = rows
      .filter(row => row._pendingScenes) 
      .map(row => {
        const studentId = row.person?.[0]?.id;
        if (!studentId) return null;
        const pendingIds = row._pendingScenes!.map(s => s.id);
        const savedIds = row.savedScenes?.map(s => s.id) || [];
        const added = pendingIds.filter(id => !savedIds.includes(id));
        const removed = savedIds.filter(id => !pendingIds.includes(id));
        if (added.length === 0 && removed.length === 0) return null;
        return { studentId, addedSceneIds: added, removedSceneIds: removed };
      })
      .filter(Boolean);

    if (changes.length > 0) {
      await syncCastingChanges(activeId, changes);
      router.refresh(); 
    }
    setIsSaving(false);
  };

  const handleRemoveActor = (roleId: number, actorId: number) => {
    // This is for visual cleanup in Chemistry view (Client side only for now)
    setRows(prev => prev.map(r => {
      if (r.id === roleId) {
         return {
            ...r,
            person: r.person.filter(p => p.id !== actorId)
         };
      }
      return r;
    }));
  };

  // --- MAPPERS ---
  const getStudentTimeline = (studentId: number) => {
    const studentRoles = rows.filter(r => r.person?.some(p => p.id === studentId));
    return allScenes.map(scene => {
      const activeRoleRow = studentRoles.find(row => {
        const scenes = row._pendingScenes || row.savedScenes || [];
        return scenes.some(s => s.id === scene.id);
      });
      return {
        scene,
        roleName: activeRoleRow ? activeRoleRow.role?.[0]?.value : null,
        color: activeRoleRow 
          ? `hsl(${(activeRoleRow.role?.[0]?.value.length * 40) % 360}, 70%, 50%)` 
          : 'transparent'
      };
    });
  };

  const getChemistryData = () => {
    return rows.map(row => {
        const bp = blueprintRoles.find(b => b.id === row.role?.[0]?.id);
        return {
            id: row.id,
            name: row.role?.[0]?.value || "Unknown",
            type: bp?.type || "Role", // You might need to add 'type' to BlueprintRole if available
            actors: row.person?.map(p => ({
                id: p.id,
                name: p.value,
                // Flatten stats for the chemistry card
                headshot: row.auditionInfo?.avatar,
                vocalScore: row.auditionGrades?.vocal,
                actingScore: row.auditionGrades?.acting,
                height: row.auditionInfo?.height,
                age: row.auditionInfo?.age,
                conflicts: row.auditionInfo?.conflicts?.split(',')
            })) || []
        };
    });
  };

  const activeStudentRow = selectedStudent 
    ? rows.find(r => r.person?.some(p => p.id === selectedStudent.id)) 
    : null;


  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-full space-y-4 text-zinc-400">
         <div className="animate-spin h-8 w-8 border-4 border-blue-500 rounded-full border-t-transparent"></div>
         <p className="text-xs uppercase tracking-widest">Initializing Grid...</p>
      </div>
    );
  }

  return (
    <div className="flex h-[calc(100vh-4rem)] relative">
      
      {/* LEFT: MAIN CONTENT AREA */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden bg-zinc-950">
        
        {/* TOOLBAR */}
        <div className="flex justify-between items-center p-4 border-b border-zinc-800 bg-zinc-900/50">
          <div className="flex items-center gap-6">
            <div>
                <h2 className="text-lg font-bold text-white">Casting Dashboard</h2>
                <p className="text-xs text-zinc-500 font-mono mt-1">
                {rows.length} ROLES • {allScenes.length} SCENES
                </p>
            </div>
            
            {/* 🟢 VIEW TOGGLE */}
            <div className="flex bg-black/50 p-1 rounded-lg border border-white/5">
                <button 
                    onClick={() => setViewMode("matrix")}
                    className={`p-2 rounded flex items-center gap-2 text-xs font-bold uppercase transition-all ${viewMode === 'matrix' ? 'bg-zinc-800 text-white shadow' : 'text-zinc-500 hover:text-zinc-300'}`}
                    title="Matrix View"
                >
                    <LayoutGrid size={14} /> <span className="hidden md:inline">Matrix</span>
                </button>
                <button 
                    onClick={() => setViewMode("chemistry")}
                    className={`p-2 rounded flex items-center gap-2 text-xs font-bold uppercase transition-all ${viewMode === 'chemistry' ? 'bg-zinc-800 text-purple-400 shadow' : 'text-zinc-500 hover:text-zinc-300'}`}
                    title="Chemistry View"
                >
                    <Scale size={14} /> <span className="hidden md:inline">Chemistry</span>
                </button>
            </div>
          </div>

          <div className="flex gap-2">
            <button 
              onClick={handleDraftAutoFill}
              className="px-3 py-1.5 text-xs font-bold uppercase tracking-wider text-blue-400 bg-blue-500/10 border border-blue-500/20 rounded hover:bg-blue-500/20 transition-all"
            >
              Draft Defaults
            </button>
            <button 
              onClick={handleSave}
              disabled={isSaving}
              className="px-3 py-1.5 text-xs font-bold uppercase tracking-wider text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 rounded hover:bg-emerald-500/20 transition-all disabled:opacity-50"
            >
              {isSaving ? "Saving..." : "Save Changes"}
            </button>
          </div>
        </div>

        {/* CONTENT SWITCHER */}
        {viewMode === "matrix" ? (
            <div className="flex-1 overflow-y-auto custom-scrollbar p-4">
            <div className="border border-zinc-800 rounded-lg overflow-hidden">
                <table className="w-full text-left border-collapse">
                <thead className="bg-zinc-900 text-zinc-500 text-[10px] uppercase tracking-widest font-bold">
                    <tr>
                    <th className="p-3 border-b border-zinc-800 w-1/4 sticky left-0 bg-zinc-900 z-10 shadow-[2px_0_5px_rgba(0,0,0,0.5)]">Role Identity</th>
                    <th className="p-3 border-b border-zinc-800 w-1/6">Actor</th>
                    <th className="p-3 border-b border-zinc-800">Scene Map ({allScenes.length})</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800 bg-zinc-900/20">
                    {rows.map((row) => {
                    const assignedScenes = row._pendingScenes || row.savedScenes || [];
                    const isDraft = !!row._pendingScenes;
                    const assignedIds = new Set(assignedScenes.map(s => s.id));

                    return (
                        <tr key={row.id} className="hover:bg-zinc-800/50 transition-colors group">
                        <td className="p-3 text-sm font-medium text-zinc-200 sticky left-0 bg-zinc-950 group-hover:bg-zinc-900 transition-colors z-10 border-r border-zinc-800/50">
                            {row.role?.[0]?.value || <span className="text-red-500">No Role</span>}
                        </td>
                        <td className="p-3 text-sm text-zinc-400">
                            {row.person?.[0] ? (
                            <button 
                                onClick={() => setSelectedStudent({ id: row.person[0].id, name: row.person[0].value })}
                                className="text-emerald-400 hover:text-emerald-300 hover:underline text-left"
                            >
                                {row.person[0].value}
                            </button>
                            ) : (
                            <span className="text-zinc-600 italic">Unassigned</span>
                            )}
                        </td>
                        <td className="p-3">
                            <div className="flex items-center gap-[2px]">
                            {allScenes.map(scene => {
                                const isActive = assignedIds.has(scene.id);
                                return (
                                <div 
                                    key={scene.id}
                                    title={`${scene.name} (${isActive ? 'Active' : 'Out'})`}
                                    className={`
                                    w-2.5 h-4 rounded-[1px] transition-all duration-300
                                    ${isActive 
                                        ? (isDraft ? 'bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.5)]' : 'bg-emerald-500/80') 
                                        : 'bg-zinc-800/50 hover:bg-zinc-700'
                                    }
                                    `}
                                />
                                );
                            })}
                            </div>
                        </td>
                        </tr>
                    );
                    })}
                </tbody>
                </table>
            </div>
            </div>
        ) : (
            // 🧪 CHEMISTRY WORKSPACE VIEW
            <ChemistryWorkspace 
                roles={getChemistryData()} 
                onRemoveActor={handleRemoveActor}
            />
        )}
      </div>

      {/* MODAL: CALLBACK ACTOR PROFILE (Only in Matrix view usually, but enabled globally here) */}
      {selectedStudent && activeStudentRow && (
        <CallbackActorModal
          actor={{
            name: selectedStudent.name,
            ...activeStudentRow.auditionInfo 
          }}
          grades={activeStudentRow.auditionGrades}
          onClose={() => setSelectedStudent(null)}
          timeline={
            <div className="h-16 w-full flex rounded-lg overflow-hidden border border-zinc-700 mt-2">
              {getStudentTimeline(selectedStudent.id).map((slot, i) => (
                <div 
                  key={i}
                  className="flex-1 h-full flex items-center justify-center group relative border-r border-black/10 last:border-0 hover:brightness-110 transition-all"
                  style={{ backgroundColor: slot.roleName ? slot.color : '#18181b' }}
                >
                  {slot.roleName && (
                    <span className="text-[10px] font-bold text-white/90 -rotate-90 whitespace-nowrap opacity-50 group-hover:opacity-100">
                      {slot.roleName}
                    </span>
                  )}
                  <div className="absolute bottom-full mb-2 bg-black text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 whitespace-nowrap pointer-events-none z-20">
                     {slot.scene.name}: {slot.roleName || "Offstage"}
                  </div>
                </div>
              ))}
            </div>
          }
        />
      )}

      {/* RIGHT SIDEBAR */}
      <div className="w-80 border-l border-zinc-800 bg-zinc-900 hidden lg:flex flex-col">
         <div className="flex-1 p-8 flex items-center justify-center text-zinc-600">
            <p>Actor Bank</p>
         </div>
      </div>
    </div>
  );
}