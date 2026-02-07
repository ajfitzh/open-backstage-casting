"use client";

import React, { useState } from "react";
import { Wand2, Loader2, Users } from "lucide-react";

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

interface AutoCastProps {
  rows: AssignmentRow[];
  roster: RosterStudent[];
  blueprintRoles: BlueprintRole[]; // 👈 NEW PROP
  releasedIds: number[];           // 👈 NEW PROP
  onUpdateRows: (newRows: AssignmentRow[]) => void;
}

export default function AutoCastButton({ rows, roster, blueprintRoles, releasedIds, onUpdateRows }: AutoCastProps) {
  const [isCasting, setIsCasting] = useState(false);

  const handleAutoCast = () => {
    setIsCasting(true);

    setTimeout(() => {
      // 1. Identify Students who need a role
      //    (In Roster AND Not Released AND Not Currently Assigned)
      const assignedStudentIds = new Set<number>();
      rows.forEach((row) => {
        row.person?.forEach((p) => assignedStudentIds.add(p.id));
      });

      const availableStudents = roster.filter(
        (s) => !assignedStudentIds.has(s.id) && !releasedIds.includes(s.id)
      );

      if (availableStudents.length === 0) {
        alert("All active students are already cast!");
        setIsCasting(false);
        return;
      }

      // 2. Shuffle Students (Fisher-Yates)
      const shuffled = [...availableStudents];
      for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
      }

      // 3. Clone Rows to mutate
      let newRows = [...rows];
      let studentIndex = 0;

      // --- PHASE 1: FILL EMPTY SLOTS ---
      // We look for rows with 0 people.
      newRows = newRows.map((row) => {
        if (studentIndex >= shuffled.length) return row; // Stop if out of kids

        // If row is empty, fill it
        if (!row.person || row.person.length === 0) {
          const candidate = shuffled[studentIndex];
          studentIndex++;
          return {
            ...row,
            person: [{ id: candidate.id, value: candidate.name }],
            auditionInfo: candidate.auditionInfo,
            auditionGrades: candidate.auditionGrades,
          };
        }
        return row;
      });

      // --- PHASE 2: OVERFLOW INTO ENSEMBLE ---
      // If we still have kids left, find "Ensemble" rows and add them.
      if (studentIndex < shuffled.length) {
        
        // Find indices of rows that are "Ensemble"
        const ensembleIndices = newRows
          .map((row, idx) => {
            const bp = blueprintRoles.find(b => b.id === row.role?.[0]?.id);
            // Check for explicit "Ensemble" type OR plural-sounding names if type is missing
            const isEnsemble = bp?.type?.toLowerCase().includes("ensemble") || 
                               bp?.type?.toLowerCase().includes("chorus") ||
                               bp?.type?.toLowerCase().includes("group") ||
                               bp?.name?.toLowerCase().endsWith("s"); // e.g. "Gulls"
            return isEnsemble ? idx : -1;
          })
          .filter(idx => idx !== -1);

        if (ensembleIndices.length > 0) {
          // Round-Robin distribution
          let ensemblePointer = 0;
          
          while (studentIndex < shuffled.length) {
            const candidate = shuffled[studentIndex];
            const targetRowIndex = ensembleIndices[ensemblePointer];
            const targetRow = newRows[targetRowIndex];

            // Append to existing person array
            const updatedPersonList = [
                ...(targetRow.person || []), 
                { id: candidate.id, value: candidate.name }
            ];

            // Update row
            newRows[targetRowIndex] = {
                ...targetRow,
                person: updatedPersonList,
                // Note: auditionInfo on the row usually tracks the *first* person for the card view,
                // but the "Chemistry" view will see everyone in the 'person' array.
            };

            studentIndex++;
            ensemblePointer = (ensemblePointer + 1) % ensembleIndices.length;
          }
        }
      }

      // 4. Commit
      onUpdateRows(newRows);
      setIsCasting(false);
    }, 600);
  };

  return (
    <button
      onClick={handleAutoCast}
      disabled={isCasting}
      className="flex items-center gap-2 px-3 py-1.5 text-xs font-bold uppercase tracking-wider text-purple-300 bg-purple-500/10 border border-purple-500/20 rounded hover:bg-purple-500/20 transition-all disabled:opacity-50"
      title="Fill empty roles, then stack remaining students into Ensemble roles."
    >
      {isCasting ? <Loader2 size={14} className="animate-spin" /> : <Users size={14} />}
      {isCasting ? "Casting..." : "Auto-Cast All"}
    </button>
  );
}