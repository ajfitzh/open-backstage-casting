"use client";

import React, { useState, useMemo } from 'react';
import { 
  Save, X, AlertTriangle, Clock, 
  Users, ChevronRight, ChevronLeft, Search,
  MoreHorizontal, PlayCircle, CheckCircle2,
  Maximize2, Minimize2, Plus, Minus
} from 'lucide-react';

// --- TYPES ---
type TrackType = "Acting" | "Music" | "Dance";
type SceneStatus = "New" | "Worked" | "Polished";

interface ScheduledItem {
  id: string;
  sceneId: number;
  track: TrackType;
  day: 'Fri' | 'Sat';
  weekOffset: number; // 0 = this week, 1 = next week
  startTime: number; // e.g. 18.0 = 6pm
  duration: number; // in minutes (15, 30, 45...)
  status: SceneStatus;
}

// --- CONFIG ---
const FRI_START = 18; // 6 PM
const FRI_END = 21;   // 9 PM
const SAT_START = 10; // 10 AM
const SAT_END = 17;   // 5 PM

export default function SchedulerClient({ scenes, roles, assignments, people, productionTitle }: any) {
  
  // State
  const [schedule, setSchedule] = useState<ScheduledItem[]>([]);
  const [draggedSceneId, setDraggedSceneId] = useState<number | null>(null);
  const [currentWeekOffset, setCurrentWeekOffset] = useState(0);
  const [searchQuery, setSearchQuery] = useState("");
  const [isCallListExpanded, setIsCallListExpanded] = useState(false);

  // --- 🧠 DATA PREP ---
  const sceneData = useMemo(() => {
    // 1. Map Person ID -> Name
    const personMap = new Map();
    people.forEach((p: any) => {
        personMap.set(p.id, { 
            name: p["Full Name"] || `ID ${p.id}`, 
        });
    });

    // 2. Map Role -> Cast
    const roleCastMap = new Map<number, number[]>();
    assignments.forEach((a: any) => {
        const roleId = a["Performance Identity"]?.[0]?.id;
        const personId = a["Person"]?.[0]?.id;
        if(roleId && personId) {
            const current = roleCastMap.get(roleId) || [];
            if(!current.includes(personId)) roleCastMap.set(roleId, [...current, personId]);
        }
    });

    // 3. Hydrate Scenes
    return scenes.map((s: any) => {
        const linkedRoles = roles.filter((r: any) => 
            r["Active Scenes"]?.some((link:any) => link.id === s.id)
        );
        const castIds = new Set<number>();
        linkedRoles.forEach((r: any) => {
            const pIds = roleCastMap.get(r.id) || [];
            pIds.forEach(id => castIds.add(id));
        });

        // Determine Status based on schedule history
        // (In a real app, this would come from DB, here we infer from local state)
        const isPolished = schedule.some(i => i.sceneId === s.id && i.status === 'Polished');
        const isWorked = schedule.some(i => i.sceneId === s.id && i.status === 'Worked');

        return {
            id: s.id,
            name: s["Scene Name"],
            act: s["Act"]?.value || "1",
            type: s["Scene Type"]?.value || "Scene",
            cast: Array.from(castIds).map(id => personMap.get(id)).filter(Boolean),
            status: isPolished ? 'Polished' : isWorked ? 'Worked' : 'New'
        };
    }).sort((a: any, b: any) => a.id - b.id);
  }, [scenes, roles, assignments, people, schedule]); // Re-calc when schedule changes for status updates

  // --- ACTIONS ---

  const handleDrop = (e: React.DragEvent, day: 'Fri' | 'Sat', hour: number, min: number, track: TrackType) => {
      e.preventDefault();
      const sceneId = parseInt(e.dataTransfer.getData("sceneId"));
      if(!sceneId) return;

      const startTime = hour + (min / 60);
      
      const newBlock: ScheduledItem = {
          id: Date.now().toString(),
          sceneId,
          track,
          day,
          weekOffset: currentWeekOffset,
          startTime,
          duration: 30, // Default to 30 mins
          status: 'New'
      };

      setSchedule(prev => [...prev, newBlock]);
      setDraggedSceneId(null);
  };

  const updateDuration = (itemId: string, change: number) => {
      setSchedule(prev => prev.map(item => {
          if (item.id !== itemId) return item;
          const newDur = item.duration + change;
          return newDur >= 15 ? { ...item, duration: newDur } : item;
      }));
  };

  const toggleStatus = (itemId: string) => {
      const cycle: Record<SceneStatus, SceneStatus> = { 'New': 'Worked', 'Worked': 'Polished', 'Polished': 'New' };
      setSchedule(prev => prev.map(item => 
          item.id === itemId ? { ...item, status: cycle[item.status] } : item
      ));
  };

  // --- CALCULATIONS ---

  // 1. Current Week Label
  const weekLabel = useMemo(() => {
      const today = new Date();
      // Find next Friday
      const nextFri = new Date(today);
      nextFri.setDate(today.getDate() + (5 + 7 - today.getDay()) % 7);
      // Add Offset
      nextFri.setDate(nextFri.getDate() + (currentWeekOffset * 7));
      return `Week of ${nextFri.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`;
  }, [currentWeekOffset]);

  // 2. Call List Logic (Start/End Times)
  const callList = useMemo(() => {
      const activeItems = schedule.filter(i => i.weekOffset === currentWeekOffset);
      const actorMap = new Map<string, { name: string, start: number, end: number, day: string }>();

      activeItems.forEach(item => {
          const scene = sceneData.find((s: any) => s.id === item.sceneId);
          if (!scene) return;
          
          const itemEnd = item.startTime + (item.duration / 60);

          scene.cast.forEach((actor: any) => {
              const key = `${actor.name}-${item.day}`; // Unique per day
              const current = actorMap.get(key);

              if (!current) {
                  actorMap.set(key, { 
                      name: actor.name, 
                      start: item.startTime, 
                      end: itemEnd,
                      day: item.day 
                  });
              } else {
                  actorMap.set(key, {
                      ...current,
                      start: Math.min(current.start, item.startTime),
                      end: Math.max(current.end, itemEnd)
                  });
              }
          });
      });

      return Array.from(actorMap.values()).sort((a, b) => {
          if (a.day !== b.day) return a.day === 'Fri' ? -1 : 1;
          return a.start - b.start;
      });
  }, [schedule, currentWeekOffset, sceneData]);

  // 3. Show Health
  const showHealth = useMemo(() => {
      const total = sceneData.length;
      const worked = sceneData.filter((s:any) => s.status === 'Worked').length;
      const polished = sceneData.filter((s:any) => s.status === 'Polished').length;
      return { total, worked, polished };
  }, [sceneData]);


  // --- RENDER HELPERS ---
  const formatTime = (decimalTime: number) => {
      const h = Math.floor(decimalTime);
      const m = Math.round((decimalTime - h) * 60);
      const suffix = h >= 12 ? 'PM' : 'AM';
      const h12 = h > 12 ? h - 12 : h;
      return `${h12}:${m.toString().padStart(2, '0')} ${suffix}`;
  };

  return (
    <div className="flex h-screen bg-zinc-950 text-white overflow-hidden font-sans">
        
        {/* --- LEFT SIDEBAR: SCENE BANK --- */}
        <aside className="w-72 border-r border-white/10 flex flex-col bg-zinc-900 shrink-0 z-20 shadow-xl">
            {/* Header */}
            <div className="p-4 border-b border-white/10">
                <div className="text-[10px] font-black uppercase text-zinc-500 tracking-widest mb-2">Show Health</div>
                <div className="flex h-2 bg-zinc-800 rounded-full overflow-hidden mb-2">
                    <div className="bg-emerald-500" style={{ width: `${(showHealth.polished / showHealth.total) * 100}%` }} title="Polished"/>
                    <div className="bg-blue-500" style={{ width: `${(showHealth.worked / showHealth.total) * 100}%` }} title="Worked"/>
                </div>
                <div className="flex justify-between text-[9px] text-zinc-500 font-bold uppercase">
                    <span className="flex items-center gap-1"><div className="w-1.5 h-1.5 rounded-full bg-emerald-500"/> {showHealth.polished} Polished</span>
                    <span className="flex items-center gap-1"><div className="w-1.5 h-1.5 rounded-full bg-blue-500"/> {showHealth.worked} Worked</span>
                    <span className="flex items-center gap-1"><div className="w-1.5 h-1.5 rounded-full bg-zinc-700"/> {showHealth.total - showHealth.polished - showHealth.worked} New</span>
                </div>
            </div>

            {/* Search */}
            <div className="p-2">
                <div className="relative">
                    <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-zinc-500"/>
                    <input 
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Filter scenes..." 
                        className="w-full bg-black/20 border border-white/10 rounded-lg pl-8 pr-3 py-1.5 text-xs focus:border-blue-500 outline-none placeholder:text-zinc-600"
                    />
                </div>
            </div>

            {/* List */}
            <div className="flex-1 overflow-y-auto px-2 space-y-1 custom-scrollbar">
                {sceneData.filter((s:any) => s.name.toLowerCase().includes(searchQuery.toLowerCase())).map((scene: any) => (
                    <div 
                        key={scene.id}
                        draggable
                        onDragStart={(e) => {
                            e.dataTransfer.setData("sceneId", scene.id.toString());
                            setDraggedSceneId(scene.id);
                        }}
                        onDragEnd={() => setDraggedSceneId(null)}
                        className={`
                            border p-2 rounded cursor-grab active:cursor-grabbing hover:bg-white/5 transition-all
                            ${scene.status === 'Polished' ? 'border-emerald-500/30 bg-emerald-900/10' : 
                              scene.status === 'Worked' ? 'border-blue-500/30 bg-blue-900/10' : 
                              'border-white/5 bg-zinc-900'}
                        `}
                    >
                        <div className="flex justify-between items-center mb-1">
                            <span className="font-bold text-xs text-zinc-200 truncate">{scene.name}</span>
                            {scene.status === 'Polished' && <CheckCircle2 size={10} className="text-emerald-500"/>}
                            {scene.status === 'Worked' && <PlayCircle size={10} className="text-blue-500"/>}
                        </div>
                        <div className="flex items-center gap-2 text-[10px] text-zinc-500">
                             <span className="bg-black/30 px-1 rounded">Act {scene.act}</span>
                             <span>{scene.cast.length} Actors</span>
                        </div>
                    </div>
                ))}
            </div>

            {/* Call List Preview */}
            <div className="border-t border-white/10 bg-zinc-950">
                <button 
                    onClick={() => setIsCallListExpanded(true)}
                    className="w-full p-3 flex justify-between items-center hover:bg-zinc-900 transition-colors"
                >
                    <span className="text-[10px] font-black uppercase text-emerald-500 flex items-center gap-2">
                        <Users size={12}/> Call List
                    </span>
                    <Maximize2 size={12} className="text-zinc-500"/>
                </button>
            </div>
        </aside>

        {/* --- MAIN: CALENDAR GRID --- */}
        <main className="flex-1 flex flex-col min-w-0 bg-zinc-950 relative">
            
            {/* Header: Week Navigator */}
            <header className="h-14 border-b border-white/10 bg-zinc-900 flex items-center justify-between px-6 shrink-0 shadow-lg z-30">
                <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2 bg-black/40 rounded-lg p-1 border border-white/5">
                        <button onClick={() => setCurrentWeekOffset(c => c - 1)} className="p-1 hover:text-white text-zinc-500 transition-colors"><ChevronLeft size={16}/></button>
                        <span className="text-xs font-bold text-zinc-300 w-32 text-center select-none">{weekLabel}</span>
                        <button onClick={() => setCurrentWeekOffset(c => c + 1)} className="p-1 hover:text-white text-zinc-500 transition-colors"><ChevronRight size={16}/></button>
                    </div>
                    <div className="h-6 w-px bg-white/10 mx-2"></div>
                    <h1 className="text-sm font-bold text-zinc-500 uppercase tracking-widest">{productionTitle}</h1>
                </div>
                <button className="bg-white text-black px-4 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider hover:bg-zinc-200 transition-all">
                    Publish Schedule
                </button>
            </header>

            {/* The Grid Canvas */}
            <div className="flex-1 overflow-y-auto custom-scrollbar bg-zinc-950 p-4">
                <div className="flex gap-4 h-full min-h-[600px]">
                    
                    {/* FRIDAY COLUMN */}
                    <DayColumn 
                        day="Fri" 
                        startHour={FRI_START} 
                        endHour={FRI_END} 
                        schedule={schedule}
                        weekOffset={currentWeekOffset}
                        onDrop={handleDrop}
                        onDurationChange={updateDuration}
                        onStatusToggle={toggleStatus}
                        draggedSceneId={draggedSceneId}
                        sceneData={sceneData}
                    />

                    {/* SATURDAY COLUMN */}
                    <DayColumn 
                        day="Sat" 
                        startHour={SAT_START} 
                        endHour={SAT_END} 
                        schedule={schedule}
                        weekOffset={currentWeekOffset}
                        onDrop={handleDrop}
                        onDurationChange={updateDuration}
                        onStatusToggle={toggleStatus}
                        draggedSceneId={draggedSceneId}
                        sceneData={sceneData}
                    />
                </div>
            </div>
        </main>

        {/* --- MODAL: EXPANDED CALL LIST --- */}
        {isCallListExpanded && (
            <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-8 animate-in fade-in">
                <div className="bg-zinc-900 w-full max-w-4xl h-[80vh] rounded-2xl border border-white/10 flex flex-col shadow-2xl overflow-hidden">
                    <div className="p-4 border-b border-white/10 flex justify-between items-center bg-zinc-800">
                        <h2 className="text-lg font-black uppercase italic tracking-wider text-emerald-500">Weekly Call List</h2>
                        <button onClick={() => setIsCallListExpanded(false)} className="text-zinc-500 hover:text-white"><X size={24}/></button>
                    </div>
                    
                    <div className="flex-1 overflow-y-auto p-6 grid grid-cols-2 gap-8 custom-scrollbar">
                        {['Fri', 'Sat'].map(day => (
                            <div key={day}>
                                <h3 className="text-sm font-bold text-white mb-4 border-b border-white/10 pb-2">{day === 'Fri' ? 'Friday' : 'Saturday'}</h3>
                                <div className="space-y-2">
                                    {callList.filter(c => c.day === day).map((actor, i) => (
                                        <div key={i} className="flex justify-between items-center p-2 bg-black/20 rounded border border-white/5">
                                            <span className="text-sm text-zinc-300 font-bold">{actor.name}</span>
                                            <div className="text-xs font-mono text-zinc-500 bg-black/40 px-2 py-1 rounded">
                                                {formatTime(actor.start)} - {formatTime(actor.end)}
                                            </div>
                                        </div>
                                    ))}
                                    {callList.filter(c => c.day === day).length === 0 && <p className="text-zinc-600 text-xs italic">No calls.</p>}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        )}
    </div>
  );
}

// --- SUB-COMPONENT: DAY COLUMN ---
function DayColumn({ day, startHour, endHour, schedule, weekOffset, onDrop, onDurationChange, onStatusToggle, draggedSceneId, sceneData }: any) {
    
    // Generate Time Slots (15 min increments)
    const slots: { h: any; m: number; val: any; }[] = [];
    for (let h = startHour; h < endHour; h++) {
        [0, 15, 30, 45].forEach(m => slots.push({ h, m, val: h + m/60 }));
    }

    return (
        <div className="flex-1 flex flex-col bg-zinc-900 border border-white/10 rounded-xl overflow-hidden shadow-lg">
            <div className="p-3 bg-zinc-800 border-b border-white/10 text-center font-black uppercase text-zinc-400">
                {day === 'Fri' ? 'Friday Rehearsal' : 'Saturday Rehearsal'}
            </div>
            
            <div className="flex-1 relative overflow-y-auto custom-scrollbar flex">
                
                {/* Time Labels */}
                <div className="w-12 bg-zinc-950/50 border-r border-white/5 flex flex-col text-[10px] text-zinc-600 font-mono text-right py-2">
                    {slots.filter(s => s.m === 0).map(s => (
                        <div key={s.val} style={{ height: '128px' }} className="pr-2 pt-1 border-b border-white/5">
                            {s.h > 12 ? s.h-12 : s.h} {s.h >= 12 ? 'PM' : 'AM'}
                        </div>
                    ))}
                </div>

                {/* Tracks Container */}
                <div className="flex-1 grid grid-cols-3 divide-x divide-white/5 relative min-h-[800px]">
                    {['Acting', 'Music', 'Dance'].map((track, i) => (
                        <div key={track} className="relative group/track">
                             <div className="absolute top-0 left-0 right-0 p-1 text-[9px] font-black uppercase text-center text-zinc-700 bg-zinc-900/80 z-10">{track}</div>
                             
                             {/* Render Slots (Targets) */}
                             {slots.map((slot) => (
                                 <div 
                                    key={slot.val} 
                                    className={`h-8 border-b border-white/[0.03] transition-colors ${draggedSceneId ? 'hover:bg-blue-500/10' : ''}`}
                                    onDragOver={(e) => e.preventDefault()}
                                    onDrop={(e) => onDrop(e, day, slot.h, slot.m, track)}
                                 />
                             ))}

                             {/* Render Blocks */}
                             {schedule
                                .filter((item: ScheduledItem) => item.day === day && item.track === track && item.weekOffset === weekOffset)
                                .map((item: ScheduledItem) => {
                                    // Calculate Position
                                    const top = (item.startTime - startHour) * 128; // 32px per 15 min * 4 = 128px per hour
                                    const height = (item.duration / 60) * 128;
                                    const scene = sceneData.find((s:any) => s.id === item.sceneId);

                                    // Color Logic
                                    let colorClass = "bg-zinc-700 border-zinc-500"; // Default (New)
                                    if (item.status === 'Worked') colorClass = "bg-blue-600 border-blue-400 shadow-blue-900/20";
                                    if (item.status === 'Polished') colorClass = "bg-emerald-600 border-emerald-400 shadow-emerald-900/20";

                                    return (
                                        <div 
                                            key={item.id}
                                            onContextMenu={(e) => { e.preventDefault(); onStatusToggle(item.id); }}
                                            className={`absolute left-1 right-1 rounded border-l-4 p-2 shadow-lg text-white text-xs overflow-hidden flex flex-col justify-between group/block transition-all z-20 ${colorClass}`}
                                            style={{ top: `${top}px`, height: `${height}px` }}
                                        >
                                            <div className="font-bold leading-tight drop-shadow-md truncate">{scene?.name || 'Unknown'}</div>
                                            
                                            {/* HOVER CONTROLS */}
                                            <div className="opacity-0 group-hover/block:opacity-100 flex justify-between items-end transition-opacity">
                                                <div className="flex bg-black/30 rounded">
                                                    <button onClick={() => onDurationChange(item.id, -15)} className="p-0.5 hover:bg-white/20"><Minus size={10}/></button>
                                                    <button onClick={() => onDurationChange(item.id, 15)} className="p-0.5 hover:bg-white/20"><Plus size={10}/></button>
                                                </div>
                                                <div className="text-[9px] font-mono bg-black/30 px-1 rounded">
                                                    {item.duration}m
                                                </div>
                                            </div>
                                        </div>
                                    )
                             })}
                        </div>
                    ))}
                </div>
            </div>
        </div>
    )
}