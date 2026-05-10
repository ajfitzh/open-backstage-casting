// app/components/audition-wizard/Step2CastingDetails.tsx
"use client";

import React from "react";
import { Ruler, AlertCircle } from "lucide-react";
import { AuditionFormData, HAIR_COLORS, INCHES } from "./types";

interface Props {
  formData: AuditionFormData;
  updateForm: (fields: Partial<AuditionFormData>) => void;
  errors: Record<string, string>;
}

export function Step2CastingDetails({ formData, updateForm, errors }: Props) {
  return (
    <div className="space-y-8 sm:space-y-12 animate-in slide-in-from-right-8 duration-500">
      <h2 className="text-2xl sm:text-4xl font-black dark:text-white uppercase italic tracking-tighter">Casting Details</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 sm:gap-10">
        
        {/* --- HEIGHT FIELD --- */}
        <div id="field-height" className={`bg-zinc-50 dark:bg-zinc-950 p-6 sm:p-8 rounded-[1.5rem] sm:rounded-[2.5rem] border space-y-6 transition-colors ${errors.height ? "border-red-500 bg-red-50/50" : "border-zinc-200 dark:border-zinc-800"}`}>
          <label className="block text-[10px] font-black uppercase text-zinc-400 tracking-widest mb-4 flex items-center gap-2"><Ruler size={16} /> Height</label>
          <div className="flex gap-2 sm:gap-4">
            {["4","5","6"].map(ft => (
              <button key={ft} type="button" onClick={() => updateForm({ heightFt: ft })} className={`flex-1 py-3 sm:py-4 rounded-xl sm:rounded-2xl font-black text-lg transition-all ${formData.heightFt === ft ? "bg-blue-600 text-white" : "bg-white dark:bg-zinc-900 text-zinc-400"}`}>{ft}&apos;</button>
            ))}
          </div>
          <div className="grid grid-cols-6 gap-1 sm:gap-2">
            {INCHES.map(inch => (
              <button key={inch} type="button" onClick={() => updateForm({ heightIn: inch })} className={`py-2 rounded-lg font-black text-[10px] transition-all ${formData.heightIn === inch ? "bg-zinc-900 dark:bg-white text-white dark:text-zinc-900" : "bg-white dark:bg-zinc-900 text-zinc-400 border border-zinc-100"}`}>{inch}&quot;</button>
            ))}
          </div>
          {errors.height && <p className="text-red-500 text-[10px] uppercase font-bold mt-2 flex items-center gap-1"><AlertCircle size={12}/>{errors.height}</p>}
        </div>

        {/* --- HAIR COLOR FIELD --- */}
        <div id="field-hairColor" className="space-y-6">
            <label className="block text-[10px] font-black uppercase text-zinc-400 tracking-widest mb-4">Hair Color</label>
            <div className={`grid grid-cols-2 gap-2 p-2 rounded-2xl ${errors.hairColor ? "bg-red-50 border border-red-200" : ""}`}>
              {HAIR_COLORS.map(c => (
                <button key={c} type="button" onClick={() => updateForm({ hairColor: c })} className={`py-3 sm:py-4 rounded-xl font-black text-[9px] uppercase border transition-all ${formData.hairColor === c ? "bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 shadow-md" : "bg-white dark:bg-zinc-900 border-zinc-200 text-zinc-400"}`}>{c}</button>
              ))}
            </div>
            {errors.hairColor && <p className="text-red-500 text-[10px] uppercase font-bold mt-2 flex items-center gap-1"><AlertCircle size={12}/>{errors.hairColor}</p>}
        </div>

        {/* --- PREFERRED ROLES FIELD (Added back in) --- */}
        <div id="field-roles" className="space-y-6 md:col-span-2 pt-6 border-t border-zinc-200 dark:border-zinc-800">
          <label className="block text-[10px] font-black uppercase text-zinc-400 tracking-widest mb-2">Preferred Roles</label>
          <input 
            type="text" 
            placeholder="E.g. The Baker, Jack, or Any" 
            value={formData.preferredRoles} 
            onChange={e => updateForm({ preferredRoles: e.target.value })} 
            className="w-full p-4 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 font-bold outline-none text-sm transition-colors focus:ring-2 focus:ring-blue-200" 
          />
          
          <label className="flex items-center gap-3 p-4 bg-zinc-50 dark:bg-zinc-950 rounded-xl border border-zinc-200 dark:border-zinc-800 cursor-pointer transition-colors hover:border-blue-300">
            <input 
              type="checkbox" 
              checked={formData.acceptAnyRole} 
              onChange={e => updateForm({ acceptAnyRole: e.target.checked })} 
              className="w-5 h-5 rounded text-blue-600 focus:ring-blue-500 cursor-pointer" 
            />
            <span className="font-bold text-sm text-zinc-700 dark:text-zinc-300">I will accept any role</span>
          </label>
        </div>

      </div>
    </div>
  );
}