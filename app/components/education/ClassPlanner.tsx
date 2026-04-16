"use client";

import React, { useState, useMemo } from 'react';
import { 
  Calendar, MapPin, Clock, GripVertical, 
  AlertCircle, CheckCircle2, Save, X 
} from 'lucide-react';
import { updateClassSchedule } from '@/app/lib/actions';

// Standard Time Slots for CYT
const TIME_SLOTS = ["4:30 PM", "5:00 PM", "6:00 PM", "6:30 PM", "8:00 PM"];
const DAYS = ["Monday", "Tuesday", "Thursday", "Saturday"];

// Define our clean class type
interface EducationClass {
  id: number;
  name: string;
  session: string;
  teacher: string;
  location: string;
  day: string;
  time: string;
  type: string;
  status: string;
  ageRange: string;
}

export default function ClassPlanner({ classes }: { classes: EducationClass[] }) {
  // 1. STATE
  const [activeSession, setActiveSession] = useState("Winter 2026"); // Updated to a valid session from your data
  const [activeDay, setActiveDay] = useState("Tuesday");
  const [isSaving, setIsSaving] = useState(false);
  
  // Local state for optimistic updates
  const [localClasses, setLocalClasses] = useState<EducationClass[]>(classes);

  // 2. FILTER DATA
  const sessionClasses = useMemo(() => 
    localClasses.filter(c => c.session === activeSession), 
  [localClasses, activeSession]);

  const bench = sessionClasses.filter(c => c.status === 'Proposed' || c.status === 'Seeking Instructor');
  
  // Extract unique venues for THIS session to build the columns
  const activeVenues = useMemo(() => {
     return Array.from(new Set(sessionClasses.map(c => c.location).filter(Boolean))).sort();
  }, [sessionClasses]);

  // Group scheduled classes by Venue -> Time
  const gridData = useMemo(() => {
    const scheduled = sessionClasses.filter(c => 
        (c.status === 'Drafting' || c.status === 'Active' || c.status === 'Completed') && 
        c.day === activeDay
    );
    
    // Group by Venue Name
    const groups: Record<string, EducationClass[]> = {};
    activeVenues.forEach(v => groups[v] = []);
    
    scheduled.forEach(c => {
        const loc = c.location || "Other";
        if (!groups[loc]) groups[loc] = [];
        groups[loc].push(c);
    });
    
    return groups;
  }, [sessionClasses, activeDay, activeVenues]);

  // 3. ACTIONS
  const handleDragStart = (e: React.DragEvent, classId: number) => {
    e.dataTransfer.setData("classId", classId.toString());
  };

  const handleDrop = async (e: React.DragEvent, venueName: string, timeSlot: string) => {
    e.preventDefault();
    const classId = Number(e.dataTransfer.getData("classId"));
    if(!classId) return;

    // Optimistic Update
    setLocalClasses(prev => prev.map(c => 
        c.id === classId 
            ? { ...c, day: activeDay, time: timeSlot, location: venueName, status: 'Drafting' } 
            : c
    ));

    // Server Update
    setIsSaving(true);
    await updateClassSchedule(classId, {
        day: activeDay,
        time: timeSlot,
        location: venueName,
        status: "Drafting"
    });
    setIsSaving(false);
  };

  const handleUnschedule = async (classId: number) => {
    if(!confirm("Move back to bench?")) return;
    
    setLocalClasses(prev => prev.map(c => 
        c.id === classId 
            ? { ...c, day: "", time: "", location: "", status: 'Proposed' } 
            : c
    ));
    
    await updateClassSchedule(classId, { day: "", time: "", location: "", status: "Proposed" });
  };

  return (
    <div className="flex h-full bg-zinc-950 text-white">
        
        {/* SIDEBAR: THE BENCH */}
        <aside className="w-80 border-r border-white/10 flex flex-col bg-zinc-900/50 shrink-0">
            <div className="p-6 border-b border-white/10 bg-zinc-900">
                <h2 className="text-xs font-black uppercase text-zinc-500 tracking-widest mb-1">Unscheduled</h2>
                <div className="flex justify-between items-end">
                    <span className="text-xl font-black text-white">{bench.length} <span className="text-xs font-medium text-zinc-500">Proposals</span></span>
                    <select 
                        value={activeSession} 
                        onChange={(e) => setActiveSession(e.target.value)}
                        className="bg-zinc-950 border border-white/10 rounded-lg text-[10px] py-1 px-2 text-zinc-300 outline-none"
                    >
                        <option>Fall 2026</option>
                        <option>Winter 2026</option>
                        <option>Spring 2026</option>
                        {/* Fallbacks based on your actual data */}
                        <option>Fall 2025</option>
                        <option>Winter 2025</option>
                        <option>Spring 2025</option>
                    </select>
                </div>
            </div>
            
            <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
                {bench.map(c => (
                    <div 
                        key={c.id} 
                        draggable 
                        onDragStart={(e) => handleDragStart(e, c.id)}
                        className="bg-zinc-950 border border-white/10 p-3 rounded-xl cursor-grab active:cursor-grabbing hover:border-blue-500/50 hover:shadow-[0_0_15px_rgba(59,130,246,0.15)] transition-all group"
                    >
                        <div className="flex justify-between items-start mb-2">
                             <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded border uppercase ${c.status === 'Seeking Instructor' ? 'bg-amber-500/10 text-amber-500 border-amber-500/20' : 'bg-blue-500/10 text-blue-500 border-blue-500/20'}`}>
                                {c.status === 'Seeking Instructor' ? 'Wanted' : 'Proposed'}
                             </span>
                             <span className="text-[9px] text-zinc-500">{c.ageRange}</span>
                        </div>
                        <h4 className="font-bold text-sm leading-tight mb-1">{c.name}</h4>
                        <div className="flex items-center gap-2 text-xs text-zinc-400">
                            <span className="truncate max-w-[150px]">{c.teacher || "No Instructor"}</span>
                        </div>
                    </div>
                ))}
                {bench.length === 0 && <div className="text-center py-10 text-zinc-600 text-xs italic">All classes scheduled!</div>}
            </div>
        </aside>

        {/* MAIN: THE PLANNER GRID */}
        <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
            {/* Day Tabs */}
            <div className="h-16 border-b border-white/10 flex items-center px-6 gap-2 bg-zinc-900 shrink-0">
                {DAYS.map(day => (
                    <button 
                        key={day} 
                        onClick={() => setActiveDay(day)}
                        className={`px-4 py-2 rounded-lg text-xs font-black uppercase tracking-widest transition-all ${activeDay === day ? 'bg-white text-black' : 'text-zinc-500 hover:text-zinc-300 hover:bg-white/5'}`}
                    >
                        {day}
                    </button>
                ))}
                <div className="ml-auto flex items-center gap-2">
                    {isSaving && <span className="text-xs text-emerald-500 animate-pulse font-bold flex items-center gap-1"><Save size={12}/> Saving...</span>}
                </div>
            </div>

            {/* Venues Columns */}
            <div className="flex-1 overflow-x-auto overflow-y-auto p-6 bg-black/20">
                <div className="flex gap-6 h-full min-h-[600px]">
                    {activeVenues.length === 0 && (
                        <div className="w-full h-full flex flex-col items-center justify-center text-zinc-500">
                            <AlertCircle size={48} className="mb-4 opacity-20" />
                            <p>No venues found for this session.</p>
                            <p className="text-xs mt-2">Classes must have a Location assigned in the database.</p>
                        </div>
                    )}
                    {activeVenues.map(venue => (
                        <div key={venue} className="w-72 shrink-0 flex flex-col bg-zinc-900/40 border border-white/5 rounded-2xl overflow-hidden">
                            <div className="p-4 border-b border-white/5 bg-zinc-950/50 flex items-center gap-2 sticky top-0 z-10">
                                <MapPin size={14} className="text-zinc-500"/>
                                <h3 className="text-sm font-black text-zinc-300 uppercase tracking-wide truncate" title={venue}>{venue}</h3>
                            </div>
                            
                            <div className="flex-1 overflow-y-auto p-2 space-y-2">
                                {/* Time Slots Buckets */}
                                {TIME_SLOTS.map(time => {
                                    const slotClasses = gridData[venue]?.filter(c => c.time === time) || [];
                                    return (
                                        <div 
                                            key={time} 
                                            onDragOver={(e) => e.preventDefault()}
                                            onDrop={(e) => handleDrop(e, venue, time)}
                                            className={`min-h-[80px] rounded-xl border border-dashed border-white/5 p-2 transition-colors ${slotClasses.length > 0 ? 'bg-zinc-900/50' : 'hover:bg-white/5 hover:border-white/20'}`}
                                        >
                                            <div className="text-[9px] font-mono text-zinc-600 mb-2 block">{time}</div>
                                            
                                            {slotClasses.map(c => (
                                                <div key={c.id} className="bg-zinc-800 border border-white/10 p-2 rounded-lg shadow-sm mb-2 group relative">
                                                    <div className="font-bold text-xs text-white truncate pr-4" title={c.name}>{c.name}</div>
                                                    <div className="text-[10px] text-zinc-400 truncate">{c.teacher}</div>
                                                    
                                                    {/* Unschedule Button */}
                                                    <button 
                                                        onClick={() => handleUnschedule(c.id)}
                                                        className="absolute top-1 right-1 text-zinc-600 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity bg-black/50 hover:bg-black p-1 rounded"
                                                        title="Unschedule"
                                                    >
                                                        <X size={10}/>
                                                    </button>
                                                </div>
                                            ))}
                                        </div>
                                    )
                                })}
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </main>
    </div>
  );
}
