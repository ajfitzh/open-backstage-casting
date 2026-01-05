/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import React, { useState, useEffect } from 'react';
import { 
  Users, Plus, Trash2, Copy, Save,
  Search, ArrowLeft, MoreHorizontal,
  Check, X
} from 'lucide-react';

// --- CONFIG ---
const TOTAL_SCENES = 20; // Configurable: How many scenes in your show?

// --- TYPES ---
type SceneType = 'scene' | 'song' | 'dance' | null;

interface Role {
  id: string;
  name: string;
  // Map: Key = Scene Number (1-20), Value = Type
  scenes: Record<number, SceneType>; 
}

// --- DEMO DATA (Replace with DB Load) ---
const INITIAL_ROLES: Role[] = [
  { 
    id: '1', name: 'Ariel', 
    scenes: { 1: 'scene', 2: 'song', 5: 'scene', 14: 'dance' } 
  },
  { 
    id: '2', name: 'Prince Eric', 
    scenes: { 3: 'scene', 5: 'song', 8: 'scene' } 
  },
  { 
    id: '3', name: 'Sebastian', 
    scenes: { 1: 'scene', 2: 'song', 3: 'dance', 4: 'song' } 
  },
  { 
    id: '4', name: 'Ursula', 
    scenes: { 10: 'song', 11: 'scene', 18: 'dance' } 
  },
];

// --- COMPONENT: THE CHICLET ROW ---
const CastingRow = ({ 
    role, 
    onUpdate, 
    onDelete, 
    onCopy 
}: { 
    role: Role, 
    onUpdate: (id: string, sceneNum: number, type: SceneType) => void,
    onDelete: () => void,
    onCopy: () => void
}) => {
    
    // Cycle: Null -> Scene (Green) -> Song (Blue) -> Dance (Purple) -> Null
    const cycleType = (current: SceneType): SceneType => {
        if (!current) return 'scene';
        if (current === 'scene') return 'song';
        if (current === 'song') return 'dance';
        return null;
    };

    return (
        <div className="bg-zinc-900 border border-white/5 rounded-xl p-3 mb-3 flex flex-col gap-3 shadow-sm">
            {/* ROW HEADER */}
            <div className="flex justify-between items-center">
                <input 
                    className="bg-transparent text-sm font-black uppercase text-white tracking-wide outline-none placeholder:text-zinc-600 w-full"
                    value={role.name}
                    placeholder="ROLE NAME..."
                    onChange={(e) => {
                        // In a real app, you'd hoist this name change up too
                        // onUpdateName(role.id, e.target.value)
                    }}
                />
                <div className="flex gap-2 shrink-0">
                    <button onClick={onCopy} className="p-1.5 text-zinc-500 hover:text-white bg-zinc-800 rounded-lg transition-colors">
                        <Copy size={14} />
                    </button>
                    <button onClick={onDelete} className="p-1.5 text-zinc-500 hover:text-red-500 bg-zinc-800 rounded-lg transition-colors">
                        <Trash2 size={14} />
                    </button>
                </div>
            </div>

            {/* CHICLET STRIP (Scrollable) */}
            <div className="w-full overflow-x-auto custom-scrollbar pb-2 -mx-1 px-1">
                <div className="flex gap-1.5 min-w-max">
                    {Array.from({ length: TOTAL_SCENES }).map((_, i) => {
                        const num = i + 1;
                        const type = role.scenes[num];
                        return (
                            <button
                                key={num}
                                onClick={() => onUpdate(role.id, num, cycleType(type))}
                                className="flex flex-col items-center gap-1 group"
                            >
                                {/* Number Label (Locked to block) */}
                                <span className={`text-[9px] font-bold ${type ? 'text-white' : 'text-zinc-600 group-hover:text-zinc-400'}`}>
                                    {num}
                                </span>
                                
                                {/* The Block */}
                                <div className={`
                                    w-8 h-10 rounded-md border flex items-center justify-center transition-all relative overflow-hidden
                                    ${type === 'scene' ? 'bg-emerald-900/20 border-emerald-500/50' : 
                                      type === 'song' ? 'bg-blue-900/20 border-blue-500/50' : 
                                      type === 'dance' ? 'bg-purple-900/20 border-purple-500/50' : 
                                      'bg-zinc-950 border-white/5 hover:border-white/20'}
                                `}>
                                    {/* Fill Indicator */}
                                    {type && (
                                        <div className={`absolute inset-0 opacity-40 ${
                                            type === 'scene' ? 'bg-emerald-500' : 
                                            type === 'song' ? 'bg-blue-500' : 
                                            'bg-purple-500'
                                        }`} />
                                    )}
                                </div>
                            </button>
                        );
                    })}
                </div>
            </div>
        </div>
    );
};

