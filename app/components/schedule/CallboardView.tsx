"use client";

import React, { useMemo, useState } from 'react';
import { 
    Printer, Info, AlertTriangle, MapPin, 
    Car, ChevronDown, RefreshCw, Users, Eraser, Edit3,
    Plus, Minus 
} from 'lucide-react';

// --- CONSTANTS ---
const GAP_THRESHOLD_HOURS = 2; 

export default function CallboardView({ 
    schedule, 
    people = [], // Expecting [{ name: "Austin", gender: "Male" }, ...]
    productionTitle 
}: any) {
    
    // --- STATE: EDITABLE NOTES ---
    const [reminders, setReminders] = useState(`• Drivers <18 cannot leave during lunch.\n• No hanging out in hallways.\n• Hair/Makeup: Check in with Ms. Tiffany this Saturday.`);
    const [logistics, setLogistics] = useState(`Friday: 6:00 PM - 9:00 PM @ CYT Studio\nSaturday: 10:00 AM - 5:00 PM @ CYT Studio`);
    
    // --- STATE: CLEANUP CREW ---
    const [friCrew, setFriCrew] = useState<string[]>([]);
    const [satCrew, setSatCrew] = useState<string[]>([]);
    
    // New: Crew Size Counters (Default to 4)
    const [friCount, setFriCount] = useState(4);
    const [satCount, setSatCount] = useState(4);

    const [expandedActor, setExpandedActor] = useState<string | null>(null);

    // --- 🧠 1. SCHEDULE PROCESSING (THE MERGE ENGINE) ---
    const processedCalls = useMemo(() => {
        const actorMap: Record<string, { fri: any[], sat: any[] }> = {};

        // Group by Actor & Day
        schedule.forEach((slot: any) => {
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

        // Merge Logic
        const processDay = (slots: any[]) => {
            if (slots.length === 0) return null;
            slots.sort((a, b) => a.start - b.start);
            const calls: any[] = [];
            let currentCall = { start: slots[0].start, end: slots[0].end, segments: [slots[0]] };

            for (let i = 1; i < slots.length; i++) {
                const next = slots[i];
                if ((next.start - currentCall.end) < GAP_THRESHOLD_HOURS) {
                    currentCall.end = Math.max(currentCall.end, next.end);
                    currentCall.segments.push(next);
                } else {
                    calls.push(currentCall);
                    currentCall = { start: next.start, end: next.end, segments: [next] };
                }
            }
            calls.push(currentCall);
            return calls;
        };

        return Object.entries(actorMap).map(([name, days]) => ({
            name,
            fri: processDay(days.fri),
            sat: processDay(days.sat)
        })).sort((a, b) => a.name.localeCompare(b.name));
    }, [schedule]);

    // --- 🧠 2. CLEANUP CREW GENERATOR (UPDATED) ---
    const generateCrew = (day: 'Fri' | 'Sat', limit: number) => {
        // A. Find the "End of the Night" time
        const dayItems = schedule.filter((s:any) => s.day === day);
        if (dayItems.length === 0) return [];
        
        // Find the absolute latest end time in the schedule
        const maxEnd = Math.max(...dayItems.map((s:any) => s.startTime + (s.duration/60)));
        
        // B. Find everyone working a slot that ends at (or very near) that time
        const candidates = new Set<string>();
        dayItems.forEach((s:any) => {
            const end = s.startTime + (s.duration/60);
            // If they are called within 15 mins of the very end, they are eligible
            if (Math.abs(maxEnd - end) < 0.25 && s.castList) {
                s.castList.forEach((name: string) => candidates.add(name));
            }
        });

        const pool = Array.from(candidates);
        if (pool.length === 0) return ["No one called till end"];

        // C. Gender Logic (Attempt Balance based on Limit)
        const boys = pool.filter(name => people.find((p:any) => p.name === name && p.gender === 'Male'));
        const girls = pool.filter(name => people.find((p:any) => p.name === name && p.gender === 'Female'));
        const unknown = pool.filter(name => !people.find((p:any) => p.name === name));

        const crew: string[] = [];
        
        // Pick Boys (Aim for 50% of the total limit)
        const targetBoys = Math.ceil(limit / 2);
        const shuffledBoys = boys.sort(() => 0.5 - Math.random());
        crew.push(...shuffledBoys.slice(0, targetBoys));

        // Fill remaining spots (up to limit) with Girls/Unknown
        const remainingSpots = limit - crew.length;
        if (remainingSpots > 0) {
            const others = [...girls, ...unknown].sort(() => 0.5 - Math.random());
            crew.push(...others.slice(0, remainingSpots));
        }

        return crew;
    };

    // --- HELPERS ---
    const formatTime = (t: number) => {
        const h = Math.floor(t);
        const m = Math.round((t % 1) * 60).toString().padStart(2, '0');
        const suffix = h >= 12 ? 'PM' : 'AM';
        const h12 = h > 12 ? h - 12 : h;
        return `${h12}:${m}${suffix}`;
    };

    const renderCall = (calls: any[]) => {
        if (!calls) return <span className="text-zinc-600/30 text-[10px] italic">No Call</span>;
        return calls.map((call, i) => (
            <div key={i} className="flex flex-col">
                <span className="font-bold text-zinc-300 bg-zinc-800/50 px-2 py-0.5 rounded border border-white/5 inline-block w-fit mb-1 print:text-black print:border-black print:bg-transparent">
                    {formatTime(call.start)} - {formatTime(call.end)}
                </span>
                {calls.length > 1 && i < calls.length - 1 && (
                    <span className="text-[10px] text-amber-500 font-bold my-1 flex items-center gap-1 print:text-black">
                        <Car size={10}/> Break: {(calls[i+1].start - call.end).toFixed(1)}hr
                    </span>
                )}
            </div>
        ));
    };

    return (
        <div className="flex flex-col h-full bg-zinc-950 text-zinc-200 print:bg-white print:text-black">
            
            {/* TOOLBAR (Hidden on Print) */}
            <div className="p-4 bg-zinc-900 border-b border-white/10 flex justify-between items-center print:hidden shrink-0">
                <div>
                    <h2 className="text-lg font-black uppercase text-white tracking-widest flex items-center gap-2">
                        <Info size={18} className="text-blue-500"/> Callboard Generator
                    </h2>
                </div>
                <button onClick={() => window.print()} className="bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-lg font-bold text-xs uppercase flex items-center gap-2 transition-all">
                    <Printer size={16}/> Print Callboard
                </button>
            </div>

            {/* SCROLLABLE CONTENT */}
            <div className="flex-1 overflow-y-auto custom-scrollbar p-8 print:p-0 print:overflow-visible">
                
                {/* PRINT HEADER */}
                <div className="hidden print:block mb-6 border-b-2 border-black pb-4">
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
                <div className="mb-6 grid grid-cols-1 md:grid-cols-2 gap-6 print:grid-cols-2 print:gap-4">
                    
                    {/* EDITABLE REMINDERS */}
                    <div className="bg-amber-900/10 border border-amber-500/20 p-4 rounded-xl print:border-black print:bg-gray-50 relative group">
                        <h3 className="text-amber-500 font-black uppercase text-xs tracking-widest mb-2 flex items-center gap-2 print:text-black">
                            <AlertTriangle size={14}/> Important Reminders
                        </h3>
                        <textarea 
                            value={reminders}
                            onChange={(e) => setReminders(e.target.value)}
                            className="w-full bg-transparent text-sm text-zinc-300 print:text-black resize-none focus:outline-none min-h-[100px] leading-relaxed whitespace-pre-wrap"
                        />
                        <Edit3 className="absolute top-4 right-4 text-amber-500/50 opacity-0 group-hover:opacity-100 transition-opacity print:hidden" size={14} />
                    </div>

                    {/* EDITABLE LOGISTICS */}
                    <div className="bg-blue-900/10 border border-blue-500/20 p-4 rounded-xl print:border-black print:bg-gray-50 relative group">
                        <h3 className="text-blue-400 font-black uppercase text-xs tracking-widest mb-2 flex items-center gap-2 print:text-black">
                            <MapPin size={14}/> Location & Logistics
                        </h3>
                         <textarea 
                            value={logistics}
                            onChange={(e) => setLogistics(e.target.value)}
                            className="w-full bg-transparent text-sm text-zinc-300 print:text-black resize-none focus:outline-none min-h-[60px] leading-relaxed whitespace-pre-wrap"
                        />
                        <Edit3 className="absolute top-4 right-4 text-blue-500/50 opacity-0 group-hover:opacity-100 transition-opacity print:hidden" size={14} />
                        
                        {/* CLEANUP CREW WIDGET */}
                        <div className="mt-4 pt-4 border-t border-blue-500/20 print:border-gray-400">
                             <h4 className="text-[10px] font-black uppercase text-zinc-500 mb-2 flex items-center gap-2 print:text-black">
                                <Users size={12}/> Cleanup Crew (End of Night)
                             </h4>
                             <div className="space-y-2">
                                
                                {/* FRIDAY CREW */}
                                <div className="flex items-center gap-2 text-xs">
                                    <span className="font-bold w-8 text-zinc-400 print:text-black">FRI:</span>
                                    
                                    {/* TOGGLE CONTROL (Hidden on Print) */}
                                    <div className="flex items-center bg-black/30 rounded border border-white/5 print:hidden">
                                        <button onClick={() => setFriCount(c => Math.max(1, c-1))} className="p-1 hover:text-white text-zinc-500"><Minus size={10}/></button>
                                        <span className="w-5 text-center font-mono text-[10px]">{friCount}</span>
                                        <button onClick={() => setFriCount(c => c+1)} className="p-1 hover:text-white text-zinc-500"><Plus size={10}/></button>
                                    </div>

                                    {friCrew.length > 0 ? (
                                        <span className="text-zinc-200 print:text-black flex-1 ml-1">{friCrew.join(", ")}</span>
                                    ) : (
                                        <span className="text-zinc-600 italic flex-1 ml-1">Not assigned</span>
                                    )}
                                    <button onClick={() => setFriCrew(generateCrew('Fri', friCount))} className="p-1 hover:bg-white/10 rounded text-blue-400 print:hidden" title="Auto-Assign Friday">
                                        <RefreshCw size={12}/>
                                    </button>
                                </div>
                                
                                {/* SATURDAY CREW */}
                                <div className="flex items-center gap-2 text-xs">
                                    <span className="font-bold w-8 text-zinc-400 print:text-black">SAT:</span>
                                    
                                    {/* TOGGLE CONTROL (Hidden on Print) */}
                                    <div className="flex items-center bg-black/30 rounded border border-white/5 print:hidden">
                                        <button onClick={() => setSatCount(c => Math.max(1, c-1))} className="p-1 hover:text-white text-zinc-500"><Minus size={10}/></button>
                                        <span className="w-5 text-center font-mono text-[10px]">{satCount}</span>
                                        <button onClick={() => setSatCount(c => c+1)} className="p-1 hover:text-white text-zinc-500"><Plus size={10}/></button>
                                    </div>

                                    {satCrew.length > 0 ? (
                                        <span className="text-zinc-200 print:text-black flex-1 ml-1">{satCrew.join(", ")}</span>
                                    ) : (
                                        <span className="text-zinc-600 italic flex-1 ml-1">Not assigned</span>
                                    )}
                                    <button onClick={() => setSatCrew(generateCrew('Sat', satCount))} className="p-1 hover:bg-white/10 rounded text-blue-400 print:hidden" title="Auto-Assign Saturday">
                                        <RefreshCw size={12}/>
                                    </button>
                                </div>
                             </div>
                        </div>
                    </div>
                </div>

                {/* THE TABLE */}
                <div className="bg-zinc-900 border border-white/10 rounded-xl overflow-hidden print:border-2 print:border-black print:rounded-none">
                    <table className="w-full text-left border-collapse">
                        <thead className="bg-zinc-800 text-zinc-400 text-[10px] font-black uppercase tracking-widest print:bg-gray-200 print:text-black print:border-b-2 print:border-black">
                            <tr>
                                <th className="p-3 border-b border-white/5 print:border-black w-1/3">Cast Member</th>
                                <th className="p-3 border-b border-white/5 print:border-black w-1/3">Friday Call</th>
                                <th className="p-3 border-b border-white/5 print:border-black w-1/3">Saturday Call</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5 print:divide-gray-300">
                            {processedCalls.map((row) => (
                                <React.Fragment key={row.name}>
                                    <tr 
                                        className="group hover:bg-zinc-800/50 transition-colors cursor-pointer print:hover:bg-transparent"
                                        onClick={() => setExpandedActor(expandedActor === row.name ? null : row.name)}
                                    >
                                        <td className="p-3 font-bold text-sm text-zinc-300 print:text-black flex items-center gap-2">
                                            {row.name}
                                            <ChevronDown size={14} className={`text-zinc-600 transition-transform print:hidden ${expandedActor === row.name ? 'rotate-180' : ''}`}/>
                                        </td>
                                        <td className="p-3 text-xs font-mono text-zinc-400 print:text-black">
                                            {renderCall(row.fri)}
                                        </td>
                                        <td className="p-3 text-xs font-mono text-zinc-400 print:text-black">
                                            {renderCall(row.sat)}
                                        </td>
                                    </tr>
                                    
                                    {/* EXPANDED DETAILS (Visible on screen for checking specific scenes) */}
                                    {expandedActor === row.name && (
                                        <tr className="bg-black/40 print:hidden">
                                            <td colSpan={3} className="p-3 pl-8 border-t border-white/5 shadow-inner">
                                                <div className="grid grid-cols-2 gap-8">
                                                    <div>
                                                        <h4 className="text-[10px] font-black uppercase text-zinc-500 mb-2">Friday Breakdown</h4>
                                                        {row.fri ? row.fri.flatMap((c:any) => c.segments).map((s:any, i:number) => (
                                                            <div key={i} className="flex justify-between text-xs text-zinc-400 py-1 border-b border-white/5 last:border-0">
                                                                <span>{formatTime(s.startTime)} - {s.sceneName}</span>
                                                                <span className={`text-[9px] px-1 rounded uppercase font-bold
                                                                    ${s.type === 'Dance' ? 'text-emerald-400 bg-emerald-950/30' : 
                                                                      s.type === 'Music' ? 'text-pink-400 bg-pink-950/30' : 
                                                                      'text-blue-400 bg-blue-950/30'}`}>
                                                                    {s.type}
                                                                </span>
                                                            </div>
                                                        )) : <span className="text-xs italic text-zinc-600">None</span>}
                                                    </div>
                                                    <div>
                                                        <h4 className="text-[10px] font-black uppercase text-zinc-500 mb-2">Saturday Breakdown</h4>
                                                        {row.sat ? row.sat.flatMap((c:any) => c.segments).map((s:any, i:number) => (
                                                            <div key={i} className="flex justify-between text-xs text-zinc-400 py-1 border-b border-white/5 last:border-0">
                                                                <span>{formatTime(s.startTime)} - {s.sceneName}</span>
                                                                 <span className={`text-[9px] px-1 rounded uppercase font-bold
                                                                    ${s.type === 'Dance' ? 'text-emerald-400 bg-emerald-950/30' : 
                                                                      s.type === 'Music' ? 'text-pink-400 bg-pink-950/30' : 
                                                                      'text-blue-400 bg-blue-950/30'}`}>
                                                                    {s.type}
                                                                </span>
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