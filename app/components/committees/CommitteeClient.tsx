"use client";

import React, { useState, useMemo, useEffect, useTransition } from 'react';
import { 
  Printer, Crown, Wand2, RotateCcw, X, 
  CheckCircle2, Save, Loader2, Settings2, Lightbulb,
  LayoutGrid, LayoutList
} from 'lucide-react';
import { saveCommitteeAssignments } from '@/app/actions/committees';

// --- TYPES ---
interface Volunteer {
  id: number;
  name: string;
  email: string;
  phone: string;
  studentName: string;
  preShow1: string | null;
  preShow2: string | null;
  preShow3: string | null;
  showWeek1: string | null;
  showWeek2: string | null;
  showWeek3: string | null;
  assignedPreShow: string | null;
  assignedShowWeek: string | null;
  isChair: boolean;
}

// --- CONFIG ---
const COMMITTEES: Record<string, string[]> = {
    'Pre-Show': ["Show Chair", "Publicity", "Sets", "Set Dressing", "Raffles", "Green Room", "Costumes", "Props", "Makeup", "Hair", "Tech"],
    'Show Week': ["Show Chair", "Raffles", "Green Room", "Costumes", "Props", "Makeup", "Hair", "Tech", "Ninjas/Set Movers", "Box Office", "Concessions", "Security"]
};

// Base baseline rules calibrated to Jenny's Word Doc targets
const DEFAULT_RULES: Record<string, { type: 'fixed' | 'ratio', val: number, min?: number, reason: string }> = {
    "Show Chair": { type: 'fixed', val: 1, reason: "The Boss" },
    "Green Room": { type: 'ratio', val: 13, min: 2, reason: "Jenny's Ratio: 1 per 13 Actors" }, 
    "Costumes": { type: 'ratio', val: 13, min: 3, reason: "Jenny's Ratio: 1 per 13 Actors" },   
    "Hair": { type: 'ratio', val: 15, min: 2, reason: "Jenny's Ratio: 1 per 15 Actors" },
    "Makeup": { type: 'ratio', val: 25, min: 2, reason: "Jenny's Ratio: 1 per 25 Actors" },
    "Publicity": { type: 'fixed', val: 9, reason: "Jenny's Target" },
    "Raffles": { type: 'fixed', val: 7, reason: "Jenny's Target" },
    "Sets": { type: 'fixed', val: 6, reason: "Jenny's Target" },              
    "Set Dressing": { type: 'fixed', val: 6, reason: "Jenny's Target" },
    "Props": { type: 'fixed', val: 5, reason: "Jenny's Target" },
    "Tech": { type: 'fixed', val: 2, reason: "Jenny's Target" },              
    "Security": { type: 'fixed', val: 3, reason: "Door & Perimeter" },
    "Box Office": { type: 'fixed', val: 3, reason: "Ticket Window" },
    "Concessions": { type: 'fixed', val: 4, reason: "Prep & Sales" },
    "Ninjas/Set Movers": { type: 'fixed', val: 4, reason: "Deck Crew" },
    "default": { type: 'fixed', val: 3, reason: "Standard Size" }
};

