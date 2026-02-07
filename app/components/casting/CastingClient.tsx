"use client";

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { 
  Users, Filter, X, Check, Ruler, Scale, AlertOctagon, 
  LayoutGrid, Search, ArrowUpDown, MoreHorizontal,
  Archive, Undo, AlertCircle
} from "lucide-react";
import { generateCastingRows, syncCastingChanges } from '@/app/lib/actions';
import CallbackActorModal from './CallbackActorModal';
import AutoCastButton from './AutoCastButton';
import { saveCastingGrid } from '@/app/lib/actions'; // Import the new action
import { Printer } from "lucide-react"; // Add Printer icon
import CastingPrintView from './CastingPrintView'; // Import the new component
// ============================================================================
// 1. TYPES & CONFIG
// ============================================================================

type BaserowLink = { id: number; value: string };

type AssignmentRow = {
  id: number; 
  role: BaserowLink[];   
  person: BaserowLink[]; 
  production: { id: number }[];
  savedScenes?: BaserowLink[];   
  _pendingScenes?: BaserowLink[]; 
  auditionInfo?: any; 
  auditionGrades?: any;
};

type RosterStudent = {
  id: number;
  name: string;
  avatar: string | null;
  vocalScore: number;
  actingScore: number;
  danceScore: number;
  auditionInfo: any;
  auditionGrades: any;
};

type BlueprintRole = { id: number; name: string; activeScenes: BaserowLink[]; type?: string; };
type Scene = { id: number; name: string; order: number; act: string; };

interface CastingClientProps {
  assignments: AssignmentRow[];
  blueprintRoles: BlueprintRole[];
  allScenes: Scene[];
  roster: RosterStudent[];
  activeId: number; 
}

// ------------------------------------------------------------------
// 🧠 COMPLIANCE LOGIC
// ------------------------------------------------------------------
type ComplianceStatus = "uncast" | "at-risk" | "compliant";

function getStudentCompliance(studentId: number, rows: AssignmentRow[], allScenes: Scene[]) {
  // 1. Find all rows where this student is assigned
  const myAssignments = rows.filter(r => r.person?.some(p => p.id === studentId));
  
  if (myAssignments.length === 0) {
    return { status: "uncast" as ComplianceStatus, sceneCount: 0, hasAct1: false, hasAct2: false };
  }

  // 2. Gather unique Scene IDs from pending or saved state
  const mySceneIds = new Set<number>();
  myAssignments.forEach(row => {
    const activeScenes = row._pendingScenes || row.savedScenes || [];
    activeScenes.forEach(s => mySceneIds.add(s.id));
  });

  const sceneCount = mySceneIds.size;

  // 3. Check Act Coverage
  let hasAct1 = false;
  let hasAct2 = false;

  mySceneIds.forEach(sId => {
    const sceneDef = allScenes.find(s => s.id === sId);
    if (sceneDef) {
       if (sceneDef.act.includes("1")) hasAct1 = true;
       if (sceneDef.act.includes("2")) hasAct2 = true;
    }
  });

  // 4. Determine Status
  let status: ComplianceStatus = "compliant"; 
  if (sceneCount < 3 || !hasAct1 || !hasAct2) {
      status = "at-risk";
  }

  return { status, sceneCount, hasAct1, hasAct2 };
}

