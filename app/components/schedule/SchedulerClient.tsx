"use client";

import React, { useState, useMemo } from 'react';
import { Calendar, Clock, AlertTriangle, Check, Music, Move, Theater, Save, Wand2, X } from 'lucide-react';
import { createProductionEvent } from '@/app/lib/baserow'; // You'll need to create this

// --- TYPES ---
type RehearsalType = "Music" | "Dance" | "Blocking" | "Run";

interface TimeSlot {
  id: string;
  day: "Friday" | "Saturday";
  time: string; // "18:00", "19:00"
  label: string; // "6:00 PM"
  duration: number; // minutes
}

interface SchedulerProps {
  productionId: number;
  scenes: any[];
  roles: any[];
  assignments: any[];
  people: any[];
}

// --- CONFIG: THE "GOLDEN GRID" ---
const TIME_GRID: TimeSlot[] = [
  // Friday 6-9
  { id: 'fri-1', day: 'Friday', time: '18:00', label: '6:00 PM', duration: 60 },
  { id: 'fri-2', day: 'Friday', time: '19:00', label: '7:00 PM', duration: 60 },
  { id: 'fri-3', day: 'Friday', time: '20:00', label: '8:00 PM', duration: 60 },
  // Saturday 10-5 (with Lunch break logic implied or manual)
  { id: 'sat-1', day: 'Saturday', time: '10:00', label: '10:00 AM', duration: 60 },
  { id: 'sat-2', day: 'Saturday', time: '11:00', label: '11:00 AM', duration: 60 },
  { id: 'sat-3', day: 'Saturday', time: '12:00', label: '12:00 PM', duration: 60 },
  { id: 'sat-4', day: 'Saturday', time: '13:00', label: '1:00 PM (Lunch?)', duration: 60 },
  { id: 'sat-5', day: 'Saturday', time: '14:00', label: '2:00 PM', duration: 60 },
  { id: 'sat-6', day: 'Saturday', time: '15:00', label: '3:00 PM', duration: 60 },
  { id: 'sat-7', day: 'Saturday', time: '16:00', label: '4:00 PM', duration: 60 },
];

