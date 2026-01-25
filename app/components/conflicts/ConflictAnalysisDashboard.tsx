"use client";

import React, { useMemo } from 'react';
import { Calendar, AlertTriangle, Clock } from 'lucide-react';

export default function ConflictAnalysisDashboard({ scenes, people, conflictRows, events }: any) {

  // --- 🧠 THE BRAIN: EVENT-BASED ANALYTICS ---
  const analytics = useMemo(() => {
    
    // 1. Sort Events Chronologically
    const sortedEvents = [...events].sort((a: any, b: any) => 
        new Date(a["Event Date"]).getTime() - new Date(b["Event Date"]).getTime()
    );

    // 2. Map Conflicts to specific Event IDs
    // The "Rehearsal Event Conflicts" table links to "Production Event" (Table 625)
    const eventConflictMap = new Map<number, Set<number>>(); // EventID -> Set of PersonIDs

    conflictRows.forEach((row: any) => {
        const personId = row["Person"]?.[0]?.id;
        const linkedEventIds = row["Production Event"]?.map((e: any) => e.id) || [];
        
        if (personId && linkedEventIds.length > 0) {
            linkedEventIds.forEach((eventId: number) => {
                if (!eventConflictMap.has(eventId)) eventConflictMap.set(eventId, new Set());
                eventConflictMap.get(eventId)?.add(personId);
            });
        }
    });

    // 3. Build the Event Cards
    const eventCards = sortedEvents.map((evt: any) => {
        const dateObj = new Date(evt["Event Date"]);
        const absentCount = eventConflictMap.get(evt.id)?.size || 0;
        const totalCast = people.length || 1;
        const availability = Math.round(((totalCast - absentCount) / totalCast) * 100);
        
        // Is it Friday or Saturday?
        const dayName = dateObj.toLocaleDateString('en-US', { weekday: 'short' });
        const dateStr = dateObj.toLocaleDateString('en-US', { month: 'numeric', day: 'numeric' });
        
        // Parse Time (e.g. "18:00" -> "6pm")
        const startTime = evt["Start Time"] ? new Date(evt["Start Time"]).toLocaleTimeString([], {hour: 'numeric', minute:'2-digit'}) : "";
        const endTime = evt["End Time"] ? new Date(evt["End Time"]).toLocaleTimeString([], {hour: 'numeric', minute:'2-digit'}) : "";

        return {
            id: evt.id,
            label: `${dayName} ${dateStr}`,
            time: `${startTime} - ${endTime}`,
            type: evt["Event Type"]?.value || "Rehearsal",
            absentCount,
            availability,
            isFriday: dayName === 'Fri',
            isSaturday: dayName === 'Sat'
        };
    });

    // 4. Calculate "Hardest Scenes" (Weighted by Event Availability)
    // We want to know which scenes are missing people on the *best* days.
    const sceneScores = scenes.map((scene: any) => {
        const actorIds = scene.actors || [];
        // Simply count how many TOTAL conflicts these actors have across all events
        const totalConflicts = actorIds.reduce((acc: number, pid: number) => {
            let c = 0;
            eventConflictMap.forEach((absentees) => {
                if(absentees.has(pid)) c++;
            });
            return acc + c;
        }, 0);
        return { ...scene, conflictLoad: totalConflicts, size: actorIds.length };
    }).sort((a: any, b: any) => b.conflictLoad - a.conflictLoad);

    return { eventCards, hardestScenes: sceneScores.slice(0, 5) };
  }, [scenes, people, conflictRows, events]);


  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
        
        {/* 📅 REHEARSAL CALENDAR (The Squares!) */}
        <div className="col-span-2 bg-zinc-900 border border-white/10 rounded-xl p-4 flex flex-col">
            <div className="flex justify-between items-center mb-4">
                <h3 className="text-xs font-black uppercase tracking-widest text-zinc-500 flex items-center gap-2">
                    <Calendar size={14} className="text-blue-500"/> Rehearsal Schedule
                </h3>
                <div className="flex gap-2">
                    <span className="text-[9px] font-bold px-2 py-1 rounded bg-emerald-900/30 text-emerald-400 border border-emerald-500/20">High Avail</span>
                    <span className="text-[9px] font-bold px-2 py-1 rounded bg-red-900/30 text-red-400 border border-red-500/20">High Conflict</span>
                </div>
            </div>
            
            <div className="flex gap-2 overflow-x-auto pb-2 custom-scrollbar">
                {analytics.eventCards.length === 0 && <div className="text-xs text-zinc-600 italic p-4">No events found. Check 'Rehearsal/Production Events' table.</div>}
                
                {analytics.eventCards.map((evt: any) => {
                    // Dynamic Coloring
                    let color = "bg-emerald-500/10 border-emerald-500/30 hover:bg-emerald-500/20";
                    let textColor = "text-emerald-400";
                    if (evt.availability < 90) { color = "bg-amber-500/10 border-amber-500/30 hover:bg-amber-500/20"; textColor = "text-amber-400"; }
                    if (evt.availability < 75) { color = "bg-red-500/10 border-red-500/30 hover:bg-red-500/20"; textColor = "text-red-400"; }

                    return (
                        <div key={evt.id} className={`shrink-0 w-28 border rounded-lg p-2 flex flex-col justify-between transition-colors cursor-pointer group ${color}`}>
                            <div>
                                <div className="flex justify-between items-start">
                                    <span className={`text-[10px] font-black uppercase ${textColor}`}>{evt.label.split(' ')[0]}</span>
                                    <span className="text-[9px] text-zinc-500">{evt.label.split(' ')[1]}</span>
                                </div>
                                <div className="text-[9px] text-zinc-500 mt-1 flex items-center gap-1">
                                    <Clock size={8}/> {evt.time.split('-')[0]}
                                </div>
                            </div>

                            <div className="mt-2">
                                <div className={`text-xl font-black leading-none ${textColor}`}>{evt.availability}%</div>
                                {evt.absentCount > 0 ? (
                                    <div className="text-[9px] font-bold text-zinc-400 mt-1 bg-black/20 rounded px-1 w-fit">
                                        {evt.absentCount} Missing
                                    </div>
                                ) : (
                                    <div className="text-[9px] font-bold text-emerald-600 mt-1">Full Cast</div>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>

        {/* ⚠️ HARDEST SCENES */}
        <div className="bg-zinc-900 border border-white/10 rounded-xl p-4 flex flex-col">
            <h3 className="text-xs font-black uppercase tracking-widest text-zinc-500 mb-4 flex items-center gap-2">
                <AlertTriangle size={14} className="text-red-500"/> Difficult Scenes
            </h3>
            
            <div className="flex-1 space-y-2 overflow-y-auto max-h-[160px] custom-scrollbar">
                {analytics.hardestScenes.map((scene: any, i: number) => (
                    <div key={scene.id} className="flex justify-between items-center bg-black/40 p-2 rounded border border-white/5 group hover:border-red-500/30 transition-colors">
                        <div className="flex items-center gap-3 min-w-0">
                            <span className="text-xs font-mono font-bold text-zinc-600 w-4">#{i+1}</span>
                            <div className="min-w-0">
                                <div className="text-xs font-bold text-zinc-200 truncate pr-2">{scene.name}</div>
                                <div className="text-[9px] text-zinc-500">{scene.size} Actors</div>
                            </div>
                        </div>
                        <div className="text-right shrink-0">
                            <div className="text-xs font-black text-red-400">{scene.conflictLoad}</div>
                            <div className="text-[8px] uppercase font-bold text-zinc-600">Points</div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    </div>
  );
}