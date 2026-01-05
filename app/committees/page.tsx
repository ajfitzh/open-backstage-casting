/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import React, { useState, useEffect, useMemo } from 'react';
import { 
  Printer, Loader2, Link as LinkIcon, 
  AlertCircle, Crown, Phone, Mail, ShieldAlert, Baby, 
  User, Wand2, RotateCcw, ChevronDown, ChevronUp, AlertTriangle
} from 'lucide-react';
import { getCommitteePreferences, getAuditionSlots, linkVolunteerToPerson } from '@/app/lib/baserow'; 

// --- CONFIG ---
const COMMITTEES = {
    'Pre-Show': [
        "Publicity", "Sets", "Set Dressing", "Raffles", "Greenroom", 
        "Costumes", "Props", "Make Up", "Hair", "Tech"
    ],
    'Show Week': [
        "Raffles", "Greenroom", "Costumes", "Props", "Make-Up", "Hair", 
        "Tech", "Ninjas/Set Movers", "Box Office", "Concessions", "Security"
    ]
};

// Recommended minimum people per committee (for the auto-balancer)
const MIN_STAFFING = 2; 

export default function CommitteeDashboard() {
  // Data State
  const [rawData, setRawData] = useState<any[]>([]);
  const [students, setStudents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Assignment State (The "Mutable" Layer)
  // Maps digitalID -> "Committee Name"
  const [assignments, setAssignments] = useState<Record<string, string>>({});
  const [history, setHistory] = useState<Record<string, string>>({}); // For Undo
  
  // UI State
  const [groupBy, setGroupBy] = useState<'Pre-Show' | 'Show Week'>('Pre-Show');
  const [expandedCard, setExpandedCard] = useState<string | null>(null);

  // --- 1. LOAD DATA ---
  useEffect(() => {
    async function loadData() {
        const [prefData, studentData] = await Promise.all([
            getCommitteePreferences(),
            getAuditionSlots()
        ]);
        
        const processed = prefData.map((p: any) => {
            const age = parseInt(p["Age"] || "0"); 
            return {
                ...p,
                id: p.id,
                digitalId: p.id, // Using Row ID as unique key
                preShow1: p["Pre-Show 1st"]?.value,
                preShow2: p["Pre-Show 2nd"]?.value,
                preShow3: p["Pre-Show 3rd"]?.value,
                showWeek1: p["Show Week 1st"]?.value,
                showWeek2: p["Show Week 2nd"]?.value,
                showWeek3: p["Show Week 3rd"]?.value,
                chairInterests: p["Chair Interest"]?.map((c: any) => c.value) || [],
                studentName: p["Student Name"] || "",
                parentName: p["Parent Name"] || "Unknown",
                email: p["Email"] || "",
                phone: p["Phone"] || "",
                age: age,
                isAdult: age >= 18,
                isParent: (p["Student Name"] || "").trim().length > 0,
                bgStatus: p["Background Check Status"]?.value || "Pending", 
            };
        });

        // Initialize Assignments to 1st Choice
        const initialAssignments: Record<string, string> = {};
        processed.forEach((p: any) => {
             // Default to Pre-Show 1st choice initially
             if (p.preShow1) initialAssignments[`pre-${p.id}`] = p.preShow1;
             if (p.showWeek1) initialAssignments[`show-${p.id}`] = p.showWeek1;
        });

        setRawData(processed);
        setStudents(studentData);
        setAssignments(initialAssignments);
        setHistory(initialAssignments); // Save initial state for reset
        setLoading(false);
    }
    loadData();
  }, []);

  // --- 2. THE ALGORITHM: "MAGIC BALANCE" ---
  const handleAutoBalance = () => {
      if(!confirm("This will move volunteers from over-staffed committees to under-staffed ones based on their 2nd/3rd choices. Proceed?")) return;

      const newAssignments = { ...assignments };
      const currentCommittees = COMMITTEES[groupBy];
      
      // Helper to count people in a committee
      const getCount = (comm: string) => {
          return rawData.filter(p => {
              const key = groupBy === 'Pre-Show' ? `pre-${p.id}` : `show-${p.id}`;
              return newAssignments[key] === comm;
          }).length;
      };

      let movedCount = 0;

      // Loop until we can't optimize anymore (simple 1-pass for stability)
      currentCommittees.forEach(targetCommittee => {
          const count = getCount(targetCommittee);
          
          // If this committee is "Starving" (< 2 people)
          if (count < MIN_STAFFING) {
               // Find people who want this as 2nd/3rd choice, but are currently in a "Healthy" committee (> 2)
               rawData.forEach(p => {
                   const key = groupBy === 'Pre-Show' ? `pre-${p.id}` : `show-${p.id}`;
                   const currentComm = newAssignments[key];
                   
                   // Don't strip another starving committee
                   if (currentComm && getCount(currentComm) > MIN_STAFFING) {
                       
                       // Check 2nd Choice
                       const choice2 = groupBy === 'Pre-Show' ? p.preShow2 : p.showWeek2;
                       if (choice2 === targetCommittee) {
                           newAssignments[key] = targetCommittee;
                           movedCount++;
                           return; // Done with this person
                       }

                       // Check 3rd Choice
                       const choice3 = groupBy === 'Pre-Show' ? p.preShow3 : p.showWeek3;
                       if (choice3 === targetCommittee) {
                           newAssignments[key] = targetCommittee;
                           movedCount++;
                       }
                   }
               });
          }
      });

      setAssignments(newAssignments);
      alert(`Magic Sort Complete: Moved ${movedCount} volunteers to balance teams.`);
  };

  const handleReset = () => {
      setAssignments(history);
  };

  // --- 3. HELPERS ---
  const findStudentMatch = (typedName: string) => {
      if (!typedName) return null;
      return students.find(s => s.Performer.toLowerCase().includes(typedName.toLowerCase()));
  };

  // Group data based on current assignments state
  const groupedData = useMemo(() => {
      const groups: Record<string, any[]> = {};
      // Initialize all committees so empty ones show up
      COMMITTEES[groupBy].forEach(c => groups[c] = []);
      groups["Unassigned"] = [];

      rawData.forEach(p => {
          const key = groupBy === 'Pre-Show' ? `pre-${p.id}` : `show-${p.id}`;
          const assignedComm = assignments[key] || "Unassigned";
          
          if (!groups[assignedComm]) groups[assignedComm] = [];
          groups[assignedComm].push(p);
      });
      return groups;
  }, [rawData, assignments, groupBy]);

  if (loading) return <div className="h-screen bg-zinc-950 flex items-center justify-center text-white"><Loader2 className="animate-spin text-blue-500"/></div>;

  return (
    <div className="min-h-screen bg-zinc-950 text-white font-sans p-4 md:p-6 flex flex-col">
        
        {/* --- HEADER --- */}
        <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-4 mb-6 print:hidden">
            <div>
                <h1 className="text-2xl font-black uppercase italic tracking-tighter text-white">Committee Manager</h1>
                <p className="text-zinc-500 text-xs font-medium">Drag-and-drop simulated via dropdowns • {rawData.length} Volunteers</p>
            </div>
            
            <div className="flex flex-wrap gap-2 w-full xl:w-auto">
                {/* TABS */}
                <div className="bg-zinc-900 border border-white/10 rounded-lg p-1 flex">
                    <button onClick={() => setGroupBy('Pre-Show')} className={`px-4 py-2 rounded text-xs font-bold uppercase transition-all ${groupBy === 'Pre-Show' ? 'bg-blue-600 text-white shadow-lg' : 'text-zinc-500 hover:text-white'}`}>Pre-Show</button>
                    <button onClick={() => setGroupBy('Show Week')} className={`px-4 py-2 rounded text-xs font-bold uppercase transition-all ${groupBy === 'Show Week' ? 'bg-blue-600 text-white shadow-lg' : 'text-zinc-500 hover:text-white'}`}>Show Week</button>
                </div>

                {/* MAGIC TOOLS */}
                <button onClick={handleAutoBalance} className="bg-emerald-600/10 hover:bg-emerald-600/20 text-emerald-500 border border-emerald-600/50 px-4 py-2 rounded-lg text-xs font-black uppercase flex items-center gap-2 transition-all">
                    <Wand2 size={14}/> Auto-Balance
                </button>
                <button onClick={handleReset} className="bg-zinc-800 hover:bg-zinc-700 text-zinc-400 px-3 py-2 rounded-lg transition-all" title="Reset to 1st Choices">
                    <RotateCcw size={14}/>
                </button>
                <button onClick={() => window.print()} className="bg-zinc-800 hover:bg-zinc-700 text-zinc-300 px-4 py-2 rounded-lg text-xs font-bold uppercase flex items-center gap-2 transition-all">
                    <Printer size={14}/> Print
                </button>
            </div>
        </div>

        {/* --- PRINT HEADER (Only visible on print) --- */}
        <div className="hidden print:block mb-8 text-black">
             <h1 className="text-4xl font-black uppercase mb-2">{groupBy} Assignments</h1>
             <p className="text-sm text-gray-600">Generated from Open Backstage • {new Date().toLocaleDateString()}</p>
        </div>

        {/* --- MASONRY GRID --- */}
        <div className="columns-1 md:columns-2 xl:columns-3 gap-6 space-y-6 print:block print:columns-2">
            
            {/* Loop through Committees */}
            {Object.keys(groupedData).map(committee => {
                const team = groupedData[committee];
                const isStarving = team.length < MIN_STAFFING && committee !== "Unassigned";
                const isUnassigned = committee === "Unassigned";
                
                // Hide empty committees in print view to save paper
                if (team.length === 0) return (
                    <div key={committee} className="break-inside-avoid mb-4 print:hidden opacity-40 hover:opacity-100 transition-opacity">
                         <div className="border border-dashed border-zinc-800 rounded-xl p-3 flex justify-between items-center">
                            <span className="text-zinc-600 font-bold uppercase text-xs">{committee}</span>
                            <span className="text-zinc-700 text-[10px] font-mono">0</span>
                         </div>
                    </div>
                );

                return (
                    <div key={committee} className={`break-inside-avoid mb-6 rounded-xl overflow-hidden border ${isStarving ? 'border-amber-500/50 bg-amber-900/10' : 'border-white/10 bg-zinc-900/40'} print:border-black print:bg-white print:mb-8`}>
                        
                        {/* COMMITTEE HEADER */}
                        <div className={`p-3 border-b flex justify-between items-center ${isStarving ? 'border-amber-500/30 bg-amber-500/10' : 'border-white/5 bg-zinc-900'} print:border-b-2 print:border-black print:bg-gray-100`}>
                            <div className="flex items-center gap-2">
                                {isStarving && <AlertTriangle size={14} className="text-amber-500 print:hidden"/>}
                                <h3 className={`font-black uppercase text-sm tracking-wider ${isStarving ? 'text-amber-400' : 'text-zinc-200'} print:text-black`}>{committee}</h3>
                            </div>
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${isStarving ? 'bg-amber-500 text-black' : 'bg-zinc-800 text-zinc-400'} print:bg-black print:text-white`}>
                                {team.length}
                            </span>
                        </div>

                        {/* VOLUNTEER LIST */}
                        <div className="divide-y divide-white/5 print:divide-gray-300">
                            {team.map((p: any) => {
                                const isExpanded = expandedCard === p.id;
                                const studentMatch = findStudentMatch(p.studentName);
                                const wantsToChair = p.chairInterests.includes(committee);
                                const isAssignedTo1st = (groupBy === 'Pre-Show' ? p.preShow1 : p.showWeek1) === committee;

                                return (
                                    <div key={p.id} className="group hover:bg-white/5 transition-colors print:hover:bg-transparent">
                                        
                                        {/* COMPACT ROW (Always Visible) */}
                                        <div 
                                            className="p-3 cursor-pointer"
                                            onClick={() => setExpandedCard(isExpanded ? null : p.id)}
                                        >
                                            <div className="flex justify-between items-start">
                                                <div className="flex flex-col">
                                                    <div className="flex items-center gap-2">
                                                        <span className={`font-bold text-sm ${p.isParent ? 'text-zinc-200' : 'text-purple-300'} print:text-black`}>
                                                            {p.parentName}
                                                        </span>
                                                        {wantsToChair && <Crown size={12} className="text-amber-500 fill-amber-500/20" />}
                                                        {!isAssignedTo1st && <span className="text-[8px] border border-zinc-700 text-zinc-500 px-1 rounded uppercase print:border-gray-400">Moved</span>}
                                                    </div>
                                                    
                                                    {/* Sub-line */}
                                                    <div className="flex items-center gap-2 mt-0.5">
                                                        {p.isParent ? (
                                                            <span className="text-[10px] text-zinc-500 flex items-center gap-1 print:text-gray-600">
                                                                <Baby size={10} /> {p.studentName}
                                                            </span>
                                                        ) : (
                                                            <span className="text-[10px] text-purple-400/60 font-bold uppercase tracking-wide print:text-gray-500">Community</span>
                                                        )}
                                                    </div>
                                                </div>

                                                {/* Action / State Icon */}
                                                <div className="print:hidden">
                                                    {isExpanded ? <ChevronUp size={14} className="text-zinc-600"/> : <ChevronDown size={14} className="text-zinc-700 group-hover:text-zinc-500"/>}
                                                </div>
                                            </div>
                                        </div>

                                        {/* EXPANDED DETAILS (Collapsible) */}
                                        {isExpanded && (
                                            <div className="px-3 pb-3 bg-zinc-950/30 shadow-inner border-t border-white/5 print:hidden">
                                                
                                                {/* Contact & Flags */}
                                                <div className="flex gap-4 py-2 mb-2 border-b border-white/5">
                                                     <a href={`mailto:${p.email}`} className="flex items-center gap-2 text-xs text-blue-400 hover:text-blue-300"><Mail size={12}/> {p.email}</a>
                                                     <a href={`tel:${p.phone}`} className="flex items-center gap-2 text-xs text-blue-400 hover:text-blue-300"><Phone size={12}/> {p.phone}</a>
                                                </div>
                                                
                                                {/* Safety Check */}
                                                {p.isAdult && p.bgStatus !== 'Cleared' && (
                                                    <div className="mb-3 bg-red-900/20 border border-red-900/50 rounded p-2 flex items-center gap-2 text-red-400 text-xs">
                                                        <ShieldAlert size={14} />
                                                        <span>Background Check: <strong>{p.bgStatus}</strong></span>
                                                        <button onClick={() => alert("Simulate: Email sent to " + p.email)} className="ml-auto underline decoration-dotted hover:text-red-300">Remind</button>
                                                    </div>
                                                )}

                                                {/* Manual Move Dropdown */}
                                                <div className="flex items-center gap-2">
                                                    <span className="text-[10px] uppercase font-bold text-zinc-500">Move to:</span>
                                                    <select 
                                                        className="bg-zinc-800 border border-zinc-700 rounded text-xs text-white p-1 outline-none focus:border-blue-500"
                                                        value={committee}
                                                        onChange={(e) => {
                                                            const newAssignments = { ...assignments };
                                                            const key = groupBy === 'Pre-Show' ? `pre-${p.id}` : `show-${p.id}`;
                                                            newAssignments[key] = e.target.value;
                                                            setAssignments(newAssignments);
                                                        }}
                                                    >
                                                        {COMMITTEES[groupBy].map(c => (
                                                            <option key={c} value={c}>{c}</option>
                                                        ))}
                                                    </select>
                                                </div>

                                                {/* Preference History */}
                                                <div className="mt-3 grid grid-cols-3 gap-2 text-[10px]">
                                                    <div className="bg-zinc-900 p-1.5 rounded border border-white/5 opacity-50">
                                                        <span className="block text-zinc-500 uppercase text-[8px]">1st Choice</span>
                                                        {groupBy === 'Pre-Show' ? p.preShow1 : p.showWeek1}
                                                    </div>
                                                    <div className={`bg-zinc-900 p-1.5 rounded border border-white/5 ${isAssignedTo1st ? '' : 'border-blue-500/30 bg-blue-500/10'}`}>
                                                        <span className="block text-zinc-500 uppercase text-[8px]">2nd Choice</span>
                                                        {groupBy === 'Pre-Show' ? p.preShow2 : p.showWeek2}
                                                    </div>
                                                    <div className="bg-zinc-900 p-1.5 rounded border border-white/5">
                                                        <span className="block text-zinc-500 uppercase text-[8px]">3rd Choice</span>
                                                        {groupBy === 'Pre-Show' ? p.preShow3 : p.showWeek3}
                                                    </div>
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