"use client";

import React, { useState, useMemo } from 'react';
import { Search, User, Calendar, X } from 'lucide-react';

// 🟢 FIX 2: Update the Interface to include 'actors'
interface Props {
  initialConflicts: any[];
  events: any[];
  showTitle: string;
  actors: { id: number; name: string }[]; // <--- ADD THIS LINE
}

export default function ConflictsClient({ initialConflicts, events, showTitle, actors }: Props) {
  
  const [selectedActorId, setSelectedActorId] = useState<number | null>(null);
  const [filterType, setFilterType] = useState<string>('all');

  // Filter Logic
  const filteredConflicts = useMemo(() => {
    return initialConflicts.filter(c => {
      const matchesActor = selectedActorId ? c.personId === selectedActorId : true;
      const matchesType = filterType === 'all' ? true : c.type.toLowerCase() === filterType.toLowerCase();
      return matchesActor && matchesType;
    });
  }, [initialConflicts, selectedActorId, filterType]);

  return (
    <div className="flex h-full">
      
      {/* SIDEBAR FILTERS */}
      <div className="w-64 border-r border-white/10 bg-zinc-900/30 overflow-y-auto custom-scrollbar p-4 space-y-8">
         
         {/* Type Filters */}
         <div>
            <h3 className="text-xs font-black text-zinc-500 uppercase tracking-widest mb-3">Conflict Type</h3>
            <div className="space-y-1">
                {['All', 'Absent', 'Late', 'Leave Early'].map(type => (
                    <button
                        key={type}
                        onClick={() => setFilterType(type.toLowerCase())}
                        className={`w-full text-left px-3 py-2 rounded text-xs font-bold transition-colors ${filterType === type.toLowerCase() ? 'bg-blue-600 text-white' : 'text-zinc-400 hover:bg-white/5'}`}
                    >
                        {type}
                    </button>
                ))}
            </div>
         </div>

         {/* Actor Filters */}
         <div>
            <div className="flex justify-between items-center mb-3">
                <h3 className="text-xs font-black text-zinc-500 uppercase tracking-widest">Filter by Actor</h3>
                {selectedActorId && (
                    <button onClick={() => setSelectedActorId(null)} className="text-[10px] text-blue-400 hover:text-blue-300">
                        Clear
                    </button>
                )}
            </div>
            
            <div className="space-y-1">
                {/* 🟢 USE THE NEW ACTORS PROP HERE */}
                {actors.map(actor => (
                    <button
                        key={actor.id}
                        onClick={() => setSelectedActorId(actor.id)}
                        className={`w-full text-left px-3 py-1.5 rounded text-xs transition-colors flex items-center gap-2 ${selectedActorId === actor.id ? 'bg-zinc-800 text-white border border-white/10' : 'text-zinc-500 hover:text-zinc-300'}`}
                    >
                        <User size={12} />
                        <span className="truncate">{actor.name}</span>
                    </button>
                ))}
            </div>
         </div>

      </div>

      {/* MAIN CONTENT AREA (The List) */}
      <div className="flex-1 overflow-y-auto custom-scrollbar p-8">
          {/* ... (Keep your existing Conflict List rendering code here) ... */}
          <div className="grid grid-cols-1 gap-4">
             {filteredConflicts.map(c => (
                 <div key={c.id} className="bg-zinc-900 border border-white/5 p-4 rounded-lg flex justify-between items-center">
                    <div className="flex items-center gap-4">
                        <div className={`w-2 h-12 rounded-full ${c.type === 'Absent' ? 'bg-red-500' : 'bg-amber-500'}`} />
                        <div>
                            <div className="font-bold text-white">{c.personName}</div>
                            <div className="text-xs text-zinc-400">{c.date} • {c.type}</div>
                        </div>
                    </div>
                    <div className="text-sm text-zinc-500 max-w-xs text-right truncate">
                        {c.notes || "No notes"}
                    </div>
                 </div>
             ))}
             
             {filteredConflicts.length === 0 && (
                <div className="text-center py-20 text-zinc-500">
                    No conflicts match these filters.
                </div>
             )}
          </div>
      </div>
    </div>
  );
}