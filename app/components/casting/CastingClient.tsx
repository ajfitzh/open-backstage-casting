/* eslint-disable react-hooks/set-state-in-effect */
"use client";

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { 
  Users, Filter, X, Check, Ruler, Scale, AlertOctagon, 
  LayoutGrid, Search, ArrowUpDown, MoreHorizontal,
  Archive, Undo, AlertCircle, Printer, Trash2, Plus,
  ArrowDownAZ, Music, Mic2, Theater, User, Users2
} from "lucide-react";

import { generateCastingRows, saveCastingGrid } from '@/app/lib/actions';
import CallbackActorModal from './CallbackActorModal';
import AutoCastButton from './AutoCastButton';
import CastingPrintView from './CastingPrintView';
import ChemistryWorkspace from './ChemistryWorkspace';

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

type ComplianceStatus = "uncast" | "at-risk" | "compliant";

// ============================================================================
// 2. HELPER FUNCTIONS (Extracted to remove component spaghetti)
// ============================================================================

const getActiveScenes = (row: AssignmentRow) => row._pendingScenes || row.savedScenes || [];

function getStudentCompliance(studentId: number, rows: AssignmentRow[], allScenes: Scene[]) {
  const myAssignments = rows.filter(r => r.person?.some(p => p.id === studentId));
  
  if (myAssignments.length === 0) {
    return { status: "uncast" as ComplianceStatus, sceneCount: 0, hasAct1: false, hasAct2: false };
  }

  const mySceneIds = new Set<number>();
  myAssignments.forEach(row => getActiveScenes(row).forEach(s => mySceneIds.add(s.id)));
  
  const sceneCount = mySceneIds.size;
  let hasAct1 = false;
  let hasAct2 = false;

  mySceneIds.forEach(sId => {
    const sceneDef = allScenes.find(s => s.id === sId);
    if (sceneDef?.act.includes("1")) hasAct1 = true;
    if (sceneDef?.act.includes("2")) hasAct2 = true;
  });

  const status: ComplianceStatus = (sceneCount < 3 || !hasAct1 || !hasAct2) ? "at-risk" : "compliant";
  return { status, sceneCount, hasAct1, hasAct2 };
}

function extractGender(student: RosterStudent): string {
  const info = student.auditionInfo || {};
  let raw = info.gender || info.Gender || info.sex || info.Sex || info["Student Gender"] || (student as any).gender;
  
  if (raw && typeof raw === 'object') {
    raw = Array.isArray(raw) ? (raw[0]?.value || raw[0]) : raw.value;
  }
  
  return String(raw || "").toLowerCase().trim();
}

// ============================================================================
// 3. SUB-COMPONENT: ROSTER SIDEBAR
// ============================================================================

