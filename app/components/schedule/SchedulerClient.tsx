"use client";

import React, { useState, useMemo } from 'react';
import { 
  Calendar, Clock, AlertTriangle, Check, Music, Move, 
  Theater, Save, Wand2, X, Users, AlertCircle 
} from 'lucide-react';

// --- TYPES ---
type TrackType = "Acting" | "Music" | "Dance";

interface TimeSlot {
  id: string;
  day: string;
  label: string;
  time24: number; // For sorting
}

interface ScheduledItem {
  id: string; // unique drag id
  sceneId: number;
  track: TrackType;
  slotId: string;
  duration: number; // in slots (1 = 15 mins, 4 = 1 hour)
}

// --- CONFIG: 15-Minute Increments ---
// This mimics your spreadsheet's granularity
const generateTimeSlots = () => {
  const slots: TimeSlot[] = [];
  
  // Friday 6:00 PM - 9:00 PM
  for (let h = 18; h < 21; h++) {
    ['00', '15', '30', '45'].forEach(m => {
      slots.push({ 
        id: `fri-${h}${m}`, 
        day: 'Friday', 
        label: `${h > 12 ? h-12 : h}:${m} PM`, 
        time24: h + (parseInt(m)/60) 
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
        time24: h + 24 + (parseInt(m)/60) 
      });
    });
  }
  return slots;
};

const TIME_SLOTS = generateTimeSlots();