export default function SchedulerClient({ productionId, scenes, roles, assignments, people }: SchedulerProps) {
  
  // --- STATE ---
  // "ScheduledEvents" tracks which scenes are in which slot
  const [schedule, setSchedule] = useState<Record<string, { sceneId: number, type: RehearsalType }[]>>({});
  const [draggedScene, setDraggedScene] = useState<number | null>(null);
  const [selectedType, setSelectedType] = useState<RehearsalType>("Music");

  // --- 1. DATA PREP (The "Brain") ---
  const sceneData = useMemo(() => {
    // Map Scenes to Actors (Same logic as Conflicts Page)
    const roleActorMap = new Map<number, number[]>();
    assignments.forEach((a: any) => {
        const rId = a["Performance Identity"]?.[0]?.id;
        const pId = a["Person"]?.[0]?.id;
        if(rId && pId) {
            const curr = roleActorMap.get(rId) || [];
            if(!curr.includes(pId)) roleActorMap.set(rId, [...curr, pId]);
        }
    });

    const actorMap = new Map();
    people.forEach((p: any) => {
        // Simple conflict check: string contains day name? 
        // In real app, match dates. Here we match "Friday" or "Saturday" text in conflicts.
        const cRaw = p["Rehearsal Conflicts"];
        const conflictStr = Array.isArray(cRaw) ? cRaw.map((c:any)=>c.value).join(" ") : "";
        actorMap.set(p.id, { name: p["Full Name"], conflicts: conflictStr.toLowerCase() });
    });

    return scenes.map((s: any) => {
        const rolesInScene = roles.filter((r: any) => r["Active Scenes"]?.some((link:any) => link.id === s.id));
        const actorsInScene = new Set<number>();
        rolesInScene.forEach((r: any) => roleActorMap.get(r.id)?.forEach(id => actorsInScene.add(id)));
        
        return {
            id: s.id,
            name: s["Scene Name"],
            act: s["Act"]?.value,
            actorIds: Array.from(actorsInScene),
            people: Array.from(actorsInScene).map(id => actorMap.get(id))
        };
    }).sort((a,b) => a.id - b.id);
  }, [scenes, roles, assignments, people]);


  // --- 2. LOGIC: CHECK CONFLICTS ---
  const getConflictStatus = (sceneId: number, slotId: string) => {
      const slot = TIME_GRID.find(t => t.id === slotId);
      if(!slot) return { hasConflict: false, names: [] };

      const scene = sceneData.find(s => s.id === sceneId);
      if(!scene) return { hasConflict: false, names: [] };

      // Check every actor in this scene for a conflict matching the Day
      const conflicts: string[] = [];
      scene.people.forEach((p: any) => {
          if(p && p.conflicts.includes(slot.day.toLowerCase())) {
              // Real app: Check specific times. 
              // Prototype: If they have a "Friday" conflict, flag it.
              conflicts.push(p.name);
          }
      });

      return { hasConflict: conflicts.length > 0, names: conflicts };
  };


  // --- 3. HANDLERS ---
  const handleDrop = (e: React.DragEvent, slotId: string) => {
      e.preventDefault();
      const sceneId = parseInt(e.dataTransfer.getData("sceneId"));
      const type = e.dataTransfer.getData("type") as RehearsalType;
      
      setSchedule(prev => {
          const existing = prev[slotId] || [];
          return { ...prev, [slotId]: [...existing, { sceneId, type }] };
      });
      setDraggedScene(null);
  };

  const handleRemove = (slotId: string, index: number) => {
      setSchedule(prev => {
          const newSlotList = [...(prev[slotId] || [])];
          newSlotList.splice(index, 1);
          return { ...prev, [slotId]: newSlotList };
      });
  };

  const handleSave = async () => {
      if(!confirm("Publish this schedule to the database?")) return;
      // Here you would loop through 'schedule' state and call createProductionEvent
      alert("Schedule Saved! (Prototype)");
  };

  // --- 4. AUTO-FILL WEEKEND 1 ---
  const handleAutoFill = () => {
      if(!confirm("Auto-fill Week 1 Strategy?\n\n- Friday: Large Vocal Numbers\n- Saturday AM: Choreography\n- Saturday PM: Blocking Act 1")) return;
      
      const newSched: Record<string, { sceneId: number, type: RehearsalType }[]> = {};
      
      // Strategy: Find huge scenes (Most actors)
      const sortedBySize = [...sceneData].sort((a,b) => b.actorIds.length - a.actorIds.length);
      const top3Scenes = sortedBySize.slice(0, 3);

      // Friday Night: Music for Big Numbers
      newSched['fri-1'] = [{ sceneId: top3Scenes[0].id, type: 'Music' }];
      newSched['fri-2'] = [{ sceneId: top3Scenes[1].id, type: 'Music' }];
      newSched['fri-3'] = [{ sceneId: top3Scenes[2].id, type: 'Music' }];

      // Saturday Morning: Dance
      newSched['sat-1'] = [{ sceneId: top3Scenes[0].id, type: 'Dance' }];
      newSched['sat-2'] = [{ sceneId: top3Scenes[1].id, type: 'Dance' }];

      setSchedule(newSched);
  };

  // --- RENDER ---
  return (
    <div className="flex h-screen bg-zinc-950 text-white overflow-hidden">
        
        {/* LEFT: RESOURCE BANK */}
        <aside className="w-80 border-r border-white/10 flex flex-col bg-zinc-900">
            <div className="p-4 border-b border-white/10 shrink-0">
                <h2 className="text-sm font-black uppercase tracking-widest text-zinc-400">Resource Bank</h2>
                <div className="flex gap-2 mt-4 bg-zinc-950 p-1 rounded-lg border border-white/5">
                    {(['Music', 'Dance', 'Blocking', 'Run'] as const).map(t => (
                        <button 
                            key={t} 
                            onClick={() => setSelectedType(t)}
                            className={`flex-1 py-1.5 rounded text-[10px] font-bold uppercase transition-all ${selectedType === t ? 
                                (t === 'Music' ? 'bg-purple-600 text-white' : t === 'Dance' ? 'bg-emerald-600 text-white' : 'bg-blue-600 text-white') 
                                : 'text-zinc-500 hover:text-white'}`}
                        >
                            {t === 'Music' ? <Music size={12} className="mx-auto"/> : t === 'Dance' ? <Move size={12} className="mx-auto"/> : <Theater size={12} className="mx-auto"/>}
                        </button>
                    ))}
                </div>
                <div className="mt-2 text-center text-[10px] text-zinc-500">
                    Draggable Type: <strong className="text-white">{selectedType}</strong>
                </div>
            </div>
            
            <div className="flex-1 overflow-y-auto p-4 space-y-2 custom-scrollbar">
                {sceneData.map(scene => (
                    <div 
                        key={scene.id}
                        draggable
                        onDragStart={(e) => {
                            e.dataTransfer.setData("sceneId", scene.id.toString());
                            e.dataTransfer.setData("type", selectedType);
                            setDraggedScene(scene.id);
                        }}
                        onDragEnd={() => setDraggedScene(null)}
                        className="bg-zinc-950 border border-white/5 p-3 rounded-lg hover:border-zinc-500 cursor-grab active:cursor-grabbing group transition-colors"
                    >
                        <div className="flex justify-between items-start">
                            <span className="font-bold text-sm text-zinc-300 group-hover:text-white">{scene.name}</span>
                            <span className="text-[10px] bg-zinc-800 px-1.5 py-0.5 rounded text-zinc-500">Act {scene.act}</span>
                        </div>
                        <div className="mt-2 flex items-center gap-2 text-[10px] text-zinc-600">
                            <Clock size={10} /> <span>~15-30m</span>
                            <span className="text-zinc-700">|</span>
                            <span>{scene.actorIds.length} Actors</span>
                        </div>
                    </div>
                ))}
            </div>
        </aside>

        {/* MAIN: CALENDAR GRID */}
        <main className="flex-1 flex flex-col min-w-0 bg-zinc-950/50">
            <header className="h-14 border-b border-white/10 bg-zinc-900 flex items-center justify-between px-6 shrink-0">
                <div className="flex items-center gap-4">
                    <h1 className="text-lg font-black uppercase italic tracking-tighter">Wk 1 Scheduler</h1>
                    <span className="text-xs bg-zinc-800 text-zinc-400 px-2 py-1 rounded">Fri/Sat Template</span>
                </div>
                <div className="flex gap-2">
                    <button onClick={handleAutoFill} className="flex items-center gap-2 bg-purple-600/20 text-purple-400 border border-purple-500/50 hover:bg-purple-500 hover:text-white px-3 py-1.5 rounded text-[10px] font-black uppercase tracking-wider transition-all">
                        <Wand2 size={14} /> Auto-Fill Wk 1
                    </button>
                    <button onClick={handleSave} className="flex items-center gap-2 bg-blue-600 text-white px-3 py-1.5 rounded text-[10px] font-black uppercase tracking-wider shadow-lg hover:bg-blue-500">
                        <Save size={14} /> Publish Schedule
                    </button>
                </div>
            </header>

            <div className="flex-1 overflow-y-auto p-6">
                <div className="grid grid-cols-2 gap-6 max-w-5xl mx-auto h-full">
                    {/* COLUMNS: FRIDAY & SATURDAY */}
                    {['Friday', 'Saturday'].map(day => (
                        <div key={day} className="flex flex-col gap-2">
                            <h2 className="text-center font-black uppercase text-zinc-500 mb-2 tracking-widest">{day}</h2>
                            {TIME_GRID.filter(t => t.day === day).map(slot => {
                                // CALCULATE CONFLICT STATE FOR DRAGGED ITEM
                                const conflictCheck = draggedScene ? getConflictStatus(draggedScene, slot.id) : { hasConflict: false, names: [] };
                                const isDroppable = true; // Simplified

                                return (
                                    <div 
                                        key={slot.id}
                                        onDragOver={(e) => e.preventDefault()}
                                        onDrop={(e) => handleDrop(e, slot.id)}
                                        className={`
                                            min-h-[100px] border rounded-xl p-3 relative transition-all duration-300
                                            ${draggedScene && conflictCheck.hasConflict ? 'bg-red-900/10 border-red-500/50' : 
                                              draggedScene ? 'bg-emerald-900/10 border-emerald-500/50' : 
                                              'bg-zinc-900 border-white/5'}
                                        `}
                                    >
                                        <div className="absolute top-2 right-2 text-[10px] font-bold text-zinc-600">{slot.label}</div>
                                        
                                        {/* CONFLICT WARNING (While Dragging) */}
                                        {draggedScene && conflictCheck.hasConflict && (
                                            <div className="absolute inset-0 flex items-center justify-center bg-red-950/80 rounded-xl z-10 pointer-events-none">
                                                <div className="text-center">
                                                    <AlertTriangle className="mx-auto text-red-500 mb-1" />
                                                    <p className="text-[10px] font-bold text-red-300 uppercase">Conflict!</p>
                                                    <p className="text-[9px] text-red-400">{conflictCheck.names.slice(0,2).join(", ")}{conflictCheck.names.length > 2 && "..."}</p>
                                                </div>
                                            </div>
                                        )}

                                        {/* SCHEDULED ITEMS */}
                                        <div className="space-y-2 mt-4">
                                            {(schedule[slot.id] || []).map((item, idx) => {
                                                const sData = sceneData.find(s => s.id === item.sceneId);
                                                const typeColor = item.type === 'Music' ? 'text-purple-400 border-purple-500/30 bg-purple-500/10' : 
                                                                  item.type === 'Dance' ? 'text-emerald-400 border-emerald-500/30 bg-emerald-500/10' : 
                                                                  'text-blue-400 border-blue-500/30 bg-blue-500/10';
                                                
                                                // Check conflicts for ALREADY scheduled items
                                                const existingConflict = getConflictStatus(item.sceneId, slot.id);

                                                return (
                                                    <div key={idx} className={`flex justify-between items-center p-2 rounded border ${typeColor} relative group`}>
                                                        <div>
                                                            <div className="text-xs font-bold">{sData?.name}</div>
                                                            <div className="text-[9px] opacity-70 uppercase font-black">{item.type}</div>
                                                        </div>
                                                        
                                                        {existingConflict.hasConflict && (
                                                            <div className="bg-red-500 text-white text-[8px] font-black px-1.5 py-0.5 rounded uppercase flex items-center gap-1" title={existingConflict.names.join(", ")}>
                                                                <AlertTriangle size={8} /> Conflict
                                                            </div>
                                                        )}

                                                        <button 
                                                            onClick={() => handleRemove(slot.id, idx)}
                                                            className="absolute -top-1 -right-1 bg-zinc-900 text-zinc-500 rounded-full p-0.5 opacity-0 group-hover:opacity-100 hover:text-red-500 transition-opacity shadow-sm border border-white/10"
                                                        >
                                                            <X size={12}/>
                                                        </button>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                )
                            })}
                        </div>
                    ))}
                </div>
            </div>
        </main>
    </div>
  );
}