"use client";

import React from "react";
import { Clock, AlertCircle, Info } from "lucide-react";
import { AuditionFormData, AuditionSlot } from "./types";

interface Props {
  formData: AuditionFormData;
  updateForm: (fields: Partial<AuditionFormData>) => void;
  errors: Record<string, string>;
  slots: AuditionSlot[];
}

export function Step4AuditionTime({ formData, updateForm, errors, slots }: Props) {
  return (
    <div className="space-y-8 sm:space-y-12 animate-in slide-in-from-right-8 duration-500">
      <header className="space-y-4">
        <h2 className="text-2xl sm:text-4xl font-black dark:text-white uppercase italic tracking-tighter">
          Audition Time
        </h2>
        
        {/* 🟢 LEGACY NOTICE: This handles the 26 kids already signed up via the old method */}
        <div className="p-4 sm:p-6 bg-amber-50 dark:bg-amber-950/20 border-2 border-amber-200 dark:border-amber-900/30 rounded-[1.5rem] sm:rounded-[2rem] flex items-start gap-4">
          <Info className="text-amber-600 dark:text-amber-500 shrink-0 mt-0.5" size={20} />
          <div>
            <p className="text-amber-900 dark:text-amber-200 text-xs sm:text-sm font-bold leading-relaxed uppercase tracking-tight italic">
              Legacy Registration Update
            </p>
            <p className="text-amber-800/80 dark:text-amber-400/80 text-[11px] sm:text-xs font-medium leading-relaxed">
              If you already claimed a time slot on the main CYT website, please <strong>select that same time here</strong> to link your digital paperwork to your scheduled slot.
            </p>
          </div>
        </div>
      </header>

      <div id="field-auditionSlotId" className={`p-4 rounded-3xl transition-colors ${errors.auditionSlotId ? "bg-red-50 border border-red-200 dark:bg-red-950/10" : ""}`}>
        {errors.auditionSlotId && (
          <p className="text-red-500 text-sm uppercase font-black text-center mb-6 animate-pulse flex justify-center items-center gap-2">
            <AlertCircle size={16}/>{errors.auditionSlotId}
          </p>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
          {slots.map(slot => {
            const remaining = slot.capacity - slot.taken;
            const isFull = slot.isFull || remaining <= 0;
            const isSelected = formData.auditionSlotId === slot.id;
            
            return (
              <button 
                key={slot.id} 
                type="button" 
                disabled={isFull} 
                onClick={() => updateForm({ auditionSlotId: slot.id })} 
                className={`p-6 sm:p-8 rounded-[1.5rem] sm:rounded-[2.5rem] border-2 text-left relative transition-all group active:scale-95 ${
                  isSelected 
                    ? "bg-blue-600 border-blue-600 text-white shadow-xl scale-105 z-10" 
                    : isFull 
                      ? "bg-zinc-100 dark:bg-zinc-800 opacity-50 cursor-not-allowed border-zinc-200 dark:border-zinc-700" 
                      : "bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 hover:border-blue-400 dark:hover:border-blue-500"
                }`}
              >
                <div className={`absolute top-4 right-4 px-2 py-1 rounded-full text-[7px] font-black uppercase italic ${
                  isSelected 
                    ? "bg-white text-blue-600" 
                    : isFull 
                      ? "bg-red-600 text-white" 
                      : "bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400"
                }`}>
                  {isFull ? "Full" : `${remaining} Left`}
                </div>

                <Clock 
                  className={`mb-4 transition-colors ${isSelected ? "text-white opacity-40" : "text-zinc-300 dark:text-zinc-600"}`} 
                  size={24} 
                />
                
                <p className="font-black text-2xl tracking-tighter italic leading-none mb-1">
                  {slot.time}
                </p>
                <span className={`text-[8px] font-black uppercase tracking-widest ${isSelected ? "text-blue-200" : "text-zinc-400 dark:text-zinc-500"}`}>
                  {slot.day}
                </span>

                {/* Subtle highlight for selected state in dark mode */}
                {isSelected && (
                  <div className="absolute inset-0 rounded-[1.5rem] sm:rounded-[2.5rem] ring-4 ring-blue-500/20" />
                )}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}