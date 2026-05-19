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
            Note: As this is a Lite Show, mainstage committee selections have been disabled. You will acknowledge your volunteer commitment on the next screen.
          </p>
        </div>
      </div>

      {/* MAINSTAGE COMMITTEES COMMENTED OUT FOR LITE SHOW 
      
      <button
          type="button"
          onClick={handleQuickFill}
          className="w-full p-4 sm:p-5 bg-emerald-50 hover:bg-emerald-100 ... "
      >
          <Sparkles size={18} /> I'm flexible! Put me anywhere.
      </button>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 sm:gap-10 mt-2">
        ... (Mainstage Pre-Show grids) ...
      </div>

      <div id="field-chairInterest" ... >
        ... (Chair selections) ...
      </div>
      
      */}
      
    </div>
  );
}