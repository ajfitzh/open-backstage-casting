"use client";

import React, { useState } from 'react';
import { 
    Wand2, X, CheckCircle2, 
    Calendar, Users, Loader2,
    Clock, Layers, Music, Mic2, Theater,
    ArrowUp, ArrowDown, GripVertical
} from 'lucide-react';

// --- CONFIGURATION ---
const SLOT_DUR = 30; // 30 minute slots

// --- TYPES ---
interface ScheduleStats {
    totalSlots: number;
    uniqueActors: number;
    concurrency: number; // Avg rooms active at once
    conflictsAvoided: number;
}

type TrackType = "Acting" | "Music" | "Dance";

export default function AutoSchedulerModal({ isOpen, onClose, scenes, people, onCommit }: any) {
    const [isGenerating, setIsGenerating] = useState(false);
    const [previewSchedule, setPreviewSchedule] = useState<any[]>([]);
    const [stats, setStats] = useState<ScheduleStats | null>(null);

    // 🆕 PRIORITY STATE (Default: Music -> Dance -> Acting)
    const [trackPriority, setTrackPriority] = useState<TrackType[]>(['Music', 'Dance', 'Acting']);

    // --- HELPER: Move items up/down in priority ---
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

    // --- 🧮 THE MULTI-TRACK ALGORITHM ---
    const generateSchedule = () => {
        setIsGenerating(true);
        
        // 1. Setup Time Slots (The Grid)
        const timeSlots: { day: 'Fri' | 'Sat', time: number }[] = [];
        
        // Friday: 6:00 PM - 9:00 PM
        for (let t = 18; t < 21; t += 0.5) timeSlots.push({ day: 'Fri', time: t });
        
        // Saturday: 10:00 AM - 5:00 PM (Skipping 1:00-2:00 for Lunch)
        for (let t = 10; t < 17; t += 0.5) {
            if (t >= 13 && t < 14) continue; // LUNCH BREAK 🥪
            timeSlots.push({ day: 'Sat', time: t });
        }

        // 2. Initialize Tracking
        const proposedSchedule: any[] = [];
        const scheduledCast = new Set<string>(); // Equity tracking
        const completedScenes = new Set<string>(); // Don't repeat scenes this weekend
        let conflictsAvoided = 0;
        let totalActiveRooms = 0;

        // 3. THE LOOP: Iterate through Time, then Tracks
        timeSlots.forEach((slot) => {
            const busyActorsInThisSlot = new Set<string>(); // Reset for every time slot
            let roomsActive = 0;

            // ⚡️ USE DYNAMIC PRIORITY HERE
            trackPriority.forEach((track) => {
                
                // Filter eligible scenes for this track
                const candidates = scenes.filter((scene: any) => {
                    // Rule A: Don't repeat scenes we just scheduled this weekend
                    if (completedScenes.has(`${scene.id}-${track}`)) return false;

                    // Rule B: Skill Check
                    const type = (scene.type || "").toLowerCase();
                    if (track === 'Music' && !type.includes('song') && !type.includes('mixed')) return false;
                    if (track === 'Dance' && !type.includes('dance') && !type.includes('mixed')) return false;
                    
                    return true;
                });

                // Score Candidates
                const scored = candidates.map((scene: any) => {
                    let score = 0;
                    
                    // CRITICAL: CONFLICT CHECK
                    // If any actor in this scene is already in `busyActorsInThisSlot`, DQ this scene
                    const hasConflict = scene.cast.some((c: any) => busyActorsInThisSlot.has(c.name));
                    if (hasConflict) {
                        conflictsAvoided++;
                        return { ...scene, score: -9999 };
                    }

                    // Bonus 1: Progress (New stuff first)
                    if (scene.status === 'New') score += 20;
                    if (scene.status === 'Worked') score += 5;

                    // Bonus 2: Equity (Get uncalled kids in)
                    const newFaces = scene.cast.filter((c:any) => !scheduledCast.has(c.name)).length;
                    score += (newFaces * 10);

                    // Bonus 3: Efficiency (Prefer larger groups to clear bulk)
                    score += scene.cast.length;

                    return { ...scene, score };
                });

                // Pick Winner
                scored.sort((a: any, b: any) => b.score - a.score);
                const winner = scored[0];

                if (winner && winner.score > 0) {
                    // BOOK IT
                    proposedSchedule.push({
                        id: Math.random().toString(),
                        sceneId: winner.id,
                        sceneName: winner.name,
                        track: track,
                        day: slot.day,
                        weekOffset: 0,
                        startTime: slot.time,
                        duration: SLOT_DUR,
                        status: 'New',
                        castSize: winner.cast.length
                    });

                    // Mark actors as busy for this specific 30min block
                    winner.cast.forEach((c:any) => {
                        busyActorsInThisSlot.add(c.name);
                        scheduledCast.add(c.name);
                    });

                    // Mark scene-track as done for weekend so we don't spam it
                    completedScenes.add(`${winner.id}-${track}`);
                    roomsActive++;
                }
            });
            
            totalActiveRooms += roomsActive;
        });

        // 4. Finalize
        setTimeout(() => {
            const allCastCount = new Set(scenes.flatMap((s:any) => s.cast.map((c:any) => c.name))).size;
            
            setPreviewSchedule(proposedSchedule);
            setStats({
                totalSlots: proposedSchedule.length,
                uniqueActors: scheduledCast.size,
                castCoverage: allCastCount > 0 ? Math.round((scheduledCast.size / allCastCount) * 100) : 0,
                concurrency: parseFloat((totalActiveRooms / timeSlots.length).toFixed(1)),
                conflictsAvoided
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

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[100] bg-black/90 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-zinc-900 border border-white/10 w-full max-w-5xl h-[85vh] rounded-3xl shadow-2xl flex flex-col overflow-hidden">
                
                {/* Header */}
                <div className="p-6 border-b border-white/10 bg-zinc-900 flex justify-between items-center shrink-0">
                    <div>
                        <h2 className="text-2xl font-black uppercase italic tracking-tighter text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-500 flex items-center gap-2">
                            <Wand2 size={24} className="text-purple-400" /> Multi-Track Auto-Scheduler
                        </h2>
                        <p className="text-xs text-zinc-500 font-bold uppercase tracking-widest mt-1">Conflict-Free Generator v3.1</p>
                    </div>
                    <button onClick={onClose} className="p-2 bg-zinc-800 rounded-full hover:bg-zinc-700 text-zinc-400 hover:text-white"><X size={20}/></button>
                </div>

                <div className="flex flex-1 overflow-hidden">
                    
                    {/* LEFT: Controls */}
                    <div className="w-80 bg-zinc-900/50 border-r border-white/5 p-6 flex flex-col gap-6 overflow-y-auto custom-scrollbar">
                        
                        {/* 1. PRIORITY SORTER */}
                        <div className="bg-black/20 p-5 rounded-2xl border border-white/5 space-y-4">
                            <div className="flex justify-between items-center">
                                <h3 className="text-xs font-black uppercase text-zinc-500 tracking-widest flex items-center gap-2">
                                    <Layers size={14}/> Priority Order
                                </h3>
                                <span className="text-[9px] text-zinc-600 uppercase font-bold">High to Low</span>
                            </div>
                            
                            <div className="space-y-2">
                                {trackPriority.map((track, i) => (
                                    <div key={track} className="flex items-center gap-3 p-2 bg-zinc-800/50 rounded-lg border border-white/5 group">
                                        <div className="text-[10px] font-mono text-zinc-600 w-4">{i + 1}</div>
                                        <div className="flex-1 flex items-center gap-2">
                                            <div className="p-1.5 bg-black/40 rounded">{getTrackIcon(track)}</div>
                                            <span className="text-xs font-bold text-zinc-300">{track}</span>
                                        </div>
                                        
                                        {/* Reorder Buttons */}
                                        <div className="flex flex-col opacity-0 group-hover:opacity-100 transition-opacity">
                                            <button 
                                                onClick={() => movePriority(i, 'up')} 
                                                disabled={i === 0}
                                                className="hover:text-white text-zinc-500 disabled:opacity-0"
                                            >
                                                <ArrowUp size={10}/>
                                            </button>
                                            <button 
                                                onClick={() => movePriority(i, 'down')} 
                                                disabled={i === trackPriority.length - 1}
                                                className="hover:text-white text-zinc-500 disabled:opacity-0"
                                            >
                                                <ArrowDown size={10}/>
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                            <p className="text-[9px] text-zinc-500 italic leading-tight">
                                The system attempts to fill slot #1 first. If a student is booked there, they cannot be used in #2 or #3 for that time slot.
                            </p>
                        </div>

                        {/* 2. TIME FRAME INFO */}
                        <div className="bg-black/20 p-5 rounded-2xl border border-white/5 space-y-2">
                            <h3 className="text-xs font-black uppercase text-zinc-500 tracking-widest flex items-center gap-2">
                                <Clock size={14}/> Time Frame
                            </h3>
                            <div className="text-xs text-zinc-400">
                                <p><span className="text-white font-bold">Fri:</span> 6pm - 9pm</p>
                                <p className="mt-1"><span className="text-white font-bold">Sat:</span> 10am - 5pm</p>
                                <p className="text-[10px] text-zinc-600 mt-1 italic">* Includes 1hr Lunch</p>
                            </div>
                        </div>

                        <div className="mt-auto">
                            <button 
                                onClick={generateSchedule} 
                                disabled={isGenerating}
                                className="w-full py-4 bg-purple-600 hover:bg-purple-500 rounded-xl text-white font-black uppercase tracking-widest shadow-lg shadow-purple-900/20 flex items-center justify-center gap-2 transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {isGenerating ? <Loader2 className="animate-spin"/> : <Wand2 size={18}/>}
                                {isGenerating ? "Solving..." : "Generate Weekend"}
                            </button>
                            {previewSchedule.length > 0 && (
                                <button 
                                    onClick={() => { onCommit(previewSchedule); onClose(); }} 
                                    className="w-full mt-3 py-3 bg-emerald-600 hover:bg-emerald-500 rounded-xl text-white font-black uppercase tracking-widest shadow-lg shadow-emerald-900/20 flex items-center justify-center gap-2 transition-all"
                                >
                                    <CheckCircle2 size={18}/> Commit
                                </button>
                            )}
                        </div>
                    </div>

                    {/* RIGHT: Preview */}
                    <div className="flex-1 bg-zinc-950 p-8 overflow-y-auto custom-scrollbar">
                        {previewSchedule.length === 0 ? (
                            <div className="h-full flex flex-col items-center justify-center text-zinc-600 opacity-50">
                                <Calendar size={64} className="mb-4"/>
                                <p className="text-sm font-bold uppercase">Ready to Optimize</p>
                                <p className="text-xs">Click Generate to fill 3 simultaneous tracks.</p>
                            </div>
                        ) : (
                            <div className="space-y-8">
                                {/* Scoreboard */}
                                <div className="grid grid-cols-4 gap-4">
                                    <div className="bg-zinc-900 border border-white/10 p-4 rounded-xl text-center">
                                        <div className="text-2xl font-black text-white">{stats?.totalSlots}</div>
                                        <div className="text-[9px] font-bold uppercase text-zinc-500">Total Slots</div>
                                    </div>
                                    <div className="bg-zinc-900 border border-white/10 p-4 rounded-xl text-center">
                                        <div className="text-2xl font-black text-emerald-400">{stats?.castCoverage}%</div>
                                        <div className="text-[9px] font-bold uppercase text-emerald-600/70">Equity (Cast %)</div>
                                    </div>
                                    <div className="bg-zinc-900 border border-white/10 p-4 rounded-xl text-center">
                                        <div className="text-2xl font-black text-blue-400">{stats?.concurrency}</div>
                                        <div className="text-[9px] font-bold uppercase text-blue-600/70">Avg Concurrent Rooms</div>
                                    </div>
                                    <div className="bg-zinc-900 border border-white/10 p-4 rounded-xl text-center">
                                        <div className="text-2xl font-black text-amber-500">{stats?.conflictsAvoided}</div>
                                        <div className="text-[9px] font-bold uppercase text-amber-600/70">Conflicts Solved</div>
                                    </div>
                                </div>

                                {/* Timeline Preview */}
                                <div className="space-y-6">
                                    {['Fri', 'Sat'].map(day => {
                                        const dayItems = previewSchedule.filter(i => i.day === day);
                                        // Group by Time
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
                                                        
                                                        // Time Label
                                                        const h = Math.floor(timeNum);
                                                        const m = (timeNum % 1 * 60).toString().padStart(2, '0');
                                                        const label = `${h > 12 ? h-12 : h}:${m}`;

                                                        return (
                                                            <div key={t} className="flex gap-4">
                                                                <div className="w-12 pt-3 text-right text-xs font-mono text-zinc-500 shrink-0">{label}</div>
                                                                <div className="flex-1 grid grid-cols-3 gap-2">
                                                                    {/* Render 3 potential slots based on CURRENT PRIORITY ORDER */}
                                                                    {trackPriority.map(track => {
                                                                        const item = slotItems.find((i:any) => i.track === track);
                                                                        
                                                                        if (!item) return (
                                                                            <div key={track} className="h-12 rounded-lg border border-dashed border-white/5 bg-transparent" />
                                                                        );

                                                                        const color = track === 'Acting' ? 'border-blue-500/30 bg-blue-900/10 text-blue-200' 
                                                                                    : track === 'Music' ? 'border-pink-500/30 bg-pink-900/10 text-pink-200' 
                                                                                    : 'border-emerald-500/30 bg-emerald-900/10 text-emerald-200';

                                                                        return (
                                                                            <div key={track} className={`h-12 rounded-lg border px-3 flex flex-col justify-center ${color}`}>
                                                                                <div className="text-xs font-bold truncate">{item.sceneName}</div>
                                                                                <div className="text-[9px] opacity-60 uppercase flex justify-between">
                                                                                    <span>{track}</span>
                                                                                    <span>{item.castSize} Actors</span>
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
                        )}
                    </div>

                </div>
            </div>
        </div>
    );
}