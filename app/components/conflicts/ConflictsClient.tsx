"use client";

import React, { useState, useMemo } from 'react';
import { User, X, Calendar } from 'lucide-react';
import ConflictAnalysisDashboard from './ConflictAnalysisDashboard'; // 🟢 Import the dashboard!

// Define exactly what we expect from the BaserowClient
interface Conflict {
  id: number;
  personId: number | null;
  personName: string;
  eventId: number | null; // Needed for the dashboard
  date: string;
  type: string;
  notes: string;
}

interface Actor {
  id: number;
  name: string;
}

interface Props {
  initialConflicts: Conflict[];
  events: any[]; // 🟢 Added events prop for the dashboard
  showTitle: string;
  actors: Actor[]; 
}

export default function ConflictsClient({ initialConflicts, events, showTitle, actors }: Props) {
  
  const [selectedActorId, setSelectedActorId] = useState<number | null>(null);
  const [filterType, setFilterType] = useState<string>('all');

  // Filter Logic
  const filteredConflicts = useMemo(() => {
    return initialConflicts.filter(c => {
      const matchesActor = selectedActorId ? c.personId === selectedActorId : true;
      const matchesType = filterType === 'all' ? true : (c.type || "").toLowerCase() === filterType.toLowerCase();
      return matchesActor && matchesType;
    });
  }, [initialConflicts, selectedActorId, filterType]);

  return (
    <div className="flex h-full pb-16">
      
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
                        className={`w-full text-left px-3 py-2 rounded text-xs font-bold transition-colors ${filterType === type.toLowerCase() ? 'bg-blue-600 text-white shadow-lg' : 'text-zinc-400 hover:bg-white/5'}`}
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
                    <button onClick={() => setSelectedActorId(null)} className="text-[10px] text-blue-400 hover:text-blue-300 flex items-center gap-1">
                        <X size={10} /> Clear
                    </button>
                )}
            </div>
            
            <div className="space-y-1">
                {actors.map(actor => (
                    <button
                        key={actor.id}
                        onClick={() => setSelectedActorId(actor.id)}
                        className={`w-full text-left px-3 py-1.5 rounded text-xs transition-colors flex items-center gap-2 ${selectedActorId === actor.id ? 'bg-zinc-800 text-white border border-white/10 shadow-lg' : 'text-zinc-500 hover:text-zinc-300 hover:bg-white/5'}`}
                    >
                        <User size={12} />
                        <span className="truncate">{actor.name}</span>
                    </button>
                ))}
            </div>
         </div>
      </div>

      {/* MAIN CONTENT AREA */}
      <div className="flex-1 overflow-y-auto custom-scrollbar p-8">
          <div className="max-w-4xl mx-auto">
             
             {/* 🟢 THE HEATMAP DASHBOARD */}
             <ConflictAnalysisDashboard 
                conflicts={filteredConflicts} 
                events={events} 
                castSize={actors.length} 
             />

             {/* THE LIST */}
             <div className="grid grid-cols-1 gap-4 mt-6">
                 {filteredConflicts.map(c => (
                     <div key={c.id} className="bg-zinc-900 border border-white/5 p-4 rounded-lg flex justify-between items-center hover:bg-zinc-800 transition-colors shadow-sm">
                        <div className="flex items-center gap-4">
                            <div className={`w-2 h-12 rounded-full ${c.type === 'Absent' ? 'bg-red-500 shadow-[0_0_10px_rgba(239,68,68,0.5)]' : 'bg-amber-500 shadow-[0_0_10px_rgba(245,158,11,0.5)]'}`} />
                            <div>
                                <div className="font-bold text-white">{c.personName}</div>
                                <div className="text-xs text-zinc-400">{c.date || "Unknown Date"} • {c.type || "Full"}</div>
                            </div>
                        </div>
                        <div className="text-sm text-zinc-500 max-w-xs text-right truncate" title={c.notes || "No notes provided"}>
                            {c.notes || <span className="italic opacity-50">No notes provided</span>}
                        </div>
                     </div>
                 ))}
                 
                 {filteredConflicts.length === 0 && (
                    <div className="text-center py-20 border border-dashed border-white/10 rounded-xl bg-zinc-900/20">
                        <Calendar className="mx-auto h-10 w-10 text-zinc-600 mb-3" />
                        <h3 className="text-lg font-bold text-zinc-300">No conflicts found</h3>
                        <p className="text-xs text-zinc-500 mt-1">No conflicts match the current filters.</p>
                    </div>
                 )}
             </div>
          </div>
      </div>
    </div>
  );
}
