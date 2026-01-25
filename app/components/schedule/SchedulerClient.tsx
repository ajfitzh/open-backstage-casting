"use client";

import React, { useState, useMemo } from 'react';
import { 
  Save, X, AlertCircle, AlertTriangle, Clock, 
  MapPin, Users, Calendar 
} from 'lucide-react';

// --- TYPES ---
type TrackType = "Acting" | "Music" | "Dance";

interface TimeSlot {
  id: string;
  day: string;
  label: string;
  isHourStart: boolean;
}

interface ScheduledItem {
  id: string;
  sceneId: number;
  track: TrackType;
  slotId: string;
}

// --- CONFIG: 15-Minute Grid ---
const generateTimeSlots = () => {
  const slots: TimeSlot[] = [];
  
  // Friday 6:00 PM - 9:00 PM
  for (let h = 18; h < 21; h++) {
    ['00', '15', '30', '45'].forEach(m => {
      slots.push({ 
        id: `fri-${h}${m}`, 
        day: 'Friday', 
        label: `${h > 12 ? h-12 : h}:${m} PM`, 
        isHourStart: m === '00'
      });
    });
  }

  // Saturday 10:00 AM - 5:00 PM
  for (let h = 10; h < 17; h++) {
    ['00', '15', '30', '45'].forEach(m => {
      slots.push({ 
        id: `sat-${h}${m}`, 
        day: 'Saturday', 
        label: `${h > 12 ? h-12 : h}:${m} ${h >= 12 ? 'PM' : 'AM'}`, 
        isHourStart: m === '00'
      });
    });
  }
  return slots;
};

const TIME_SLOTS = generateTimeSlots();

