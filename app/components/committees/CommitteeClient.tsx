 
"use client";

import React, { useState, useMemo } from 'react';
import { 
  Printer, Crown, Wand2, RotateCcw, X, 
  Trash2, Sliders, Info, CheckCircle2
} from 'lucide-react';

// --- CONFIG ---
const COMMITTEES = {
    'Pre-Show': ["Publicity", "Sets", "Set Dressing", "Raffles", "Green Room", "Costumes", "Props", "Makeup", "Hair", "Tech"],
    'Show Week': ["Raffles", "Green Room", "Costumes", "Props", "Makeup", "Hair", "Tech", "Ninjas/Set Movers", "Box Office", "Concessions", "Security"]
};

const DEFAULT_RULES: Record<string, { type: 'fixed' | 'ratio', val: number, min?: number, reason: string }> = {
    "Green Room": { type: 'ratio', val: 8, min: 2, reason: "Safety: 1 Adult per 8 Students" }, 
    "Costumes": { type: 'ratio', val: 6, min: 3, reason: "Labor: 1 per 6 Actors" },   
    "Makeup": { type: 'ratio', val: 7, min: 2, reason: "Speed: 1 per 7 Actors" },
    "Tech": { type: 'fixed', val: 5, reason: "Booth + Deck Crew" },              
    "Sets": { type: 'fixed', val: 8, reason: "Heavy Lifting Team" },              
    "Security": { type: 'fixed', val: 3, reason: "Door & Perimeter" },
    "Box Office": { type: 'fixed', val: 3, reason: "Ticket Window & Will Call" },
    "Concessions": { type: 'fixed', val: 4, reason: "Prep & Sales" },
    "Publicity": { type: 'fixed', val: 3, reason: "Social Media & Posters" },
    "default": { type: 'fixed', val: 3, reason: "Standard Committee Size" }
};

