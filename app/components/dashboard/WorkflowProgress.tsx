"use client";

import { useOptimistic, useState, startTransition } from 'react';
import { 
  Check, Circle, ClipboardList, CalendarClock, 
  Truck, Hammer, Calendar, Ticket, ChevronRight, ChevronLeft,
  LayoutList, Mic2
} from 'lucide-react';
import { toggleWorkflowTag } from '@/app/lib/actions';

// --- DATA STRUCTURES ---

const PHASES = [
  { id: 'prepro', label: 'Pre-Production', icon: <LayoutList size={16}/> },
  { id: 'grind', label: '10-Week Grind', icon: <Mic2 size={16}/> },
  { id: 'tech', label: 'Tech Week', icon: <Hammer size={16}/> },
  { id: 'run', label: 'Show Run', icon: <Ticket size={16}/> },
];

const PRE_PRO_STEPS = [
  { key: 'auditions', label: 'Auditions Complete' },
  { key: 'callbacks', label: 'Callbacks Done' },
  { key: 'casting', label: 'Cast List Posted' },
  { key: 'first_reh', label: '1st Rehearsal Planned' },
];

const TECH_DAYS = [
  { key: 'superSat', label: 'Super Saturday (Move-In)', icon: <Truck size={14}/> },
  { key: 'tech_mon', label: 'Tech Monday', icon: <Hammer size={14}/> },
  { key: 'tech_tue', label: 'Tech Tuesday', icon: <Hammer size={14}/> },
  { key: 'tech_wed', label: 'Tech Wednesday', icon: <Hammer size={14}/> },
  { key: 'tech_thu', label: 'Final Dress', icon: <Ticket size={14}/> },
];

