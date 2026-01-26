"use client";

import React, { useState, useMemo } from 'react';
import { 
    Wand2, X, CheckCircle2, 
    Calendar, Users, Loader2,
    Clock, Layers, Music, Mic2, Theater,
    ArrowUp, ArrowDown, Timer, TrendingUp, AlertTriangle, Gauge,
    Printer, FileText
} from 'lucide-react';

// --- CONFIGURATION ---
const FRI_START = 18; 
const FRI_END = 21;   
const SAT_START = 10; 
const SAT_END = 17;   
const TARGET_WEEK = 8; 
const CURRENT_WEEK = 4;
const TOTAL_WEEKS = 10;

// --- TYPES ---
interface ScheduleStats {
    totalSlots: number;
    uniqueActors: number;
    concurrency: number; 
    conflictsAvoided: number;
    pointsCleared: number;
    velocityTarget: number;
    isOnTrack: boolean;
}

type TrackType = "Acting" | "Music" | "Dance";

export default function AutoSchedulerModal({ isOpen, onClose, scenes, people, onCommit }: any) {
    const [isGenerating, setIsGenerating] = useState(false);
    const [previewSchedule, setPreviewSchedule] = useState<any[]>([]);
    const [stats, setStats] = useState<ScheduleStats | null>(null);
    const [viewMode, setViewMode] = useState<'schedule' | 'callboard'>('schedule');

    // ⚡️ CONTROLS
    const [trackPriority, setTrackPriority] = useState<TrackType[]>(['Music', 'Dance', 'Acting']);
    const [slotDuration, setSlotDuration] = useState(30);
    const [blackoutWeeks, setBlackoutWeeks] = useState(0); 
    const [simulatedExtra, setSimulatedExtra] = useState(0); 

    // --- HELPER: Move items up/down ---
    const movePriority = (index: number, direction: 'up' | 'down') => {
        const newOrder = [...trackPriority];
        if (direction === 'up') {
            if (index === 0) return;
            [newOrder[index - 1], newOrder[index]] = [newOrder[index], newOrder[index - 1]];
        } else {
            if (index === newOrder.length - 1) return;
            [newOrder[index + 1], newOrder[index]] = [newOrder[index], newOrder[index + 1]];
        }
        setTrackPriority(newOrder);
    };

    // --- 🧮 ALGORITHM (Unchanged) ---
    const generateSchedule = () => {
        setIsGenerating(true);
        // ... (Same logic as before, abbreviated for clarity)
        // ...
        
        // 1. Setup Time Slots
        const timeSlots: { day: 'Fri' | 'Sat', time: number }[] = [];
        const increment = slotDuration / 60;
        for (let t = FRI_START; t < FRI_END; t += increment) timeSlots.push({ day: 'Fri', time: t });
        for (let t = SAT_START; t < SAT_END; t += increment) {
            if (t >= 13 && t < 14) continue; 
            timeSlots.push({ day: 'Sat', time: t });
        }

        const proposedSchedule: any[] = [];
        const scheduledCast = new Set<string>(); 
        const completedScenes = new Set<string>(); 
        let conflictsAvoided = 0;
        let totalActiveRooms = 0;
        let pointsCleared = 0;

        timeSlots.forEach((slot) => {
            const busyActorsInThisSlot = new Set<string>(); 
            let roomsActive = 0;

            trackPriority.forEach((track) => {
                const candidates = scenes.filter((scene: any) => {
                    if (completedScenes.has(`${scene.id}-${track}`)) return false;
                    const type = (scene.type || "").toLowerCase();
                    if (track === 'Music' && !type.includes('song') && !type.includes('mixed')) return false;
                    if (track === 'Dance' && !type.includes('dance') && !type.includes('mixed')) return false;
                    return true;
                });

                const scored = candidates.map((scene: any) => {
                    let score = 0;
                    const hasConflict = scene.cast.some((c: any) => busyActorsInThisSlot.has(c.name));
                    if (hasConflict) { conflictsAvoided++; return { ...scene, score: -9999 }; }
                    if (scene.status === 'New') score += 50; 
                    if (scene.status === 'Worked') score += 10;
                    const newFaces = scene.cast.filter((c:any) => !scheduledCast.has(c.name)).length;
                    score += (newFaces * 15);
                    score += scene.cast.length;
                    return { ...scene, score };
                });

                scored.sort((a: any, b: any) => b.score - a.score);
                const winner = scored[0];

                if (winner && winner.score > 0) {
                    proposedSchedule.push({
                        id: Math.random().toString(),
                        sceneId: winner.id,
                        sceneName: winner.name,
                        track: track,
                        day: slot.day,
                        weekOffset: 0,
                        startTime: slot.time,
                        duration: slotDuration, 
                        status: 'New',
                        castSize: winner.cast.length
                    });
                    winner.cast.forEach((c:any) => { busyActorsInThisSlot.add(c.name); scheduledCast.add(c.name); });
                    completedScenes.add(`${winner.id}-${track}`);
                    if (winner.status === 'New') pointsCleared++;
                    roomsActive++;
                }
            });
            totalActiveRooms += roomsActive;
        });

        setTimeout(() => {
            const allCastCount = new Set(scenes.flatMap((s:any) => s.cast.map((c:any) => c.name))).size;
            setPreviewSchedule(proposedSchedule);
            setStats({
                totalSlots: proposedSchedule.length,
                uniqueActors: scheduledCast.size,
                castCoverage: allCastCount > 0 ? Math.round((scheduledCast.size / allCastCount) * 100) : 0,
                concurrency: parseFloat((totalActiveRooms / timeSlots.length).toFixed(1)),
                conflictsAvoided,
                pointsCleared,
                velocityTarget: 15,
                isOnTrack: pointsCleared >= 15
            });
            setIsGenerating(false);
            setViewMode('schedule'); // Reset view on new generation
        }, 800);
    };

    // --- 🖨️ CALLBOARD GENERATOR (The "Killer Feature") ---
    const callboardData = useMemo(() => {
        if(previewSchedule.length === 0) return [];

        const actorCalls: Record<string, { fri: { start: number, end: number }[], sat: { start: number, end: number }[] }> = {};

        // 1. Collect all slots per actor
        previewSchedule.forEach(slot => {
            const scene = scenes.find((s:any) => s.id === slot.sceneId);
            if(!scene) return;
            const endTime = slot.startTime + (slot.duration / 60);
            
            scene.cast.forEach((actor: any) => {
                if(!actorCalls[actor.name]) actorCalls[actor.name] = { fri: [], sat: [] };
                if (slot.day === 'Fri') actorCalls[actor.name].fri.push({ start: slot.startTime, end: endTime });
                else actorCalls[actor.name].sat.push({ start: slot.startTime, end: endTime });
            });
        });

        // 2. Merge contiguous slots
        const mergeTimes = (times: { start: number, end: number }[]) => {
            if (times.length === 0) return null;
            times.sort((a, b) => a.start - b.start);
            
            const merged = [];
            let current = times[0];

            for (let i = 1; i < times.length; i++) {
                // If overlap or contiguous (within 15 mins to be safe), merge
                if (times[i].start <= current.end + 0.25) {
                    current.end = Math.max(current.end, times[i].end);
                } else {
                    merged.push(current);
                    current = times[i];
                }
            }
            merged.push(current);
            return merged;
        };

        // 3. Format for display
        return Object.entries(actorCalls).map(([name, times]) => {
            const friCalls = mergeTimes(times.fri);
            const satCalls = mergeTimes(times.sat);
            return { name, friCalls, satCalls };
        }).sort((a, b) => a.name.localeCompare(b.name));

    }, [previewSchedule, scenes]);

    // --- RENDER HELPERS ---
    const getTrackIcon = (t: string) => {
        if (t === 'Music') return <Mic2 size={14} className="text-pink-400"/>;
        if (t === 'Dance') return <Music size={14} className="text-emerald-400"/>;
        return <Theater size={14} className="text-blue-400"/>;
    };
    
    const formatTime = (t: number) => {
        const h = Math.floor(t);
        const m = Math.round((t % 1) * 60).toString().padStart(2, '0');
        const suffix = h >= 12 ? 'PM' : 'AM';
        const h12 = h > 12 ? h - 12 : h;
        return `${h12}:${m} ${suffix}`;
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[100] bg-black/90 backdrop-blur-sm flex items-center justify-center p-4 print:p-0 print:bg-white">
            <div className="bg-zinc-900 border border-white/10 w-full max-w-6xl h-[85vh] rounded-3xl shadow-2xl flex flex-col overflow-hidden print:h-auto print:border-none print:shadow-none print:rounded-none">
                
                {/* Header (Hidden on Print) */}
                <div className="p-6 border-b border-white/10 bg-zinc-900 flex justify-between items-center shrink-0 print:hidden">
                    <div>
                        <h2 className="text-2xl font-black uppercase italic tracking-tighter text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-500 flex items-center gap-2">
                            <Wand2 size={24} className="text-purple-400" /> Multi-Track Auto-Scheduler
                        </h2>
                        <p className="text-xs text-zinc-500 font-bold uppercase tracking-widest mt-1">Velocity & Constraint Solver</p>
                    </div>
                    
                    {/* View Switcher */}
                    {previewSchedule.length > 0 && (
                        <div className="flex bg-black/40 p-1 rounded-lg border border-white/5">
                            <button onClick={() => setViewMode('schedule')} className={`px-4 py-1.5 rounded-md text-xs font-bold uppercase transition-all ${viewMode === 'schedule' ? 'bg-zinc-700 text-white' : 'text-zinc-500 hover:text-white'}`}>Timeline</button>
                            <button onClick={() => setViewMode('callboard')} className={`px-4 py-1.5 rounded-md text-xs font-bold uppercase transition-all flex items-center gap-2 ${viewMode === 'callboard' ? 'bg-blue-600 text-white' : 'text-zinc-500 hover:text-white'}`}><Users size={14}/> Callboard</button>
                        </div>
                    )}

                    <button onClick={onClose} className="p-2 bg-zinc-800 rounded-full hover:bg-zinc-700 text-zinc-400 hover:text-white"><X size={20}/></button>
                </div>

                <div className="flex flex-1 overflow-hidden print:overflow-visible">
                    
                    {/* LEFT: Controls (Hidden on Print) */}
                    <div className="w-80 bg-zinc-900/50 border-r border-white/5 p-6 flex flex-col gap-6 overflow-y-auto custom-scrollbar print:hidden">
                        
                        {/* 1. DURATION "FUDGE FACTOR" */}
                        <div className="bg-black/20 p-5 rounded-2xl border border-white/5 space-y-4">
                             <h3 className="text-xs font-black uppercase text-zinc-500 tracking-widest flex items-center gap-2">
                                <Timer size={14}/> Slot Duration
                            </h3>
                            <div className="flex bg-zinc-900 rounded-lg p-1 border border-white/10">
                                {[45, 30, 20, 15].map(min => (
                                    <button 
                                        key={min}
                                        onClick={() => setSlotDuration(min)}
                                        className={`flex-1 py-1.5 text-[10px] font-bold rounded transition-all ${slotDuration === min ? 'bg-blue-600 text-white shadow' : 'text-zinc-500 hover:text-white'}`}
                                    >
                                        {min}m
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* 2. PRIORITY SORTER */}
                        <div className="bg-black/20 p-5 rounded-2xl border border-white/5 space-y-4">
                            <div className="flex justify-between items-center">
                                <h3 className="text-xs font-black uppercase text-zinc-500 tracking-widest flex items-center gap-2">
                                    <Layers size={14}/> Priority Order
                                </h3>
                            </div>
                            
                            <div className="space-y-2">
                                {trackPriority.map((track, i) => (
                                    <div key={track} className="flex items-center gap-3 p-2 bg-zinc-800/50 rounded-lg border border-white/5 group">
                                        <div className="text-[10px] font-mono text-zinc-600 w-4">{i + 1}</div>
                                        <div className="flex-1 flex items-center gap-2">
                                            <div className="p-1.5 bg-black/40 rounded">{getTrackIcon(track)}</div>
                                            <span className="text-xs font-bold text-zinc-300">{track}</span>
                                        </div>
                                        <div className="flex flex-col opacity-0 group-hover:opacity-100 transition-opacity">
                                            <button onClick={() => movePriority(i, 'up')} disabled={i === 0} className="hover:text-white text-zinc-500 disabled:opacity-0"><ArrowUp size={10}/></button>
                                            <button onClick={() => movePriority(i, 'down')} disabled={i === trackPriority.length - 1} className="hover:text-white text-zinc-500 disabled:opacity-0"><ArrowDown size={10}/></button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* GENERATE */}
                        <div className="mt-auto">
                            <button 
                                onClick={generateSchedule} 
                                disabled={isGenerating}
                                className="w-full py-4 bg-purple-600 hover:bg-purple-500 rounded-xl text-white font-black uppercase tracking-widest shadow-lg shadow-purple-900/20 flex items-center justify-center gap-2 transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {isGenerating ? <Loader2 className="animate-spin"/> : <Wand2 size={18}/>}
                                {isGenerating ? "Running Solver..." : "Generate Weekend"}
                            </button>
                        </div>
                    </div>

                    {/* RIGHT: Results Preview */}
                    <div className="flex-1 bg-zinc-950 p-8 overflow-y-auto custom-scrollbar print:bg-white print:p-0 print:overflow-visible">
                        {previewSchedule.length === 0 ? (
                            <div className="h-full flex flex-col items-center justify-center text-zinc-600 opacity-50">
                                <Calendar size={64} className="mb-4"/>
                                <p className="text-sm font-bold uppercase">Ready to Schedule</p>
                            </div>
                        ) : (
                            <>
                            {viewMode === 'schedule' ? (
                                // --- VIEW: TIMELINE ---
                                <div className="space-y-8">
                                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                                        <div className={`p-5 rounded-2xl border flex items-center justify-between ${stats?.isOnTrack ? 'bg-emerald-900/10 border-emerald-500/20' : 'bg-red-900/10 border-red-500/20'}`}>
                                            <div>
                                                <div className="flex items-center gap-2 mb-1">
                                                    <Gauge size={16} className={stats?.isOnTrack ? "text-emerald-500" : "text-red-500"}/>
                                                    <span className="text-xs font-black uppercase tracking-widest text-zinc-400">Burn Velocity</span>
                                                </div>
                                                <div className="text-3xl font-black text-white">
                                                    {stats?.pointsCleared} <span className="text-sm text-zinc-500 font-bold">/ {stats?.velocityTarget} Items</span>
                                                </div>
                                            </div>
                                            <div className={`px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider border ${stats?.isOnTrack ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-red-500/10 text-red-400 border-red-500/20'}`}>
                                                {stats?.isOnTrack ? "Ahead of Schedule" : "Behind Schedule"}
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-3 gap-2">
                                            <div className="bg-zinc-900 border border-white/10 p-3 rounded-xl text-center flex flex-col justify-center">
                                                <div className="text-xl font-black text-blue-400">{stats?.concurrency}</div>
                                                <div className="text-[8px] font-bold uppercase text-zinc-500">Rooms Active</div>
                                            </div>
                                            <div className="bg-zinc-900 border border-white/10 p-3 rounded-xl text-center flex flex-col justify-center">
                                                <div className="text-xl font-black text-emerald-400">{stats?.castCoverage}%</div>
                                                <div className="text-[8px] font-bold uppercase text-zinc-500">Cast Equity</div>
                                            </div>
                                            <div className="bg-zinc-900 border border-white/10 p-3 rounded-xl text-center flex flex-col justify-center">
                                                <div className="text-xl font-black text-amber-500">{stats?.conflictsAvoided}</div>
                                                <div className="text-[8px] font-bold uppercase text-zinc-500">Conflicts Fixed</div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Timeline List */}
                                    <div className="space-y-6">
                                        {['Fri', 'Sat'].map(day => {
                                            const dayItems = previewSchedule.filter(i => i.day === day);
                                            const timeMap: Record<number, any[]> = {};
                                            dayItems.forEach(i => {
                                                if(!timeMap[i.startTime]) timeMap[i.startTime] = [];
                                                timeMap[i.startTime].push(i);
                                            });
                                            const times = Object.keys(timeMap).sort((a,b) => Number(a) - Number(b));

                                            return (
                                                <div key={day}>
                                                    <h4 className="text-sm font-black uppercase text-white mb-4 flex items-center gap-2 border-b border-white/10 pb-2">
                                                        <Calendar size={16}/> {day === 'Fri' ? 'Friday' : 'Saturday'}
                                                    </h4>
                                                    <div className="space-y-2">
                                                        {times.map((t: any) => {
                                                            const timeNum = Number(t);
                                                            const slotItems = timeMap[timeNum];
                                                            return (
                                                                <div key={t} className="flex gap-4">
                                                                    <div className="w-12 pt-3 text-right text-xs font-mono text-zinc-500 shrink-0">{formatTime(timeNum)}</div>
                                                                    <div className="flex-1 grid grid-cols-3 gap-2">
                                                                        {trackPriority.map(track => {
                                                                            const item = slotItems.find((i:any) => i.track === track);
                                                                            if (!item) return <div key={track} className="h-10 rounded-lg border border-dashed border-white/5 bg-transparent" />;
                                                                            const color = track === 'Acting' ? 'bg-blue-900/10 text-blue-200 border-blue-500/30' : track === 'Music' ? 'bg-pink-900/10 text-pink-200 border-pink-500/30' : 'bg-emerald-900/10 text-emerald-200 border-emerald-500/30';
                                                                            return (
                                                                                <div key={track} className={`h-10 rounded-lg border px-3 flex flex-col justify-center ${color}`}>
                                                                                    <div className="text-[10px] font-bold truncate">{item.sceneName}</div>
                                                                                    <div className="text-[8px] opacity-60 uppercase">{track} • {item.castSize} Kids</div>
                                                                                </div>
                                                                            )
                                                                        })}
                                                                    </div>
                                                                </div>
                                                            )
                                                        })}
                                                    </div>
                                                </div>
                                            )
                                        })}
                                    </div>
                                    
                                    <div className="flex justify-end pt-4 border-t border-white/10">
                                        <button onClick={() => { onCommit(previewSchedule); onClose(); }} className="px-8 py-3 bg-white text-black hover:bg-zinc-200 rounded-xl text-xs font-black uppercase tracking-widest shadow-xl flex items-center gap-2 transition-all">
                                            <CheckCircle2 size={16}/> Confirm Schedule
                                        </button>
                                    </div>
                                </div>
                            ) : (
                                // --- VIEW: CALLBOARD (Print Optimized) ---
                                <div className="h-full flex flex-col">
                                    <div className="flex justify-between items-center mb-6 print:hidden">
                                        <h3 className="text-xl font-bold text-white flex items-center gap-2"><FileText size={20}/> Callboard Preview</h3>
                                        <button onClick={() => window.print()} className="bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-lg font-bold text-xs uppercase flex items-center gap-2">
                                            <Printer size={16}/> Print List
                                        </button>
                                    </div>

                                    {/* PRINTABLE AREA */}
                                    <div className="bg-white text-black p-8 rounded-xl print:p-0 print:rounded-none overflow-visible">
                                        <div className="text-center mb-8 border-b-2 border-black pb-4">
                                            <h1 className="text-3xl font-black uppercase tracking-tighter">Weekly Callboard</h1>
                                            <p className="text-sm font-bold mt-2">Generated {new Date().toLocaleDateString()}</p>
                                        </div>

                                        <table className="w-full text-left border-collapse">
                                            <thead>
                                                <tr className="border-b-2 border-black text-sm uppercase">
                                                    <th className="py-2">Actor</th>
                                                    <th className="py-2">Friday Call</th>
                                                    <th className="py-2">Saturday Call</th>
                                                </tr>
                                            </thead>
                                            <tbody className="text-sm">
                                                {callboardData.map((row: any, i: number) => (
                                                    <tr key={i} className="border-b border-gray-300">
                                                        <td className="py-3 font-bold">{row.name}</td>
                                                        <td className="py-3">
                                                            {row.friCalls ? row.friCalls.map((c:any, idx:number) => (
                                                                <div key={idx}>{formatTime(c.start)} - {formatTime(c.end)}</div>
                                                            )) : <span className="text-gray-400">No Call</span>}
                                                        </td>
                                                        <td className="py-3">
                                                            {row.satCalls ? row.satCalls.map((c:any, idx:number) => (
                                                                <div key={idx}>{formatTime(c.start)} - {formatTime(c.end)}</div>
                                                            )) : <span className="text-gray-400">No Call</span>}
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                        
                                        <div className="mt-8 text-center text-xs font-mono text-gray-500 print:block">
                                            Generated by Open Backstage • cytfred.org
                                        </div>
                                    </div>
                                </div>
                            )}
                            </>
                        )}
                    </div>

                </div>
            </div>
        </div>
    );
}