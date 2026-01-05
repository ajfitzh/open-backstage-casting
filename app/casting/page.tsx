/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import React, { useState, useEffect } from 'react';
import { 
  Users, Plus, Trash2, Copy, Search,
  User, X, CheckCircle2, ChevronRight, Loader2
} from 'lucide-react';
import { getRoles, createRole, updateRole, deleteRole, getAuditionees, createCastAssignment } from '@/app/lib/baserow'; 

// --- CONFIG ---
// Adjusted to 30 to cover your scene numbers (highest in CSV is 27)
const TOTAL_SCENES = 30;

// --- TYPES ---
type SceneType = 'scene' | 'song' | 'dance' | null;

interface Role {
  id: number;
  name: string;
  scenes: Record<number, SceneType>;
  assignedStudentId?: number; 
}

interface Student {
    id: number;
    name: string;
    avatar: string;
}

const safeString = (val: any): string => {
    if (val === null || val === undefined) return "";
    return String(val);
};

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
    const [search, setSearch] = useState("");
    const filtered = students.filter(s => safeString(s.name).toLowerCase().includes(search.toLowerCase()));

    return (
        <div className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4" onClick={onClose}>
            <div className="bg-zinc-900 border border-white/10 rounded-2xl w-full max-w-sm flex flex-col shadow-2xl overflow-hidden max-h-[70vh]" onClick={e => e.stopPropagation()}>
                <div className="p-4 border-b border-white/10 bg-zinc-900 flex justify-between items-center shrink-0">
                    <div>
                        <p className="text-[10px] font-bold text-zinc-500 uppercase">Casting For</p>
                        <h2 className="text-xl font-black uppercase italic text-white">{roleName}</h2>
                    </div>
                    <button onClick={onClose} className="p-2 bg-zinc-800 rounded-full hover:bg-zinc-700 text-zinc-400"><X size={16}/></button>
                </div>
                <div className="p-2 border-b border-white/5 bg-zinc-900 shrink-0">
                    <input autoFocus value={search} onChange={e => setSearch(e.target.value)} placeholder="Search actors..." className="w-full bg-zinc-950 border border-white/10 rounded p-2 text-sm text-white focus:border-blue-500 outline-none" />
                </div>
                <div className="overflow-y-auto p-2 space-y-1 custom-scrollbar flex-1">
                    {filtered.map(s => (
                        <button key={s.id} onClick={() => onSelect(s.id)} className="w-full flex items-center gap-3 p-2 hover:bg-zinc-800 rounded-lg group transition-colors text-left">
                            <img src={s.avatar || "https://cdn.pixabay.com/photo/2015/10/05/22/37/blank-profile-picture-973460_1280.png"} className="w-10 h-10 rounded-full object-cover border border-white/10 group-hover:border-blue-500" />
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

// --- COMPONENT: CHICLET ROW ---
const CastingRow = ({ 
    role, assignedStudent, onUpdate, onDelete, onCopy, onCastClick 
}: { 
    role: Role, assignedStudent?: Student, onUpdate: (id: number, sceneNum: number, type: SceneType) => void, onDelete: () => void, onCopy: () => void, onCastClick: () => void
}) => {
    const cycleType = (current: SceneType): SceneType => {
        if (!current) return 'scene';
        if (current === 'scene') return 'song';
        if (current === 'song') return 'dance';
        return null;
    };

    return (
        <div className="bg-zinc-900 border border-white/5 rounded-xl p-3 mb-3 flex flex-col gap-3 shadow-sm group relative">
            <div className="flex items-center gap-3">
                <button onClick={onCastClick} className={`w-12 h-12 rounded-full shrink-0 flex items-center justify-center border-2 overflow-hidden transition-all ${assignedStudent ? 'border-blue-500 shadow-[0_0_15px_rgba(37,99,235,0.3)]' : 'border-dashed border-zinc-700 hover:border-zinc-500 bg-zinc-950'}`}>
                    {assignedStudent ? <img src={assignedStudent.avatar || "https://cdn.pixabay.com/photo/2015/10/05/22/37/blank-profile-picture-973460_1280.png"} className="w-full h-full object-cover" /> : <User size={20} className="text-zinc-600" />}
                </button>
                <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-start">
                        <div>
                            <h3 className="text-sm font-black uppercase text-white tracking-wide leading-none mb-1">{safeString(role.name)}</h3>
                            {assignedStudent ? <p className="text-[10px] font-bold text-blue-400 flex items-center gap-1"><CheckCircle2 size={10} /> {assignedStudent.name}</p> : <p className="text-[10px] font-bold text-zinc-600 italic">Uncast</p>}
                        </div>
                        <div className="flex gap-2">
                            <button onClick={onCopy} className="p-1.5 text-zinc-500 hover:text-white bg-zinc-800 rounded-lg"><Copy size={14} /></button>
                            <button onClick={onDelete} className="p-1.5 text-zinc-500 hover:text-red-500 bg-zinc-800 rounded-lg"><Trash2 size={14} /></button>
                        </div>
                    </div>
                </div>
            </div>
            <div className="w-full overflow-x-auto custom-scrollbar pb-2 -mx-1 px-1">
                <div className="flex gap-1.5 min-w-max pl-1">
                    {Array.from({ length: TOTAL_SCENES }).map((_, i) => {
                        const num = i + 1;
                        const type = role.scenes[num];
                        return (
                            <button key={num} onClick={() => onUpdate(role.id, num, cycleType(type))} className="flex flex-col items-center gap-1 group/btn">
                                <span className={`text-[9px] font-bold ${type ? 'text-white' : 'text-zinc-600 group-hover/btn:text-zinc-400'}`}>{num}</span>
                                <div className={`w-8 h-10 rounded-md border flex items-center justify-center transition-all relative overflow-hidden ${type === 'scene' ? 'bg-emerald-900/20 border-emerald-500/50' : type === 'song' ? 'bg-blue-900/20 border-blue-500/50' : type === 'dance' ? 'bg-purple-900/20 border-purple-500/50' : 'bg-zinc-950 border-white/5 hover:border-white/20'}`}>
                                    {type && <div className={`absolute inset-0 opacity-40 ${type === 'scene' ? 'bg-emerald-500' : type === 'song' ? 'bg-blue-500' : 'bg-purple-500'}`} />}
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
  const [roles, setRoles] = useState<Role[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [castingRoleId, setCastingRoleId] = useState<number | null>(null);

  useEffect(() => {
    async function load() {
        try {
            const roleRows = await getRoles();
            const parsedRoles = roleRows.map((r: any) => {
                // 1. Scene Parsing: Read from "Active Scenes" column (e.g. "18,19,20")
                let sceneMap: Record<number, SceneType> = {};
                
                // First check if we have saved JSON data (from manual edits)
                if (r["Scene Data"]) {
                    try { 
                        const parsed = JSON.parse(r["Scene Data"]); 
                        // Only use if it's not empty object
                        if (Object.keys(parsed).length > 0) sceneMap = parsed;
                    } catch(e) {}
                } 
                
                // If map is empty, fallback to "Active Scenes" column (from CSV/Blueprint)
                if (Object.keys(sceneMap).length === 0) {
                    const rawScenes = r["Active Scenes"] || "";
                    if (rawScenes) {
                        const nums = safeString(rawScenes).split(',').map(s => parseInt(s.trim())).filter(n => !isNaN(n));
                        nums.forEach(n => sceneMap[n] = 'scene'); // Default color
                    }
                }

                return {
                    id: r.id,
                    // Use "Role Name" from CSV
                    name: safeString(r["Role Name"] || r.Name || "Untitled Role"),
                    scenes: sceneMap,
                    assignedStudentId: (r["Assigned Actor"] || r["Actor"] || [])?.[0]?.id 
                };
            });
            
            const peopleRows = await getAuditionees();
            const parsedStudents = peopleRows.map((p: any) => ({
                id: p.id,
                name: safeString(p.Performer && typeof p.Performer === 'object' && p.Performer[0]?.value ? p.Performer[0].value : p.Performer),
                avatar: p.Headshot?.[0]?.url || "",
            }));

            setRoles(parsedRoles);
            setStudents(parsedStudents);
        } catch (e) {
            console.error("Load failed:", e);
        } finally {
            setLoading(false);
        }
    }
    load();
  }, []);

  const handleUpdateScene = (roleId: number, sceneNum: number, newType: SceneType) => {
      const role = roles.find(r => r.id === roleId);
      if (!role) return;
      const newScenes = { ...role.scenes };
      if (newType === null) delete newScenes[sceneNum];
      else newScenes[sceneNum] = newType;
      
      setRoles(prev => prev.map(r => r.id === roleId ? { ...r, scenes: newScenes } : r));
      
      // Save to "Scene Data" JSON column so manual changes persist
      updateRole(roleId, { "Scene Data": JSON.stringify(newScenes) });
  };

  const handleAddRole = async () => {
      const name = prompt("Role Name:");
      if (!name) return;
      const tempId = Date.now();
      setRoles(prev => [{ id: tempId, name, scenes: {} }, ...prev]);
      try {
          const savedRow = await createRole(name);
          setRoles(prev => prev.map(r => r.id === tempId ? { ...r, id: savedRow.id } : r));
      } catch (e) { alert("Save failed"); }
  };

  const handleDeleteRole = async (id: number) => {
      if(!confirm("Delete this role?")) return;
      setRoles(prev => prev.filter(r => r.id !== id));
      await deleteRole(id);
  };

  const handleCopyRole = async (role: Role) => {
      const newName = `${role.name} (Copy)`;
      const tempId = Date.now();
      const copy: Role = { ...role, id: tempId, name: newName };
      setRoles(prev => [copy, ...prev]);
      const savedRow = await createRole(newName);
      await updateRole(savedRow.id, { "Scene Data": JSON.stringify(role.scenes) });
      setRoles(prev => prev.map(r => r.id === tempId ? { ...copy, id: savedRow.id } : r));
  };

  const handleAssignStudent = async (studentId: number) => {
      if (!castingRoleId) return;
      setRoles(prev => prev.map(r => r.id === castingRoleId ? { ...r, assignedStudentId: studentId } : r));
      await updateRole(castingRoleId, { "Assigned Actor": [studentId] });
      setCastingRoleId(null);
  };

  const filteredRoles = roles.filter(r => safeString(r.name).toLowerCase().includes(search.toLowerCase()));

  if (loading) return <div className="h-screen bg-zinc-950 flex items-center justify-center text-white"><Loader2 className="animate-spin text-blue-500" /></div>;

  return (
    <div className="h-screen bg-zinc-950 text-white flex flex-col font-sans relative">
        <header className="h-16 border-b border-white/10 bg-zinc-900/50 flex items-center justify-between px-4 shrink-0 backdrop-blur-md sticky top-0 z-10">
            <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center"><Users size={18} className="text-white" /></div>
                <h1 className="text-lg font-black uppercase italic tracking-tighter">Casting Plot</h1>
            </div>
            <button onClick={handleAddRole} className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center text-white hover:bg-blue-500 shadow-lg"><Plus size={18} /></button>
        </header>
        <div className="bg-zinc-900/80 border-b border-white/5 py-2 px-4 shrink-0 sticky top-16 z-10 backdrop-blur-sm space-y-2">
            <div className="flex justify-center gap-6">
                <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded bg-emerald-500/40 border border-emerald-500"></div><span className="text-[10px] font-bold uppercase text-zinc-400">Scene</span></div>
                <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded bg-blue-500/40 border border-blue-500"></div><span className="text-[10px] font-bold uppercase text-zinc-400">Song</span></div>
                <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded bg-purple-500/40 border border-purple-500"></div><span className="text-[10px] font-bold uppercase text-zinc-400">Dance</span></div>
            </div>
            <div className="relative">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
                <input value={search} onChange={(e) => setSearch(e.target.value)} className="w-full bg-zinc-950 border border-white/10 rounded-lg py-2 pl-9 text-xs text-white placeholder:text-zinc-600 focus:border-blue-500 outline-none" placeholder="Search roles..." />
            </div>
        </div>
        <div className="flex-1 overflow-y-auto p-4 custom-scrollbar pb-24">
            {filteredRoles.map(role => (
                <CastingRow 
                    key={role.id}
                    role={role}
                    assignedStudent={students.find(s => s.id === role.assignedStudentId)}
                    onUpdate={handleUpdateScene}
                    onDelete={() => handleDeleteRole(role.id)}
                    onCopy={() => handleCopyRole(role)}
                    onCastClick={() => setCastingRoleId(role.id)}
                />
            ))}
            <button onClick={handleAddRole} className="w-full py-4 border-2 border-dashed border-zinc-800 rounded-xl text-zinc-600 font-bold uppercase text-xs hover:bg-zinc-900 hover:border-zinc-700 transition-all flex items-center justify-center gap-2"><Plus size={14} /> Add Role</button>
        </div>
        {castingRoleId && (
            <CastingModal roleName={roles.find(r => r.id === castingRoleId)?.name || "Role"} students={students} onSelect={handleAssignStudent} onClose={() => setCastingRoleId(null)} />
        )}
    </div>
  );
}