export default function WorkflowProgress({ status, productionId }: { status: any, productionId: number }) {
  
  // 1. OPTIMISTIC STATE
  const [optimisticTags, toggleOptimistic] = useOptimistic(
    status.tags || [], // Expects an array of strings: ["Auditions", "W1_Report", etc.]
    (currentTags: string[], tagToToggle: string) => {
        if (currentTags.includes(tagToToggle)) {
            return currentTags.filter(t => t !== tagToToggle);
        } else {
            return [...currentTags, tagToToggle];
        }
    }
  );

  // 2. INTERNAL STATE (For the "Week Picker")
  const [activeTab, setActiveTab] = useState('prepro');
  const [currentWeek, setCurrentWeek] = useState(1);

  // 3. ACTION HANDLER
  const handleToggle = (tag: string) => {
    startTransition(() => {
        toggleOptimistic(tag);
        toggleWorkflowTag(productionId, tag);
    });
  };

  // 4. HELPERS
  const isDone = (tag: string) => optimisticTags.includes(tag);
  
  // Calculate Progress per Phase
  const getPhaseProgress = (phase: string) => {
      if (phase === 'prepro') return PRE_PRO_STEPS.filter(s => isDone(s.key)).length / PRE_PRO_STEPS.length;
      if (phase === 'tech') return TECH_DAYS.filter(d => isDone(d.key)).length / TECH_DAYS.length;
      if (phase === 'run') {
          let count = 0;
          if (isDone('weekend1')) count++;
          if (isDone('weekend2')) count++;
          return count / 2;
      }
      // Grind Progress (Count total weeks done)
      if (phase === 'grind') {
          let doneCount = 0;
          for(let i=1; i<=10; i++) {
              if (isDone(`W${i}_Report`) && isDone(`W${i}_Sched`)) doneCount++;
          }
          return doneCount / 10;
      }
      return 0;
  };

  return (
    <div className="bg-zinc-900/50 border border-white/5 rounded-[2.5rem] p-6 md:p-8 flex flex-col gap-6">
      
      {/* HEADER & TABS */}
      <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-6 border-b border-white/5 pb-6">
          <div>
              <h3 className="text-[10px] font-black uppercase tracking-widest text-zinc-500 mb-1">Production Roadmap</h3>
              <h2 className="text-2xl font-black text-white italic tracking-tighter">
                  Phase: <span className="text-blue-500">{PHASES.find(p => p.id === activeTab)?.label}</span>
              </h2>
          </div>

          {/* PHASE TABS */}
          <div className="flex p-1 bg-zinc-950 rounded-xl border border-white/5 overflow-x-auto">
              {PHASES.map(phase => {
                  const progress = getPhaseProgress(phase.id);
                  const isComplete = progress === 1;
                  const isActive = activeTab === phase.id;
                  
                  return (
                      <button
                          key={phase.id}
                          onClick={() => setActiveTab(phase.id)}
                          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all whitespace-nowrap ${
                              isActive 
                              ? 'bg-zinc-800 text-white shadow-lg' 
                              : 'text-zinc-500 hover:text-zinc-300 hover:bg-zinc-900'
                          }`}
                      >
                          <div className={`relative ${isComplete ? 'text-emerald-500' : isActive ? 'text-blue-500' : 'text-zinc-600'}`}>
                              {isComplete ? <Check size={14}/> : phase.icon}
                              {/* Mini Progress Dot */}
                              {!isComplete && progress > 0 && (
                                  <div className="absolute -top-1 -right-1 w-2 h-2 bg-blue-500 rounded-full border-2 border-zinc-950" />
                              )}
                          </div>
                          {phase.label}
                      </button>
                  )
              })}
          </div>
      </div>

      {/* --- CONTENT AREA --- */}
      <div className="min-h-[200px]">
          
          {/* PHASE 1: PRE-PRO */}
          {activeTab === 'prepro' && (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 animate-in fade-in slide-in-from-right-4">
                  {PRE_PRO_STEPS.map((step, i) => (
                      <ToggleCard 
                          key={step.key} 
                          label={step.label} 
                          checked={isDone(step.key)} 
                          onClick={() => handleToggle(step.key)}
                          index={i + 1}
                      />
                  ))}
              </div>
          )}

          {/* PHASE 2: THE GRIND (10 Weeks) */}
          {activeTab === 'grind' && (
              <div className="animate-in fade-in slide-in-from-right-4">
                  {/* Week Selector */}
                  <div className="flex items-center justify-between bg-zinc-950 p-2 rounded-2xl mb-6 border border-white/5">
                      <button 
                          onClick={() => setCurrentWeek(Math.max(1, currentWeek - 1))}
                          className="w-10 h-10 flex items-center justify-center rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-white transition-colors disabled:opacity-30"
                          disabled={currentWeek === 1}
                      >
                          <ChevronLeft size={18}/>
                      </button>
                      
                      <div className="flex flex-col items-center">
                          <span className="text-xs font-black uppercase tracking-widest text-zinc-500">Rehearsal Week</span>
                          <span className="text-xl font-black text-white">Week {currentWeek}</span>
                      </div>

                      <button 
                          onClick={() => setCurrentWeek(Math.min(10, currentWeek + 1))}
                          className="w-10 h-10 flex items-center justify-center rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-white transition-colors disabled:opacity-30"
                          disabled={currentWeek === 10}
                      >
                          <ChevronRight size={18}/>
                      </button>
                  </div>

                  {/* Tasks for Selected Week */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <WeekTaskCard 
                          title="Rehearsal Reports"
                          desc={`Upload reports for Week ${currentWeek}`}
                          icon={<ClipboardList size={20}/>}
                          checked={isDone(`W${currentWeek}_Report`)}
                          onClick={() => handleToggle(`W${currentWeek}_Report`)}
                      />
                      <WeekTaskCard 
                          title="Schedule Posted"
                          desc={`Confirm call times for Week ${currentWeek + 1}`}
                          icon={<CalendarClock size={20}/>}
                          checked={isDone(`W${currentWeek}_Sched`)}
                          onClick={() => handleToggle(`W${currentWeek}_Sched`)}
                      />
                  </div>

                  {/* Week Progress Dots */}
                  <div className="flex justify-between mt-8 px-2">
                      {[1,2,3,4,5,6,7,8,9,10].map(w => {
                          const wDone = isDone(`W${w}_Report`) && isDone(`W${w}_Sched`);
                          return (
                              <button 
                                  key={w} 
                                  onClick={() => setCurrentWeek(w)}
                                  className={`w-2 h-2 rounded-full transition-all ${
                                      w === currentWeek ? 'scale-150 bg-white shadow-lg' : 
                                      wDone ? 'bg-emerald-500' : 'bg-zinc-800'
                                  }`}
                                  title={`Week ${w}`}
                              />
                          )
                      })}
                  </div>
              </div>
          )}

          {/* PHASE 3: TECH WEEK */}
          {activeTab === 'tech' && (
              <div className="space-y-2 animate-in fade-in slide-in-from-right-4">
                  {TECH_DAYS.map((day) => (
                      <button
                          key={day.key}
                          onClick={() => handleToggle(day.key)}
                          className={`w-full flex items-center justify-between p-4 rounded-xl border transition-all group ${
                              isDone(day.key)
                              ? 'bg-purple-500/10 border-purple-500/30'
                              : 'bg-zinc-950 border-white/5 hover:bg-zinc-900'
                          }`}
                      >
                          <div className="flex items-center gap-4">
                              <div className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors ${isDone(day.key) ? 'bg-purple-500 text-white' : 'bg-zinc-800 text-zinc-500'}`}>
                                  {isDone(day.key) ? <Check size={16}/> : day.icon}
                              </div>
                              <span className={`text-sm font-bold ${isDone(day.key) ? 'text-white' : 'text-zinc-400 group-hover:text-zinc-200'}`}>
                                  {day.label}
                              </span>
                          </div>
                          {isDone(day.key) && <span className="text-[10px] font-black uppercase tracking-widest text-purple-400">Complete</span>}
                      </button>
                  ))}
              </div>
          )}

          {/* PHASE 4: THE RUN */}
          {activeTab === 'run' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-in fade-in slide-in-from-right-4">
                  <BigRunCard 
                      label="Opening Weekend" 
                      sub="Shows 1-4"
                      checked={isDone('weekend1')} 
                      onClick={() => handleToggle('weekend1')} 
                  />
                  <BigRunCard 
                      label="Closing Weekend" 
                      sub="Shows 5-8 & Strike"
                      checked={isDone('weekend2')} 
                      onClick={() => handleToggle('weekend2')} 
                  />
              </div>
          )}
      </div>
    </div>
  );
}

