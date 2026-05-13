"use client";

import React from "react";
import { Ruler, AlertCircle, Check, Sparkles } from "lucide-react";
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
        
        {/* --- HEIGHT & HAIR COLOR --- */}
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

        <div id="field-hairColor" className="space-y-6">
            <label className="block text-[10px] font-black uppercase text-zinc-400 tracking-widest mb-4">Hair Color</label>
            <div className={`grid grid-cols-2 gap-2 p-2 rounded-2xl ${errors.hairColor ? "bg-red-50 border border-red-200" : ""}`}>
              {HAIR_COLORS.map(c => (
                <button key={c} type="button" onClick={() => updateForm({ hairColor: c })} className={`py-3 sm:py-4 rounded-xl font-black text-[9px] uppercase border transition-all ${formData.hairColor === c ? "bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 shadow-md" : "bg-white dark:bg-zinc-900 border-zinc-200 text-zinc-400"}`}>{c}</button>
              ))}
            </div>
            {errors.hairColor && <p className="text-red-500 text-[10px] uppercase font-bold mt-2 flex items-center gap-1"><AlertCircle size={12}/>{errors.hairColor}</p>}
        </div>

        {/* --- PREFERRED ROLES & VOCAL RANGE --- */}
        <div id="field-roles" className="space-y-6 md:col-span-2 pt-6 border-t border-zinc-200 dark:border-zinc-800">
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="block text-[10px] font-black uppercase text-zinc-400 tracking-widest mb-2">Preferred Roles</label>
              <input 
                type="text" 
                placeholder="E.g. The Baker, Jack, or Any" 
                value={formData.preferredRoles || ''} 
                onChange={e => updateForm({ preferredRoles: e.target.value })} 
                className="w-full p-4 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 font-bold outline-none text-sm transition-colors focus:ring-2 focus:ring-blue-200" 
              />
            </div>

            <div className="space-y-2">
              <label className="block text-[10px] font-black uppercase text-zinc-400 tracking-widest mb-2">Vocal Range</label>
              <select 
                value={formData.vocalRange || ''}
                onChange={(e) => updateForm({ vocalRange: e.target.value })}
                className="w-full p-4 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 font-bold outline-none text-sm transition-colors focus:ring-2 focus:ring-blue-200 appearance-none"
              >
                <option value="" disabled>Select a vocal range...</option>
                <option value="Soprano">Soprano</option>
                <option value="Alto">Alto</option>
                <option value="Tenor">Tenor</option>
                <option value="Bass">Bass</option>
                <option value="Unsure">Unsure / Still Developing</option>
              </select>
            </div>
          </div>
          
          <label className="flex items-center gap-3 p-4 bg-zinc-50 dark:bg-zinc-950 rounded-xl border border-zinc-200 dark:border-zinc-800 cursor-pointer transition-colors hover:border-blue-300">
            <input 
              type="checkbox" 
              checked={formData.acceptAnyRole || false} 
              onChange={e => updateForm({ acceptAnyRole: e.target.checked })} 
              className="w-5 h-5 rounded text-blue-600 focus:ring-blue-500 cursor-pointer" 
            />
            <span className="font-bold text-sm text-zinc-700 dark:text-zinc-300">I will accept any role</span>
          </label>

          {/* --- THE FORGOTTEN FIELDS & ROMANCE TOGGLES --- */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-4">
            
            <button 
              type="button" 
              onClick={() => updateForm({ acceptRomance: !formData.acceptRomance })}
              className={`w-full p-4 rounded-xl border-2 flex flex-col items-center justify-center gap-2 transition-all text-center ${
                formData.acceptRomance ? "bg-blue-900/20 border-blue-500" : "bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800"
              }`}
            >
              <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center shrink-0 ${
                formData.acceptRomance ? "border-blue-500 bg-blue-500" : "border-zinc-300 dark:border-zinc-600"
              }`}>
                {formData.acceptRomance && <Check size={14} className="text-white" />}
              </div>
              <div>
                <p className={`font-bold text-xs ${formData.acceptRomance ? "text-blue-600 dark:text-blue-400" : "text-zinc-700 dark:text-zinc-300"}`}>Stage Romance</p>
                <p className="text-[9px] text-zinc-500 mt-1">Comfortable with intimacy required by script.</p>
              </div>
            </button>

            <button 
              type="button" 
              onClick={() => updateForm({ willingToAlterAppearance: !(formData as any).willingToAlterAppearance } as any)}
              className={`w-full p-4 rounded-xl border-2 flex flex-col items-center justify-center gap-2 transition-all text-center ${
                (formData as any).willingToAlterAppearance ? "bg-emerald-900/20 border-emerald-500" : "bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800"
              }`}
            >
              <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center shrink-0 ${
                (formData as any).willingToAlterAppearance ? "border-emerald-500 bg-emerald-500" : "border-zinc-300 dark:border-zinc-600"
              }`}>
                {(formData as any).willingToAlterAppearance && <Check size={14} className="text-white" />}
              </div>
              <div>
                <p className={`font-bold text-xs ${(formData as any).willingToAlterAppearance ? "text-emerald-600 dark:text-emerald-400" : "text-zinc-700 dark:text-zinc-300"}`}>Alter Appearance</p>
                <p className="text-[9px] text-zinc-500 mt-1">Willing to cut or dye hair if asked.</p>
              </div>
            </button>

            <button 
              type="button" 
              onClick={() => updateForm({ fearOfHeights: !formData.fearOfHeights })}
              className={`w-full p-4 rounded-xl border-2 flex flex-col items-center justify-center gap-2 transition-all text-center ${
                formData.fearOfHeights ? "bg-red-900/20 border-red-500" : "bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800"
              }`}
            >
              <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center shrink-0 ${
                formData.fearOfHeights ? "border-red-500 bg-red-500" : "border-zinc-300 dark:border-zinc-600"
              }`}>
                {formData.fearOfHeights && <Check size={14} className="text-white" />}
              </div>
              <div>
                <p className={`font-bold text-xs ${formData.fearOfHeights ? "text-red-600 dark:text-red-400" : "text-zinc-700 dark:text-zinc-300"}`}>Fear of Heights</p>
                <p className="text-[9px] text-zinc-500 mt-1">Uncomfortable on scaffolding or flying.</p>
              </div>
            </button>

          </div>

          <div className="space-y-2 pt-4">
              <label className="block text-[10px] font-black uppercase text-zinc-400 tracking-widest mb-2 flex items-center gap-2"><Sparkles size={14} /> Other Talents (Optional)</label>
              <textarea 
                placeholder="Acrobatics, juggling, plays guitar, stage combat, etc." 
                value={formData.otherTalents || ''} 
                onChange={e => updateForm({ otherTalents: e.target.value })} 
                className="w-full p-4 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 font-bold outline-none text-sm transition-colors focus:ring-2 focus:ring-blue-200 resize-none min-h-[80px]" 
              />
          </div>

        </div>
      </div>
    </div>
  );
}