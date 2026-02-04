"use client";

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { generateCastingRows } from '@/app/lib/actions';

// --- TYPES ---
type BaserowLink = { id: number; value: string };

type AssignmentRow = {
  id: number; 
  role: BaserowLink[];   
  person: BaserowLink[];
  production: { id: number }[];
  _pendingScenes?: BaserowLink[]; 
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
  
  // State
  const [rows, setRows] = useState<AssignmentRow[]>(assignments);
  const [isLoading, setIsLoading] = useState(false);
  const hasInitialized = useRef(false);

  // Sync Props
  useEffect(() => {
    setRows(assignments);
  }, [assignments]);

  // 🟢 AUTO-INIT
  useEffect(() => {
    const initGrid = async () => {
      if (assignments.length > 0 || hasInitialized.current) return;
      
      hasInitialized.current = true;
      setIsLoading(true);

      try {
        const result = await generateCastingRows(activeId);
        if (result.success) {
           router.refresh(); 
        } else {
           setIsLoading(false);
        }
      } catch (e) {
        setIsLoading(false);
      }
    };
    initGrid();
  }, [assignments.length, activeId, router]);

  // Stop loading
  useEffect(() => {
    if (assignments.length > 0 && isLoading) setIsLoading(false);
  }, [assignments.length, isLoading]);


  // 🔵 DRAFT BUTTON (The Chiclet Fix)
  const handleDraftAutoFill = () => {
    const draftState = rows.map((row) => {
      const roleId = row.role?.[0]?.id;
      const blueprint = blueprintRoles.find(bp => bp.id === roleId);

      if (blueprint && blueprint.activeScenes?.length > 0) {
        return {
          ...row,
          _pendingScenes: blueprint.activeScenes 
        };
      }
      return row;
    });

    setRows(draftState);
  };

  const handleSave = async () => {
    alert("This will save the Blue Chiclets to the database tomorrow!");
  };

  // --- RENDER ---

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-full space-y-4 text-zinc-400">
         <div className="animate-spin h-8 w-8 border-4 border-blue-500 rounded-full border-t-transparent"></div>
         <p className="text-xs uppercase tracking-widest">Initializing Grid...</p>
      </div>
    );
  }

  return (
    <div className="flex h-[calc(100vh-4rem)]"> {/* Full height minus header */}
      
      {/* LEFT: THE GRID */}
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
              className="px-3 py-1.5 text-xs font-bold uppercase tracking-wider text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 rounded hover:bg-emerald-500/20 transition-all"
            >
              Save Changes
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
                {rows.map((row) => (
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
                        {row._pendingScenes && row._pendingScenes.length > 0 ? (
                          row._pendingScenes.map(scene => (
                            <span 
                              key={scene.id}
                              className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-blue-500/20 text-blue-300 border border-blue-500/30 shadow-[0_0_10px_rgba(59,130,246,0.1)]"
                            >
                              {scene.value.split(" -")[0]} {/* Strip the show name for cleaner UI */}
                            </span>
                          ))
                        ) : (
                          <span className="text-zinc-700 text-xs opacity-0 group-hover:opacity-100 transition-opacity">
                            Click &quot;Draft Defaults&quot; to load
                          </span>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* RIGHT: SIDEBAR (Placeholder for tomorrow) */}
      <div className="w-80 border-l border-zinc-800 bg-zinc-900 flex flex-col">
        <div className="p-4 border-b border-zinc-800">
          <h3 className="text-xs font-black uppercase tracking-widest text-zinc-400">Actor Bank</h3>
        </div>
        <div className="flex-1 p-4 flex flex-col items-center justify-center text-zinc-600 text-center space-y-2">
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-users opacity-50"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
          <p className="text-sm">Audition Data Loading...</p>
          <p className="text-xs opacity-50">(We will wire this up tomorrow!)</p>
        </div>
      </div>

    </div>
  );
}