// --- SUB-COMPONENTS ---

function ToggleCard({ label, checked, onClick, index }: any) {
    return (
        <button 
            onClick={onClick}
            className={`h-full flex flex-col justify-between p-4 rounded-2xl border transition-all text-left group ${
                checked 
                ? 'bg-blue-500 text-white border-blue-400 shadow-lg shadow-blue-900/20' 
                : 'bg-zinc-950 border-white/5 hover:border-white/10 hover:bg-zinc-900'
            }`}
        >
            <div className="flex justify-between items-start mb-4">
                <span className={`text-[10px] font-black opacity-50 uppercase tracking-widest ${checked ? 'text-blue-200' : 'text-zinc-600'}`}>Step 0{index}</span>
                <div className={`w-6 h-6 rounded-full flex items-center justify-center border-2 ${checked ? 'bg-white border-white text-blue-600' : 'border-zinc-700 text-transparent'}`}>
                    <Check size={12} strokeWidth={4}/>
                </div>
            </div>
            <span className={`text-sm font-bold leading-tight ${checked ? 'text-white' : 'text-zinc-400 group-hover:text-zinc-200'}`}>{label}</span>
        </button>
    )
}

function WeekTaskCard({ title, desc, icon, checked, onClick }: any) {
    return (
        <button 
            onClick={onClick}
            className={`flex items-center gap-4 p-5 rounded-2xl border transition-all text-left group ${
                checked 
                ? 'bg-emerald-500/10 border-emerald-500/30' 
                : 'bg-zinc-950 border-white/5 hover:border-white/10 hover:bg-zinc-900'
            }`}
        >
            <div className={`w-12 h-12 rounded-xl flex items-center justify-center transition-colors ${checked ? 'bg-emerald-500 text-black' : 'bg-zinc-800 text-zinc-500'}`}>
                {checked ? <Check size={24}/> : icon}
            </div>
            <div>
                <h4 className={`text-sm font-bold ${checked ? 'text-white' : 'text-zinc-300'}`}>{title}</h4>
                <p className={`text-xs ${checked ? 'text-emerald-400' : 'text-zinc-500'}`}>{checked ? 'Completed' : desc}</p>
            </div>
        </button>
    )
}

function BigRunCard({ label, sub, checked, onClick }: any) {
    return (
        <button 
            onClick={onClick}
            className={`relative p-8 rounded-3xl border flex flex-col items-center text-center justify-center gap-4 transition-all overflow-hidden group ${
                checked 
                ? 'bg-gradient-to-br from-purple-600 to-indigo-700 border-purple-500 text-white shadow-2xl' 
                : 'bg-zinc-950 border-white/5 hover:bg-zinc-900'
            }`}
        >
            {checked && <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10"></div>}
            
            <div className={`w-16 h-16 rounded-full flex items-center justify-center border-4 text-3xl transition-all ${
                checked ? 'bg-white border-white text-purple-600 scale-110' : 'border-zinc-800 text-zinc-700 bg-zinc-900'
            }`}>
                {checked ? <Check size={32} strokeWidth={4}/> : <Ticket size={32}/>}
            </div>
            
            <div className="relative z-10">
                <h3 className={`text-xl font-black uppercase italic tracking-tighter ${checked ? 'text-white' : 'text-zinc-300'}`}>{label}</h3>
                <p className={`text-xs font-bold tracking-widest uppercase mt-1 ${checked ? 'text-purple-200' : 'text-zinc-600'}`}>{sub}</p>
            </div>
        </button>
    )
}