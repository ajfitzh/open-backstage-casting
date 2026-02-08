"use client";

import React, { useState } from 'react';
import { 
    Wand2, X, CheckCircle2, 
    Calendar, Loader2,
    Layers, Music, Mic2, Theater,
    ArrowUp, ArrowDown, Timer, Gauge,
    CalendarRange, BrainCircuit
} from 'lucide-react';

// --- CONFIGURATION ---
const FRI_START = 18; // 6 PM
const FRI_END = 21;   // 9 PM
const SAT_START = 10; // 10 AM
const SAT_END = 17;   // 5 PM 

// --- TYPES ---
type TrackType = "Acting" | "Music" | "Dance";

interface ScheduleStats {
    totalSlots: number;
    uniqueActors: number;
    castCoverage: number;
    concurrency: number; 
    conflictsAvoided: number;
    pointsCleared: number;   
    velocityTarget: number;  
    isOnTrack: boolean;
}

export default function AutoSchedulerModal({ isOpen, onClose, scenes, people, onCommit }: any) {
    const [isGenerating, setIsGenerating] = useState(false);
    const [previewSchedule, setPreviewSchedule] = useState<any[]>([]);
    const [stats, setStats] = useState<ScheduleStats | null>(null);

    // ⚡️ CONTROLS
    const [trackPriority, setTrackPriority] = useState<TrackType[]>(['Music', 'Dance', 'Acting']);
    const [useSmartDuration, setUseSmartDuration] = useState(true); // 🟢 NEW: Toggle for Points-based time
    const [baseDuration, setBaseDuration] = useState(30); // Fallback if smart duration is off
    
    // 🗓 TIME HORIZON
    const [startWeek, setStartWeek] = useState(1);
    const [endWeek, setEndWeek] = useState(1);

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

// --- 🧮 THE ALGORITHM (CORRECTED) ---
    const generateSchedule = () => {
        setIsGenerating(true);
        setPreviewSchedule([]); 
        
        // 1. DATA PREP: Enforce Numbers to prevent "1"+"1" = "11" errors
        const enrichedScenes = scenes.map((s: any) => {
            // Force parseInt to ensure we don't do string concatenation
            const mLoad = parseInt(s.load?.music ?? s.music_load ?? 0) || 0; 
            const dLoad = parseInt(s.load?.dance ?? s.dance_load ?? 0) || 0;
            const bLoad = parseInt(s.load?.block ?? s.blocking_load ?? 1) || 1; // Default to 1 if missing

            const canMusic = mLoad > 0;
            const canDance = dLoad > 0;
            
            const totalPoints = mLoad + dLoad + bLoad;

            // 🟢 SMART DURATION FORMULA
            // Base 15m + (5m per point). 
            // Ex: Low (3pts) = 30m. High (10pts) = 65m.
            let rawDuration = 15 + (totalPoints * 5);
            
            // Safety Clamp: Don't let a scene exceed 90 mins automatically
            // or it will never fit in a Fri night slot
            if (rawDuration > 90) rawDuration = 90;

            // Round to nearest 5
            const smartTime = Math.ceil(rawDuration / 5) * 5;
            
            return { ...s, mLoad, dLoad, bLoad, canMusic, canDance, totalPoints, smartTime };
        });

        const proposedSchedule: any[] = [];
        const scheduledCast = new Set<string>(); 
        const completedScenes = new Set<string>(); 
        let conflictsAvoided = 0;
        let totalActiveRooms = 0;
        let pointsCleared = 0;
        let totalSlotsIterated = 0;

        // Loop Weeks
        for (let w = startWeek; w <= endWeek; w++) {
            
            const workDays = [
                { day: 'Fri', start: FRI_START, end: FRI_END }, // 3 Hours
                { day: 'Sat', start: SAT_START, end: SAT_END }  // 7 Hours
            ];

            workDays.forEach(({ day, start, end }) => {
                const trackClocks: Record<string, number> = {
                    'Music': start,
                    'Dance': start,
                    'Acting': start
                };

                // March forward in 15-min increments
                let currentTime = start;
                
                // Safety break to prevent infinite loops
                let loops = 0;
                while(currentTime < end && loops < 100) {
                    loops++;
                    
                    const busyActorsNow = new Set<string>();
                    
                    // Populate Busy Actors from overlapping items
                    proposedSchedule.forEach(item => {
                        if (item.weekOffset === (w-1) && item.day === day) {
                            const itemEnd = item.startTime + (item.duration / 60);
                            // If item overlaps the current 15-min block
                            if (item.startTime < currentTime + 0.25 && itemEnd > currentTime) {
                                (item.castList || []).forEach((c:string) => busyActorsNow.add(c));
                            }
                        }
                    });

                    let roomsActiveNow = 0;

                    trackPriority.forEach((track) => {
                        // Skip if this track is already busy with a previous long scene
                        if (trackClocks[track] > currentTime + 0.01) {
                            roomsActiveNow++;
                            return; 
                        }

                        // Filter Candidates
                        const candidates = enrichedScenes.filter((scene: any) => {
                            if (completedScenes.has(`${scene.id}-${track}`)) return false; 
                            
                            // Load-based filtering
                            if (track === 'Music' && !scene.canMusic) return false;
                            if (track === 'Dance' && !scene.canDance) return false;
                            
                            return true;
                        });

                        // Score Candidates
                        const scored = candidates.map((scene: any) => {
                            let score = 0;
                            
                            // Conflict Check
                            const actuallyBusy = (scene.cast || []).some((c:any) => busyActorsNow.has(c.name));
                            if (actuallyBusy) {
                                conflictsAvoided++;
                                return { ...scene, score: -9999 };
                            }

                            if (scene.status === 'New') score += 50; 
                            score += (scene.totalPoints * 5); 

                            const idleKids = (scene.cast || []).filter((c:any) => !scheduledCast.has(c.name)).length;
                            score += (idleKids * 10);

                            return { ...scene, score };
                        });

                        scored.sort((a: any, b: any) => b.score - a.score);
                        const winner = scored[0];

                        if (winner && winner.score > 0) {
                            const duration = useSmartDuration ? winner.smartTime : baseDuration;
                            
                            // Does it fit in remaining day?
                            if ((currentTime + (duration/60)) <= end) {
                                proposedSchedule.push({
                                    id: Math.random().toString(),
                                    sceneId: winner.id,
                                    sceneName: winner.name,
                                    track: track,
                                    day: day,
                                    weekOffset: w - 1,
                                    startTime: currentTime,
                                    duration: duration,
                                    status: 'New',
                                    castSize: winner.cast?.length || 0,
                                    castList: (winner.cast || []).map((c:any) => c.name)
                                });

                                (winner.cast || []).forEach((c:any) => scheduledCast.add(c.name));
                                trackClocks[track] = currentTime + (duration / 60);
                                completedScenes.add(`${winner.id}-${track}`);
                                pointsCleared += winner.totalPoints;
                                roomsActiveNow++;
                            } else {
                                // Scene too long for remaining day, try next loop
                                // Advance clock slightly to allow small scenes to fill gap
                                trackClocks[track] = currentTime + 0.25;
                            }
                        } else {
                            // No valid scene, advance clock
                            trackClocks[track] = currentTime + 0.25; 
                        }
                    });

                    if (roomsActiveNow > 0) totalActiveRooms++;
                    totalSlotsIterated++;
                    
                    currentTime += 0.25; // Advance 15 mins
                }
            });
        }

        // 3. STATS
        setTimeout(() => {
            const allCastCount = new Set(scenes.flatMap((s:any) => (s.cast||[]).map((c:any) => c.name))).size;
            const velocityTarget = 50 * (endWeek - startWeek + 1); 

            if (proposedSchedule.length === 0) {
                console.warn("Auto-Scheduler produced 0 items. Check 'enrichedScenes' logs for data issues.");
                console.log("Sample Scene Data:", enrichedScenes[0]);
            }

            setPreviewSchedule(proposedSchedule);
            setStats({
                totalSlots: proposedSchedule.length,
                uniqueActors: scheduledCast.size,
                castCoverage: allCastCount > 0 ? Math.round((scheduledCast.size / allCastCount) * 100) : 0,
                concurrency: totalSlotsIterated > 0 ? parseFloat((totalActiveRooms / totalSlotsIterated).toFixed(1)) : 0,
                conflictsAvoided,
                pointsCleared,
                velocityTarget,
                isOnTrack: pointsCleared >= velocityTarget
            });
            setIsGenerating(false);
        }, 800);
    };

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
        return `${h12}:${m}${suffix}`;
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[100] bg-black/90 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-zinc-900 border border-white/10 w-full max-w-6xl h-[85vh] rounded-3xl shadow-2xl flex flex-col overflow-hidden animate-in fade-in zoom-in duration-200">
                
                {/* HEADER */}
                <div className="p-6 border-b border-white/10 bg-zinc-900 flex justify-between items-center shrink-0">
                    <div>
                        <h2 className="text-2xl font-black uppercase italic tracking-tighter text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-500 flex items-center gap-2">
                            <Wand2 size={24} className="text-purple-400" /> Multi-Track Auto-Scheduler v2
                        </h2>
                        <p className="text-xs text-zinc-500 font-bold uppercase tracking-widest mt-1">Load-Based Logic & Smart Sizing</p>
                    </div>
                    <button onClick={onClose} className="p-2 bg-zinc-800 rounded-full hover:bg-zinc-700 text-zinc-400 hover:text-white"><X size={20}/></button>
                </div>

                <div className="flex flex-1 overflow-hidden">
                    
                    {/* LEFT: Controls */}
                    <div className="w-80 bg-zinc-900/50 border-r border-white/5 p-6 flex flex-col gap-6 overflow-y-auto custom-scrollbar">
                        
                        {/* 1. TIME HORIZON */}
                        <div className="bg-black/20 p-5 rounded-2xl border border-white/5 space-y-4">
                             <h3 className="text-xs font-black uppercase text-zinc-500 tracking-widest flex items-center gap-2">
                                <CalendarRange size={14} className="text-blue-400"/> Schedule Scope
                            </h3>
                            <div className="flex items-center gap-2">
                                <div className="flex-1">
                                    <label className="text-[9px] uppercase font-bold text-zinc-500 mb-1 block">Start Week</label>
                                    <div className="flex items-center bg-zinc-900 rounded-lg border border-white/10">
                                        <button onClick={() => setStartWeek(Math.max(1, startWeek - 1))} className="p-2 hover:text-white text-zinc-500"><ArrowDown size={12}/></button>
                                        <div className="flex-1 text-center font-black text-xl text-white">{startWeek}</div>
                                        <button onClick={() => { setStartWeek(startWeek + 1); if(endWeek < startWeek + 1) setEndWeek(startWeek + 1); }} className="p-2 hover:text-white text-zinc-500"><ArrowUp size={12}/></button>
                                    </div>
                                </div>
                                <div className="text-zinc-600 font-black pt-4">-</div>
                                <div className="flex-1">
                                    <label className="text-[9px] uppercase font-bold text-zinc-500 mb-1 block">End Week</label>
                                    <div className="flex items-center bg-zinc-900 rounded-lg border border-white/10">
                                        <button onClick={() => setEndWeek(Math.max(startWeek, endWeek - 1))} className="p-2 hover:text-white text-zinc-500"><ArrowDown size={12}/></button>
                                        <div className="flex-1 text-center font-black text-xl text-white">{endWeek}</div>
                                        <button onClick={() => setEndWeek(endWeek + 1)} className="p-2 hover:text-white text-zinc-500"><ArrowUp size={12}/></button>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* 2. DURATION LOGIC */}
                        <div className="bg-black/20 p-5 rounded-2xl border border-white/5 space-y-4">
                             <h3 className="text-xs font-black uppercase text-zinc-500 tracking-widest flex items-center gap-2">
                                <Timer size={14}/> Slot Duration
                            </h3>
                            
                            {/* Toggle */}
                            <button 
                                onClick={() => setUseSmartDuration(!useSmartDuration)}
                                className={`w-full flex items-center justify-between p-3 rounded-xl border transition-all ${useSmartDuration ? 'bg-purple-600/20 border-purple-500/50 text-purple-200' : 'bg-zinc-800 border-white/5 text-zinc-400'}`}
                            >
                                <span className="text-xs font-bold flex items-center gap-2">
                                    <BrainCircuit size={14} /> Smart Sizing
                                </span>
                                <div className={`w-8 h-4 rounded-full p-0.5 transition-colors ${useSmartDuration ? 'bg-purple-500' : 'bg-zinc-600'}`}>
                                    <div className={`w-3 h-3 bg-white rounded-full shadow-sm transition-transform ${useSmartDuration ? 'translate-x-4' : 'translate-x-0'}`} />
                                </div>
                            </button>

                            {useSmartDuration ? (
                                <p className="text-[10px] text-zinc-400 italic leading-tight px-1">
                                    Calculates time based on complexity.<br/>
                                    <span className="text-purple-400 font-bold">Harder scenes = Longer slots.</span>
                                </p>
                            ) : (
                                <div className="flex bg-zinc-900 rounded-lg p-1 border border-white/10">
                                    {[45, 30, 20, 15].map(min => (
                                        <button 
                                            key={min}
                                            onClick={() => setBaseDuration(min)}
                                            className={`flex-1 py-1.5 text-[10px] font-bold rounded transition-all ${baseDuration === min ? 'bg-blue-600 text-white shadow' : 'text-zinc-500 hover:text-white'}`}
                                        >
                                            {min}m
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* 3. PRIORITY SORTER */}
                        <div className="bg-black/20 p-5 rounded-2xl border border-white/5 space-y-4">
                            <h3 className="text-xs font-black uppercase text-zinc-500 tracking-widest flex items-center gap-2">
                                <Layers size={14}/> Priority Order
                            </h3>
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
                        <div className="mt-auto pt-4 border-t border-white/5">
                            <button 
                                onClick={generateSchedule} 
                                disabled={isGenerating}
                                className="w-full py-4 bg-purple-600 hover:bg-purple-500 rounded-xl text-white font-black uppercase tracking-widest shadow-lg shadow-purple-900/20 flex items-center justify-center gap-2 transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {isGenerating ? <Loader2 className="animate-spin"/> : <Wand2 size={18}/>}
                                {isGenerating ? "Processing..." : `Auto-Schedule`}
                            </button>
                        </div>
                    </div>

                    {/* RIGHT: Results Preview */}
                    <div className="flex-1 bg-zinc-950 p-8 overflow-y-auto custom-scrollbar">
                        {previewSchedule.length === 0 ? (
                            <div className="h-full flex flex-col items-center justify-center text-zinc-600 opacity-50">
                                <Calendar size={64} className="mb-4"/>
                                <p className="text-sm font-bold uppercase">Ready to Schedule</p>
                                <p className="text-xs">Adjust duration and priority, then click Generate.</p>
                            </div>
                        ) : (
                            <div className="space-y-8">
                                
                                {/* SCOREBOARD */}
                                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                                    <div className={`p-5 rounded-2xl border flex items-center justify-between ${stats?.isOnTrack ? 'bg-emerald-900/10 border-emerald-500/20' : 'bg-red-900/10 border-red-500/20'}`}>
                                        <div>
                                            <div className="flex items-center gap-2 mb-1">
                                                <Gauge size={16} className={stats?.isOnTrack ? "text-emerald-500" : "text-red-500"}/>
                                                <span className="text-xs font-black uppercase tracking-widest text-zinc-400">Burn Velocity</span>
                                            </div>
                                            <div className="text-3xl font-black text-white">
                                                {stats?.pointsCleared} <span className="text-sm text-zinc-500 font-bold">/ {stats?.velocityTarget} Pts</span>
                                            </div>
                                        </div>
                                        <div className={`px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider border ${stats?.isOnTrack ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-red-500/10 text-red-400 border-red-500/20'}`}>
                                            {stats?.isOnTrack ? "On Target" : "Under Target"}
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-3 gap-2">
                                        <div className="bg-zinc-900 border border-white/10 p-3 rounded-xl text-center flex flex-col justify-center">
                                            <div className="text-xl font-black text-blue-400">{stats?.concurrency}</div>
                                            <div className="text-[8px] font-bold uppercase text-zinc-500">Avg Rooms</div>
                                        </div>
                                        <div className="bg-zinc-900 border border-white/10 p-3 rounded-xl text-center flex flex-col justify-center">
                                            <div className="text-xl font-black text-emerald-400">{stats?.castCoverage}%</div>
                                            <div className="text-[8px] font-bold uppercase text-zinc-500">Cast Used</div>
                                        </div>
                                        <div className="bg-zinc-900 border border-white/10 p-3 rounded-xl text-center flex flex-col justify-center">
                                            <div className="text-xl font-black text-amber-500">{stats?.conflictsAvoided}</div>
                                            <div className="text-[8px] font-bold uppercase text-zinc-500">Conflicts Fixed</div>
                                        </div>
                                    </div>
                                </div>

                                {/* PREVIEW LIST */}
                                <div className="space-y-12">
                                    {Array.from({ length: endWeek - startWeek + 1 }, (_, i) => startWeek + i).map(week => {
                                        const weekItems = previewSchedule.filter(item => item.weekOffset === (week - 1));
                                        if (weekItems.length === 0) return null;

                                        return (
                                            <div key={week} className="animate-in slide-in-from-bottom-4 duration-500">
                                                <h3 className="text-lg font-black uppercase text-white mb-6 flex items-center gap-3">
                                                    <span className="bg-blue-600 px-3 py-1 rounded text-sm shadow-lg shadow-blue-600/20">Week {week}</span>
                                                    <div className="h-px flex-1 bg-white/10"></div>
                                                </h3>
                                                
                                                <div className="space-y-8 pl-4 border-l border-white/5">
                                                    {['Fri', 'Sat'].map(day => {
                                                        const dayItems = weekItems.filter((i:any) => i.day === day);
                                                        // Sort by start time
                                                        const sortedItems = [...dayItems].sort((a,b) => a.startTime - b.startTime);
                                                        if (sortedItems.length === 0) return null;
                                                        
                                                        // Group by start time for visual row alignment (approximate)
                                                        const uniqueTimes = Array.from(new Set(sortedItems.map((i:any) => i.startTime))).sort((a:any,b:any) => a-b);

                                                        return (
                                                            <div key={day}>
                                                                <h4 className="text-xs font-black uppercase text-zinc-500 mb-4 flex items-center gap-2">
                                                                    <Calendar size={12}/> {day === 'Fri' ? 'Friday Evening' : 'Saturday Day'}
                                                                </h4>
                                                                <div className="space-y-2">
                                                                    {uniqueTimes.map((t: any) => {
                                                                        const slotItems = dayItems.filter((i:any) => Math.abs(i.startTime - t) < 0.1);
                                                                        return (
                                                                            <div key={t} className="flex gap-4 group hover:bg-white/5 p-2 rounded-lg transition-colors">
                                                                                <div className="w-16 pt-3 text-right text-xs font-mono text-zinc-500 shrink-0">{formatTime(t)}</div>
                                                                                <div className="flex-1 grid grid-cols-1 md:grid-cols-3 gap-2">
                                                                                    {slotItems.map((item:any) => {
                                                                                        const color = item.track === 'Acting' ? 'bg-blue-900/20 text-blue-200 border-blue-500/30' 
                                                                                                    : item.track === 'Music' ? 'bg-pink-900/20 text-pink-200 border-pink-500/30' 
                                                                                                    : 'bg-emerald-900/20 text-emerald-200 border-emerald-500/30';
                                                                                        return (
                                                                                            <div key={item.id} className={`p-3 rounded-lg border flex flex-col justify-between shadow-lg ${color}`}>
                                                                                                <div>
                                                                                                    <div className="flex justify-between items-start mb-1">
                                                                                                        <span className="text-[9px] uppercase font-black opacity-60">{item.track}</span>
                                                                                                        <span className="text-[9px] font-mono opacity-80 bg-black/30 px-1 rounded text-white">{item.duration}m</span>
                                                                                                    </div>
                                                                                                    <div className="text-xs font-bold leading-tight line-clamp-2">{item.sceneName}</div>
                                                                                                </div>
                                                                                                <div className="mt-2 text-[9px] opacity-60 truncate">{item.castSize} Cast Members</div>
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
                                            </div>
                                        )
                                    })}
                                </div>
                                
                                <div className="flex justify-end pt-6 border-t border-white/10 sticky bottom-0 bg-zinc-950 p-4 -mx-4 -mb-4">
                                    <button 
                                        onClick={() => { onCommit(previewSchedule); onClose(); }} 
                                        className="px-8 py-4 bg-white text-black hover:bg-zinc-200 rounded-xl text-sm font-black uppercase tracking-widest shadow-[0_0_30px_rgba(255,255,255,0.2)] flex items-center gap-2 transition-all active:scale-95"
                                    >
                                        <CheckCircle2 size={18}/> Confirm & Import
                                    </button>
                                </div>

                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}