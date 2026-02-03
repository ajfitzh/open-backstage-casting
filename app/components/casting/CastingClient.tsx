"use client";

import React, { useState, useMemo, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { 
  Search, Users, RefreshCw, Wand2, Trash2, Lock, 
  UserPlus, AlertTriangle, CheckCircle2, SortAsc, Layers, Save
} from 'lucide-react';
import { 
  syncCastingChanges, 
  clearCastingData, 
  generateCastingRows 
} from '@/app/lib/actions'; 
import CastingInspector from './CastingInspector';

// --- TYPES ---
interface Role {
  id: number;
  name: string;
  category: string;
  gender: string;
  defaultSceneIds: number[];
}

interface Assignment {
  id: number;
  roleId: number;
  roleName: string;
  studentId: number | null;
  studentName: string | null;
  activeSceneIds: number[];
}

interface Auditionee {
  id: number;
  name: string;
  headshot?: string;
  gender?: string;
  age?: string;
  totalScore?: number; 
  actingNotes?: boolean;
  musicNotes?: boolean;
}

interface Scene {
  id: number;
  name: string;
  order: number;
  act?: string;
}

interface CastingClientProps {
  assignments: Assignment[];
  roles: Role[];
  auditionees: Auditionee[];
  scenes: Scene[];
  activeId: number; 
  showStatus: string; 
}

export default function CastingClient({ 
  assignments = [], 
  roles = [], 
  auditionees = [], 
  scenes = [],
  activeId,
  showStatus = "Pre-Production"
}: CastingClientProps) {
  
  const router = useRouter();
  
  // 🟢 STATE: Working Copy vs Original (for Diffing)
  const [localAssignments, setLocalAssignments] = useState<Assignment[]>(assignments);
  const [originalAssignments, setOriginalAssignments] = useState<Assignment[]>(assignments);
  
  const [isSaving, setIsSaving] = useState(false); 
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedStudentId, setSelectedStudentId] = useState<number | null>(null);
  
  // Bench Filter State
  const [benchFilter, setBenchFilter] = useState<'all' | 'compliant' | 'needs_work'>('all');
  const [benchSort, setBenchSort] = useState<'name' | 'score'>('name');

  const isLocked = ['In Production', 'Post-Production', 'Archived', 'Closed'].includes(showStatus);

  // Sync state if props change (e.g. after a server revalidate)
  useEffect(() => {
    setLocalAssignments(assignments);
    setOriginalAssignments(assignments);
  }, [assignments]);

  // 🟢 CALCULATE UNSAVED CHANGES
  const hasUnsavedChanges = useMemo(() => {
    return JSON.stringify(localAssignments) !== JSON.stringify(originalAssignments);
  }, [localAssignments, originalAssignments]);


  // --- COMPLIANCE LOGIC (Runs on Local State) ---
  const getStudentStats = (studentId: number) => {
    const myAssignments = localAssignments.filter(a => a.studentId === studentId);
    const activeSceneIds = new Set(myAssignments.flatMap(a => a.activeSceneIds));
    const sceneCount = activeSceneIds.size;

    // Check Act Presence
    const inAct1 = Array.from(activeSceneIds).some(sId => scenes.find(s => s.id === sId)?.act === "1");
    const inAct2 = Array.from(activeSceneIds).some(sId => scenes.find(s => s.id === sId)?.act === "2");

    // Rule: Must be in >=3 Scenes AND in both Act 1 & 2
    const isCompliant = sceneCount >= 3 && inAct1 && inAct2;
    
    return { sceneCount, inAct1, inAct2, isCompliant, isCast: myAssignments.length > 0 };
  };

  // --- FILTERED LISTS ---

  // 1. Bench List
  const filteredBench = useMemo(() => {
    let list = [...auditionees];

    if (benchFilter === 'compliant') {
        list = list.filter(s => getStudentStats(s.id).isCompliant);
    } else if (benchFilter === 'needs_work') {
        list = list.filter(s => {
            const stats = getStudentStats(s.id);
            return !stats.isCompliant; 
        });
    }

    if (benchSort === 'score') {
        list.sort((a, b) => (b.totalScore || 0) - (a.totalScore || 0));
    } else {
        list.sort((a, b) => a.name.localeCompare(b.name));
    }

    return list;
  }, [auditionees, localAssignments, benchFilter, benchSort]);

  // 2. Grid List
  const filteredAssignments = useMemo(() => {
    if (!searchTerm) return localAssignments;
    const lower = searchTerm.toLowerCase();
    return localAssignments.filter(a => 
      a.roleName.toLowerCase().includes(lower) || 
      (a.studentName && a.studentName.toLowerCase().includes(lower))
    );
  }, [localAssignments, searchTerm]);

  // 3. Inspector Data
  const inspectorStats = useMemo(() => {
    if (!selectedStudentId) return { assignments: {}, assignedRoleNames: [] };
    
    const studentAssigns = localAssignments.filter(a => a.studentId === selectedStudentId);
    const sceneMap: Record<number, string> = {};
    
    studentAssigns.forEach(a => {
        a.activeSceneIds.forEach(sId => {
            sceneMap[sId] = a.roleName; 
        });
    });

    return {
        assignments: sceneMap,
        assignedRoleNames: studentAssigns.map(a => a.roleName)
    };
  }, [selectedStudentId, localAssignments]);

  const selectedStudent = auditionees.find(s => s.id === selectedStudentId);


  // --- ACTIONS (LOCAL) ---

  const handleChicletClick = (assignmentId: number, sceneId: number, currentStatus: boolean) => {
    if (isLocked) return;
    
    setLocalAssignments(prev => prev.map(a => {
      if (a.id === assignmentId) {
        const newScenes = currentStatus 
          ? a.activeSceneIds.filter(id => id !== sceneId) 
          : [...(a.activeSceneIds || []), sceneId];       
        return { ...a, activeSceneIds: newScenes };
      }
      return a;
    }));
  };

  const handleLocalAutoAssign = () => {
    if (!confirm("This will reset all currently cast actors to their Blueprint default scenes. \n\nThis is a Draft action (Unsaved).")) return;
    
    setLocalAssignments(prev => prev.map(assignment => {
      const role = roles.find(r => r.id === assignment.roleId);
      // Only auto-fill if student is assigned & role has defaults
      if (assignment.studentId && role?.defaultSceneIds) {
        return { ...assignment, activeSceneIds: [...role.defaultSceneIds] };
      }
      return assignment;
    }));
  };

  const handleDiscard = () => {
    if (confirm("Discard all unsaved changes and revert to server state?")) {
        setLocalAssignments(JSON.parse(JSON.stringify(originalAssignments)));
    }
  };

  // --- ACTIONS (SERVER) ---

  const handleSaveChanges = async () => {
    setIsSaving(true);
    
    // Calculate Diff
    const changes = localAssignments.map(curr => {
        const orig = originalAssignments.find(a => a.id === curr.id);
        if (!orig) return null;

        const added = curr.activeSceneIds.filter(id => !orig.activeSceneIds.includes(id));
        const removed = orig.activeSceneIds.filter(id => !curr.activeSceneIds.includes(id));

        if (added.length === 0 && removed.length === 0) return null;

        return {
            assignmentRowId: curr.id,
            studentId: curr.studentId,
            addedSceneIds: added,
            removedSceneIds: removed
        };
    }).filter(Boolean);

    if (changes.length === 0) {
        setIsSaving(false);
        return;
    }

    try {
        await syncCastingChanges(activeId, changes);
        setOriginalAssignments(JSON.parse(JSON.stringify(localAssignments))); // Sync Base
        router.refresh();
    } catch (e) {
        console.error("Save failed", e);
        alert("Failed to save changes. Check console.");
    } finally {
        setIsSaving(false);
    }
  };

  const handleInitializeGrid = async () => {
    if (!confirm("Initialize Grid? This creates assignment rows for every Role.")) return;
    setIsSaving(true);
    await generateCastingRows(activeId); 
    setIsSaving(false);
    router.refresh();
  };

  const handleClearData = async () => {
    if (!confirm("⚠️ DANGER: Delete ALL casting data? This cannot be undone.")) return;
    setIsSaving(true);
    await clearCastingData(activeId);
    setIsSaving(false);
    router.refresh();
  };


  // --- RENDER ---
  return (
    <div className="flex h-screen bg-zinc-950 text-white overflow-hidden relative">
      
      {/* 🟢 FLOATING SAVE BAR */}
      {hasUnsavedChanges && (
          <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-4 bg-emerald-600 text-white px-6 py-3 rounded-full shadow-2xl animate-in slide-in-from-bottom-4 border border-emerald-400/50">
              <div className="flex flex-col">
                  <span className="font-bold text-sm leading-none">Unsaved Changes</span>
                  <span className="text-[10px] text-emerald-100 opacity-80">Don't forget to save!</span>
              </div>
              <div className="h-6 w-px bg-white/20"/>
              <button 
                onClick={handleDiscard}
                disabled={isSaving}
                className="hover:text-emerald-100 text-xs font-bold uppercase transition-colors"
              >
                  Discard
              </button>
              <button 
                onClick={handleSaveChanges}
                disabled={isSaving}
                className="bg-white text-emerald-700 hover:bg-emerald-50 px-4 py-1.5 rounded-full text-xs font-black uppercase flex items-center gap-2 shadow-sm transition-all active:scale-95"
              >
                  {isSaving ? <RefreshCw className="animate-spin" size={14}/> : <Save size={14}/>}
                  Save Updates
              </button>
          </div>
      )}

      {/* 🟢 1. LEFT COLUMN: SMART BENCH */}
      <aside className="w-72 border-r border-white/10 bg-zinc-900/50 flex flex-col shrink-0 hidden xl:flex">
        
        {/* Header */}
        <div className="p-4 border-b border-white/5 bg-zinc-900/80 backdrop-blur space-y-3">
            <div className="flex items-center justify-between">
                <h2 className="text-xs font-black uppercase text-zinc-500 tracking-widest flex items-center gap-2">
                    <Users size={14}/> Talent Pool
                </h2>
                <span className="text-[10px] bg-zinc-800 text-zinc-400 px-2 py-0.5 rounded-full">
                    {filteredBench.length} / {auditionees.length}
                </span>
            </div>

            {/* Filters */}
            <div className="flex gap-2">
                <select 
                    value={benchFilter}
                    onChange={(e) => setBenchFilter(e.target.value as any)}
                    className="flex-1 bg-zinc-950 border border-zinc-800 rounded-md text-[10px] p-1.5 text-zinc-300 focus:outline-none focus:border-blue-500 cursor-pointer"
                >
                    <option value="all">Show All</option>
                    <option value="needs_work">Needs Attention ⚠️</option>
                    <option value="compliant">Compliant ✅</option>
                </select>
                <button 
                    onClick={() => setBenchSort(benchSort === 'name' ? 'score' : 'name')}
                    className={`p-1.5 rounded-md border transition-colors ${benchSort === 'score' ? 'bg-blue-500/10 border-blue-500 text-blue-400' : 'bg-zinc-950 border-zinc-800 text-zinc-500 hover:text-zinc-300'}`}
                    title={benchSort === 'score' ? "Sort by Score" : "Sort by Name"}
                >
                    <SortAsc size={14}/>
                </button>
            </div>
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto custom-scrollbar p-2 space-y-1">
            {filteredBench.map(student => {
                const stats = getStudentStats(student.id);
                const isSelected = selectedStudentId === student.id;

                return (
                    <button 
                        key={student.id}
                        onClick={() => setSelectedStudentId(student.id)}
                        className={`w-full text-left px-3 py-2.5 rounded-lg text-xs font-bold transition-all flex items-center gap-3 group relative overflow-hidden
                            ${isSelected ? 'bg-blue-600 text-white shadow-lg' : 'text-zinc-400 hover:bg-white/5 hover:text-zinc-200'}
                            ${!stats.isCast && 'opacity-70 hover:opacity-100'}
                        `}
                    >
                        {/* Avatar */}
                        {student.headshot ? (
                             <img src={student.headshot} className="w-9 h-9 rounded-full object-cover bg-zinc-800 shrink-0 border border-white/5" alt="" />
                        ) : (
                             <div className="w-9 h-9 rounded-full bg-zinc-800 flex items-center justify-center text-[10px] shrink-0 font-black border border-white/5 text-zinc-500">
                                {student.name.charAt(0)}
                             </div>
                        )}
                        
                        {/* Info */}
                        <div className="flex-1 min-w-0">
                            <div className="flex justify-between items-center mb-1">
                                <span className="truncate">{student.name}</span>
                                {student.totalScore !== undefined && student.totalScore > 0 && (
                                    <span className={`text-[9px] font-mono ${isSelected ? 'text-blue-200' : 'text-zinc-600'}`}>{student.totalScore.toFixed(1)}</span>
                                )}
                            </div>
                            
                            {/* Badges */}
                            <div className="flex gap-1">
                                {stats.isCast ? (
                                    <>
                                        <span className={`px-1.5 py-0.5 rounded-[3px] text-[9px] font-black uppercase tracking-wider border border-transparent
                                            ${stats.sceneCount >= 3 ? 'bg-emerald-500/20 text-emerald-500' : 'bg-red-500/20 text-red-500'}
                                        `}>
                                            {stats.sceneCount} Sc
                                        </span>
                                        <span className={`px-1.5 py-0.5 rounded-[3px] text-[9px] font-black uppercase tracking-wider border border-transparent
                                            ${stats.inAct1 && stats.inAct2 ? 'bg-emerald-500/20 text-emerald-500' : 'bg-amber-500/20 text-amber-500'}
                                        `}>
                                            {stats.inAct1 && stats.inAct2 ? 'A1+2' : (stats.inAct1 ? 'A1 Only' : (stats.inAct2 ? 'A2 Only' : 'No Acts'))}
                                        </span>
                                    </>
                                ) : (
                                    <span className="text-[9px] text-zinc-600 italic">Not Cast</span>
                                )}
                            </div>
                        </div>

                        {/* Compliant Dot */}
                        {stats.isCompliant && (
                            <CheckCircle2 size={14} className="text-emerald-500 shrink-0 absolute right-2 top-2" />
                        )}
                    </button>
                );
            })}
        </div>
      </aside>

      {/* 🟢 2. CENTER COLUMN: CASTING GRID */}
      <div className="flex-1 flex flex-col min-w-0 bg-zinc-950 relative">
        
        {/* Toolbar */}
        <div className="h-16 border-b border-white/10 flex items-center justify-between px-6 shrink-0 bg-zinc-900/50 backdrop-blur-md sticky top-0 z-20">
            <div className="flex items-center gap-4">
                <h1 className="text-lg font-black italic tracking-tighter text-zinc-200">CASTING GRID</h1>
                
                {/* Search */}
                <div className="relative group">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500 group-focus-within:text-white transition-colors" size={14} />
                    <input 
                      type="text" 
                      placeholder="Filter roles..." 
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="bg-zinc-900 border border-zinc-800 rounded-full pl-9 pr-4 py-1.5 text-xs font-bold text-white placeholder:text-zinc-600 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 w-48 transition-all"
                    />
                </div>
            </div>
            
            {/* Actions */}
            {!isLocked && (
                <div className="flex items-center gap-2">
                    {localAssignments.length === 0 && (
                        <button onClick={handleInitializeGrid} disabled={isSaving} className="bg-emerald-600 hover:bg-emerald-500 text-white px-3 py-2 rounded-lg text-xs font-bold uppercase flex items-center gap-2 shadow-lg shadow-emerald-900/20 active:scale-95 transition-all">
                            <Layers size={14}/> Initialize
                        </button>
                    )}
                    
                    {/* Local Draft Button */}
                    <button onClick={handleLocalAutoAssign} disabled={isSaving} className="bg-zinc-800 hover:bg-zinc-700 text-zinc-300 px-3 py-2 rounded-lg text-xs font-bold uppercase flex items-center gap-2 border border-white/5 active:scale-95 transition-all">
                        <Wand2 size={14}/>
                        <span className="hidden lg:inline">Draft: Auto-Fill</span>
                    </button>

                    <div className="h-6 w-px bg-zinc-800 mx-2" />

                    <button onClick={handleClearData} disabled={isSaving} className="bg-red-500/10 hover:bg-red-500/20 text-red-500 px-3 py-2 rounded-lg text-xs font-bold uppercase flex items-center gap-2 border border-red-500/20 active:scale-95 transition-all">
                        <Trash2 size={16}/> 
                        <span className="hidden lg:inline">Clear Grid</span>
                    </button>
                </div>
            )}
        </div>

        {/* Grid */}
        <div className="flex-1 overflow-y-auto custom-scrollbar p-6">
            <div className="grid gap-2 max-w-[1600px] mx-auto pb-20"> {/* pb-20 for Floating Bar space */}
                
                {/* Headers */}
                <div className="hidden md:grid grid-cols-12 gap-4 px-4 py-2 text-[10px] font-black uppercase text-zinc-500 tracking-widest border-b border-white/5 mb-2 sticky top-0 bg-zinc-950 z-10 pb-4 pt-2">
                    <div className="col-span-3">Role / Character</div>
                    <div className="col-span-3">Cast Actor</div>
                    <div className="col-span-6">Scene Assignments</div>
                </div>

                {/* Rows */}
                {filteredAssignments.map((assignment) => {
                    const role = roles.find((r) => r.id === assignment.roleId);
                    const assignedStudent = auditionees.find((s) => s.id === assignment.studentId);
                    const isSelected = assignedStudent && selectedStudentId === assignedStudent.id;
                    
                    const needsSync = assignedStudent && (!assignment.activeSceneIds || assignment.activeSceneIds.length === 0) && (role?.defaultSceneIds?.length || 0) > 0;

                    return (
                        <div 
                            key={assignment.id} 
                            onClick={() => assignedStudent && setSelectedStudentId(assignedStudent.id)}
                            className={`group grid grid-cols-1 md:grid-cols-12 gap-4 items-center px-4 py-3 rounded-xl transition-all border cursor-pointer
                                ${isSelected 
                                    ? 'bg-blue-900/20 border-blue-500/50 ring-1 ring-blue-500/20' 
                                    : 'bg-zinc-900/40 border-white/5 hover:bg-zinc-800/50 hover:border-white/10'
                                }
                            `}
                        >
                            {/* Role */}
                            <div className="col-span-3 flex flex-col justify-center">
                                <div className="font-bold text-sm text-zinc-200">{assignment.roleName}</div>
                                <div className="text-[10px] text-zinc-500 uppercase font-bold tracking-wide flex items-center gap-2">
                                    <span className={role?.category === 'Lead' ? 'text-amber-500' : 'text-zinc-500'}>{role?.category || "Ensemble"}</span>
                                    <span className="text-zinc-700">•</span>
                                    <span>{role?.gender || "Any"}</span>
                                </div>
                            </div>
                            
                            {/* Actor */}
                            <div className="col-span-3">
                                {assignedStudent ? (
                                    <div className="flex items-center gap-3">
                                         {assignedStudent.headshot ? (
                                             <img src={assignedStudent.headshot} className="w-6 h-6 rounded-full object-cover bg-zinc-800 border border-white/10" alt="" />
                                         ) : (
                                             <div className="w-6 h-6 rounded-full bg-zinc-800 flex items-center justify-center text-[10px] font-bold text-zinc-500 border border-white/10">
                                                {assignedStudent.name.charAt(0)}
                                             </div>
                                         )}
                                        <span className="text-xs font-bold text-emerald-400 truncate">{assignedStudent.name}</span>
                                    </div>
                                ) : (
                                    <button className="flex items-center gap-2 text-xs text-zinc-500 hover:text-blue-400 transition-colors border border-dashed border-zinc-700 hover:border-blue-500/50 px-3 py-1.5 rounded-lg w-full group/btn">
                                        <UserPlus size={14} className="group-hover/btn:scale-110 transition-transform"/> 
                                        <span>Select Actor...</span>
                                    </button>
                                )}
                            </div>

                            {/* Chiclets */}
                            <div className="col-span-6 flex flex-wrap gap-1 items-center">
                                {needsSync && (
                                    <div className="mr-2 text-amber-500 animate-pulse" title="Actor has no scenes. Click 'Draft: Auto-Fill' to fix.">
                                        <AlertTriangle size={14} />
                                    </div>
                                )}

                                {scenes.map(scene => {
                                    const isActive = assignment.activeSceneIds?.includes(scene.id);
                                    const isBlueprint = role?.defaultSceneIds?.includes(scene.id);
                                    
                                    // Visual Dirty State (Ring around unsaved changes)
                                    const original = originalAssignments.find(a => a.id === assignment.id);
                                    const wasActive = original?.activeSceneIds?.includes(scene.id);
                                    const isDirty = isActive !== wasActive;

                                    return (
                                        <button
                                            key={scene.id}
                                            onClick={(e) => {
                                                e.stopPropagation(); 
                                                handleChicletClick(assignment.id, scene.id, isActive);
                                            }}
                                            title={`${scene.name}`}
                                            className={`
                                                h-6 min-w-[24px] px-1.5 rounded flex items-center justify-center text-[9px] font-black transition-all border relative
                                                ${isActive 
                                                    ? 'bg-blue-600 text-white border-blue-500 shadow-sm' 
                                                    : isBlueprint 
                                                        ? 'bg-transparent text-zinc-500 border-zinc-700 hover:border-blue-500/50 hover:text-blue-400' 
                                                        : 'bg-zinc-950/50 text-zinc-700 border-transparent hover:bg-zinc-900'
                                                }
                                                ${!assignment.studentId ? 'opacity-30 cursor-not-allowed' : ''}
                                                ${isDirty ? 'ring-2 ring-emerald-500 ring-offset-2 ring-offset-zinc-900 z-10' : ''}
                                            `}
                                        >
                                            {scene.order}
                                        </button>
                                    );
                                })}
                            </div>

                        </div>
                    );
                })}
            </div>
        </div>
      </div>

      {/* 🟢 3. RIGHT COLUMN: INSPECTOR */}
      {selectedStudent && (
        <CastingInspector 
            actor={selectedStudent} 
            allScenes={scenes} 
            stats={inspectorStats}
            onClose={() => setSelectedStudentId(null)}
        />
      )}
    </div>
  );
}