"use client";

import React, { useState, useEffect, useRef, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { generateCastingRows, syncCastingChanges } from '@/app/lib/actions';

// Types based on your schema
type Assignment = {
  id: number;
  "Performance Identity": { id: number; value: string }[]; // Blueprint Role
  "Person": { id: number; value: string }[];
  "Production": { id: number }[];
};

type BlueprintRole = {
  id: number;
  "Active Scenes": { id: number; value: string }[]; // Default Scenes
};

interface CastingClientProps {
  assignments: Assignment[];
  blueprintRoles: BlueprintRole[]; // Pass this from parent!
  activeId: number; // Production ID
}

export default function CastingClient({ 
  assignments = [], 
  blueprintRoles = [], 
  activeId 
}: CastingClientProps) {
  const router = useRouter();
  
  // 1. Local State for UI Optimism
  const [localAssignments, setLocalAssignments] = useState<Assignment[]>(assignments);
  const [isInitializing, setIsInitializing] = useState(false);
  const [isDrafting, setIsDrafting] = useState(false);
  
  // Guard ref to prevent double-firing in Strict Mode
  const hasInitialized = useRef(false);

  // 🟢 CRITICAL FIX: Sync State when Props Update
  // When router.refresh() finishes, 'assignments' changes. We must update local state.
  useEffect(() => {
    setLocalAssignments(assignments);
  }, [assignments]);

  // 🟢 ROBUST AUTO-INIT
  useEffect(() => {
    const initGrid = async () => {
      // If we have data, or already ran this, STOP.
      if (assignments.length > 0 || hasInitialized.current) return;
      
      hasInitialized.current = true;
      setIsInitializing(true);

      try {
        console.log("🚀 Grid empty. Auto-Initializing...");
        const result = await generateCastingRows(activeId);
        
        if (result.success) {
           // Force a data refresh from server
           router.refresh(); 
           // Note: isInitializing stays true until new props arrive or we manually toggle
        } else {
           console.error("Init failed:", result.error);
           setIsInitializing(false); // Stop loading on error
        }
      } catch (e) {
        console.error("Critical Init Error", e);
        setIsInitializing(false);
      }
    };

    initGrid();
  }, [assignments.length, activeId, router]);

  // Turn off loading spinner once data actually arrives
  useEffect(() => {
    if (assignments.length > 0 && isInitializing) {
      setIsInitializing(false);
    }
  }, [assignments.length, isInitializing]);


  // 🔵 DRAFT MODE: Auto-Fill Chiclets
  const handleDraftAutoFill = () => {
    setIsDrafting(true);
    
    // Create a deep copy or map of the current assignments to modify
    const draftState = localAssignments.map((row) => {
      // 1. Find the Role ID attached to this row
      const roleId = row["Performance Identity"]?.[0]?.id;
      
      // 2. Find the Blueprint logic for this role
      const blueprint = blueprintRoles.find(bp => bp.id === roleId);

      if (!blueprint || !blueprint["Active Scenes"]) return row;

      // 3. (Visual Logic) In a real app, you probably store "Pending Scenes" in state
      // For this example, we assume you have a way to display these "Active Scenes" IDs
      // locally before saving.
      
      console.log(`Role ${roleId} defaults to scenes:`, blueprint["Active Scenes"]);
      
      return {
        ...row,
        _pendingScenes: blueprint["Active Scenes"] // Store this in a temp field for UI
      };
    });

    setLocalAssignments(draftState);
    setIsDrafting(false);
  };

  // --- RENDER ---

  if (isInitializing) {
    return (
      <div className="flex flex-col items-center justify-center h-64 space-y-4">
         <div className="animate-spin h-8 w-8 border-4 border-blue-500 rounded-full border-t-transparent"></div>
         <p className="text-gray-500">Setting up the casting board for the first time...</p>
      </div>
    );
  }

  return (
    <div>
      <div className="flex justify-between mb-4">
        <h2>Casting Grid ({localAssignments.length} Rows)</h2>
        <button 
          onClick={handleDraftAutoFill}
          className="bg-purple-600 text-white px-4 py-2 rounded shadow hover:bg-purple-700"
        >
          Draft: Auto-Fill Defaults
        </button>
      </div>

      {/* RENDER YOUR GRID HERE using localAssignments */}
      <div className="grid gap-2">
        {localAssignments.map(row => (
           <div key={row.id} className="p-2 border rounded">
              Role: {row["Performance Identity"]?.[0]?.value || "Unknown"}
              {/* Render Chiclets here based on row._pendingScenes or DB data */}
           </div>
        ))}
      </div>
    </div>
  );
}