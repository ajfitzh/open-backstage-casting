"use client";

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
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
  // Added to support the Profile Modal
  auditionInfo?: any; 
  auditionGrades?: any;
};

type BlueprintRole = {
  id: number;
  name: string; 
  activeScenes: BaserowLink[]; 
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

export default function CastingClient({ 
  assignments = [], 
  blueprintRoles = [], 
  allScenes = [], 
  activeId 
}: CastingClientProps) {
  const router = useRouter();
  
  // State
  const [rows, setRows] = useState<AssignmentRow[]>(assignments);
  const [selectedStudent, setSelectedStudent] = useState<{ id: number; name: string } | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const hasInitialized = useRef(false);

  // Sync Props
  useEffect(() => { setRows(assignments); }, [assignments]);

  // 🟢 AUTO-INIT
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

  // Stop loading when data arrives
  useEffect(() => {
    if (assignments.length > 0 && isLoading) setIsLoading(false);
  }, [assignments.length, isLoading]);

  // 🔵 DRAFT BUTTON
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

  // 💾 SAVE BUTTON
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

  // --- MERGED TIMELINE HELPER ---
  const getStudentTimeline = (studentId: number) => {
    // 1. Find all roles this student has in the current grid
    const studentRoles = rows.filter(r => r.person?.[0]?.id === studentId);
    
    // 2. Map every scene in the show to a role (if they are in it)
    return allScenes.map(scene => {
      const activeRoleRow = studentRoles.find(row => {
        const scenes = row._pendingScenes || row.savedScenes || [];
        return scenes.some(s => s.id === scene.id);
      });
      
      return {
        scene,
        roleName: activeRoleRow ? activeRoleRow.role?.[0]?.value : null,
        // Deterministic color based on Role Name length for consistent UI
        color: activeRoleRow 
          ? `hsl(${(activeRoleRow.role?.[0]?.value.length * 40) % 360}, 70%, 50%)` 
          : 'transparent'
      };
    });
  };

  // Helper to get data for selected student
  const activeStudentRow = selectedStudent 
    ? rows.find(r => r.person?.[0]?.id === selectedStudent.id) 
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
      
      {/* LEFT: THE GRID */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden bg-zinc-950">
        
        {/* Toolbar */}
        <div className="flex justify-between items-center p-4 border-b border-zinc-800 bg-zinc-900/50">
          <div>
            <h2 className="text-lg font-bold text-white">Casting Matrix</h2>
            <p className="text-xs text-zinc-500 font-mono mt-1">
              {rows.length} ROLES • {allScenes.length} SCENES
            </p>
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

        {/* Matrix Table */}
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
                      
                      {/* ROLE */}
                      <td className="p-3 text-sm font-medium text-zinc-200 sticky left-0 bg-zinc-950 group-hover:bg-zinc-900 transition-colors z-10 border-r border-zinc-800/50">
                        {row.role?.[0]?.value || <span className="text-red-500">No Role</span>}
                      </td>

                      {/* ACTOR (Clickable) */}
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

                      {/* THE DOT MATRIX */}
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
      </div>

      {/* MODAL: CALLBACK ACTOR PROFILE */}
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
                  {/* Label only if role exists */}
                  {slot.roleName && (
                    <span className="text-[10px] font-bold text-white/90 -rotate-90 whitespace-nowrap opacity-50 group-hover:opacity-100">
                      {slot.roleName}
                    </span>
                  )}
                  {/* Tooltip */}
                  <div className="absolute bottom-full mb-2 bg-black text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 whitespace-nowrap pointer-events-none z-20">
                     {slot.scene.name}: {slot.roleName || "Offstage"}
                  </div>
                </div>
              ))}
            </div>
          }
        />
      )}

      {/* RIGHT SIDEBAR (Placeholder) */}
      <div className="w-80 border-l border-zinc-800 bg-zinc-900 hidden lg:flex flex-col">
         <div className="flex-1 p-8 flex items-center justify-center text-zinc-600">
            <p>Actor Bank</p>
         </div>
      </div>
    </div>
  );
}