// app/components/committees/ChairLogbook.tsx
"use client";

import React, { useState } from "react";
import { ClipboardList, Users, AlertTriangle, DollarSign, Target, CheckCircle2, Send } from "lucide-react";
import { submitCommitteeReport } from "@/app/actions/committees";

const PHASES = [
  "Pre-Show Week 1", "Pre-Show Week 2", "Pre-Show Week 3", 
  "Tech Week", "Show Week", "Strike"
];

export default function ChairLogbook({ tenant, productionId, submitterId, committeeName }: any) {
  const [phase, setPhase] = useState(PHASES[0]);
  const [progressUpdate, setProgressUpdate] = useState("");
  const [attendanceNotes, setAttendanceNotes] = useState("");
  const [blockers, setBlockers] = useState("");
  const [completion, setCompletion] = useState(10);
  const [moneySpent, setMoneySpent] = useState("");
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    const res = await submitCommitteeReport(tenant, {
      productionId,
      submitterId,
      committeeName,
      phase,
      progressUpdate,
      attendanceNotes,
      blockers,
      completion,
      moneySpent
    });

    if (res.success) {
      setIsSuccess(true);
      // Reset form after 3 seconds
      setTimeout(() => {
        setIsSuccess(false);
        setProgressUpdate("");
        setAttendanceNotes("");
        setBlockers("");
        setMoneySpent("");
      }, 3000);
    } else {
      alert(res.error);
    }
    setIsSubmitting(false);
  };

  if (isSuccess) {
    return (
      <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-3xl p-8 flex flex-col items-center justify-center text-center animate-in zoom-in-95">
        <div className="w-16 h-16 bg-emerald-500/20 text-emerald-500 rounded-full flex items-center justify-center mb-4">
          <CheckCircle2 size={32} />
        </div>
        <h3 className="text-2xl font-black text-white tracking-tighter mb-2">Report Submitted!</h3>
        <p className="text-emerald-500/80 font-medium">Thank you for your hard work this week. The Show Coordinator has received your log.</p>
      </div>
    );
  }

  return (
    <div className="bg-zinc-900 border border-white/5 rounded-3xl p-6 sm:p-8 shadow-xl max-w-3xl mx-auto">
      <div className="mb-8">
        <h2 className="text-2xl font-black text-white tracking-tighter flex items-center gap-2">
          <ClipboardList className="text-blue-500" /> Chair Logbook
        </h2>
        <p className="text-sm font-bold text-zinc-500 uppercase tracking-widest mt-1">
          {committeeName} Committee Weekly Report
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-8">
        
        {/* Section 1: Phase & Overall Completion */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-zinc-950 p-6 rounded-2xl border border-zinc-800">
          <div className="space-y-2">
             <label className="block text-[10px] font-black uppercase text-zinc-400 tracking-widest">Production Phase</label>
             <select 
                value={phase} 
                onChange={e => setPhase(e.target.value)}
                className="w-full bg-zinc-900 border border-zinc-700 rounded-xl p-3 text-sm font-bold text-white outline-none focus:border-blue-500"
             >
                {PHASES.map(p => <option key={p} value={p}>{p}</option>)}
             </select>
          </div>
          <div className="space-y-2">
             <label className="block text-[10px] font-black uppercase text-zinc-400 tracking-widest flex items-center justify-between">
                <span><Target size={12} className="inline mr-1"/> Estimated Completion</span>
                <span className="text-blue-500">{completion}%</span>
             </label>
             <input 
                type="range" min="0" max="100" step="5"
                value={completion} 
                onChange={e => setCompletion(parseInt(e.target.value))}
                className="w-full accent-blue-500 mt-3"
             />
          </div>
        </div>

        {/* Section 2: The Core Questions */}
        <div className="space-y-6">
           <div className="space-y-2">
              <label className="block text-[10px] font-black uppercase text-zinc-400 tracking-widest flex items-center gap-2">
                <CheckCircle2 size={14} className="text-emerald-500"/> Progress Update
              </label>
              <textarea 
                 required
                 placeholder="What did you accomplish this week? What's the plan for next week?"
                 value={progressUpdate} onChange={e => setProgressUpdate(e.target.value)}
                 className="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-4 text-sm text-zinc-300 outline-none focus:border-blue-500 min-h-[100px]"
              />
           </div>

           <div className="space-y-2">
              <label className="block text-[10px] font-black uppercase text-zinc-400 tracking-widest flex items-center gap-2">
                <AlertTriangle size={14} className="text-amber-500"/> Blockers & Needs
              </label>
              <textarea 
                 placeholder="What's holding you back? Do you need an answer from the Director or supplies?"
                 value={blockers} onChange={e => setBlockers(e.target.value)}
                 className="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-4 text-sm text-zinc-300 outline-none focus:border-amber-500 min-h-[100px]"
              />
           </div>

           <div className="space-y-2">
              <label className="block text-[10px] font-black uppercase text-zinc-400 tracking-widest flex items-center gap-2">
                <Users size={14} className="text-purple-500"/> Attendance & Shoutouts
              </label>
              <textarea 
                 placeholder="Were there any unexcused absences? Any parent volunteers who crushed it?"
                 value={attendanceNotes} onChange={e => setAttendanceNotes(e.target.value)}
                 className="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-4 text-sm text-zinc-300 outline-none focus:border-purple-500 min-h-[80px]"
              />
           </div>
        </div>

        {/* Section 3: Budget */}
        <div className="bg-zinc-950 p-6 rounded-2xl border border-zinc-800 flex flex-col sm:flex-row items-center justify-between gap-4">
           <div>
              <h4 className="font-black text-sm text-white flex items-center gap-2">
                 <DollarSign size={16} className="text-green-500"/> Weekly Spend
              </h4>
              <p className="text-xs font-medium text-zinc-500">Log any out-of-pocket expenses for reimbursement.</p>
           </div>
           <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500 font-bold">$</span>
              <input 
                 type="number" step="0.01" min="0"
                 placeholder="0.00"
                 value={moneySpent} onChange={e => setMoneySpent(e.target.value)}
                 className="w-32 bg-zinc-900 border border-zinc-700 rounded-xl py-3 pl-8 pr-4 text-sm font-bold text-white outline-none focus:border-green-500"
              />
           </div>
        </div>

        <button 
          type="submit"
          disabled={isSubmitting || !progressUpdate.trim()}
          className="w-full py-4 bg-blue-600 hover:bg-blue-500 disabled:bg-zinc-800 disabled:text-zinc-500 text-white rounded-xl font-black text-xs uppercase tracking-widest transition-all flex items-center justify-center gap-2"
        >
          {isSubmitting ? "Sending to HQ..." : "Submit Weekly Log"} <Send size={16} />
        </button>

      </form>
    </div>
  );
}