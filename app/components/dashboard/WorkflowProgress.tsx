"use client";

import { useOptimistic, startTransition } from 'react';
import { Check, Circle, ArrowRight, ClipboardList, CalendarClock, Zap, CalendarDays, Curtain, Truck } from 'lucide-react';
import { markStepComplete, toggleWorkflowTag } from '@/app/lib/actions';

// Expanded Lifecycle including Super Saturday
const STEPS = [
  { key: 'auditions', label: 'Auditions', short: 'Auds' },
  { key: 'callbacks', label: 'Callbacks', short: 'CBs' },
  { key: 'casting', label: 'Casting', short: 'Cast' },
  { key: 'points', label: 'Calibration', short: 'Pts' },
  { key: 'rehearsals', label: 'Rehearsals', short: 'Reh' },
  { key: 'superSat', label: 'Move-In', short: 'Move-In' }, // 🆕
  { key: 'tech', label: 'Tech Week', short: 'Tech' },      
  { key: 'weekend1', label: 'Opening Wknd', short: 'Opener' }, 
  { key: 'weekend2', label: 'Closing Wknd', short: 'Closer' }, 
];

export default function WorkflowProgress({ status, productionId }: { status: any, productionId: number }) {
  
  // 1. Initialize Optimistic State
  const [optimisticStatus, updateOptimistic] = useOptimistic(
    status,
    (state, action: { key: string, value?: boolean }) => {
        const keyMap: any = {
            'auditions': 'hasAuditions',
            'callbacks': 'hasCallbacks',
            'casting': 'hasCast',
            'points': 'hasPoints',
            'schedule': 'hasSchedule',
            'rehearsals': 'hasRehearsals',
            'superSat': 'hasSuperSat', // 🆕
            'tech': 'hasTech',
            'weekend1': 'hasWeekend1',
            'weekend2': 'hasWeekend2',
            'WeeklyReports': 'reportsDone',
            'WeeklySchedule': 'scheduleDone'
        };
        const stateKey = keyMap[action.key] || action.key;
        const newValue = action.value !== undefined ? action.value : !state[stateKey];
        return { ...state, [stateKey]: newValue };
    }
  );

  // 2. Determine Active Phase
  const getActiveIndex = (s: any) => {
    if (!s.hasAuditions) return 0;
    if (!s.hasCallbacks) return 1;
    if (!s.hasCast) return 2;
    if (!s.hasPoints) return 3;
    if (!s.hasSchedule) return 4;
    if (!s.hasRehearsals) return 5; // Rehearsals Done -> Waiting for Super Sat
    if (!s.hasSuperSat) return 6;   // Super Sat Done -> Waiting for Tech
    if (!s.hasTech) return 7;
    if (!s.hasWeekend1) return 8;
    if (!s.hasWeekend2) return 9;
    return 10; // Archive
  };

  const activeIndex = getActiveIndex(optimisticStatus);
  const progress = Math.min(100, Math.round((activeIndex / (STEPS.length - 1)) * 100));
  
  const isRehearsalPhase = activeIndex === 5;
  const isShowRun = activeIndex >= 7 && activeIndex < 9;

  // 3. Handlers
  const handleMarkDone = (stepKey: string) => {
    startTransition(() => {
        updateOptimistic({ key: stepKey, value: true });
        markStepComplete(productionId, stepKey);
    });
  };

  const handleToggle = (tag: string) => {
    startTransition(() => {
        updateOptimistic({ key: tag }); 
        toggleWorkflowTag(productionId, tag);
    });
  };

  return (
    <div className="bg-zinc-900/50 border border-white/5 rounded-[2.5rem] p-8 relative overflow-hidden">
      
      {/* Header */}
      <div className="flex justify-between items-end mb-8 relative z-10">
        <div>
            <h3 className="text-[10px] font-black uppercase tracking-widest text-zinc-500 mb-1">Production Roadmap</h3>
            <div className="flex items-center gap-3">
                <span className="text-xl font-black text-white italic tracking-tighter">
                    Current Phase: <span className="text-blue-500">{STEPS[activeIndex]?.label || "Show Closed"}</span>
                </span>
                {isRehearsalPhase && <span className="px-2 py-0.5 bg-blue-500/10 text-blue-400 text-[10px] font-black uppercase tracking-widest rounded border border-blue-500/20 animate-pulse">10-Week Grind</span>}
                {isShowRun && <span className="px-2 py-0.5 bg-purple-500/10 text-purple-400 text-[10px] font-black uppercase tracking-widest rounded border border-purple-500/20 animate-pulse">Performance Mode</span>}
            </div>
        </div>
        <div className="text-right">
            <span className="text-3xl font-black text-zinc-800">{progress}%</span>
            <p className="text-[9px] font-bold text-zinc-600 uppercase tracking-widest">To Curtain</p>
        </div>
      </div>

      {/* Progress Bar Track */}
      <div className="relative mb-8 z-10 mx-2">
        <div className="absolute top-1/2 left-0 w-full h-1 bg-zinc-800 -translate-y-1/2 rounded-full" />
        <div 
            className="absolute top-1/2 left-0 h-1 bg-gradient-to-r from-blue-600 to-cyan-400 -translate-y-1/2 rounded-full transition-all duration-700 ease-out" 
            style={{ width: `${progress}%` }} 
        />
        
        {/* Step Nodes */}
        <div className="relative flex justify-between">
            {STEPS.map((step, i) => {
                const isCompleted = i < activeIndex;
                const isCurrent = i === activeIndex;
                
                return (
                    <div key={step.key} className="flex flex-col items-center gap-2 relative group cursor-default">
                        <div 
                            className={`w-6 h-6 md:w-8 md:h-8 rounded-full flex items-center justify-center border-4 transition-all duration-500 z-10 bg-zinc-950 ${
                                isCompleted ? 'bg-blue-500 border-blue-500 text-white' :
                                isCurrent ? 'border-blue-500 text-blue-500 shadow-[0_0_15px_rgba(59,130,246,0.5)] scale-110' :
                                'border-zinc-800 text-zinc-700'
                            }`}
                        >
                            {isCompleted ? <Check size={12} strokeWidth={4} /> : <Circle size={8} fill="currentColor" />}
                        </div>
                        <div className={`text-center transition-opacity duration-300 absolute top-10 w-20 -left-6 ${isCurrent ? 'opacity-100' : 'opacity-40 hidden md:block'}`}>
                            <p className={`text-[9px] font-black uppercase tracking-wider ${isCurrent ? 'text-white' : 'text-zinc-500'}`}>{step.short}</p>
                        </div>
                    </div>
                )
            })}
        </div>
      </div>

      {/* --- DYNAMIC ACTION AREA --- */}
      <div className="mt-12">
      
        {/* SCENARIO A: THE 10-WEEK GRIND (Rehearsals) */}
        {isRehearsalPhase && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 bg-blue-500/5 border border-blue-500/10 rounded-2xl p-4">
                <div className="flex flex-col justify-center">
                    <h4 className="text-sm font-bold text-white mb-1 flex items-center gap-2">
                        <CalendarDays size={16} className="text-blue-500"/> Weekly Checklist
                    </h4>
                    <p className="text-xs text-zinc-400">Toggle tasks for the current week. Reset on Mondays.</p>
                </div>
                <div className="flex gap-2">
                    {/* Toggleable Tasks */}
                    <button 
                        onClick={() => handleToggle('WeeklyReports')}
                        className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-[10px] md:text-xs font-bold transition-all border ${
                            optimisticStatus.reportsDone 
                            ? 'bg-emerald-500 text-black border-emerald-400 shadow-[0_0_15px_rgba(16,185,129,0.4)]' 
                            : 'bg-zinc-900 border-zinc-700 text-zinc-400 hover:text-white'
                        }`}
                    >
                        {optimisticStatus.reportsDone ? <Check size={14}/> : <ClipboardList size={14}/>}
                        {optimisticStatus.reportsDone ? "Reports Sent" : "Send Reports"}
                    </button>

                    <button 
                        onClick={() => handleToggle('WeeklySchedule')}
                        className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-[10px] md:text-xs font-bold transition-all border ${
                            optimisticStatus.scheduleDone 
                            ? 'bg-emerald-500 text-black border-emerald-400 shadow-[0_0_15px_rgba(16,185,129,0.4)]' 
                            : 'bg-zinc-900 border-zinc-700 text-zinc-400 hover:text-white'
                        }`}
                    >
                        {optimisticStatus.scheduleDone ? <Check size={14}/> : <CalendarClock size={14}/>}
                        {optimisticStatus.scheduleDone ? "Sched. Posted" : "Post Schedule"}
                    </button>
                    
                    {/* Advance to Super Saturday */}
                    <button 
                        onClick={() => handleMarkDone('rehearsals')}
                        className="px-4 bg-zinc-800 text-zinc-400 hover:bg-blue-600 hover:text-white rounded-xl flex items-center justify-center border border-white/5 hover:border-blue-500 transition-all"
                        title="Finish Rehearsals (Move to Super Saturday)"
                    >
                        <ArrowRight size={16} />
                    </button>
                </div>
            </div>
        )}

        {/* SCENARIO B: SHOW RUN */}
        {isShowRun && (
             <div className="bg-purple-500/5 border border-purple-500/10 rounded-2xl p-4 flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-xl bg-purple-500/10 flex items-center justify-center text-purple-500 animate-pulse">
                        <Curtain size={20} />
                    </div>
                    <div>
                        <p className="text-xs font-bold text-white">Performance Mode: {STEPS[activeIndex].label}</p>
                        <p className="text-[10px] text-zinc-500">Break a leg! Mark complete when curtain falls on Sunday.</p>
                    </div>
                </div>
                <button 
                    onClick={() => handleMarkDone(STEPS[activeIndex].key)}
                    className="px-6 py-2 bg-purple-600 text-white hover:bg-purple-500 text-xs font-black uppercase tracking-widest rounded-xl transition-colors flex items-center gap-2 shadow-lg"
                >
                    Wrap Weekend
                </button>
            </div>
        )}

        {/* SCENARIO C: STANDARD ADVANCE (Including Super Saturday) */}
        {!isRehearsalPhase && !isShowRun && activeIndex < 9 && (
            <div className="bg-zinc-950/50 rounded-2xl p-4 flex items-center justify-between border border-white/5">
                <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-xl bg-zinc-800 flex items-center justify-center text-zinc-400">
                        {activeIndex === 6 ? <Truck size={20} className="text-yellow-400" /> : <ArrowRight size={20} />}
                    </div>
                    <div>
                        <p className="text-xs font-bold text-white">Up Next: {STEPS[activeIndex]?.label}</p>
                        <p className="text-[10px] text-zinc-500">Ready to move to the next phase?</p>
                    </div>
                </div>
                <button 
                    onClick={() => handleMarkDone(STEPS[activeIndex].key)}
                    className="px-6 py-2 bg-white text-black hover:bg-zinc-200 text-xs font-black uppercase tracking-widest rounded-xl transition-colors flex items-center gap-2"
                >
                    {activeIndex === 6 ? "Start Tech Week" : "Mark as Done"}
                </button>
            </div>
        )}
      </div>
    </div>
  );
}