"use client";

import React, { useState } from "react";
import { Wand2, Loader2, Users, CheckCircle2 } from "lucide-react";

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
  auditionInfo: any;
  auditionGrades: any;
};

type BlueprintRole = { id: number; name: string; activeScenes: BaserowLink[]; type?: string; };
type Scene = { id: number; name: string; order: number; act: string; };

interface AutoCastProps {
  rows: AssignmentRow[];
  roster: RosterStudent[];
  blueprintRoles: BlueprintRole[];
  allScenes: Scene[]; // 👈 NEW REQUIREMENT: We need scene data to check Acts
  releasedIds: number[];
  onUpdateRows: (newRows: AssignmentRow[]) => void;
}

// Helper: Check if a row is generally considered "Ensemble" (stackable)
function isEnsembleRole(row: AssignmentRow, blueprints: BlueprintRole[]) {
  const bp = blueprints.find(b => b.id === row.role?.[0]?.id);
  if (!bp) return false;
  
  const type = (bp.type || "").toLowerCase();
  const name = (bp.name || "").toLowerCase();
  
  // Keywords that suggest this role can hold multiple people
  return (
    type.includes("ensemble") || 
    type.includes("chorus") || 
    type.includes("group") || 
    type.includes("dancers") ||
    // Heuristic: Plural names (e.g., "Gulls", "Chefs") often imply ensemble
    (name.endsWith("s") && !name.includes("louis")) // Exclude specific named chars if needed
  );
}

