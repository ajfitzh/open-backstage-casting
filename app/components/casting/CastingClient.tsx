"use client";

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { 
  Users, Filter, X, Check, Ruler, Scale, AlertOctagon, 
  LayoutGrid, Search, ArrowUpDown, MoreHorizontal,
  Archive, Undo, AlertCircle, Printer, Trash2, Plus
} from "lucide-react";
import { generateCastingRows, saveCastingGrid } from '@/app/lib/actions';
import CallbackActorModal from './CallbackActorModal';
import AutoCastButton from './AutoCastButton';
import CastingPrintView from './CastingPrintView';
import ChemistryWorkspace from './ChemistryWorkspace'; // 👈 NEW IMPORT

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
    // Prefer pending scenes (draft) over saved scenes
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
    if (showReleased) return isReleased; 
    if (isReleased) return false;        

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
  
  // Track Deletions for Server Sync
  const [deletedRowIds, setDeletedRowIds] = useState<number[]>([]);
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

  // ----------------------------------------------------------------
  // ACTIONS
  // ----------------------------------------------------------------

  // 1. Add New Role (Client Side Only until Saved)
  const handleAddRole = () => {
    const name = prompt("Enter new Role Name (e.g. 'Marching Winkies')");
    if (!name) return;

    const newRow: AssignmentRow = {
      id: -Date.now(), // Negative ID = New
      role: [{ id: -1, value: name }], 
      person: [],
      production: [{ id: activeId }],
      _pendingScenes: [], 
    };

    setRows([newRow, ...rows]); 
  };

  // 2. Delete Role
  const handleDeleteRole = (id: number) => {
    if (!confirm("Are you sure you want to delete this role?")) return;
    
    // Only track deletions for real database rows (positive IDs)
    if (id > 0) {
        setDeletedRowIds(prev => [...prev, id]);
    }
    setRows(prev => prev.filter(r => r.id !== id));
  };

  // 3. Draft Default Scenes
  const handleDraftAutoFill = () => {
    const draftState = rows.map((row) => {
      const roleId = row.role?.[0]?.id;
      const blueprint = blueprintRoles.find(bp => bp.id === roleId);
      // Only autofill if not already customized
      if (blueprint && blueprint.activeScenes?.length > 0 && (!row._pendingScenes || row._pendingScenes.length === 0)) {
        return { ...row, _pendingScenes: blueprint.activeScenes };
      }
      return row;
    });
    setRows(draftState);
  };

  // 4. Save to Server
  const handleSave = async () => {
    setIsSaving(true);

    // A. Actor Changes
    const actorChanges = rows.filter(row => {
      if (row.id < 0) return false; // Ignore new rows here, handled in createdRows
      const original = assignments.find(a => a.id === row.id);
      const currentIds = row.person?.map(p => p.id).sort().join(',') || "";
      const originalIds = original?.person?.map(p => p.id).sort().join(',') || "";
      return currentIds !== originalIds;
    }).map(row => ({
      assignmentId: row.id,
      studentIds: row.person?.map(p => p.id) || [] 
    }));

    // B. Scene Changes
    const sceneChanges = rows
      .filter(row => row.id > 0 && row._pendingScenes) 
      .map(row => {
        const pendingIds = row._pendingScenes!.map(s => s.id);
        const savedIds = row.savedScenes?.map(s => s.id) || [];
        const added = pendingIds.filter(id => !savedIds.includes(id));
        const removed = savedIds.filter(id => !pendingIds.includes(id));
        if (added.length === 0 && removed.length === 0) return null;
        return { assignmentId: row.id, addedSceneIds: added, removedSceneIds: removed };
      })
      .filter(Boolean);

    // C. New Created Rows
    const createdRows = rows
        .filter(r => r.id < 0)
        .map(r => ({
            roleName: r.role[0].value,
            assignedStudentIds: r.person.map(p => p.id),
            sceneIds: r._pendingScenes?.map(s => s.id) || []
        }));

    // Fire Sync
    if (actorChanges.length > 0 || sceneChanges.length > 0 || deletedRowIds.length > 0 || createdRows.length > 0) {
      // @ts-ignore - Assuming server action signature updated to accept deleted/created
      await saveCastingGrid(activeId, actorChanges, sceneChanges, deletedRowIds, createdRows);
      setDeletedRowIds([]);
      router.refresh(); 
    }

    setIsSaving(false);
  };

  // ----------------------------------------------------------------
  // DRAG & DROP HANDLERS
  // ----------------------------------------------------------------

  const handleDropAssignment = (e: React.DragEvent, roleId: number) => {
    e.preventDefault();
    const actorIdStr = e.dataTransfer.getData("actorId");
    if (!actorIdStr) return;
    
    const actorId = parseInt(actorIdStr);
    const actor = roster.find(r => r.id === actorId);
    if (!actor) return;

    setRows(prevRows => prevRows.map(row => {
      if (row.id === roleId) {
        // Prevent duplicates
        if (row.person?.some(p => p.id === actor.id)) return row;

        const newPerson = { id: actor.id, value: actor.name };
        return {
          ...row,
          person: [...(row.person || []), newPerson],
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

  // NEW: "Pick the Winner" - Removes all other actors from this role
  const handlePromoteActor = (roleId: number, actorId: number) => {
    setRows(prev => prev.map(r => {
      if (r.id === roleId) {
         // Find the winner's full data from the current list
         const winner = r.person?.find(p => p.id === actorId);
         if (!winner) return r;
         
         // Nuke everyone else, keep only the winner
         return { ...r, person: [winner] };
      }
      return r;
    }));
  };

  // ----------------------------------------------------------------
  // SCENE TOGGLE HANDLER (THE "CHICLET" LOGIC)
  // ----------------------------------------------------------------
  const handleToggleScene = (rowId: number, scene: Scene) => {
    setRows(prev => prev.map(row => {
      if (row.id !== rowId) return row;

      const currentList = row._pendingScenes ?? row.savedScenes ?? [];
      const isPresent = currentList.some(s => s.id === scene.id);

      let newList;
      if (isPresent) {
        newList = currentList.filter(s => s.id !== scene.id);
      } else {
        newList = [...currentList, { id: scene.id, value: scene.name }];
      }

      // Setting _pendingScenes triggers "Draft Mode" (Blue)
      return { ...row, _pendingScenes: newList };
    }));
  };

  // ----------------------------------------------------------------
  // MAPPERS
  // ----------------------------------------------------------------

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

  const handlePrint = () => { window.print(); };

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

          {/* MAIN CONTENT COLUMN (Right Side) */}
          <div className="flex-1 flex flex-col min-w-0 overflow-hidden bg-zinc-950">
            
            {/* TOOLBAR */}
            <div className="flex justify-between items-center p-4 border-b border-zinc-800 bg-zinc-900/50">
              <div className="flex items-center gap-6">
                {/* Title */}
                <div>
                    <h2 className="text-lg font-bold text-white">Casting Dashboard</h2>
                    <p className="text-xs text-zinc-500 font-mono mt-1">
                    {rows.length} ROLES • {allScenes.length} SCENES
                    </p>
                </div>
                {/* View Mode */}
                 <div className="flex bg-black/50 p-1 rounded-lg border border-white/5">
                    <button onClick={() => setViewMode("matrix")} className={`p-2 rounded flex items-center gap-2 text-xs font-bold uppercase transition-all ${viewMode === 'matrix' ? 'bg-zinc-800 text-white shadow' : 'text-zinc-500 hover:text-zinc-300'}`}><LayoutGrid size={14} /> <span className="hidden md:inline">Matrix</span></button>
                    <button onClick={() => setViewMode("chemistry")} className={`p-2 rounded flex items-center gap-2 text-xs font-bold uppercase transition-all ${viewMode === 'chemistry' ? 'bg-zinc-800 text-purple-400 shadow' : 'text-zinc-500 hover:text-zinc-300'}`}><Scale size={14} /> <span className="hidden md:inline">Chemistry</span></button>
                </div>
              </div>

              {/* ACTION BUTTONS */}
              <div className="flex gap-2">
                <button 
                  onClick={handlePrint}
                  className="p-2 text-zinc-400 hover:text-white bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 rounded transition-colors"
                  title="Print Cast List"
                >
                  <Printer size={16} />
                </button>
                
                {/* Add Role Button */}
                <button 
                  onClick={handleAddRole}
                  className="p-2 text-zinc-400 hover:text-emerald-400 bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 rounded transition-colors"
                  title="Add New Role"
                >
                  <Plus size={16} />
                </button>

                <div className="w-px h-6 bg-zinc-800 mx-1"></div>

                <AutoCastButton 
                  rows={rows} 
                  roster={roster} 
                  blueprintRoles={blueprintRoles} 
                  allScenes={allScenes}
                  releasedIds={releasedIds}       
                  onUpdateRows={setRows} 
                />

                <div className="w-px h-6 bg-zinc-800 mx-1"></div>

                <button 
                  onClick={handleDraftAutoFill}
                  className="px-3 py-1.5 text-xs font-bold uppercase tracking-wider text-blue-400 bg-blue-500/10 border border-blue-500/20 rounded hover:bg-blue-500/20 transition-all"
                >
                  Reset to Defaults
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

            {/* MAIN CONTENT AREA */}
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
                            const effectiveList = row._pendingScenes ?? row.savedScenes ?? [];
                            const isDraft = !!row._pendingScenes;

                            return (
                                <tr key={row.id} className="hover:bg-zinc-800/50 transition-colors group">
                                <td className="p-3 text-sm font-medium text-zinc-200 sticky left-0 bg-zinc-950 group-hover:bg-zinc-900 transition-colors z-10 border-r border-zinc-800/50">
                                    <div className="flex justify-between items-center group/title">
                                        <span>{row.role?.[0]?.value || <span className="text-red-500">No Role</span>}</span>
                                        <button 
                                            onClick={() => handleDeleteRole(row.id)}
                                            className="text-zinc-700 hover:text-red-500 opacity-0 group-hover/title:opacity-100 transition-opacity"
                                            title="Delete Role"
                                        >
                                            <Trash2 size={12} />
                                        </button>
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
                                                const avatarUrl = actorData?.avatar || row.auditionInfo?.avatar || "/placeholder.png";

                                                return (
                                                    <div 
                                                        key={p.id} 
                                                        className={`relative group/avatar -ml-3 first:ml-0 hover:z-20 hover:scale-110 transition-transform cursor-pointer`}
                                                        onClick={(e) => { e.stopPropagation(); if(actorData) setSelectedStudent(actorData); }}
                                                    >
                                                        <img 
                                                            src={avatarUrl} 
                                                            alt={p.value}
                                                            className="w-10 h-10 rounded-full object-cover border-2 border-zinc-900 shadow-sm"
                                                            title={p.value}
                                                        />
                                                        
                                                        {/* HOVER TOOLTIP FIX: pb-2 added for safe bridge */}
                                                        <div className="absolute bottom-full left-1/2 -translate-x-1/2 pb-2 hidden group-hover/avatar:flex flex-col items-center z-30">
                                                            <div className="flex items-center gap-2 bg-zinc-950 border border-zinc-800 text-zinc-200 text-[10px] px-2 py-1 rounded shadow-xl whitespace-nowrap">
                                                                <span className="font-bold">{p.value}</span>
                                                                <button 
                                                                    onClick={(e) => { e.stopPropagation(); handleRemoveActor(row.id, p.id); }}
                                                                    className="text-red-400 hover:text-red-300 bg-red-500/10 p-1 rounded-full transition-colors"
                                                                >
                                                                    <X size={10} />
                                                                </button>
                                                            </div>
                                                            <div className="w-2 h-2 bg-zinc-950 border-r border-b border-zinc-800 rotate-45 -mt-1 transform translate-y-[-3px]"></div>
                                                        </div>
                                                    </div>
                                                );
                                            })}
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
                                        const isActive = effectiveList.some(s => s.id === scene.id);
                                        
                                        // Visual Logic: Blue for Draft, Green for Saved
                                        let colorClass = 'bg-zinc-800/50 hover:bg-zinc-600'; 
                                        if (isActive) {
                                             if (isDraft) colorClass = 'bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.5)] hover:bg-blue-400';
                                             else colorClass = 'bg-emerald-500/80 hover:bg-emerald-400';
                                        }

                                        return (
                                            <button 
                                                key={scene.id}
                                                onClick={() => handleToggleScene(row.id, scene)}
                                                title={`${scene.name} • ${isActive ? 'Active' : 'Inactive'} (Click to toggle)`}
                                                className={`w-2.5 h-4 rounded-[1px] transition-all duration-150 ${colorClass}`}
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
                    onPromoteActor={handlePromoteActor} // 👈 NEW PROP PASSED
                    onDropActor={(e: React.DragEvent, roleIdStr: string) => handleDropAssignment(e, parseInt(roleIdStr))}
                />
            )}
          </div>
      </div>

      {/* 3. INVISIBLE PRINT VIEW */}
      <CastingPrintView rows={rows} />

      {/* 4. MODALS */}
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