function RosterSidebar({ 
  students, rows, allScenes, onSelect, releasedIds, onToggleRelease
}: { 
  students: RosterStudent[], rows: AssignmentRow[], allScenes: Scene[],
  onSelect: (s: RosterStudent) => void, releasedIds: number[], onToggleRelease: (id: number) => void
}) {
  const [search, setSearch] = useState("");
  const [activeTab, setActiveTab] = useState<"to-cast" | "in-progress" | "done">("to-cast");
  const [showReleased, setShowReleased] = useState(false);
  const [sortBy, setSortBy] = useState<"name" | "vocal" | "acting" | "dance">("name");
  const [genderFilter, setGenderFilter] = useState<"all" | "F" | "M">("all");

  const complianceMap = useMemo(() => {
    const map = new Map();
    students.forEach(s => map.set(s.id, getStudentCompliance(s.id, rows, allScenes)));
    return map;
  }, [students, rows, allScenes]);

  const filtered = useMemo(() => {
    return students.filter(s => {
        if (search && !s.name.toLowerCase().includes(search.toLowerCase())) return false;
        
        const isReleased = releasedIds.includes(s.id);
        if (showReleased) return isReleased; 
        if (isReleased) return false;        

        const stats = complianceMap.get(s.id);
        if (activeTab === "to-cast" && stats.status !== "uncast") return false;
        if (activeTab === "in-progress" && stats.status !== "at-risk") return false;
        if (activeTab === "done" && stats.status !== "compliant") return false;

        if (genderFilter !== "all") {
            const g = extractGender(s);
            if (genderFilter === "F" && !(g.startsWith("f") || g === "girl" || g === "woman" || g.includes("she"))) return false;
            if (genderFilter === "M" && !(g.startsWith("m") || g === "boy" || g === "man" || g.includes("he"))) return false;
        }
        return true;

    }).sort((a, b) => {
        if (sortBy === "name") return a.name.localeCompare(b.name);
        return (b[`${sortBy}Score` as keyof RosterStudent] as number || 0) - (a[`${sortBy}Score` as keyof RosterStudent] as number || 0);
    });
  }, [students, search, showReleased, releasedIds, activeTab, complianceMap, genderFilter, sortBy]);

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
         <button onClick={() => setActiveTab("to-cast")} className={`flex-1 py-3 text-[10px] font-black uppercase tracking-widest border-b-2 transition-all flex flex-col items-center gap-1 ${activeTab === 'to-cast' ? 'border-red-500 text-white bg-red-500/5' : 'border-transparent text-zinc-500 hover:text-zinc-300'}`}>
            To Cast <span className={`px-1.5 py-0.5 rounded text-[9px] ${activeTab === 'to-cast' ? 'bg-red-500 text-black' : 'bg-zinc-800'}`}>{counts.toCast}</span>
         </button>
         <button onClick={() => setActiveTab("in-progress")} className={`flex-1 py-3 text-[10px] font-black uppercase tracking-widest border-b-2 transition-all flex flex-col items-center gap-1 ${activeTab === 'in-progress' ? 'border-yellow-500 text-white bg-yellow-500/5' : 'border-transparent text-zinc-500 hover:text-zinc-300'}`}>
            Progress <span className={`px-1.5 py-0.5 rounded text-[9px] ${activeTab === 'in-progress' ? 'bg-yellow-500 text-black' : 'bg-zinc-800'}`}>{counts.inProgress}</span>
         </button>
         <button onClick={() => setActiveTab("done")} className={`flex-1 py-3 text-[10px] font-black uppercase tracking-widest border-b-2 transition-all flex flex-col items-center gap-1 ${activeTab === 'done' ? 'border-emerald-500 text-white bg-emerald-500/5' : 'border-transparent text-zinc-500 hover:text-zinc-300'}`}>
            Done <span className={`px-1.5 py-0.5 rounded text-[9px] ${activeTab === 'done' ? 'bg-emerald-500 text-black' : 'bg-zinc-800'}`}>{counts.done}</span>
         </button>
      </div>

      {/* FILTERS */}
      <div className="border-b border-zinc-800 bg-zinc-900/30">
        <div className="p-3 pb-2">
            <div className="relative">
                <Search size={12} className="absolute left-2 top-2 text-zinc-600" />
                <input type="text" placeholder="Search..." value={search} onChange={(e) => setSearch(e.target.value)} className="w-full bg-zinc-950 border border-zinc-800 rounded text-xs pl-7 py-1.5 text-white focus:outline-none focus:border-zinc-700" />
            </div>
        </div>
        <div className="px-3 pb-3 flex items-center justify-between gap-2">
            <div className="flex bg-zinc-950 rounded border border-zinc-800 p-0.5 gap-[1px]">
                <button onClick={() => setSortBy("name")} className={`px-2 py-1.5 rounded flex items-center justify-center ${sortBy === 'name' ? 'bg-zinc-800 text-white shadow' : 'text-zinc-500 hover:text-zinc-300'}`}><ArrowDownAZ size={12} /></button>
                <button onClick={() => setSortBy("vocal")} className={`px-2 py-1.5 rounded flex items-center justify-center ${sortBy === 'vocal' ? 'bg-blue-500/20 text-blue-400 shadow' : 'text-zinc-500 hover:text-zinc-300'}`}><Mic2 size={12} /></button>
                <button onClick={() => setSortBy("acting")} className={`px-2 py-1.5 rounded flex items-center justify-center ${sortBy === 'acting' ? 'bg-purple-500/20 text-purple-400 shadow' : 'text-zinc-500 hover:text-zinc-300'}`}><Theater size={12} /></button>
                <button onClick={() => setSortBy("dance")} className={`px-2 py-1.5 rounded flex items-center justify-center ${sortBy === 'dance' ? 'bg-pink-500/20 text-pink-400 shadow' : 'text-zinc-500 hover:text-zinc-300'}`}><Music size={12} /></button>
            </div>
            <div className="flex bg-zinc-950 rounded border border-zinc-800 p-0.5 gap-[1px]">
                <button onClick={() => setGenderFilter("all")} className={`px-2 py-1.5 rounded text-[9px] font-bold ${genderFilter === 'all' ? 'bg-zinc-800 text-white shadow' : 'text-zinc-500 hover:text-zinc-300'}`}>ALL</button>
                <button onClick={() => setGenderFilter("F")} className={`px-2.5 py-1.5 rounded text-[9px] font-bold ${genderFilter === 'F' ? 'bg-pink-500/20 text-pink-400 shadow' : 'text-zinc-500 hover:text-zinc-300'}`}>F</button>
                <button onClick={() => setGenderFilter("M")} className={`px-2.5 py-1.5 rounded text-[9px] font-bold ${genderFilter === 'M' ? 'bg-blue-500/20 text-blue-400 shadow' : 'text-zinc-500 hover:text-zinc-300'}`}>M</button>
            </div>
        </div>
      </div>

      {/* LIST */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2 custom-scrollbar bg-zinc-950/50">
        {filtered.length === 0 && <div className="text-center py-10 text-zinc-600 text-xs italic">No students match filter.</div>}
        {filtered.map(student => {
           const stats = complianceMap.get(student.id);
           let borderClass = "border-zinc-800"; 
           if (!showReleased) {
               if (stats.status === "uncast") borderClass = "border-red-500/50 hover:border-red-500";
               else if (stats.status === "at-risk") borderClass = "border-yellow-500/50 hover:border-yellow-500";
               else borderClass = "border-emerald-500/50 hover:border-emerald-500";
           }
           return (
            <div key={student.id} draggable={!showReleased} onClick={() => onSelect(student)} onDragStart={(e) => e.dataTransfer.setData("actorId", String(student.id))} className={`group bg-zinc-900 border-l-4 p-3 rounded-r-lg flex items-center gap-3 cursor-grab hover:bg-zinc-800 transition-all shadow-sm ${borderClass} ${showReleased ? 'opacity-60 grayscale' : ''}`}>
                <div className="relative w-10 h-10 shrink-0">
                    <img src={student.avatar || "https://placehold.co/100x100/222/888?text=?"} alt={student.name} className="w-full h-full rounded-full object-cover border border-white/10" />
                    {sortBy !== 'name' && (
                        <div className={`absolute -bottom-1 -right-1 w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-bold border border-zinc-900 text-white ${sortBy === 'vocal' ? 'bg-blue-500' : sortBy === 'acting' ? 'bg-purple-500' : 'bg-pink-500'}`}>
                            {Math.round(student[`${sortBy}Score` as keyof RosterStudent] as number || 0)}
                        </div>
                    )}
                </div>
                <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-start">
                        <div className="text-xs font-bold text-zinc-200 truncate">{student.name}</div>
                        <button onClick={(e) => { e.stopPropagation(); onToggleRelease(student.id); }} className="text-zinc-600 hover:text-white opacity-0 group-hover:opacity-100 transition-opacity">
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
                    {(stats.status === "uncast" || showReleased) && <div className="text-[10px] text-zinc-500 mt-0.5">{showReleased ? "Released" : "Not yet assigned"}</div>}
                </div>
            </div>
           );
        })}
      </div>
      <div className="p-2 border-t border-zinc-800 bg-zinc-900/50">
        <button onClick={() => setShowReleased(!showReleased)} className={`w-full flex items-center justify-center gap-2 py-2 rounded text-[10px] font-bold uppercase tracking-widest transition-colors ${showReleased ? 'bg-zinc-800 text-white' : 'text-zinc-600 hover:text-zinc-400'}`}>
            <Archive size={12} /> {showReleased ? "View Active Pool" : "View Released"}
        </button>
      </div>
    </aside>
  );
}