// --- MAIN PAGE ---
export default function CastingPage() {
  const [roles, setRoles] = useState<Role[]>(INITIAL_ROLES);
  const [loading, setLoading] = useState(false);

  // --- ACTIONS ---
  const handleUpdateScene = (roleId: string, sceneNum: number, newType: SceneType) => {
      setRoles(prev => prev.map(r => {
          if (r.id !== roleId) return r;
          const newScenes = { ...r.scenes };
          if (newType === null) delete newScenes[sceneNum];
          else newScenes[sceneNum] = newType;
          return { ...r, scenes: newScenes };
      }));
  };

  const handleAddRole = () => {
      const name = prompt("Role Name:");
      if (!name) return;
      const newRole: Role = {
          id: Date.now().toString(),
          name,
          scenes: {}
      };
      setRoles(prev => [newRole, ...prev]);
  };

  const handleDeleteRole = (id: string) => {
      if(confirm("Delete this role?")) {
          setRoles(prev => prev.filter(r => r.id !== id));
      }
  };

  const handleCopyRole = (role: Role) => {
      const copy: Role = {
          ...role,
          id: Date.now().toString(),
          name: `${role.name} (Copy)`
      };
      setRoles(prev => [copy, ...prev]);
  };

  return (
    <div className="h-screen bg-zinc-950 text-white flex flex-col font-sans">
        
        {/* HEADER */}
        <header className="h-16 border-b border-white/10 bg-zinc-900/50 flex items-center justify-between px-4 shrink-0 backdrop-blur-md sticky top-0 z-10">
            <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
                    <Users size={18} className="text-white" />
                </div>
                <h1 className="text-lg font-black uppercase italic tracking-tighter">Casting Plot</h1>
            </div>
            <button 
                onClick={handleAddRole}
                className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center text-white hover:bg-blue-500 shadow-lg shadow-blue-900/20"
            >
                <Plus size={18} />
            </button>
        </header>

        {/* LEGEND BAR */}
        <div className="bg-zinc-900/80 border-b border-white/5 py-2 px-4 flex justify-center gap-6 shrink-0 sticky top-16 z-10 backdrop-blur-sm">
            <div className="flex items-center gap-1.5">
                <div className="w-3 h-3 rounded bg-emerald-500/40 border border-emerald-500"></div>
                <span className="text-[10px] font-bold uppercase text-zinc-400">Scene</span>
            </div>
            <div className="flex items-center gap-1.5">
                <div className="w-3 h-3 rounded bg-blue-500/40 border border-blue-500"></div>
                <span className="text-[10px] font-bold uppercase text-zinc-400">Song</span>
            </div>
            <div className="flex items-center gap-1.5">
                <div className="w-3 h-3 rounded bg-purple-500/40 border border-purple-500"></div>
                <span className="text-[10px] font-bold uppercase text-zinc-400">Dance</span>
            </div>
        </div>

        {/* GRID AREA */}
        <div className="flex-1 overflow-y-auto p-4 custom-scrollbar pb-24">
            {roles.map(role => (
                <CastingRow 
                    key={role.id}
                    role={role}
                    onUpdate={handleUpdateScene}
                    onDelete={() => handleDeleteRole(role.id)}
                    onCopy={() => handleCopyRole(role)}
                />
            ))}
            
            <button 
                onClick={handleAddRole}
                className="w-full py-4 border-2 border-dashed border-zinc-800 rounded-xl text-zinc-600 font-bold uppercase text-xs hover:bg-zinc-900 hover:border-zinc-700 transition-all flex items-center justify-center gap-2"
            >
                <Plus size={14} /> Add Role
            </button>
        </div>

    </div>
  );
}
