"use client";

import React, { useState } from 'react';
import { 
    Wand2, X, CheckCircle2, AlertTriangle, 
    Calendar, Users, ArrowRight, Loader2,
    Clock, Scale, Ban
} from 'lucide-react';

// --- CONFIGURATION ---
const FRI_START = 18; // 6 PM
const FRI_END = 21;   // 9 PM
const SAT_START = 10; // 10 AM
const SAT_END = 17;   // 5 PM (Lunch logic handled by gaps)
const SLOT_DUR = 30;  // 30 min slots

// --- TYPES ---
interface ScheduleStats {
    totalSlots: number;
    uniqueActors: number;
    castCoverage: number;
    idleViolations: number;
    shortCalls: number; // Calls < 60 mins
}

export default function AutoSchedulerModal({ isOpen, onClose, scenes, people, onCommit }: any) {
    const [isGenerating, setIsGenerating] = useState(false);
    const [previewSchedule, setPreviewSchedule] = useState<any[]>([]);
    const [stats, setStats] = useState<ScheduleStats | null>(null);
    const [logs, setLogs] = useState<string[]>([]);

    // --- 🧮 THE ALGORITHM ---
    const generateSchedule = () => {
        setIsGenerating(true);
        setLogs([]); // Clear logs
        
        // 1. Setup Time Slots (Chronological)
        const timeSlots: any[] = [];
        // Friday
        for (let t = FRI_START; t < FRI_END; t += (SLOT_DUR/60)) {
            timeSlots.push({ day: 'Fri', startTime: t });
        }
        // Saturday
        for (let t = SAT_START; t < SAT_END; t += (SLOT_DUR/60)) {
            timeSlots.push({ day: 'Sat', startTime: t });
        }

        // 2. Initialize Tracking State
        const scheduledCast = new Set<string>(); // Who has been called at least once?
        const studentLastTime: Record<string, { day: string, end: number, totalDur: number }> = {}; 
        const proposedSchedule: any[] = [];
        const usedSceneIds = new Set<number>();

        // 3. The Solver Loop
        timeSlots.forEach((slot, slotIdx) => {
            const isFriday = slot.day === 'Fri';
            
            // Score every available scene for this slot
            const candidates = scenes.map((scene: any) => {
                // HARD EXCLUSION: Already scheduled?
                if (usedSceneIds.has(scene.id)) return { ...scene, score: -9999 };

                let score = 0;
                let idlePenalty = false;
                
                // --- CONSTRAINT 1: EQUITY (Attendance) ---
                // Big points for getting new faces in the room
                const uncalledCount = scene.cast.filter((c:any) => !scheduledCast.has(c.name)).length;
                score += (uncalledCount * 20); 

                // --- CONSTRAINT 2: PROGRESS (New vs Worked) ---
                // Prioritize "New" scenes to clear the backlog
                if (scene.status === 'New') score += 10;
                
                // --- CONSTRAINT 3: IDLE TIME BUFFER (The "2 Hour" Rule) ---
                // Check every actor in this scene
                scene.cast.forEach((c:any) => {
                    const last = studentLastTime[c.name];
                    
                    if (last && last.day === slot.day) {
                        const gap = slot.startTime - last.end;
                        
                        // PERFECT: Back-to-back (0 gap) -> Boost for "Family Time" efficiency
                        if (gap === 0) score += 15; 
                        
                        // OKAY: Small break (< 2 hours) -> Small penalty (coffee break)
                        else if (gap > 0 && gap <= 2) score -= (gap * 2); 
                        
                        // VIOLATION: > 2 hours gap -> NUKE IT
                        else if (gap > 2) {
                            score -= 1000; 
                            idlePenalty = true;
                        }
                    }
                });

                // --- CONSTRAINT 4: COHORT MIXING ---
                // Heuristic: If we just did a small scene, try to do a big one next
                const prevScene = proposedSchedule[slotIdx - 1];
                if (prevScene) {
                    const prevSize = prevScene.castSize || 5;
                    const currSize = scene.cast.length;
                    // Reward variety in cast size
                    if (Math.abs(currSize - prevSize) > 5) score += 5;
                }

                return { ...scene, score, idlePenalty };
            });

            // Sort and Pick
            candidates.sort((a: any, b: any) => b.score - a.score);
            const winner = candidates[0];

            if (winner && winner.score > -500) {
                // Commit to Schedule
                const newItem = {
                    id: Math.random().toString(),
                    sceneId: winner.id,
                    sceneName: winner.name, // Snapshot name for preview
                    track: "Acting",
                    day: slot.day,
                    weekOffset: 0,
                    startTime: slot.startTime,
                    duration: SLOT_DUR,
                    status: 'New',
                    castSize: winner.cast.length
                };
                
                proposedSchedule.push(newItem);
                usedSceneIds.add(winner.id);
                
                // Update Student Trackers
                winner.cast.forEach((c:any) => {
                    scheduledCast.add(c.name);
                    const prevDur = studentLastTime[c.name]?.totalDur || 0;
                    studentLastTime[c.name] = { 
                        day: slot.day, 
                        end: slot.startTime + (SLOT_DUR/60),
                        totalDur: prevDur + SLOT_DUR
                    };
                });
            }
        });

        // 4. Calculate Stats & Finish
        setTimeout(() => {
            const allCastCount = new Set(scenes.flatMap((s:any) => s.cast.map((c:any) => c.name))).size;
            
            // Check "Family Time" Rule (<60 min calls)
            let shortCalls = 0;
            Object.values(studentLastTime).forEach(stat => {
                if (stat.totalDur < 60) shortCalls++;
            });

            setPreviewSchedule(proposedSchedule);
            setStats({
                totalSlots: proposedSchedule.length,
                uniqueActors: scheduledCast.size,
                castCoverage: Math.round((scheduledCast.size / allCastCount) * 100),
                idleViolations: 0, // Algorithm prevents these via score nuke
                shortCalls
            });
            setIsGenerating(false);
        }, 600);
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[100] bg-black/90 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-zinc-900 border border-white/10 w-full max-w-4xl h-[90vh] rounded-3xl shadow-2xl flex flex-col overflow-hidden">
                
                {/* Header */}
                <div className="p-6 border-b border-white/10 bg-zinc-950 flex justify-between items-center shrink-0">
                    <div>
                        <h2 className="text-2xl font-black uppercase italic tracking-tighter text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-500 flex items-center gap-2">
                            <Wand2 size={24} className="text-blue-400" /> Auto-Scheduler
                        </h2>
                        <p className="text-xs text-zinc-500 font-bold uppercase tracking-widest mt-1">AI Constraint Solver v2.0</p>
                    </div>
                    <button onClick={onClose} className="p-2 bg-zinc-800 rounded-full hover:bg-zinc-700 text-zinc-400 hover:text-white"><X size={20}/></button>
                </div>

                <div className="flex flex-1 overflow-hidden">
                    
                    {/* LEFT: Rules & Controls */}
                    <div className="w-80 bg-zinc-900 border-r border-white/5 p-6 flex flex-col gap-6 overflow-y-auto custom-scrollbar">
                        
                        {/* Rules Card */}
                        <div className="bg-black/20 p-5 rounded-2xl border border-white/5 space-y-4">
                            <h3 className="text-xs font-black uppercase text-zinc-500 tracking-widest flex items-center gap-2">
                                <Scale size={14}/> Active Constraints
                            </h3>
                            
                            <div className="space-y-3">
                                <div className="flex items-start gap-3">
                                    <div className="mt-0.5 p-1 bg-emerald-500/10 rounded text-emerald-500"><Users size={14}/></div>
                                    <div>
                                        <p className="text-sm font-bold text-zinc-200">Equity First</p>
                                        <p className="text-[10px] text-zinc-500 leading-tight">Prioritize students with 0 calls this week.</p>
                                    </div>
                                </div>
                                <div className="flex items-start gap-3">
                                    <div className="mt-0.5 p-1 bg-amber-500/10 rounded text-amber-500"><Clock size={14}/></div>
                                    <div>
                                        <p className="text-sm font-bold text-zinc-200">2-Hour Buffer</p>
                                        <p className="text-[10px] text-zinc-500 leading-tight">No gaps larger than 2hrs for any student.</p>
                                    </div>
                                </div>
                                <div className="flex items-start gap-3">
                                    <div className="mt-0.5 p-1 bg-blue-500/10 rounded text-blue-500"><Users size={14}/></div>
                                    <div>
                                        <p className="text-sm font-bold text-zinc-200">Family Respect</p>
                                        <p className="text-[10px] text-zinc-500 leading-tight">Chain sessions to hit 60m min call time.</p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Generate Button */}
                        <div className="mt-auto">
                            <button 
                                onClick={generateSchedule} 
                                disabled={isGenerating}
                                className="w-full py-4 bg-blue-600 hover:bg-blue-500 rounded-xl text-white font-black uppercase tracking-widest shadow-lg shadow-blue-900/20 flex items-center justify-center gap-2 transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {isGenerating ? <Loader2 className="animate-spin"/> : <Wand2 size={18}/>}
                                {isGenerating ? "Computing..." : "Run Solver"}
                            </button>
                            {previewSchedule.length > 0 && (
                                <button 
                                    onClick={() => { onCommit(previewSchedule); onClose(); }} 
                                    className="w-full mt-3 py-3 bg-emerald-600 hover:bg-emerald-500 rounded-xl text-white font-black uppercase tracking-widest shadow-lg shadow-emerald-900/20 flex items-center justify-center gap-2 transition-all"
                                >
                                    <CheckCircle2 size={18}/> Commit to Calendar
                                </button>
                            )}
                        </div>

                    </div>

                    {/* RIGHT: Results Preview */}
                    <div className="flex-1 bg-zinc-950 p-6 overflow-y-auto custom-scrollbar">
                        {previewSchedule.length === 0 ? (
                            <div className="h-full flex flex-col items-center justify-center text-zinc-600 opacity-50">
                                <Calendar size={64} className="mb-4"/>
                                <p className="text-sm font-bold uppercase">Ready to Schedule</p>
                            </div>
                        ) : (
                            <div className="space-y-6">
                                
                                {/* Scoreboard */}
                                <div className="grid grid-cols-3 gap-4">
                                    <div className="bg-zinc-900 border border-white/10 p-4 rounded-xl text-center">
                                        <div className="text-2xl font-black text-white">{stats?.castCoverage}%</div>
                                        <div className="text-[9px] font-bold uppercase text-zinc-500">Cast Coverage</div>
                                    </div>
                                    <div className={`bg-zinc-900 border p-4 rounded-xl text-center ${stats?.shortCalls === 0 ? 'border-emerald-500/30' : 'border-amber-500/30'}`}>
                                        <div className={`text-2xl font-black ${stats?.shortCalls === 0 ? 'text-emerald-500' : 'text-amber-500'}`}>{stats?.shortCalls}</div>
                                        <div className="text-[9px] font-bold uppercase text-zinc-500">Short Calls (&lt;60m)</div>
                                    </div>
                                    <div className="bg-zinc-900 border border-white/10 p-4 rounded-xl text-center">
                                        <div className="text-2xl font-black text-blue-500">{previewSchedule.length}</div>
                                        <div className="text-[9px] font-bold uppercase text-zinc-500">Scenes Added</div>
                                    </div>
                                </div>

                                {/* The Schedule List */}
                                <div className="space-y-6">
                                    {['Fri', 'Sat'].map(day => {
                                        const dayItems = previewSchedule.filter(i => i.day === day);
                                        if (dayItems.length === 0) return null;
                                        return (
                                            <div key={day}>
                                                <h4 className="text-xs font-black uppercase text-zinc-500 mb-3 border-b border-white/10 pb-1">{day === 'Fri' ? 'Friday' : 'Saturday'}</h4>
                                                <div className="space-y-2">
                                                    {dayItems.map((item, i) => (
                                                        <div key={i} className="flex items-center gap-4 p-3 bg-zinc-900 border border-white/5 rounded-xl">
                                                            <div className="font-mono text-xs text-zinc-400 w-16">
                                                                {Math.floor(item.startTime)}:{(item.startTime % 1 * 60).toString().padStart(2, '0')}
                                                            </div>
                                                            <div className="flex-1">
                                                                <div className="text-sm font-bold text-white">{item.sceneName}</div>
                                                                <div className="text-[10px] text-zinc-500 uppercase">{item.castSize} Actors</div>
                                                            </div>
                                                            <div className="px-2 py-1 bg-black/40 rounded text-[10px] font-bold text-zinc-400 border border-white/5">
                                                                {item.duration}m
                                                            </div>
                                                        </div>
                                                    ))}
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