// ============================================================================
// 4. MAIN CLIENT
// ============================================================================

export default function CastingClient({ assignments = [], blueprintRoles = [], allScenes = [], roster = [], activeId }: CastingClientProps) {
  const router = useRouter();
  
  const [viewMode, setViewMode] = useState<"matrix" | "chemistry">("matrix");
  const [rows, setRows] = useState<AssignmentRow[]>(assignments);
  const [selectedStudent, setSelectedStudent] = useState<RosterStudent | null>(null);
  const [releasedIds, setReleasedIds] = useState<number[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [deletedRowIds, setDeletedRowIds] = useState<number[]>([]);
  const hasInitialized = useRef(false);

  useEffect(() => { setRows(assignments); }, [assignments]);

  useEffect(() => {
    // If we have assignments, or if we already tried to initialize, do nothing
    if (assignments.length > 0 || hasInitialized.current) {
        setIsLoading(false);
        return;
    }
    
    hasInitialized.current = true;
    setIsLoading(true);
    
    generateCastingRows(activeId).then(res => {
      if (res.success) {
          router.refresh(); 
      }
      // ALWAYS turn off the loading spinner when done, success or fail
      setIsLoading(false); 
    }).catch(() => {
        setIsLoading(false);
    });
  }, [assignments.length, activeId, router]);

  useEffect(() => { if (assignments.length > 0 && isLoading) setIsLoading(false); }, [assignments.length, isLoading]);

  // --- ACTIONS ---

  const handleAddRole = () => {
    const name = prompt("Enter new Role Name (e.g. 'Marching Winkies')");
    if (!name) return;
    setRows([{ id: -Date.now(), role: [{ id: -1, value: name }], person: [], production: [{ id: activeId }], _pendingScenes: [] }, ...rows]); 
  };

  const handleDeleteRole = (id: number) => {
    if (!confirm("Are you sure you want to delete this role?")) return;
    if (id > 0) setDeletedRowIds(prev => [...prev, id]);
    setRows(prev => prev.filter(r => r.id !== id));
  };

  const handleDraftAutoFill = () => {
    setRows(rows.map((row) => {
      const blueprint = blueprintRoles.find(bp => bp.id === row.role?.[0]?.id);
      if (blueprint?.activeScenes?.length && (!row._pendingScenes || row._pendingScenes.length === 0)) {
        return { ...row, _pendingScenes: blueprint.activeScenes };
      }
      return row;
    }));
  };

  const handleSave = async () => {
    setIsSaving(true);
    
    const actorChanges = rows.filter(row => row.id > 0 && (row.person?.map(p => p.id).sort().join(',') !== assignments.find(a => a.id === row.id)?.person?.map(p => p.id).sort().join(',')))
      .map(row => ({ assignmentId: row.id, studentIds: row.person?.map(p => p.id) || [] }));

    const sceneChanges = rows.filter(row => row.id > 0 && row._pendingScenes).map(row => {
        const pendingIds = row._pendingScenes!.map(s => s.id);
        const savedIds = row.savedScenes?.map(s => s.id) || [];
        const added = pendingIds.filter(id => !savedIds.includes(id));
        const removed = savedIds.filter(id => !pendingIds.includes(id));
        return (added.length || removed.length) ? { assignmentId: row.id, addedSceneIds: added, removedSceneIds: removed } : null;
    }).filter(Boolean);

    const createdRows = rows.filter(r => r.id < 0).map(r => ({
        roleName: r.role[0].value, assignedStudentIds: r.person.map(p => p.id), sceneIds: r._pendingScenes?.map(s => s.id) || []
    }));

    if (actorChanges.length || sceneChanges.length || deletedRowIds.length || createdRows.length) {
      await saveCastingGrid(activeId, actorChanges, sceneChanges, deletedRowIds, createdRows);
      setDeletedRowIds([]);
      router.refresh(); 
    }
    setIsSaving(false);
  };

  const handleDropAssignment = (e: React.DragEvent, roleId: number) => {
    e.preventDefault();
    const actorId = parseInt(e.dataTransfer.getData("actorId"));
    const actor = roster.find(r => r.id === actorId);
    if (!actor) return;
    setRows(prev => prev.map(row => (row.id === roleId && !row.person?.some(p => p.id === actor.id)) 
      ? { ...row, person: [...(row.person || []), { id: actor.id, value: actor.name }], auditionInfo: actor.auditionInfo, auditionGrades: actor.auditionGrades } 
      : row
    ));
  };

  const handleRemoveActor = (roleId: number, actorId: number) => {
    setRows(prev => prev.map(r => r.id === roleId ? { ...r, person: r.person.filter(p => p.id !== actorId) } : r));
  };

  const handlePromoteActor = (roleId: number, actorId: number) => {
    setRows(prev => prev.map(r => r.id === roleId ? { ...r, person: [r.person?.find(p => p.id === actorId)!].filter(Boolean) } : r));
  };

  const handleToggleScene = (rowId: number, scene: Scene) => {
    setRows(prev => prev.map(row => {
      if (row.id !== rowId) return row;
      const currentList = getActiveScenes(row);
      const isPresent = currentList.some(s => s.id === scene.id);
      return { ...row, _pendingScenes: isPresent ? currentList.filter(s => s.id !== scene.id) : [...currentList, { id: scene.id, value: scene.name }] };
    }));
  };

  // --- MAPPERS ---
  const getChemistryData = () => rows.map(row => ({
      id: row.id, name: row.role?.[0]?.value || "Unknown", type: blueprintRoles.find(b => b.id === row.role?.[0]?.id)?.type || "Role", 
      actors: row.person?.map(p => {
          const rData = roster.find(r => r.id === p.id);
          return { id: p.id, name: p.value, headshot: rData?.avatar || row.auditionInfo?.avatar, vocalScore: rData?.vocalScore || row.auditionGrades?.vocal, actingScore: rData?.actingScore || row.auditionGrades?.acting, height: rData?.auditionInfo?.height || row.auditionInfo?.height, age: rData?.auditionInfo?.age || row.auditionInfo?.age, conflicts: (rData?.auditionInfo?.conflicts || row.auditionInfo?.conflicts)?.split(',') || [] };
      }) || []
  }));

  const getStudentTimeline = (studentId: number) => {
    const studentRoles = rows.filter(r => r.person?.some(p => p.id === studentId));
    return allScenes.map(scene => {
      const activeRoleRow = studentRoles.find(row => getActiveScenes(row).some(s => s.id === scene.id));
      return { scene, roleName: activeRoleRow?.role?.[0]?.value || null, color: activeRoleRow ? `hsl(${(activeRoleRow.role?.[0]?.value.length * 40) % 360}, 70%, 50%)` : 'transparent' };
    });
  };

  if (isLoading) return (
      <div className="flex flex-col items-center justify-center h-full space-y-4 text-zinc-400">
         <div className="animate-spin h-8 w-8 border-4 border-blue-500 rounded-full border-t-transparent"></div>
         <p className="text-xs uppercase tracking-widest">Initializing Grid...</p>
      </div>
  );

  return (
    <div className="flex h-[calc(100vh-4rem)] relative">
      <div className="contents print:hidden">
          <RosterSidebar students={roster} rows={rows} allScenes={allScenes} onSelect={setSelectedStudent} releasedIds={releasedIds} onToggleRelease={(id) => setReleasedIds(p => p.includes(id) ? p.filter(x => x!==id) : [...p, id])} />
          
          <div className="flex-1 flex flex-col min-w-0 overflow-hidden bg-zinc-950">
            {/* TOOLBAR */}
            <div className="flex justify-between items-center p-4 border-b border-zinc-800 bg-zinc-900/50">
              <div className="flex items-center gap-6">
                <div>
                    <h2 className="text-lg font-bold text-white">Casting Dashboard</h2>
                    <p className="text-xs text-zinc-500 font-mono mt-1">{rows.length} ROLES • {allScenes.length} SCENES</p>
                </div>
                 <div className="flex bg-black/50 p-1 rounded-lg border border-white/5">
                    <button onClick={() => setViewMode("matrix")} className={`p-2 rounded flex items-center gap-2 text-xs font-bold uppercase transition-all ${viewMode === 'matrix' ? 'bg-zinc-800 text-white shadow' : 'text-zinc-500 hover:text-zinc-300'}`}><LayoutGrid size={14} /> <span className="hidden md:inline">Matrix</span></button>
                    <button onClick={() => setViewMode("chemistry")} className={`p-2 rounded flex items-center gap-2 text-xs font-bold uppercase transition-all ${viewMode === 'chemistry' ? 'bg-zinc-800 text-purple-400 shadow' : 'text-zinc-500 hover:text-zinc-300'}`}><Scale size={14} /> <span className="hidden md:inline">Chemistry</span></button>
                </div>
              </div>
              <div className="flex gap-2">
                <button onClick={() => window.print()} className="p-2 text-zinc-400 hover:text-white bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 rounded transition-colors" title="Print Cast List"><Printer size={16} /></button>
                <button onClick={handleAddRole} className="p-2 text-zinc-400 hover:text-emerald-400 bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 rounded transition-colors" title="Add New Role"><Plus size={16} /></button>
                <div className="w-px h-6 bg-zinc-800 mx-1"></div>
                <AutoCastButton rows={rows} roster={roster} blueprintRoles={blueprintRoles} allScenes={allScenes} releasedIds={releasedIds} onUpdateRows={setRows} />
                <div className="w-px h-6 bg-zinc-800 mx-1"></div>
                <button onClick={handleDraftAutoFill} className="px-3 py-1.5 text-xs font-bold uppercase tracking-wider text-blue-400 bg-blue-500/10 border border-blue-500/20 rounded hover:bg-blue-500/20 transition-all">Reset to Defaults</button>
                <button onClick={handleSave} disabled={isSaving} className="px-3 py-1.5 text-xs font-bold uppercase tracking-wider text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 rounded hover:bg-emerald-500/20 transition-all disabled:opacity-50">{isSaving ? "Saving..." : "Save Changes"}</button>
              </div>
            </div>

            {viewMode === "matrix" ? (
                <div className="flex-1 overflow-y-auto custom-scrollbar p-4">
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
                            const effectiveList = getActiveScenes(row);
                            const isDraft = !!row._pendingScenes;
                            return (
                                <tr key={row.id} className="hover:bg-zinc-800/50 transition-colors group">
                                <td className="p-3 text-sm font-medium text-zinc-200 sticky left-0 bg-zinc-950 group-hover:bg-zinc-900 transition-colors z-10 border-r border-zinc-800/50">
                                    <div className="flex justify-between items-center group/title">
                                        <span>{row.role?.[0]?.value || <span className="text-red-500">No Role</span>}</span>
                                        <button onClick={() => handleDeleteRole(row.id)} className="text-zinc-700 hover:text-red-500 opacity-0 group-hover/title:opacity-100 transition-opacity" title="Delete Role"><Trash2 size={12} /></button>
                                    </div>
                                </td>
                                
                                <td 
                                    className="p-3 text-sm text-zinc-400 transition-colors relative"
                                    onDragOver={(e) => { e.preventDefault(); e.currentTarget.classList.add('bg-blue-500/20'); }}
                                    onDragLeave={(e) => { e.currentTarget.classList.remove('bg-blue-500/20'); }}
                                    onDrop={(e) => { e.currentTarget.classList.remove('bg-blue-500/20'); handleDropAssignment(e, row.id); }}
                                >
                                    {row.person && row.person.length > 0 ? (
                                        <div className="flex items-center pl-2">
                                            {row.person.map((p) => {
                                                const actorData = roster.find(r => r.id === p.id);
                                                return (
                                                    <div 
                                                        key={p.id} 
                                                        className={`relative group/avatar -ml-3 first:ml-0 hover:z-20 hover:scale-110 transition-transform cursor-pointer`}
                                                        onClick={(e) => { e.stopPropagation(); if(actorData) setSelectedStudent(actorData); }}
                                                    >
                                                        <img src={actorData?.avatar || row.auditionInfo?.avatar || "/placeholder.png"} alt={p.value} className="w-10 h-10 rounded-full object-cover border-2 border-zinc-900 shadow-sm" title={p.value} />
                                                        <div className="absolute bottom-full left-1/2 -translate-x-1/2 pb-2 hidden group-hover/avatar:flex flex-col items-center z-30">
                                                            <div className="flex items-center gap-2 bg-zinc-950 border border-zinc-800 text-zinc-200 text-[10px] px-2 py-1 rounded shadow-xl whitespace-nowrap">
                                                                <span className="font-bold">{p.value}</span>
                                                                <button onClick={(e) => { e.stopPropagation(); handleRemoveActor(row.id, p.id); }} className="text-red-400 hover:text-red-300 bg-red-500/10 p-1 rounded-full transition-colors"><X size={10} /></button>
                                                            </div>
                                                            <div className="w-2 h-2 bg-zinc-950 border-r border-b border-zinc-800 rotate-45 -mt-1 transform translate-y-[-3px]"></div>
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    ) : <div className="border-dashed border border-zinc-700 rounded px-2 py-2 text-[10px] text-zinc-600 text-center uppercase tracking-widest hover:border-zinc-500 transition-colors">Drop Actor</div>}
                                </td>
                                <td className="p-3">
                                    <div className="flex items-center gap-[2px]">
                                    {allScenes.map(scene => {
                                        const isActive = effectiveList.some(s => s.id === scene.id);
                                        const colorClass = isActive ? (isDraft ? 'bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.5)] hover:bg-blue-400' : 'bg-emerald-500/80 hover:bg-emerald-400') : 'bg-zinc-800/50 hover:bg-zinc-600'; 
                                        return <button key={scene.id} onClick={() => handleToggleScene(row.id, scene)} title={`${scene.name} • ${isActive ? 'Active' : 'Inactive'}`} className={`w-2.5 h-4 rounded-[1px] transition-all duration-150 ${colorClass}`} />;
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
                <ChemistryWorkspace roles={getChemistryData()} onRemoveActor={handleRemoveActor} onPromoteActor={handlePromoteActor} onDropActor={(e: React.DragEvent, roleIdStr: string) => handleDropAssignment(e, parseInt(roleIdStr))} />
            )}
          </div>
      </div>
      <CastingPrintView rows={rows} />
      {selectedStudent && (
        <CallbackActorModal
          actor={{ name: selectedStudent.name, ...selectedStudent.auditionInfo }}
          grades={selectedStudent.auditionGrades}
          onClose={() => setSelectedStudent(null)}
          timeline={
            <div className="h-16 w-full flex rounded-lg overflow-hidden border border-zinc-700 mt-2">
              {getStudentTimeline(selectedStudent.id).map((slot, i) => (
                <div key={i} className="flex-1 h-full flex items-center justify-center group relative border-r border-black/10 last:border-0 hover:brightness-110 transition-all" style={{ backgroundColor: slot.roleName ? slot.color : '#18181b' }}>
                  {slot.roleName && <span className="text-[10px] font-bold text-white/90 -rotate-90 whitespace-nowrap opacity-50 group-hover:opacity-100">{slot.roleName}</span>}
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
