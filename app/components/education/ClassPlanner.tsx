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

export default function ClassPlanner({ classes, venues }: { classes: any[], venues: any[] }) {
  // 1. STATE
  const [activeSession, setActiveSession] = useState("Fall 2026"); // Default/Dynamic
  const [activeDay, setActiveDay] = useState("Tuesday");
  const [isSaving, setIsSaving] = useState(false);
  
  // Local state for optimistic updates
  const [localClasses, setLocalClasses] = useState(classes);

  // 2. FILTER DATA
  const sessionClasses = useMemo(() => 
    localClasses.filter((c:any) => c.session === activeSession), 
  [localClasses, activeSession]);

  const bench = sessionClasses.filter((c:any) => c.status === 'Proposed' || c.status === 'Seeking Instructor');
  
  // Group scheduled classes by Venue -> Time
  const gridData = useMemo(() => {
    const scheduled = sessionClasses.filter((c:any) => 
        (c.status === 'Drafting' || c.status === 'Active') && 
        c.day === activeDay
    );
    
    // Group by Venue Name
    const groups: Record<string, any[]> = {};
    venues.forEach((v:any) => groups[v.name] = []);
    
    scheduled.forEach((c:any) => {
        if(groups[c.location]) groups[c.location].push(c);
        // Fallback if location name doesn't match perfectly
        else {
             if(!groups["Other"]) groups["Other"] = [];
             groups["Other"].push(c);
        }
    });
    
    return groups;
  }, [sessionClasses, activeDay, venues]);

  // 3. ACTIONS
  const handleDragStart = (e: React.DragEvent, classId: number) => {
    e.dataTransfer.setData("classId", classId.toString());
  };

  const handleDrop = async (e: React.DragEvent, venueName: string, timeSlot: string) => {
    e.preventDefault();
    const classId = Number(e.dataTransfer.getData("classId"));
    if(!classId) return;

    // Optimistic Update
    setLocalClasses((prev: any[]) => prev.map((c: any) => 
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
    
    setLocalClasses((prev: any[]) => prev.map((c: any) => 
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
                    </select>
                </div>
            </div>
            
            <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
                {bench.map((c:any) => (
                    <div 
                        key={c.id} 
                        draggable 
                        onDragStart={(e) => handleDragStart(e, c.id)}
                        className="bg-zinc-950 border border-white/10 p-3 rounded-xl cursor-grab hover:border-blue-500/50 hover:shadow-lg transition-all group"
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
                    {venues.map((venue: any) => (
                        <div key={venue.id} className="w-72 shrink-0 flex flex-col bg-zinc-900/40 border border-white/5 rounded-2xl overflow-hidden">
                            <div className="p-4 border-b border-white/5 bg-zinc-950/50 flex items-center gap-2 sticky top-0 z-10">
                                <MapPin size={14} className="text-zinc-500"/>
                                <h3 className="text-sm font-black text-zinc-300 uppercase tracking-wide">{venue.name}</h3>
                            </div>
                            
                            <div className="flex-1 overflow-y-auto p-2 space-y-2">
                                {/* Time Slots Buckets */}
                                {TIME_SLOTS.map(time => {
                                    const slotClasses = gridData[venue.name]?.filter((c:any) => c.time === time) || [];
                                    return (
                                        <div 
                                            key={time} 
                                            onDragOver={(e) => e.preventDefault()}
                                            onDrop={(e) => handleDrop(e, venue.name, time)}
                                            className={`min-h-[80px] rounded-xl border border-dashed border-white/5 p-2 transition-colors ${slotClasses.length > 0 ? 'bg-zinc-900/50' : 'hover:bg-white/5'}`}
                                        >
                                            <div className="text-[9px] font-mono text-zinc-600 mb-2 block">{time}</div>
                                            
                                            {slotClasses.map((c:any) => (
                                                <div key={c.id} className="bg-zinc-800 border border-white/10 p-2 rounded-lg shadow-sm mb-2 group relative">
                                                    <div className="font-bold text-xs text-white truncate pr-4">{c.name}</div>
                                                    <div className="text-[10px] text-zinc-400 truncate">{c.teacher}</div>
                                                    
                                                    {/* Unschedule Button */}
                                                    <button 
                                                        onClick={() => handleUnschedule(c.id)}
                                                        className="absolute top-1 right-1 text-zinc-600 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity"
                                                    >
                                                        <X size={12}/>
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