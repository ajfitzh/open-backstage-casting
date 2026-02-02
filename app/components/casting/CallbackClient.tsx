"use client";

import React, { useState, useMemo } from 'react';
import { Users, Clock, Plus, Trash2, LayoutGrid, CheckCircle2 } from 'lucide-react';

export default function CallbackManager({ initialAuditionees, productionTitle }: any) {
  // We keep the "Slots" in local state since they aren't in the DB
  const [slots, setSlots] = useState([
    { id: 'dance-1', time: '10:00 AM', title: 'General Dance Call', type: 'Movement' },
    { id: 'vocals-1', time: '1:00 PM', title: 'Lead Vocals', type: 'Singing' }
  ]);

  // Local assignments (PerformerID -> SlotID)
  const [localAssignments, setLocalAssignments] = useState<Record<number, string>>({});

  const bench = useMemo(() => {
    return initialAuditionees.filter((p: any) => !localAssignments[p.id]);
  }, [initialAuditionees, localAssignments]);

  const handleDragOver = (e: React.DragEvent) => e.preventDefault();
  
  const handleDrop = (slotId: string, performerId: number) => {
    setLocalAssignments(prev => ({ ...prev, [performerId]: slotId }));
  };

  return (
    <div className="flex h-screen bg-black text-white">
      {/* SIDEBAR: BENCH */}
      <aside className="w-80 border-r border-white/10 flex flex-col bg-zinc-950">
        <div className="p-6 border-b border-white/10 bg-zinc-900/20">
          <h2 className="text-xs font-black uppercase tracking-widest text-zinc-500">Audition Pool</h2>
          <div className="text-2xl font-black italic uppercase tracking-tighter">{bench.length} Remaining</div>
        </div>
        <div className="flex-1 overflow-y-auto p-4 space-y-2">
          {bench.map((p: any) => (
            <div 
              key={p.id} 
              draggable 
              onDragStart={(e) => e.dataTransfer.setData("performerId", p.id.toString())}
              className="bg-zinc-900 border border-white/5 p-3 rounded-xl flex items-center gap-3 cursor-grab hover:bg-zinc-800 transition-colors"
            >
               <img alt="headshot" src={p.headshot} className="w-8 h-8 rounded-full object-cover border border-white/10" />
               <div className="text-xs font-bold truncate">{p.name}</div>
            </div>
          ))}
        </div>
      </aside>

      {/* MAIN: SLOTS */}
      <main className="flex-1 flex flex-col p-8 overflow-x-auto">
        <div className="flex gap-6 items-start h-full">
          {slots.map(slot => {
            const assigned = initialAuditionees.filter((p: any) => localAssignments[p.id] === slot.id);
            return (
              <div 
                key={slot.id} 
                onDragOver={handleDragOver}
                onDrop={(e) => handleDrop(slot.id, parseInt(e.dataTransfer.getData("performerId")))}
                className="w-80 shrink-0 bg-zinc-900/50 border border-white/5 rounded-[2rem] flex flex-col max-h-full"
              >
                <div className="p-6 border-b border-white/10">
                    <span className="text-[10px] font-black bg-blue-500/10 text-blue-400 px-2 py-1 rounded mb-2 block w-fit">{slot.time}</span>
                    <h3 className="text-lg font-black uppercase italic tracking-tight">{slot.title}</h3>
                </div>
                <div className="p-4 space-y-2 overflow-y-auto flex-1">
                    {assigned.map((p: any) => (
                        <div key={p.id} className="flex items-center gap-3 bg-zinc-950 p-2 rounded-xl border border-white/5 group">
                            <img alt="headshot" src={p.headshot} className="w-6 h-6 rounded-full object-cover" />
                            <span className="text-xs font-bold flex-1">{p.name}</span>
                            <button onClick={() => {
                                const n = {...localAssignments};
                                delete n[p.id];
                                setLocalAssignments(n);
                            }} className="opacity-0 group-hover:opacity-100 text-zinc-600 hover:text-red-500"><Trash2 size={12}/></button>
                        </div>
                    ))}
                    <div className="h-20 border-2 border-dashed border-zinc-800 rounded-2xl flex items-center justify-center text-zinc-700 text-[10px] font-black uppercase">Drop Here</div>
                </div>
              </div>
            )
          })}
          <button onClick={() => setSlots([...slots, { id: Date.now().toString(), time: 'TBD', title: 'New Call', type: 'General' }])} className="w-80 shrink-0 h-20 border-2 border-dashed border-zinc-900 rounded-[2rem] flex items-center justify-center text-zinc-600 hover:text-white hover:border-zinc-700 transition-all uppercase font-black text-xs gap-2">
            <Plus size={16}/> Add Call Slot
          </button>
        </div>
      </main>
    </div>
  );
}