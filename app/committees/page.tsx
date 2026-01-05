/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import React, { useState, useEffect, useMemo } from 'react';
import { 
  Users, Search, Printer, Loader2, Link as LinkIcon, 
  AlertCircle, Crown, Phone, Mail, ShieldAlert, Baby, HeartHandshake, User
} from 'lucide-react';
import { getCommitteePreferences, getAuditionSlots } from '@/app/lib/baserow'; 

export default function CommitteeDashboard() {
  const [prefs, setPrefs] = useState<any[]>([]);
  const [students, setStudents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [groupBy, setGroupBy] = useState<'Pre-Show' | 'Show Week'>('Pre-Show');
  const [search, setSearch] = useState("");

  useEffect(() => {
    async function loadData() {
        const [prefData, studentData] = await Promise.all([
            getCommitteePreferences(),
            getAuditionSlots()
        ]);
        
        const processedPrefs = prefData.map((p: any) => {
            const age = parseInt(p["Age"] || "0"); 
            const isAdult = age >= 18;
            
            // Logic: If "Student Name" is empty, they are a Community Volunteer
            const studentName = p["Student Name"] || "";
            const isParent = studentName.trim().length > 0;

            return {
                ...p,
                preShow1: p["Pre-Show 1st"]?.value || "Unassigned",
                preShow2: p["Pre-Show 2nd"]?.value,
                preShow3: p["Pre-Show 3rd"]?.value,
                showWeek1: p["Show Week 1st"]?.value || "Unassigned",
                showWeek2: p["Show Week 2nd"]?.value,
                showWeek3: p["Show Week 3rd"]?.value,
                chairInterests: p["Chair Interest"]?.map((c: any) => c.value) || [],
                studentName: studentName,
                parentName: p["Parent Name"] || "Unknown Volunteer",
                email: p["Email"] || "",
                phone: p["Phone"] || "",
                
                // INTELLIGENT FIELDS
                age: age,
                isAdult: isAdult,
                isParent: isParent, // New Flag for Jenny
                bgStatus: p["Background Check Status"]?.value || "Pending", 
                needsCheck: isAdult && (p["Background Check Status"]?.value !== 'Cleared' && p["Background Check Status"]?.value !== 'Not Applicable'),
                availability: p["Availability"]?.map((a: any) => a.value) || []
            };
        });

        setPrefs(processedPrefs);
        setStudents(studentData);
        setLoading(false);
    }
    loadData();
  }, []);

  const groupedData = useMemo(() => {
      const groups: Record<string, any[]> = {};
      
      prefs.forEach(p => {
          const key = groupBy === 'Pre-Show' ? p.preShow1 : p.showWeek1;
          if (!groups[key]) groups[key] = [];
          groups[key].push(p);
      });
      return groups;
  }, [prefs, groupBy]);

  const findStudentMatch = (typedName: string) => {
      if (!typedName) return null;
      return students.find(s => s.Performer.toLowerCase().includes(typedName.toLowerCase()));
  };

  if (loading) return <div className="h-screen bg-zinc-950 flex items-center justify-center text-white"><Loader2 className="animate-spin text-blue-500"/></div>;

  return (
    <div className="min-h-screen bg-zinc-950 text-white font-sans p-6">
        
        {/* HEADER */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8 print:hidden">
            <div>
                <h1 className="text-2xl font-black uppercase italic">Committee Assignments</h1>
                <p className="text-zinc-500 text-xs">Viewing {prefs.length} Responses</p>
            </div>
            <div className="flex gap-2 w-full md:w-auto">
                <div className="bg-zinc-900 border border-white/10 rounded-lg p-1 flex">
                    <button onClick={() => setGroupBy('Pre-Show')} className={`px-4 py-2 rounded text-xs font-bold uppercase transition-colors ${groupBy === 'Pre-Show' ? 'bg-blue-600' : 'text-zinc-500 hover:text-white'}`}>Pre-Show</button>
                    <button onClick={() => setGroupBy('Show Week')} className={`px-4 py-2 rounded text-xs font-bold uppercase transition-colors ${groupBy === 'Show Week' ? 'bg-blue-600' : 'text-zinc-500 hover:text-white'}`}>Show Week</button>
                </div>
                <button onClick={() => window.print()} className="bg-zinc-800 px-4 py-2 rounded-lg text-xs font-bold uppercase flex items-center gap-2 hover:bg-zinc-700 transition-colors"><Printer size={14}/> Print</button>
            </div>
        </div>

        {/* PRINT HEADER */}
        <div className="hidden print:block mb-6 text-black">
            <h1 className="text-3xl font-black uppercase">Committee Report: {groupBy}</h1>
        </div>

        {/* CARD GRID */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 print:grid-cols-2 print:gap-4 print:block">
            {Object.keys(groupedData).sort().map(committee => (
                <div key={committee} className="bg-zinc-900/50 border border-white/10 rounded-xl overflow-hidden mb-6 print:border-2 print:border-black print:bg-white print:text-black break-inside-avoid">
                    <div className="bg-zinc-900 p-3 border-b border-white/10 flex justify-between items-center print:bg-gray-200 print:border-black">
                        <h3 className="font-black uppercase text-sm tracking-wide truncate">{committee}</h3>
                        <span className="bg-blue-600 text-white text-[10px] font-bold px-2 py-0.5 rounded-full print:bg-black">{groupedData[committee].length}</span>
                    </div>
                    <div className="divide-y divide-white/5 print:divide-gray-300">
                        {groupedData[committee].map((p: any) => {
                            const studentMatch = findStudentMatch(p.studentName);
                            const wantsToChairThis = p.chairInterests.includes(committee);

                            return (
                                <div key={p.id} className={`p-3 transition-colors print:hover:bg-transparent ${wantsToChairThis ? 'bg-amber-900/10' : 'hover:bg-white/5'}`}>
                                    
                                    {/* TOP ROW: Name & Badges */}
                                    <div className="flex justify-between items-start mb-1">
                                        <div className="flex flex-wrap items-center gap-2">
                                            <p className="font-bold text-sm">{p.parentName}</p>
                                            
                                            {/* PARENT vs COMMUNITY BADGE */}
                                            {p.isParent ? (
                                                <span className="bg-blue-600 text-white text-[8px] px-1.5 py-0.5 rounded uppercase font-bold flex items-center gap-1 print:text-black print:bg-transparent print:border print:border-black">
                                                    <User size={8} /> Parent
                                                </span>
                                            ) : (
                                                <span className="bg-purple-600 text-white text-[8px] px-1.5 py-0.5 rounded uppercase font-bold flex items-center gap-1 print:text-black print:bg-transparent print:border print:border-black">
                                                    <HeartHandshake size={8} /> Community
                                                </span>
                                            )}

                                            {/* Chair Badge */}
                                            {wantsToChairThis && (
                                                <span className="bg-amber-500 text-black text-[8px] px-1.5 py-0.5 rounded uppercase font-black flex items-center gap-1 border border-amber-600">
                                                    <Crown size={8} /> Chair?
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                    
                                    {/* CONTACT & FLAGS */}
                                    <div className="flex flex-wrap gap-3 text-[10px] text-zinc-400 print:text-gray-600 mb-2">
                                        <span className="flex items-center gap-1"><Mail size={10}/> {p.email}</span>
                                        <span className="flex items-center gap-1"><Phone size={10}/> {p.phone}</span>
                                        
                                        {/* SAFETY FLAGS */}
                                        {p.needsCheck ? (
                                            <span className="text-red-400 flex items-center gap-1 font-bold print:text-red-600">
                                                <ShieldAlert size={10} /> BG Check Req
                                            </span>
                                        ) : !p.isAdult && p.age > 0 ? (
                                            <span className="text-blue-300 flex items-center gap-1 font-bold print:text-black">
                                                <Baby size={10} /> Minor ({p.age})
                                            </span>
                                        ) : null}
                                    </div>

                                    {/* LINKED STUDENT (Only show if Parent) */}
                                    {p.isParent && (
                                        <div className="flex items-center gap-2 bg-black/20 p-1.5 rounded border border-white/5 print:border-gray-200">
                                            <span className="text-[9px] text-zinc-500 uppercase font-bold">Child:</span>
                                            <span className="text-[10px] text-zinc-300 print:text-black font-bold">{p.studentName}</span>
                                            
                                            {/* Smart Match Indicators */}
                                            {studentMatch ? (
                                                 <span className="print:hidden text-emerald-500 flex items-center gap-0.5 text-[9px] ml-auto" title="Matched to Cast List"><LinkIcon size={10} /></span>
                                            ) : (
                                                 <span className="print:hidden text-amber-500 flex items-center gap-0.5 text-[9px] ml-auto" title="Name not found in cast list"><AlertCircle size={10} /></span>
                                            )}
                                        </div>
                                    )}

                                    {/* ALTERNATE CHOICES */}
                                    <div className="mt-2 pt-2 border-t border-white/5 flex flex-wrap gap-1 print:border-gray-300">
                                        <span className="text-[8px] text-zinc-600 uppercase font-bold print:text-gray-500 self-center mr-1">Alternates:</span>
                                        {groupBy === 'Pre-Show' ? (
                                            <>
                                                {p.preShow2 && <span className="text-[9px] bg-zinc-950 border border-white/10 px-1.5 rounded text-zinc-400 print:border-gray-300">{p.preShow2}</span>}
                                                {p.preShow3 && <span className="text-[9px] bg-zinc-950 border border-white/10 px-1.5 rounded text-zinc-400 print:border-gray-300">{p.preShow3}</span>}
                                            </>
                                        ) : (
                                            <>
                                                {p.showWeek2 && <span className="text-[9px] bg-zinc-950 border border-white/10 px-1.5 rounded text-zinc-400 print:border-gray-300">{p.showWeek2}</span>}
                                                {p.showWeek3 && <span className="text-[9px] bg-zinc-950 border border-white/10 px-1.5 rounded text-zinc-400 print:border-gray-300">{p.showWeek3}</span>}
                                            </>
                                        )}
                                    </div>
                                    
                                    {/* AVAILABILITY (If present) */}
                                    {p.availability.length > 0 && (
                                        <div className="mt-1 flex flex-wrap gap-1">
                                            {p.availability.map((date: string) => (
                                                <span key={date} className="text-[8px] bg-blue-900/20 text-blue-300 border border-blue-500/20 px-1 rounded print:border-gray-400 print:text-black">
                                                    {date}
                                                </span>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </div>
            ))}
        </div>
    </div>
  );
}