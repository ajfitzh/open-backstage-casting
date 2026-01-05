/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import React, { useState } from 'react';
import { 
  Users, Plus, Trash2, Copy, Search,
  User, X, CheckCircle2, ChevronRight
} from 'lucide-react';

// --- CONFIG ---
const TOTAL_SCENES = 20;

// --- TYPES ---
type SceneType = 'scene' | 'song' | 'dance' | null;

interface Role {
  id: string;
  name: string;
  scenes: Record<number, SceneType>;
  assignedStudentId?: number; // NEW: Track the actor!
}

interface Student {
    id: number;
    name: string;
    avatar: string;
}

// --- DEMO DATA ---
const DEMO_STUDENTS: Student[] = [
    { id: 101, name: "Jane Doe", avatar: "https://cdn.pixabay.com/photo/2014/04/12/14/59/portrait-322470_1280.jpg" },
    { id: 102, name: "John Smith", avatar: "https://cdn.pixabay.com/photo/2015/01/08/18/29/entrepreneur-593358_1280.jpg" },
    { id: 103, name: "Sarah Connor", avatar: "https://cdn.pixabay.com/photo/2016/11/29/06/46/adult-1867813_1280.jpg" },
    { id: 104, name: "Michael Bay", avatar: "https://cdn.pixabay.com/photo/2016/11/21/14/53/man-1845814_1280.jpg" },
];

const INITIAL_ROLES: Role[] = [
  { id: '1', name: 'Ariel', scenes: { 1: 'scene', 2: 'song', 5: 'scene', 14: 'dance' }, assignedStudentId: 101 },
  { id: '2', name: 'Prince Eric', scenes: { 3: 'scene', 5: 'song', 8: 'scene' } }, // Uncast
  { id: '3', name: 'Sebastian', scenes: { 1: 'scene', 2: 'song', 3: 'dance', 4: 'song' }, assignedStudentId: 104 },
  { id: '4', name: 'Ursula', scenes: { 10: 'song', 11: 'scene', 18: 'dance' } },
];

// --- COMPONENT: CASTING MODAL ---
const CastingModal = ({ 
    roleName, 
    students, 
    onSelect, 
    onClose 
}: { 
    roleName: string, 
    students: Student[], 
    onSelect: (studentId: number) => void, 
    onClose: () => void 
}) => {
    return (
        <div className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4" onClick={onClose}>
            <div className="bg-zinc-900 border border-white/10 rounded-2xl w-full max-w-sm flex flex-col shadow-2xl overflow-hidden" onClick={e => e.stopPropagation()}>
                <div className="p-4 border-b border-white/10 bg-zinc-900 flex justify-between items-center">
                    <div>
                        <p className="text-[10px] font-bold text-zinc-500 uppercase">Casting For</p>
                        <h2 className="text-xl font-black uppercase italic text-white">{roleName}</h2>
                    </div>
                    <button onClick={onClose} className="p-2 bg-zinc-800 rounded-full hover:bg-zinc-700 text-zinc-400"><X size={16}/></button>
                </div>
                
                <div className="max-h-[60vh] overflow-y-auto p-2 space-y-1 custom-scrollbar">
                    {students.map(s => (
                        <button 
                            key={s.id} 
                            onClick={() => onSelect(s.id)}
                            className="w-full flex items-center gap-3 p-2 hover:bg-zinc-800 rounded-lg group transition-colors text-left"
                        >
                            <img src={s.avatar} className="w-10 h-10 rounded-full object-cover border border-white/10 group-hover:border-blue-500" />
                            <div className="flex-1">
                                <p className="font-bold text-sm text-zinc-200 group-hover:text-white">{s.name}</p>
                            </div>
                            <ChevronRight size={16} className="text-zinc-600 group-hover:text-blue-500" />
                        </button>
                    ))}
                </div>
            </div>
        </div>
    );
};