export default function SchedulerClient({ scenes, roles, assignments, people }: any) {
  
  // --- STATE ---
  const [schedule, setSchedule] = useState<ScheduledItem[]>([]);
  const [draggedSceneId, setDraggedSceneId] = useState<number | null>(null);
  const [viewDay, setViewDay] = useState<'Friday' | 'Saturday'>('Saturday');

  // --- 1. DATA PREP (The "Brain") ---
  // Maps Scene -> Actors -> Conflicts
  const sceneData = useMemo(() => {
    // 1. Map Assignments (Role -> Actors)
    const roleActorMap = new Map<number, number[]>();
    assignments.forEach((a: any) => {
        const rId = a["Performance Identity"]?.[0]?.id;
        const pId = a["Person"]?.[0]?.id;
        if(rId && pId) {
            const curr = roleActorMap.get(rId) || [];
            if(!curr.includes(pId)) roleActorMap.set(rId, [...curr, pId]);
        }
    });

    // 2. Map People (ID -> Name & Conflicts)
    const actorMap = new Map();
    people.forEach((p: any) => {
        // Handle "Link Row" or "Text" conflicts
        const cRaw = p["Rehearsal Conflicts"];
        let cStr = "";
        if (Array.isArray(cRaw)) cStr = cRaw.map((c: any) => c.value || c).join(" ").toLowerCase();
        else if (typeof cRaw === "string") cStr = cRaw.toLowerCase();
        
        actorMap.set(p.id, { id: p.id, name: p["Full Name"], conflicts: cStr });
    });

    // 3. Map Scenes
    return scenes.map((s: any) => {
        // Find Roles in this Scene
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


  // --- 2. CONFLICT ENGINE ---
  const getSlotConflicts = (sceneId: number, slotId: string) => {
      const slot = TIME_SLOTS.find(t => t.id === slotId);
      if(!slot) return [];

      const scene = sceneData.find(s => s.id === sceneId);
      if(!scene) return [];

      // Check every actor in this scene for a conflict on this Day
      // (Prototype logic: String match "Friday" or "Saturday")
      return scene.cast.filter((p: any) => p.conflicts.includes(slot.day.toLowerCase()));
  };

  // --- 3. DYNAMIC "WHO IS CALLED?" LIST ---
  const calledActors = useMemo(() => {
      // Get all scenes currently on the board for the active day
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


  // --- HANDLERS ---
  const handleDrop = (e: React.DragEvent, slotId: string, track: TrackType) => {
      e.preventDefault();
      const sceneId = parseInt(e.dataTransfer.getData("sceneId"));
      if(!sceneId) return;

      const newItem: ScheduledItem = {
          id: Date.now().toString(),
          sceneId,
          track,
          slotId,
          duration: 4 // Default to 1 hour (4 x 15min slots)
      };

      setSchedule(prev => [...prev, newItem]);
      setDraggedSceneId(null);
  };

  return (
    <div className="flex h-screen bg-zinc-950 text-white overflow-hidden font-sans">
        
        {/* LEFT: RESOURCE BANK */}
        <aside className="w-64 border-r border-white/10 flex flex-col bg-zinc-900 shrink-0">
            <div className="p-4 border-b border-white/10">
                <h2 className="text-xs font-black uppercase tracking-widest text-zinc-500 mb-2">Scenes to Schedule</h2>
                <div className="relative">
                    <input className="w-full bg-zinc-950 border border-white/10 rounded px-2 py-1 text-xs" placeholder="Search..." />
                </div>
            </div>
            <div className="flex-1 overflow-y-auto p-2 space-y-2 custom-scrollbar">
                {sceneData.map((scene: any) => (
                    <div 
                        key={scene.id}
                        draggable
                        onDragStart={(e) => {
                            e.dataTransfer.setData("sceneId", scene.id.toString());
                            setDraggedSceneId(scene.id);
                        }}
                        onDragEnd={() => setDraggedSceneId(null)}
                        className="bg-zinc-950 border border-white/5 p-2 rounded hover:border-blue-500 cursor-grab active:cursor-grabbing group"
                    >
                        <div className="flex justify-between items-center">
                            <span className="font-bold text-xs text-zinc-300">{scene.name}</span>
                            <span className="text-[9px] bg-zinc-800 px-1 rounded text-zinc-500">{scene.size} ppl</span>
                        </div>
                    </div>
                ))}
            </div>
            
            {/* BOTTOM: WHO IS CALLED LIST */}
            <div className="h-1/3 border-t border-white/10 bg-zinc-950 flex flex-col">
                <div className="p-2 border-b border-white/10 bg-zinc-900 flex justify-between items-center">
                    <span className="text-[10px] font-black uppercase text-emerald-500">Called ({viewDay})</span>
                    <span className="text-[10px] font-mono text-zinc-500">{calledActors.length}</span>
                </div>
                <div className="flex-1 overflow-y-auto p-2">
                    <div className="flex flex-wrap gap-1">
                        {calledActors.map(name => (
                            <span key={name} className="text-[9px] bg-zinc-800 border border-white/5 px-1.5 py-0.5 rounded text-zinc-400">
                                {name}
                            </span>
                        ))}
                        {calledActors.length === 0 && <span className="text-[10px] text-zinc-600 italic">No one called yet...</span>}
                    </div>
                </div>
            </div>
        </aside>

        {/* MAIN: THE GRID */}
        <main className="flex-1 flex flex-col min-w-0 bg-zinc-900/50 relative">
            
            {/* TOOLBAR */}
            <header className="h-12 border-b border-white/10 bg-zinc-900 flex items-center justify-between px-4 shrink-0">
                <div className="flex bg-zinc-950 rounded-lg p-1 border border-white/5">
                    <button onClick={() => setViewDay('Friday')} className={`px-4 py-1 rounded text-xs font-bold uppercase ${viewDay === 'Friday' ? 'bg-zinc-800 text-white' : 'text-zinc-500 hover:text-white'}`}>Friday</button>
                    <button onClick={() => setViewDay('Saturday')} className={`px-4 py-1 rounded text-xs font-bold uppercase ${viewDay === 'Saturday' ? 'bg-zinc-800 text-white' : 'text-zinc-500 hover:text-white'}`}>Saturday</button>
                </div>
                <button className="bg-blue-600 hover:bg-blue-500 text-white px-3 py-1.5 rounded text-xs font-bold uppercase flex items-center gap-2">
                    <Save size={14} /> Publish
                </button>
            </header>

            {/* SCROLLABLE GRID */}
            <div className="flex-1 overflow-y-auto custom-scrollbar relative">
                <div className="min-w-[800px]">
                    
                    {/* COLUMN HEADERS */}
                    <div className="sticky top-0 z-20 flex border-b border-white/10 bg-zinc-900 shadow-md">
                        <div className="w-20 shrink-0 border-r border-white/10 bg-zinc-950 p-2 text-[10px] font-black uppercase text-zinc-600 text-center">Time</div>
                        <div className="flex-1 border-r border-white/10 p-2 text-center text-xs font-black uppercase text-blue-400 bg-blue-900/10">Acting (Dir)</div>
                        <div className="flex-1 border-r border-white/10 p-2 text-center text-xs font-black uppercase text-purple-400 bg-purple-900/10">Music (MD)</div>
                        <div className="flex-1 p-2 text-center text-xs font-black uppercase text-emerald-400 bg-emerald-900/10">Dance (Chor)</div>
                    </div>

                    {/* TIME ROWS */}
                    {TIME_SLOTS.filter(t => t.day === viewDay).map(slot => (
                        <div key={slot.id} className="flex border-b border-white/5 h-20 group hover:bg-white/[0.02]">
                            
                            {/* TIME LABEL */}
                            <div className="w-20 shrink-0 border-r border-white/10 p-2 text-[10px] font-bold text-zinc-500 text-right sticky left-0 bg-zinc-950 z-10">
                                {slot.label}
                            </div>

                            {/* TRACKS */}
                            {(['Acting', 'Music', 'Dance'] as const).map(track => {
                                // Find items in this slot
                                const items = schedule.filter(i => i.slotId === slot.id && i.track === track);
                                
                                // Check for conflict if dragging
                                const conflicts = draggedSceneId ? getSlotConflicts(draggedSceneId, slot.id) : [];
                                const hasConflict = conflicts.length > 0;

                                return (
                                    <div 
                                        key={track}
                                        onDragOver={(e) => e.preventDefault()}
                                        onDrop={(e) => handleDrop(e, slot.id, track)}
                                        className={`
                                            flex-1 border-r border-white/5 p-1 relative transition-colors
                                            ${draggedSceneId && hasConflict ? 'bg-red-900/20 shadow-[inset_0_0_20px_rgba(220,38,38,0.2)]' : 
                                              draggedSceneId ? 'bg-emerald-900/5' : ''}
                                        `}
                                    >
                                        {/* CONFLICT WARNING OVERLAY */}
                                        {draggedSceneId && hasConflict && (
                                            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                                                <div className="bg-black/80 px-2 py-1 rounded text-[9px] text-red-400 font-bold border border-red-500/50 flex items-center gap-1">
                                                    <AlertCircle size={10} /> {conflicts.length} Conflicts
                                                </div>
                                            </div>
                                        )}

                                        {/* SCHEDULED ITEMS */}
                                        {items.map(item => {
                                            const sData = sceneData.find(s => s.id === item.sceneId);
                                            // Check persistent conflicts for scheduled items
                                            const itemConflicts = getSlotConflicts(item.sceneId, slot.id);

                                            return (
                                                <div key={item.id} className="bg-zinc-800 border border-white/10 p-2 rounded h-full shadow-sm relative group/item overflow-hidden">
                                                    <div className="flex justify-between items-start">
                                                        <span className="text-[11px] font-bold text-white leading-tight">{sData?.name}</span>
                                                        <button 
                                                            onClick={() => setSchedule(prev => prev.filter(p => p.id !== item.id))}
                                                            className="text-zinc-500 hover:text-red-500 opacity-0 group-hover/item:opacity-100 transition-opacity"
                                                        >
                                                            <X size={12}/>
                                                        </button>
                                                    </div>
                                                    
                                                    {itemConflicts.length > 0 && (
                                                        <div className="mt-1 flex items-center gap-1 text-[9px] text-red-400 font-bold bg-red-950/50 px-1.5 py-0.5 rounded w-fit border border-red-900">
                                                            <AlertTriangle size={8} /> {itemConflicts[0].name}
                                                        </div>
                                                    )}
                                                    
                                                    <div className="absolute bottom-1 right-2 text-[9px] text-zinc-600 font-mono">
                                                        {sData?.size} ppl
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