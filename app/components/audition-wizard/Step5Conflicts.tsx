// app/components/audition-wizard/Step5Conflicts.tsx
"use client";

import React from "react";
import { MessageSquare, MapPin, Video, UserX, AlertCircle } from "lucide-react";
import { AuditionFormData, REHEARSAL_DATES, ConflictLevel, ConflictEntry } from "./types";

interface Props {
  formData: AuditionFormData;
  updateForm: (fields: Partial<AuditionFormData>) => void;
  errors: Record<string, string>;
}

export function Step5Conflicts({ formData, updateForm, errors }: Props) {
  const markAllAvailable = () => {
    const allAvailable: Record<string, ConflictEntry> = {};
    REHEARSAL_DATES.forEach(date => allAvailable[date.id] = { level: "available", notes: "" });
    updateForm({ conflicts: allAvailable });
  };

  return (
    <div className="space-y-8 sm:space-y-10 animate-in slide-in-from-right-8 duration-500">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4">
          <div>
            <h2 className="text-2xl sm:text-4xl font-black dark:text-white uppercase italic tracking-tighter">Rehearsal Availability</h2>
            <p className="text-zinc-500 dark:text-zinc-400 mt-2 text-sm sm:text-base font-medium leading-relaxed">
              If available for all rehearsals, click next. If not, click on your conflicts below.
            </p>
          </div>
          <button type="button" onClick={markAllAvailable} className="bg-blue-600 text-white px-5 py-2 sm:px-6 sm:py-3 rounded-xl sm:rounded-2xl text-[8px] sm:text-[10px] font-black uppercase tracking-widest shrink-0">Mark All Free</button>
        </div>
        
        <div className="space-y-3 sm:space-y-4">
          {REHEARSAL_DATES.map(d => {
            const curr = formData.conflicts[d.id] || { level: "available", notes: "" };
            const showNotes = curr.level === "late" || curr.level === "tentative";
            return (
            <div key={d.id} className={`p-4 sm:p-6 rounded-[1.5rem] sm:rounded-[2.5rem] border transition-all ${curr.level === "available" ? "bg-green-50/50 border-green-200" : "bg-zinc-50 border-zinc-200 dark:bg-zinc-950 dark:border-zinc-800"}`}>
                <div className="flex flex-col lg:flex-row lg:items-center gap-4 sm:gap-6">
                  <div className="flex-1">
                      <p className={`font-black text-base sm:text-xl tracking-tighter ${curr.level === "available" ? "text-green-900" : "dark:text-white"}`}>{d.label}</p>
                      <p className="text-[9px] font-black uppercase text-zinc-400 tracking-widest italic">{d.time}</p>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 shrink-0">
                      {[{ id: "available", label: "Free", color: "bg-green-600" }, { id: "late", label: "Late", color: "bg-amber-500" }, { id: "tentative", label: "Partial", color: "bg-orange-400" }, { id: "absent", label: "Absent", color: "bg-red-600" }].map(l => (
                        <button key={l.id} type="button" onClick={() => {
                          if ((d.type === "mandatory" || d.type === "critical") && l.id !== "available") { alert("This date is a mandatory rehearsal. Conflicts are not permitted."); return; }
                          updateForm({ conflicts: {...formData.conflicts, [d.id]: {level: l.id as ConflictLevel, notes: curr.notes} } });
                        }} className={`px-2 sm:px-4 py-2 sm:py-3 text-[8px] sm:text-[9px] font-black uppercase rounded-lg sm:rounded-xl transition-all ${curr.level === l.id ? `${l.color} text-white shadow-md` : "bg-white dark:bg-zinc-900 text-zinc-400 border border-zinc-100"}`}>{l.label}</button>
                      ))}
                  </div>
                </div>
                {showNotes && (
                  <div className="mt-3 animate-in slide-in-from-top-2">
                      <div className="relative">
                        <MessageSquare size={12} className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400" />
                        <input type="text" placeholder="Explain..." value={curr.notes} onChange={e => updateForm({ conflicts: {...formData.conflicts, [d.id]: {level: curr.level, notes: e.target.value} } })} className="w-full bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg p-3 pl-10 text-[10px] sm:text-xs font-bold outline-none" />
                      </div>
                  </div>
                )}
            </div>
            );
          })}
        </div>

        <div id="field-callbackStatus" className={`pt-8 sm:pt-10 border-t mt-10 p-4 rounded-3xl transition-colors ${errors.callbackStatus ? "bg-red-50 border-red-200 border-2" : "border-zinc-200 dark:border-zinc-800"}`}>
          <h3 className="text-xl sm:text-3xl font-black dark:text-white uppercase italic tracking-tighter mb-2 flex justify-between items-center">
             Callback Availability
             {errors.callbackStatus && <span className="text-red-500 text-sm uppercase flex items-center gap-1 animate-pulse"><AlertCircle size={16}/> Required</span>}
          </h3>
          <p className="text-zinc-500 text-sm sm:text-base font-medium mb-6">Callbacks are by invitation only. If invited, how will you attend?</p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <button type="button" onClick={() => updateForm({ callbackStatus: 'in-person' })} className={`p-4 sm:p-6 rounded-2xl border-2 flex flex-col items-center gap-3 transition-all ${formData.callbackStatus === 'in-person' ? 'bg-blue-600 border-blue-600 text-white shadow-lg scale-105' : 'bg-zinc-50 dark:bg-zinc-950 border-zinc-200 text-zinc-500 hover:border-blue-400'}`}>
                  <MapPin size={24} />
                  <span className="font-black uppercase text-[10px] tracking-widest text-center leading-relaxed">In-Person<br/>(Preferred)</span>
              </button>
              <button type="button" onClick={() => updateForm({ callbackStatus: 'virtual' })} className={`p-4 sm:p-6 rounded-2xl border-2 flex flex-col items-center gap-3 transition-all ${formData.callbackStatus === 'virtual' ? 'bg-amber-500 border-amber-500 text-white shadow-lg scale-105' : 'bg-zinc-50 dark:bg-zinc-950 border-zinc-200 text-zinc-500 hover:border-amber-400'}`}>
                  <Video size={24} />
                  <span className="font-black uppercase text-[10px] tracking-widest text-center leading-relaxed">Virtual /<br/>Video Sync</span>
              </button>
              <button type="button" onClick={() => updateForm({ callbackStatus: 'unavailable' })} className={`p-4 sm:p-6 rounded-2xl border-2 flex flex-col items-center gap-3 transition-all ${formData.callbackStatus === 'unavailable' ? 'bg-red-500 border-red-500 text-white shadow-lg scale-105' : 'bg-zinc-50 dark:bg-zinc-950 border-zinc-200 text-zinc-500 hover:border-red-400'}`}>
                  <UserX size={24} />
                  <span className="font-black uppercase text-[10px] tracking-widest text-center leading-relaxed">Unavailable<br/>For Callbacks</span>
              </button>
          </div>
        </div>
    </div>
  );
}