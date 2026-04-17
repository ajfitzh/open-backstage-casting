import React from 'react';
import { JudgeRole, ROLE_THEMES } from './AuditionsClient';

interface JudgeSetupModalProps {
  isMounted: boolean;
  judgeName: string;
  setJudgeName: (name: string) => void;
  judgeRole: JudgeRole | null;
  setJudgeRole: (role: JudgeRole) => void;
  setIsReady: (ready: boolean) => void;
}

export default function JudgeSetupModal({
  isMounted,
  judgeName,
  setJudgeName,
  judgeRole,
  setJudgeRole,
  setIsReady
}: JudgeSetupModalProps) {
  return (
    <div className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-xl flex items-center justify-center p-4">
      <div className="w-full max-w-[420px] bg-zinc-950 border border-white/10 rounded-2xl p-6 md:p-8 space-y-6 shadow-2xl">
        <h2 className="text-2xl font-black uppercase tracking-tight">Judge Setup</h2>
        <div>
          <label className="block text-[10px] font-bold uppercase text-zinc-500 mb-1">Judge Name</label>
          <input 
            value={judgeName} 
            onChange={(e) => setJudgeName(e.target.value)} 
            className="w-full bg-zinc-900 border border-white/10 rounded-lg p-3 text-sm focus:border-blue-500 outline-none transition-all" 
            placeholder="Enter your name" 
          />
        </div>
        <div>
          <label className="block text-[10px] font-bold uppercase text-zinc-500 mb-2">Judge Role</label>
          <div className="grid grid-cols-2 gap-2">
            {(Object.keys(ROLE_THEMES) as JudgeRole[]).map((role) => (
              <button 
                key={role} 
                onClick={() => setJudgeRole(role)} 
                className={`p-3 rounded-lg border text-xs font-black uppercase transition-all ${judgeRole === role ? "bg-white text-black border-white shadow-lg" : "bg-zinc-900 border-zinc-800 text-zinc-400 hover:border-zinc-600"}`}
              >
                {role}
              </button>
            ))}
          </div>
        </div>
        <div className="flex gap-3 pt-2">
          {isMounted && localStorage.getItem("judgeName") && (
            <button onClick={() => setIsReady(true)} className="px-6 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-xl font-bold uppercase text-[10px] tracking-widest transition-colors">
                Cancel
            </button>
          )}
          <button 
            disabled={!judgeName || !judgeRole} 
            onClick={() => { 
                localStorage.setItem("judgeName", judgeName); 
                localStorage.setItem("judgeRole", judgeRole!); 
                setIsReady(true); 
            }} 
            className="flex-1 bg-blue-600 hover:bg-blue-500 disabled:bg-zinc-800 disabled:text-zinc-500 py-4 rounded-xl font-black uppercase tracking-widest transition-colors shadow-lg shadow-blue-900/20"
          >
            {isMounted && localStorage.getItem("judgeName") ? "Update Profile" : "Start Judging"}
          </button>
        </div>
      </div>
    </div>
  );
}