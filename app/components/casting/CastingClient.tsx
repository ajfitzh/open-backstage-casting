"use client";

import React, { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { 
  Search, Filter, 
  UserPlus, X, Save, Layers,
  Wand2, RefreshCw, Lock,
  AlertTriangle, Theater
} from 'lucide-react';
import { generateCastingRows } from '@/app/actions/casting'; // Existing action for Rows
import { toggleSceneAssignment, initializeSceneAssignments } from '@/app/lib/actions'; // 🟢 NEW ACTIONS

// --- TYPES ---
interface Role {
  id: number;
  name: string;
  category: string; // Lead, Supporting, Ensemble
  gender: string;
  defaultSceneIds: number[]; // The Blueprint Defaults
}

interface Assignment {
  id: number;
  roleId: number;
  roleName: string;
  studentId: number | null;
  studentName: string | null;
  activeSceneIds: number[]; // 🟢 CHANGED: Now reflects Table 628
}

interface Auditionee {
  id: number;
  name: string;
}

interface Scene {
  id: number;
  name: string;
  order: number;
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
  const [localAssignments, setLocalAssignments] = useState<Assignment[]>(assignments);
  const [isGenerating, setIsGenerating] = useState(false); 
  const [searchTerm, setSearchTerm] = useState("");

  // 1. LOCK STATE
  const isLocked = useMemo(() => {
      const lockedStatuses = ['In Production', 'Post-Production', 'Archived', 'Closed'];
      return lockedStatuses.includes(showStatus);
  }, [showStatus]);

  // 2. FILTERING
  const filteredAssignments = useMemo(() => {
    if (!searchTerm) return localAssignments;
    const lower = searchTerm.toLowerCase();
    return localAssignments.filter(a => 
      a.roleName.toLowerCase().includes(lower) || 
      (a.studentName && a.studentName.toLowerCase().includes(lower))
    );
  }, [localAssignments, searchTerm]);

  // --- ACTIONS ---

  // A. HANDLE CHICLET CLICK (The Core Feature)
  const handleChicletClick = async (assignment: Assignment, sceneId: number, currentStatus: boolean) => {
    if (isLocked || !assignment.studentId) return;
    
    // 1. Optimistic Update (Instant Feedback)
    setLocalAssignments(prev => prev.map(a => {
      if (a.id === assignment.id) {
        const newScenes = currentStatus 
          ? a.activeSceneIds.filter(id => id !== sceneId) // Remove
          : [...(a.activeSceneIds || []), sceneId];       // Add
        return { ...a, activeSceneIds: newScenes };
      }
      return a;
    }));

    // 2. Server Action
    try {
      // Toggle: if currently true, we want to delete (isActive=false)
      await toggleSceneAssignment(assignment.studentId, sceneId, activeId, !currentStatus);
    } catch (e) {
      console.error("Chiclet toggle failed", e);
      // In a real app, you'd revert the optimistic update here
      router.refresh(); 
    }
  };

  // B. INITIALIZE ASSIGNMENTS (Empty Rows)
  const handleInitializeGrid = async () => {
    if (!confirm("This will generate empty assignment rows for all Blueprint Roles. Continue?")) return;
    setIsGenerating(true);
    try {
      await generateCastingRows(activeId); 
      router.refresh(); 
    } catch (e) {
      console.error(e);
      alert("Failed.");
    } finally {
      setIsGenerating(false);
    }
  };

  // C. INITIALIZE SCENES (The "Big Button")
  const handleAutoAssignScenes = async () => {
    if (!confirm("This will read the Blueprint and auto-assign scenes to all currently cast actors. This ensures act requirements are met. Continue?")) return;
    setIsGenerating(true);
    try {
      const res = await initializeSceneAssignments(activeId);
      if(res.success) {
        alert(`Success! Created ${res.count} scene assignments based on the blueprint.`);
        router.refresh();
      } else {
        alert("Something went wrong. Check console.");
      }
    } catch (e) {
      console.error(e);
      alert("Failed.");
    } finally {
      setIsGenerating(false);
    }
  };

  // --- RENDER: EMPTY STATE ---
  if (localAssignments.length === 0 && !isLocked) {
    return (
        <div className="h-full flex flex-col items-center justify-center bg-zinc-950 text-zinc-500 space-y-6">
            <div className="p-6 bg-zinc-900 rounded-full border border-zinc-800 shadow-2xl">
                <Wand2 size={48} className="text-zinc-700" />
            </div>
            <div className="text-center space-y-2">
                <h2 className="text-xl font-black text-white italic tracking-tighter">GRID EMPTY</h2>
                <p className="max-w-md mx-auto text-sm text-zinc-400">
                    No assignment rows found. <br/>
                    Initialize the grid to start casting.
                </p>
            </div>
            <button 
                onClick={handleInitializeGrid}
                disabled={isGenerating}
                className="bg-emerald-600 hover:bg-emerald-500 text-white px-8 py-3 rounded-xl font-bold uppercase tracking-widest flex items-center gap-3 transition-all"
            >
                {isGenerating ? <RefreshCw className="animate-spin"/> : <Layers />}
                {isGenerating ? "Generating..." : "Initialize Grid from Roles"}
            </button>
        </div>
    );
  }

  // --- RENDER: MAIN GRID ---
  return (
    <div className="h-full flex flex-col bg-zinc-950 text-white relative">
      
      {/* LOCKED BANNER */}
      {isLocked && (
          <div className="bg-amber-900/20 border-b border-amber-500/20 px-4 py-2 flex items-center justify-center gap-3 text-[10px] font-bold uppercase tracking-widest text-amber-500">
              <Lock size={12} /> 
              <span>Production Locked • Read-Only Mode</span>
          </div>
      )}

      {/* HEADER TOOLBAR */}
      <div className="h-16 border-b border-white/10 flex items-center justify-between px-6 shrink-0 bg-zinc-900/50 backdrop-blur-md sticky top-0 z-20">
        <div className="flex items-center gap-4">
            <h1 className="text-lg font-black italic tracking-tighter text-zinc-200">CASTING GRID</h1>
            
            {/* SEARCH */}
            <div className="relative group">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500 group-focus-within:text-white transition-colors" size={14} />
                <input 
                  type="text" 
                  placeholder="Filter roles..." 
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="bg-zinc-950 border border-zinc-800 rounded-full pl-9 pr-4 py-1.5 text-xs font-bold text-white placeholder:text-zinc-600 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 w-48 transition-all"
                />
            </div>
        </div>
        
        {/* ACTIONS */}
        {!isLocked && (
            <div className="flex items-center gap-3">
                <button 
                    onClick={handleAutoAssignScenes}
                    disabled={isGenerating}
                    className="bg-zinc-800 hover:bg-zinc-700 text-zinc-300 px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wider flex items-center gap-2 transition-all border border-white/5"
                    title="Populate scenes based on Blueprint defaults"
                >
                    {isGenerating ? <RefreshCw className="animate-spin" size={14}/> : <Theater size={14}/>}
                    <span>Auto-Assign Scenes</span>
                </button>

                <div className="h-6 w-px bg-zinc-800 mx-2" />

                <button className="bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wider flex items-center gap-2 transition-all shadow-lg shadow-emerald-900/20 active:scale-95">
                    <Save size={16}/> Publish
                </button>
            </div>
        )}
      </div>

      {/* GRID CONTENT */}
      <div className="flex-1 overflow-y-auto custom-scrollbar p-6">
        <div className="grid gap-2 max-w-[1600px] mx-auto">
            
            {/* TABLE HEADER */}
            <div className="hidden md:grid grid-cols-12 gap-4 px-4 py-2 text-[10px] font-black uppercase text-zinc-500 tracking-widest border-b border-white/5 mb-2">
                <div className="col-span-3">Role / Character</div>
                <div className="col-span-3">Cast Actor</div>
                <div className="col-span-6">Scene Assignments (Click to Toggle)</div>
            </div>

            {/* ROWS */}
            {filteredAssignments.map((assignment) => {
                const role = roles.find((r) => r.id === assignment.roleId);
                const assignedStudent = auditionees.find((s) => s.id === assignment.studentId);
                
                // Diff Logic for Warning
                const hasScenes = assignment.activeSceneIds && assignment.activeSceneIds.length > 0;
                const hasBlueprintScenes = role?.defaultSceneIds && role.defaultSceneIds.length > 0;
                const needsSync = assignedStudent && !hasScenes && hasBlueprintScenes;

                return (
                    <div key={assignment.id} className={`group grid grid-cols-1 md:grid-cols-12 gap-4 items-center px-4 py-3 rounded-xl transition-all border ${isLocked ? 'bg-zinc-900/20 border-white/5 opacity-75' : 'bg-zinc-900/40 border-white/5 hover:border-white/10 hover:bg-zinc-800/50'}`}>
                        
                        {/* 1. ROLE INFO */}
                        <div className="col-span-3 flex flex-col justify-center">
                            <div className="font-bold text-sm text-zinc-200">{assignment.roleName}</div>
                            <div className="text-[10px] text-zinc-500 uppercase font-bold tracking-wide flex items-center gap-2">
                                <span className={role?.category === 'Lead' ? 'text-amber-500' : 'text-zinc-500'}>{role?.category || "Ensemble"}</span>
                                <span className="text-zinc-700">•</span> 
                                <span>{role?.gender || "Any"}</span>
                            </div>
                        </div>

                        {/* 2. ACTOR SELECTOR */}
                        <div className="col-span-3">
                            {assignedStudent ? (
                                <div className={`flex items-center gap-3 p-1.5 pr-3 rounded-lg border ${isLocked ? 'bg-transparent border-transparent' : 'bg-zinc-950/50 border-white/5'}`}>
                                    <div className="w-6 h-6 rounded-full bg-zinc-800 flex items-center justify-center text-[10px] font-bold text-zinc-500 border border-white/5">
                                        {assignedStudent.name.charAt(0)}
                                    </div>
                                    <span className="text-xs font-bold text-emerald-400 truncate">{assignedStudent.name}</span>
                                    
                                    {!isLocked && (
                                        <button className="ml-auto text-zinc-600 hover:text-red-400 transition-colors opacity-0 group-hover:opacity-100">
                                            <X size={12}/>
                                        </button>
                                    )}
                                </div>
                            ) : (
                                isLocked ? (
                                    <span className="text-xs text-zinc-600 italic px-2">Unassigned</span>
                                ) : (
                                    <button className="flex items-center gap-2 text-xs text-zinc-500 hover:text-blue-400 transition-colors border border-dashed border-zinc-700 hover:border-blue-500/50 px-3 py-1.5 rounded-lg w-full group/btn">
                                        <UserPlus size={14} className="group-hover/btn:scale-110 transition-transform"/> 
                                        <span>Select Actor...</span>
                                    </button>
                                )
                            )}
                        </div>

                        {/* 3. SCENE CHICLETS */}
                        <div className="col-span-6 flex flex-wrap gap-1 items-center">
                            
                            {/* Empty Warning */}
                            {needsSync && (
                                <div className="mr-2 text-amber-500 animate-pulse" title="Actor has no scenes assigned yet">
                                    <AlertTriangle size={14} />
                                </div>
                            )}

                            {scenes.map(scene => {
                                const isActive = assignment.activeSceneIds?.includes(scene.id);
                                const isBlueprint = role?.defaultSceneIds?.includes(scene.id);
                                
                                return (
                                    <button
                                        key={scene.id}
                                        onClick={() => handleChicletClick(assignment, scene.id, isActive)}
                                        disabled={isLocked || !assignment.studentId}
                                        title={`${scene.name} ${isBlueprint ? '(Suggested)' : ''}`}
                                        className={`
                                            h-6 min-w-[24px] px-1.5 rounded flex items-center justify-center text-[9px] font-black transition-all border
                                            ${isActive 
                                                ? 'bg-blue-600 text-white border-blue-500 shadow-sm hover:bg-blue-500' // Active
                                                : isBlueprint 
                                                    ? 'bg-transparent text-zinc-500 border-zinc-700 hover:border-blue-500/50 hover:text-blue-400' // Blueprint Hint
                                                    : 'bg-zinc-950/50 text-zinc-700 border-transparent hover:bg-zinc-900' // Inactive
                                            }
                                            ${!assignment.studentId ? 'opacity-30 cursor-not-allowed' : ''}
                                        `}
                                    >
                                        {scene.order || scene.id}
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
  );
}