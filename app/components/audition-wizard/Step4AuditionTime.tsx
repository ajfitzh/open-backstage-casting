// app/components/audition-wizard/Step4AuditionTime.tsx
"use client";

import React from "react";
import { Clock, AlertCircle } from "lucide-react";
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
      <h2 className="text-2xl sm:text-4xl font-black dark:text-white uppercase italic tracking-tighter">Audition Time</h2>
      <div id="field-auditionSlotId" className={`p-4 rounded-3xl ${errors.auditionSlotId ? "bg-red-50 border border-red-200" : ""}`}>
        {errors.auditionSlotId && <p className="text-red-500 text-sm uppercase font-black text-center mb-6 animate-pulse flex justify-center items-center gap-2"><AlertCircle size={16}/>{errors.auditionSlotId}</p>}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
          {slots.map(slot => {
            const remaining = slot.capacity - slot.taken;
            const isFull = slot.isFull || remaining <= 0;
            const isSelected = formData.auditionSlotId === slot.id;
            return (
              <button key={slot.id} type="button" disabled={isFull} onClick={() => updateForm({ auditionSlotId: slot.id })} className={`p-6 sm:p-8 rounded-[1.5rem] sm:rounded-[2.5rem] border-2 text-left relative transition-all group ${isSelected ? "bg-blue-600 border-blue-600 text-white shadow-xl scale-105" : isFull ? "bg-zinc-100 dark:bg-zinc-800 opacity-50 cursor-not-allowed border-zinc-200" : "bg-white dark:bg-zinc-900 border-zinc-200 hover:border-blue-400"}`}>
                <div className={`absolute top-4 right-4 px-2 py-1 rounded-full text-[7px] font-black uppercase italic ${isSelected ? "bg-white text-blue-600" : isFull ? "bg-red-600 text-white" : "bg-blue-100 text-blue-600"}`}>
                  {isFull ? "Full" : `${remaining} Left`}
                </div>
                <Clock className="mb-4 opacity-30" size={24} />
                <p className="font-black text-2xl tracking-tighter italic leading-none mb-1">{slot.time}</p>
                <span className="text-[8px] font-black uppercase tracking-widest opacity-50">{slot.day}</span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}