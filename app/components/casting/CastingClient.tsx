"use client";

import React, { useState, useMemo } from 'react';
import { 
  Search, Filter, ChevronDown, ChevronRight, 
  UserPlus, X, Check, Save, Layers,
  AlertCircle, Wand2, RefreshCw
} from 'lucide-react';
import { updateCastAssignment } from '@/app/lib/baserow'; // Ensure you have an updater for the scene field too!

// --- TYPES ---
// (Keeping your existing types, just ensuring we have what we need)
interface Role {
  id: number;
  name: string;
  category: string; // Lead, Supporting, Ensemble
  gender: string;
  defaultSceneIds: number[]; // <--- CRITICAL: The IDs from the Blueprint Link
}

interface Assignment {
  id: number;
  roleId: number;
  roleName: string;
  studentId: number | null;
  studentName: string | null;
  sceneIds: number[]; // The specific scenes for THIS actor
}

export default function CastingClient({ 
  assignments = [], 
  roles = [], 
  auditionees = [], 
  scenes = [] 
}: any) {
  
  const [localAssignments, setLocalAssignments] = useState<Assignment[]>(assignments);
  const [selectedRole, setSelectedRole] = useState<number | null>(null);
  const [isSyncing, setIsSyncing] = useState<number | null>(null); // Track which row is syncing

  // --- 1. THE SYNC LOGIC (The Fix) ---
  const handleSyncScenes = async (assignmentId: number, roleId: number) => {
    setIsSyncing(assignmentId);
    
    // A. Find the Blueprint Default
    const roleBlueprint = roles.find((r: any) => r.id === roleId);
    if (!roleBlueprint) {
        setIsSyncing(null);
        return; 
    }

    const defaultScenes = roleBlueprint.defaultSceneIds || [];

    // B. Optimistic Update (Make UI snappy)
    setLocalAssignments(prev => prev.map(a => 
      a.id === assignmentId ? { ...a, sceneIds: defaultScenes } : a
    ));

    // C. Server Update
    try {
        // You might need to create this specific update function in baserow.ts 
        // if updateCastAssignment only handles the Person ID right now.
        // It should accept { [DB.ASSIGNMENTS.FIELDS.SCENES]: defaultScenes }
        await updateCastAssignment(assignmentId, null, defaultScenes); 
    } catch (e) {
        console.error("Sync failed", e);
        // Revert on fail? Or just show error toast
    } finally {
        setIsSyncing(null);
    }
  };

  // --- RENDER HELPERS ---
  
  // Helper to lookup Scene Names from IDs
  const getSceneNames = (ids: number[]) => {
      if(!ids || ids.length === 0) return <span className="text-zinc-600 italic">No Scenes</span>;
      return ids.map(id => {
          const s = scenes.find((sc:any) => sc.id === id);
          return s ? s.name : '?';
      }).join(", ");
  };

  return (
    <div className="h-full flex flex-col bg-zinc-950 text-white">
      
      {/* HEADER TOOLBAR */}
      <div className="h-16 border-b border-white/10 flex items-center justify-between px-6 shrink-0 bg-zinc-900/50">
        <div className="flex items-center gap-4">
            <h1 className="text-lg font-black italic tracking-tighter">CASTING GRID</h1>
            <div className="bg-black/40 border border-white/10 rounded-lg px-3 py-1.5 flex items-center gap-2 text-xs text-zinc-400">
                <Filter size={14}/>
                <span>Filter: All Roles</span>
            </div>
        </div>
        <div className="flex items-center gap-2">
            <div className="text-xs text-zinc-500 mr-2">
                {localAssignments.filter(a => a.studentId).length} / {localAssignments.length} Roles Filled
            </div>
            <button className="bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wider flex items-center gap-2 transition-all">
                <Save size={16}/> Publish Cast List
            </button>
        </div>
      </div>

      {/* MAIN GRID */}
      <div className="flex-1 overflow-y-auto custom-scrollbar p-6">
        <div className="grid gap-2">
            
            {/* TABLE HEADER */}
            <div className="grid grid-cols-12 gap-4 px-4 py-2 text-[10px] font-black uppercase text-zinc-500 tracking-widest border-b border-white/5">
                <div className="col-span-3">Role / Character</div>
                <div className="col-span-3">Cast Actor</div>
                <div className="col-span-5">Assigned Scenes</div>
                <div className="col-span-1 text-center">Actions</div>
            </div>

            {/* ROWS */}
            {localAssignments.map((assignment) => {
                const role = roles.find((r:any) => r.id === assignment.roleId);
                const assignedStudent = auditionees.find((s:any) => s.id === assignment.studentId);
                const hasScenes = assignment.sceneIds && assignment.sceneIds.length > 0;

                return (
                    <div key={assignment.id} className="group grid grid-cols-12 gap-4 items-center px-4 py-3 bg-zinc-900/40 border border-white/5 hover:border-white/10 rounded-xl transition-all">
                        
                        {/* 1. ROLE INFO */}
                        <div className="col-span-3">
                            <div className="font-bold text-sm text-zinc-200">{assignment.roleName}</div>
                            <div className="text-[10px] text-zinc-500 uppercase">{role?.category || "Ensemble"} • {role?.gender || "Any"}</div>
                        </div>

                        {/* 2. ACTOR SELECTOR (Simplified for demo) */}
                        <div className="col-span-3">
                            {assignedStudent ? (
                                <div className="flex items-center gap-3 bg-zinc-950/50 p-1.5 pr-3 rounded-lg border border-white/5">
                                    <div className="w-6 h-6 rounded-full bg-zinc-800 flex items-center justify-center text-[10px] font-bold text-zinc-500">
                                        {assignedStudent.name.charAt(0)}
                                    </div>
                                    <span className="text-xs font-bold text-emerald-400 truncate">{assignedStudent.name}</span>
                                    <button 
                                        className="ml-auto text-zinc-600 hover:text-red-400"
                                        onClick={() => {/* Handle Remove */}}
                                    >
                                        <X size={12}/>
                                    </button>
                                </div>
                            ) : (
                                <button className="flex items-center gap-2 text-xs text-zinc-500 hover:text-blue-400 transition-colors border border-dashed border-zinc-700 hover:border-blue-500/50 px-3 py-1.5 rounded-lg w-full">
                                    <UserPlus size={14}/> <span>Select Actor...</span>
                                </button>
                            )}
                        </div>

                        {/* 3. SCENES (The Problem Area) */}
                        <div className="col-span-5 relative">
                            <div className={`text-xs leading-relaxed truncate ${hasScenes ? 'text-zinc-400' : 'text-red-900/50 italic'}`}>
                                {getSceneNames(assignment.sceneIds)}
                            </div>
                            
                            {/* Warning if Role has scenes but Assignment doesn't */}
                            {!hasScenes && role?.defaultSceneIds?.length > 0 && (
                                <div className="absolute right-0 top-1/2 -translate-y-1/2 flex items-center gap-2">
                                    <span className="text-[9px] text-amber-500 font-bold uppercase tracking-wider bg-amber-500/10 px-2 py-0.5 rounded">
                                        Sync Required
                                    </span>
                                </div>
                            )}
                        </div>

                        {/* 4. ACTIONS (The Fix Button) */}
                        <div className="col-span-1 flex justify-center">
                            <button 
                                onClick={() => handleSyncScenes(assignment.id, assignment.roleId)}
                                disabled={isSyncing === assignment.id}
                                className="p-2 text-zinc-500 hover:text-blue-400 hover:bg-blue-500/10 rounded-lg transition-all disabled:opacity-50"
                                title="Reset Scenes to Blueprint Defaults"
                            >
                                <RefreshCw size={16} className={isSyncing === assignment.id ? "animate-spin" : ""}/>
                            </button>
                        </div>

                    </div>
                );
            })}
        </div>
      </div>
    </div>
  );
}