// --- COMPONENT: THE CHICLET ROW ---
const CastingRow = ({ 
    role, 
    assignedStudent,
    onUpdate, 
    onDelete, 
    onCopy,
    onCastClick 
}: { 
    role: Role, 
    assignedStudent?: Student,
    onUpdate: (id: string, sceneNum: number, type: SceneType) => void,
    onDelete: () => void,
    onCopy: () => void,
    onCastClick: () => void
}) => {
    
    const cycleType = (current: SceneType): SceneType => {
        if (!current) return 'scene';
        if (current === 'scene') return 'song';
        if (current === 'song') return 'dance';
        return null;
    };

    return (
        <div className="bg-zinc-900 border border-white/5 rounded-xl p-3 mb-3 flex flex-col gap-3 shadow-sm group relative">
            
            {/* ROW HEADER & CASTING SLOT */}
            <div className="flex items-center gap-3">
                
                {/* 1. THE CASTING SLOT (Click to Cast) */}
                <button 
                    onClick={onCastClick}
                    className={`w-12 h-12 rounded-full shrink-0 flex items-center justify-center border-2 overflow-hidden transition-all
                        ${assignedStudent 
                            ? 'border-blue-500 shadow-[0_0_15px_rgba(37,99,235,0.3)]' 
                            : 'border-dashed border-zinc-700 hover:border-zinc-500 bg-zinc-950'
                        }
                    `}
                >
                    {assignedStudent ? (
                        <img src={assignedStudent.avatar} className="w-full h-full object-cover" />
                    ) : (
                        <User size={20} className="text-zinc-600" />
                    )}
                </button>

                {/* 2. ROLE NAME & ACTIONS */}
                <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-start">
                        <div>
                            <h3 className="text-sm font-black uppercase text-white tracking-wide leading-none mb-1">{role.name}</h3>
                            {assignedStudent ? (
                                <p className="text-[10px] font-bold text-blue-400 flex items-center gap-1">
                                    <CheckCircle2 size={10} /> {assignedStudent.name}
                                </p>
                            ) : (
                                <p className="text-[10px] font-bold text-zinc-600 italic">Uncast</p>
                            )}
                        </div>
                        
                        {/* Actions (Only show on hover or if empty space clicked) */}
                        <div className="flex gap-2">
                            <button onClick={onCopy} className="p-1.5 text-zinc-500 hover:text-white bg-zinc-800 rounded-lg"><Copy size={14} /></button>
                            <button onClick={onDelete} className="p-1.5 text-zinc-500 hover:text-red-500 bg-zinc-800 rounded-lg"><Trash2 size={14} /></button>
                        </div>
                    </div>
                </div>
            </div>

            {/* CHICLET STRIP */}
            <div className="w-full overflow-x-auto custom-scrollbar pb-2 -mx-1 px-1">
                <div className="flex gap-1.5 min-w-max pl-1">
                    {Array.from({ length: TOTAL_SCENES }).map((_, i) => {
                        const num = i + 1;
                        const type = role.scenes[num];
                        return (
                            <button
                                key={num}
                                onClick={() => onUpdate(role.id, num, cycleType(type))}
                                className="flex flex-col items-center gap-1 group/btn"
                            >
                                <span className={`text-[9px] font-bold ${type ? 'text-white' : 'text-zinc-600 group-hover/btn:text-zinc-400'}`}>{num}</span>
                                <div className={`
                                    w-8 h-10 rounded-md border flex items-center justify-center transition-all relative overflow-hidden
                                    ${type === 'scene' ? 'bg-emerald-900/20 border-emerald-500/50' : 
                                      type === 'song' ? 'bg-blue-900/20 border-blue-500/50' : 
                                      type === 'dance' ? 'bg-purple-900/20 border-purple-500/50' : 
                                      'bg-zinc-950 border-white/5 hover:border-white/20'}
                                `}>
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
  
  // MODAL STATE
  const [castingRoleId, setCastingRoleId] = useState<string | null>(null);

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
      setRoles(prev => [{ id: Date.now().toString(), name, scenes: {} }, ...prev]);
  };

  const handleDeleteRole = (id: string) => {
      if(confirm("Delete this role?")) setRoles(prev => prev.filter(r => r.id !== id));
  };

  const handleCopyRole = (role: Role) => {
      setRoles(prev => [{ ...role, id: Date.now().toString(), name: `${role.name} (Copy)` }, ...prev]);
  };

  const handleAssignStudent = (studentId: number) => {
      if (!castingRoleId) return;
      setRoles(prev => prev.map(r => r.id === castingRoleId ? { ...r, assignedStudentId: studentId } : r));
      setCastingRoleId(null); // Close modal
  };

  return (
    <div className="h-screen bg-zinc-950 text-white flex flex-col font-sans relative">
        
        {/* HEADER */}
        <header className="h-16 border-b border-white/10 bg-zinc-900/50 flex items-center justify-between px-4 shrink-0 backdrop-blur-md sticky top-0 z-10">
            <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
                    <Users size={18} className="text-white" />
                </div>
                <h1 className="text-lg font-black uppercase italic tracking-tighter">Casting Plot</h1>
            </div>
            <button onClick={handleAddRole} className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center text-white hover:bg-blue-500 shadow-lg"><Plus size={18} /></button>
        </header>

        {/* LEGEND */}
        <div className="bg-zinc-900/80 border-b border-white/5 py-2 px-4 flex justify-center gap-6 shrink-0 sticky top-16 z-10 backdrop-blur-sm">
            <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded bg-emerald-500/40 border border-emerald-500"></div><span className="text-[10px] font-bold uppercase text-zinc-400">Scene</span></div>
            <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded bg-blue-500/40 border border-blue-500"></div><span className="text-[10px] font-bold uppercase text-zinc-400">Song</span></div>
            <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded bg-purple-500/40 border border-purple-500"></div><span className="text-[10px] font-bold uppercase text-zinc-400">Dance</span></div>
        </div>

        {/* GRID AREA */}
        <div className="flex-1 overflow-y-auto p-4 custom-scrollbar pb-24">
            {roles.map(role => (
                <CastingRow 
                    key={role.id}
                    role={role}
                    assignedStudent={DEMO_STUDENTS.find(s => s.id === role.assignedStudentId)}
                    onUpdate={handleUpdateScene}
                    onDelete={() => handleDeleteRole(role.id)}
                    onCopy={() => handleCopyRole(role)}
                    onCastClick={() => setCastingRoleId(role.id)} // OPEN MODAL
                />
            ))}
            
            <button onClick={handleAddRole} className="w-full py-4 border-2 border-dashed border-zinc-800 rounded-xl text-zinc-600 font-bold uppercase text-xs hover:bg-zinc-900 hover:border-zinc-700 transition-all flex items-center justify-center gap-2"><Plus size={14} /> Add Role</button>
        </div>

        {/* CASTING MODAL (Conditionally Rendered) */}
        {castingRoleId && (
            <CastingModal 
                roleName={roles.find(r => r.id === castingRoleId)?.name || "Role"}
                students={DEMO_STUDENTS}
                onSelect={handleAssignStudent}
                onClose={() => setCastingRoleId(null)}
            />
        )}

    </div>
  );
}
