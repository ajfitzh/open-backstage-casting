"use client";

import React, { useMemo, useState } from 'react';
import { 
    Printer, Info, AlertTriangle, MapPin, 
    Car, ChevronDown, RefreshCw, Users, Edit3,
    Plus, Minus, Mail, Send, Loader2, CheckCircle2, X, CalendarPlus
} from 'lucide-react';
import { previewCallSheet, sendCallSheetEmail } from '@/app/actions/callsheet';

// --- CONSTANTS ---
const GAP_THRESHOLD_HOURS = 2; 

export default function CallboardView({ 
    tenant = "",
    productionId = 0,
    events = [],
    schedule, 
    people = [], // Expecting [{ name: "Austin", gender: "Male" }, ...]
    productionTitle 
}: any) {
    
    // --- STATE: EDITABLE NOTES ---
    const [reminders, setReminders] = useState(`• Drivers <18 cannot leave during lunch.\n• No hanging out in hallways.\n• Bring script, pencil, and water bottle.`);
    const [logistics, setLogistics] = useState(`Friday: 6:00 PM - 9:00 PM @ Main Studio\nSaturday: 10:00 AM - 5:00 PM @ Main Studio`);
    
    // --- STATE: CLEANUP CREW ---
    const [friCrew, setFriCrew] = useState<string[]>([]);
    const [satCrew, setSatCrew] = useState<string[]>([]);
    
    // New: Crew Size Counters (Default to 4)
    const [friCount, setFriCount] = useState(4);
    const [satCount, setSatCount] = useState(4);

    const [expandedActor, setExpandedActor] = useState<string | null>(null);

    // --- STATE: CALL SHEET EMAIL MODAL ---
    const [emailModalOpen, setEmailModalOpen] = useState(false);
    const [selectedEventId, setSelectedEventId] = useState<string>("custom");
    const [customEventTitle, setCustomEventTitle] = useState("Weekly Rehearsal Call Sheet");
    const [customEventDate, setCustomEventDate] = useState(
      () => (events?.[0]?.date || new Date().toISOString().split("T")[0])
    );
    const [customTimeRange, setCustomTimeRange] = useState("Fri 6:00 PM – 9:00 PM / Sat 10:00 AM – 5:00 PM");
    const [previewLoading, setPreviewLoading] = useState(false);
    const [previewData, setPreviewData] = useState<{
      recipientCount: number;
      matchedActorCount: number;
      missingEmailNames: string[];
      conflictAlerts: { name: string; reason: string }[];
    } | null>(null);
    const [sendingEmail, setSendingEmail] = useState(false);
    const [emailFeedback, setEmailFeedback] = useState<{ type: "success" | "error"; message: string } | null>(null);

    // --- 🧠 1. SCHEDULE PROCESSING (THE MERGE ENGINE) ---
    const processedCalls = useMemo(() => {
        const actorMap: Record<string, { fri: any[], sat: any[] }> = {};

        // Group by Actor & Day
        (schedule || []).forEach((slot: any) => {
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
            const calls: any[] | null  = [];
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
        const dayItems = (schedule || []).filter((s:any) => s.day === day);
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

    const renderCall = (calls: any[] | null ) => {
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

    const calledActorNames = useMemo(
        () => processedCalls.map((row) => row.name),
        [processedCalls]
    );

    const calledScenesSummary = useMemo(
        () => Array.from(new Set((schedule || []).map((s: any) => s.sceneName).filter(Boolean))) as string[],
        [schedule]
    );

    const openEmailModal = async () => {
        setEmailModalOpen(true);
        setEmailFeedback(null);
        if (!tenant || !productionId) return;
        setPreviewLoading(true);
        const res = await previewCallSheet(tenant, productionId, calledActorNames, customEventDate);
        setPreviewLoading(false);
        if (res.success) {
            setPreviewData({
                recipientCount: res.recipientCount,
                matchedActorCount: res.matchedActorCount,
                missingEmailNames: res.missingEmailNames,
                conflictAlerts: res.conflictAlerts,
            });
        } else {
            setEmailFeedback({ type: "error", message: res.error || "Could not preview recipients." });
        }
    };

    const handleSelectEvent = async (val: string) => {
        setSelectedEventId(val);
        setEmailFeedback(null);
        let nextDate = customEventDate;
        if (val !== "custom") {
            const ev = (events || []).find((e: any) => String(e.id) === val);
            if (ev) {
                setCustomEventTitle(ev.name || ev.type || "Rehearsal");
                nextDate = ev.date || nextDate;
                setCustomEventDate(nextDate);
                if (ev.startTime || ev.endTime) {
                    setCustomTimeRange(`${ev.startTime || "TBA"} – ${ev.endTime || "TBA"}`);
                }
            }
        }
        if (tenant && productionId) {
            setPreviewLoading(true);
            const res = await previewCallSheet(tenant, productionId, calledActorNames, nextDate);
            setPreviewLoading(false);
            if (res.success) {
                setPreviewData({
                    recipientCount: res.recipientCount,
                    matchedActorCount: res.matchedActorCount,
                    missingEmailNames: res.missingEmailNames,
                    conflictAlerts: res.conflictAlerts,
                });
            }
        }
    };

    const handleSendCallSheet = async () => {
        if (!tenant || !productionId) return;
        setSendingEmail(true);
        setEmailFeedback(null);
        const crewParts: string[] = [];
        if (friCrew.length) crewParts.push(`Fri: ${friCrew.join(", ")}`);
        if (satCrew.length) crewParts.push(`Sat: ${satCrew.join(", ")}`);
        const res = await sendCallSheetEmail({
            tenant,
            productionId,
            productionTitle,
            eventTitle: customEventTitle,
            eventDate: customEventDate,
            timeRange: customTimeRange,
            location: logistics,
            calledNames: calledActorNames,
            scenesSummary: calledScenesSummary,
            reminders,
            cleanupCrew: crewParts.join(" | "),
        });
        setSendingEmail(false);
        if (res.success) {
            setEmailFeedback({
                type: "success",
                message: `Sent call sheet to ${res.sentCount} family email${res.sentCount === 1 ? "" : "s"}${res.conflictCount ? ` (${res.conflictCount} conflict alert${res.conflictCount === 1 ? "" : "s"} included)` : ""}.`,
            });
        } else {
            setEmailFeedback({ type: "error", message: res.error || "Failed to send call sheet." });
        }
    };

    return (
        <div className="flex flex-col h-full bg-zinc-950 text-zinc-200 print:bg-white print:text-black">
            
            {/* TOOLBAR (Hidden on Print) */}
            <div className="p-4 bg-zinc-900 border-b border-white/10 flex flex-wrap justify-between items-center gap-3 print:hidden shrink-0">
                <div>
                    <h2 className="text-lg font-black uppercase text-white tracking-widest flex items-center gap-2">
                        <Info size={18} className="text-blue-500"/> Callboard Generator
                    </h2>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                    {tenant && productionId > 0 && (
                        <>
                            <a
                                href={`/api/calendar?tenant=${encodeURIComponent(tenant)}&productionId=${productionId}`}
                                download
                                className="bg-zinc-800 hover:bg-zinc-700 text-zinc-200 px-3.5 py-2 rounded-lg font-bold text-xs uppercase flex items-center gap-2 transition-all border border-white/10"
                            >
                                <CalendarPlus size={15} className="text-blue-400" /> .ICS Feed
                            </a>
                            <button
                                type="button"
                                onClick={openEmailModal}
                                className="bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-2 rounded-lg font-bold text-xs uppercase flex items-center gap-2 transition-all shadow-lg"
                            >
                                <Mail size={15} /> Email Call Sheet
                            </button>
                        </>
                    )}
                    <button onClick={() => window.print()} className="bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-lg font-bold text-xs uppercase flex items-center gap-2 transition-all">
                        <Printer size={16}/> Print Callboard
                    </button>
                </div>
            </div>

            {/* SCROLLABLE CONTENT */}
            <div className="flex-1 overflow-y-auto custom-scrollbar p-4 sm:p-8 print:p-0 print:overflow-visible">
                
                {/* PRINT HEADER */}
                <div className="hidden print:block mb-6 border-b-2 border-black pb-4">
                    <div className="flex justify-between items-end">
                        <div>
                            <h1 className="text-4xl font-black uppercase">{productionTitle}</h1>
                            <p className="text-lg font-bold text-gray-600">Weekly Callboard</p>
                        </div>
                        <div className="text-right">
                            <p className="text-sm font-bold">{new Date().toLocaleDateString()}</p>
                            <p className="text-xs text-gray-500">Open Backstage</p>
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
                <div className="bg-zinc-900 border border-white/10 rounded-xl overflow-x-auto print:border-2 print:border-black print:rounded-none">
                    <table className="w-full min-w-[540px] text-left border-collapse">
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

            {/* CALL SHEET EMAIL DISPATCH MODAL */}
            {emailModalOpen && (
                <div
                    className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 print:hidden"
                    onClick={() => setEmailModalOpen(false)}
                >
                    <div
                        className="bg-zinc-950 border border-white/15 rounded-3xl w-full max-w-lg overflow-hidden shadow-2xl"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="px-6 py-4 bg-zinc-900 border-b border-white/10 flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <Mail size={18} className="text-emerald-400" />
                                <h3 className="text-sm font-black uppercase tracking-widest text-white">
                                    Send Rehearsal Call Sheet
                                </h3>
                            </div>
                            <button
                                type="button"
                                onClick={() => setEmailModalOpen(false)}
                                className="p-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-white"
                            >
                                <X size={16} />
                            </button>
                        </div>

                        <div className="p-6 space-y-4 max-h-[75vh] overflow-y-auto">
                            {Array.isArray(events) && events.length > 0 && (
                                <div>
                                    <label className="block text-[10px] font-black uppercase tracking-widest text-zinc-400 mb-1.5">
                                        Select Scheduled Event
                                    </label>
                                    <select
                                        value={selectedEventId}
                                        onChange={(e) => void handleSelectEvent(e.target.value)}
                                        className="w-full bg-zinc-900 border border-white/10 rounded-xl px-3.5 py-2.5 text-sm text-white"
                                    >
                                        <option value="custom">Custom Callboard Summary</option>
                                        {events.slice(0, 30).map((ev: any) => (
                                            <option key={ev.id} value={String(ev.id)}>
                                                {ev.date} — {ev.name || ev.type || "Rehearsal"}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            )}

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-[10px] font-black uppercase tracking-widest text-zinc-400 mb-1">
                                        Call Sheet Title
                                    </label>
                                    <input
                                        type="text"
                                        value={customEventTitle}
                                        onChange={(e) => setCustomEventTitle(e.target.value)}
                                        className="w-full bg-zinc-900 border border-white/10 rounded-xl px-3 py-2 text-sm text-white"
                                    />
                                </div>
                                <div>
                                    <label className="block text-[10px] font-black uppercase tracking-widest text-zinc-400 mb-1">
                                        Date
                                    </label>
                                    <input
                                        type="date"
                                        value={customEventDate}
                                        onChange={(e) => setCustomEventDate(e.target.value)}
                                        className="w-full bg-zinc-900 border border-white/10 rounded-xl px-3 py-2 text-sm text-white"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-[10px] font-black uppercase tracking-widest text-zinc-400 mb-1">
                                    Call Times
                                </label>
                                <input
                                    type="text"
                                    value={customTimeRange}
                                    onChange={(e) => setCustomTimeRange(e.target.value)}
                                    className="w-full bg-zinc-900 border border-white/10 rounded-xl px-3 py-2 text-sm text-white"
                                />
                            </div>

                            {/* Recipient & Conflict Preview Box */}
                            <div className="bg-zinc-900 border border-white/10 rounded-2xl p-4 space-y-2.5">
                                {previewLoading ? (
                                    <div className="flex items-center gap-2 text-xs text-zinc-400">
                                        <Loader2 size={14} className="animate-spin text-blue-400" />
                                        Calculating recipients &amp; checking conflicts...
                                    </div>
                                ) : previewData ? (
                                    <>
                                        <div className="flex items-center justify-between">
                                            <span className="text-xs font-bold text-zinc-300">
                                                Target Audience ({calledActorNames.length > 0 ? "Called Cast Only" : "Full Show Cast"})
                                            </span>
                                            <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 text-xs font-black">
                                                {previewData.recipientCount} email{previewData.recipientCount === 1 ? "" : "s"}
                                            </span>
                                        </div>
                                        <p className="text-[11px] text-zinc-500">
                                            Matched {previewData.matchedActorCount} cast member{previewData.matchedActorCount === 1 ? "" : "s"}
                                            {calledScenesSummary.length > 0 ? ` across ${calledScenesSummary.length} called scene(s)` : ""}.
                                        </p>

                                        {previewData.conflictAlerts.length > 0 && (
                                            <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-3 space-y-1">
                                                <p className="text-[11px] font-black uppercase text-amber-400 flex items-center gap-1.5">
                                                    <AlertTriangle size={12} /> {previewData.conflictAlerts.length} Conflict Flag(s) on {customEventDate}
                                                </p>
                                                <ul className="text-xs text-amber-200/90 space-y-0.5 list-disc pl-4">
                                                    {previewData.conflictAlerts.slice(0, 6).map((c, idx) => (
                                                        <li key={idx}><strong>{c.name}</strong> — {c.reason}</li>
                                                    ))}
                                                </ul>
                                            </div>
                                        )}

                                        {previewData.missingEmailNames.length > 0 && (
                                            <p className="text-[11px] text-zinc-500">
                                                Missing email on file: {previewData.missingEmailNames.slice(0, 4).join(", ")}
                                                {previewData.missingEmailNames.length > 4 ? ` +${previewData.missingEmailNames.length - 4} more` : ""}
                                            </p>
                                        )}
                                    </>
                                ) : null}
                            </div>

                            {emailFeedback && (
                                <div
                                    className={`p-3.5 rounded-xl border text-xs font-bold flex items-center gap-2 ${
                                        emailFeedback.type === "success"
                                            ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-300"
                                            : "bg-red-500/10 border-red-500/30 text-red-300"
                                    }`}
                                >
                                    {emailFeedback.type === "success" ? <CheckCircle2 size={15} /> : <AlertTriangle size={15} />}
                                    {emailFeedback.message}
                                </div>
                            )}
                        </div>

                        <div className="px-6 py-4 bg-zinc-900/60 border-t border-white/10 flex justify-end gap-2">
                            <button
                                type="button"
                                onClick={() => setEmailModalOpen(false)}
                                className="px-4 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-xs font-bold text-zinc-300"
                            >
                                Close
                            </button>
                            <button
                                type="button"
                                disabled={sendingEmail || !previewData || previewData.recipientCount === 0}
                                onClick={handleSendCallSheet}
                                className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 text-white text-xs font-black uppercase tracking-widest flex items-center gap-2"
                            >
                                {sendingEmail ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
                                {sendingEmail ? "Sending..." : "Send Call Sheet Now"}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}