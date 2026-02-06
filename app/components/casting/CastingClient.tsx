"use client";

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { generateCastingRows, syncCastingChanges } from '@/app/lib/actions';

// --- TYPES ---
type BaserowLink = { id: number; value: string };

type AssignmentRow = {
  id: number; 
  role: BaserowLink[];   
  person: BaserowLink[];
  production: { id: number }[];
  savedScenes?: BaserowLink[];   // Existing DB Data
  _pendingScenes?: BaserowLink[]; // Draft Data
};

type BlueprintRole = {
  id: number;
  name: string; 
  activeScenes: BaserowLink[]; 
};

interface CastingClientProps {
  assignments: AssignmentRow[];
  blueprintRoles: BlueprintRole[];
  activeId: number; 
}

export default function CastingClient({ 
  assignments = [], 
  blueprintRoles = [], 
  activeId 
}: CastingClientProps) {
  const router = useRouter();
  
  const [rows, setRows] = useState<AssignmentRow[]>(assignments);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const hasInitialized = useRef(false);

  // Sync Props to State (Reset on Refresh)
  useEffect(() => {
    setRows(assignments);
  }, [assignments]);

  // 🟢 AUTO-INIT GRID
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


  // 🔵 DRAFT BUTTON (Applies Blueprint -> Pending)
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

  // 💾 SAVE BUTTON (Calculates Diff -> Server Action)
  const handleSave = async () => {
    setIsSaving(true);
    
    const changes = rows
      .filter(row => row._pendingScenes) // Only process rows with draft changes
      .map(row => {
        const studentId = row.person?.[0]?.id;
        if (!studentId) return null;

        // Calculate IDs
        const pendingIds = row._pendingScenes!.map(s => s.id);
        const savedIds = row.savedScenes?.map(s => s.id) || [];

        // Find Diff
        const added = pendingIds.filter(id => !savedIds.includes(id));
        const removed = savedIds.filter(id => !pendingIds.includes(id));

        if (added.length === 0 && removed.length === 0) return null;

        return {
          studentId,
          addedSceneIds: added,
          removedSceneIds: removed
        };
      })
      .filter(Boolean); // Remove nulls

    if (changes.length > 0) {
      await syncCastingChanges(activeId, changes);
      router.refresh(); // Reloads page, clearing _pendingScenes and updating savedScenes
    }
    
    setIsSaving(false);
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
    <div className="flex h-[calc(100vh-4rem)]">
      {/* GRID CONTAINER */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden bg-zinc-950">
        
        {/* Toolbar */}
        <div className="flex justify-between items-center p-4 border-b border-zinc-800 bg-zinc-900/50">
          <div>
            <h2 className="text-lg font-bold text-white">Casting Grid</h2>
            <p className="text-xs text-zinc-500 font-mono mt-1">
              {rows.length} ROLES • {blueprintRoles.length} BLUEPRINTS
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

        {/* Table Area */}
        <div className="flex-1 overflow-y-auto custom-scrollbar p-4">
          <div className="border border-zinc-800 rounded-lg overflow-hidden">
            <table className="w-full text-left border-collapse">
              <thead className="bg-zinc-900 text-zinc-500 text-[10px] uppercase tracking-widest font-bold">
                <tr>
                  <th className="p-3 border-b border-zinc-800 w-1/4">Role Identity</th>
                  <th className="p-3 border-b border-zinc-800 w-1/4">Actor</th>
                  <th className="p-3 border-b border-zinc-800">Scene Assignments</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800 bg-zinc-900/20">
                {rows.map((row) => {
                  // Determine what to show: Pending (Blue) or Saved (Gray)
                  const displayScenes = row._pendingScenes || row.savedScenes || [];
                  const isDraft = !!row._pendingScenes;

                  return (
                    <tr key={row.id} className="hover:bg-zinc-800/50 transition-colors group">
                      {/* ROLE */}
                      <td className="p-3 text-sm font-medium text-zinc-200">
                        {row.role?.[0]?.value || <span className="text-red-500">No Role</span>}
                      </td>

                      {/* ACTOR */}
                      <td className="p-3 text-sm text-zinc-400">
                        {row.person?.[0]?.value ? (
                          <span className="text-emerald-400">{row.person[0].value}</span>
                        ) : (
                          <span className="text-zinc-600 italic">Unassigned</span>
                        )}
                      </td>

                      {/* CHICLETS */}
                      <td className="p-3">
                        <div className="flex flex-wrap gap-1.5">
                          {displayScenes.length > 0 ? (
                            displayScenes.map(scene => (
                              <span 
                                key={scene.id}
                                className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold border shadow-sm transition-all
                                  ${isDraft 
                                    ? "bg-blue-500/20 text-blue-300 border-blue-500/30 shadow-[0_0_10px_rgba(59,130,246,0.1)]" // Blue for Draft
                                    : "bg-zinc-700/30 text-zinc-400 border-zinc-700/50" // Gray for Saved
                                  }`}
                              >
                                {scene.value.split(" -")[0]}
                              </span>
                            ))
                          ) : (
                            <span className="text-zinc-700 text-xs opacity-0 group-hover:opacity-100 transition-opacity">
                              No scenes assigned
                            </span>
                          )}
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

      {/* SIDEBAR PLACEHOLDER */}
      <div className="w-80 border-l border-zinc-800 bg-zinc-900 flex flex-col">
        <div className="p-4 border-b border-zinc-800">
          <h3 className="text-xs font-black uppercase tracking-widest text-zinc-400">Actor Bank</h3>
        </div>
        <div className="flex-1 p-4 flex flex-col items-center justify-center text-zinc-600 text-center space-y-2">
           <p className="text-sm">Audition Data Loading...</p>
        </div>
      </div>
    </div>
  );
}