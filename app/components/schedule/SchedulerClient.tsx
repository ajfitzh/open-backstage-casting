"use client";

import React, { useState, useMemo } from 'react';
import { 
  Users, ChevronRight, ChevronLeft, Search,
  CheckCircle2, Plus, Minus,
  TrendingUp, Calendar as CalendarIcon, 
  LayoutGrid, Coffee, Umbrella, Wand2,
  FileText, Mic2, Music, Theater,
  Target, AlertTriangle, Clock,
  Save, Loader2, Maximize2, X
} from 'lucide-react';

// --- IMPORTS ---
import AutoSchedulerModal from './AutoSchedulerModal'; 
import CallboardView from './CallboardView'; 
import { saveScheduleBatch } from '@/app/lib/actions'; // 🟢 The new Action

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
    productionTitle = "Untitled Production",
    productionId // 🟢 Needed for the Save Action
}: any) {
  
  // --- STATE ---
  const [activeTab, setActiveTab] = useState<'calendar' | 'progress' | 'callboard'>('calendar');
  const [isAutoSchedulerOpen, setIsAutoSchedulerOpen] = useState(false);
  const [schedule, setSchedule] = useState<ScheduledItem[]>([]); 
  const [isSaving, setIsSaving] = useState(false); // 🟢 Loading State
  
  // --- SHARED DATA PREP ---
  const sceneData = useMemo(() => {
    if (!scenes || !assignments) return [];

    // 1. Create a Map: SceneID -> Set of Actor Names
    const sceneCastMap = new Map<number, Set<string>>();
    const normalize = (s: string) => s?.toLowerCase().replace(/[^a-z0-9]/g, "") || "";

    assignments.forEach((a: any) => {
        const actorName = a.personName;
        if (!actorName) return;

        // STRATEGY A: Direct ID Match (Fastest)
        if (a.sceneIds && a.sceneIds.length > 0) {
            a.sceneIds.forEach((sid: number) => {
                if (!sceneCastMap.has(sid)) sceneCastMap.set(sid, new Set());
                sceneCastMap.get(sid)?.add(actorName);
            });
            return;
        }

        // STRATEGY B: Text Fuzzy Match (Backup)
        if (a.scenes && typeof a.scenes === 'string') {
            const sceneNames = a.scenes.split(',').map(normalize);
            scenes.forEach((s: any) => {
                const sName = normalize(s.name);
                if (sceneNames.some((n:string) => n.includes(sName) || sName.includes(n))) {
                    if (!sceneCastMap.has(s.id)) sceneCastMap.set(s.id, new Set());
                    sceneCastMap.get(s.id)?.add(actorName);
                }
            });
        }
    });

    // 2. Hydrate Scenes
    return scenes.map((s: any) => {
        const castSet = sceneCastMap.get(s.id) || new Set();
        const castNames = Array.from(castSet);

        return {
            id: s.id,
            name: s.name || "Untitled Scene",
            act: s.act || "1",
            type: s.type || "Scene",
            cast: castNames.map(name => ({ name })),
            castNames: castNames, 
            status: 'New'
        };
    }).sort((a: any, b: any) => a.id - b.id);
  }, [scenes, assignments]);

  // --- DERIVED DATA FOR CALLBOARD ---
  const callboardSchedule = useMemo(() => {
      return schedule.map(slot => {
          const scene = sceneData.find((s: { id: number; }) => s.id === slot.sceneId);
          return {
              ...slot,
              sceneName: scene?.name || "Unknown",
              castList: scene?.castNames || []
          };
      });
  }, [schedule, sceneData]);


  // 🟢 SAVE LOGIC 🟢
  const handleSaveChanges = async () => {
    setIsSaving(true);

    // 1. Identify Unsaved Items
    // Client-side items have long Date.now() IDs (string length > 10)
    // Database items usually have shorter numeric IDs (though in Baserow row IDs are numbers)
    // We assume anything with a string ID > 10 chars is a "Draft"
    const newItems = schedule.filter(item => item.id.length > 10);

    if (newItems.length === 0) {
        setIsSaving(false);
        return;
    }

    // 2. Calculate Real Dates based on Week Offset
    const getRealDate = (day: 'Fri' | 'Sat', weekOffset: number) => {
        const today = new Date();
        // Find "Next Friday" from today
        const nextFri = new Date(today);
        nextFri.setDate(today.getDate() + (5 + 7 - today.getDay()) % 7 + (weekOffset * 7));
        
        if (day === 'Fri') return nextFri.toISOString().split('T')[0];
        
        // If Saturday, add 1 day
        const nextSat = new Date(nextFri);
        nextSat.setDate(nextFri.getDate() + 1);
        return nextSat.toISOString().split('T')[0];
    };

    // 3. Prepare Batch
    const batch = newItems.map(item => ({
        ...item,
        date: getRealDate(item.day, item.weekOffset),
    }));

    // 4. Send to Server
    await saveScheduleBatch(productionId, batch);

    // 5. Reset / Reload
    setIsSaving(false);
    window.location.reload(); // Hard reload to fetch the persisted data
  };


  return (
    <div className="flex flex-col h-screen bg-zinc-950 text-white overflow-hidden font-sans">
        
        {/* HEADER */}
        <header className="h-16 border-b border-white/10 bg-zinc-900 flex items-center justify-between px-6 shrink-0 z-30">
            <div className="flex items-center gap-6">
                <div>
                    <div className="text-[10px] font-black uppercase text-zinc-500 tracking-widest">Production Schedule</div>
                    <h1 className="text-lg font-bold text-white">{productionTitle}</h1>
                </div>

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
                 
                 {/* 🟢 SAVE BUTTON (Appears when changes exist) */}
                 {schedule.some(i => i.id.length > 10) && (
                     <div className="animate-in fade-in slide-in-from-top-2">
                        <button 
                            onClick={handleSaveChanges}
                            disabled={isSaving}
                            className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-2 rounded-lg text-xs font-black uppercase tracking-wider shadow-[0_0_20px_rgba(16,185,129,0.3)] transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {isSaving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
                            {isSaving ? "Syncing..." : `Save ${schedule.filter(i => i.id.length > 10).length} Changes`}
                        </button>
                     </div>
                 )}

                 <div className="text-right hidden md:block border-l border-white/10 pl-4">
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

  // 🎨 THEMATIC COLOR ENGINE
  const getTrackStyles = (track: TrackType) => {
    switch (track) {
      case 'Music':
        return 'bg-pink-900/40 border-pink-500 text-pink-100 shadow-[0_0_15px_rgba(236,72,153,0.15)]';
      case 'Dance':
        return 'bg-emerald-900/40 border-emerald-500 text-emerald-100 shadow-[0_0_15px_rgba(16,185,129,0.15)]';
      case 'Acting':
        return 'bg-blue-900/40 border-blue-500 text-blue-100 shadow-[0_0_15px_rgba(59,130,246,0.15)]';
      default:
        return 'bg-zinc-800 border-zinc-500 text-zinc-100';
    }
  };

  // 🚀 GRID INTERACTION HELPERS
  const handleDrop = (e: React.DragEvent, day: 'Fri' | 'Sat', hour: number, min: number, track: TrackType) => {
      e.preventDefault();
      const sceneId = parseInt(e.dataTransfer.getData("sceneId"));
      if(!sceneId) return;
      const startTime = hour + (min / 60);
      const newBlock: any = {
          id: Date.now().toString(),
          sceneId, track, day, weekOffset: currentWeekOffset, startTime, duration: 30, status: 'New',
          span: 1 
      };
      setSchedule((prev: any) => [...prev, newBlock]);
      setDraggedSceneId(null);
  };

  const deleteItem = (itemId: string) => {
      setSchedule((prev: any) => prev.filter((item: any) => item.id !== itemId));
  };

  const updateDuration = (itemId: string, change: number) => {
      setSchedule((prev: any) => prev.map((item: any) => 
        item.id === itemId ? { ...item, duration: Math.max(15, item.duration + change) } : item
      ));
  };

  const switchTrack = (itemId: string, direction: 'left' | 'right') => {
      const tracks: TrackType[] = ['Acting', 'Music', 'Dance'];
      setSchedule((prev: any) => prev.map((item: any) => {
          if (item.id !== itemId) return item;
          const currentIndex = tracks.indexOf(item.track);
          const newIndex = direction === 'left' ? currentIndex - 1 : currentIndex + 1;
          if (newIndex < 0 || newIndex >= tracks.length) return item;
          return { ...item, track: tracks[newIndex] };
      }));
  };

  const updateSpan = (itemId: string, direction: 'more' | 'less') => {
      setSchedule((prev: any) => prev.map((item: any) => {
          if (item.id !== itemId) return item;
          const currentSpan = item.span || 1;
          const tracks: TrackType[] = ['Acting', 'Music', 'Dance'];
          const startIndex = tracks.indexOf(item.track);
          
          let newSpan = direction === 'more' ? currentSpan + 1 : currentSpan - 1;
          
          // Edge logic: Prevent spanning out of the grid bounds
          if (startIndex + newSpan > tracks.length) newSpan = currentSpan;
          if (newSpan < 1) newSpan = 1;

          return { ...item, span: newSpan };
      }));
  };

  // 📅 CALENDAR DATE LOGIC
  const weekLabel = useMemo(() => {
      const today = new Date();
      const nextFri = new Date(today);
      nextFri.setDate(today.getDate() + (5 + 7 - today.getDay()) % 7 + (currentWeekOffset * 7));
      return `Week of ${nextFri.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`;
  }, [currentWeekOffset]);

  const generateSlots = (start: number, end: number) => {
      const s: { h: number; m: number; val: number; }[] = [];
      for (let h = start; h < end; h++) { [0, 15, 30, 45].forEach(m => s.push({ h, m, val: h + m/60 })); }
      return s;
  };
  const friSlots = generateSlots(FRI_START, FRI_END);
  const satSlots = generateSlots(SAT_START, SAT_END);

  return (
    <div className="flex h-full">
         {/* SIDEBAR SCENE LIST */}
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
                 {sceneData.filter((s:any) => (s.name || "").toLowerCase().includes(searchQuery.toLowerCase())).map((scene: any) => (
                     <div key={scene.id} draggable onDragStart={(e) => { e.dataTransfer.setData("sceneId", scene.id.toString()); setDraggedSceneId(scene.id); }} onDragEnd={() => setDraggedSceneId(null)}
                         className="border border-white/5 bg-zinc-900 p-2 rounded cursor-grab active:cursor-grabbing hover:bg-white/5 transition-all group">
                         <div className="flex justify-between items-center mb-1">
                             <span className="font-bold text-xs text-zinc-200 truncate">{scene.name}</span>
                         </div>
                         <div className="flex items-center gap-2 text-[10px] text-zinc-500">
                              <span className="bg-black/30 px-1 rounded px-1.5 py-0.5">Act {scene.act}</span>
                              <span className={scene.cast.length === 0 ? "text-red-500 font-bold" : "font-medium"}>
                                  {scene.cast.length} Actors
                              </span>
                         </div>
                     </div>
                 ))}
             </div>
         </aside>

         {/* MAIN CALENDAR WORKSPACE */}
         <main className="flex-1 flex flex-col min-w-0 bg-zinc-950 relative">
             <div className="h-12 border-b border-white/10 bg-zinc-900/50 flex items-center justify-center gap-4 shrink-0">
                 <button onClick={() => setCurrentWeekOffset(c => c - 1)} className="p-1.5 hover:bg-white/10 rounded-full transition-colors text-zinc-400 hover:text-white"><ChevronLeft size={18}/></button>
                 <span className="text-xs font-black uppercase tracking-widest text-zinc-300 w-48 text-center">{weekLabel}</span>
                 <button onClick={() => setCurrentWeekOffset(c => c + 1)} className="p-1.5 hover:bg-white/10 rounded-full transition-colors text-zinc-400 hover:text-white"><ChevronRight size={18}/></button>
             </div>
             
             <div className="flex-1 overflow-y-auto custom-scrollbar bg-zinc-950 p-4">
                 <div className="flex gap-4 h-full min-h-[850px]">
                     {[
                         { day: 'Fri', slots: friSlots, start: FRI_START }, 
                         { day: 'Sat', slots: satSlots, start: SAT_START }
                     ].map((col: any) => (
                         <div key={col.day} className="flex-1 flex flex-col bg-zinc-900/30 border border-white/10 rounded-2xl overflow-hidden">
                             <div className="p-3 bg-zinc-800/80 border-b border-white/5 text-center font-black uppercase text-zinc-400 text-[10px] tracking-[0.2em]">{col.day === 'Fri' ? 'Friday Evening' : 'Saturday Full-Day'}</div>
                             <div className="flex-1 relative flex">
                                 {/* Time Labels */}
                                 <div className="w-14 bg-black/20 border-r border-white/5 text-[10px] text-zinc-600 font-mono text-right py-2 shrink-0">
                                     {col.slots.filter((s:any) => s.m === 0).map((s:any) => (
                                         <div key={s.val} style={{ height: '128px' }} className="pr-3 pt-1">{s.h > 12 ? s.h-12 : s.h} {s.h >= 12 ? 'PM' : 'AM'}</div>
                                     ))}
                                 </div>
                                 
                                 {/* Track Matrix */}
                                 <div className="flex-1 grid grid-cols-3 divide-x divide-white/5 relative">
                                     {['Acting', 'Music', 'Dance'].map((track) => (
                                         <div key={track} className="relative group/lane">
                                              <div className="absolute top-0 inset-x-0 p-1 text-[9px] font-black uppercase text-center text-zinc-700 bg-zinc-900/40 z-10">{track}</div>
                                              {col.slots.map((slot:any) => (
                                                  <div key={slot.val} className={`h-8 border-b border-white/[0.02] ${draggedSceneId ? 'hover:bg-blue-500/10' : ''}`}
                                                       onDragOver={(e) => e.preventDefault()} onDrop={(e) => handleDrop(e, col.day, slot.h, slot.m, track as TrackType)}/>
                                              ))}
                                              
                                              {/* RENDER BLOCKS */}
                                              {schedule.filter((i: any) => i.day === col.day && i.track === track && i.weekOffset === currentWeekOffset).map((item: any) => {
                                                  const top = (item.startTime - col.start) * 128;
                                                  const height = (item.duration / 60) * 128;
                                                  const scene = sceneData.find((s:any) => s.id === item.sceneId);
                                                  const span = item.span || 1;
                                                  
                                                  return (
                                                      <div 
                                                        key={item.id} 
                                                        className={`absolute rounded-xl border-l-[6px] p-3 shadow-2xl text-xs overflow-hidden transition-all group hover:brightness-110 active:scale-[0.98]
                                                          ${getTrackStyles(item.track)}
                                                          ${span > 1 ? 'z-40 ring-2 ring-white/10' : 'z-20 left-1.5 right-1.5'}`}
                                                        style={{ 
                                                            top: `${top}px`, 
                                                            height: `${height}px`,
                                                            width: span > 1 ? `calc(${span * 100}% + ${(span - 1) * 0.25}rem - 0.75rem)` : 'auto' 
                                                        }}
                                                      >
                                                           {/* Block Header */}
                                                           <div className="flex justify-between items-start mb-2">
                                                              <div className="font-black truncate pr-2 uppercase tracking-tighter leading-tight text-[11px]">
                                                                {span === 3 ? '🌎 FULL RUN: ' : span === 2 ? '🤝 JOINT: ' : ''}{scene?.name}
                                                              </div>
                                                              <button onClick={() => deleteItem(item.id)} className="opacity-0 group-hover:opacity-100 p-1 bg-red-500/80 hover:bg-red-500 text-white rounded-lg transition-all transform hover:scale-110">
                                                                  <X size={12} />
                                                              </button>
                                                           </div>

                                                           {/* Track Teleport & Expansion HUD */}
                                                           <div className="flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-all translate-y-1 group-hover:translate-y-0">
                                                                <button onClick={() => switchTrack(item.id, 'left')} disabled={item.track === 'Acting'} className="p-1.5 bg-black/40 hover:bg-black/60 rounded-md disabled:opacity-0 transition-colors"><ChevronLeft size={10}/></button>
                                                                
                                                                <div className="flex items-center bg-black/40 rounded-md overflow-hidden border border-white/5">
                                                                    <button onClick={() => updateSpan(item.id, 'less')} className="px-2 py-1 hover:bg-white/10 border-r border-white/5 transition-colors"><Minus size={10}/></button>
                                                                    <span className="px-2 py-1 text-[8px] font-black tracking-widest text-white/80">{span}x</span>
                                                                    <button onClick={() => updateSpan(item.id, 'more')} className="px-2 py-1 hover:bg-white/10 transition-colors"><Plus size={10}/></button>
                                                                </div>

                                                                <button onClick={() => switchTrack(item.id, 'right')} disabled={item.track === 'Dance' || (item.track === 'Music' && span === 2)} className="p-1.5 bg-black/40 hover:bg-black/60 rounded-md disabled:opacity-0 transition-colors"><ChevronRight size={10}/></button>
                                                           </div>

                                                           {/* Resize Handle / Time HUD */}
                                                           <div className="opacity-0 group-hover:opacity-100 absolute bottom-2 right-2 flex items-center gap-1.5 bg-black/60 backdrop-blur-md rounded-lg p-1 transition-all border border-white/10">
                                                               <button onClick={() => updateDuration(item.id, -15)} className="p-1 hover:bg-white/10 rounded transition-colors"><Minus size={10}/></button>
                                                               <span className="text-[9px] font-mono font-bold text-white px-1">{item.duration}m</span>
                                                               <button onClick={() => updateDuration(item.id, 15)} className="p-1 hover:bg-white/10 rounded transition-colors"><Plus size={10}/></button>
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
// ... (BurnUpView remains same as previous step, no changes needed there)
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