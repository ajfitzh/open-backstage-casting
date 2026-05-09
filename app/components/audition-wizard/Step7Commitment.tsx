// app/components/audition-wizard/Step7Commitment.tsx
"use client";

import React from "react";
import { CheckCircle2, AlertCircle } from "lucide-react";
import { AuditionFormData } from "./types";

interface Props {
  formData: AuditionFormData;
  updateForm: (fields: Partial<AuditionFormData>) => void;
  errors: Record<string, string>;
}

export function Step7Commitment({ formData, updateForm, errors }: Props) {
  return (
    <div className="space-y-8 sm:space-y-12 animate-in slide-in-from-right-8 duration-500">
      <h2 className="text-2xl sm:text-4xl font-black dark:text-white uppercase italic tracking-tighter">Commitment</h2>
      
      <div className="space-y-4 sm:space-y-6">
        <label className="flex items-start p-6 sm:p-10 bg-blue-50 dark:bg-blue-900/20 border-2 border-blue-200 rounded-[1.5rem] sm:rounded-[3rem] cursor-pointer">
            <input type="checkbox" required checked={formData.offBookAgreement} onChange={e => updateForm({ offBookAgreement: e.target.checked })} className="h-6 w-6 sm:h-10 sm:w-10 text-blue-600 rounded-lg mt-1 shrink-0" />
            <div className="ml-4 sm:ml-8 space-y-2 sm:space-y-4">
                <h4 className="text-lg sm:text-2xl font-black dark:text-white italic uppercase tracking-tighter">OFF-BOOK</h4>
                <p className="text-blue-900/80 dark:text-blue-400/80 text-xs sm:text-lg font-medium leading-relaxed">I commit to being **OFF BOOK** (lines and music memorized) by July 6.</p>
            </div>
        </label>

        <label className="flex items-start p-6 sm:p-10 bg-zinc-50 dark:bg-zinc-950 border-2 border-zinc-200 rounded-[1.5rem] sm:rounded-[3rem] cursor-pointer">
            <input type="checkbox" required checked={formData.parentCommitteeAgreement} onChange={e => updateForm({ parentCommitteeAgreement: e.target.checked })} className="h-6 w-6 sm:h-10 sm:w-10 text-zinc-600 rounded-lg mt-1 shrink-0" />
            <div className="ml-4 sm:ml-8 space-y-2 sm:space-y-4">
                <h4 className="text-lg sm:text-2xl font-black dark:text-white italic uppercase tracking-tighter">Parent Help</h4>
                <p className="text-zinc-500 dark:text-zinc-400 text-xs sm:text-lg font-medium leading-relaxed">I understand parents are expected to help sell **10 tickets** for the show.</p>
            </div>
        </label>
      </div>

      <div id="field-signatures" className={`grid grid-cols-1 sm:grid-cols-2 gap-6 sm:gap-10 pt-6 sm:pt-10 border-t ${errors.studentSignature || errors.parentSignature ? "border-red-200 bg-red-50/30 -m-4 p-4 rounded-3xl" : "border-zinc-100 dark:border-zinc-800"}`}>
        <div className="space-y-3">
            <label className="block text-[10px] font-black uppercase tracking-widest text-zinc-400 flex justify-between">
              Student Signature {errors.studentSignature && <span className="text-red-500 flex items-center gap-1"><AlertCircle size={12}/> Missing</span>}
            </label>
            <button type="button" onClick={() => updateForm({ studentSignature: !formData.studentSignature })} className={`w-full p-6 sm:p-8 rounded-xl sm:rounded-[2rem] border-2 flex items-center justify-center gap-3 transition-all active:scale-95 ${formData.studentSignature ? "bg-green-50 border-green-500 text-green-700 dark:bg-green-900/20 dark:text-green-400" : errors.studentSignature ? "bg-red-50 border-red-500 text-red-600" : "bg-zinc-50 dark:bg-zinc-950 border-zinc-200 dark:border-zinc-800 text-zinc-400 hover:border-blue-400"}`}>
              <div className={`w-6 h-6 sm:w-8 sm:h-8 rounded-full border-2 flex items-center justify-center ${formData.studentSignature ? "border-green-500 bg-green-500 text-white" : "border-zinc-300 dark:border-zinc-700"}`}>
                {formData.studentSignature && <CheckCircle2 size={16} />}
              </div>
              <span className="font-black text-lg sm:text-2xl italic tracking-tighter">{formData.studentSignature ? "Student Agreed" : "Click to Sign"}</span>
            </button>
        </div>
        
        <div className="space-y-3">
            <label className="block text-[10px] font-black uppercase tracking-widest text-zinc-400 flex justify-between">
              Parent / Guardian {errors.parentSignature && <span className="text-red-500 flex items-center gap-1"><AlertCircle size={12}/> Missing</span>}
            </label>
            <button type="button" onClick={() => updateForm({ parentSignature: !formData.parentSignature })} className={`w-full p-6 sm:p-8 rounded-xl sm:rounded-[2rem] border-2 flex items-center justify-center gap-3 transition-all active:scale-95 ${formData.parentSignature ? "bg-green-50 border-green-500 text-green-700 dark:bg-green-900/20 dark:text-green-400" : errors.parentSignature ? "bg-red-50 border-red-500 text-red-600" : "bg-zinc-50 dark:bg-zinc-950 border-zinc-200 dark:border-zinc-800 text-zinc-400 hover:border-blue-400"}`}>
              <div className={`w-6 h-6 sm:w-8 sm:h-8 rounded-full border-2 flex items-center justify-center ${formData.parentSignature ? "border-green-500 bg-green-500 text-white" : "border-zinc-300 dark:border-zinc-700"}`}>
                {formData.parentSignature && <CheckCircle2 size={16} />}
              </div>
              <span className="font-black text-lg sm:text-2xl italic tracking-tighter">{formData.parentSignature ? "Parent Agreed" : "Click to Sign"}</span>
            </button>
        </div>
      </div>
    </div>
  );
}