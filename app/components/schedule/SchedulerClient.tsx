"use client";

import React, { useState, useMemo } from 'react';
import { 
  Users, ChevronRight, ChevronLeft, Search,
  CheckCircle2, Plus, Minus,
  TrendingUp, Calendar as CalendarIcon, 
  LayoutGrid, Coffee, Umbrella, Wand2,
  FileText, Mic2, Music, Theater,
  Target, AlertTriangle, Clock
} from 'lucide-react';

// --- IMPORTS ---
import AutoSchedulerModal from './AutoSchedulerModal'; 
import CallboardView from './CallboardView'; 

// --- TYPES ---
type TrackType = "Acting" | "Music" | "Dance";
type SceneStatus = "New" | "Worked" | "Polished";

interface ScheduledItem {
  id: string;
  sceneId: number;
  track: TrackType;
  day: 'Fri' | 'Sat';
  weekOffset: number;
  startTime: number;
  duration: number;
  status: SceneStatus;
}

// --- CONFIG ---
const FRI_START = 18; 
const FRI_END = 21;   
const SAT_START = 10; 
const SAT_END = 17;   
const TOTAL_WEEKS = 10;
const CURRENT_WEEK = 4;
const TARGET_WEEK = 8; 

// ============================================================================
// MAIN COMPONENT
// ============================================================================
export default function SchedulerClient({ 
    scenes = [], 
    assignments = [], 
    people = [], 
    productionTitle = "Untitled Production" 
}: any) {
  
  // --- STATE ---
  const [activeTab, setActiveTab] = useState<'calendar' | 'progress' | 'callboard'>('calendar');
  const [isAutoSchedulerOpen, setIsAutoSchedulerOpen] = useState(false);
  const [schedule, setSchedule] = useState<ScheduledItem[]>([]); 
  
  // --- SHARED DATA PREP (The Fix) ---
  const sceneData = useMemo(() => {
    // 🛡️ SAFETY: Abort if data isn't loaded yet
    if (!scenes || !assignments) return [];

    // 1. Create a Map: SceneID -> List of Actor Names
    // We leverage the fact that 'assignments' now contains 'sceneIds'
    const sceneCastMap = new Map<number, Set<string>>();

    assignments.forEach((a: any) => {
        const actorName = a.personName;
        // Skip empty assignments or assignments without linked scenes
        if (!actorName || !a.sceneIds) return;

        a.sceneIds.forEach((sceneId: number) => {
            if (!sceneCastMap.has(sceneId)) sceneCastMap.set(sceneId, new Set());
            sceneCastMap.get(sceneId)?.add(actorName);
        });
    });

    // 2. Hydrate Scenes with Clean Keys
    return scenes.map((s: any) => {
        const castSet = sceneCastMap.get(s.id) || new Set();
        const castNames = Array.from(castSet);

        return {
            id: s.id,
            // 🚨 FIX: Use 's.name' (Clean) instead of 's["Scene Name"]' (Raw)
            name: s.name || "Untitled Scene",
            act: s.act || "1",
            type: s.type || "Scene",
            
            // Cast for the AutoScheduler (Array of objects)
            cast: castNames.map(name => ({ name })),
            // Cast for the Callboard (Array of strings)
            castNames: castNames, 
            
            status: 'New'
        };
    }).sort((a: any, b: any) => a.id - b.id);
  }, [scenes, assignments]);

  // --- DERIVED DATA FOR CALLBOARD ---
  const callboardSchedule = useMemo(() => {
      return schedule.map(slot => {
          const scene = sceneData.find(s => s.id === slot.sceneId);
          return {
              ...slot,
              sceneName: scene?.name || "Unknown",
              castList: scene?.castNames || []
          };
      });
  }, [schedule, sceneData]);

  return (
    <div className="flex flex-col h-screen bg-zinc-950 text-white overflow-hidden font-sans">
        
        {/* HEADER */}
        <header className="h-16 border-b border-white/10 bg-zinc-900 flex items-center justify-between px-6 shrink-0 z-30">
            <div className="flex items-center gap-6">
                <div>
                    <div className="text-[10px] font-black uppercase text-zinc-500 tracking-widest">Production Schedule</div>
                    <h1 className="text-lg font-bold text-white">{productionTitle}</h1>
                </div>

                {/* TAB SWITCHER */}
                <div className="flex bg-black/40 p-1 rounded-lg border border-white/5">
                    <button 
                        onClick={() => setActiveTab('calendar')}
                        className={`px-4 py-1.5 rounded-md text-xs font-bold uppercase transition-all flex items-center gap-2 ${activeTab === 'calendar' ? 'bg-zinc-700 text-white shadow' : 'text-zinc-500 hover:text-white'}`}
                    >
                        <CalendarIcon size={14}/> Calendar
                    </button>
                    <button 
                        onClick={() => setActiveTab('progress')}
                        className={`px-4 py-1.5 rounded-md text-xs font-bold uppercase transition-all flex items-center gap-2 ${activeTab === 'progress' ? 'bg-blue-600 text-white shadow' : 'text-zinc-500 hover:text-white'}`}
                    >
                        <TrendingUp size={14}/> Burn-Up
                    </button>
                     <button 
                        onClick={() => setActiveTab('callboard')}
                        className={`px-4 py-1.5 rounded-md text-xs font-bold uppercase transition-all flex items-center gap-2 ${activeTab === 'callboard' ? 'bg-emerald-600 text-white shadow' : 'text-zinc-500 hover:text-white'}`}
                    >
                        <FileText size={14}/> Callboard
                    </button>
                </div>
            </div>
            
            <div className="flex items-center gap-4">
                 <div className="text-right hidden md:block">
                    <div className="text-[10px] text-zinc-500 font-mono">Current Week</div>
                    <div className="text-sm font-black text-emerald-400">Week {CURRENT_WEEK} of {TOTAL_WEEKS}</div>
                 </div>
                 
                 <button 
                    onClick={() => setIsAutoSchedulerOpen(true)}
                    className="flex items-center gap-2 bg-purple-600/20 hover:bg-purple-600/40 text-purple-300 border border-purple-500/50 px-3 py-2 rounded-lg text-xs font-black uppercase tracking-wider transition-all"
                 >
                    <Wand2 size={14} /> Auto
                 </button>
            </div>
        </header>

        {/* CONTENT AREA */}
        <div className="flex-1 overflow-hidden relative">
            {activeTab === 'calendar' && (
                <CalendarView 
                    sceneData={sceneData} 
                    schedule={schedule} 
                    setSchedule={setSchedule} 
                />
            )}
            
            {activeTab === 'progress' && (
                <BurnUpView sceneData={sceneData} />
            )}

            {activeTab === 'callboard' && (
                <CallboardView 
                    schedule={callboardSchedule}
                    productionTitle={productionTitle}
                />
            )}
        </div>

        {/* AUTO SCHEDULER MODAL */}
        <AutoSchedulerModal 
            isOpen={isAutoSchedulerOpen} 
            onClose={() => setIsAutoSchedulerOpen(false)}
            scenes={sceneData}
            people={people}
            onCommit={(newItems: any[]) => {
                setSchedule(prev => [...prev, ...newItems]);
            }}
        />

    </div>
  );
}

