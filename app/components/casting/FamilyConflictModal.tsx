"use client";

import React, { useState } from "react";
import { CalendarX2, Loader2, X } from "lucide-react";
import { toast } from "@/app/components/ToastProvider";
import { submitFamilyConflictAction } from "@/app/actions/phase2-ops";

export default function FamilyConflictModal({
  tenant,
  productionId,
  students,
}: {
  tenant: string;
  productionId: number;
  students: Array<{ studentId: number; name: string }>;
}) {
  const [open, setOpen] = useState(false);
  const [studentId, setStudentId] = useState<number>(students[0]?.studentId || 0);
  const [conflictType, setConflictType] = useState("Absent");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);

  if (students.length === 0) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!notes.trim()) {
      toast.error("Please include the date and reason for the conflict.");
      return;
    }
    setSaving(true);
    const res = await submitFamilyConflictAction(tenant, productionId, {
      studentExternalId: studentId || students[0].studentId,
      conflictType,
      notes,
    });
    setSaving(false);
    if (!res.success) {
      toast.error(res.error || "Could not submit conflict.");
      return;
    }
    toast.success("Schedule conflict submitted to Stage Management!");
    setNotes("");
    setOpen(false);
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/30 text-amber-200 text-xs font-bold uppercase tracking-wider transition-colors"
      >
        <CalendarX2 size={14} /> Report Rehearsal Conflict
      </button>

      {open && (
        <div
          className="fixed inset-0 z-[260] bg-black/85 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => !saving && setOpen(false)}
        >
          <form
            onSubmit={handleSubmit}
            className="w-full max-w-md bg-zinc-950 border border-white/10 rounded-2xl p-5 space-y-4 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold uppercase tracking-wider text-white">
                Report Schedule Conflict
              </h3>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="text-zinc-400 hover:text-white"
              >
                <X size={18} />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <label className="block space-y-1">
                <span className="text-[10px] font-bold uppercase text-zinc-400">Student</span>
                <select
                  value={studentId}
                  onChange={(e) => setStudentId(Number(e.target.value))}
                  className="w-full bg-zinc-900 border border-white/10 rounded-xl px-3 py-2.5 text-white"
                >
                  {students.map((s) => (
                    <option key={s.studentId} value={s.studentId}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </label>

              <label className="block space-y-1">
                <span className="text-[10px] font-bold uppercase text-zinc-400">Conflict Type</span>
                <select
                  value={conflictType}
                  onChange={(e) => setConflictType(e.target.value)}
                  className="w-full bg-zinc-900 border border-white/10 rounded-xl px-3 py-2.5 text-white"
                >
                  <option value="Absent">Full Absence</option>
                  <option value="Late Arrival">Late Arrival</option>
                  <option value="Early Dismissal">Early Dismissal</option>
                </select>
              </label>

              <label className="block space-y-1">
                <span className="text-[10px] font-bold uppercase text-zinc-400">
                  Date(s) &amp; Details
                </span>
                <textarea
                  required
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="e.g., May 14 — arriving 30 mins late due to band concert"
                  className="w-full min-h-[84px] bg-zinc-900 border border-white/10 rounded-xl p-3 text-white placeholder:text-zinc-500"
                />
              </label>
            </div>

            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setOpen(false)}
                disabled={saving}
                className="px-4 py-2 rounded-xl bg-zinc-900 text-xs font-semibold text-zinc-300"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={saving}
                className="px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 disabled:opacity-50 text-xs font-bold uppercase tracking-wider text-white flex items-center gap-1.5"
              >
                {saving && <Loader2 size={13} className="animate-spin" />}
                Submit Conflict
              </button>
            </div>
          </form>
        </div>
      )}
    </>
  );
}
