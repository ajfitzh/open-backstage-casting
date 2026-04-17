/* eslint-disable react-hooks/purity */
/* eslint-disable react-hooks/immutability */
"use client";

import Link from 'next/link'; 
import React, { useState, useMemo } from 'react';
import { 
  Users, ChevronRight, ChevronLeft, Search,
  CheckCircle2, Plus, Minus,
  TrendingUp, Calendar as CalendarIcon, 
  FileText, Wand2, AlertTriangle, 
  Target, X, Save, Loader2,
  ArrowRight, Settings
} from 'lucide-react';

import AutoSchedulerModal from './AutoSchedulerModal'; 
import CallboardView from './CallboardView'; 
import { saveScheduleBatch } from '@/app/lib/actions'; 

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
  span?: number;
}

const FRI_START = 18; 
const FRI_END = 21;   
const SAT_START = 10; 
const SAT_END = 17;   
const TOTAL_WEEKS = 10; 

export default function SchedulerClient({ 
    activeId,
    events = [], 
    slots = [], 
    conflicts = [], 
    scenes = [], 
    assignments = [], 
    roster = [], 
    productionTitle = "Active Production",
}: any) {
  
  const [activeTab, setActiveTab] = useState<'calendar' | 'progress' | 'callboard'>('calendar');
  const [isAutoSchedulerOpen, setIsAutoSchedulerOpen] = useState(false);
  const [schedule, setSchedule] = useState<ScheduledItem[]>([]); 
  const [isSaving, setIsSaving] = useState(false); 
  const [currentWeekOffset, setCurrentWeekOffset] = useState(0);

  const weekStats = useMemo(() => {
    if (!events || events.length === 0) {
        return { current: 1, total: 10, label: "Week 1 of 10", viewedDate: new Date() };
    }
    
    const dates = events.map((e: any) => new Date(e.date).getTime()).filter((d: number) => !isNaN(d));
    if (dates.length === 0) return { current: 1, total: 10, label: "Week 1 of 10", viewedDate: new Date() };
    
    const minDate = new Date(Math.min(...dates));
    const maxDate = new Date(Math.max(...dates));
    
    const msPerWeek = 1000 * 60 * 60 * 24 * 7;
    const totalWeeks = Math.ceil((maxDate.getTime() - minDate.getTime()) / msPerWeek) || 1;
    
    const today = new Date();
    const nextFri = new Date(today);
    nextFri.setDate(today.getDate() + (5 + 7 - today.getDay()) % 7 + (currentWeekOffset * 7));
    
    const diffTime = nextFri.getTime() - minDate.getTime();
    const currentWeekNum = Math.floor(diffTime / msPerWeek) + 1;
    
    const weekStart = new Date(minDate.getTime() + (currentWeekNum - 1) * msPerWeek);
    const weekEnd = new Date(weekStart.getTime() + msPerWeek);
    
    const currentEvents = events.filter((e: any) => {
        const d = new Date(e.date).getTime();
        return d >= weekStart.getTime() && d < weekEnd.getTime();
    });
    
    const isPerformance = currentEvents.some((e: any) => e.type === "Performance");
    const isTech = currentEvents.some((e: any) => e.type === "Tech");
    
    let label = `Week ${currentWeekNum} of ${totalWeeks}`;
    if (isPerformance) label = `🎭 SHOW WEEK (${currentWeekNum}/${totalWeeks})`;
    else if (isTech) label = `🔦 TECH WEEK (${currentWeekNum}/${totalWeeks})`;
    else if (currentWeekNum < 1) label = `Pre-Production (${Math.abs(currentWeekNum)} wks out)`;
    else if (currentWeekNum > totalWeeks) label = `Post-Production (+${currentWeekNum - totalWeeks})`;

    return { 
        current: currentWeekNum, 
        total: totalWeeks, 
        label: label,
        viewedDate: nextFri,
        isSpecial: isPerformance || isTech 
    };
  }, [events, currentWeekOffset]);

  const sceneData = useMemo(() => {
    if (!scenes || scenes.length === 0) return [];
    
    const sceneCastMap = new Map<number, Set<string>>();
    
    assignments.forEach((a: any) => {
        const actorNames = a.person?.map((p: any) => p.value) || [];
        const sceneIds = a.savedScenes?.map((s: any) => s.id) || [];
        
        sceneIds.forEach((sid: number) => {
            if (!sceneCastMap.has(sid)) sceneCastMap.set(sid, new Set());
            actorNames.forEach((name: string) => sceneCastMap.get(sid)?.add(name));
        });
    });

    return scenes.map((s: any) => {
        const castSet = sceneCastMap.get(s.id) || new Set();
        const castNames = Array.from(castSet);
        
        return {
            id: s.id, 
            name: s.name, 
            act: s.act,   
            type: "Scene", 
            cast: castNames.map(name => ({ name })), 
            castNames: castNames, 
            status: 'New',
            mLoad: 1, dLoad: 1, bLoad: 1
        };
    }).sort((a: any, b: any) => a.id - b.id);
  }, [scenes, assignments]);

  const callboardSchedule = useMemo(() => {
      return schedule.map(slot => {
          const scene = sceneData.find((s: { id: number; }) => s.id === slot.sceneId);
          return { ...slot, sceneName: scene?.name || "Unknown", castList: scene?.castNames || [] };
      });
  }, [schedule, sceneData]);

  const handleSaveChanges = async () => {
    setIsSaving(true);
    const newItems = schedule.filter(item => item.id.length > 10);
    if (newItems.length === 0) { setIsSaving(false); return; }

    const getRealDate = (day: 'Fri' | 'Sat', weekOffset: number) => {
        const today = new Date();
        const nextFri = new Date(today);
        nextFri.setDate(today.getDate() + (5 + 7 - today.getDay()) % 7 + (weekOffset * 7));
        if (day === 'Fri') return nextFri.toISOString().split('T')[0];
        const nextSat = new Date(nextFri);
        nextSat.setDate(nextFri.getDate() + 1);
        return nextSat.toISOString().split('T')[0];
    };

    const batch = newItems.map(item => ({ ...item, date: getRealDate(item.day, item.weekOffset) }));
    await saveScheduleBatch(activeId, batch);
    setIsSaving(false);
    window.location.reload(); 
  };

  return (
    <div className="flex flex-col h-screen bg-zinc-950 text-white overflow-hidden font-sans">
        <header className="h-16 border-b border-white/10 bg-zinc-900 flex items-center justify-between px-6 shrink-0 z-30">
            <div className="flex items-center gap-6">
                <div>
                    <div className="text-[10px] font-black uppercase text-zinc-500 tracking-widest">Production Schedule</div>
                    <h1 className="text-lg font-bold text-white">{productionTitle}</h1>
                </div>
                <div className="flex bg-black/40 p-1 rounded-lg border border-white/5">
                    <button onClick={() => setActiveTab('calendar')} className={`px-4 py-1.5 rounded-md text-xs font-bold uppercase transition-all flex items-center gap-2 ${activeTab === 'calendar' ? 'bg-zinc-700 text-white shadow' : 'text-zinc-500 hover:text-white'}`}>
                        <CalendarIcon size={14}/> Calendar
                    </button>
                    <button onClick={() => setActiveTab('progress')} className={`px-4 py-1.5 rounded-md text-xs font-bold uppercase transition-all flex items-center gap-2 ${activeTab === 'progress' ? 'bg-blue-600 text-white shadow' : 'text-zinc-500 hover:text-white'}`}>
                        <TrendingUp size={14}/> Burn-Up
                    </button>
                     <button onClick={() => setActiveTab('callboard')} className={`px-4 py-1.5 rounded-md text-xs font-bold uppercase transition-all flex items-center gap-2 ${activeTab === 'callboard' ? 'bg-emerald-600 text-white shadow' : 'text-zinc-500 hover:text-white'}`}>
                        <FileText size={14}/> Callboard
                    </button>
                </div>
            </div>
            
            <div className="flex items-center gap-4">
                 {schedule.some(i => i.id.length > 10) && (
                     <div className="animate-in fade-in slide-in-from-top-2">
                        <button onClick={handleSaveChanges} disabled={isSaving} className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-2 rounded-lg text-xs font-black uppercase tracking-wider shadow-[0_0_20px_rgba(16,185,129,0.3)] transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed">
                            {isSaving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
                            {isSaving ? "Syncing..." : `Save ${schedule.filter(i => i.id.length > 10).length} Changes`}
                        </button>
                     </div>
                 )}
                 <div className="text-right hidden md:block border-l border-white/10 pl-4">
                    <div className="text-[10px] text-zinc-500 font-mono">Current View</div>
                    <div className={`text-sm font-black ${weekStats.isSpecial ? 'text-amber-400 animate-pulse' : 'text-emerald-400'}`}>
                        {weekStats.label}
                    </div>
                </div>
                 <button onClick={() => setIsAutoSchedulerOpen(true)} className="flex items-center gap-2 bg-purple-600/20 hover:bg-purple-600/40 text-purple-300 border border-purple-500/50 px-3 py-2 rounded-lg text-xs font-black uppercase tracking-wider transition-all">
                    <Wand2 size={14} /> Auto
                 </button>
            </div>
        </header>

        <div className="flex-1 overflow-hidden relative">
            {activeTab === 'calendar' && (
                <CalendarView 
                    sceneData={sceneData} 
                    schedule={schedule} 
                    setSchedule={setSchedule}
                    currentWeekOffset={currentWeekOffset}
                    setCurrentWeekOffset={setCurrentWeekOffset}
                    weekLabel={`Week of ${weekStats.viewedDate?.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`}
                />
            )}
            {activeTab === 'progress' && <BurnUpView 
                sceneData={sceneData} 
                currentWeek={weekStats.current} 
                totalWeeks={weekStats.total}   
            />}
            {activeTab === 'callboard' && <CallboardView schedule={callboardSchedule} productionTitle={productionTitle} />}
        </div>
        <AutoSchedulerModal isOpen={isAutoSchedulerOpen} onClose={() => setIsAutoSchedulerOpen(false)} scenes={sceneData} people={roster} onCommit={(newItems: any[]) => { setSchedule(prev => [...prev, ...newItems]); }} />
    </div>
  );
}

function CalendarView({ sceneData, schedule, setSchedule, currentWeekOffset, setCurrentWeekOffset, weekLabel }: any) {
  const [draggedSceneId, setDraggedSceneId] = useState<number | null>(null);
  const [draggedItemId, setDraggedItemId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  const getTrackStyles = (track: TrackType) => {
    switch (track) {
      case 'Music': return 'bg-pink-900/40 border-pink-500 text-pink-100 shadow-[0_0_15px_rgba(236,72,153,0.15)]';
      case 'Dance': return 'bg-emerald-900/40 border-emerald-500 text-emerald-100 shadow-[0_0_15px_rgba(16,185,129,0.15)]';
      case 'Acting': return 'bg-blue-900/40 border-blue-500 text-blue-100 shadow-[0_0_15px_rgba(59,130,246,0.15)]';
      default: return 'bg-zinc-800 border-zinc-500 text-zinc-100';
    }
  };

  const handleDrop = (e: React.DragEvent, day: 'Fri' | 'Sat', hour: number, min: number, track: TrackType) => {
      e.preventDefault();
      const dropTime = hour + (min / 60);
      const movedItemId = e.dataTransfer.getData("itemId");
      
      if (movedItemId) {
          setSchedule((prev: any) => prev.map((item: any) => {
              if (item.id === movedItemId) return { ...item, day, track, startTime: dropTime, weekOffset: currentWeekOffset };
              return item;
          }));
          setDraggedItemId(null);
          return;
      }
      
      const sceneId = parseInt(e.dataTransfer.getData("sceneId"));
      if (sceneId) {
          const newBlock: any = { id: Date.now().toString(), sceneId, track, day, weekOffset: currentWeekOffset, startTime: dropTime, duration: 30, status: 'New', span: 1 };
          setSchedule((prev: any) => [...prev, newBlock]);
          setDraggedSceneId(null);
      }
  };

  const deleteItem = (itemId: string) => setSchedule((prev: any) => prev.filter((item: any) => item.id !== itemId));
  const updateDuration = (itemId: string, change: number) => setSchedule((prev: any) => prev.map((item: any) => item.id === itemId ? { ...item, duration: Math.max(15, item.duration + change) } : item));
  
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
          if (startIndex + newSpan > tracks.length) newSpan = currentSpan;
          if (newSpan < 1) newSpan = 1;
          return { ...item, span: newSpan };
      }));
  };

  const generateSlots = (start: number, end: number) => {
      const s: { h: number; m: number; val: number; }[] = [];
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
                    <input value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="Filter scenes..." className="w-full bg-black/20 border border-white/10 rounded-lg pl-8 pr-3 py-1.5 text-xs focus:border-blue-500 outline-none text-white"/>
                </div>
             </div>
             <div className="flex-1 overflow-y-auto px-2 space-y-1 custom-scrollbar pt-2">
                 {sceneData.filter((s:any) => (s.name || "").toLowerCase().includes(searchQuery.toLowerCase())).map((scene: any) => (
                     <div key={scene.id} draggable onDragStart={(e) => { e.dataTransfer.setData("sceneId", scene.id.toString()); setDraggedSceneId(scene.id); }} onDragEnd={() => setDraggedSceneId(null)} className="border border-white/5 bg-zinc-900 p-2 rounded cursor-grab active:cursor-grabbing hover:bg-white/5 transition-all group">
                         <div className="flex justify-between items-center mb-1"><span className="font-bold text-xs text-zinc-200 truncate">{scene.name}</span></div>
                         <div className="flex items-center gap-2 text-[10px] text-zinc-500">
                             <span className="bg-black/30 px-1 rounded px-1.5 py-0.5">Act {scene.act}</span>
                             <span className={scene.cast.length === 0 ? "text-red-500 font-bold" : "font-medium"}>{scene.cast.length} Actors</span>
                         </div>
                     </div>
                 ))}
             </div>
         </aside>
         <main className="flex-1 flex flex-col min-w-0 bg-zinc-950 relative">
             <div className="h-12 border-b border-white/10 bg-zinc-900/50 flex items-center justify-center gap-4 shrink-0">
                 <button onClick={() => setCurrentWeekOffset((c: number) => c - 1)} className="p-1.5 hover:bg-white/10 rounded-full transition-colors text-zinc-400 hover:text-white"><ChevronLeft size={18}/></button>
                 <span className="text-xs font-black uppercase tracking-widest text-zinc-300 w-48 text-center">{weekLabel}</span>
                 <button onClick={() => setCurrentWeekOffset((c: number) => c + 1)} className="p-1.5 hover:bg-white/10 rounded-full transition-colors text-zinc-400 hover:text-white"><ChevronRight size={18}/></button>
             </div>
             <div className="flex-1 overflow-y-auto custom-scrollbar bg-zinc-950 p-4">
                 <div className="flex gap-4 h-full min-h-[850px]">
                     {[{ day: 'Fri', slots: friSlots, start: FRI_START }, { day: 'Sat', slots: satSlots, start: SAT_START }].map((col: any) => (
                         <div key={col.day} className="flex-1 flex flex-col bg-zinc-900/30 border border-white/10 rounded-2xl overflow-hidden">
                             <div className="p-3 bg-zinc-800/80 border-b border-white/5 text-center font-black uppercase text-zinc-400 text-[10px] tracking-[0.2em]">{col.day === 'Fri' ? 'Friday Evening' : 'Saturday Full-Day'}</div>
                             <div className="flex-1 relative flex">
                                 <div className="w-14 bg-black/20 border-r border-white/5 text-[10px] text-zinc-600 font-mono text-right py-2 shrink-0">
                                     {col.slots.filter((s:any) => s.m === 0).map((s:any) => (<div key={s.val} style={{ height: '128px' }} className="pr-3 pt-1">{s.h > 12 ? s.h-12 : s.h} {s.h >= 12 ? 'PM' : 'AM'}</div>))}
                                 </div>
                                 <div className="flex-1 grid grid-cols-3 divide-x divide-white/5 relative">
                                     {['Acting', 'Music', 'Dance'].map((track) => (
                                         <div key={track} className="relative group/lane">
                                              <div className="absolute top-0 inset-x-0 p-1 text-[9px] font-black uppercase text-center text-zinc-700 bg-zinc-900/40 z-10 pointer-events-none">{track}</div>
                                              {col.slots.map((slot:any) => (
                                                  <div key={slot.val} className={`h-8 border-b border-white/[0.02] transition-colors ${draggedSceneId || draggedItemId ? 'hover:bg-blue-500/10' : ''}`} onDragOver={(e) => e.preventDefault()} onDrop={(e) => handleDrop(e, col.day, slot.h, slot.m, track as TrackType)}/>
                                              ))}
                                              {schedule.filter((i: any) => i.day === col.day && i.track === track && i.weekOffset === currentWeekOffset).map((item: any) => {
                                                  const top = (item.startTime - col.start) * 128;
                                                  const height = (item.duration / 60) * 128;
                                                  const scene = sceneData.find((s:any) => s.id === item.sceneId);
                                                  const span = item.span || 1;
                                                  const isDraggingThis = draggedItemId === item.id;
                                                  
                                                  return (
                                                      <div key={item.id} draggable onDragStart={(e) => { e.dataTransfer.setData("itemId", item.id.toString()); setDraggedItemId(item.id.toString()); }} onDragEnd={() => setDraggedItemId(null)}
                                                        className={`absolute rounded-xl border-l-[6px] shadow-2xl text-xs transition-all group hover:brightness-110 active:scale-[0.98] cursor-grab active:cursor-grabbing
                                                          ${getTrackStyles(item.track)}
                                                          ${span > 1 ? 'z-40 ring-2 ring-white/10' : 'z-20 left-1.5 right-1.5'}
                                                          ${isDraggingThis ? 'opacity-50 pointer-events-none' : ''} 
                                                        `}
                                                        style={{ top: `${top}px`, height: `${height}px`, width: span > 1 ? `calc(${span * 100}% + ${(span - 1) * 0.25}rem - 0.75rem)` : 'auto' }}>
                                                           
                                                           <div className="w-full h-full p-3 overflow-hidden">
                                                               <div className="font-black truncate uppercase tracking-tighter leading-tight text-[11px] pr-4">
                                                                  {span === 3 ? '🌎 FULL RUN: ' : span === 2 ? '🤝 JOINT: ' : ''}{scene?.name}
                                                               </div>
                                                           </div>
                                                           
                                                           <button onClick={(e) => { e.stopPropagation(); deleteItem(item.id); }} className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 p-1 bg-red-500/80 hover:bg-red-500 text-white rounded-lg transition-all z-50 transform hover:scale-110"><X size={10} /></button>
                                                           
                                                           <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-all z-50">
                                                                <button onClick={(e) => { e.stopPropagation(); switchTrack(item.id, 'left'); }} disabled={item.track === 'Acting'} className="p-1 bg-black/60 hover:bg-black/90 rounded backdrop-blur-sm disabled:opacity-0 transition-colors border border-white/10"><ChevronLeft size={10}/></button>
                                                                <div className="flex items-center bg-black/60 backdrop-blur-sm rounded overflow-hidden border border-white/10 shadow-lg"><button onClick={(e) => { e.stopPropagation(); updateSpan(item.id, 'less'); }} className="px-1.5 py-0.5 hover:bg-white/10 border-r border-white/10 transition-colors"><Minus size={10}/></button><span className="px-1.5 py-0.5 text-[8px] font-black tracking-widest text-white/90">{span}x</span><button onClick={(e) => { e.stopPropagation(); updateSpan(item.id, 'more'); }} className="px-1.5 py-0.5 hover:bg-white/10 transition-colors"><Plus size={10}/></button></div>
                                                                <button onClick={(e) => { e.stopPropagation(); switchTrack(item.id, 'right'); }} disabled={item.track === 'Dance' || (item.track === 'Music' && span === 2)} className="p-1 bg-black/60 hover:bg-black/90 rounded backdrop-blur-sm disabled:opacity-0 transition-colors border border-white/10"><ChevronRight size={10}/></button>
                                                           </div>
                                                           
                                                           <div className="absolute bottom-1 right-1 opacity-0 group-hover:opacity-100 flex items-center gap-1 bg-black/60 backdrop-blur-md rounded p-0.5 transition-all border border-white/10 z-50">
                                                               <button onClick={(e) => { e.stopPropagation(); updateDuration(item.id, -15); }} className="p-0.5 hover:bg-white/10 rounded transition-colors"><Minus size={10}/></button><span className="text-[8px] font-mono font-bold text-white px-1">{item.duration}m</span><button onClick={(e) => { e.stopPropagation(); updateDuration(item.id, 15); }} className="p-0.5 hover:bg-white/10 rounded transition-colors"><Plus size={10}/></button>
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

function BurnUpView({ sceneData, currentWeek, totalWeeks }: any) {
  const [progress, setProgress] = useState<Record<string, { music: number, dance: number, block: number }>>(() => {
    const initial: any = {};
    sceneData.forEach((s: any) => { initial[s.id.toString()] = { music: 0, dance: 0, block: 0 }; });
    return initial;
  });
  
  const [simVelocityMod, setSimVelocityMod] = useState(1.0); 
  const [simWeeksLost, setSimWeeksLost] = useState(0);       
  const [editingScene, setEditingScene] = useState<any>(null);
  const [loadOverrides, setLoadOverrides] = useState<Record<number, { music: number, dance: number, block: number }>>({});

  const handleQuickSave = (sceneId: number, newLoads: any) => {
    setLoadOverrides(prev => ({ ...prev, [sceneId]: newLoads }));
    setEditingScene(null);
  };

  const toggleStatus = (id: string, track: 'music' | 'dance' | 'block') => {
    setProgress(prev => ({ ...prev, [id]: { ...prev[id], [track]: (prev[id][track] + 1) % 3 } }));
  };

  const getStatusColor = (val: number) => {
    if (val === 2) return 'bg-emerald-500 text-white shadow-[0_0_10px_rgba(16,185,129,0.4)] border-emerald-400';
    if (val === 1) return 'bg-amber-500 text-black border-amber-400';
    return 'bg-zinc-800 text-zinc-600 border-zinc-700 hover:border-zinc-500';
  };

  const stats = useMemo(() => {
    let totalPointsScope = 0;
    let earnedPoints = 0;
    
    const weightedScenes = sceneData.map((s: any) => {
      const override = loadOverrides[s.id];
      const mLoad = Number(override?.music ?? s.mLoad ?? 1); 
      const dLoad = Number(override?.dance ?? s.dLoad ?? 1);
      const bLoad = Number(override?.block ?? s.bLoad ?? 1);
      const type = (s.type || "").toLowerCase();
      
      const hasMusic = (type.includes('song') || type.includes('mixed')) && mLoad > 0;
      const hasDance = (type.includes('dance') || type.includes('mixed')) && dLoad > 0;
      const hasBlock = true; 
      
      let sceneMaxPoints = 0;
      if (hasMusic) sceneMaxPoints += (mLoad * 2);
      if (hasDance) sceneMaxPoints += (dLoad * 2);
      if (hasBlock) sceneMaxPoints += (bLoad * 2);
      
      const p = progress[s.id.toString()] || { music: 0, dance: 0, block: 0 };
      let sceneEarned = 0;
      if (hasMusic) sceneEarned += (p.music * mLoad); 
      if (hasDance) sceneEarned += (p.dance * dLoad);
      if (hasBlock) sceneEarned += (p.block * bLoad);
      
      totalPointsScope += sceneMaxPoints;
      earnedPoints += sceneEarned;
      return { ...s, sceneMaxPoints, sceneEarned, hasMusic, hasDance, hasBlock, mLoad, dLoad, bLoad };
    });

    const effectiveCurrentWeek = Math.max(1, currentWeek);
    const actualVelocity = earnedPoints / effectiveCurrentWeek; 
    const simulatedVelocity = actualVelocity * simVelocityMod;
    const remainingPoints = totalPointsScope - earnedPoints;
    const weeksNeeded = simulatedVelocity > 0 ? remainingPoints / simulatedVelocity : 0;
    const safeWeeksNeeded = weeksNeeded === Infinity ? 99 : weeksNeeded;
    const projectedEndWeek = currentWeek + safeWeeksNeeded + simWeeksLost;
    const isOverSchedule = projectedEndWeek > totalWeeks;
    
    return { totalPointsScope, earnedPoints, actualVelocity, simulatedVelocity, projectedEndWeek, isOverSchedule, weightedScenes };
  }, [sceneData, progress, currentWeek, totalWeeks, simVelocityMod, simWeeksLost, loadOverrides]); 

  return (
    <div className="h-full overflow-y-auto custom-scrollbar bg-zinc-950 p-6 pb-32">
      <div className="max-w-7xl mx-auto space-y-6">
        
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-zinc-900 border border-white/5 p-5 rounded-2xl relative overflow-hidden group hover:border-white/10 transition-colors">
                <div className="flex justify-between items-start mb-2">
                    <div className="text-[10px] uppercase font-black tracking-widest text-zinc-500">Total Scope</div>
                    <Link href="/analysis" className="text-[10px] bg-white/5 hover:bg-white/10 px-2 py-1 rounded border border-white/5 transition-colors text-zinc-400 hover:text-white flex items-center gap-1">Analysis <ArrowRight size={10} /></Link>
                </div>
                <div className="text-3xl font-black text-white">{stats.totalPointsScope} <span className="text-sm font-medium text-zinc-600">Pts</span></div>
                <div className="text-xs text-zinc-500 mt-2 flex items-center gap-2"><Target size={14} className="text-zinc-600"/> Weighted Complexity</div>
            </div>
            
            <div className="bg-zinc-900 border border-white/5 p-5 rounded-2xl relative overflow-hidden">
                <div className="text-[10px] uppercase font-black tracking-widest text-zinc-500 mb-2">Current Velocity</div>
                <div className="text-3xl font-black text-blue-400">{stats.actualVelocity.toFixed(1)} <span className="text-sm font-medium text-zinc-600">pts/wk</span></div>
                <div className="text-xs text-zinc-500 mt-2 flex items-center gap-2"><TrendingUp size={14} className="text-zinc-600"/> Avg Performance</div>
            </div>
            
            <div className={`border p-5 rounded-2xl relative overflow-hidden transition-colors ${stats.isOverSchedule ? 'bg-red-950/10 border-red-500/20' : 'bg-emerald-950/10 border-emerald-500/20'}`}>
                <div className="text-[10px] uppercase font-black tracking-widest text-zinc-500 mb-2">Projected Finish</div>
                <div className={`text-3xl font-black ${stats.isOverSchedule ? 'text-red-400' : 'text-emerald-400'}`}>Wk {stats.projectedEndWeek.toFixed(1)}</div>
                <div className="text-xs text-zinc-500 mt-2 flex items-center gap-2">
                    {stats.isOverSchedule ? <AlertTriangle size={14} className="text-red-500"/> : <Target size={14} className="text-emerald-500"/>} Target: Week {totalWeeks}
                </div>
            </div>
            
            <div className="bg-zinc-900 border border-white/5 p-4 rounded-2xl flex flex-col justify-center gap-3">
                <div className="space-y-1">
                    <div className="flex justify-between items-center text-[10px] uppercase font-bold text-zinc-500"><span>Pace Modifier</span><span className="text-blue-400">{Math.round(simVelocityMod * 100)}%</span></div>
                    <input type="range" min="0.5" max="2.0" step="0.1" value={simVelocityMod} onChange={(e) => setSimVelocityMod(parseFloat(e.target.value))} className="w-full h-1.5 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-blue-500"/>
                </div>
                <div className="space-y-1">
                    <div className="flex justify-between items-center text-[10px] uppercase font-bold text-zinc-500"><span>Blackout Weeks</span><span className="text-red-400">{simWeeksLost} wks</span></div>
                     <input type="range" min="0" max="5" step="0.5" value={simWeeksLost} onChange={(e) => setSimWeeksLost(parseFloat(e.target.value))} className="w-full h-1.5 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-red-500"/>
                </div>
            </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 min-h-[600px]">
            <div className="col-span-2 bg-zinc-900 border border-white/5 rounded-3xl p-6 flex flex-col shadow-xl">
                <div className="flex justify-between items-end mb-6">
                    <div>
                        <h3 className="text-lg font-bold text-white">Burn-Up Chart</h3>
                        <p className="text-xs text-zinc-500">Ideal Pace vs. Actual Points Earned</p>
                    </div>
                    <div className="flex gap-4 text-[10px] font-black uppercase tracking-wider text-zinc-400">
                         <div className="flex items-center gap-2"><div className="w-2 h-2 bg-zinc-600 rounded-full"></div> Scope</div>
                         <div className="flex items-center gap-2"><div className="w-2 h-2 bg-emerald-500 rounded-full"></div> Actual</div>
                         <div className="flex items-center gap-2"><div className="w-2 h-2 border border-dashed border-emerald-500 rounded-full"></div> Projected</div>
                    </div>
                </div>
                <div className="flex-1 w-full relative border-l border-b border-white/10">
                   <BurnUpGraph totalWeeks={Math.max(totalWeeks, stats.projectedEndWeek)} targetWeeks={totalWeeks} currentWeek={currentWeek} totalPoints={stats.totalPointsScope} earnedPoints={stats.earnedPoints} projectedEndWeek={stats.projectedEndWeek} />
                </div>
            </div>

            <div className="bg-zinc-900 border border-white/5 rounded-3xl flex flex-col overflow-hidden shadow-xl">
                <div className="p-4 border-b border-white/5 bg-black/20 flex justify-between items-center">
                    <div className="text-xs font-black uppercase tracking-widest text-zinc-400">Scene Points</div>
                    <div className="text-[10px] font-mono text-zinc-500">{stats.earnedPoints} / {stats.totalPointsScope}</div>
                </div>
                <div className="flex-1 overflow-y-auto custom-scrollbar p-2 space-y-1">
                    {stats.weightedScenes.sort((a: any, b: any) => b.sceneMaxPoints - a.sceneMaxPoints).map((s: any) => (
                        <div key={s.id} className="p-3 rounded-xl bg-black/20 border border-white/5 hover:bg-white/5 transition-colors group relative">
                            <div className="flex justify-between items-start mb-3 pr-6">
                                <div className="overflow-hidden">
                                    <div className="font-bold text-sm text-zinc-200 truncate">{s.name}</div>
                                    <div className="text-[10px] text-zinc-500 font-mono flex gap-2"><span className="bg-white/5 px-1 rounded">Diff: {s.sceneMaxPoints/2}</span><span className="text-emerald-600">Max: {s.sceneMaxPoints}</span></div>
                                </div>
                                <div className="text-right shrink-0">
                                    <div className={`text-xs font-black ${s.sceneEarned === s.sceneMaxPoints ? 'text-emerald-400' : 'text-zinc-600'}`}>
                                        {s.sceneMaxPoints > 0 ? Math.round((s.sceneEarned / s.sceneMaxPoints) * 100) : 0}%
                                    </div>
                                </div>
                            </div>
                            
                            <button onClick={() => setEditingScene(s)} className="absolute top-2 right-2 p-1.5 rounded-lg bg-black/40 text-zinc-500 hover:text-white hover:bg-black/80 opacity-0 group-hover:opacity-100 transition-all border border-white/5" title="Adjust Complexity"><Settings size={12} /></button>
                            
                            <div className="flex gap-1.5 items-center">
                                <div className="flex-1 flex flex-col gap-1">
                                    {s.hasMusic ? <button onClick={() => toggleStatus(s.id.toString(), 'music')} className={`h-2 w-full rounded-sm transition-all ${getStatusColor(progress[s.id.toString()]?.music || 0)}`}/> : <div className="h-2 w-full bg-zinc-800/20 rounded-sm"/>}
                                    {s.hasMusic && <span className="text-[7px] font-black uppercase text-center text-zinc-600">Music ({s.mLoad})</span>}
                                </div>
                                <div className="flex-1 flex flex-col gap-1">
                                    {s.hasDance ? <button onClick={() => toggleStatus(s.id.toString(), 'dance')} className={`h-2 w-full rounded-sm transition-all ${getStatusColor(progress[s.id.toString()]?.dance || 0)}`}/> : <div className="h-2 w-full bg-zinc-800/20 rounded-sm"/>}
                                    {s.hasDance && <span className="text-[7px] font-black uppercase text-center text-zinc-600">Dance ({s.dLoad})</span>}
                                </div>
                                <div className="flex-1 flex flex-col gap-1">
                                    {s.hasBlock ? <button onClick={() => toggleStatus(s.id.toString(), 'block')} className={`h-2 w-full rounded-sm transition-all ${getStatusColor(progress[s.id.toString()]?.block || 0)}`}/> : <div className="h-2 w-full bg-zinc-800/20 rounded-sm"/>}
                                    {s.hasBlock && <span className="text-[7px] font-black uppercase text-center text-zinc-600">Block ({s.bLoad})</span>}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>

        {editingScene && (
           <QuickEditModal scene={editingScene} onClose={() => setEditingScene(null)} onSave={handleQuickSave} />
        )}
      </div>
    </div>
  );
}

const BurnUpGraph = ({ totalWeeks, targetWeeks, currentWeek, totalPoints, earnedPoints, projectedEndWeek }: any) => {
    const safeTotalPoints = totalPoints || 100;
    const safeTotalWeeks = totalWeeks || 10;
    const getX = (week: number) => (week / safeTotalWeeks) * 100;
    const getY = (points: number) => 100 - ((points / safeTotalPoints) * 100);
    const curX = getX(currentWeek);
    const curY = getY(earnedPoints);
    const projX = getX(projectedEndWeek);
    const projY = getY(safeTotalPoints); 
    const idealX = getX(targetWeeks);

    return (
        <svg className="w-full h-full overflow-visible" viewBox="0 0 100 100" preserveAspectRatio="none">
            {Array.from({ length: Math.ceil(safeTotalWeeks) + 1 }).map((_, i) => (
                <line key={i} x1={getX(i)} y1="0" x2={getX(i)} y2="100" stroke="#333" strokeWidth="0.2" />
            ))}
            <line x1="0" y1="0" x2="100" y2="0" stroke="#555" strokeWidth="0.5" strokeDasharray="2" />
            <text x="1" y="5" fontSize="3" fill="#555" fontWeight="bold">TOTAL SCOPE ({safeTotalPoints} pts)</text>
            <line x1="0" y1="100" x2={idealX} y2="0" stroke="#333" strokeWidth="0.5" strokeDasharray="1" />
            {earnedPoints > 0 && (
                <line x1={curX} y1={curY} x2={projX} y2={projY} stroke={projectedEndWeek > targetWeeks ? "#ef4444" : "#10b981"} strokeWidth="0.5" strokeDasharray="2" />
            )}
            <polyline points={`0,100 ${curX},${curY}`} fill="none" stroke="#10b981" strokeWidth="1" />
            <circle cx={curX} cy={curY} r="1.5" fill="#10b981" stroke="white" strokeWidth="0.5" />
            <line x1={idealX} y1="0" x2={idealX} y2="100" stroke="#fbbf24" strokeWidth="0.5" />
            <text x={idealX} y="98" fontSize="3" fill="#fbbf24" textAnchor="middle" fontWeight="bold">OPENING NIGHT</text>
        </svg>
    )
}

function QuickEditModal({ scene, onClose, onSave }: any) {
  const [loads, setLoads] = useState({ music: scene.mLoad, dance: scene.dLoad, block: scene.bLoad });
  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
      <div className="bg-zinc-900 border border-white/10 p-6 rounded-2xl w-full max-w-md shadow-2xl animate-in fade-in zoom-in duration-200">
        <div className="flex justify-between items-start mb-6">
            <div><h3 className="text-lg font-bold text-white">Adjust Scope</h3><p className="text-zinc-500 text-xs">{scene.name}</p></div>
            <button onClick={onClose} className="p-1 hover:bg-white/10 rounded text-zinc-400 hover:text-white"><X size={18}/></button>
        </div>
        <div className="space-y-6">
           {['music', 'dance', 'block'].map((type) => (
             <div key={type}>
               <div className="flex justify-between text-xs font-bold uppercase text-zinc-400 mb-2">
                 <span>{type} Load</span><span className="text-white bg-zinc-800 px-2 py-0.5 rounded">{loads[type as keyof typeof loads]}</span>
               </div>
               <input type="range" min="0" max="5" step="1" value={loads[type as keyof typeof loads]} onChange={(e) => setLoads(prev => ({ ...prev, [type]: parseInt(e.target.value) }))} className={`w-full h-2 rounded-lg appearance-none cursor-pointer ${type === 'music' ? 'accent-blue-500' : type === 'dance' ? 'accent-purple-500' : 'accent-emerald-500'} bg-zinc-800`} />
               <div className="flex justify-between text-[10px] text-zinc-600 font-mono mt-1"><span>None</span><span>Complex</span></div>
             </div>
           ))}
        </div>
        <div className="flex gap-3 mt-8 pt-6 border-t border-white/5">
          <button onClick={onClose} className="flex-1 py-3 rounded-xl font-bold text-zinc-400 hover:bg-white/5 transition-colors text-sm">Cancel</button>
          <button onClick={() => onSave(scene.id, loads)} className="flex-1 py-3 rounded-xl font-bold bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-900/20 text-sm">Update Graph</button>
        </div>
      </div>
    </div>
  );
}