/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import React, { useState, useEffect, useMemo } from 'react';
import { 
  Printer, Loader2, Crown, Phone, Mail, Baby, 
  Wand2, RotateCcw, X, ExternalLink,
  MessageSquare, Hash, Image as ImageIcon, FileText, Plus,
  Trash2, UserPlus, Sliders, Info, CheckCircle2
} from 'lucide-react';
import { getCommitteePreferences, getAuditionSlots } from '@/app/lib/baserow'; 

// --- CONFIG ---
const COMMITTEES = {
    'Pre-Show': ["Publicity", "Sets", "Set Dressing", "Raffles", "Green Room", "Costumes", "Props", "Makeup", "Hair", "Tech"],
    'Show Week': ["Raffles", "Green Room", "Costumes", "Props", "Makeup", "Hair", "Tech", "Ninjas/Set Movers", "Box Office", "Concessions", "Security"]
};

// --- 🧠 STAFFING RULES (Industry Standards) ---
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

// Mock Resources
const MOCK_RESOURCES: Record<string, any> = {
    Costumes: { 
        slack: "#", pinterest: "#", drive: "#", status: "Yellow",
        reports: [{ date: "Jan 24", author: "Jessica Taylor", text: "Measurements complete. Need budget.", status: "Yellow" }]
    },
    Sets: { 
        slack: "#", pinterest: null, drive: "#", status: "Green",
        reports: [{ date: "Jan 24", author: "Mike Miller", text: "Lumber purchased.", status: "Green" }]
    }
};

