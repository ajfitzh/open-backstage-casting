"use client";

import React, { useMemo, useState } from "react";
import { 
  AlertTriangle, 
  Check, 
  ChevronDown, 
  ChevronRight, 
  Search, 
  Calendar,
  XCircle
} from "lucide-react";

// --- TYPES (Based on your Schema) ---
interface Scene {
  id: number;
  name: string; // "Scene Name"
  act: string;  // "Act"
  roles: number[]; // Derived from "Blueprint Roles" or "Active Scenes" logic
}

interface Actor {
  id: number;
  name: string;
  conflicts: string[]; // Hydrated text from "Rehearsal Conflicts"
}

interface Assignment {
  roleId: number;
  actorId: number;
}

interface Props {
  scenes: any[];      // Raw Table 627
  roles: any[];       // Raw Table 605
  assignments: any[]; // Raw Table 603
  people: any[];      // Raw Table 599
}

export default function ConflictMatrix({ scenes, roles, assignments, people }: Props) {
  const [filterText, setFilterText] = useState("");
  const [showClear, setShowClear] = useState(true);

  // --- 1. DATA PREP & HYDRATION ---
  const processedData = useMemo(() => {
    // A. Map People to a Dictionary for O(1) lookup
    const actorMap = new Map<number, Actor>();
    people.forEach((p) => {
      // Handle the Link Row structure for conflicts
      const conflictRaw = p["Rehearsal Conflicts"];
      let conflictList: string[] = [];
      
      if (Array.isArray(conflictRaw)) {
        conflictList = conflictRaw.map((c: any) => c.value);
      }

      // Name Hydration Logic
      const name = p["Full Name"] || `Student ${p["Digital ID"]}`;
      
      actorMap.set(p.id, { id: p.id, name, conflicts: conflictList });
    });

    // B. Map Roles to Actors
    // We look at the ASSIGNMENTS table to see who plays what
    const roleActorMap = new Map<number, number[]>(); // RoleID -> [ActorID]
    
    assignments.forEach((a) => {
      const roleId = a["Performance Identity"]?.[0]?.id;
      const personId = a["Person"]?.[0]?.id;
      
      if (roleId && personId) {
        const current = roleActorMap.get(roleId) || [];
        if (!current.includes(personId)) {
          roleActorMap.set(roleId, [...current, personId]);
        }
      }
    });

    // C. Map Scenes to Actors (The "Who is in this scene?" logic)
    // Logic: Scene -> Linked Roles -> Assigned Actors
    const matrixRows = scenes
      .map((scene) => {
        const sceneName = scene["Scene Name"];
        // Check both directions: "Blueprint Roles" on Scene OR "Active Scenes" on Role
        // Assuming "Active Scenes" on Role is the source of truth based on your Casting Page code
        const rolesInScene = roles.filter((r) => {
          const activeScenes = r["Active Scenes"] || [];
          return activeScenes.some((s: any) => s.id === scene.id);
        });

        const actorsInScene = new Set<number>();
        rolesInScene.forEach((r) => {
          const actorIds = roleActorMap.get(r.id) || [];
          actorIds.forEach((id) => actorsInScene.add(id));
        });

        return {
          id: scene.id,
          name: sceneName,
          act: scene["Act"]?.value || "1",
          actors: Array.from(actorsInScene), // List of Actor IDs present
        };
      })
      .sort((a, b) => a.id - b.id); // Keep scenes in order

    // D. Get Unique Actors who are actually cast
    const uniqueActorIds = Array.from(new Set(matrixRows.flatMap((r) => r.actors)));
    const gridColumns = uniqueActorIds
      .map((id) => actorMap.get(id))
      .filter((a): a is Actor => !!a) // Remove undefined
      .sort((a, b) => a.name.localeCompare(b.name));

    return { rows: matrixRows, columns: gridColumns, actorMap };
  }, [scenes, roles, assignments, people]);

  const { rows, columns, actorMap } = processedData;

  // --- 2. FILTERING ---
  const visibleColumns = columns.filter(c => 
    c.name.toLowerCase().includes(filterText.toLowerCase())
  );

  return (
    <div className="flex flex-col h-full bg-zinc-950 text-white overflow-hidden">
      {/* HEADER BAR */}
      <div className="p-4 border-b border-white/10 bg-zinc-900 flex justify-between items-center shrink-0">
        <h2 className="text-lg font-black uppercase italic tracking-wider flex items-center gap-2">
          <Calendar className="text-red-500" /> Conflict Matrix
        </h2>
        
        <div className="flex items-center gap-4">
          <label className="flex items-center gap-2 text-xs font-bold uppercase text-zinc-400 cursor-pointer hover:text-white">
            <input 
              type="checkbox" 
              checked={showClear} 
              onChange={(e) => setShowClear(e.target.checked)}
              className="accent-blue-500"
            />
            Show Cleared Cells
          </label>
          
          <div className="relative">
            <Search size={14} className="absolute left-2 top-1/2 -translate-y-1/2 text-zinc-500" />
            <input 
              value={filterText}
              onChange={(e) => setFilterText(e.target.value)}
              placeholder="Filter Actors..." 
              className="bg-zinc-950 border border-white/10 rounded-lg pl-8 pr-3 py-1.5 text-xs text-white focus:border-blue-500 outline-none w-48 transition-all"
            />
          </div>
        </div>
      </div>

      {/* MATRIX CONTAINER */}
      <div className="flex-1 overflow-auto custom-scrollbar relative">
        <table className="w-full border-collapse">
          {/* TABLE HEAD: ACTORS */}
          <thead className="sticky top-0 z-20 bg-zinc-900 shadow-xl">
            <tr>
              <th className="sticky left-0 z-30 bg-zinc-900 border-b border-r border-white/10 p-4 min-w-[200px] text-left">
                <span className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">Scene / Actor</span>
              </th>
              {visibleColumns.map((actor) => (
                <th key={actor.id} className="p-2 border-b border-r border-white/10 min-w-[100px] w-[100px] align-bottom pb-4 relative group">
                  <div className="writing-vertical-lr rotate-180 text-xs font-bold text-zinc-300 uppercase tracking-wide whitespace-nowrap h-32 flex items-center">
                    {actor.name}
                  </div>
                  {/* Conflict Tooltip Header */}
                  {actor.conflicts.length > 0 && (
                    <div className="absolute top-2 left-1/2 -translate-x-1/2">
                      <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                    </div>
                  )}
                </th>
              ))}
            </tr>
          </thead>

          {/* TABLE BODY: SCENES */}
          <tbody className="divide-y divide-white/5">
            {rows.map((scene) => (
              <tr key={scene.id} className="hover:bg-white/5 transition-colors group/row">
                {/* SCENE NAME */}
                <td className="sticky left-0 z-10 bg-zinc-950 group-hover/row:bg-zinc-900 border-r border-white/10 p-3">
                  <div className="flex items-baseline justify-between">
                    <span className="text-xs font-bold text-white truncate max-w-[180px]" title={scene.name}>
                      {scene.name}
                    </span>
                    <span className="text-[9px] font-black text-zinc-600 uppercase ml-2">Act {scene.act}</span>
                  </div>
                </td>

                {/* CELLS */}
                {visibleColumns.map((actor) => {
                  const isInScene = scene.actors.includes(actor.id);
                  const hasConflicts = actor.conflicts.length > 0;
                  // Note: In a real app, you'd check if the conflict DATE matches the scene DATE.
                  // For now, per rules, we highlight IF they are in the scene AND have ANY conflicts listed.
                  
                  if (!isInScene) {
                    return <td key={actor.id} className="bg-black/40 border-r border-white/5"></td>;
                  }

                  if (hasConflicts) {
                    return (
                      <td key={actor.id} className="bg-red-900/20 border-r border-white/5 p-2 text-center relative group/cell cursor-help hover:bg-red-900/40 transition-colors">
                        <AlertTriangle size={16} className="text-red-500 mx-auto" />
                        <span className="text-[9px] font-bold text-red-400 mt-1 block">Conflict</span>
                        
                        {/* HOVER DETAILS */}
                        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-48 bg-black border border-red-500/50 p-3 rounded-xl shadow-2xl z-50 hidden group-hover/cell:block">
                          <p className="text-[10px] font-black uppercase text-red-500 mb-1">Conflicts Listed:</p>
                          <ul className="text-[10px] text-zinc-300 list-disc pl-3 space-y-1">
                            {actor.conflicts.map((c, i) => (
                              <li key={i}>{c}</li>
                            ))}
                          </ul>
                        </div>
                      </td>
                    );
                  }

                  return (
                    <td key={actor.id} className={`border-r border-white/5 p-2 text-center ${!showClear ? 'opacity-20' : ''}`}>
                      <div className="flex justify-center">
                        <Check size={16} className="text-emerald-500/50" />
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