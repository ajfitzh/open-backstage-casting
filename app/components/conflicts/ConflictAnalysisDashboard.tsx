"use client";

import React, { useMemo } from 'react';
import { Calendar, Clock, Users, CheckCircle2 } from 'lucide-react';

interface Props {
  conflicts: any[]; 
  events: any[];    
  castSize: number; 
}

export default function ConflictAnalysisDashboard({ conflicts = [], events = [], castSize = 0 }: Props) {
  
  const analytics = useMemo(() => {
    // 1. Sort Events Chronologically
    const sortedEvents = [...events].sort((a: any, b: any) => new Date(a.date).getTime() - new Date(b.date).getTime());
    
    // 2. Map Conflicts to specific Event IDs
    const eventConflictMap = new Map<number, Set<number>>();
    conflicts.forEach((c: any) => {
        if (c.eventId && c.personId) {
            if (!eventConflictMap.has(c.eventId)) eventConflictMap.set(c.eventId, new Set());
            eventConflictMap.get(c.eventId)?.add(c.personId);
        }
    });

    // 3. Build Event Objects
    const processedEvents = sortedEvents.map((evt: any) => {
        // Parse date safely, correcting for timezone shifts
        const [year, month, day] = evt.date.split('-');
        const dateObj = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
        
        const absentees = eventConflictMap.get(evt.id) || new Set();
        const absentCount = absentees.size;
        const availability = castSize > 0 ? Math.round(((castSize - absentCount) / castSize) * 100) : 100;
        
        const formatTime = (t: string) => {
            if(!t) return "";
            const d = t.includes('T') ? new Date(t) : new Date(`1970-01-01T${t}`);
            return d.toLocaleTimeString([], {hour: 'numeric', minute:'2-digit'});
        };

        return {
            id: evt.id,
            label: dateObj.toLocaleDateString('en-US', { weekday: 'short' }),
            date: dateObj.toLocaleDateString('en-US', { month: 'numeric', day: 'numeric' }),
            fullDate: dateObj,
            time: `${formatTime(evt.startTime)} - ${formatTime(evt.endTime)}`,
            type: evt.type || "Rehearsal",
            absentCount,
            availability,
            weekNum: getWeekNumber(dateObj) 
        };
    });

    // 4. Group by Week
    const groupedWeeks: any[] = [];
    let currentWeek: any[] = [];
    let lastWeekNum = -1;
    
    processedEvents.forEach((evt: any) => {
        if (evt.weekNum !== lastWeekNum && currentWeek.length > 0) {
            groupedWeeks.push(currentWeek);
            currentWeek = [];
        }
        currentWeek.push(evt);
        lastWeekNum = evt.weekNum;
    });
    if (currentWeek.length > 0) groupedWeeks.push(currentWeek);
    
    return { weeks: groupedWeeks };
  }, [conflicts, events, castSize]);

  return (
    <div className="bg-zinc-900 border border-white/10 rounded-xl flex flex-col overflow-hidden shadow-xl max-h-[300px] mb-6">
        <div className="p-4 border-b border-white/10 bg-zinc-900 z-10 flex justify-between items-center shadow-sm">
            <h3 className="text-sm font-black uppercase tracking-widest text-zinc-400 flex items-center gap-2">
                <Calendar size={16} className="text-blue-500"/> Rehearsal Attendance Forecast
            </h3>
        </div>
        
        <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar bg-zinc-950/50">
            {analytics.weeks.length === 0 && <div className="text-zinc-500 italic text-sm p-4">No events found linked to this production.</div>}
            
            {analytics.weeks.map((weekEvents: any[], i: number) => (
                <div key={i} className="animate-in fade-in slide-in-from-bottom-2 duration-500" style={{animationDelay: `${i * 50}ms`}}>
                    <div className="flex items-center gap-2 mb-2 ml-1">
                        <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">
                            Week of {weekEvents[0].fullDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                        </span>
                        {weekEvents.length > 4 && <span className="text-[9px] bg-purple-500/10 text-purple-400 border border-purple-500/20 px-1.5 rounded uppercase font-bold tracking-wider">Heavy Week</span>}
                    </div>
                    
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2">
                        {weekEvents.map((evt: any) => {
                            let color = "bg-emerald-900/10 border-emerald-500/20 hover:border-emerald-500/50";
                            let textC = "text-emerald-500";
                            let barC = "bg-emerald-500";
                            
                            if (evt.availability < 90) { color = "bg-amber-900/10 border-amber-500/20"; textC = "text-amber-500"; barC = "bg-amber-500"; }
                            if (evt.availability < 75) { color = "bg-red-900/10 border-red-500/20"; textC = "text-red-500"; barC = "bg-red-500"; }
                            
                            return (
                                <div key={evt.id} className={`border rounded-lg p-2.5 relative overflow-hidden group transition-all ${color}`}>
                                    <div className="flex justify-between items-start mb-2 relative z-10">
                                        <div>
                                            <div className="text-xs font-black text-zinc-300 uppercase">{evt.label}</div>
                                            <div className="text-[10px] text-zinc-500 font-bold">{evt.date}</div>
                                        </div>
                                        <div className={`text-[9px] font-bold px-1.5 py-0.5 rounded bg-black/40 ${textC}`}>{evt.availability}%</div>
                                    </div>
                                    <div className="relative z-10">
                                        <div className="text-[9px] text-zinc-500 flex items-center gap-1 mb-1.5"><Clock size={10}/> {evt.time.split(' ')[0]}</div>
                                        {evt.absentCount > 0 ? (
                                            <div className="text-[10px] font-bold text-zinc-400 flex items-center gap-1"><Users size={10} className={textC}/> {evt.absentCount} Missing</div>
                                        ) : (
                                            <div className="text-[10px] font-bold text-zinc-600 flex items-center gap-1"><CheckCircle2 size={10} className="text-emerald-600"/> Full Cast</div>
                                        )}
                                    </div>
                                    <div className={`absolute bottom-0 left-0 h-0.5 w-full ${barC} opacity-50`}/>
                                </div>
                            )
                        })}
                    </div>
                </div>
            ))}
        </div>
    </div>
  );
}

function getWeekNumber(d: Date) {
    const date = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
    date.setUTCDate(date.getUTCDate() + 4 - (date.getUTCDay()||7));
    const yearStart = new Date(Date.UTC(date.getUTCFullYear(),0,1));
    return Math.ceil((((date.getTime() - yearStart.getTime()) / 86400000) + 1)/7);
}
