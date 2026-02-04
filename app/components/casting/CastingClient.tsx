"use client";

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { generateCastingRows, syncCastingChanges } from '@/app/lib/actions';

// --- TYPES (Matching your Clean Server Data) ---
type BaserowLink = { id: number; value: string };

type AssignmentRow = {
  id: number; // Row ID in Assignments Table
  role: BaserowLink[];   
  person: BaserowLink[];
  production: { id: number }[];
  // Local UI state for the Draft mode
  _pendingScenes?: BaserowLink[]; 
};

type BlueprintRole = {
  id: number;
  name: string; // The Role Name (e.g., "Ariel")
  activeScenes: BaserowLink[]; // The Default Chiclets
};

interface CastingClientProps {
  assignments: AssignmentRow[];
  blueprintRoles: BlueprintRole[];
  activeId: number; // Production ID
}

export default function CastingClient({ 
  assignments = [], 
  blueprintRoles = [], 
  activeId 
}: CastingClientProps) {
  const router = useRouter();
  
  // 1. Local State
  const [rows, setRows] = useState<AssignmentRow[]>(assignments);
  const [isLoading, setIsLoading] = useState(false);
  const hasInitialized = useRef(false);

  // 2. Sync Props to State (When Server Refreshes)
  useEffect(() => {
    setRows(assignments);
  }, [assignments]);

  // 3. 🟢 AUTO-INIT: If Grid is Empty, Create Rows
  useEffect(() => {
    const initGrid = async () => {
      // If we have rows, or already ran this, STOP.
      if (assignments.length > 0 || hasInitialized.current) return;
      
      hasInitialized.current = true;
      setIsLoading(true);

      try {
        console.log("🚀 Grid empty. Auto-Initializing...");
        const result = await generateCastingRows(activeId);
        if (result.success) {
           router.refresh(); 
           // isLoading stays true until new props arrive
        } else {
           setIsLoading(false);
        }
      } catch (e) {
        console.error("Init Error", e);
        setIsLoading(false);
      }
    };

    initGrid();
  }, [assignments.length, activeId, router]);

  // Stop loading spinner when data arrives
  useEffect(() => {
    if (assignments.length > 0 && isLoading) {
      setIsLoading(false);
    }
  }, [assignments.length, isLoading]);


  // 4. 🔵 DRAFT BUTTON: Fill Chiclets from Blueprint
  const handleDraftAutoFill = () => {
    const draftState = rows.map((row) => {
      // Get the Role ID attached to this row
      const roleId = row.role?.[0]?.id;
      
      // Find the "Master" definition for this role
      const blueprint = blueprintRoles.find(bp => bp.id === roleId);

      // If found, copy the Default Scenes into our pending slot
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

  // 5. SAVE (Stub for tonight)
  const handleSave = async () => {
    // This is where you'd call syncCastingChanges
    // For tonight, we just want to see the visual chiclets working!
    alert("Draft Chiclets are visible! (Save logic goes here)");
  };

  // --- RENDER ---

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-96 space-y-4 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
         <div className="animate-spin h-10 w-10 border-4 border-blue-600 rounded-full border-t-transparent"></div>
         <p className="text-gray-500 font-medium">Initializing Casting Grid...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* HEADER CONTROLS */}
      <div className="flex justify-between items-center bg-white p-4 rounded-lg shadow-sm border border-gray-200">
        <div>
          <h2 className="text-lg font-bold text-gray-800">Casting Grid</h2>
          <p className="text-sm text-gray-500">{rows.length} Roles Found</p>
        </div>
        <div className="space-x-3">
          <button 
            onClick={handleDraftAutoFill}
            className="px-4 py-2 bg-indigo-100 text-indigo-700 font-semibold rounded hover:bg-indigo-200 transition-colors"
          >
            Draft: Auto-Fill Defaults
          </button>
          <button 
            onClick={handleSave}
            className="px-4 py-2 bg-blue-600 text-white font-semibold rounded hover:bg-blue-700 transition-colors shadow-sm"
          >
            Save Updates
          </button>
        </div>
      </div>

      {/* THE GRID */}
      <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
        <table className="w-full text-left border-collapse">
          <thead className="bg-gray-50 text-gray-600 text-xs uppercase tracking-wider">
            <tr>
              <th className="p-4 border-b">Role</th>
              <th className="p-4 border-b">Actor</th>
              <th className="p-4 border-b">Assigned Scenes (Chiclets)</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {rows.map((row) => (
              <tr key={row.id} className="hover:bg-gray-50">
                {/* ROLE NAME */}
                <td className="p-4 font-medium text-gray-900 w-1/4">
                  {row.role?.[0]?.value || <span className="text-red-400 italic">No Role</span>}
                </td>

                {/* ACTOR NAME */}
                <td className="p-4 text-gray-600 w-1/4">
                  {row.person?.[0]?.value || <span className="text-gray-400 italic">Unassigned</span>}
                </td>

                {/* SCENE CHICLETS */}
                <td className="p-4">
                  <div className="flex flex-wrap gap-2">
                    {/* Render Pending/Draft Scenes */}
                    {row._pendingScenes && row._pendingScenes.length > 0 ? (
                      row._pendingScenes.map(scene => (
                        <span 
                          key={scene.id}
                          className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 border border-blue-200"
                        >
                          {scene.value}
                        </span>
                      ))
                    ) : (
                      <span className="text-gray-300 text-sm">No scenes</span>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}