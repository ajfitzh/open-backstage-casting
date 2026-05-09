// app/components/audition-wizard/Step6Committees.tsx
"use client";

import React from "react";
import { AlertCircle } from "lucide-react";
import { AuditionFormData, PRE_SHOW_COMMITTEES, SHOW_COMMITTEES } from "./types";

interface Props {
  formData: AuditionFormData;
  updateForm: (fields: Partial<AuditionFormData>) => void;
  errors: Record<string, string>;
  setShowCommitteeGuide: (show: boolean) => void;
}

export function Step6Committees({ formData, updateForm, errors, setShowCommitteeGuide }: Props) {
  return (
    <div className="space-y-8 sm:space-y-12 animate-in slide-in-from-right-8 duration-500">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4">
        <div>
          <h2 className="text-2xl sm:text-4xl font-black dark:text-white uppercase italic tracking-tighter">Parent Committees</h2>
          <p className="text-zinc-500 dark:text-zinc-400 mt-2 text-sm sm:text-base font-medium leading-relaxed">
            Each family must serve on one Pre-Show and one Show Week committee.
          </p>
        </div>
        <button type="button" onClick={() => setShowCommitteeGuide(true)} className="bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 px-5 py-3 rounded-xl text-xs font-black uppercase tracking-widest border border-blue-200 hover:bg-blue-100 transition-colors shrink-0">View Descriptions</button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 sm:gap-10">
        <div id="field-preShow1" className={`space-y-6 bg-zinc-50 dark:bg-zinc-950 p-6 sm:p-8 rounded-[1.5rem] border transition-colors ${errors.preShow1 ? "border-red-500 bg-red-50/50" : "border-zinc-200 dark:border-zinc-800"}`}>
          <h3 className="font-black text-lg uppercase italic tracking-widest text-zinc-900 dark:text-white border-b border-zinc-200 dark:border-zinc-800 pb-4 flex justify-between">
            Pre-Show
            {errors.preShow1 && <span className="text-red-500 flex items-center gap-1 text-[10px] normal-case"><AlertCircle size={14}/> Required</span>}
          </h3>
          {[1, 2, 3].map((num) => {
            const fieldName = `preShow${num}` as keyof AuditionFormData;
            return (
              <div key={`pre-${num}`} className="space-y-2">
                <label className="block text-[10px] font-black uppercase text-zinc-500 tracking-widest">Choice {num} {num === 1 && <span className="text-blue-500">(Top Pick)</span>}</label>
                <select required value={formData[fieldName] as string} onChange={(e) => updateForm({ [fieldName]: e.target.value })} className={`w-full p-4 rounded-xl bg-white dark:bg-zinc-900 border font-bold outline-none text-sm cursor-pointer shadow-sm focus:border-blue-500 ${num === 1 && errors.preShow1 ? "border-red-500 ring-2 ring-red-100" : "border-zinc-200 dark:border-zinc-800"}`}>
                  <option value="" disabled>Select a committee...</option>
                  {PRE_SHOW_COMMITTEES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
            );
          })}
        </div>

        <div id="field-show1" className={`space-y-6 bg-zinc-50 dark:bg-zinc-950 p-6 sm:p-8 rounded-[1.5rem] border transition-colors ${errors.show1 ? "border-red-500 bg-red-50/50" : "border-zinc-200 dark:border-zinc-800"}`}>
          <h3 className="font-black text-lg uppercase italic tracking-widest text-zinc-900 dark:text-white border-b border-zinc-200 dark:border-zinc-800 pb-4 flex justify-between">
            Show Week
            {errors.show1 && <span className="text-red-500 flex items-center gap-1 text-[10px] normal-case"><AlertCircle size={14}/> Required</span>}
          </h3>
          {[1, 2, 3].map((num) => {
            const fieldName = `show${num}` as keyof AuditionFormData;
            return (
              <div key={`show-${num}`} className="space-y-2">
                <label className="block text-[10px] font-black uppercase text-zinc-500 tracking-widest">Choice {num} {num === 1 && <span className="text-blue-500">(Top Pick)</span>}</label>
                <select required value={formData[fieldName] as string} onChange={(e) => updateForm({ [fieldName]: e.target.value })} className={`w-full p-4 rounded-xl bg-white dark:bg-zinc-900 border font-bold outline-none text-sm cursor-pointer shadow-sm focus:border-blue-500 ${num === 1 && errors.show1 ? "border-red-500 ring-2 ring-red-100" : "border-zinc-200 dark:border-zinc-800"}`}>
                  <option value="" disabled>Select a committee...</option>
                  {SHOW_COMMITTEES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
            );
          })}
        </div>
      </div>

      <div className="bg-blue-600 text-white p-6 sm:p-8 rounded-[1.5rem] sm:rounded-[2rem] shadow-xl">
        <label className="flex items-start cursor-pointer group">
          <input type="checkbox" checked={formData.willingToChair} onChange={e => updateForm({ willingToChair: e.target.checked })} className="h-6 w-6 rounded border-white/20 bg-blue-700 text-white mt-1 shrink-0" />
          <div className="ml-4 space-y-1">
              <h4 className="font-black text-lg sm:text-xl uppercase italic tracking-tighter group-hover:text-blue-100 transition-colors">I am willing to be a Chair!</h4>
              <p className="text-blue-100/80 text-xs sm:text-sm font-medium">Chairs lead the team, manage budgets, and receive special training.</p>
          </div>
        </label>
        {formData.willingToChair && (
          <div className="mt-6 pt-6 border-t border-blue-500/50 animate-in fade-in zoom-in-95">
            <label className="block text-[10px] font-black uppercase text-blue-200 tracking-widest mb-2">Which committee would you prefer to chair?</label>
            <input type="text" placeholder="e.g., Props or Concessions" value={formData.chairPreference} onChange={(e) => updateForm({ chairPreference: e.target.value })} className="w-full bg-blue-700/50 border border-blue-500 text-white placeholder:text-blue-300/50 p-4 rounded-xl font-bold outline-none focus:ring-2 ring-white/50" />
          </div>
        )}
      </div>
    </div>
  );
}