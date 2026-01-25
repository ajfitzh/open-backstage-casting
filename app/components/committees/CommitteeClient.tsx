/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import React, { useState, useEffect, useMemo } from 'react';
import { 
  Printer, Loader2, Crown, Phone, Mail, Baby, 
  Wand2, RotateCcw, ChevronDown, ChevronUp, AlertTriangle, AlertCircle 
} from 'lucide-react';
import { getCommitteePreferences, getAuditionSlots } from '@/app/lib/baserow'; 

// --- CONFIG ---
const COMMITTEES = {
    'Pre-Show': [
        "Publicity", "Sets", "Set Dressing", "Raffles", "Green Room", 
        "Costumes", "Props", "Makeup", "Hair", "Tech"
    ],
    'Show Week': [
        "Raffles", "Green Room", "Costumes", "Props", "Makeup", "Hair", 
        "Tech", "Ninjas/Set Movers", "Box Office", "Concessions", "Security"
    ]
};

const MIN_STAFFING = 2; 

export default function CommitteeDashboard({ activeId }: { activeId: number }) {
  const [rawData, setRawData] = useState<any[]>([]);
  const [students, setStudents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [assignments, setAssignments] = useState<Record<string, string>>({});
  const [history, setHistory] = useState<Record<string, string>>({}); 
  const [groupBy, setGroupBy] = useState<'Pre-Show' | 'Show Week'>('Pre-Show');
  const [expandedCard, setExpandedCard] = useState<number | null>(null);

  useEffect(() => {
    async function loadData() {
        try {
            // 1. Pass activeId to fetch only relevant data for the current show
            const [prefData, studentData] = await Promise.all([
                getCommitteePreferences(activeId), 
                getAuditionSlots(activeId)
            ]);
            
            const processed = prefData.map((p: any) => {
                const age = parseInt(p["Age"] || "0"); 
                const chairInterests = p["Chair Interest"]?.map((c: any) => c.value) || [];
                const pName = p["Parent Name"] || p["Parent/Guardian Name"] || p["Full Name"] || p["Name"] || "Unknown Volunteer";

                return {
                    ...p,
                    id: p.id,
                    preShow1: p["Pre-Show 1st"]?.value,
                    preShow2: p["Pre-Show 2nd"]?.value,
                    preShow3: p["Pre-Show 3rd"]?.value,
                    showWeek1: p["Show Week 1st"]?.value,
                    showWeek2: p["Show Week 2nd"]?.value,
                    showWeek3: p["Show Week 3rd"]?.value,
                    chairInterests: chairInterests,
                    studentIdLink: parseInt(p["Student ID"]) || null,
                    parentName: pName, 
                    email: p["Email"] || "",
                    phone: p["Phone"] || "",
                    notes: p["Notes/Constraints"] || "",
                    age: age,
                    isAdult: age >= 18,
                    isParent: !!p["Student ID"],
                    bgStatus: p["Background Check Status"]?.value || "Pending", 
                };
            });

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
  }, [activeId]); // Re-run whenever the show changes!

  // --- HELPERS ---

  const getLinkedStudentName = (linkId: number) => {
      if (!linkId) return null;
      const match = students.find(s => s.id === linkId || s["Student ID"] === linkId);
      if (!match) return null;

      if (Array.isArray(match["Performer"])) {
          return match["Performer"][0]?.value;
      }
      return match["Performer"]?.value || match["Full Name"] || "Unknown Student";
  };

  const handleAutoBalance = () => {
      if(!confirm("Auto-Balance will move volunteers to their 2nd/3rd choices if their 1st choice is overcrowded. Proceed?")) return;
      const newAssignments = { ...assignments };
      const currentCommittees = COMMITTEES[groupBy];
      let movedCount = 0;

      const getCount = (comm: string) => {
          return rawData.filter(p => {
              const key = groupBy === 'Pre-Show' ? `pre-${p.id}` : `show-${p.id}`;
              return newAssignments[key] === comm;
          }).length;
      };

      currentCommittees.forEach(targetComm => {
          if (getCount(targetComm) < MIN_STAFFING) {
               rawData.forEach(p => {
                   const key = groupBy === 'Pre-Show' ? `pre-${p.id}` : `show-${p.id}`;
                   const currentComm = newAssignments[key];
                   if (currentComm && getCount(currentComm) > MIN_STAFFING) {
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

  const groupedData = useMemo(() => {
      const groups: Record<string, any[]> = {};
      COMMITTEES[groupBy].forEach(c => groups[c] = []);
      groups["Unassigned"] = [];

      rawData.forEach(p => {
          const key = groupBy === 'Pre-Show' ? `pre-${p.id}` : `show-${p.id}`;
          const assignedVal = assignments[key];
          if (assignedVal && groups[assignedVal]) {
              groups[assignedVal].push(p);
          } else {
              groups["Unassigned"].push(p);
          }
      });
      return groups;
  }, [rawData, assignments, groupBy]);

  if (loading) return (
    <div className="h-screen bg-zinc-950 flex flex-col items-center justify-center text-white gap-4">
        <Loader2 className="animate-spin text-blue-500" size={40}/>
        <p className="text-zinc-500 font-bold uppercase tracking-widest text-xs animate-pulse">Scanning Volunteer Rosters...</p>
    </div>
  );

  return (
    <div className="min-h-screen bg-zinc-950 text-white font-sans p-4 md:p-6 flex flex-col">
        
        {/* HEADER */}
        <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-4 mb-6 print:hidden">
            <div>
                <h1 className="text-2xl font-black uppercase italic tracking-tighter text-white">Committee Manager</h1>
                <p className="text-zinc-500 text-xs font-medium">{rawData.length} Volunteers for this Production</p>
            </div>
            
            <div className="flex flex-wrap gap-2 w-full xl:w-auto">
                <div className="bg-zinc-900 border border-white/10 rounded-lg p-1 flex shadow-inner">
                    <button onClick={() => setGroupBy('Pre-Show')} className={`px-4 py-2 rounded text-xs font-bold uppercase transition-all ${groupBy === 'Pre-Show' ? 'bg-blue-600 text-white shadow-lg' : 'text-zinc-500 hover:text-white'}`}>Pre-Show</button>
                    <button onClick={() => setGroupBy('Show Week')} className={`px-4 py-2 rounded text-xs font-bold uppercase transition-all ${groupBy === 'Show Week' ? 'bg-blue-600 text-white shadow-lg' : 'text-zinc-500 hover:text-white'}`}>Show Week</button>
                </div>

                <button onClick={handleAutoBalance} className="bg-emerald-600/10 hover:bg-emerald-600/20 text-emerald-500 border border-emerald-600/50 px-4 py-2 rounded-lg text-xs font-black uppercase flex items-center gap-2 transition-all">
                    <Wand2 size={14}/> Auto-Balance
                </button>
                <button onClick={() => setAssignments(history)} className="bg-zinc-800 hover:bg-zinc-700 text-zinc-400 px-3 py-2 rounded-lg transition-all" title="Reset">
                    <RotateCcw size={14}/>
                </button>
                <button onClick={() => window.print()} className="bg-white text-black hover:bg-zinc-200 px-4 py-2 rounded-lg text-xs font-black uppercase flex items-center gap-2 transition-all shadow-xl">
                    <Printer size={14}/> Print Final List
                </button>
            </div>
        </div>

        {/* PRINT HEADER */}
        <div className="hidden print:block mb-8 text-black">
             <h1 className="text-4xl font-black uppercase mb-2">{groupBy} Assignments</h1>
             <p className="text-sm text-gray-600">Confidential Volunteer Roster • Christian Youth Theater</p>
        </div>

        {/* GRID */}
        <div className="columns-1 md:columns-2 xl:columns-3 gap-6 space-y-6 print:block print:columns-2">
            {Object.keys(groupedData).map(committee => {
                const team = groupedData[committee];
                const isStarving = team.length < MIN_STAFFING && committee !== "Unassigned";
                
                if (team.length === 0 && committee !== "Unassigned") return null;

                return (
                    <div key={committee} className={`break-inside-avoid mb-6 rounded-2xl overflow-hidden border shadow-2xl ${isStarving ? 'border-amber-500/30 bg-amber-900/10' : 'border-white/10 bg-zinc-900/40'} print:border-black print:bg-white print:mb-8`}>
                        <div className={`p-4 border-b flex justify-between items-center ${isStarving ? 'border-amber-500/20 bg-amber-500/10' : 'border-white/5 bg-zinc-900'} print:border-b-2 print:border-black print:bg-gray-100`}>
                            <div className="flex items-center gap-3">
                                <h3 className={`font-black uppercase text-sm tracking-widest ${isStarving ? 'text-amber-400' : 'text-zinc-200'} print:text-black`}>{committee}</h3>
                            </div>
                            <span className={`text-[10px] font-black px-3 py-1 rounded-full ${isStarving ? 'bg-amber-500 text-black' : 'bg-zinc-800 text-zinc-400'} print:bg-black print:text-white`}>
                                {team.length}
                            </span>
                        </div>

                        <div className="divide-y divide-white/5 print:divide-gray-300">
                            {team.map((p: any) => {
                                const isExpanded = expandedCard === p.id;
                                const studentName = getLinkedStudentName(p.studentIdLink);
                                const wantsToChair = p.chairInterests.some((ci: string) => ci.includes(committee));
                                const isMoved = (groupBy === 'Pre-Show' ? p.preShow1 : p.showWeek1) !== committee;

                                return (
                                    <div key={p.id} className="group hover:bg-white/5 transition-colors print:hover:bg-transparent">
                                        <div className="p-4 cursor-pointer" onClick={() => setExpandedCard(isExpanded ? null : p.id)}>
                                            <div className="flex justify-between items-center">
                                                <div className="min-w-0">
                                                    <div className="flex items-center gap-2">
                                                        <span className={`font-bold text-sm truncate ${p.isParent ? 'text-zinc-200' : 'text-blue-300'} print:text-black`}>
                                                            {p.parentName}
                                                        </span>
                                                        {wantsToChair && <Crown size={12} className="text-amber-500 fill-amber-500/20 shrink-0" />}
                                                        {isMoved && <span className="text-[8px] border border-zinc-700 text-zinc-500 px-1.5 rounded-sm uppercase tracking-tighter print:border-gray-400">Moved</span>}
                                                    </div>
                                                    
                                                    <div className="mt-1 flex items-center gap-2">
                                                        {p.isParent ? (
                                                            studentName ? (
                                                                <span className="text-[10px] text-zinc-500 flex items-center gap-1.5 font-medium">
                                                                    <Baby size={10} className="text-zinc-600"/> Parent of <span className="text-zinc-400 italic">{studentName}</span>
                                                                </span>
                                                            ) : (
                                                                <span className="text-[10px] text-amber-500/60 font-black uppercase tracking-widest flex items-center gap-1 animate-pulse">
                                                                    <AlertCircle size={10}/> Pending Link
                                                                </span>
                                                            )
                                                        ) : (
                                                            <span className="text-[10px] text-blue-400/60 font-black uppercase tracking-widest">Community Volunteer</span>
                                                        )}
                                                    </div>
                                                </div>
                                                <div className="print:hidden">
                                                    {isExpanded ? <ChevronUp size={14} className="text-zinc-600"/> : <ChevronDown size={16} className="text-zinc-800 group-hover:text-zinc-400 transition-colors"/>}
                                                </div>
                                            </div>
                                        </div>

                                        {isExpanded && (
                                            <div className="px-4 pb-4 bg-zinc-950/50 shadow-inner border-t border-white/5 animate-in slide-in-from-top-2 duration-200 print:hidden">
                                                <div className="flex flex-wrap gap-4 py-3 mb-3 border-b border-white/5">
                                                     <a href={`mailto:${p.email}`} className="flex items-center gap-2 text-xs text-blue-400 hover:text-blue-300 transition-colors font-medium"><Mail size={12}/> {p.email}</a>
                                                     <a href={`tel:${p.phone}`} className="flex items-center gap-2 text-xs text-blue-400 hover:text-blue-300 transition-colors font-medium"><Phone size={12}/> {p.phone}</a>
                                                </div>
                                                
                                                {p.notes && (
                                                    <div className="mb-4 bg-blue-900/10 border border-blue-500/20 p-3 rounded-xl text-[10px] text-blue-200 leading-relaxed italic">
                                                        &quot;{p.notes}&quot;
                                                    </div>
                                                )}

                                                <div className="flex items-center justify-between mb-4">
                                                    <span className="text-[10px] uppercase font-black text-zinc-600 tracking-widest">Override Assignment:</span>
                                                    <select 
                                                        aria-label="Committee Select"
                                                        className="bg-zinc-800 border border-zinc-700 rounded-lg text-xs text-white px-3 py-1 outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                                                        value={committee}
                                                        onChange={(e) => {
                                                            const newAssignments = { ...assignments };
                                                            const key = groupBy === 'Pre-Show' ? `pre-${p.id}` : `show-${p.id}`;
                                                            newAssignments[key] = e.target.value;
                                                            setAssignments(newAssignments);
                                                        }}
                                                    >
                                                        {COMMITTEES[groupBy].map(c => <option key={c} value={c}>{c}</option>)}
                                                    </select>
                                                </div>

                                                <div className="grid grid-cols-3 gap-2 text-[10px]">
                                                    <PreferenceBox label="1st" value={groupBy === 'Pre-Show' ? p.preShow1 : p.showWeek1} />
                                                    <PreferenceBox label="2nd" value={groupBy === 'Pre-Show' ? p.preShow2 : p.showWeek2} />
                                                    <PreferenceBox label="3rd" value={groupBy === 'Pre-Show' ? p.preShow3 : p.showWeek3} />
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                );
            })}
        </div>
    </div>
  );
}

function PreferenceBox({ label, value }: { label: string, value: string }) {
    return (
        <div className="bg-zinc-900 p-2 rounded-lg border border-white/5 opacity-80">
            <span className="block text-zinc-600 font-black uppercase text-[8px] tracking-tighter mb-0.5">{label} Choice</span>
            <span className="truncate block font-bold text-zinc-400">{value || "None"}</span>
        </div>
    );
}