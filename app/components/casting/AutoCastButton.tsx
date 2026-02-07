"use client";

import React, { useState } from "react";
import { Wand2, Loader2 } from "lucide-react";

// --- TYPES (Must match CastingClient.tsx exactly) ---
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
  vocalScore: number;
  actingScore: number;
  danceScore: number;
  auditionInfo: any;
  auditionGrades: any;
};

interface AutoCastProps {
  rows: AssignmentRow[];
  roster: RosterStudent[];
  onUpdateRows: (newRows: AssignmentRow[]) => void;
}

export default function AutoCastButton({ rows, roster, onUpdateRows }: AutoCastProps) {
  const [isCasting, setIsCasting] = useState(false);

  const handleAutoCast = () => {
    setIsCasting(true);

    // Simulate a small delay so it feels like "thinking"
    setTimeout(() => {
      // 1. Find all students who are currently assigned to ANY role
      const assignedStudentIds = new Set<number>();
      rows.forEach((row) => {
        row.person?.forEach((p) => assignedStudentIds.add(p.id));
      });

      // 2. Filter the roster for students who are completely free
      const availableStudents = roster.filter(
        (s) => !assignedStudentIds.has(s.id)
      );

      // 3. Shuffle the available students (Fisher-Yates Shuffle)
      const shuffled = [...availableStudents];
      for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
      }

      let studentIndex = 0;

      // 4. Map over rows and fill the empty ones
      const newRows = rows.map((row) => {
        // If row is already filled, skip it
        if (row.person && row.person.length > 0) {
          return row;
        }

        // If we ran out of students, skip
        if (studentIndex >= shuffled.length) {
          return row;
        }

        // Assign the next available student
        const candidate = shuffled[studentIndex];
        studentIndex++;

        return {
          ...row,
          person: [{ id: candidate.id, value: candidate.name }],
          auditionInfo: candidate.auditionInfo,
          auditionGrades: candidate.auditionGrades,
        };
      });

      // 5. Commit changes
      onUpdateRows(newRows);
      setIsCasting(false);
    }, 600);
  };

  return (
    <button
      onClick={handleAutoCast}
      disabled={isCasting}
      className="flex items-center gap-2 px-3 py-1.5 text-xs font-bold uppercase tracking-wider text-purple-300 bg-purple-500/10 border border-purple-500/20 rounded hover:bg-purple-500/20 transition-all disabled:opacity-50"
      title="Dev Tool: Randomly fill empty slots"
    >
      {isCasting ? <Loader2 size={14} className="animate-spin" /> : <Wand2 size={14} />}
      {isCasting ? "Casting..." : "Auto-Cast"}
    </button>
  );
}