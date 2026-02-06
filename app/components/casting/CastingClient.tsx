"use client";

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { 
  Users, Filter, X, Check, Ruler, Scale, AlertOctagon, 
  LayoutGrid, Search, ArrowUpDown, MoreHorizontal 
} from "lucide-react";
import { generateCastingRows, syncCastingChanges } from '@/app/lib/actions';
import CallbackActorModal from './CallbackActorModal';

// --- TYPES ---
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
type Scene = { id: number; name: string; order: number; };

interface CastingClientProps {
  assignments: AssignmentRow[];
  blueprintRoles: BlueprintRole[];
  allScenes: Scene[];
  roster: RosterStudent[];
  activeId: number; 
}

// ------------------------------------------------------------------
// 🧩 SUB-COMPONENT: ROSTER SIDEBAR (The Left Column)
// ------------------------------------------------------------------
function RosterSidebar({ 
  students, 
  onSelect, 
  assignedCounts 
}: { 
  students: RosterStudent[], 
  onSelect: (s: RosterStudent) => void, 
  assignedCounts: Record<number, number> 
}) {
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState<"name" | "score">("name");

  // Filter & Sort Logic
  const filtered = students
    .filter(s => s.name.toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) => {
      if (sort === "score") {
        const scoreA = (a.vocalScore || 0) + (a.actingScore || 0) + (a.danceScore || 0);
        const scoreB = (b.vocalScore || 0) + (b.actingScore || 0) + (b.danceScore || 0);
        return scoreB - scoreA;
      }
      return a.name.localeCompare(b.name);
    });

  return (
    <aside className="w-72 border-r border-zinc-800 flex flex-col bg-zinc-950 shrink-0 h-full">
      {/* HEADER */}
      <div className="p-4 border-b border-zinc-800 bg-zinc-900/20">
        <div className="flex justify-between items-end mb-3">
           <h2 className="text-xs font-black uppercase tracking-widest text-zinc-500">Audition Pool</h2>
           <span className="text-xs font-bold text-zinc-400">{filtered.length} Actors</span>
        </div>
        
        {/* SEARCH & SORT TOOLS */}
        <div className="flex gap-2">
            <div className="relative flex-1">
                <Search size={12} className="absolute left-2 top-2 text-zinc-600" />
                <input 
                  type="text" 
                  placeholder="Search..." 
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full bg-zinc-900 border border-zinc-800 rounded text-xs pl-7 py-1.5 text-white focus:outline-none focus:border-zinc-700 placeholder:text-zinc-600"
                />
            </div>
            <button 
                onClick={() => setSort(s => s === "name" ? "score" : "name")}
                className={`p-1.5 border rounded transition-colors ${sort === 'score' ? 'bg-blue-500/10 border-blue-500/50 text-blue-400' : 'bg-zinc-900 border-zinc-800 text-zinc-500 hover:text-white'}`}
                title={`Sort by ${sort === 'name' ? 'Score' : 'Name'}`}
            >
                <ArrowUpDown size={12} />
            </button>
        </div>
      </div>

      {/* STUDENT LIST */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2 custom-scrollbar">
        {filtered.map(student => {
           const count = assignedCounts[student.id] || 0;
           return (
            <div 
                key={student.id}
                draggable="true"
                onClick={() => onSelect(student)}
                onDragStart={(e) => e.dataTransfer.setData("actorId", String(student.id))}
                className="group bg-zinc-900 border border-zinc-800/50 p-2 rounded-xl flex items-center gap-3 cursor-grab active:cursor-grabbing hover:bg-zinc-800 hover:border-zinc-700 transition-all shadow-sm"
            >
                {/* AVATAR */}
                <div className="relative w-9 h-9 shrink-0">
                    <img 
                        src={student.avatar || "https://placehold.co/100x100/222/888?text=?"} 
                        alt={student.name} 
                        className="w-full h-full rounded-full object-cover border border-white/10 group-hover:border-white/30 transition-colors"
                    />
                    {/* ASSIGNED BADGE */}
                    {count > 0 && (
                        <div className="absolute -top-1 -right-1 w-4 h-4 bg-blue-600 rounded-full text-[9px] font-bold flex items-center justify-center text-white border-2 border-zinc-900 shadow-md">
                            {count}
                        </div>
                    )}
                </div>
                
                {/* INFO */}
                <div className="flex-1 min-w-0">
                    <div className="text-xs font-bold text-zinc-300 truncate group-hover:text-white transition-colors">{student.name}</div>
                    
                    {/* MINI SCORES (Visual Indicator) */}
                    <div className="flex items-center gap-1 mt-1 opacity-60 group-hover:opacity-100 transition-opacity">
                       <div title={`Vocal: ${student.vocalScore}`} className={`w-1.5 h-1.5 rounded-full ${student.vocalScore >= 4 ? 'bg-emerald-500' : 'bg-zinc-700'}`} />
                       <div title={`Acting: ${student.actingScore}`} className={`w-1.5 h-1.5 rounded-full ${student.actingScore >= 4 ? 'bg-purple-500' : 'bg-zinc-700'}`} />
                       <div title={`Dance: ${student.danceScore}`} className={`w-1.5 h-1.5 rounded-full ${student.danceScore >= 4 ? 'bg-blue-500' : 'bg-zinc-700'}`} />
                    </div>
                </div>
                
                {/* HOVER ACTION */}
                <div className="opacity-0 group-hover:opacity-100 text-zinc-500 -mr-1 transition-opacity">
                   <MoreHorizontal size={14} />
                </div>
            </div>
           );
        })}
      </div>
    </aside>
  );
}