export default function SchedulerClient({ scenes, roles, assignments, people }: any) {
  
  const [schedule, setSchedule] = useState<ScheduledItem[]>([]);
  const [draggedSceneId, setDraggedSceneId] = useState<number | null>(null);
  const [viewDay, setViewDay] = useState<'Friday' | 'Saturday'>('Friday');

  // --- 1. DATA PREP ---
  const sceneData = useMemo(() => {
    // Map Assignments (Role -> Actors)
    const roleActorMap = new Map<number, number[]>();
    assignments.forEach((a: any) => {
        const rId = a["Performance Identity"]?.[0]?.id;
        const pId = a["Person"]?.[0]?.id;
        if(rId && pId) {
            const curr = roleActorMap.get(rId) || [];
            if(!curr.includes(pId)) roleActorMap.set(rId, [...curr, pId]);
        }
    });

    // Map People (ID -> Name & Conflicts)
    const actorMap = new Map();
    people.forEach((p: any) => {
        const cRaw = p["Rehearsal Conflicts"];
        let cStr = "";
        if (Array.isArray(cRaw)) cStr = cRaw.map((c: any) => c.value || c).join(" ").toLowerCase();
        else if (typeof cRaw === "string") cStr = cRaw.toLowerCase();
        actorMap.set(p.id, { id: p.id, name: p["Full Name"], conflicts: cStr });
    });

    return scenes.map((s: any) => {
        const rolesInScene = roles.filter((r: any) => r["Active Scenes"]?.some((link:any) => link.id === s.id));
        const actorsInScene = new Set<number>();
        rolesInScene.forEach((r: any) => roleActorMap.get(r.id)?.forEach(id => actorsInScene.add(id)));
        const castList = Array.from(actorsInScene).map(id => actorMap.get(id)).filter(Boolean);

        return {
            id: s.id,
            name: s["Scene Name"],
            act: s["Act"]?.value,
            cast: castList,
            size: castList.length
        };
    }).sort((a: any, b: any) => a.id - b.id);
  }, [scenes, roles, assignments, people]);


  // --- 2. LOGIC ---
  const getSlotConflicts = (sceneId: number, slotId: string) => {
      const slot = TIME_SLOTS.find(t => t.id === slotId);
      if(!slot) return [];
      const scene = sceneData.find(s => s.id === sceneId);
      if(!scene) return [];
      return scene.cast.filter((p: any) => p.conflicts.includes(slot.day.toLowerCase()));
  };

  const handleDrop = (e: React.DragEvent, slotId: string, track: TrackType) => {
      e.preventDefault();
      const sceneId = parseInt(e.dataTransfer.getData("sceneId"));
      if(!sceneId) return;
      setSchedule(prev => [...prev, { id: Date.now().toString(), sceneId, track, slotId }]);
      setDraggedSceneId(null);
  };

  // Who is called today?
  const calledActors = useMemo(() => {
      const activeSlots = TIME_SLOTS.filter(t => t.day === viewDay).map(t => t.id);
      const scheduledScenes = schedule
          .filter(item => activeSlots.includes(item.slotId))
          .map(item => item.sceneId);
      
      const uniqueActors = new Set<string>();
      scheduledScenes.forEach(sid => {
          const scene = sceneData.find(s => s.id === sid);
          scene?.cast.forEach((p: any) => uniqueActors.add(p.name));
      });
      return Array.from(uniqueActors).sort();
  }, [schedule, viewDay, sceneData]);

  return (
    <div className="flex h-screen bg-zinc-950 text-white overflow-hidden font-sans">
        
        {/* SIDEBAR: RESOURCES */}
        <aside className="w-72 border-r border-white/10 flex flex-col bg-zinc-900 shrink-0 z-20 shadow-xl">
            <div className="p-4 border-b border-white/10 bg-zinc-900">
                <h2 className="text-xs font-black uppercase tracking-widest text-zinc-500 mb-3 flex items-center gap-2">
                    <Clock size={12}/> Scenes Bank
                </h2>
                <div className="flex-1 overflow-y-auto max-h-[50vh] pr-2 custom-scrollbar space-y-2">
                    {sceneData.map((scene: any) => (
                        <div 
                            key={scene.id}
                            draggable
                            onDragStart={(e) => {
                                e.dataTransfer.setData("sceneId", scene.id.toString());
                                setDraggedSceneId(scene.id);
                            }}
                            onDragEnd={() => setDraggedSceneId(null)}
                            className="bg-zinc-800 border border-white/5 p-3 rounded hover:border-white/30 cursor-grab active:cursor-grabbing group transition-all"
                        >
                            <div className="flex justify-between items-start mb-1">
                                <span className="font-bold text-sm text-zinc-200 leading-tight">{scene.name}</span>
                                <span className="text-[9px] font-mono bg-black/50 px-1.5 py-0.5 rounded text-zinc-400">Act {scene.act}</span>
                            </div>
                            <div className="flex items-center gap-2 text-[10px] text-zinc-500">
                                <Users size={10} /> {scene.size} Cast Members
                            </div>
                        </div>
                    ))}
                </div>
            </div>
            
            {/* CALL BOARD */}
            <div className="flex-1 flex flex-col bg-zinc-950 border-t border-white/10">
                <div className="p-3 border-b border-white/10 bg-zinc-900 flex justify-between items-center">
                    <span className="text-[10px] font-black uppercase text-emerald-500 flex items-center gap-2"><Users size={12}/> Call List ({viewDay})</span>
                    <span className="text-[10px] font-mono text-zinc-500 bg-zinc-950 px-2 py-0.5 rounded-full">{calledActors.length}</span>
                </div>
                <div className="flex-1 overflow-y-auto p-3 content-start">
                    <div className="flex flex-wrap gap-1.5">
                        {calledActors.map(name => (
                            <span key={name} className="text-[10px] bg-zinc-900 border border-zinc-800 px-2 py-1 rounded text-zinc-300 hover:text-white transition-colors cursor-default">
                                {name}
                            </span>
                        ))}
                        {calledActors.length === 0 && <div className="w-full text-center mt-10 text-zinc-700 italic text-xs">Drag scenes to build the call list...</div>}
                    </div>
                </div>
            </div>
        </aside>

        {/* MAIN: THE GRID */}
        <main className="flex-1 flex flex-col min-w-0 bg-zinc-950 relative">
            
            {/* HEADER TOOLBAR */}
            <header className="h-14 border-b border-white/10 bg-zinc-900 flex items-center justify-between px-6 shrink-0 z-10 shadow-lg">
                <div className="flex items-center gap-4">
                     <div className="flex bg-black/50 rounded-lg p-1 border border-white/5">
                        <button onClick={() => setViewDay('Friday')} className={`px-5 py-1.5 rounded-md text-xs font-black uppercase tracking-wide transition-all ${viewDay === 'Friday' ? 'bg-zinc-700 text-white shadow-sm' : 'text-zinc-500 hover:text-zinc-300'}`}>Friday</button>
                        <button onClick={() => setViewDay('Saturday')} className={`px-5 py-1.5 rounded-md text-xs font-black uppercase tracking-wide transition-all ${viewDay === 'Saturday' ? 'bg-zinc-700 text-white shadow-sm' : 'text-zinc-500 hover:text-zinc-300'}`}>Saturday</button>
                    </div>
                    <div className="h-6 w-px bg-white/10 mx-2"></div>
                    <h1 className="text-sm font-bold text-zinc-400">Week 1 Schedule</h1>
                </div>

                <button className="bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wider flex items-center gap-2 transition-all shadow-lg shadow-emerald-900/20">
                    <Save size={14} /> Publish Schedule
                </button>
            </header>

            {/* SCROLLABLE GRID AREA */}
            <div className="flex-1 overflow-y-auto custom-scrollbar relative bg-zinc-950">
                <div className="min-w-[900px] pb-20">
                    
                    {/* STICKY COLUMN HEADERS */}
                    <div className="sticky top-0 z-30 grid grid-cols-[80px_1fr_1fr_1fr] border-b border-white/10 shadow-lg">
                        <div className="bg-zinc-900 p-3 text-[10px] font-black uppercase text-zinc-500 text-center border-r border-white/10 flex items-center justify-center">Time</div>
                        <div className="bg-blue-950/30 p-3 text-xs font-black uppercase text-blue-400 text-center border-r border-white/10 border-t-4 border-t-blue-500 backdrop-blur-sm">Acting</div>
                        <div className="bg-purple-950/30 p-3 text-xs font-black uppercase text-purple-400 text-center border-r border-white/10 border-t-4 border-t-purple-500 backdrop-blur-sm">Music</div>
                        <div className="bg-emerald-950/30 p-3 text-xs font-black uppercase text-emerald-400 text-center border-t-4 border-t-emerald-500 backdrop-blur-sm">Dance</div>
                    </div>

                    {/* TIME SLOTS */}
                    {TIME_SLOTS.filter(t => t.day === viewDay).map((slot, index) => (
                        <div 
                            key={slot.id} 
                            className={`grid grid-cols-[80px_1fr_1fr_1fr] min-h-[60px] border-b border-white/5 group hover:bg-white/[0.01] transition-colors ${slot.isHourStart ? 'border-b-white/10' : ''}`}
                        >
                            {/* TIME LABEL */}
                            <div className="border-r border-white/10 p-3 text-[11px] font-bold text-zinc-500 text-right bg-zinc-900/50 sticky left-0 z-10 flex flex-col justify-start">
                                {slot.label}
                                {slot.isHourStart && <div className="mt-1 w-full h-px bg-white/10"/>}
                            </div>

                            {/* COLUMNS (Acting, Music, Dance) */}
                            {(['Acting', 'Music', 'Dance'] as const).map(track => {
                                const items = schedule.filter(i => i.slotId === slot.id && i.track === track);
                                
                                // Conflict Check for Dragging
                                const conflicts = draggedSceneId ? getSlotConflicts(draggedSceneId, slot.id) : [];
                                const hasConflict = conflicts.length > 0;

                                // Column Styles
                                const colStyle = track === 'Acting' ? 'bg-blue-900/5 border-blue-500/10' : 
                                                 track === 'Music' ? 'bg-purple-900/5 border-purple-500/10' : 
                                                 'bg-emerald-900/5 border-emerald-500/10';
                                
                                return (
                                    <div 
                                        key={track}
                                        onDragOver={(e) => e.preventDefault()}
                                        onDrop={(e) => handleDrop(e, slot.id, track)}
                                        className={`
                                            border-r border-white/5 p-1 relative transition-all duration-200
                                            ${colStyle}
                                            ${draggedSceneId && hasConflict ? '!bg-red-900/20 shadow-[inset_0_0_0_2px_rgba(220,38,38,0.5)]' : 
                                              draggedSceneId ? '!bg-white/5' : ''}
                                        `}
                                    >
                                        {/* CONFLICT OVERLAY (During Drag) */}
                                        {draggedSceneId && hasConflict && (
                                            <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-20">
                                                <div className="bg-red-950 border border-red-500 text-red-200 text-[10px] font-bold px-2 py-1 rounded shadow-xl flex items-center gap-2">
                                                    <AlertTriangle size={12}/> {conflicts.length} Conflicts
                                                </div>
                                            </div>
                                        )}

                                        {/* SCHEDULED CARDS */}
                                        {items.map(item => {
                                            const sData = sceneData.find(s => s.id === item.sceneId);
                                            const itemConflicts = getSlotConflicts(item.sceneId, slot.id);
                                            
                                            // Card Color based on Track
                                            const cardColor = track === 'Acting' ? 'bg-blue-600 border-blue-400' : 
                                                              track === 'Music' ? 'bg-purple-600 border-purple-400' : 
                                                              'bg-emerald-600 border-emerald-400';

                                            return (
                                                <div key={item.id} className={`${cardColor} border-l-4 text-white p-2 rounded shadow-lg relative group/item mb-1 animate-in zoom-in-95 duration-200`}>
                                                    <div className="flex justify-between items-start">
                                                        <span className="text-xs font-black leading-tight drop-shadow-md">{sData?.name}</span>
                                                        <button 
                                                            onClick={() => setSchedule(prev => prev.filter(p => p.id !== item.id))}
                                                            className="text-white/50 hover:text-white transition-colors"
                                                        >
                                                            <X size={12}/>
                                                        </button>
                                                    </div>

                                                    {/* PERSISTENT CONFLICT WARNING */}
                                                    {itemConflicts.length > 0 && (
                                                        <div className="mt-2 bg-red-950/90 border border-red-400/50 rounded px-1.5 py-1 flex items-center gap-1.5 w-fit">
                                                            <AlertCircle size={10} className="text-red-400"/>
                                                            <span className="text-[9px] font-bold text-red-100 uppercase tracking-wide">
                                                                {itemConflicts.length} Conflict{itemConflicts.length > 1 ? 's' : ''}
                                                            </span>
                                                        </div>
                                                    )}
                                                    
                                                    <div className="mt-1 flex justify-between items-end opacity-80">
                                                        <span className="text-[9px] uppercase font-bold tracking-wider">Act {sData?.act}</span>
                                                        <span className="text-[9px] font-mono bg-black/20 px-1 rounded">{sData?.size} ppl</span>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                );
                            })}
                        </div>
                    ))}
                </div>
            </div>
        </main>
    </div>
  );
}