export default function CommitteeDashboard({ 
    volunteers = [], // Default to empty array
    students = [],   // Default to empty array
    activeId 
}: { 
    volunteers?: any[], 
    students?: any[], 
    activeId: number 
}) {
  
  const [groupBy, setGroupBy] = useState<'Pre-Show' | 'Show Week'>('Pre-Show');
  const [rawData] = useState<any[]>(volunteers);
  
  // 🚨 FIX: Smart Initial Assignments
  // If we are in Pre-Show mode, we default to Pre-Show 1st choice, etc.
  // Since assignments are "session based" in this view, we track them separately per mode effectively.
  const [assignments, setAssignments] = useState<Record<string, string>>({});
  const [leadership, setLeadership] = useState<Record<string, { chair: number | null, coChair: number | null }>>({});
  const [selectedCommittee, setSelectedCommittee] = useState<string | null>(null);
  const [rules, setRules] = useState(DEFAULT_RULES);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  // --- HELPER: Get Preferences based on current View ---
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const getPrefs = (p: any) => {
      if (groupBy === 'Pre-Show') {
          return { first: p.preShow1, second: p.preShow2, third: p.preShow3 };
      } else {
          return { first: p.showWeek1, second: p.showWeek2, third: p.showWeek3 };
      }
  };

  // --- HELPER: CALCULATE TARGETS ---
  const getCommitteeTarget = (committeeName: string) => {
      const castSize = students.length || 40; 
      const rule = rules[committeeName] || rules["default"];
      if (rule.type === 'fixed') return rule.val;
      let calculated = Math.ceil(castSize / rule.val);
      if (rule.min && calculated < rule.min) calculated = rule.min;
      return calculated;
  };

  const updateRuleValue = (key: string, newVal: number) => {
      setRules(prev => ({ ...prev, [key]: { ...prev[key], val: newVal } }));
  };

  // --- ACTIONS ---
  const handleClearBoard = () => {
      if(!confirm(`Are you sure you want to clear assignments for ${groupBy}?`)) return;
      // In a real app, you might want to separate "Pre-Show Assignments" from "Show Week Assignments"
      // For now, we just clear the current in-memory state
      setAssignments({});
  };

  const handleAutoBalance = () => {
      if(!confirm(`Auto-Balance ${groupBy}?`)) return;
      
      const newAssignments = { ...assignments };
      // @ts-ignore
      const currentCommittees = COMMITTEES[groupBy];
      let movedCount = 0;

      const getCount = (comm: string) => rawData.filter(p => newAssignments[p.id] === comm).length;

      currentCommittees.forEach((targetComm: string) => {
          const targetLimit = getCommitteeTarget(targetComm); 
          if (getCount(targetComm) < targetLimit) {
               rawData.forEach(p => {
                   if (getCount(targetComm) >= targetLimit) return; 
                   
                   const prefs = getPrefs(p);
                   const currentComm = newAssignments[p.id];
                   
                   // Logic: If unassigned OR assigned to something over-full
                   // AND they want this committee
                   if (!currentComm || (getCount(currentComm) > getCommitteeTarget(currentComm))) {
                       if (prefs.first === targetComm || prefs.second === targetComm) {
                           newAssignments[p.id] = targetComm;
                           movedCount++;
                       }
                   }
               });
          }
      });
      setAssignments(newAssignments);
  };

  const handleSetLeader = (committee: string, role: 'chair' | 'coChair', personId: number | null) => {
      const key = `${groupBy}:${committee}`;
      setLeadership(prev => ({
          ...prev, [key]: { ...(prev[key] || { chair: null, coChair: null }), [role]: personId }
      }));
  };

  // Group Logic
  const groupedData = useMemo(() => {
      const groups: Record<string, any[]> = {};
      // @ts-ignore
      COMMITTEES[groupBy].forEach(c => groups[c] = []);
      groups["Unassigned"] = [];

      rawData.forEach(p => {
          // Check if manual assignment exists
          let assignedVal = assignments[p.id];
          
          // If NOT manually assigned, Default to their 1st Choice for this phase
          if (!assignedVal) {
              const prefs = getPrefs(p);
              // Only auto-assign if it's a valid committee for this phase
              // @ts-ignore
              if (COMMITTEES[groupBy].includes(prefs.first)) {
                  assignedVal = prefs.first;
              }
          }

          if (assignedVal && groups[assignedVal]) groups[assignedVal].push(p);
          else groups["Unassigned"].push(p);
      });
      return groups;
  }, [groupBy, rawData, assignments, getPrefs]);

  const currentTeam = selectedCommittee ? groupedData[selectedCommittee] : [];
  const leadershipKey = `${groupBy}:${selectedCommittee}`;
  const currentLeaders = leadership[leadershipKey] || { chair: null, coChair: null };

  return (
    <div className="min-h-screen bg-zinc-950 text-white font-sans p-4 md:p-6 flex flex-col">
        {/* HEADER */}
        <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-4 mb-6 print:hidden">
            <div>
                <h1 className="text-2xl font-black uppercase italic tracking-tighter text-white">Committee Manager</h1>
                <p className="text-zinc-500 text-xs font-medium">
                    {rawData.length} Volunteers • Cast Size: <span className="text-blue-400 font-bold">{students.length}</span>
                </p>
            </div>
            <div className="flex flex-wrap gap-2 w-full xl:w-auto">
                <div className="bg-zinc-900 border border-white/10 rounded-lg p-1 flex shadow-inner">
                    <button onClick={() => setGroupBy('Pre-Show')} className={`px-4 py-2 rounded text-xs font-bold uppercase transition-all ${groupBy === 'Pre-Show' ? 'bg-blue-600 text-white shadow-lg' : 'text-zinc-500 hover:text-white'}`}>Pre-Show</button>
                    <button onClick={() => setGroupBy('Show Week')} className={`px-4 py-2 rounded text-xs font-bold uppercase transition-all ${groupBy === 'Show Week' ? 'bg-blue-600 text-white shadow-lg' : 'text-zinc-500 hover:text-white'}`}>Show Week</button>
                </div>
                <button onClick={() => setIsSettingsOpen(true)} className="bg-zinc-800 hover:bg-zinc-700 text-zinc-300 border border-white/5 px-4 py-2 rounded-lg text-xs font-bold uppercase flex items-center gap-2 transition-all"><Sliders size={14}/> Rules</button>
                <button onClick={handleAutoBalance} className="bg-emerald-600/10 hover:bg-emerald-600/20 text-emerald-500 border border-emerald-600/50 px-4 py-2 rounded-lg text-xs font-black uppercase flex items-center gap-2 transition-all"><Wand2 size={14}/> Balance</button>
                <button onClick={handleClearBoard} className="bg-red-500/10 hover:bg-red-500/20 text-red-500 border border-red-500/50 px-4 py-2 rounded-lg text-xs font-black uppercase flex items-center gap-2 transition-all"><Trash2 size={14}/> Clear</button>
                <button onClick={() => setAssignments({})} className="bg-zinc-800 hover:bg-zinc-700 text-zinc-400 px-3 py-2 rounded-lg transition-all"><RotateCcw size={14}/></button>
                <button onClick={() => window.print()} className="bg-white text-black hover:bg-zinc-200 px-4 py-2 rounded-lg text-xs font-black uppercase flex items-center gap-2 transition-all shadow-xl"><Printer size={14}/> Print</button>
            </div>
        </div>

        {/* BOARD GRID */}
        <div className="columns-1 md:columns-2 xl:columns-3 gap-6 space-y-6 print:block print:columns-2">
            {Object.keys(groupedData).map(committee => {
                const team = groupedData[committee];
                const target = getCommitteeTarget(committee);
                const isUnderstaffed = team.length < target;
                const statusColor = isUnderstaffed ? 'text-amber-500' : 'text-emerald-500';
                const lKey = `${groupBy}:${committee}`;
                const leaders = leadership[lKey] || { chair: null, coChair: null };
                const chairName = rawData.find(p => p.id === leaders.chair)?.name;

                if (team.length === 0 && committee !== "Unassigned") return null;

                return (
                    <div key={committee} className={`break-inside-avoid mb-6 rounded-2xl overflow-hidden border shadow-2xl border-white/10 bg-zinc-900/40 print:border-black print:bg-white print:mb-8`}>
                        <div onClick={() => setSelectedCommittee(committee)} className="p-4 border-b border-white/5 flex justify-between items-center cursor-pointer hover:bg-white/5 transition-colors">
                            <div>
                                <h3 className={`font-black uppercase text-sm tracking-widest ${statusColor} print:text-black`}>{committee}</h3>
                                {chairName && <p className="text-[9px] text-blue-400 font-bold mt-0.5 flex items-center gap-1"><Crown size={10}/> {chairName}</p>}
                            </div>
                            <span className={`text-[10px] font-bold px-2 py-1 rounded-md border border-white/10 bg-zinc-950 text-zinc-400`}>{team.length} / {target}</span>
                        </div>
                        <div className="p-3 space-y-1">
                            {team.slice(0, 3).map((p: any) => {
                                const prefs = getPrefs(p);
                                return (
                                    <div key={p.id} className="text-xs text-zinc-400 flex justify-between">
                                        <span>{p.name}</span>
                                        {prefs.first === committee && <CheckCircle2 size={10} className="text-emerald-500"/>}
                                    </div>
                                )
                            })}
                            {team.length > 3 && <div className="text-[10px] text-zinc-600 italic pt-1">+{team.length - 3} more...</div>}
                        </div>
                    </div>
                );
            })}
        </div>

        {/* --- DRAWER (Simplified for brevity) --- */}
        {selectedCommittee && (
            <div className="fixed inset-0 z-50 flex justify-end">
                <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={() => setSelectedCommittee(null)} />
                <aside className="relative w-full max-w-3xl bg-zinc-900 border-l border-white/10 shadow-2xl flex flex-col animate-in slide-in-from-right duration-300">
                    <div className="p-6 border-b border-white/10 flex justify-between items-start bg-zinc-950">
                        <div>
                            <h2 className="text-3xl font-black uppercase italic tracking-tighter text-white">{selectedCommittee}</h2>
                            <p className="text-zinc-500 text-xs font-bold uppercase tracking-widest mt-1">{groupBy} • {currentTeam.length} Members</p>
                        </div>
                        <button onClick={() => setSelectedCommittee(null)} className="p-2 hover:bg-white/10 rounded-full"><X/></button>
                    </div>
                    <div className="flex-1 overflow-y-auto custom-scrollbar p-6 space-y-8">
                         {/* Roster List */}
                         <div className="bg-zinc-950 border border-white/5 rounded-xl divide-y divide-white/5">
                            {currentTeam.map((p: any) => {
                                const prefs = getPrefs(p);
                                return (
                                    <div key={p.id} className="p-3 hover:bg-white/5 transition-colors group flex justify-between items-center">
                                        <div>
                                            <div className="text-sm font-bold text-zinc-200">{p.name}</div>
                                            <div className="text-[10px] text-zinc-500">{p.studentName && `Parent of ${p.studentName}`}</div>
                                        </div>
                                        <div className="flex items-center gap-4">
                                            <div className="flex gap-2">
                                                <PreferenceBadge rank="1" value={prefs.first} current={selectedCommittee}/>
                                                <PreferenceBadge rank="2" value={prefs.second} current={selectedCommittee}/>
                                            </div>
                                            <select 
                                                className="bg-zinc-900 border border-zinc-800 rounded px-2 py-1 text-[10px] text-zinc-400 outline-none focus:text-white"
                                                value={assignments[p.id] || ((prefs.first === selectedCommittee) ? selectedCommittee : "Unassigned")}
                                                onChange={(e) => { const n = {...assignments}; n[p.id] = e.target.value; setAssignments(n); }}
                                            >
                                                {/* @ts-ignore */}
                                                {COMMITTEES[groupBy].map((c: string) => <option key={c} value={c}>{c}</option>)}
                                                <option value="Unassigned">Unassigned</option>
                                            </select>
                                        </div>
                                    </div>
                                )
                            })}
                         </div>
                    </div>
                </aside>
            </div>
        )}
    </div>
  );
}

function PreferenceBadge({ rank, value, current }: any) {
    const isMatch = value === current;
    return (
        <div className={`flex items-center gap-1.5 px-2 py-1 rounded border text-[9px] font-bold uppercase ${isMatch ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' : 'bg-zinc-900 border-zinc-800 text-zinc-600'}`}>
            <span className="opacity-50">{rank}:</span>
            <span>{value || "-"}</span>
        </div>
    )
}