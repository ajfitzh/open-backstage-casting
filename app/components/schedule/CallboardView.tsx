"use client";

import React, { useMemo, useState } from 'react';
import { 
    Printer, Clock, AlertTriangle, Car, 
    ChevronDown, ChevronUp, MapPin, Info
} from 'lucide-react';

// --- CONFIG ---
const GAP_THRESHOLD_HOURS = 2; // Split call if gap is > 2 hours

export default function CallboardView({ schedule, productionTitle, generalNotes }: any) {
    const [expandedActor, setExpandedActor] = useState<string | null>(null);

    // --- 🧠 THE MERGE ENGINE ---
    const processedCalls = useMemo(() => {
        const actorMap: Record<string, { fri: any[], sat: any[] }> = {};

        // 1. Group by Actor & Day
        schedule.forEach((slot: any) => {
            // Assume we can get actor names from the slot (in a real app, you'd join with the People table)
            // For this demo, we assume the scheduler saves "castNames" or we derived it.
            // Let's assume the schedule items have a 'castList' array attached for this view.
            if (!slot.castList) return; 

            slot.castList.forEach((actorName: string) => {
                if (!actorMap[actorName]) actorMap[actorName] = { fri: [], sat: [] };
                const target = slot.day === 'Fri' ? actorMap[actorName].fri : actorMap[actorName].sat;
                
                target.push({
                    start: slot.startTime,
                    end: slot.startTime + (slot.duration / 60),
                    scene: slot.sceneName,
                    type: slot.track
                });
            });
        });

        // 2. Sort & Merge Logic
        const processDay = (slots: any[]) => {
            if (slots.length === 0) return null;
            slots.sort((a, b) => a.start - b.start);

            const calls: any[] = [];
            let currentCall = { 
                start: slots[0].start, 
                end: slots[0].end, 
                segments: [slots[0]] 
            };

            for (let i = 1; i < slots.length; i++) {
                const next = slots[i];
                const gap = next.start - currentCall.end;

                // IF gap is small (< 2 hours), merge it (keep them in building)
                if (gap < GAP_THRESHOLD_HOURS) {
                    currentCall.end = Math.max(currentCall.end, next.end);
                    currentCall.segments.push(next);
                } else {
                    // IF gap is huge, push current call and start a new one (Split Call)
                    calls.push(currentCall);
                    currentCall = { 
                        start: next.start, 
                        end: next.end, 
                        segments: [next] 
                    };
                }
            }
            calls.push(currentCall);
            return calls;
        };

        const result = Object.entries(actorMap).map(([name, days]) => ({
            name,
            fri: processDay(days.fri),
            sat: processDay(days.sat)
        })).sort((a, b) => a.name.localeCompare(b.name));

        return result;
    }, [schedule]);


    // --- HELPERS ---
    const formatTime = (t: number) => {
        const h = Math.floor(t);
        const m = Math.round((t % 1) * 60).toString().padStart(2, '0');
        const suffix = h >= 12 ? 'PM' : 'AM';
        const h12 = h > 12 ? h - 12 : h;
        return `${h12}:${m}${suffix}`;
    };

    const renderCall = (calls: any[]) => {
        if (!calls) return <span className="text-zinc-500 italic">No Call</span>;
        
        return calls.map((call, i) => (
            <div key={i} className="flex flex-col">
                <span className="font-bold text-white bg-zinc-800 px-2 py-1 rounded border border-white/5 inline-block w-fit mb-1">
                    {formatTime(call.start)} - {formatTime(call.end)}
                </span>
                {calls.length > 1 && i < calls.length - 1 && (
                    <span className="text-[10px] text-amber-500 font-bold my-1 flex items-center gap-1">
                        <Car size={10}/> Split Call (Break: {(calls[i+1].start - call.end).toFixed(1)} hrs)
                    </span>
                )}
            </div>
        ));
    };

    return (
        <div className="flex flex-col h-full">
            
            {/* TOOLBAR (Hidden on Print) */}
            <div className="p-4 bg-zinc-900 border-b border-white/10 flex justify-between items-center print:hidden">
                <div>
                    <h2 className="text-lg font-black uppercase text-white tracking-widest flex items-center gap-2">
                        <Info size={18} className="text-blue-500"/> Weekly Callboard
                    </h2>
                    <p className="text-xs text-zinc-500">Auto-generated based on current schedule</p>
                </div>
                <button onClick={() => window.print()} className="bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-lg font-bold text-xs uppercase flex items-center gap-2 transition-all">
                    <Printer size={16}/> Print for Parents
                </button>
            </div>

            {/* SCROLLABLE CONTENT */}
            <div className="flex-1 overflow-y-auto custom-scrollbar p-8 print:p-0 print:overflow-visible bg-zinc-950 print:bg-white">
                
                {/* PRINT HEADER */}
                <div className="hidden print:block mb-8 border-b-2 border-black pb-4">
                    <div className="flex justify-between items-end">
                        <div>
                            <h1 className="text-4xl font-black uppercase">{productionTitle}</h1>
                            <p className="text-lg font-bold text-gray-600">Weekly Callboard</p>
                        </div>
                        <div className="text-right">
                            <p className="text-sm font-bold">{new Date().toLocaleDateString()}</p>
                            <p className="text-xs text-gray-500">cytfred.org</p>
                        </div>
                    </div>
                </div>

                {/* NOTICES SECTION */}
                <div className="mb-8 grid grid-cols-1 md:grid-cols-2 gap-6 print:grid-cols-2 print:gap-4">
                    <div className="bg-amber-900/10 border border-amber-500/20 p-4 rounded-xl print:border-gray-300 print:bg-gray-50">
                        <h3 className="text-amber-500 font-black uppercase text-xs tracking-widest mb-2 flex items-center gap-2 print:text-black">
                            <AlertTriangle size={14}/> Important Reminders
                        </h3>
                        <ul className="text-xs text-zinc-300 space-y-2 print:text-black list-disc pl-4">
                            <li>Drivers &lt;18 cannot leave during lunch but CAN leave if break &gt; 2 hours (with permission).</li>
                            <li>No hanging out in hallways or costume areas.</li>
                            <li><strong>Hair/Makeup:</strong> Check in with Ms. Tiffany this Saturday during lunch.</li>
                        </ul>
                    </div>

                    <div className="bg-blue-900/10 border border-blue-500/20 p-4 rounded-xl print:border-gray-300 print:bg-gray-50">
                        <h3 className="text-blue-400 font-black uppercase text-xs tracking-widest mb-2 flex items-center gap-2 print:text-black">
                            <MapPin size={14}/> Location & Logistics
                        </h3>
                        <div className="text-xs text-zinc-300 space-y-1 print:text-black">
                            <p><strong className="text-white print:text-black">Friday:</strong> 6:00 PM - 9:00 PM @ CYT Studio</p>
                            <p><strong className="text-white print:text-black">Saturday:</strong> 10:00 AM - 5:00 PM @ CYT Studio</p>
                            <p className="mt-2 text-zinc-500 print:text-gray-600 italic">Cleanup Crew: Ellie C, Sandi D, Chance H, Riley H.</p>
                        </div>
                    </div>
                </div>

                {/* THE TABLE */}
                <div className="bg-zinc-900 border border-white/10 rounded-xl overflow-hidden print:border-2 print:border-black print:rounded-none">
                    <table className="w-full text-left border-collapse">
                        <thead className="bg-zinc-800 text-zinc-400 text-[10px] font-black uppercase tracking-widest print:bg-gray-200 print:text-black print:border-b-2 print:border-black">
                            <tr>
                                <th className="p-4 border-b border-white/5 print:border-black">Cast Member</th>
                                <th className="p-4 border-b border-white/5 print:border-black">Friday Call</th>
                                <th className="p-4 border-b border-white/5 print:border-black">Saturday Call</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5 print:divide-gray-300">
                            {processedCalls.map((row) => (
                                <React.Fragment key={row.name}>
                                    <tr 
                                        className="group hover:bg-zinc-800/50 transition-colors cursor-pointer print:hover:bg-transparent"
                                        onClick={() => setExpandedActor(expandedActor === row.name ? null : row.name)}
                                    >
                                        <td className="p-4 font-bold text-sm text-zinc-200 print:text-black flex items-center gap-2">
                                            {row.name}
                                            <ChevronDown size={14} className={`text-zinc-600 transition-transform print:hidden ${expandedActor === row.name ? 'rotate-180' : ''}`}/>
                                        </td>
                                        <td className="p-4 text-xs font-mono text-zinc-400 print:text-black">
                                            {renderCall(row.fri)}
                                        </td>
                                        <td className="p-4 text-xs font-mono text-zinc-400 print:text-black">
                                            {renderCall(row.sat)}
                                        </td>
                                    </tr>
                                    
                                    {/* EXPANDED DETAILS (Hidden on Print usually, but you might want to toggle this) */}
                                    {expandedActor === row.name && (
                                        <tr className="bg-zinc-950/50 print:hidden">
                                            <td colSpan={3} className="p-4 pl-8 border-t border-white/5 shadow-inner">
                                                <div className="grid grid-cols-2 gap-8">
                                                    <div>
                                                        <h4 className="text-[10px] font-black uppercase text-zinc-500 mb-2">Friday Breakdown</h4>
                                                        {row.fri ? row.fri.flatMap((c:any) => c.segments).map((s:any, i:number) => (
                                                            <div key={i} className="flex justify-between text-xs text-zinc-400 py-1 border-b border-white/5">
                                                                <span>{formatTime(s.startTime)} - {s.sceneName}</span>
                                                                <span className="text-[9px] bg-zinc-800 px-1 rounded uppercase">{s.type}</span>
                                                            </div>
                                                        )) : <span className="text-xs italic text-zinc-600">None</span>}
                                                    </div>
                                                    <div>
                                                        <h4 className="text-[10px] font-black uppercase text-zinc-500 mb-2">Saturday Breakdown</h4>
                                                        {row.sat ? row.sat.flatMap((c:any) => c.segments).map((s:any, i:number) => (
                                                            <div key={i} className="flex justify-between text-xs text-zinc-400 py-1 border-b border-white/5">
                                                                <span>{formatTime(s.startTime)} - {s.sceneName}</span>
                                                                <span className="text-[9px] bg-zinc-800 px-1 rounded uppercase">{s.type}</span>
                                                            </div>
                                                        )) : <span className="text-xs italic text-zinc-600">None</span>}
                                                    </div>
                                                </div>
                                            </td>
                                        </tr>
                                    )}
                                </React.Fragment>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}