export default function AutoCastButton({ 
  rows, 
  roster, 
  blueprintRoles, 
  allScenes, 
  releasedIds, 
  onUpdateRows 
}: AutoCastProps) {
  const [isCasting, setIsCasting] = useState(false);

  const handleAutoCast = () => {
    setIsCasting(true);

    setTimeout(() => {
      // 1. Identify Students
      const assignedStudentIds = new Set<number>();
      rows.forEach((row) => row.person?.forEach((p) => assignedStudentIds.add(p.id)));

      // Everyone who needs at least one role
      const unassignedStudents = roster.filter(
        (s) => !assignedStudentIds.has(s.id) && !releasedIds.includes(s.id)
      );

      // Everyone active (for the compliance pass later)
      const allActiveStudents = roster.filter(s => !releasedIds.includes(s.id));

      // 2. Clone Rows
      let newRows = [...rows];

      // ========================================================================
      // PASS 1: BASE ASSIGNMENT (Fill Empty Spots)
      // ========================================================================
      
      // Shuffle unassigned students
      const shuffled = [...unassignedStudents];
      for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
      }

      let studentPointer = 0;

      // Fill completely empty rows first
      newRows = newRows.map((row) => {
        if (studentPointer >= shuffled.length) return row;
        if (!row.person || row.person.length === 0) {
          const candidate = shuffled[studentPointer];
          studentPointer++;
          return {
            ...row,
            person: [{ id: candidate.id, value: candidate.name }],
            auditionInfo: candidate.auditionInfo,
            auditionGrades: candidate.auditionGrades,
          };
        }
        return row;
      });

      // If kids are STILL unassigned, dump them into the first available Ensemble row
      // (This ensures 100% cast rate before we optimize)
      if (studentPointer < shuffled.length) {
         const ensembleIndices = newRows
            .map((r, i) => isEnsembleRole(r, blueprintRoles) ? i : -1)
            .filter(i => i !== -1);
            
         if (ensembleIndices.length > 0) {
            let ePtr = 0;
            while (studentPointer < shuffled.length) {
                const candidate = shuffled[studentPointer];
                const targetIdx = ensembleIndices[ePtr];
                const currentPeople = newRows[targetIdx].person || [];
                
                newRows[targetIdx] = {
                    ...newRows[targetIdx],
                    person: [...currentPeople, { id: candidate.id, value: candidate.name }]
                };
                studentPointer++;
                ePtr = (ePtr + 1) % ensembleIndices.length;
            }
         }
      }

      // ========================================================================
      // PASS 2: COMPLIANCE OPTIMIZATION (The "Smart" Stacking)
      // ========================================================================
      
      // We iterate through every student to check if they meet the criteria.
      // If not, we find an ensemble role that fixes their specific gap.
      
      allActiveStudents.forEach(student => {
          let safetyValve = 0;
          let isCompliant = false;

          while (!isCompliant && safetyValve < 3) { // Max 3 extra assignments per kid to prevent infinite loops
            safetyValve++;

            // 1. Calculate Current Stats
            const myRows = newRows.filter(r => r.person?.some(p => p.id === student.id));
            const mySceneIds = new Set<number>();
            myRows.forEach(row => {
                const bp = blueprintRoles.find(b => b.id === row.role?.[0]?.id);
                // Use pending scenes if they exist, otherwise blueprint default scenes
                const active = row._pendingScenes || bp?.activeScenes || [];
                active.forEach(s => mySceneIds.add(s.id));
            });

            let hasAct1 = false;
            let hasAct2 = false;
            mySceneIds.forEach(sid => {
                const scene = allScenes.find(s => s.id === sid);
                if (scene?.act.includes("1")) hasAct1 = true;
                if (scene?.act.includes("2")) hasAct2 = true;
            });

            const needsAct1 = !hasAct1;
            const needsAct2 = !hasAct2;
            const needsMoreScenes = mySceneIds.size < 3;

            // If we are good, break loop
            if (!needsAct1 && !needsAct2 && !needsMoreScenes) {
                isCompliant = true;
                break;
            }

            // 2. Find a "Fixer" Role
            // We look for an Ensemble row that the student is NOT already in
            // which provides the missing piece.
            
            const candidateRows = newRows.map((r, idx) => ({ row: r, idx })).filter(({ row }) => {
                // Must be ensemble
                if (!isEnsembleRole(row, blueprintRoles)) return false;
                // Must not already contain this student
                if (row.person?.some(p => p.id === student.id)) return false;
                return true;
            });

            let bestFitIndex = -1;

            // STRATEGY: Find first role that satisfies the biggest need
            const bestFit = candidateRows.find(({ row }) => {
                const bp = blueprintRoles.find(b => b.id === row.role?.[0]?.id);
                const sceneIds = (row._pendingScenes || bp?.activeScenes || []).map(s => s.id);
                
                // Check what this role provides
                let providesAct1 = false;
                let providesAct2 = false;
                sceneIds.forEach(sid => {
                    const scene = allScenes.find(s => s.id === sid);
                    if (scene?.act.includes("1")) providesAct1 = true;
                    if (scene?.act.includes("2")) providesAct2 = true;
                });

                if (needsAct1 && providesAct1) return true;
                if (needsAct2 && providesAct2) return true;
                if (needsMoreScenes && sceneIds.length > 0) return true;
                
                return false;
            });

            if (bestFit) {
                bestFitIndex = bestFit.idx;
            }

            // 3. Apply the Fix
            if (bestFitIndex !== -1) {
                const targetRow = newRows[bestFitIndex];
                const newPersonList = [...(targetRow.person || []), { id: student.id, value: student.name }];
                
                newRows[bestFitIndex] = {
                    ...targetRow,
                    person: newPersonList
                };
            } else {
                // No roles left to help this kid (e.g., all ensemble roles are Act 2 and kid needs Act 1)
                break;
            }
          }
      });

      // 4. Commit
      onUpdateRows(newRows);
      setIsCasting(false);
    }, 800); // Slightly longer timeout for the heavier math
  };

  return (
    <button
      onClick={handleAutoCast}
      disabled={isCasting}
      className="flex items-center gap-2 px-3 py-1.5 text-xs font-bold uppercase tracking-wider text-purple-300 bg-purple-500/10 border border-purple-500/20 rounded hover:bg-purple-500/20 transition-all disabled:opacity-50"
      title="Intelligently assign roles to satisfy Act 1/2 and Scene Count requirements."
    >
      {isCasting ? <Loader2 size={14} className="animate-spin" /> : <Wand2 size={14} />}
      {isCasting ? "Optimizing..." : "Smart Auto-Cast"}
    </button>
  );
}