// ============================================================================
// SUB-COMPONENT: CALENDAR VIEW
// ============================================================================
function CalendarView({ sceneData, schedule, setSchedule }: any) {
  const [draggedSceneId, setDraggedSceneId] = useState<number | null>(null);
  const [currentWeekOffset, setCurrentWeekOffset] = useState(0);
  const [searchQuery, setSearchQuery] = useState("");

  const handleDrop = (e: React.DragEvent, day: 'Fri' | 'Sat', hour: number, min: number, track: TrackType) => {
      e.preventDefault();
      const sceneId = parseInt(e.dataTransfer.getData("sceneId"));
      if(!sceneId) return;
      const startTime = hour + (min / 60);
      const newBlock: ScheduledItem = {
          id: Date.now().toString(),
          sceneId, track, day, weekOffset: currentWeekOffset, startTime, duration: 30, status: 'New'
      };
      setSchedule((prev: any) => [...prev, newBlock]);
      setDraggedSceneId(null);
  };

  const updateDuration = (itemId: string, change: number) => {
      setSchedule((prev: any) => prev.map((item: any) => item.id === itemId ? { ...item, duration: Math.max(15, item.duration + change) } : item));
  };

  const weekLabel = useMemo(() => {
      const today = new Date();
      const nextFri = new Date(today);
      nextFri.setDate(today.getDate() + (5 + 7 - today.getDay()) % 7 + (currentWeekOffset * 7));
      return `Week of ${nextFri.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`;
  }, [currentWeekOffset]);

  const generateSlots = (start: number, end: number) => {
      const s = [];
      for (let h = start; h < end; h++) { [0, 15, 30, 45].forEach(m => s.push({ h, m, val: h + m/60 })); }
      return s;
  };
  const friSlots = generateSlots(FRI_START, FRI_END);
  const satSlots = generateSlots(SAT_START, SAT_END);

  return (
    <div className="flex h-full">
         <aside className="w-72 border-r border-white/10 flex flex-col bg-zinc-900 shrink-0 z-20 shadow-xl">
             <div className="p-4 border-b border-white/10">
                <div className="relative">
                    <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-zinc-500"/>
                    <input 
                        value={searchQuery} 
                        onChange={(e) => setSearchQuery(e.target.value)} 
                        placeholder="Filter scenes..." 
                        className="w-full bg-black/20 border border-white/10 rounded-lg pl-8 pr-3 py-1.5 text-xs focus:border-blue-500 outline-none text-white"
                    />
                </div>
             </div>
             <div className="flex-1 overflow-y-auto px-2 space-y-1 custom-scrollbar pt-2">
                 {/* 🚨 FIX: Safe check for scene name */}
                 {sceneData.filter((s:any) => (s.name || "").toLowerCase().includes(searchQuery.toLowerCase())).map((scene: any) => (
                     <div key={scene.id} draggable onDragStart={(e) => { e.dataTransfer.setData("sceneId", scene.id.toString()); setDraggedSceneId(scene.id); }} onDragEnd={() => setDraggedSceneId(null)}
                         className="border border-white/5 bg-zinc-900 p-2 rounded cursor-grab active:cursor-grabbing hover:bg-white/5 transition-all">
                         <div className="flex justify-between items-center mb-1">
                             <span className="font-bold text-xs text-zinc-200 truncate">{scene.name}</span>
                         </div>
                         <div className="flex items-center gap-2 text-[10px] text-zinc-500">
                              <span className="bg-black/30 px-1 rounded">Act {scene.act}</span>
                              <span>{scene.cast.length} Actors</span>
                         </div>
                     </div>
                 ))}
             </div>
         </aside>

         <main className="flex-1 flex flex-col min-w-0 bg-zinc-950 relative">
             <div className="h-12 border-b border-white/10 bg-zinc-900/50 flex items-center justify-center gap-4 shrink-0">
                 <button onClick={() => setCurrentWeekOffset(c => c - 1)} className="text-zinc-400 hover:text-white"><ChevronLeft size={16}/></button>
                 <span className="text-xs font-bold text-zinc-300 w-32 text-center">{weekLabel}</span>
                 <button onClick={() => setCurrentWeekOffset(c => c + 1)} className="text-zinc-400 hover:text-white"><ChevronRight size={16}/></button>
             </div>
             <div className="flex-1 overflow-y-auto custom-scrollbar bg-zinc-950 p-4">
                 <div className="flex gap-4 h-full min-h-[600px]">
                     {[
                         { day: 'Fri', slots: friSlots, start: FRI_START }, 
                         { day: 'Sat', slots: satSlots, start: SAT_START }
                     ].map((col: any) => (
                         <div key={col.day} className="flex-1 flex flex-col bg-zinc-900 border border-white/10 rounded-xl overflow-hidden">
                             <div className="p-2 bg-zinc-800 text-center font-black uppercase text-zinc-400 text-xs">{col.day === 'Fri' ? 'Friday' : 'Saturday'}</div>
                             <div className="flex-1 relative flex">
                                 <div className="w-12 bg-zinc-950/50 border-r border-white/5 text-[9px] text-zinc-600 font-mono text-right py-2">
                                     {col.slots.filter((s:any) => s.m === 0).map((s:any) => (
                                         <div key={s.val} style={{ height: '128px' }} className="pr-2 pt-1 border-b border-white/5">{s.h > 12 ? s.h-12 : s.h} {s.h >= 12 ? 'PM' : 'AM'}</div>
                                     ))}
                                 </div>
                                 <div className="flex-1 grid grid-cols-3 divide-x divide-white/5 relative">
                                     {['Acting', 'Music', 'Dance'].map((track) => (
                                         <div key={track} className="relative">
                                              <div className="absolute top-0 inset-x-0 p-1 text-[8px] font-black uppercase text-center text-zinc-700 bg-zinc-900/80 z-10">{track}</div>
                                              {col.slots.map((slot:any) => (
                                                  <div key={slot.val} className={`h-8 border-b border-white/[0.03] ${draggedSceneId ? 'hover:bg-blue-500/10' : ''}`}
                                                       onDragOver={(e) => e.preventDefault()} onDrop={(e) => handleDrop(e, col.day, slot.h, slot.m, track as TrackType)}/>
                                              ))}
                                              {schedule.filter((i: any) => i.day === col.day && i.track === track && i.weekOffset === currentWeekOffset).map((item: any) => {
                                                  const top = (item.startTime - col.start) * 128;
                                                  const height = (item.duration / 60) * 128;
                                                  const scene = sceneData.find((s:any) => s.id === item.sceneId);
                                                  return (
                                                      <div key={item.id} className="absolute left-1 right-1 rounded border-l-4 p-2 shadow-lg bg-zinc-700 border-zinc-500 text-white text-xs overflow-hidden z-20 group"
                                                           style={{ top: `${top}px`, height: `${height}px` }}>
                                                           <div className="font-bold truncate">{scene?.name}</div>
                                                           <div className="opacity-0 group-hover:opacity-100 absolute bottom-1 right-1 flex gap-1 bg-black/40 rounded">
                                                               <button onClick={() => updateDuration(item.id, -15)} className="p-0.5 hover:bg-white/20"><Minus size={10}/></button>
                                                               <button onClick={() => updateDuration(item.id, 15)} className="p-0.5 hover:bg-white/20"><Plus size={10}/></button>
                                                           </div>
                                                      </div>
                                                  )
                                              })}
                                         </div>
                                     ))}
                                 </div>
                             </div>
                         </div>
                     ))}
                 </div>
             </div>
         </main>
    </div>
  );
}

