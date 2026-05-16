// app/components/audition-wizard/Step6Committees.tsx
"use client";

import React from "react";
import { AlertCircle, Sparkles } from "lucide-react";
import { AuditionFormData, PRE_SHOW_COMMITTEES, SHOW_COMMITTEES } from "./types";

interface Props {
  formData: AuditionFormData;
  updateForm: (fields: Partial<AuditionFormData>) => void;
  errors: Record<string, string>;
  setShowCommitteeGuide: (show: boolean) => void;
}

export function Step6Committees({ formData, updateForm, errors, setShowCommitteeGuide }: Props) {
  
  const handleQuickFill = () => {
    updateForm({
      preShow1: "Anywhere Needed", preShow2: "Anywhere Needed", preShow3: "Anywhere Needed",
      show1: "Anywhere Needed", show2: "Anywhere Needed", show3: "Anywhere Needed"
    });
  };

  return (
    <div className="space-y-8 sm:space-y-12 animate-in slide-in-from-right-8 duration-500">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4">
        <div>
          <h2 className="text-2xl sm:text-4xl font-black dark:text-white uppercase italic tracking-tighter">Parent Committees</h2>
          <p className="text-zinc-500 dark:text-zinc-400 mt-2 text-sm sm:text-base font-medium leading-relaxed">
            Each family must serve on one Pre-Show and one Show Week committee.
          </p>
        </div>
        <button type="button" onClick={() => setShowCommitteeGuide(true)} className="bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 px-5 py-3 rounded-xl text-xs font-black uppercase tracking-widest border border-blue-200 hover:bg-blue-100 transition-colors shrink-0">
          View Descriptions
        </button>
      </div>

      {/* 🟢 NEW: THE QUICK FILL BUTTON */}
      <button
          type="button"
          onClick={handleQuickFill}
          className="w-full p-4 sm:p-5 bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-500/10 dark:hover:bg-emerald-500/20 border border-emerald-200 dark:border-emerald-500/30 text-emerald-700 dark:text-emerald-400 rounded-[1.5rem] font-black uppercase tracking-widest text-xs sm:text-sm transition-all flex items-center justify-center gap-3 active:scale-[0.98] shadow-sm"
      >
          <Sparkles size={18} /> I&apos;m flexible! Put me anywhere.
      </button>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 sm:gap-10 mt-2">
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
                  {/* 🟢 NEW: Added Anywhere Needed as a valid manual option too */}
                  <option value="Anywhere Needed" className="font-black text-emerald-600">🌟 Anywhere Needed</option>
              {PRE_SHOW_COMMITTEES.map(c => <option key={c} value={c} disabled={[formData.preShow1, formData.preShow2, formData.preShow3].includes(c) && formData[fieldName] !== c}>{c}</option>)}
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
                  <option value="Anywhere Needed" className="font-black text-emerald-600">🌟 Anywhere Needed</option>
                {SHOW_COMMITTEES.map(c => <option key={c} value={c} disabled={[formData.show1, formData.show2, formData.show3].includes(c) && formData[fieldName] !== c}>{c}</option>)}
                </select>
              </div>
            );
          })}
        </div>
      </div>

      <div id="field-chairInterest" className={`bg-zinc-50 dark:bg-zinc-950 p-6 sm:p-8 rounded-[1.5rem] border transition-colors ${errors.chairInterest ? "border-red-500 bg-red-50/50" : "border-zinc-200 dark:border-zinc-800"}`}>
        <h3 className="font-black text-lg uppercase italic tracking-widest text-zinc-900 dark:text-white mb-4 flex justify-between items-center">
           Are you willing to Chair?
           {errors.chairInterest && <span className="text-red-500 flex items-center gap-1 text-[10px] normal-case"><AlertCircle size={14}/> Required</span>}
        </h3>
        
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
           <button type="button" onClick={() => updateForm({ chairInterest: 'yes' })} className={`p-4 rounded-xl border-2 font-bold text-sm transition-all ${formData.chairInterest === 'yes' ? 'bg-blue-600 border-blue-600 text-white shadow-md' : 'bg-white dark:bg-zinc-900 border-zinc-200 text-zinc-500 hover:border-blue-400'}`}>
              Yes, I&apos;ll Chair!
           </button>
           <button type="button" onClick={() => updateForm({ chairInterest: 'maybe' })} className={`p-4 rounded-xl border-2 font-bold text-sm transition-all ${formData.chairInterest === 'maybe' ? 'bg-amber-500 border-amber-500 text-white shadow-md' : 'bg-white dark:bg-zinc-900 border-zinc-200 text-zinc-500 hover:border-amber-400'}`}>
              Maybe, tell me more
           </button>
           <button type="button" onClick={() => updateForm({ chairInterest: 'no' })} className={`p-4 rounded-xl border-2 font-bold text-sm transition-all ${formData.chairInterest === 'no' ? 'bg-zinc-200 border-zinc-300 dark:bg-zinc-800 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 shadow-md' : 'bg-white dark:bg-zinc-900 border-zinc-200 text-zinc-500 hover:border-zinc-300'}`}>
              No thanks
           </button>
        </div>

        {(formData.chairInterest === 'yes' || formData.chairInterest === 'maybe') && (
          <div className="mt-6 animate-in slide-in-from-top-4">
            <label className="block text-[10px] font-black uppercase text-zinc-500 tracking-widest mb-2">Any specific committee in mind? (Optional)</label>
            <input 
               type="text" 
               placeholder="e.g., Props or Concessions" 
               value={formData.chairPreference} 
               onChange={(e) => updateForm({ chairPreference: e.target.value })} 
               className="w-full bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-4 rounded-xl font-bold outline-none focus:ring-2 focus:ring-blue-500" 
            />
          </div>
        )}
      </div>
    </div>
  );
}