export default function CommitteeDashboard({ 
    volunteers = [], 
    students = [],   
    activeId 
}: { 
    volunteers?: Volunteer[], 
    students?: any[], 
    activeId: number 
}) {
  
  const [groupBy, setGroupBy] = useState<'Pre-Show' | 'Show Week'>('Pre-Show');
  const [viewMode, setViewMode] = useState<'board' | 'list'>('board');
  const [rawData] = useState<Volunteer[]>(volunteers);
  
  const [assignments, setAssignments] = useState<Record<number, string>>({});
  const [chairs, setChairs] = useState<Record<number, boolean>>({});
  const [selectedCommittee, setSelectedCommittee] = useState<string | null>(null);
  
  const [targets, setTargets] = useState<Record<string, number>>({});
  const [showSettings, setShowSettings] = useState(false);
  const [isPending, startTransition] = useTransition();

  // --- INITIALIZE TARGETS ON MOUNT ---
  useEffect(() => {
      const initialTargets: Record<string, number> = {};
      const castSize = students.length || 40;

      Object.entries(COMMITTEES).forEach(([phase, comms]) => {
          comms.forEach(c => {
              const rule = DEFAULT_RULES[c] || DEFAULT_RULES["default"];
              let val = rule.type === 'fixed' ? rule.val : Math.ceil(castSize / rule.val);
              if (rule.min && val < rule.min) val = rule.min;
              initialTargets[`${phase}-${c}`] = val;
          });
      });
      setTargets(initialTargets);
  }, [students.length]);

  // --- LOAD SAVED DATA FROM DB ON TAB SWITCH ---
  const initialAssignments = useMemo(() => {
      const acc: Record<number, string> = {};
      rawData.forEach(v => {
          const val = groupBy === 'Pre-Show' ? v.assignedPreShow : v.assignedShowWeek;
          if (val) acc[v.id] = val;
      });
      return acc;
  }, [rawData, groupBy]);

  const initialChairs = useMemo(() => {
      const acc: Record<number, boolean> = {};
      rawData.forEach(v => { if (v.isChair) acc[v.id] = true; });
      return acc;
  }, [rawData]);

  useEffect(() => {
      setAssignments(initialAssignments);
      setChairs(initialChairs);
  }, [initialAssignments, initialChairs]);

  const hasChanges = JSON.stringify(assignments) !== JSON.stringify(initialAssignments) ||
                     JSON.stringify(chairs) !== JSON.stringify(initialChairs);

  // --- HELPERS ---
  const getPrefs = (p: Volunteer) => {
      return groupBy === 'Pre-Show' 
          ? { first: p.preShow1, second: p.preShow2, third: p.preShow3 }
          : { first: p.showWeek1, second: p.showWeek2, third: p.showWeek3 };
  };

  const getCommitteeTarget = (committeeName: string) => targets[`${groupBy}-${committeeName}`] || 0;

  // --- ACTIONS ---
  const handleSave = () => {
      startTransition(async () => {
          await saveCommitteeAssignments(groupBy, assignments, chairs);
      });
  };

  const handleClearBoard = () => {
      if(!confirm(`Are you sure you want to clear ALL unsaved assignments for ${groupBy}?`)) return;
      setAssignments(initialAssignments);
      setChairs(initialChairs);
  };

  const handleAutoBalance = () => {
      if(!confirm(`Auto-Balance unassigned volunteers for ${groupBy}? (This will NOT overwrite existing assignments)`)) return;
      
      const newAssignments = { ...assignments };
      const currentCommittees = COMMITTEES[groupBy];
      
      const getCount = (comm: string) => rawData.filter(p => newAssignments[p.id] === comm).length;
      
      rawData.forEach(p => {
          if (!newAssignments[p.id] || newAssignments[p.id] === "Unassigned") {
              const prefs = getPrefs(p);
              const choices = [prefs.first, prefs.second, prefs.third].filter(Boolean) as string[];
              
              for (const choice of choices) {
                  if (currentCommittees.includes(choice)) {
                      const targetLimit = getCommitteeTarget(choice);
                      if (getCount(choice) < targetLimit) {
                          newAssignments[p.id] = choice;
                          break;
                      }
                  }
              }
          }
      });
      setAssignments(newAssignments);
  };

  const handleSuggestLimits = () => {
      const currentComms = COMMITTEES[groupBy];
      const totalVolunteers = rawData.length;
      const currentTotalTargets = currentComms.reduce((sum, c) => sum + (targets[`${groupBy}-${c}`] || 0), 0);

      if (currentTotalTargets === 0) return;

      const scale = totalVolunteers / currentTotalTargets;
      const newTargets = { ...targets };

      currentComms.forEach(c => {
          const key = `${groupBy}-${c}`;
          newTargets[key] = Math.max(1, Math.round((targets[key] || 0) * scale));
      });
      
      setTargets(newTargets);
  };

  // --- GROUP DATA FOR BOARD RENDER ---
  const groupedData = useMemo(() => {
      const groups: Record<string, Volunteer[]> = {};
      COMMITTEES[groupBy].forEach(c => groups[c] = []);
      groups["Unassigned"] = [];
      
      rawData.forEach(p => {
          const assignedVal = assignments[p.id];
          if (assignedVal && groups[assignedVal]) {
              groups[assignedVal].push(p);
          } else {
             groups["Unassigned"].push(p);
          }
      });
      return groups;
  }, [groupBy, rawData, assignments]);

  // --- SORT DATA FOR LIST RENDER (Unassigned at the top) ---
  const sortedListData = useMemo(() => {
      return [...rawData].sort((a, b) => {
          const aAssigned = assignments[a.id] || "Unassigned";
          const bAssigned = assignments[b.id] || "Unassigned";
          if (aAssigned === "Unassigned" && bAssigned !== "Unassigned") return -1;
          if (aAssigned !== "Unassigned" && bAssigned === "Unassigned") return 1;
          return a.name.localeCompare(b.name);
      });
  }, [rawData, assignments]);

  const currentTeam = selectedCommittee ? groupedData[selectedCommittee] : [];

  return (
    <div className="min-h-screen bg-zinc-950 text-white font-sans p-4 md:p-6 flex flex-col overflow-y-auto custom-scrollbar">
        {/* HEADER */}
        <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-4 mb-6 print:hidden">
            <div>
                <h1 className="text-2xl font-black uppercase italic tracking-tighter text-white">Committee Manager</h1>
                <p className="text-zinc-500 text-xs font-medium">
                    {rawData.length} Volunteers • Cast Size: <span className="text-blue-400 font-bold">{students.length}</span>
                </p>
            </div>
            <div className="flex flex-wrap gap-2 w-full xl:w-auto items-center">
                
                {/* VIEW TOGGLE */}
                <div className="bg-zinc-900 border border-white/10 rounded-lg p-1 flex shadow-inner mr-2">
                    <button onClick={() => setViewMode('board')} className={`px-3 py-1.5 rounded text-xs font-bold uppercase transition-all flex items-center gap-2 ${viewMode === 'board' ? 'bg-zinc-700 text-white shadow-lg' : 'text-zinc-500 hover:text-white'}`}><LayoutGrid size={14}/> Board</button>
                    <button onClick={() => setViewMode('list')} className={`px-3 py-1.5 rounded text-xs font-bold uppercase transition-all flex items-center gap-2 ${viewMode === 'list' ? 'bg-zinc-700 text-white shadow-lg' : 'text-zinc-500 hover:text-white'}`}><LayoutList size={14}/> List</button>
                </div>

                {/* PHASE TOGGLE */}
                <div className="bg-zinc-900 border border-white/10 rounded-lg p-1 flex shadow-inner mr-2">
                    <button onClick={() => setGroupBy('Pre-Show')} className={`px-4 py-1.5 rounded text-xs font-bold uppercase transition-all ${groupBy === 'Pre-Show' ? 'bg-blue-600 text-white shadow-lg' : 'text-zinc-500 hover:text-white'}`}>Pre-Show</button>
                    <button onClick={() => setGroupBy('Show Week')} className={`px-4 py-1.5 rounded text-xs font-bold uppercase transition-all ${groupBy === 'Show Week' ? 'bg-blue-600 text-white shadow-lg' : 'text-zinc-500 hover:text-white'}`}>Show Week</button>
                </div>
                
                <button 
                    onClick={handleSave} 
                    disabled={!hasChanges || isPending}
                    className={`px-4 py-1.5 rounded-lg text-xs font-black uppercase flex items-center gap-2 transition-all border ${
                        hasChanges 
                            ? 'bg-emerald-600 text-white border-emerald-500 hover:bg-emerald-500 shadow-[0_0_15px_rgba(16,185,129,0.4)]' 
                            : 'bg-zinc-900 text-zinc-500 border-white/10 cursor-not-allowed'
                    }`}
                >
                    {isPending ? <Loader2 size={14} className="animate-spin" /> : <Save size={14}/>}
                    {hasChanges ? "Save Changes" : "Saved"}
                </button>

                <button onClick={() => setShowSettings(true)} className="bg-purple-600/10 hover:bg-purple-600/20 text-purple-400 border border-purple-600/50 px-4 py-1.5 rounded-lg text-xs font-black uppercase flex items-center gap-2 transition-all"><Settings2 size={14}/> Limits</button>
                <button onClick={handleAutoBalance} className="bg-blue-600/10 hover:bg-blue-600/20 text-blue-500 border border-blue-600/50 px-4 py-1.5 rounded-lg text-xs font-black uppercase flex items-center gap-2 transition-all"><Wand2 size={14}/> Balance</button>
                <button onClick={handleClearBoard} className="bg-red-500/10 hover:bg-red-500/20 text-red-500 border border-red-500/50 px-4 py-1.5 rounded-lg text-xs font-black uppercase flex items-center gap-2 transition-all"><RotateCcw size={14}/> Revert</button>
                <button onClick={() => window.print()} className="bg-white text-black hover:bg-zinc-200 px-4 py-1.5 rounded-lg text-xs font-black uppercase flex items-center gap-2 transition-all shadow-xl"><Printer size={14}/> Print</button>
            </div>
        </div>

        {/* --- CONDITIONAL RENDER: BOARD OR LIST --- */}
        {viewMode === 'board' ? (
            <div className="columns-1 md:columns-2 xl:columns-3 gap-6 space-y-6 print:block print:columns-2 pb-24">
                {Object.keys(groupedData).map(committee => {
                    const team = groupedData[committee];
                    const target = getCommitteeTarget(committee);
                    const isUnderstaffed = team.length < target;
                    const isOverstaffed = team.length > target;
                    
                    let statusColor = 'text-emerald-500';
                    if (isUnderstaffed) statusColor = 'text-amber-500';
                    if (isOverstaffed) statusColor = 'text-rose-500';
                    if (committee === "Unassigned") statusColor = 'text-emerald-500';
                    
                    const chairName = team.find(p => chairs[p.id])?.name;
                    
                    return (
                        <div key={committee} className={`break-inside-avoid mb-6 rounded-2xl overflow-hidden border shadow-2xl border-white/10 bg-zinc-900/40 print:border-black print:bg-white print:mb-8`}>
                            <div onClick={() => setSelectedCommittee(committee)} className="p-4 border-b border-white/5 flex justify-between items-center cursor-pointer hover:bg-white/5 transition-colors">
                                <div>
                                    <h3 className={`font-black uppercase text-sm tracking-widest ${statusColor} print:text-black`}>{committee}</h3>
                                    {chairName && <p className="text-[9px] text-amber-400 font-bold mt-0.5 flex items-center gap-1 drop-shadow-[0_0_5px_rgba(251,191,36,0.3)]"><Crown size={10}/> {chairName}</p>}
                                </div>
                                {committee !== "Unassigned" ? (
                                    <span className={`text-[10px] font-bold px-2 py-1 rounded-md border border-white/10 bg-zinc-950 text-zinc-400`}>{team.length} / {target}</span>
                                ) : (
                                    <span className={`text-[10px] font-bold px-2 py-1 rounded-md border border-white/10 bg-zinc-950 ${team.length > 0 ? 'text-amber-500 border-amber-500/30' : 'text-zinc-500'}`}>{team.length} Remaining</span>
                                )}
                            </div>
                            
                            <div className="p-3 space-y-1">
                                {team.length === 0 && <div className="text-xs text-zinc-600 italic py-2 text-center">Empty</div>}
                                {team.slice(0, 5).map((p: Volunteer) => {
                                    const prefs = getPrefs(p);
                                    return (
                                        <div key={p.id} className="text-xs text-zinc-400 flex justify-between py-0.5 hover:text-white transition-colors">
                                            <span>{p.name}</span>
                                            {prefs.first === committee && <CheckCircle2 size={12} className="text-emerald-500"/>}
                                        </div>
                                    )
                                })}
                                {team.length > 5 && <div className="text-[10px] font-bold text-zinc-600 uppercase tracking-widest pt-2 border-t border-white/5 mt-2">+{team.length - 5} more...</div>}
                            </div>
                        </div>
                    );
                })}
            </div>
        ) : (
            <div className="pb-24 animate-in fade-in duration-300">
                <div className="bg-zinc-900/40 border border-white/10 rounded-2xl overflow-hidden shadow-2xl">
                    <div className="overflow-x-auto custom-scrollbar">
                        <table className="w-full text-left border-collapse table-fixed">
                            <thead className="bg-zinc-950 border-b border-white/10 text-zinc-500 text-[10px] uppercase tracking-widest">
                                <tr>
                                    <th className="px-3 py-2 font-black w-1/4">Volunteer</th>
                                    <th className="px-3 py-2 font-black w-1/5">Student</th>
                                    <th className="px-3 py-2 font-black w-32">1st Choice</th>
                                    <th className="px-3 py-2 font-black w-32">2nd Choice</th>
                                    <th className="px-3 py-2 font-black w-32">3rd Choice</th>
                                    <th className="px-3 py-2 font-black w-48">Assignment</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-white/5 text-sm">
                                {sortedListData.map(p => {
                                    const prefs = getPrefs(p);
                                    const currentAssigned = assignments[p.id] || "Unassigned";
                                    const isUnassigned = currentAssigned === "Unassigned";
                                    const isChair = chairs[p.id];
                                    
                                    return (
                                        <tr key={p.id} className={`hover:bg-white/5 transition-colors ${isUnassigned ? 'bg-amber-900/5' : isChair ? 'bg-amber-500/10' : ''}`}>
                                            <td className="px-3 py-2 font-bold text-zinc-200 text-xs leading-tight">
                                                <div className="flex items-center gap-2">
                                                    {p.name}
                                                    {isChair && <Crown size={14} className="text-amber-400 drop-shadow-[0_0_5px_rgba(251,191,36,0.5)]" />}
                                                </div>
                                            </td>
                                            <td className="px-3 py-2 text-zinc-400 text-[10px] leading-tight pr-4">{p.studentName || "-"}</td>
                                            
                                            <td className="px-3 py-2 whitespace-nowrap">
                                                <div className={`flex items-center gap-1.5 text-xs ${currentAssigned === prefs.first ? 'text-emerald-400 font-bold' : 'text-zinc-500'}`}>
                                                    {prefs.first || "-"} {currentAssigned === prefs.first && <CheckCircle2 size={12}/>}
                                                </div>
                                            </td>
                                            <td className="px-3 py-2 whitespace-nowrap">
                                                <div className={`flex items-center gap-1.5 text-xs ${currentAssigned === prefs.second ? 'text-emerald-400 font-bold' : 'text-zinc-500'}`}>
                                                    {prefs.second || "-"} {currentAssigned === prefs.second && <CheckCircle2 size={12}/>}
                                                </div>
                                            </td>
                                            <td className="px-3 py-2 whitespace-nowrap">
                                                <div className={`flex items-center gap-1.5 text-xs ${currentAssigned === prefs.third ? 'text-emerald-400 font-bold' : 'text-zinc-500'}`}>
                                                    {prefs.third || "-"} {currentAssigned === prefs.third && <CheckCircle2 size={12}/>}
                                                </div>
                                            </td>
                                            
                                            <td className="px-3 py-2">
                                                <div className="flex items-center gap-2">
                                                    <select 
                                                        className={`w-full bg-zinc-950 border rounded px-2 py-1.5 text-xs font-bold outline-none transition-colors shadow-sm cursor-pointer ${isUnassigned ? 'border-amber-500/50 text-amber-500 focus:border-amber-400 focus:ring-1 focus:ring-amber-400' : isChair ? 'border-amber-500 text-amber-400' : 'border-zinc-700 text-zinc-300 focus:border-blue-500 focus:ring-1 focus:ring-blue-500'}`}
                                                        value={currentAssigned}
                                                        onChange={(e) => {
                                                            setAssignments(prev => ({...prev, [p.id]: e.target.value}));
                                                            if (isChair) {
                                                                setChairs(prev => ({...prev, [p.id]: false}));
                                                            }
                                                        }}
                                                    >
                                                        {COMMITTEES[groupBy].map((c: string) => <option key={c} value={c}>{c}</option>)}
                                                        <option value="Unassigned">Unassigned</option>
                                                    </select>

                                                    {!isUnassigned && currentAssigned !== "Show Chair" && (
                                                        <button 
                                                            onClick={() => setChairs(prev => ({...prev, [p.id]: !prev[p.id]}))}
                                                            className={`p-1.5 rounded transition-all flex-shrink-0 ${isChair ? 'bg-amber-500 text-white shadow-[0_0_10px_rgba(251,191,36,0.3)]' : 'bg-zinc-800 text-zinc-500 hover:text-amber-400 hover:bg-zinc-700'}`}
                                                            title={isChair ? "Remove as Chair" : "Make Chair"}
                                                        >
                                                            <Crown size={14} />
                                                        </button>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    )
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        )}

        {/* --- LIMITS SETTINGS MODAL --- */}
        {showSettings && (
            <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={() => setShowSettings(false)} />
                <div className="relative w-full max-w-md bg-zinc-900 border border-white/10 shadow-2xl rounded-2xl flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                    <div className="p-6 border-b border-white/10 flex justify-between items-start bg-zinc-950">
                        <div>
                            <h2 className="text-xl font-black uppercase italic tracking-tighter text-white">Adjust Targets</h2>
                            <p className="text-zinc-500 text-xs font-bold uppercase tracking-widest mt-1">{groupBy} Phase</p>
                        </div>
                        <button onClick={() => setShowSettings(false)} className="p-2 text-zinc-500 hover:text-white hover:bg-white/10 rounded-full transition-colors"><X size={18}/></button>
                    </div>

                    <div className="p-6 overflow-y-auto max-h-[60vh] custom-scrollbar bg-zinc-950/50 space-y-4">
                        <div className="bg-blue-900/20 border border-blue-500/30 rounded-lg p-4 mb-4">
                            <div className="flex justify-between items-center">
                                <div>
                                    <h4 className="text-sm font-bold text-blue-400">Smart Distribution</h4>
                                    <p className="text-xs text-blue-300/70 mt-1 pr-4">Automatically scales targets to match your {rawData.length} volunteers.</p>
                                </div>
                                <button onClick={handleSuggestLimits} className="shrink-0 bg-blue-600 hover:bg-blue-500 text-white px-3 py-2 rounded shadow-lg text-xs font-black uppercase flex items-center gap-2 transition-colors"><Lightbulb size={14}/> Suggest</button>
                            </div>
                        </div>

                        <div className="space-y-2">
                            {COMMITTEES[groupBy].map(c => {
                                const key = `${groupBy}-${c}`;
                                return (
                                    <div key={c} className="flex justify-between items-center p-3 bg-zinc-900 border border-white/5 rounded-lg hover:border-white/10 transition-colors">
                                        <span className="text-sm font-bold text-zinc-300">{c}</span>
                                        <div className="flex items-center gap-3">
                                            <span className="text-xs text-zinc-600 font-medium">Target:</span>
                                            <input 
                                                type="number" 
                                                min="0"
                                                value={targets[key] || 0}
                                                onChange={(e) => setTargets(prev => ({...prev, [key]: parseInt(e.target.value) || 0}))}
                                                className="w-16 bg-zinc-950 border border-zinc-700 rounded px-2 py-1 text-center text-sm font-bold text-white outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all"
                                            />
                                        </div>
                                    </div>
                                )
                            })}
                        </div>
                    </div>
                    <div className="p-4 border-t border-white/10 bg-zinc-950 flex justify-end">
                        <button onClick={() => setShowSettings(false)} className="bg-white text-black px-6 py-2 rounded-lg text-sm font-black uppercase hover:bg-zinc-200 transition-colors shadow-xl">Done</button>
                    </div>
                </div>
            </div>
        )}

        {/* --- ASSIGNMENT DRAWER (BOARD VIEW ONLY) --- */}
        {selectedCommittee && selectedCommittee !== "Unassigned" && viewMode === 'board' && (
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
                         <div className="bg-zinc-950 border border-white/5 rounded-xl divide-y divide-white/5">
                            {currentTeam.map((p: Volunteer) => {
                                const prefs = getPrefs(p);
                                const isChair = chairs[p.id];

                                return (
                                    <div key={p.id} className={`p-3 hover:bg-white/5 transition-colors group flex justify-between items-center ${isChair ? 'bg-amber-500/10' : ''}`}>
                                        <div>
                                            <div className="text-sm font-bold text-zinc-200 flex items-center gap-2">
                                                {p.name}
                                                {isChair && <Crown size={14} className="text-amber-400 drop-shadow-[0_0_5px_rgba(251,191,36,0.5)]" />}
                                            </div>
                                            <div className="text-[10px] text-zinc-500">{p.studentName && `Parent of ${p.studentName}`}</div>
                                        </div>
                                        <div className="flex items-center gap-4">
                                            <div className="flex gap-2">
                                                <PreferenceBadge rank="1" value={prefs.first} current={selectedCommittee}/>
                                                <PreferenceBadge rank="2" value={prefs.second} current={selectedCommittee}/>
                                            </div>
                                            <select 
                                                className={`bg-zinc-900 border rounded px-2 py-1 text-[10px] outline-none ${isChair ? 'border-amber-500 text-amber-400' : 'border-zinc-800 text-zinc-400 focus:text-white'}`}
                                                value={assignments[p.id] || "Unassigned"}
                                                onChange={(e) => {
                                                    setAssignments(prev => ({...prev, [p.id]: e.target.value}));
                                                    if (isChair) {
                                                        setChairs(prev => ({...prev, [p.id]: false}));
                                                    }
                                                }}
                                            >
                                                {COMMITTEES[groupBy].map((c: string) => <option key={c} value={c}>{c}</option>)}
                                                <option value="Unassigned">Unassigned</option>
                                            </select>
                                            
                                            {selectedCommittee !== "Show Chair" && (
                                                <button 
                                                    onClick={() => setChairs(prev => ({...prev, [p.id]: !prev[p.id]}))}
                                                    className={`p-1.5 rounded transition-all ${isChair ? 'bg-amber-500 text-white' : 'bg-zinc-800 text-zinc-500 hover:text-amber-400'}`}
                                                    title={isChair ? "Remove as Chair" : "Make Chair"}
                                                >
                                                    <Crown size={14} />
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                )
                            })}
                            {currentTeam.length === 0 && (
                                <div className="p-8 text-center text-zinc-600 text-sm italic">
                                    No volunteers assigned to {selectedCommittee} yet.
                                </div>
                            )}
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