export default function CommitteeDashboard({ activeId }: { activeId: number }) {
  const [rawData, setRawData] = useState<any[]>([]);
  const [students, setStudents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Assignments: { "pre-101": "Sets", "show-101": "Tech" }
  const [assignments, setAssignments] = useState<Record<string, string>>({});
  const [history, setHistory] = useState<Record<string, string>>({}); 
  
  // Leadership
  const [leadership, setLeadership] = useState<Record<string, { chair: number | null, coChair: number | null }>>({});

  // Settings & View State
  const [groupBy, setGroupBy] = useState<'Pre-Show' | 'Show Week'>('Pre-Show');
  const [selectedCommittee, setSelectedCommittee] = useState<string | null>(null);
  const [rules, setRules] = useState(DEFAULT_RULES);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  // --- HELPER: Baserow Data Extraction ---
  const safeLinkName = (field: any, fallback: string) => {
      if (!field) return fallback;
      if (Array.isArray(field) && field.length > 0) return field[0].value;
      if (typeof field === 'string') return field;
      return fallback;
  };

  const safeLinkId = (field: any) => {
      if (Array.isArray(field) && field.length > 0) return field[0].id;
      return null;
  };

  // --- 1. LOAD DATA ---
  useEffect(() => {
    async function loadData() {
        try {
            const [prefData, studentData] = await Promise.all([
                getCommitteePreferences(activeId), 
                getAuditionSlots(activeId)
            ]);
            
            const processed = prefData.map((p: any) => {
                const linkId = safeLinkId(p["Student ID"]);
                const pName = safeLinkName(p["Parent Name"], p["Full Name"] || "Unknown Volunteer");

                return {
                    ...p,
                    id: p.id,
                    preShow1: p["Pre-Show 1st"]?.value,
                    preShow2: p["Pre-Show 2nd"]?.value,
                    preShow3: p["Pre-Show 3rd"]?.value,
                    showWeek1: p["Show Week 1st"]?.value,
                    showWeek2: p["Show Week 2nd"]?.value,
                    showWeek3: p["Show Week 3rd"]?.value,
                    chairInterests: p["Chair Interest"]?.map((c: any) => c.value) || [],
                    studentIdLink: linkId,
                    parentName: pName, 
                    email: p["Email"] || "",
                    phone: p["Phone"] || "",
                    notes: p["Notes/Constraints"] || "",
                    isParent: !!linkId,
                };
            });

            // Initial Assign based on 1st Choice
            const initialAssignments: Record<string, string> = {};
            processed.forEach((p: any) => {
                 if (p.preShow1) initialAssignments[`pre-${p.id}`] = p.preShow1;
                 if (p.showWeek1) initialAssignments[`show-${p.id}`] = p.showWeek1;
            });

            setRawData(processed);
            setStudents(studentData);
            setAssignments(initialAssignments);
            setHistory(initialAssignments);
        } catch (error) {
            console.error("Failed to load dashboard:", error);
        } finally {
            setLoading(false);
        }
    }
    loadData();
  }, [activeId]);

  // --- HELPER: CALCULATE TARGETS ---
  const getCommitteeTarget = (committeeName: string) => {
      const castSize = students.length || 40; 
      const rule = rules[committeeName] || rules["default"];
      
      if (rule.type === 'fixed') return rule.val;
      
      // Ratio Logic
      let calculated = Math.ceil(castSize / rule.val);
      if (rule.min && calculated < rule.min) calculated = rule.min;
      return calculated;
  };

  const updateRuleValue = (key: string, newVal: number) => {
      setRules(prev => ({
          ...prev,
          [key]: { ...prev[key], val: newVal }
      }));
  };

  // --- ACTIONS ---

  const handleClearBoard = () => {
      if(!confirm(`Are you sure you want to clear ALL assignments for ${groupBy}?`)) return;
      const newAssignments = { ...assignments };
      rawData.forEach(p => {
          const key = groupBy === 'Pre-Show' ? `pre-${p.id}` : `show-${p.id}`;
          delete newAssignments[key];
      });
      setAssignments(newAssignments);
  };

  // --- 🧠 SMART AUTO-BALANCE ---
  const handleAutoBalance = () => {
      if(!confirm(`Auto-Balance ${groupBy}?\n\nLogic:\n1. Find understaffed committees (based on specific rules).\n2. Move volunteers from overstaffed teams.\n3. Only move if it matches their 2nd or 3rd choice.`)) return;
      
      const newAssignments = { ...assignments };
      // @ts-ignore
      const currentCommittees = COMMITTEES[groupBy];
      let movedCount = 0;

      const getCount = (comm: string) => {
          return rawData.filter(p => {
              const key = groupBy === 'Pre-Show' ? `pre-${p.id}` : `show-${p.id}`;
              return newAssignments[key] === comm;
          }).length;
      };

      currentCommittees.forEach((targetComm: string) => {
          const targetLimit = getCommitteeTarget(targetComm); // Uses dynamic rules
          
          if (getCount(targetComm) < targetLimit) {
               rawData.forEach(p => {
                   if (getCount(targetComm) >= targetLimit) return; // Stop if filled

                   const key = groupBy === 'Pre-Show' ? `pre-${p.id}` : `show-${p.id}`;
                   const currentComm = newAssignments[key];
                   const currentLimit = getCommitteeTarget(currentComm);
                   
                   // Only steal from "Rich" committees
                   if (currentComm && getCount(currentComm) > currentLimit) {
                       const c2 = groupBy === 'Pre-Show' ? p.preShow2 : p.showWeek2;
                       const c3 = groupBy === 'Pre-Show' ? p.preShow3 : p.showWeek3;
                       
                       if (c2 === targetComm || c3 === targetComm) {
                           newAssignments[key] = targetComm;
                           movedCount++;
                       }
                   }
               });
          }
      });
      
      setAssignments(newAssignments);
      alert(`Auto-Balance Complete: Optimized ${movedCount} assignments.`);
  };

  const handleSetLeader = (committee: string, role: 'chair' | 'coChair', personId: number | null) => {
      const key = `${groupBy}:${committee}`;
      setLeadership(prev => ({
          ...prev,
          [key]: {
              ...(prev[key] || { chair: null, coChair: null }),
              [role]: personId
          }
      }));
  };

  // Group Logic
  const groupedData = useMemo(() => {
      const groups: Record<string, any[]> = {};
      // @ts-ignore
      COMMITTEES[groupBy].forEach(c => groups[c] = []);
      groups["Unassigned"] = [];

      rawData.forEach(p => {
          const key = groupBy === 'Pre-Show' ? `pre-${p.id}` : `show-${p.id}`;
          const assignedVal = assignments[key];
          if (assignedVal && groups[assignedVal]) groups[assignedVal].push(p);
          else groups["Unassigned"].push(p);
      });
      return groups;
  }, [rawData, assignments, groupBy]);

  const currentTeam = selectedCommittee ? groupedData[selectedCommittee] : [];
  const leadershipKey = `${groupBy}:${selectedCommittee}`;
  const currentLeaders = leadership[leadershipKey] || { chair: null, coChair: null };

  if (loading) return <div className="h-screen bg-zinc-950 flex flex-col items-center justify-center text-white"><Loader2 className="animate-spin text-blue-500 mr-2"/> Loading...</div>;

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
                
                <button onClick={() => setIsSettingsOpen(true)} className="bg-zinc-800 hover:bg-zinc-700 text-zinc-300 border border-white/5 px-4 py-2 rounded-lg text-xs font-bold uppercase flex items-center gap-2 transition-all">
                    <Sliders size={14}/> Staffing Rules
                </button>

                <button onClick={handleAutoBalance} className="bg-emerald-600/10 hover:bg-emerald-600/20 text-emerald-500 border border-emerald-600/50 px-4 py-2 rounded-lg text-xs font-black uppercase flex items-center gap-2 transition-all">
                    <Wand2 size={14}/> Auto-Balance
                </button>

                <button onClick={handleClearBoard} className="bg-red-500/10 hover:bg-red-500/20 text-red-500 border border-red-500/50 px-4 py-2 rounded-lg text-xs font-black uppercase flex items-center gap-2 transition-all">
                    <Trash2 size={14}/> Clear Board
                </button>

                <button onClick={() => setAssignments(history)} className="bg-zinc-800 hover:bg-zinc-700 text-zinc-400 px-3 py-2 rounded-lg transition-all" title="Undo All Changes">
                    <RotateCcw size={14}/>
                </button>
                <button onClick={() => window.print()} className="bg-white text-black hover:bg-zinc-200 px-4 py-2 rounded-lg text-xs font-black uppercase flex items-center gap-2 transition-all shadow-xl">
                    <Printer size={14}/> Print
                </button>
            </div>
        </div>

        {/* BOARD GRID */}
        <div className="columns-1 md:columns-2 xl:columns-3 gap-6 space-y-6 print:block print:columns-2">
            {Object.keys(groupedData).map(committee => {
                const team = groupedData[committee];
                const target = getCommitteeTarget(committee);
                
                const isUnderstaffed = team.length < target;
                const isOverstaffed = team.length > target + 2; 
                const statusColor = isUnderstaffed ? 'text-amber-500' : isOverstaffed ? 'text-blue-400' : 'text-emerald-500';
                const statusBorder = isUnderstaffed ? 'border-amber-500/30 bg-amber-900/10' : 'border-white/10 bg-zinc-900/40';

                const lKey = `${groupBy}:${committee}`;
                const leaders = leadership[lKey] || { chair: null, coChair: null };
                const chairName = rawData.find(p => p.id === leaders.chair)?.parentName;

                if (team.length === 0 && committee !== "Unassigned") return null;

                return (
                    <div key={committee} className={`break-inside-avoid mb-6 rounded-2xl overflow-hidden border shadow-2xl ${statusBorder} print:border-black print:bg-white print:mb-8`}>
                        <div 
                            onClick={() => setSelectedCommittee(committee)}
                            className="p-4 border-b border-white/5 flex justify-between items-center cursor-pointer hover:bg-white/5 transition-colors"
                        >
                            <div>
                                <h3 className={`font-black uppercase text-sm tracking-widest ${statusColor} print:text-black`}>{committee}</h3>
                                {chairName && <p className="text-[9px] text-blue-400 font-bold mt-0.5 flex items-center gap-1"><Crown size={10}/> {chairName}</p>}
                            </div>
                            <span className={`text-[10px] font-bold px-2 py-1 rounded-md border border-white/10 bg-zinc-950 text-zinc-400`}>
                                {team.length} / {target}
                            </span>
                        </div>
                        <div className="p-3 space-y-1">
                            {team.slice(0, 3).map((p: any) => (
                                <div key={p.id} className="text-xs text-zinc-400 flex justify-between">
                                    <span>{p.parentName}</span>
                                    {p.chairInterests.some((ci:string) => ci.includes(committee)) && <span className="text-[8px] bg-zinc-800 px-1 rounded text-zinc-500">Wants Chair</span>}
                                </div>
                            ))}
                            {team.length > 3 && <div className="text-[10px] text-zinc-600 italic pt-1">+{team.length - 3} more...</div>}
                        </div>
                    </div>
                );
            })}
        </div>

        {/* --- SETTINGS MODAL --- */}
        {isSettingsOpen && (
            <div className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-sm flex items-center justify-center p-8" onClick={() => setIsSettingsOpen(false)}>
                <div className="bg-zinc-900 border border-white/10 rounded-2xl w-full max-w-lg flex flex-col shadow-2xl overflow-hidden" onClick={e => e.stopPropagation()}>
                    <div className="p-6 border-b border-white/10 flex justify-between items-center bg-zinc-800/50">
                        <div>
                            <h2 className="text-xl font-black uppercase italic tracking-tighter text-white flex items-center gap-2"><Sliders size={18}/> Staffing Logic</h2>
                            <p className="text-xs text-zinc-500 mt-1">Adjust target ratios for {students.length} cast members</p>
                        </div>
                        <button onClick={() => setIsSettingsOpen(false)}><X className="text-zinc-500 hover:text-white"/></button>
                    </div>
                    <div className="flex-1 overflow-y-auto p-6 space-y-4 max-h-[60vh] custom-scrollbar">
                        {/* @ts-ignore */}
                        {COMMITTEES[groupBy].map((c) => {
                            const rule = rules[c] || rules["default"];
                            const currentTarget = getCommitteeTarget(c);
                            
                            return (
                                <div key={c} className="flex items-center justify-between p-3 bg-black/20 rounded-xl border border-white/5">
                                    <div>
                                        <div className="font-bold text-sm text-zinc-200">{c}</div>
                                        <div className="text-[10px] text-zinc-500 flex items-center gap-1 mt-0.5">
                                            <Info size={10}/> {rule.reason}
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <div className="text-right">
                                            <div className="text-lg font-black text-blue-400 leading-none">{currentTarget}</div>
                                            <div className="text-[8px] font-bold text-zinc-600 uppercase">Target</div>
                                        </div>
                                        <div className="flex flex-col gap-1">
                                            <button onClick={() => updateRuleValue(c, rule.val + (rule.type === 'ratio' ? -1 : 1))} className="w-6 h-6 bg-zinc-800 rounded hover:bg-zinc-700 text-xs font-bold flex items-center justify-center">▲</button>
                                            <button onClick={() => updateRuleValue(c, rule.val + (rule.type === 'ratio' ? 1 : -1))} className="w-6 h-6 bg-zinc-800 rounded hover:bg-zinc-700 text-xs font-bold flex items-center justify-center">▼</button>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>
        )}

        {/* --- MISSION CONTROL DRAWER --- */}
        {selectedCommittee && (
            <div className="fixed inset-0 z-50 flex justify-end">
                <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={() => setSelectedCommittee(null)} />
                <aside className="relative w-full max-w-3xl bg-zinc-900 border-l border-white/10 shadow-2xl flex flex-col animate-in slide-in-from-right duration-300">
                    
                    {/* DRAWER HEADER */}
                    <div className="p-6 border-b border-white/10 flex justify-between items-start bg-zinc-950">
                        <div>
                            <h2 className="text-3xl font-black uppercase italic tracking-tighter text-white">{selectedCommittee}</h2>
                            <p className="text-zinc-500 text-xs font-bold uppercase tracking-widest mt-1">
                                {groupBy} • {currentTeam.length} Members • Target: {getCommitteeTarget(selectedCommittee)}
                            </p>
                        </div>
                        <button onClick={() => setSelectedCommittee(null)} className="p-2 hover:bg-white/10 rounded-full"><X/></button>
                    </div>

                    <div className="flex-1 overflow-y-auto custom-scrollbar p-6 space-y-8">
                        
                        {/* 1. LEADERSHIP CONTROLS */}
                        <section className="bg-zinc-800/50 p-4 rounded-xl border border-white/5">
                            <h3 className="text-xs font-black uppercase text-zinc-500 tracking-widest mb-3 flex items-center gap-2">
                                <Crown size={14} className="text-amber-500"/> Leadership
                            </h3>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="text-[10px] uppercase font-bold text-zinc-400 mb-1 block">Committee Chair</label>
                                    <select 
                                        className="w-full bg-zinc-900 border border-white/10 rounded-lg p-2 text-xs text-white outline-none focus:border-blue-500"
                                        value={currentLeaders.chair || ""}
                                        onChange={(e) => handleSetLeader(selectedCommittee, 'chair', e.target.value ? parseInt(e.target.value) : null)}
                                    >
                                        <option value="">-- Select Chair --</option>
                                        {currentTeam.map((p: any) => (
                                            <option key={p.id} value={p.id}>
                                                {p.parentName} {p.chairInterests.some((ci:string) => ci.includes(selectedCommittee)) ? "★" : ""}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label className="text-[10px] uppercase font-bold text-zinc-400 mb-1 block">Co-Chair</label>
                                    <select 
                                        className="w-full bg-zinc-900 border border-white/10 rounded-lg p-2 text-xs text-white outline-none focus:border-blue-500"
                                        value={currentLeaders.coChair || ""}
                                        onChange={(e) => handleSetLeader(selectedCommittee, 'coChair', e.target.value ? parseInt(e.target.value) : null)}
                                    >
                                        <option value="">-- Select Co-Chair --</option>
                                        {currentTeam.map((p: any) => (
                                            <option key={p.id} value={p.id}>{p.parentName}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>
                        </section>

                        {/* 2. ROSTER WITH "X-RAY" PREFERENCES */}
                        <section>
                            <div className="flex justify-between items-end mb-3">
                                <h3 className="text-xs font-black uppercase text-zinc-500 tracking-widest flex items-center gap-2">
                                    <Baby size={14}/> Team Roster
                                </h3>
                                <button className="text-[10px] font-bold text-blue-400 flex items-center gap-1 hover:text-white"><UserPlus size={12}/> Add Person</button>
                            </div>
                            
                            <div className="bg-zinc-950 border border-white/5 rounded-xl divide-y divide-white/5">
                                {currentTeam.map((p: any) => {
                                    const c1 = groupBy === 'Pre-Show' ? p.preShow1 : p.showWeek1;
                                    const c2 = groupBy === 'Pre-Show' ? p.preShow2 : p.showWeek2;
                                    const c3 = groupBy === 'Pre-Show' ? p.preShow3 : p.showWeek3;
                                    
                                    return (
                                        <div key={p.id} className="p-3 hover:bg-white/5 transition-colors group">
                                            <div className="flex justify-between items-start mb-2">
                                                <div>
                                                    <div className="text-sm font-bold text-zinc-200 flex items-center gap-2">
                                                        {p.parentName}
                                                        {currentLeaders.chair === p.id && <Crown size={12} className="text-amber-500 fill-amber-500/20"/>}
                                                        {currentLeaders.coChair === p.id && <Crown size={12} className="text-zinc-400"/>}
                                                    </div>
                                                    <div className="text-[10px] text-zinc-500">
                                                        {p.email}
                                                    </div>
                                                </div>
                                                
                                                <select 
                                                    className="bg-zinc-900 border border-zinc-800 rounded px-2 py-1 text-[10px] text-zinc-400 outline-none focus:text-white focus:border-blue-500"
                                                    value={selectedCommittee}
                                                    onChange={(e) => {
                                                        const newAssignments = { ...assignments };
                                                        const key = groupBy === 'Pre-Show' ? `pre-${p.id}` : `show-${p.id}`;
                                                        newAssignments[key] = e.target.value;
                                                        setAssignments(newAssignments);
                                                    }}
                                                >
                                                    {/* @ts-ignore */}
                                                    {COMMITTEES[groupBy].map((c: string) => <option key={c} value={c}>{c}</option>)}
                                                    <option value="Unassigned">Unassigned</option>
                                                </select>
                                            </div>

                                            <div className="flex gap-2 mt-2 pt-2 border-t border-white/5 opacity-50 group-hover:opacity-100 transition-opacity">
                                                <PreferenceBadge rank="1" value={c1} current={selectedCommittee} />
                                                <PreferenceBadge rank="2" value={c2} current={selectedCommittee} />
                                                <PreferenceBadge rank="3" value={c3} current={selectedCommittee} />
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </section>

                        <section>
                            <h3 className="text-xs font-black uppercase text-zinc-500 tracking-widest mb-3 flex items-center gap-2">
                                <ExternalLink size={14}/> Resources
                            </h3>
                            <div className="grid grid-cols-3 gap-3">
                                <ResourceButton href={MOCK_RESOURCES[selectedCommittee]?.slack} icon={<Hash size={18}/>} label="Slack" color="hover:border-purple-500 hover:text-purple-400"/>
                                <ResourceButton href={MOCK_RESOURCES[selectedCommittee]?.pinterest} icon={<ImageIcon size={18}/>} label="Pinterest" color="hover:border-red-500 hover:text-red-400"/>
                                <ResourceButton href={MOCK_RESOURCES[selectedCommittee]?.drive} icon={<FileText size={18}/>} label="Drive" color="hover:border-blue-500 hover:text-blue-400"/>
                            </div>
                        </section>

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
        <div className={`flex items-center gap-1.5 px-2 py-1 rounded border text-[9px] font-bold uppercase flex-1 justify-center ${isMatch ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' : 'bg-zinc-900 border-zinc-800 text-zinc-600'}`}>
            <span className="opacity-50">{rank}:</span>
            <span className="truncate max-w-[80px]">{value || "-"}</span>
            {isMatch && <CheckCircle2 size={8}/>}
        </div>
    )
}

function ResourceButton({ href, icon, label, color }: any) {
    if (!href) return (
        <div className="flex flex-col items-center justify-center p-4 bg-zinc-950 border border-white/5 rounded-xl opacity-50 cursor-not-allowed">
            <div className="text-zinc-600 mb-2">{icon}</div>
            <span className="text-[10px] font-bold uppercase text-zinc-600">{label}</span>
        </div>
    );
    return (
        <a href={href} target="_blank" rel="noopener noreferrer" className={`flex flex-col items-center justify-center p-4 bg-zinc-950 border border-white/5 rounded-xl transition-all group ${color}`}>
            <div className="text-zinc-400 group-hover:text-current mb-2 transition-colors">{icon}</div>
            <span className="text-[10px] font-bold uppercase text-zinc-500 group-hover:text-current transition-colors">{label}</span>
        </a>
    )
}