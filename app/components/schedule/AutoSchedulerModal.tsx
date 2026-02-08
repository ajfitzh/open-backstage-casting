"use client";

import React, { useState, useEffect } from 'react';
import { 
    Wand2, X, CheckCircle2, 
    Calendar, Loader2,
    Layers, Music, Mic2, Theater,
    ArrowUp, ArrowDown, Timer, Gauge,
    CalendarRange, BrainCircuit, Users,
    RefreshCw, Coffee
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
    totalWorkload: number;  
    velocityTarget: number;  
    isOnTrack: boolean;
    completion: number;
}

export default function AutoSchedulerModal({ isOpen, onClose, scenes, people, onCommit }: any) {
    // --- STATE ---
    const [isGenerating, setIsGenerating] = useState(false);
    const [previewSchedule, setPreviewSchedule] = useState<any[]>([]);
    const [stats, setStats] = useState<ScheduleStats | null>(null);
    const [activeTabWeek, setActiveTabWeek] = useState(1);

    // --- CONTROLS ---
    const [trackPriority, setTrackPriority] = useState<TrackType[]>(['Music', 'Dance', 'Acting']);
    const [useSmartDuration, setUseSmartDuration] = useState(true); 
    const [baseDuration, setBaseDuration] = useState(30); 
    
    // 🟢 NEW: Default to "Concurrency" (Matches your real schedules)
    const [strategy, setStrategy] = useState<'velocity' | 'concurrency'>('concurrency'); 
    
    // 🟢 NEW: Default to 3 passes (Teach -> Review -> Polish)
    const [targetPasses, setTargetPasses] = useState(3); 
    
    // 🟢 NEW: Warmup Toggle
    const [includeWarmups, setIncludeWarmups] = useState(true);

    // --- TIME HORIZON ---
    const [startWeek, setStartWeek] = useState(1);
    const [endWeek, setEndWeek] = useState(8); 

    useEffect(() => { setActiveTabWeek(startWeek); }, [startWeek]);

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

    // --- 🧮 THE ALGORITHM ---
    const generateSchedule = () => {
        setIsGenerating(true);
        setPreviewSchedule([]); 
        
        // 1. DATA PREP
        const enrichedScenes = scenes.map((s: any) => {
            const name = (s["Scene Name"] || s.name || "").toLowerCase();
            
            const musicKeywords = ['song', 'mixed', 'musical', 'sing', 'vocal', 'finale', 'opening', 'overture', 'entr\'acte', 'reprise', 'bows', 'anthem', 'prologue', 'fathoms', 'poissons'];
            const danceKeywords = ['dance', 'mixed', 'choreo', 'ballet', 'tap', 'waltz', 'tango', 'movement', 'number', 'routine', 'triton', 'positoovity'];

            const isMusicByName = musicKeywords.some(k => name.includes(k));
            const isDanceByName = danceKeywords.some(k => name.includes(k));

            const defaultMusic = isMusicByName ? 1 : 0;
            const defaultDance = isDanceByName ? 1 : 0;

            const mLoad = parseInt(s["Music Load"] ?? s.load?.music ?? s.music_load ?? defaultMusic) || 0; 
            const dLoad = parseInt(s["Dance Load"] ?? s.load?.dance ?? s.dance_load ?? defaultDance) || 0;
            const bLoad = parseInt(s["Blocking Load"] ?? s.load?.block ?? s.blocking_load ?? 1) || 1; 

            const canMusic = mLoad > 0;
            const canDance = dLoad > 0;
            
            const totalPoints = mLoad + dLoad + bLoad;
            
            // 🟢 HUMANIZED DURATION FORMULA
            // Base 30 mins (Transitions/Talking) + 10 mins per difficulty point
            // Level 1 = 40m. Level 3 = 60m. Level 5 = 80m.
            let rawDuration = 30 + (totalPoints * 10);
            
            if (rawDuration > 90) rawDuration = 90; // Cap at 1.5 hrs
            const smartTime = Math.ceil(rawDuration / 5) * 5;
            
            // Cast Parsing
            let finalCast = s.cast || [];
            if ((!finalCast || finalCast.length === 0) && s["Scene Assignments"]) {
                 const raw = s["Scene Assignments"];
                 const extracted = raw.match(/([a-zA-Z0-9\s\.\']+) - \[\{/g);
                 if (extracted) {
                     finalCast = extracted.map((str: string) => ({ 
                         name: str.split(' - ')[0].replace(/['"]+/g, '').trim() 
                     }));
                 }
            }

            return { 
                ...s, cast: finalCast, mLoad, dLoad, bLoad, canMusic, canDance, totalPoints, smartTime 
            };
        });

        const proposedSchedule: any[] = [];
        const scheduledCast = new Set<string>(); 
        const completionCounts: Record<string, number> = {}; 

        let conflictsAvoided = 0;
        let totalActiveRooms = 0;
        let pointsCleared = 0;
        let totalSlotsIterated = 0;

        // Loop Weeks
        for (let w = startWeek; w <= endWeek; w++) {
            const workDays = [
                { day: 'Fri', start: FRI_START, end: FRI_END }, 
                { day: 'Sat', start: SAT_START, end: SAT_END }  
            ];

            workDays.forEach(({ day, start, end }) => {
                const trackClocks: Record<string, number> = { 'Music': start, 'Dance': start, 'Acting': start };
                let currentTime = start;
                
                // 🟢 WARMUP BLOCKER
                if (includeWarmups) {
                    // Block first 15 mins of EVERY track
                    trackClocks['Music'] += 0.25;
                    trackClocks['Dance'] += 0.25;
                    trackClocks['Acting'] += 0.25;
                    
                    proposedSchedule.push({
                        id: `warmup-${w}-${day}`,
                        sceneId: 0,
                        sceneName: "Physical & Vocal Warmups",
                        track: "Acting", // Gets rendered in Acting col usually
                        day: day,
                        weekOffset: w - 1,
                        startTime: start,
                        duration: 15,
                        status: 'New',
                        castSize: 'All',
                        castList: [] // Don't block conflicts technically, just visual
                    });
                }

                let loops = 0;
                
                while(currentTime < end && loops < 100) {
                    loops++;
                    const busyActorsNow = new Set<string>();
                    
                    proposedSchedule.forEach(item => {
                        if (item.weekOffset === (w-1) && item.day === day) {
                            if (item.startTime < currentTime + 0.25 && (item.startTime + item.duration/60) > currentTime) {
                                (item.castList || []).forEach((c:string) => busyActorsNow.add(c));
                            }
                        }
                    });

                    let roomsActiveNow = 0;

                    trackPriority.forEach((track) => {
                        if (trackClocks[track] > currentTime + 0.01) {
                            roomsActiveNow++;
                            return; 
                        }

                        // Filter Candidates
                        const candidates = enrichedScenes.filter((scene: any) => {
                            const key = `${scene.id}-${track}`;
                            const currentPass = completionCounts[key] || 0;
                            
                            if (currentPass >= targetPasses) return false;
                            
                            const alreadyScheduledThisWeek = proposedSchedule.some(i => i.sceneId === scene.id && i.track === track && i.weekOffset === (w-1));
                            if (alreadyScheduledThisWeek) return false;

                            if (track === 'Music' && !scene.canMusic) return false;
                            if (track === 'Dance' && !scene.canDance) return false;
                            return true;
                        });

                        // Score Candidates
                        const scored = candidates.map((scene: any) => {
                            let score = 10000; 
                            const key = `${scene.id}-${track}`;
                            const currentPass = completionCounts[key] || 0;

                            const actuallyBusy = (scene.cast || []).some((c:any) => busyActorsNow.has(c.name));
                            if (actuallyBusy) return { ...scene, score: -9999 };

                            const size = scene.cast?.length || 0;
                            
                            if (strategy === 'velocity') {
                                score += size * 2; 
                                score += (scene.totalPoints * 5); 
                            } else {
                                // 🟢 CONCURRENCY (Human Style): 
                                // Prioritize small/medium groups (5-20 people) heavily.
                                // Save the "Full Cast" (35+) scenes for when nothing else fits.
                                if (size > 0 && size <= 15) score += 500;       
                                else if (size <= 25) score += 200; 
                                else score -= 100;                 
                                score += (scene.totalPoints * 2);
                            }

                            score -= (currentPass * 500); 

                            const idleKids = (scene.cast || []).filter((c:any) => !scheduledCast.has(c.name)).length;
                            score += (idleKids * 10);
                            
                            const name = (scene.name || s["Scene Name"] || "").toLowerCase();
                            const type = (scene.type || "").toLowerCase();
                            
                            if (track === 'Music' && (name.includes('song') || name.includes('finale') || type.includes('music'))) score += 100;
                            if (track === 'Dance' && (name.includes('dance') || name.includes('tango'))) score += 100;

                            if (scene.status === 'New') score += 50; 

                            return { ...scene, score };
                        });

                        scored.sort((a: any, b: any) => b.score - a.score);
                        const winner = scored[0];

                        if (winner && winner.score > 0) {
                            const duration = useSmartDuration ? winner.smartTime : baseDuration;
                            
                            if ((currentTime + (duration/60)) <= end) {
                                const key = `${winner.id}-${track}`;
                                const pass = (completionCounts[key] || 0) + 1;
                                let labelPrefix = "";
                                if (pass === 1) labelPrefix = "New: ";
                                if (pass === 2) labelPrefix = "Review: ";
                                if (pass === 3) labelPrefix = "Polish: ";

                                proposedSchedule.push({
                                    id: Math.random().toString(),
                                    sceneId: winner.id,
                                    sceneName: `${labelPrefix}${winner["Scene Name"] || winner.name}`, 
                                    track: track,
                                    day: day,
                                    weekOffset: w - 1,
                                    startTime: currentTime,
                                    duration: duration,
                                    status: pass === 1 ? 'New' : pass === 2 ? 'Worked' : 'Polished',
                                    castSize: winner.cast?.length || 0,
                                    castList: (winner.cast || []).map((c:any) => c.name)
                                });

                                (winner.cast || []).forEach((c:any) => busyActorsNow.add(c.name)); 
                                (winner.cast || []).forEach((c:any) => scheduledCast.add(c.name));
                                trackClocks[track] = currentTime + (duration / 60);
                                
                                completionCounts[key] = pass;
                                pointsCleared += winner.totalPoints;
                                roomsActiveNow++;
                            } else {
                                trackClocks[track] = currentTime + 0.25;
                            }
                        } else {
                            trackClocks[track] = currentTime + 0.25; 
                        }
                    });

                    if (roomsActiveNow > 0) totalActiveRooms++;
                    totalSlotsIterated++;
                    currentTime += 0.25; 
                }
            });
        }

        setTimeout(() => {
            const allCastCount = new Set(scenes.flatMap((s:any) => (s.cast||[]).map((c:any) => c.name))).size;
            const totalWorkload = enrichedScenes.reduce((acc:number, s:any) => acc + s.totalPoints, 0) * targetPasses;

            setPreviewSchedule(proposedSchedule);
            setStats({
                totalSlots: proposedSchedule.length,
                uniqueActors: scheduledCast.size,
                castCoverage: allCastCount > 0 ? Math.round((scheduledCast.size / allCastCount) * 100) : 0,
                concurrency: totalSlotsIterated > 0 ? parseFloat((totalActiveRooms / totalSlotsIterated).toFixed(1)) : 0,
                conflictsAvoided,
                pointsCleared,
                totalWorkload,
                velocityTarget: totalWorkload, 
                isOnTrack: pointsCleared >= (totalWorkload * 0.9),
                completion: totalWorkload > 0 ? Math.round((pointsCleared / totalWorkload) * 100) : 0
            });
            setIsGenerating(false);
            setActiveTabWeek(startWeek);
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
                            <Wand2 size={24} className="text-purple-400" /> Multi-Track Auto-Scheduler v5
                        </h2>
                        <p className="text-xs text-zinc-500 font-bold uppercase tracking-widest mt-1">Velocity & Constraint Solver</p>
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

                        {/* 2. REHEARSAL PASSES */}
                        <div className="bg-black/20 p-5 rounded-2xl border border-white/5 space-y-4">
                             <h3 className="text-xs font-black uppercase text-zinc-500 tracking-widest flex items-center gap-2">
                                <RefreshCw size={14} className="text-emerald-400"/> Rehearsal Passes
                            </h3>
                            <div className="flex bg-zinc-900 rounded-lg p-1 border border-white/10">
                                {[1, 2, 3, 4].map(num => (
                                    <button 
                                        key={num}
                                        onClick={() => setTargetPasses(num)}
                                        className={`flex-1 py-1.5 text-[10px] font-bold rounded transition-all ${targetPasses === num ? 'bg-emerald-600 text-white shadow' : 'text-zinc-500 hover:text-white'}`}
                                    >
                                        {num}x
                                    </button>
                                ))}
                            </div>
                            <p className="text-[10px] text-zinc-500 italic leading-tight px-1">
                                1 = Teach Only. 3 = Teach, Review, Polish.
                            </p>
                        </div>

                        {/* 3. STRATEGY */}
                        <div className="bg-black/20 p-5 rounded-2xl border border-white/5 space-y-4">
                            <h3 className="text-xs font-black uppercase text-zinc-500 tracking-widest flex items-center gap-2">
                                <BrainCircuit size={14} className="text-purple-400"/> Optimization Goal
                            </h3>
                            <div className="flex bg-zinc-900 rounded-lg p-1 border border-white/10">
                                <button 
                                    onClick={() => setStrategy('velocity')}
                                    className={`flex-1 py-2 text-[10px] font-bold rounded transition-all flex flex-col items-center gap-1 ${strategy === 'velocity' ? 'bg-purple-600 text-white shadow' : 'text-zinc-500 hover:text-white'}`}
                                >
                                    <span>🚀 Max Speed</span>
                                    <span className="text-[8px] opacity-60 font-normal lowercase">Big scenes first</span>
                                </button>
                                <button 
                                    onClick={() => setStrategy('concurrency')}
                                    className={`flex-1 py-2 text-[10px] font-bold rounded transition-all flex flex-col items-center gap-1 ${strategy === 'concurrency' ? 'bg-blue-600 text-white shadow' : 'text-zinc-500 hover:text-white'}`}
                                >
                                    <span>🧩 Max Rooms</span>
                                    <span className="text-[8px] opacity-60 font-normal lowercase">Small scenes first</span>
                                </button>
                            </div>
                        </div>

                        {/* 4. DURATION & WARMUPS */}
                        <div className="space-y-4 opacity-80 hover:opacity-100 transition-opacity">
                             <div className="flex items-center justify-between p-3 rounded-xl border border-white/5 bg-zinc-800/50">
                                <span className="text-[10px] font-bold text-zinc-400 flex items-center gap-2"><Timer size={12}/> Smart Sizing</span>
                                <button onClick={() => setUseSmartDuration(!useSmartDuration)} className={`w-8 h-4 rounded-full p-0.5 transition-colors ${useSmartDuration ? 'bg-purple-500' : 'bg-zinc-600'}`}>
                                    <div className={`w-3 h-3 bg-white rounded-full shadow-sm transition-transform ${useSmartDuration ? 'translate-x-4' : 'translate-x-0'}`} />
                                </button>
                             </div>
                             
                             {/* WARMUP TOGGLE */}
                             <div className="flex items-center justify-between p-3 rounded-xl border border-white/5 bg-zinc-800/50">
                                <span className="text-[10px] font-bold text-zinc-400 flex items-center gap-2"><Coffee size={12}/> Daily Warmups</span>
                                <button onClick={() => setIncludeWarmups(!includeWarmups)} className={`w-8 h-4 rounded-full p-0.5 transition-colors ${includeWarmups ? 'bg-amber-500' : 'bg-zinc-600'}`}>
                                    <div className={`w-3 h-3 bg-white rounded-full shadow-sm transition-transform ${includeWarmups ? 'translate-x-4' : 'translate-x-0'}`} />
                                </button>
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
                    <div className="flex-1 bg-zinc-950 p-8 overflow-y-auto custom-scrollbar flex flex-col">
                        {previewSchedule.length === 0 ? (
                            <div className="flex-1 flex flex-col items-center justify-center text-zinc-600 opacity-50">
                                <Calendar size={64} className="mb-4"/>
                                <p className="text-sm font-bold uppercase">Ready to Schedule</p>
                                <p className="text-xs">Select strategy, adjust priority, then click Generate.</p>
                            </div>
                        ) : (
                            <>
                                {/* SCOREBOARD */}
                                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-8 shrink-0">
                                    <div className={`p-5 rounded-2xl border flex items-center justify-between ${stats?.completion === 100 ? 'bg-emerald-900/10 border-emerald-500/20' : 'bg-blue-900/10 border-blue-500/20'}`}>
                                        <div>
                                            <div className="flex items-center gap-2 mb-1">
                                                <Gauge size={16} className={stats?.completion === 100 ? "text-emerald-500" : "text-blue-500"}/>
                                                <span className="text-xs font-black uppercase tracking-widest text-zinc-400">Total Progress</span>
                                            </div>
                                            <div className="text-3xl font-black text-white">
                                                {stats?.completion}% <span className="text-sm text-zinc-500 font-bold">Scheduled</span>
                                            </div>
                                        </div>
                                        <div className={`px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider border ${stats?.completion === 100 ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-blue-500/10 text-blue-400 border-blue-500/20'}`}>
                                            {stats?.pointsCleared} / {stats?.totalWorkload} Pts
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

                                {/* 🟢 TAB BAR: WEEKS */}
                                <div className="flex gap-2 mb-6 overflow-x-auto pb-2 border-b border-white/10 shrink-0">
                                    {Array.from({ length: endWeek - startWeek + 1 }, (_, i) => startWeek + i).map(week => {
                                        const count = previewSchedule.filter(i => i.weekOffset === (week - 1)).length;
                                        const isFull = count > 15; // Arbitrary "busy" threshold
                                        return (
                                            <button 
                                                key={week}
                                                onClick={() => setActiveTabWeek(week)}
                                                className={`px-6 py-2 rounded-lg text-xs font-black uppercase tracking-wider transition-all flex-shrink-0 flex items-center gap-2 ${
                                                    activeTabWeek === week 
                                                    ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/20' 
                                                    : 'bg-zinc-800 text-zinc-500 hover:text-white hover:bg-zinc-700'
                                                }`}
                                            >
                                                Week {week}
                                                {count > 0 && <div className={`w-1.5 h-1.5 rounded-full ${isFull ? 'bg-emerald-400' : 'bg-amber-400'}`} />}
                                            </button>
                                        );
                                    })}
                                </div>

                                {/* PREVIEW LIST (ACTIVE TAB ONLY) */}
                                <div className="flex-1 overflow-y-auto custom-scrollbar">
                                    {(() => {
                                        const weekItems = previewSchedule.filter(item => item.weekOffset === (activeTabWeek - 1));
                                        if (weekItems.length === 0) return (
                                            <div className="text-center py-20 text-zinc-500 italic flex flex-col items-center gap-4">
                                                <Calendar size={32} className="opacity-20"/>
                                                No items scheduled for Week {activeTabWeek}.
                                                <br/>
                                                {stats?.completion === 100 ? (
                                                    <span className="text-emerald-500 font-bold">Show is fully scheduled! You can relax.</span>
                                                ) : (
                                                    <span className="text-[10px]">Try increasing 'Passes' or changing Strategy.</span>
                                                )}
                                            </div>
                                        );

                                        return (
                                            <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
                                                <div className="space-y-8 pl-4 border-l border-white/5">
                                                    {['Fri', 'Sat'].map(day => {
                                                        const dayItems = weekItems.filter((i:any) => i.day === day);
                                                        const uniqueTimes = Array.from(new Set(dayItems.map((i:any) => i.startTime))).sort((a:any,b:any) => a-b);

                                                        if (uniqueTimes.length === 0) return (
                                                            <div key={day} className="text-zinc-700 text-xs italic pl-4 border-l-2 border-zinc-800/50 py-2">
                                                                No items for {day === 'Fri' ? 'Friday' : 'Saturday'}
                                                            </div>
                                                        );

                                                        return (
                                                            <div key={day}>
                                                                {/* DAY HEADER & COLUMNS */}
                                                                <div className="flex justify-between items-end mb-4">
                                                                    <h4 className="text-xs font-black uppercase text-zinc-500 flex items-center gap-2">
                                                                        <Calendar size={12}/> {day === 'Fri' ? 'Friday Evening' : 'Saturday Day'}
                                                                    </h4>
                                                                    <div className="hidden md:grid grid-cols-3 gap-2 w-full max-w-4xl pl-20">
                                                                        {trackPriority.map(t => (
                                                                            <div key={t} className="text-[9px] font-black uppercase text-zinc-600 tracking-wider text-center">{t}</div>
                                                                        ))}
                                                                    </div>
                                                                </div>

                                                                <div className="space-y-2">
                                                                    {uniqueTimes.map((t: any) => {
                                                                        const slotItems = dayItems.filter((i:any) => Math.abs(i.startTime - t) < 0.1);
                                                                        
                                                                        return (
                                                                            <div key={t} className="flex gap-4 group hover:bg-white/5 p-2 rounded-lg transition-colors items-stretch">
                                                                                {/* TIME COLUMN */}
                                                                                <div className="w-16 pt-3 text-right text-xs font-mono text-zinc-500 shrink-0 border-r border-white/5 pr-4 group-hover:text-zinc-300 transition-colors">
                                                                                    {formatTime(t)}
                                                                                </div>
                                                                                
                                                                                {/* TRACK COLUMNS */}
                                                                                <div className="flex-1 grid grid-cols-1 md:grid-cols-3 gap-2">
                                                                                    {trackPriority.map((track) => {
                                                                                        const item = slotItems.find((i:any) => i.track === track);

                                                                                        // RENDER GHOST SLOT
                                                                                        if (!item) return (
                                                                                            <div key={track} className="h-full min-h-[3rem] rounded-lg border border-dashed border-white/5 bg-transparent flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                                                                                <span className="text-[8px] uppercase font-bold text-zinc-800">Available</span>
                                                                                            </div>
                                                                                        );
                                                                                        
                                                                                        // RENDER CARD
                                                                                        const color = item.sceneName.includes("Warmup") ? 'bg-amber-900/20 text-amber-200 border-amber-500/30' :
                                                                                                    item.track === 'Acting' ? 'bg-blue-900/20 text-blue-200 border-blue-500/30' 
                                                                                                    : item.track === 'Music' ? 'bg-pink-900/20 text-pink-200 border-pink-500/30' 
                                                                                                    : 'bg-emerald-900/20 text-emerald-200 border-emerald-500/30';
                                                                                                    
                                                                                        return (
                                                                                            <div key={item.id} className={`p-3 rounded-lg border flex flex-col justify-between shadow-lg relative overflow-hidden group/card ${color}`}>
                                                                                                <div>
                                                                                                    <div className="flex justify-between items-start mb-1">
                                                                                                        <span className="text-[9px] uppercase font-black opacity-60 flex items-center gap-1">
                                                                                                            {getTrackIcon(item.track)} {item.track}
                                                                                                        </span>
                                                                                                        <span className="text-[9px] font-mono opacity-80 bg-black/30 px-1 rounded text-white">{item.duration}m</span>
                                                                                                    </div>
                                                                                                    <div className="text-xs font-bold leading-tight line-clamp-2 mt-1">{item.sceneName}</div>
                                                                                                </div>
                                                                                                <div className="mt-2 text-[9px] opacity-60 flex justify-between items-center">
                                                                                                    <span className="flex items-center gap-1"><Users size={8}/> {item.castSize}</span>
                                                                                                    {item.status === 'New' && <div className="w-1.5 h-1.5 rounded-full bg-white animate-pulse"/>}
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
                                            </div>
                                        );
                                    })()}
                                </div>
                                
                                {/* CONFIRM BUTTON */}
                                <div className="flex justify-end pt-6 border-t border-white/10 sticky bottom-0 bg-zinc-950 p-4 -mx-4 -mb-4">
                                    <button 
                                        onClick={() => { onCommit(previewSchedule); onClose(); }} 
                                        className="px-8 py-4 bg-white text-black hover:bg-zinc-200 rounded-xl text-sm font-black uppercase tracking-widest shadow-[0_0_30px_rgba(255,255,255,0.2)] flex items-center gap-2 transition-all active:scale-95"
                                    >
                                        <CheckCircle2 size={18}/> Confirm & Import
                                    </button>
                                </div>
                            </>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}