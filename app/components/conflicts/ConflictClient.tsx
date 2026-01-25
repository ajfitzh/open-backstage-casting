"use client";

import React, { useMemo, useState } from "react";
import { 
  AlertTriangle, 
  Check, 
  Search, 
  Calendar,
  Filter
} from "lucide-react";
import ConflictAnalysisDashboard from './ConflictAnalysisDashboard';

interface Props {
  scenes: any[];      
  roles: any[];       
  assignments: any[]; 
  people: any[];
  conflictRows: any[]; // Table 623 Data
  productionTitle: string;      
}

export default function ConflictClient({ 
  scenes, 
  roles, 
  assignments, 
  people, 
  conflictRows = [], 
  productionTitle 
}: Props) {
  const [filterText, setFilterText] = useState("");
  const [showClear, setShowClear] = useState(true);

  // --- DATA PROCESSING ---
  const processedData = useMemo(() => {
    
    // 1. Build Conflict Map (Person ID -> Array of Conflict Strings)
    // We use the raw Conflict Table (623) because the People Table only contains IDs.
    const conflictMap = new Map<number, string[]>();
    
    conflictRows.forEach((row: any) => {
        const personId = row["Person"]?.[0]?.id;
        if (personId) {
            const type = row["Conflict Type"]?.value || "Conflict";
            const notes = row["Notes"] || "";
            // Format dates if they exist
            const dateStr = row["Date"] ? row["Date"].map((d: any) => {
                const date = new Date(d.value);
                return date.toLocaleDateString('en-US', { month: 'numeric', day: 'numeric' });
            }).join(", ") : "";
            
            const label = `${type}${dateStr ? ` (${dateStr})` : ''}${notes ? `: ${notes}` : ''}`;
            
            const current = conflictMap.get(personId) || [];
            conflictMap.set(personId, [...current, label]);
        }
    });

    // 2. Map People & Attach Conflicts
    const actorMap = new Map();
    people.forEach((p: any) => {
      const name = p["Full Name"] || p["Name"] || `Student ${p.id}`;
      // Grab conflicts from our map, default to empty array
      const conflicts = conflictMap.get(p.id) || [];
      actorMap.set(p.id, { id: p.id, name, conflicts });
    });

    // 3. Map Roles -> Actors (Who plays who?)
    const roleActorMap = new Map<number, number[]>(); 
    assignments.forEach((a: any) => {
      const roleId = a["Performance Identity"]?.[0]?.id;
      const personId = a["Person"]?.[0]?.id;
      if (roleId && personId) {
        const current = roleActorMap.get(roleId) || [];
        if (!current.includes(personId)) roleActorMap.set(roleId, [...current, personId]);
      }
    });

    // 4. Map Scenes -> Actors (Who is in this scene?)
    const matrixRows = scenes.map((scene: any) => {
        // Find Roles linked to this scene
        const rolesInScene = roles.filter((r: any) => {
          const activeScenes = r["Active Scenes"] || [];
          return activeScenes.some((s: any) => s.id === scene.id);
        });

        // Find Actors assigned to those roles
        const actorsInScene = new Set<number>();
        rolesInScene.forEach((r: any) => {
          const actorIds = roleActorMap.get(r.id) || [];
          actorIds.forEach((id) => actorsInScene.add(id));
        });

        const actorArray = Array.from(actorsInScene);

        return {
          id: scene.id,
          name: scene["Scene Name"] || `Scene ${scene.id}`,
          act: scene["Act"]?.value || "1",
          actors: actorArray,
          // We pass 'roles' (actually actor objects) for the dashboard to calculate load
          roles: actorArray // legacy naming for the dashboard logic if needed
        };
      }).sort((a: any, b: any) => a.id - b.id);

    // 5. Get Unique Cast List (Columns)
    const uniqueActorIds = Array.from(new Set(matrixRows.flatMap((r: any) => r.actors)));
    const gridColumns = uniqueActorIds
      .map((id) => actorMap.get(id))
      .filter(Boolean)
      .sort((a: any, b: any) => a.name.localeCompare(b.name));

    return { rows: matrixRows, columns: gridColumns };
  }, [scenes, roles, assignments, people, conflictRows]);

  const { rows, columns } = processedData;
  const visibleColumns = columns.filter((c: any) => c.name.toLowerCase().includes(filterText.toLowerCase()));

  return (
    <div className="flex flex-col h-screen bg-zinc-950 text-white overflow-hidden font-sans">
      
      {/* HEADER */}
      <div className="p-4 border-b border-white/10 bg-zinc-900 flex justify-between items-center shrink-0 h-14 z-40 relative shadow-md">
        <div className="flex items-center gap-4">
            <h2 className="text-lg font-black uppercase italic tracking-wider flex items-center gap-2">
            <Calendar className="text-red-500" /> Conflict Matrix
            </h2>
            <div className="h-6 w-px bg-white/10"></div>
            <span className="text-xs font-bold text-zinc-500 uppercase tracking-widest">{productionTitle}</span>
        </div>
        
        <div className="flex items-center gap-4">
          <label className="flex items-center gap-2 text-xs font-bold uppercase text-zinc-400 cursor-pointer hover:text-white select-none">
            <input 
              type="checkbox" 
              checked={showClear} 
              onChange={(e) => setShowClear(e.target.checked)}
              className="accent-blue-500 w-4 h-4 rounded cursor-pointer"
            />
            Show Cleared
          </label>
          
          <div className="relative">
            <Search size={14} className="absolute left-2 top-1/2 -translate-y-1/2 text-zinc-500" />
            <input 
              value={filterText}
              onChange={(e) => setFilterText(e.target.value)}
              placeholder="Filter Actors..." 
              className="bg-zinc-950 border border-white/10 rounded-lg pl-8 pr-3 py-1.5 text-xs text-white focus:border-blue-500 outline-none w-48 transition-all placeholder:text-zinc-600"
            />
          </div>
        </div>
      </div>

      {/* SCROLLABLE CONTENT */}
      <div className="flex-1 overflow-auto custom-scrollbar relative bg-zinc-950 flex flex-col">
        
        {/* 📊 ANALYTICS DASHBOARD (New Integration) */}
        <div className="p-4 bg-zinc-950 border-b border-white/5">
            <ConflictAnalysisDashboard 
                scenes={rows}
                assignments={assignments}
                people={people}
                conflictRows={conflictRows}
            />
        </div>

        {/* 📉 THE MATRIX */}
        <table className="w-full border-collapse">
          <thead className="sticky top-0 z-20 bg-zinc-900 shadow-xl border-b border-white/10">
            <tr>
              <th className="sticky left-0 z-30 bg-zinc-900 border-r border-white/10 p-4 min-w-[200px] text-left shadow-[2px_0_5px_rgba(0,0,0,0.5)]">
                <span className="text-[10px] font-black text-zinc-500 uppercase tracking-widest block mb-1">Row: Scene</span>
                <span className="text-[10px] font-black text-blue-500 uppercase tracking-widest block">Col: Actor</span>
              </th>
              {visibleColumns.map((actor: any) => (
                <th key={actor.id} className="p-2 border-r border-white/10 min-w-[40px] w-[40px] relative group hover:bg-zinc-800 transition-colors align-bottom pb-4">
                  <div className="h-32 flex items-end justify-center">
                      <div className="writing-vertical-lr -rotate-180 text-[10px] font-bold text-zinc-400 uppercase tracking-wider whitespace-nowrap group-hover:text-white transition-colors">
                        {actor.name}
                      </div>
                  </div>
                  {actor.conflicts.length > 0 && (
                    <div className="absolute bottom-1 left-1/2 -translate-x-1/2">
                      <div className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse shadow-[0_0_8px_rgba(239,68,68,0.8)]" title="Has Conflicts" />
                    </div>
                  )}
                </th>
              ))}
            </tr>
          </thead>

          <tbody className="divide-y divide-white/5">
            {rows.map((scene: any) => (
              <tr key={scene.id} className="hover:bg-white/5 transition-colors group/row">
                {/* SCENE HEADER */}
                <td className="sticky left-0 z-10 bg-zinc-950 group-hover/row:bg-zinc-900 border-r border-white/10 p-3 shadow-[2px_0_5px_rgba(0,0,0,0.5)]">
                  <div className="flex flex-col">
                    <span className="text-xs font-bold text-white truncate max-w-[180px]" title={scene.name}>
                      {scene.name}
                    </span>
                    <div className="flex justify-between items-center mt-1">
                        <span className="text-[9px] font-black text-zinc-600 uppercase">Act {scene.act}</span>
                        <span className="text-[9px] font-mono text-zinc-500 bg-zinc-900 px-1.5 rounded border border-white/5">{scene.actors.length}</span>
                    </div>
                  </div>
                </td>

                {/* CELLS */}
                {visibleColumns.map((actor: any) => {
                  const isInScene = scene.actors.includes(actor.id);
                  const hasConflicts = actor.conflicts.length > 0;
                  
                  if (!isInScene) {
                    return <td key={actor.id} className="bg-black/40 border-r border-white/5"></td>;
                  }

                  if (hasConflicts) {
                    return (
                      <td key={actor.id} className="bg-red-900/10 border-r border-white/5 p-0 relative group/cell cursor-help hover:bg-red-900/30 transition-colors h-full">
                        <div className="w-full h-full flex items-center justify-center py-3">
                            <AlertTriangle size={14} className="text-red-500 opacity-80" />
                        </div>
                        
                        {/* HOVER TOOLTIP */}
                        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-64 bg-zinc-950 border border-red-500/50 p-3 rounded-xl shadow-2xl z-50 hidden group-hover/cell:block pointer-events-none">
                          <div className="flex justify-between items-center border-b border-red-500/20 pb-2 mb-2">
                             <span className="text-[10px] font-black uppercase text-red-500">{actor.name}</span>
                             <span className="text-[9px] bg-red-900/30 text-red-400 px-1.5 py-0.5 rounded border border-red-500/30">{actor.conflicts.length} Conflicts</span>
                          </div>
                          <ul className="space-y-1.5 max-h-40 overflow-y-auto custom-scrollbar">
                            {actor.conflicts.map((c: string, i: number) => (
                              <li key={i} className="text-[10px] text-zinc-300 flex items-start gap-2">
                                <span className="mt-1 w-1 h-1 rounded-full bg-red-500 shrink-0"/>
                                <span className="leading-tight">{c}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      </td>
                    );
                  }

                  return (
                    <td key={actor.id} className={`border-r border-white/5 p-0 text-center ${!showClear ? 'opacity-10' : ''}`}>
                      <div className="w-full h-full flex items-center justify-center py-3">
                        <Check size={14} className="text-emerald-500/30" />
                      </div>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}