// ------------------------------------------------------------------
// 🚀 MAIN CLIENT COMPONENT
// ------------------------------------------------------------------
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

  // Helper: Get student track
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

  // Count Assignments for Roster Badge
  const assignedCounts = rows.reduce((acc, row) => {
      row.person?.forEach(p => {
          acc[p.id] = (acc[p.id] || 0) + 1;
      });
      return acc;
  }, {} as Record<number, number>);

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
      
      {/* 1. LEFT SIDEBAR: ROSTER */}
      <RosterSidebar 
        students={roster} 
        onSelect={setSelectedStudent} 
        assignedCounts={assignedCounts} 
      />

      {/* 2. MAIN CONTENT */}
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
            
            {/* VIEW TOGGLE */}
            <div className="flex bg-black/50 p-1 rounded-lg border border-white/5">
                <button 
                    onClick={() => setViewMode("matrix")}
                    className={`p-2 rounded flex items-center gap-2 text-xs font-bold uppercase transition-all ${viewMode === 'matrix' ? 'bg-zinc-800 text-white shadow' : 'text-zinc-500 hover:text-zinc-300'}`}
                >
                    <LayoutGrid size={14} /> <span className="hidden md:inline">Matrix</span>
                </button>
                <button 
                    onClick={() => setViewMode("chemistry")}
                    className={`p-2 rounded flex items-center gap-2 text-xs font-bold uppercase transition-all ${viewMode === 'chemistry' ? 'bg-zinc-800 text-purple-400 shadow' : 'text-zinc-500 hover:text-zinc-300'}`}
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

        {/* CONTENT */}
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
                                    onClick={() => {
                                        const rosterStudent = roster.find(s => s.id === row.person[0].id);
                                        if(rosterStudent) setSelectedStudent(rosterStudent);
                                    }}
                                    className="text-emerald-400 hover:text-emerald-300 hover:underline text-left font-bold"
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
            // Insert Chemistry Workspace Logic Here
            <div className="flex items-center justify-center h-full text-zinc-500">Chemistry View Placeholder</div>
        )}
      </div>

      {/* 3. MODAL: GLOBAL (Works for Roster Click OR Grid Click) */}
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