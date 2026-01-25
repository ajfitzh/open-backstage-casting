"use client";

import React, { useMemo } from 'react';
import { Calendar, AlertTriangle, Users, TrendingUp, CheckCircle2 } from 'lucide-react';

export default function ConflictAnalysisDashboard({ scenes, assignments, people, conflictRows }: any) {

  // --- 🧠 THE BRAIN: ANALYTICS ENGINE ---
  const analytics = useMemo(() => {
    // 1. Parse Conflicts into a clean Map: Date -> Set(PersonIDs)
    // This tells us: "Who is missing on Oct 14th?"
    const absenceMap = new Map<string, Set<number>>();
    
    conflictRows.forEach((row: any) => {
        const personId = row["Person"]?.[0]?.id;
        const dates = row["Date"] ? row["Date"].map((d: any) => d.value) : []; // Array of ISO dates
        
        if (personId && dates.length > 0) {
            dates.forEach((dateStr: string) => {
                // Normalize date to YYYY-MM-DD
                const cleanDate = dateStr.split('T')[0];
                if (!absenceMap.has(cleanDate)) absenceMap.set(cleanDate, new Set());
                absenceMap.get(cleanDate)?.add(personId);
            });
        }
    });

    // 2. Calculate "Weekend Viability" (Next 10 Saturdays)
    const weekends = [];
    const today = new Date();
    // Find next Saturday
    const nextSat = new Date(today);
    nextSat.setDate(today.getDate() + (6 - today.getDay()));

    for (let i = 0; i < 10; i++) {
        const d = new Date(nextSat);
        d.setDate(nextSat.getDate() + (i * 7));
        const dateKey = d.toISOString().split('T')[0];
        
        const absentCount = absenceMap.get(dateKey)?.size || 0;
        const totalCast = people.length || 1; // Prevent div/0
        const availability = Math.round(((totalCast - absentCount) / totalCast) * 100);

        weekends.push({ date: d, dateKey, absentCount, availability });
    }

    // 3. Calculate "Scene Difficulty Score"
    // Score = Sum of all conflicts for every actor in this scene
    const sceneScores = scenes.map((scene: any) => {
        // Find actors in this scene
        const rolesInScene = scene.roles || []; // Assuming parent passes hydrated scenes? 
        // If not, we map from assignments like before:
        const sceneAssignments = assignments.filter((a: any) => 
             // This is a rough check, ideally we use the real Scene map from parent
             true 
        ); 
        
        // Let's use a simpler metric if props are raw:
        // We need to know WHICH actors are in this scene. 
        // For this visual report, let's assume we pass in "hydrated" scenes from the parent.
        
        const conflictLoad = scene.actors ? scene.actors.reduce((acc: number, actorId: number) => {
            // Count total conflict dates for this actor
            let actorConflicts = 0;
            absenceMap.forEach((absentSet) => {
                if(absentSet.has(actorId)) actorConflicts++;
            });
            return acc + actorConflicts;
        }, 0) : 0;

        return { ...scene, conflictLoad };
    }).sort((a: any, b: any) => b.conflictLoad - a.conflictLoad); // Descending

    return { weekends, hardestScenes: sceneScores.slice(0, 5) };
  }, [scenes, assignments, people, conflictRows]);


  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
        
        {/* 📅 WEEKEND FORECAST */}
        <div className="col-span-2 bg-zinc-900 border border-white/10 rounded-xl p-4">
            <h3 className="text-xs font-black uppercase tracking-widest text-zinc-500 mb-4 flex items-center gap-2">
                <Calendar size={14} className="text-blue-500"/> 10-Week Availability Forecast
            </h3>
            
            <div className="grid grid-cols-5 gap-2">
                {analytics.weekends.map((wk: any) => {
                    // Color Logic
                    let color = "bg-emerald-500/10 border-emerald-500/30 text-emerald-400";
                    if (wk.availability < 85) color = "bg-amber-500/10 border-amber-500/30 text-amber-400";
                    if (wk.availability < 70) color = "bg-red-500/10 border-red-500/30 text-red-400";

                    return (
                        <div key={wk.dateKey} className={`border rounded p-2 text-center ${color}`}>
                            <div className="text-[10px] font-bold opacity-70 mb-1">
                                {wk.date.toLocaleDateString('en-US', { month: 'numeric', day: 'numeric' })}
                            </div>
                            <div className="text-xl font-black">{wk.availability}%</div>
                            <div className="text-[9px] font-mono opacity-60">
                                {wk.absentCount} Absent
                            </div>
                        </div>
                    );
                })}
            </div>
            <div className="mt-3 flex gap-4 justify-end text-[10px] text-zinc-500 font-medium">
                <span className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-emerald-500"></div> Great for Full Cast</span>
                <span className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-amber-500"></div> Avoid Production Numbers</span>
                <span className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-red-500"></div> Leads / Solos Only</span>
            </div>
        </div>

        {/* ⚠️ HARDEST SCENES */}
        <div className="bg-zinc-900 border border-white/10 rounded-xl p-4">
            <h3 className="text-xs font-black uppercase tracking-widest text-zinc-500 mb-4 flex items-center gap-2">
                <AlertTriangle size={14} className="text-red-500"/> Prioritize These Scenes
            </h3>
            <p className="text-[10px] text-zinc-500 mb-3 italic">
                These scenes involve actors with the most conflicts. Schedule them early on "Green" days.
            </p>

            <div className="space-y-2">
                {analytics.hardestScenes.map((scene: any, i: number) => (
                    <div key={scene.id} className="flex justify-between items-center bg-black/40 p-2 rounded border border-white/5">
                        <div className="flex items-center gap-3">
                            <span className="text-xs font-mono font-bold text-zinc-600">#{i+1}</span>
                            <div>
                                <div className="text-xs font-bold text-zinc-200">{scene.name}</div>
                                <div className="text-[9px] text-zinc-500">{scene.actors?.length || 0} Actors</div>
                            </div>
                        </div>
                        <div className="text-right">
                            <div className="text-xs font-black text-red-400">{scene.conflictLoad}</div>
                            <div className="text-[8px] uppercase font-bold text-zinc-600">Conflict Pts</div>
                        </div>
                    </div>
                ))}
                {analytics.hardestScenes.length === 0 && <div className="text-xs text-zinc-500 italic">No conflict data available.</div>}
            </div>
        </div>
    </div>
  );
}