// ============================================================================
// 2. SUB-COMPONENT: ROSTER SIDEBAR
// ============================================================================
function RosterSidebar({ 
  students, 
  rows,
  allScenes,
  onSelect, 
  releasedIds,
  onToggleRelease
}: { 
  students: RosterStudent[], 
  rows: AssignmentRow[],
  allScenes: Scene[],
  onSelect: (s: RosterStudent) => void, 
  releasedIds: number[],
  onToggleRelease: (id: number) => void
}) {
  const [search, setSearch] = useState("");
  const [activeTab, setActiveTab] = useState<"to-cast" | "in-progress" | "done">("to-cast");
  const [showReleased, setShowReleased] = useState(false);

  // 1. Calculate Compliance Map
  const complianceMap = useMemo(() => {
    const map = new Map();
    students.forEach(s => {
        map.set(s.id, getStudentCompliance(s.id, rows, allScenes));
    });
    return map;
  }, [students, rows, allScenes]);

  // 2. Filter Logic
  const filtered = students.filter(s => {
    if (search && !s.name.toLowerCase().includes(search.toLowerCase())) return false;
    
    const isReleased = releasedIds.includes(s.id);
    if (showReleased) return isReleased; // Show only released
    if (isReleased) return false;        // Hide released otherwise

    const stats = complianceMap.get(s.id);
    if (activeTab === "to-cast") return stats.status === "uncast";
    if (activeTab === "in-progress") return stats.status === "at-risk";
    if (activeTab === "done") return stats.status === "compliant";
    
    return true;
  }).sort((a, b) => a.name.localeCompare(b.name));

  // 3. Tab Counts
  const counts = useMemo(() => {
     let toCast = 0, inProgress = 0, done = 0;
     students.forEach(s => {
        if (releasedIds.includes(s.id)) return;
        const status = complianceMap.get(s.id).status;
        if (status === "uncast") toCast++;
        else if (status === "at-risk") inProgress++;
        else done++;
     });
     return { toCast, inProgress, done };
  }, [students, complianceMap, releasedIds]);

  return (
    <aside className="w-80 border-r border-zinc-800 flex flex-col bg-zinc-950 shrink-0 h-full relative z-20">
      
      {/* TABS */}
      <div className="flex border-b border-zinc-800 bg-zinc-900/50">
         <button 
            onClick={() => setActiveTab("to-cast")}
            className={`flex-1 py-3 text-[10px] font-black uppercase tracking-widest border-b-2 transition-all flex flex-col items-center gap-1 ${activeTab === 'to-cast' ? 'border-red-500 text-white bg-red-500/5' : 'border-transparent text-zinc-500 hover:text-zinc-300'}`}
         >
            To Cast
            <span className={`px-1.5 py-0.5 rounded text-[9px] ${activeTab === 'to-cast' ? 'bg-red-500 text-black' : 'bg-zinc-800'}`}>{counts.toCast}</span>
         </button>
         <button 
            onClick={() => setActiveTab("in-progress")}
            className={`flex-1 py-3 text-[10px] font-black uppercase tracking-widest border-b-2 transition-all flex flex-col items-center gap-1 ${activeTab === 'in-progress' ? 'border-yellow-500 text-white bg-yellow-500/5' : 'border-transparent text-zinc-500 hover:text-zinc-300'}`}
         >
            Progress
            <span className={`px-1.5 py-0.5 rounded text-[9px] ${activeTab === 'in-progress' ? 'bg-yellow-500 text-black' : 'bg-zinc-800'}`}>{counts.inProgress}</span>
         </button>
         <button 
            onClick={() => setActiveTab("done")}
            className={`flex-1 py-3 text-[10px] font-black uppercase tracking-widest border-b-2 transition-all flex flex-col items-center gap-1 ${activeTab === 'done' ? 'border-emerald-500 text-white bg-emerald-500/5' : 'border-transparent text-zinc-500 hover:text-zinc-300'}`}
         >
            Done
            <span className={`px-1.5 py-0.5 rounded text-[9px] ${activeTab === 'done' ? 'bg-emerald-500 text-black' : 'bg-zinc-800'}`}>{counts.done}</span>
         </button>
      </div>

      {/* SEARCH */}
      <div className="p-3 border-b border-zinc-800">
        <div className="relative">
            <Search size={12} className="absolute left-2 top-2 text-zinc-600" />
            <input 
                type="text" 
                placeholder="Search..." 
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full bg-zinc-900 border border-zinc-800 rounded text-xs pl-7 py-1.5 text-white focus:outline-none focus:border-zinc-700 placeholder:text-zinc-600"
            />
        </div>
      </div>

      {/* LIST */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2 custom-scrollbar bg-zinc-950/50">
        {filtered.length === 0 && (
            <div className="text-center py-10 text-zinc-600 text-xs italic">
                {showReleased ? "No released students" : "List empty. Good job!"}
            </div>
        )}

        {filtered.map(student => {
           const stats = complianceMap.get(student.id);
           
           let borderClass = "border-zinc-800"; 
           if (!showReleased) {
               if (stats.status === "uncast") borderClass = "border-red-500/50 hover:border-red-500";
               else if (stats.status === "at-risk") borderClass = "border-yellow-500/50 hover:border-yellow-500";
               else borderClass = "border-emerald-500/50 hover:border-emerald-500";
           }

           return (
            <div 
                key={student.id}
                draggable={!showReleased}
                onClick={() => onSelect(student)}
                onDragStart={(e) => e.dataTransfer.setData("actorId", String(student.id))}
                className={`group bg-zinc-900 border-l-4 p-3 rounded-r-lg flex items-center gap-3 cursor-grab active:cursor-grabbing hover:bg-zinc-800 transition-all shadow-sm ${borderClass} ${showReleased ? 'opacity-60 grayscale' : ''}`}
            >
                <div className="relative w-10 h-10 shrink-0">
                    <img 
                        src={student.avatar || "https://placehold.co/100x100/222/888?text=?"} 
                        alt={student.name} 
                        className="w-full h-full rounded-full object-cover border border-white/10"
                    />
                </div>
                
                <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-start">
                        <div className="text-xs font-bold text-zinc-200 truncate">{student.name}</div>
                        
                        {/* THE RELEASE BUTTON */}
                        <button 
                            onClick={(e) => { e.stopPropagation(); onToggleRelease(student.id); }}
                            className="text-zinc-600 hover:text-white opacity-0 group-hover:opacity-100 transition-opacity"
                            title={showReleased ? "Restore" : "Release (Archive)"}
                        >
                            {showReleased ? <Undo size={12} /> : <X size={12} />}
                        </button>
                    </div>

                    {stats.status !== "uncast" && !showReleased && (
                        <div className="flex items-center gap-3 mt-1.5">
                            <div className={`text-[9px] font-mono font-bold px-1.5 rounded ${stats.sceneCount >= 3 ? 'bg-emerald-500/20 text-emerald-400' : 'bg-yellow-500/20 text-yellow-400'}`}>
                                {stats.sceneCount}/3
                            </div>
                            <div className="flex gap-1">
                                <div title="Act 1" className={`w-2 h-2 rounded-full border border-current ${stats.hasAct1 ? 'bg-blue-500 border-blue-500' : 'border-zinc-600'}`} />
                                <div title="Act 2" className={`w-2 h-2 rounded-full border border-current ${stats.hasAct2 ? 'bg-blue-500 border-blue-500' : 'border-zinc-600'}`} />
                            </div>
                        </div>
                    )}
                    
                    {(stats.status === "uncast" || showReleased) && (
                        <div className="text-[10px] text-zinc-500 mt-0.5">
                            {showReleased ? "Released" : "Not yet assigned"}
                        </div>
                    )}
                </div>
            </div>
           );
        })}
      </div>

      {/* TOGGLE RELEASED */}
      <div className="p-2 border-t border-zinc-800 bg-zinc-900/50">
        <button 
            onClick={() => setShowReleased(!showReleased)}
            className={`w-full flex items-center justify-center gap-2 py-2 rounded text-[10px] font-bold uppercase tracking-widest transition-colors ${showReleased ? 'bg-zinc-800 text-white' : 'text-zinc-600 hover:text-zinc-400'}`}
        >
            <Archive size={12} />
            {showReleased ? "View Active Pool" : "View Released"}
        </button>
      </div>

    </aside>
  );
}

// ============================================================================
// 3. SUB-COMPONENT: CHEMISTRY WORKSPACE
// ============================================================================

const METRICS = [
    { label: "Vocal", getValue: (a: any) => a.vocalScore, format: (v: any) => <span className={`px-2 py-1 rounded font-mono text-xs ${v >= 4 ? 'bg-emerald-500/20 text-emerald-400' : v >= 3 ? 'bg-blue-500/20 text-blue-400' : 'text-zinc-500'}`}>{Number(v || 0).toFixed(1)}</span> },
    { label: "Acting", getValue: (a: any) => a.actingScore, format: (v: any) => <span className={`px-2 py-1 rounded font-mono text-xs ${v >= 4 ? 'bg-purple-500/20 text-purple-400' : v >= 3 ? 'bg-blue-500/20 text-blue-400' : 'text-zinc-500'}`}>{Number(v || 0).toFixed(1)}</span> },
    { label: "Height", getValue: (a: any) => a.height || "-", format: (v: any) => <div className="flex justify-center items-center gap-1 font-mono text-zinc-400 text-xs"><Ruler size={10} className="opacity-50" /> {v}</div> },
    { label: "Age", getValue: (a: any) => a.age || "?", format: (v: any) => <span className="text-zinc-400 text-xs">{v}</span> }
  ];
  
function ChemistryWorkspace({ roles = [], onRemoveActor, onDropActor }: { roles: any[], onRemoveActor: any, onDropActor: any }) {
    const [activeFilter, setActiveFilter] = useState("All");
    const visibleRoles = roles.filter((r) => activeFilter === "All" || (r.type && String(r.type).includes(activeFilter)));
  
    return (
      <div className="h-full flex flex-col bg-zinc-950 relative overflow-hidden">
        <header className="px-4 py-3 border-b border-white/5 bg-zinc-900/50 flex flex-row justify-between items-center gap-4 shrink-0 backdrop-blur-md z-30">
           <div className="flex items-center gap-4 w-full">
              <h1 className="text-sm font-black italic uppercase flex items-center gap-2 text-zinc-400">
                  <Scale className="text-purple-500" size={16} /> Head-to-Head
              </h1>
              <div className="h-6 w-px bg-white/10 mx-2"></div>
              <div className="flex bg-zinc-900 p-0.5 rounded-lg border border-white/5">
                  {["All", "Lead", "Supporting", "Featured", "Ensemble"].map(filter => (
                      <button key={filter} onClick={() => setActiveFilter(filter)} className={`px-3 py-1 text-[10px] font-bold uppercase rounded transition-all ${activeFilter === filter ? 'bg-purple-600 text-white shadow-lg' : 'text-zinc-500 hover:text-zinc-300'}`}>{filter}</button>
                  ))}
              </div>
           </div>
        </header>
  
        <div className="flex-1 overflow-y-auto p-4 md:p-8 custom-scrollbar bg-zinc-950 space-y-12 pb-24 md:pb-8">
              {visibleRoles.length === 0 && (
                  <div className="flex flex-col items-center justify-center text-zinc-600 opacity-50 min-h-[300px]"><Filter size={48} className="mb-4" /><p>No roles match this filter.</p></div>
              )}
  
              {visibleRoles.map((role) => (
                 <div key={role.id} 
                      className="group relative"
                      onDragOver={(e) => e.preventDefault()}
                      onDrop={(e) => onDropActor(e, String(role.id))}
                 >
                    <div className="flex items-center gap-3 mb-4 pl-2 border-l-2 border-purple-500/50">
                      <h2 className="text-xl font-black uppercase text-white tracking-tighter italic">{role.name}</h2>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-zinc-800 text-zinc-400 border border-white/5">{role.type || "Role"}</span>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-zinc-800 text-zinc-500 border border-white/5">{role.actors?.length || 0} Candidates</span>
                    </div>
  
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
                                <th className="p-4 w-24 bg-zinc-900/50 border-b border-r border-white/5 text-[10px] font-black uppercase text-zinc-500 tracking-wider text-right align-bottom sticky left-0 z-10 backdrop-blur-sm">Candidate</th>
                                {role.actors.map((actor: any) => (
                                    <th key={actor.id} className="p-4 border-b border-r border-white/5 min-w-[140px] w-[160px] relative group/col">
                                      <div className="relative aspect-[3/4] rounded-lg overflow-hidden border border-white/10 shadow-lg mb-2">
                                          <img src={actor.headshot || "https://placehold.co/100x100/333/999?text=?"} className="w-full h-full object-cover" alt="" />
                                          <button onClick={() => onRemoveActor(role.id, actor.id)} className="absolute top-1 right-1 p-1.5 bg-black/60 text-zinc-400 hover:text-red-400 rounded-full opacity-0 group-hover/col:opacity-100 transition-opacity z-20"><X size={14} /></button>
                                      </div>
                                      <div className="text-center px-1"><p className="text-sm font-black leading-tight line-clamp-2 text-white">{actor.name}</p></div>
                                    </th>
                                ))}
                                <th className="p-4 border-b border-white/5 min-w-[50px] bg-zinc-900/30 border-dashed border-l border-white/10"></th>
                              </tr>
                            </thead>
                            <tbody className="text-xs font-bold text-zinc-300">
                                {METRICS.map((metric, i) => (
                                    <tr key={i} className="hover:bg-zinc-800/30 transition-colors">
                                        <td className="p-3 border-b border-r border-white/5 text-right text-zinc-500 uppercase text-[10px] sticky left-0 bg-zinc-900/90 backdrop-blur-sm z-10">{metric.label}</td>
                                        {role.actors.map((actor: any) => (<td key={actor.id} className="p-3 border-b border-r border-white/5 text-center">{metric.format(metric.getValue(actor))}</td>))}
                                        <td className="border-b border-white/5 bg-zinc-900/30 border-l border-dashed border-white/10"></td>
                                    </tr>
                                ))}
                                <tr className="bg-red-900/5">
                                    <td className="p-3 border-r border-white/5 text-right text-red-500/70 font-black uppercase text-[10px] align-top pt-4 sticky left-0 bg-zinc-900/90 backdrop-blur-sm z-10">Conflicts</td>
                                    {role.actors.map((actor: any) => (
                                        <td key={actor.id} className="p-3 border-r border-white/5 text-center align-top">
                                            {(actor.conflicts?.length > 0) ? (
                                                <div className="flex flex-col gap-1 items-center">
                                                    {actor.conflicts.slice(0, 3).map((c: string, i: number) => (
                                                        <div key={i} className="flex items-center gap-1 text-[9px] bg-red-500/10 text-red-400 border border-red-500/20 px-1.5 py-0.5 rounded w-fit max-w-[140px] truncate"><AlertOctagon size={8} className="shrink-0" /> {c}</div>
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
// 4. MAIN CLIENT
// ============================================================================
export default function CastingClient({ 
  assignments = [], 
  blueprintRoles = [], 
  allScenes = [], 
  roster = [],
  activeId 
}: CastingClientProps) {
  const router = useRouter();
  
  const [viewMode, setViewMode] = useState<"matrix" | "chemistry">("matrix");
  const [rows, setRows] = useState<AssignmentRow[]>(assignments);
  const [selectedStudent, setSelectedStudent] = useState<RosterStudent | null>(null);
  const [releasedIds, setReleasedIds] = useState<number[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const hasInitialized = useRef(false);

  useEffect(() => { setRows(assignments); }, [assignments]);

  // Init Grid
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

  // Actions
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

    // 1. CALCULATE ACTOR DIFFS
    // We compare the current 'rows' state vs the initial 'assignments' prop
    const actorChanges = rows.filter(row => {
      const original = assignments.find(a => a.id === row.id);
      const currentId = row.person?.[0]?.id;
      const originalId = original?.person?.[0]?.id;
      // It's changed if IDs don't match
      return currentId !== originalId;
    }).map(row => ({
      assignmentId: row.id,
      studentId: row.person?.[0]?.id || null // null means "Unassigned"
    }));

    // 2. CALCULATE SCENE DIFFS (The "Chiclets")
    const sceneChanges = rows
      .filter(row => row._pendingScenes) 
      .map(row => {
        const studentId = row.person?.[0]?.id;
        if (!studentId) return null; // Can't assign scenes to nobody

        const pendingIds = row._pendingScenes!.map(s => s.id);
        const savedIds = row.savedScenes?.map(s => s.id) || [];

        const added = pendingIds.filter(id => !savedIds.includes(id));
        const removed = savedIds.filter(id => !pendingIds.includes(id));

        if (added.length === 0 && removed.length === 0) return null;
        return { studentId, addedSceneIds: added, removedSceneIds: removed };
      })
      .filter(Boolean);

    // 3. FIRE & REFRESH
    if (actorChanges.length > 0 || sceneChanges.length > 0) {
      await saveCastingGrid(activeId, actorChanges, sceneChanges);
      router.refresh(); // This re-fetches data, making your new cast "Official"
    }

    setIsSaving(false);
  };

  const handleDropAssignment = (e: React.DragEvent, roleId: number) => {
    e.preventDefault();
    const actorIdStr = e.dataTransfer.getData("actorId");
    if (!actorIdStr) return;
    
    const actorId = parseInt(actorIdStr);
    const actor = roster.find(r => r.id === actorId);
    if (!actor) return;

    setRows(prevRows => prevRows.map(row => {
      if (row.id === roleId) {
        const newPerson = { id: actor.id, value: actor.name };
        return {
          ...row,
          person: [newPerson],
          auditionInfo: actor.auditionInfo,
          auditionGrades: actor.auditionGrades
        };
      }
      return row;
    }));
  };

  const handleRemoveActor = (roleId: number, actorId: number) => {
    setRows(prev => prev.map(r => {
      if (r.id === roleId) {
         return { ...r, person: r.person.filter(p => p.id !== actorId) };
      }
      return r;
    }));
  };

  // Mappers
  const getChemistryData = () => {
    return rows.map(row => {
        const bp = blueprintRoles.find(b => b.id === row.role?.[0]?.id);
        return {
            id: row.id,
            name: row.role?.[0]?.value || "Unknown",
            type: bp?.type || "Role", 
            actors: row.person?.map(p => {
                const richData = roster.find(r => r.id === p.id);
                return {
                    id: p.id,
                    name: p.value,
                    headshot: richData?.avatar || row.auditionInfo?.avatar,
                    vocalScore: richData?.vocalScore || row.auditionGrades?.vocal,
                    actingScore: richData?.actingScore || row.auditionGrades?.acting,
                    height: richData?.auditionInfo?.height || row.auditionInfo?.height,
                    age: richData?.auditionInfo?.age || row.auditionInfo?.age,
                    conflicts: (richData?.auditionInfo?.conflicts || row.auditionInfo?.conflicts)?.split(',') || []
                };
            }) || []
        };
    });
  };

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

  const activeStudentRow = selectedStudent 
    ? rows.find(r => r.person?.some(p => p.id === selectedStudent.id)) 
    : null;
const handlePrint = () => {
    window.print();
  };
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
      
      {/* 1. WRAPPER: Hides the interactive UI during print */}
      <div className="contents print:hidden">
      
          <RosterSidebar 
            students={roster} 
            rows={rows}
            allScenes={allScenes}
            onSelect={setSelectedStudent} 
            releasedIds={releasedIds}
            onToggleRelease={(id) => setReleasedIds(p => p.includes(id) ? p.filter(x => x!==id) : [...p, id])}
          />

          <div className="flex-1 flex flex-col min-w-0 overflow-hidden bg-zinc-950">
            
            {/* TOOLBAR */}
            <div className="flex justify-between items-center p-4 border-b border-zinc-800 bg-zinc-900/50">
              <div className="flex items-center gap-6">
                {/* ... Title & View Toggles (Unchanged) ... */}
                <div>
                    <h2 className="text-lg font-bold text-white">Casting Dashboard</h2>
                    <p className="text-xs text-zinc-500 font-mono mt-1">
                    {rows.length} ROLES • {allScenes.length} SCENES
                    </p>
                </div>
                {/* ... View Mode Buttons ... */}
                 <div className="flex bg-black/50 p-1 rounded-lg border border-white/5">
                    <button onClick={() => setViewMode("matrix")} className={`p-2 rounded flex items-center gap-2 text-xs font-bold uppercase transition-all ${viewMode === 'matrix' ? 'bg-zinc-800 text-white shadow' : 'text-zinc-500 hover:text-zinc-300'}`}><LayoutGrid size={14} /> <span className="hidden md:inline">Matrix</span></button>
                    <button onClick={() => setViewMode("chemistry")} className={`p-2 rounded flex items-center gap-2 text-xs font-bold uppercase transition-all ${viewMode === 'chemistry' ? 'bg-zinc-800 text-purple-400 shadow' : 'text-zinc-500 hover:text-zinc-300'}`}><Scale size={14} /> <span className="hidden md:inline">Chemistry</span></button>
                </div>
              </div>

              <div className="flex gap-2">
                
                {/* 2. PRINT BUTTON (Add this here) */}
                <button 
                  onClick={handlePrint}
                  className="p-2 text-zinc-400 hover:text-white bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 rounded transition-colors"
                  title="Print Cast List"
                >
                  <Printer size={16} />
                </button>

                <div className="w-px h-6 bg-zinc-800 mx-1"></div>

                <AutoCastButton 
                  rows={rows} 
                  roster={roster} 
                  onUpdateRows={setRows} 
                />

                <div className="w-px h-6 bg-zinc-800 mx-1"></div>

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

            {/* MAIN CONTENT AREA (Unchanged) */}
            {viewMode === "matrix" ? (
                // ... Matrix Table Code ...
                <div className="flex-1 overflow-y-auto custom-scrollbar p-4">
                    {/* ... table ... */}
                     <div className="border border-zinc-800 rounded-lg overflow-hidden">
                        <table className="w-full text-left border-collapse">
                        <thead className="bg-zinc-900 text-zinc-500 text-[10px] uppercase tracking-widest font-bold">
                            <tr>
                            <th className="p-3 border-b border-zinc-800 w-1/4 sticky left-0 bg-zinc-900 z-10 shadow-[2px_0_5px_rgba(0,0,0,0.5)]">Role Identity</th>
                            <th className="p-3 border-b border-zinc-800 w-1/4">Actor</th>
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
                                
                                <td 
                                    className="p-3 text-sm text-zinc-400 transition-colors relative"
                                    onDragOver={(e) => { e.preventDefault(); e.currentTarget.classList.add('bg-blue-500/20'); }}
                                    onDragLeave={(e) => { e.currentTarget.classList.remove('bg-blue-500/20'); }}
                                    onDrop={(e) => { e.currentTarget.classList.remove('bg-blue-500/20'); handleDropAssignment(e, row.id); }}
                                >
                                    {row.person?.[0] ? (
                                        <div className="flex items-center justify-between gap-2 group/cell">
                                            <button 
                                                onClick={() => {
                                                    const s = roster.find(x => x.id === row.person[0].id);
                                                    if(s) setSelectedStudent(s);
                                                }}
                                                className="flex items-center gap-3 text-left"
                                            >
                                                <img 
                                                src={row.auditionInfo?.avatar || "/placeholder.png"} 
                                                className="w-8 h-8 rounded-full object-cover border border-white/10" 
                                                alt="" 
                                                />
                                                <span className="text-emerald-400 hover:text-emerald-300 font-bold text-xs truncate">
                                                {row.person[0].value}
                                                </span>
                                            </button>
                                            
                                            <button 
                                                onClick={(e) => { e.stopPropagation(); handleRemoveActor(row.id, row.person[0].id); }}
                                                className="text-zinc-600 hover:text-red-400 opacity-0 group-hover/cell:opacity-100 transition-opacity p-1.5"
                                                title="Unassign"
                                            >
                                                <X size={14} />
                                            </button>
                                        </div>
                                    ) : (
                                        <div className="border-dashed border border-zinc-700 rounded px-2 py-2 text-[10px] text-zinc-600 text-center uppercase tracking-widest hover:border-zinc-500 transition-colors">
                                            Drop Actor
                                        </div>
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
                                            className={`w-2.5 h-4 rounded-[1px] transition-all duration-300 ${isActive ? (isDraft ? 'bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.5)]' : 'bg-emerald-500/80') : 'bg-zinc-800/50 hover:bg-zinc-700'}`}
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
                <ChemistryWorkspace 
                    roles={getChemistryData()} 
                    onRemoveActor={handleRemoveActor} 
                    onDropActor={(e: React.DragEvent, roleIdStr: string) => handleDropAssignment(e, parseInt(roleIdStr))}
                />
            )}
          </div>
      </div>

      {/* 3. INVISIBLE PRINT VIEW */}
      <CastingPrintView rows={rows} />

      {/* 4. MODALS (Unchanged) */}
      {selectedStudent && (
        <CallbackActorModal
          actor={{
            name: selectedStudent.name,
            ...selectedStudent.auditionInfo 
          }}
          grades={selectedStudent.auditionGrades}
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
    </div>
  );
}