"use client";

import React, { useState } from "react";
import { Step2CastingDetails } from "@/app/components/audition-wizard/Step2CastingDetails";
import { AuditionFormData, INITIAL_DATA } from "@/app/components/audition-wizard/types";
import { updateAuditionDetails } from "@/app/actions/family";
import { CheckCircle2, Loader2 } from "lucide-react";

interface EditAuditionFormProps {
  tenant: string;
  auditionId: number;
  initialData: Partial<AuditionFormData>;
  onSuccess?: () => void;
}

export default function EditAuditionForm({ tenant, auditionId, initialData, onSuccess }: EditAuditionFormProps) {
  // Merge the fetched data with the initial empty state to prevent controlled/uncontrolled component errors
  const [formData, setFormData] = useState<AuditionFormData>({
    ...INITIAL_DATA,
    ...initialData
  });
  
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const updateForm = (fields: Partial<AuditionFormData>) => {
    setFormData(prev => ({ ...prev, ...fields }));
    setError(null);
    setSuccess(false);
  };

  const handleSave = async () => {
    setIsSaving(true);
    setError(null);
    
    const result = await updateAuditionDetails(tenant, auditionId, formData);
    
    if (result.success) {
      setSuccess(true);
      if (onSuccess) onSuccess();
    } else {
      setError(result.error || "Failed to update audition. Please try again.");
    }
    
    setIsSaving(false);
  };

  return (
    <div className="space-y-6 bg-white dark:bg-zinc-950 rounded-3xl p-6 border border-zinc-200 dark:border-zinc-800 shadow-xl">
      <div className="border-b border-zinc-200 dark:border-zinc-800 pb-4 mb-4">
        <h3 className="text-xl font-black uppercase tracking-tight">Edit Casting Details</h3>
        <p className="text-sm text-zinc-500">You can update your roles and measurements until you check in at the audition table.</p>
      </div>

      {/* Reuse your existing wizard component perfectly! */}
      <Step2CastingDetails 
        formData={formData} 
        updateForm={updateForm} 
        errors={{}} 
      />

      {error && (
        <div className="p-4 bg-red-50 text-red-600 text-sm font-bold rounded-xl border border-red-200">
          {error}
        </div>
      )}

      <button 
        onClick={handleSave} 
        disabled={isSaving}
        className="w-full bg-blue-600 hover:bg-blue-500 text-white py-4 rounded-xl font-black uppercase tracking-widest transition-all disabled:opacity-50 flex items-center justify-center gap-2"
      >
        {isSaving ? <Loader2 size={18} className="animate-spin" /> : (success ? <CheckCircle2 size={18} /> : "Save Changes")}
      </button>
    </div>
  );
}