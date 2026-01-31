"use client";

import React, { useState, useMemo } from 'react';
import { 
  Search, Filter, ChevronDown, ChevronRight, 
  UserPlus, X, Check, Save, Layers,
  AlertCircle, Wand2, RefreshCw, Lock,
  AlertTriangle
} from 'lucide-react';
import { updateCastAssignment } from '@/app/lib/baserow'; 

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
  sceneIds: number[]; // The specific scenes for THIS show
}

interface Auditionee {
  id: number;
  name: string;
  // ... other fields
}

interface Scene {
  id: number;
  name: string;
}

interface CastingClientProps {
  assignments: Assignment[];
  roles: Role[];
  auditionees: Auditionee[];
  scenes: Scene[];
  showStatus: string; // e.g. "Pre-Production", "In Production", "Archived"
}

export default function CastingClient({ 
  assignments = [], 
  roles = [], 
  auditionees = [], 
  scenes = [],
  showStatus = "Pre-Production"
}: CastingClientProps) {
  
  const [localAssignments, setLocalAssignments] = useState<Assignment[]>(assignments);
  const [isSyncing, setIsSyncing] = useState<number | null>(null); // Track which row is updating

  // 1. DEFINE THE LOCK STATE
  // If the show is running or over, we freeze the casting grid to preserve history.
  const isLocked = useMemo(() => {
      const lockedStatuses = ['In Production', 'Post-Production', 'Archived', 'Closed'];
      return lockedStatuses.includes(showStatus);
  }, [showStatus]);

  // --- 2. THE SYNC LOGIC (Fixes "0 Actors" Bug) ---
  const handleSyncScenes = async (assignmentId: number, roleId: number) => {
    if (isLocked) return; // Security Guard 🛡️

    setIsSyncing(assignmentId);
    
    // A. Find the Blueprint Default Scenes for this Role
    const roleBlueprint = roles.find((r) => r.id === roleId);
    if (!roleBlueprint) {
        setIsSyncing(null);
        return; 
    }

    const defaultScenes = roleBlueprint.defaultSceneIds || [];

    // B. Optimistic Update (Update UI immediately)
    setLocalAssignments(prev => prev.map(a => 
      a.id === assignmentId ? { ...a, sceneIds: defaultScenes } : a
    ));

    // C. Server Update
    try {
        // Calls the backend to save the [1, 2, 3] scene array to Baserow
        await updateCastAssignment(assignmentId, null, defaultScenes); 
    } catch (e) {
        console.error("Sync failed", e);
        // Optional: Revert optimistic update here on fail
    } finally {
        setIsSyncing(null);
    }
  };

  // --- RENDER HELPER ---
  const getSceneNames = (ids: number[]) => {
      if(!ids || ids.length === 0) return <span className="text-zinc-600 italic">No Scenes Assigned</span>;
      
      const names = ids.map(id => {
          const s = scenes.find(sc => sc.id === id);
          return s ? s.name : null;
      }).filter(Boolean);

      return names.join(", ");
  };

  return (
    <div className="h-full flex flex-col bg-zinc-950 text-white relative">
      
      {/* 3. LOCKED BANNER */}
      {isLocked && (
          <div className="bg-amber-900/20 border-b border-amber-500/20 px-4 py-2 flex items-center justify-center gap-3 text-[10px] font-bold uppercase tracking-widest text-amber-500 animate-in slide-in-from-top-2">
              <Lock size={12} /> 
              <span>Production Locked • Read-Only Mode</span>
          </div>
      )}

      {/* HEADER TOOLBAR */}
      <div className="h-16 border-b border-white/10 flex items-center justify-between px-6 shrink-0 bg-zinc-900/50 backdrop-blur-md sticky top-0 z-20">
        <div className="flex items-center gap-4">
            <h1 className="text-lg font-black italic tracking-tighter">CASTING GRID</h1>
            <div className="hidden md:flex bg-black/40 border border-white/10 rounded-lg px-3 py-1.5 items-center gap-2 text-xs text-zinc-400">
                <Filter size={14}/>
                <span>Filter: All Roles</span>
            </div>
        </div>
        
        {/* HIDE ACTION BUTTONS IF LOCKED */}
        {!isLocked && (
            <div className="flex items-center gap-2">
                <div className="text-xs text-zinc-500 mr-2 font-mono">
                    {localAssignments.filter(a => a.studentId).length} / {localAssignments.length}
                </div>
                <button className="bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wider flex items-center gap-2 transition-all shadow-lg shadow-emerald-900/20 active:scale-95">
                    <Save size={16}/> Publish
                </button>
            </div>
        )}
      </div>

      {/* MAIN GRID */}
      <div className="flex-1 overflow-y-auto custom-scrollbar p-6">
        <div className="grid gap-2 max-w-6xl mx-auto">
            
            {/* TABLE HEADER */}
            <div className="hidden md:grid grid-cols-12 gap-4 px-4 py-2 text-[10px] font-black uppercase text-zinc-500 tracking-widest border-b border-white/5 mb-2">
                <div className="col-span-3">Role / Character</div>
                <div className="col-span-3">Cast Actor</div>
                <div className="col-span-5">Assigned Scenes</div>
                <div className="col-span-1 text-center">Sync</div>
            </div>

            {/* ROWS */}
            {localAssignments.map((assignment) => {
                const role = roles.find((r) => r.id === assignment.roleId);
                const assignedStudent = auditionees.find((s) => s.id === assignment.studentId);
                
                const hasScenes = assignment.sceneIds && assignment.sceneIds.length > 0;
                const hasBlueprintScenes = role?.defaultSceneIds && role.defaultSceneIds.length > 0;
                
                // Show warning if Role has scenes but Assignment is empty
                const needsSync = !hasScenes && hasBlueprintScenes;

                return (
                    <div key={assignment.id} className={`group grid grid-cols-1 md:grid-cols-12 gap-4 items-center px-4 py-3 rounded-xl transition-all border ${isLocked ? 'bg-zinc-900/20 border-white/5 opacity-75' : 'bg-zinc-900/40 border-white/5 hover:border-white/10 hover:bg-zinc-800/50'}`}>
                        
                        {/* 1. ROLE INFO */}
                        <div className="col-span-3 flex flex-col justify-center">
                            <div className="font-bold text-sm text-zinc-200">{assignment.roleName}</div>
                            <div className="text-[10px] text-zinc-500 uppercase font-bold tracking-wide">
                                {role?.category || "Ensemble"} <span className="mx-1 text-zinc-700">•</span> {role?.gender || "Any"}
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
                                        <button 
                                            className="ml-auto text-zinc-600 hover:text-red-400 transition-colors"
                                            onClick={() => {/* Remove Logic */}}
                                        >
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

                        {/* 3. SCENES (With Warning) */}
                        <div className="col-span-5 relative min-h-[1.5rem] flex items-center">
                            <div className={`text-xs leading-relaxed line-clamp-2 ${hasScenes ? 'text-zinc-400' : 'text-zinc-600 italic'}`}>
                                {getSceneNames(assignment.sceneIds)}
                            </div>
                            
                            {/* "Sync Required" Warning */}
                            {needsSync && !isLocked && (
                                <div className="hidden md:flex absolute right-0 top-1/2 -translate-y-1/2 items-center gap-2 animate-pulse">
                                    <span className="text-[9px] text-amber-500 font-bold uppercase tracking-wider bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded shadow-sm">
                                        <AlertTriangle size={10} className="inline mr-1 mb-0.5"/>
                                        Sync Needed
                                    </span>
                                </div>
                            )}
                        </div>

                        {/* 4. ACTIONS (Sync Button) */}
                        <div className="col-span-1 flex justify-end md:justify-center">
                            {!isLocked && (
                                <button 
                                    onClick={() => handleSyncScenes(assignment.id, assignment.roleId)}
                                    disabled={isSyncing === assignment.id}
                                    className={`p-2 rounded-lg transition-all ${needsSync ? 'text-amber-500 bg-amber-500/10 hover:bg-amber-500 hover:text-white' : 'text-zinc-600 hover:text-blue-400 hover:bg-blue-500/10'}`}
                                    title="Reset Scenes to Blueprint Defaults"
                                >
                                    <RefreshCw size={16} className={isSyncing === assignment.id ? "animate-spin" : ""} />
                                </button>
                            )}
                        </div>

                    </div>
                );
            })}
        </div>
      </div>
    </div>
  );
}