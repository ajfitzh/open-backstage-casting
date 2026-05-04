"use client";

import React, { useState } from "react";
import { X, CheckCircle2, FileText, ShieldCheck, Star } from "lucide-react";
import { acceptRoleAndSign } from "@/app/actions/auditions";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  tenant: string;
  auditionId: number;
  studentName: string;
  roleName: string;
  showTitle: string;
  parentEmail: string;
}

export default function AcceptRoleModal({
  isOpen, onClose, onSuccess, tenant, auditionId, studentName, roleName, showTitle, parentEmail
}: Props) {
  const [studentAgreed, setStudentAgreed] = useState(false);
  const [parentAgreed, setParentAgreed] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  if (!isOpen) return null;

  const handleSubmit = async () => {
    if (!studentAgreed || !parentAgreed) return;
    
    setIsSubmitting(true);
    setError("");

    const res = await acceptRoleAndSign(tenant, auditionId, studentName, roleName, showTitle, parentEmail);
    
    if (res.success) {
      onSuccess();
    } else {
      setError(res.error || "Failed to accept role. Please try again.");
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-zinc-950/80 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative w-full max-w-2xl bg-white dark:bg-zinc-900 rounded-[2rem] shadow-2xl overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="px-6 py-6 border-b border-zinc-100 dark:border-zinc-800 flex justify-between items-center bg-zinc-50 dark:bg-zinc-950 shrink-0">
          <div className="flex items-center gap-3">
             <div className="w-10 h-10 rounded-full bg-emerald-100 dark:bg-emerald-500/20 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
                <Star size={20} className="fill-current" />
             </div>
             <div>
                <h2 className="text-xl font-black uppercase italic tracking-widest text-zinc-900 dark:text-white leading-none">Role Offer</h2>
                <p className="text-xs text-zinc-500 font-bold mt-1">{showTitle}</p>
             </div>
          </div>
          <button onClick={onClose} className="p-2 text-zinc-400 hover:text-zinc-900 dark:hover:text-white transition-colors rounded-full hover:bg-zinc-200 dark:hover:bg-zinc-800">
            <X size={24} />
          </button>
        </div>

        {/* Scrollable Body */}
        <div className="p-6 sm:p-8 overflow-y-auto custom-scrollbar space-y-8 flex-1">
          
          <div className="text-center space-y-2">
            <p className="text-sm font-bold text-zinc-500 uppercase tracking-widest">Congratulations!</p>
            <h3 className="text-3xl sm:text-4xl font-black text-zinc-900 dark:text-white tracking-tighter">
              {studentName} has been cast as <br/>
              <span className="text-emerald-600 dark:text-emerald-400 italic">"{roleName}"</span>
            </h3>
          </div>

          <div className="bg-blue-50 dark:bg-blue-900/10 border border-blue-100 dark:border-blue-900/30 rounded-2xl p-5 space-y-3">
             <h4 className="font-black text-sm uppercase tracking-widest text-blue-900 dark:text-blue-400 flex items-center gap-2">
               <ShieldCheck size={16} /> Digital Agreements
             </h4>
             <p className="text-sm text-blue-800/80 dark:text-blue-300/80 font-medium leading-relaxed">
               By accepting this role, you agree to the CYT Code of Conduct, the Medical & Liability Release, and the Parent Committee requirements. 
             </p>
             <button className="text-xs font-bold uppercase tracking-widest text-blue-600 dark:text-blue-400 flex items-center gap-1 hover:underline underline-offset-4">
               <FileText size={12} /> Read Full Terms
             </button>
          </div>

          <div className="space-y-4">
            <label className="flex items-start p-5 bg-zinc-50 dark:bg-zinc-950 border-2 border-zinc-200 dark:border-zinc-800 rounded-2xl cursor-pointer hover:border-emerald-500/50 transition-colors group">
                <input 
                  type="checkbox" 
                  checked={studentAgreed} 
                  onChange={e => setStudentAgreed(e.target.checked)} 
                  className="h-6 w-6 text-emerald-600 rounded-lg mt-0.5 shrink-0 cursor-pointer" 
                />
                <div className="ml-4 space-y-1">
                    <h4 className="font-black text-zinc-900 dark:text-white uppercase tracking-widest text-sm group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">Student Agreement</h4>
                    <p className="text-zinc-500 dark:text-zinc-400 text-xs font-medium leading-relaxed">I agree to memorize my lines and music, treat the cast and crew with respect, and honor the rehearsal schedule.</p>
                </div>
            </label>

            <label className="flex items-start p-5 bg-zinc-50 dark:bg-zinc-950 border-2 border-zinc-200 dark:border-zinc-800 rounded-2xl cursor-pointer hover:border-emerald-500/50 transition-colors group">
                <input 
                  type="checkbox" 
                  checked={parentAgreed} 
                  onChange={e => setParentAgreed(e.target.checked)} 
                  className="h-6 w-6 text-emerald-600 rounded-lg mt-0.5 shrink-0 cursor-pointer" 
                />
                <div className="ml-4 space-y-1">
                    <h4 className="font-black text-zinc-900 dark:text-white uppercase tracking-widest text-sm group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">Parent Agreement</h4>
                    <p className="text-zinc-500 dark:text-zinc-400 text-xs font-medium leading-relaxed">I agree to the medical release terms, photo release, and commit to fulfilling my parent committee duties.</p>
                </div>
            </label>
          </div>

          {error && <p className="text-red-500 text-sm font-bold text-center">{error}</p>}
        </div>

        {/* Footer */}
        <div className="p-6 bg-white dark:bg-zinc-900 border-t border-zinc-100 dark:border-zinc-800 flex justify-end gap-3 shrink-0">
           <button 
             onClick={onClose}
             disabled={isSubmitting}
             className="px-6 py-3 rounded-xl font-black text-xs uppercase tracking-widest text-zinc-500 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors disabled:opacity-50"
           >
             Cancel
           </button>
           <button 
             onClick={handleSubmit}
             disabled={!studentAgreed || !parentAgreed || isSubmitting}
             className="px-8 py-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-black text-xs uppercase tracking-widest shadow-lg transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
           >
             {isSubmitting ? "Processing..." : "Accept Role"} <CheckCircle2 size={16} />
           </button>
        </div>

      </div>
    </div>
  );
}