"use client";

import React, { useState } from "react";
import { Wand2, Loader2, Check, X, AlertTriangle, ArrowRight } from "lucide-react";

// --- TYPES ---
type BaserowLink = { id: number; value: string };

type AssignmentRow = {
  id: number; 
  role: BaserowLink[];   
  person: BaserowLink[]; 
  production: { id: number }[]; // 👈 Fixed: Added missing property
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
  allScenes: Scene[];
  releasedIds: number[];
  onUpdateRows: (newRows: AssignmentRow[]) => void;
}

type ChangeLogItem = {
    studentName: string;
    roleName: string;
    reason: string;
};

type Proposal = {
    newRows: AssignmentRow[];
    filledCount: number;
    complianceFixes: ChangeLogItem[];
};

// Helper: Checks Blueprint OR Role Name (for custom roles)
function isEnsembleRole(row: AssignmentRow, blueprints: BlueprintRole[]) {
  // 1. Try Blueprint
  const bp = blueprints.find(b => b.id === row.role?.[0]?.id);
  if (bp) {
      const type = (bp.type || "").toLowerCase();
      const name = (bp.name || "").toLowerCase();
      return (
        type.includes("ensemble") || 
        type.includes("chorus") || 
        type.includes("group") || 
        type.includes("dancers") ||
        (name.endsWith("s") && !name.includes("louis"))
      );
  }

  // 2. Fallback: Check the Row's Role Name directly (for custom added roles)
  const rowRoleName = (row.role?.[0]?.value || "").toLowerCase();
  return (
      rowRoleName.includes("ensemble") || 
      rowRoleName.includes("chorus") || 
      rowRoleName.includes("group") || 
      (rowRoleName.endsWith("s") && !rowRoleName.includes("louis"))
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
  const [proposal, setProposal] = useState<Proposal | null>(null);

  const handleAutoCast = () => {
    setIsCasting(true);

    setTimeout(() => {
      // 1. SETUP
      const assignedStudentIds = new Set<number>();
      rows.forEach((row) => row.person?.forEach((p) => assignedStudentIds.add(p.id)));

      const unassignedStudents = roster.filter(
        (s) => !assignedStudentIds.has(s.id) && !releasedIds.includes(s.id)
      );
      
      const allActiveStudents = roster.filter(s => !releasedIds.includes(s.id));
      let newRows = [...rows];
      let filledCount = 0;
      const complianceFixes: ChangeLogItem[] = [];

      // 2. SHUFFLE
      const shuffled = [...unassignedStudents];
      for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
      }

      let studentPointer = 0;

      // ========================================================================
      // PASS 1: BASE ASSIGNMENT (Fill Empty Spots)
      // ========================================================================
      newRows = newRows.map((row) => {
        if (studentPointer >= shuffled.length) return row;
        if (!row.person || row.person.length === 0) {
          const candidate = shuffled[studentPointer];
          studentPointer++;
          filledCount++;
          return {
            ...row,
            person: [{ id: candidate.id, value: candidate.name }],
            auditionInfo: candidate.auditionInfo,
            auditionGrades: candidate.auditionGrades,
          };
        }
        return row;
      });

      // Overflow remaining kids into Ensemble
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
                filledCount++;
                studentPointer++;
                ePtr = (ePtr + 1) % ensembleIndices.length;
            }
         }
      }

      // ========================================================================
      // PASS 2: COMPLIANCE OPTIMIZATION
      // ========================================================================
      allActiveStudents.forEach(student => {
          let safetyValve = 0;
          let isCompliant = false;

          while (!isCompliant && safetyValve < 3) { 
            safetyValve++;

            // Calculate Compliance
            const myRows = newRows.filter(r => r.person?.some(p => p.id === student.id));
            const mySceneIds = new Set<number>();
            myRows.forEach(row => {
                const bp = blueprintRoles.find(b => b.id === row.role?.[0]?.id);
                // Use _pendingScenes if present (for draft/custom roles), otherwise blueprint
                const active = row._pendingScenes || bp?.activeScenes || []; 
                active.forEach(s => mySceneIds.add(s.id));
            });

            let hasAct1 = false, hasAct2 = false;
            mySceneIds.forEach(sid => {
                const scene = allScenes.find(s => s.id === sid);
                if (scene?.act.includes("1")) hasAct1 = true;
                if (scene?.act.includes("2")) hasAct2 = true;
            });

            const needsAct1 = !hasAct1;
            const needsAct2 = !hasAct2;
            const needsMoreScenes = mySceneIds.size < 3;

            if (!needsAct1 && !needsAct2 && !needsMoreScenes) {
                isCompliant = true;
                break;
            }

            // Find Fixer Role
            const candidateRows = newRows.map((r, idx) => ({ row: r, idx })).filter(({ row }) => {
                if (!isEnsembleRole(row, blueprintRoles)) return false;
                if (row.person?.some(p => p.id === student.id)) return false;
                return true;
            });

            // Find best fit
            const bestFit = candidateRows.find(({ row }) => {
                const bp = blueprintRoles.find(b => b.id === row.role?.[0]?.id);
                const sceneIds = (row._pendingScenes || bp?.activeScenes || []).map(s => s.id);
                
                let providesAct1 = false, providesAct2 = false;
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
                const targetRow = newRows[bestFit.idx];
                const newPersonList = [...(targetRow.person || []), { id: student.id, value: student.name }];
                newRows[bestFit.idx] = { ...targetRow, person: newPersonList };

                let reason = "Low Scene Count";
                if (needsAct1) reason = "Missing Act 1";
                if (needsAct2) reason = "Missing Act 2";

                complianceFixes.push({
                    studentName: student.name,
                    roleName: targetRow.role?.[0]?.value || "Ensemble",
                    reason
                });
            } else {
                break; 
            }
          }
      });

      setProposal({ newRows, filledCount, complianceFixes });
      setIsCasting(false);
    }, 800);
  };

  const confirmProposal = () => {
      if (proposal) {
          onUpdateRows(proposal.newRows);
          setProposal(null);
      }
  };

  return (
    <>
        <button
            onClick={handleAutoCast}
            disabled={isCasting}
            className="flex items-center gap-2 px-3 py-1.5 text-xs font-bold uppercase tracking-wider text-purple-300 bg-purple-500/10 border border-purple-500/20 rounded hover:bg-purple-500/20 transition-all disabled:opacity-50"
        >
            {isCasting ? <Loader2 size={14} className="animate-spin" /> : <Wand2 size={14} />}
            {isCasting ? "Calculating..." : "Smart Auto-Cast"}
        </button>

        {/* --- REVIEW MODAL --- */}
        {proposal && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
                <div className="bg-zinc-900 border border-zinc-700 w-full max-w-lg rounded-xl shadow-2xl overflow-hidden flex flex-col max-h-[80vh]">
                    <div className="p-4 border-b border-zinc-800 bg-zinc-950 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-purple-500/20 rounded-lg text-purple-400"><Wand2 size={20} /></div>
                            <div>
                                <h3 className="text-sm font-bold text-white uppercase tracking-wide">Review Auto-Cast</h3>
                                <p className="text-xs text-zinc-500">Proposed changes based on requirements.</p>
                            </div>
                        </div>
                        <button onClick={() => setProposal(null)} className="text-zinc-500 hover:text-white"><X size={20} /></button>
                    </div>

                    <div className="flex-1 overflow-y-auto p-4 custom-scrollbar space-y-4">
                        <div className="grid grid-cols-2 gap-3">
                            <div className="bg-zinc-800/50 p-3 rounded border border-zinc-700/50 text-center">
                                <div className="text-2xl font-black text-white">{proposal.filledCount}</div>
                                <div className="text-[10px] uppercase tracking-wider text-zinc-500 font-bold">Assignments</div>
                            </div>
                            <div className="bg-zinc-800/50 p-3 rounded border border-zinc-700/50 text-center">
                                <div className="text-2xl font-black text-purple-400">{proposal.complianceFixes.length}</div>
                                <div className="text-[10px] uppercase tracking-wider text-zinc-500 font-bold">Fixes</div>
                            </div>
                        </div>

                        {proposal.complianceFixes.length > 0 ? (
                            <div className="space-y-2">
                                <div className="text-[10px] uppercase font-bold text-zinc-500 tracking-wider">Adjustments</div>
                                {proposal.complianceFixes.map((fix, i) => (
                                    <div key={i} className="flex items-center justify-between text-xs bg-zinc-950/50 border border-zinc-800 p-2 rounded">
                                        <div className="flex items-center gap-2">
                                            <span className="font-bold text-zinc-300">{fix.studentName}</span>
                                            <ArrowRight size={10} className="text-zinc-600" />
                                            <span className="text-purple-300">{fix.roleName}</span>
                                        </div>
                                        <div className="flex items-center gap-1 text-[10px] text-yellow-500/80 bg-yellow-500/10 px-1.5 py-0.5 rounded border border-yellow-500/20">
                                            <AlertTriangle size={8} /> {fix.reason}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="text-center py-6 text-zinc-500 text-xs italic border border-dashed border-zinc-800 rounded">
                                <Check size={16} className="mx-auto mb-2 opacity-50" />
                                No extra compliance fixes needed.
                            </div>
                        )}
                    </div>

                    <div className="p-4 border-t border-zinc-800 bg-zinc-900 flex gap-3">
                        <button onClick={() => setProposal(null)} className="flex-1 py-2.5 text-xs font-bold uppercase tracking-wider text-zinc-400 hover:text-white bg-zinc-800 rounded">Cancel</button>
                        <button onClick={confirmProposal} className="flex-[2] py-2.5 text-xs font-bold uppercase tracking-wider text-black bg-purple-500 hover:bg-purple-400 rounded flex items-center justify-center gap-2"><Check size={14} /> Apply Changes</button>
                    </div>
                </div>
            </div>
        )}
    </>
  );
}