// ============================================================================
// SUB-COMPONENT: BURN-UP VIEW (Fixed Status Keys)
// ============================================================================
function BurnUpView({ sceneData }: any) {
    const [progress, setProgress] = useState<Record<string, { music: number, dance: number, block: number }>>(() => {
        const initial: any = {};
        sceneData.forEach((s: any) => {
             initial[s.id] = { music: 0, dance: 0, block: 0 };
        });
        return initial;
    });

    const [blackoutWeeks, setBlackoutWeeks] = useState(0); 
    const [simulatedExtra, setSimulatedExtra] = useState(0); 

    const toggle = (id: string, type: 'music' | 'dance' | 'block') => {
        setProgress(prev => ({
            ...prev,
            [id]: { ...prev[id], [type]: (prev[id][type] + 1) % 3 }
        }));
    };

    const getStatusColor = (val: number) => {
        if (val === 2) return 'bg-emerald-500 border-emerald-400 text-white shadow-[0_0_10px_rgba(16,185,129,0.4)]';
        if (val === 1) return 'bg-amber-500 border-amber-400 text-black';
        return 'bg-zinc-800 border-zinc-700 text-zinc-600 hover:bg-zinc-700';
    };

    const getStatusLabel = (val: number) => val === 2 ? 'Done' : val === 1 ? 'Work' : 'New';

    const stats = useMemo(() => {
        let totalUnits = 0;
        let completedUnits = 0;

        sceneData.forEach((s: any) => {
            const type = (s.type || "").toLowerCase();
            const p = progress[s.id] || { music: 0, dance: 0, block: 0 };
            const needsMusic = type.includes('song') || type.includes('mixed');
            const needsDance = type.includes('dance') || type.includes('mixed');
            const needsBlock = true; 

            if (needsMusic) { totalUnits++; if (p.music === 2) completedUnits++; }
            if (needsDance) { totalUnits++; if (p.dance === 2) completedUnits++; }
            if (needsBlock) { totalUnits++; if (p.block === 2) completedUnits++; }
        });

        const velocity = CURRENT_WEEK > 0 ? (completedUnits / CURRENT_WEEK) : 0;
        const simulatedCompleted = completedUnits + simulatedExtra;
        const remaining = totalUnits - simulatedCompleted;
        const weeksLeftNeeded = velocity > 0 ? remaining / velocity : 99;
        const projectedEndWeek = CURRENT_WEEK + weeksLeftNeeded + blackoutWeeks;
        const bufferWeeks = TARGET_WEEK - projectedEndWeek;
        const isSafe = bufferWeeks >= 0;

        return { 
            totalUnits, completedUnits, 
            percent: totalUnits > 0 ? Math.round((simulatedCompleted / totalUnits) * 100) : 0, 
            velocity, projectedEndWeek, isSafe, bufferWeeks
        };
    }, [sceneData, progress, blackoutWeeks, simulatedExtra]);

    return (
        <div className="h-full overflow-y-auto custom-scrollbar p-8 bg-zinc-950">
            <div className="max-w-6xl mx-auto space-y-8">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    <div className={`col-span-2 rounded-3xl p-8 border relative overflow-hidden flex flex-col justify-between transition-colors duration-500 ${stats.isSafe ? 'bg-emerald-950/10 border-emerald-500/20' : 'bg-red-950/10 border-red-500/20'}`}>
                         <div className="relative z-10 flex justify-between items-start">
                             <div>
                                 <h2 className="text-sm font-black uppercase tracking-widest text-zinc-400 flex items-center gap-2">
                                     <Target size={18} className={stats.isSafe ? "text-emerald-500" : "text-red-500"}/> Pace Projection
                                 </h2>
                                 <div className="mt-2 text-5xl font-black text-white">
                                     {stats.percent}% <span className="text-xl text-zinc-600">Show Ready</span>
                                 </div>
                             </div>
                             <div className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider border flex items-center gap-2 ${stats.isSafe ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-red-500/10 text-red-400 border-red-500/20'}`}>
                                {stats.isSafe ? <Coffee size={14}/> : <AlertTriangle size={14}/>}
                                {stats.isSafe ? "You can Relax" : "Push Harder"}
                             </div>
                         </div>
                         <div className="relative z-10 mt-8">
                             <div className="flex justify-between text-[10px] font-black uppercase text-zinc-500 mb-2">
                                 <span>Start</span>
                                 <span className="text-white">Week {CURRENT_WEEK} (Now)</span>
                                 <span className={stats.isSafe ? "text-emerald-400" : "text-red-400"}>Est. Finish: Wk {stats.projectedEndWeek.toFixed(1)}</span>
                                 <span>Week {TOTAL_WEEKS}</span>
                             </div>
                             <div className="h-4 bg-black/40 rounded-full w-full overflow-hidden relative border border-white/5">
                                 <div className="absolute left-0 top-0 bottom-0 bg-emerald-500/10 border-r border-emerald-500/30" style={{ width: `${(TARGET_WEEK / TOTAL_WEEKS) * 100}%` }}></div>
                                 <div className="absolute left-0 top-0 bottom-0 bg-blue-600 rounded-full transition-all duration-1000" style={{ width: `${(CURRENT_WEEK / TOTAL_WEEKS) * 100}%` }}></div>
                                 <div className={`absolute top-0 bottom-0 w-1 shadow-[0_0_15px_rgba(255,255,255,0.8)] z-20 transition-all duration-500 ${stats.isSafe ? 'bg-emerald-400' : 'bg-red-500'}`} style={{ left: `${Math.min((stats.projectedEndWeek / TOTAL_WEEKS) * 100, 100)}%` }} />
                             </div>
                             <p className="text-xs text-zinc-400 text-center mt-3 bg-black/20 py-2 rounded-lg border border-white/5">
                                {stats.isSafe ? `✅ You are ${stats.bufferWeeks.toFixed(1)} weeks ahead of schedule.` : `⚠️ You are ${Math.abs(stats.bufferWeeks).toFixed(1)} weeks behind target.`}
                             </p>
                         </div>
                    </div>

                    <div className="bg-zinc-900 border border-white/5 rounded-3xl p-6 flex flex-col justify-center gap-6">
                        <div className="text-[10px] font-black uppercase text-zinc-500 tracking-widest border-b border-white/5 pb-2">Reality Check Simulator</div>
                        <div>
                            <div className="flex justify-between items-center mb-2">
                                <span className="text-xs font-bold text-zinc-300 flex items-center gap-2"><Umbrella size={14} className="text-blue-400"/> Vacations / Breaks</span>
                                <span className="text-xl font-black text-white">{blackoutWeeks} <span className="text-[10px] text-zinc-600">WKS</span></span>
                            </div>
                            <div className="flex gap-2">
                                <button onClick={() => setBlackoutWeeks(Math.max(0, blackoutWeeks - 0.5))} className="flex-1 bg-zinc-800 hover:bg-zinc-700 py-2 rounded text-zinc-400 hover:text-white"><Minus size={14}/></button>
                                <button onClick={() => setBlackoutWeeks(blackoutWeeks + 0.5)} className="flex-1 bg-zinc-800 hover:bg-zinc-700 py-2 rounded text-zinc-400 hover:text-white"><Plus size={14}/></button>
                            </div>
                        </div>
                        <div>
                            <div className="flex justify-between items-center mb-2">
                                <span className="text-xs font-bold text-zinc-300 flex items-center gap-2"><TrendingUp size={14} className="text-emerald-400"/> If we finish...</span>
                                <span className="text-xl font-black text-emerald-400">+{simulatedExtra} <span className="text-[10px] text-zinc-600">ITEMS</span></span>
                            </div>
                            <div className="flex gap-2">
                                <button onClick={() => setSimulatedExtra(Math.max(0, simulatedExtra - 1))} className="flex-1 bg-zinc-800 hover:bg-zinc-700 py-2 rounded text-zinc-400 hover:text-white"><Minus size={14}/></button>
                                <button onClick={() => setSimulatedExtra(simulatedExtra + 1)} className="flex-1 bg-emerald-900/30 border border-emerald-500/30 hover:bg-emerald-500 hover:text-white py-2 rounded text-emerald-400 transition-all font-bold">+1 More Today</button>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="bg-zinc-900 border border-white/5 rounded-3xl overflow-hidden shadow-xl">
                    <div className="p-6 border-b border-white/5 bg-zinc-900/80 backdrop-blur-xl flex justify-between items-center sticky top-0 z-20">
                        <h3 className="text-lg font-black uppercase italic text-white flex items-center gap-2"><LayoutGrid size={18} className="text-purple-500"/> Scene Breakdown</h3>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead className="bg-zinc-950 text-zinc-500 text-[10px] font-black uppercase tracking-widest border-b border-white/5">
                                <tr>
                                    <th className="px-6 py-4 w-16 text-center">#</th>
                                    <th className="px-6 py-4">Scene Name</th>
                                    <th className="px-6 py-4 w-32 text-center">Music</th>
                                    <th className="px-6 py-4 w-32 text-center">Dance</th>
                                    <th className="px-6 py-4 w-32 text-center">Blocking</th>
                                    <th className="px-6 py-4 w-24 text-center">Ready?</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-white/5 text-sm">
                                {sceneData.map((s: any, i: number) => {
                                    const type = (s.type || "").toLowerCase();
                                    const needsMusic = type.includes('song') || type.includes('mixed');
                                    const needsDance = type.includes('dance') || type.includes('mixed');
                                    const p = progress[s.id] || { music:0, dance:0, block:0 };
                                    const isReady = (!needsMusic || p.music===2) && (!needsDance || p.dance===2) && p.block===2;

                                    return (
                                        <tr key={s.id} className="hover:bg-white/5 transition-colors group">
                                            <td className="px-6 py-4 text-center font-mono text-zinc-600">{i+1}</td>
                                            <td className="px-6 py-4"><div className="font-bold text-zinc-300">{s.name}</div><div className="text-[10px] text-zinc-600 uppercase font-black tracking-wider">{s.type}</div></td>
                                            <td className="px-6 py-4">{needsMusic ? <button onClick={() => toggle(s.id, 'music')} className={`w-full py-1.5 rounded text-[10px] font-black uppercase border transition-all ${getStatusColor(p.music)}`}>{getStatusLabel(p.music)}</button> : <div className="text-center text-zinc-800">-</div>}</td>
                                            <td className="px-6 py-4">{needsDance ? <button onClick={() => toggle(s.id, 'dance')} className={`w-full py-1.5 rounded text-[10px] font-black uppercase border transition-all ${getStatusColor(p.dance)}`}>{getStatusLabel(p.dance)}</button> : <div className="text-center text-zinc-800">-</div>}</td>
                                            <td className="px-6 py-4"><button onClick={() => toggle(s.id, 'block')} className={`w-full py-1.5 rounded text-[10px] font-black uppercase border transition-all ${getStatusColor(p.block)}`}>{getStatusLabel(p.block)}</button></td>
                                            <td className="px-6 py-4 text-center">{isReady ? <CheckCircle2 size={20} className="mx-auto text-emerald-500 animate-in zoom-in"/> : <div className="w-1.5 h-1.5 rounded-full bg-zinc-800 mx-auto"/>}</td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
    );
}