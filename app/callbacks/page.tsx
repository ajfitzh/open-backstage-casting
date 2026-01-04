/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import React, { useState, useEffect, useMemo } from 'react';
import { 
  Users, Calendar, Clock, Plus, Trash2, 
  FileText, Share, Search, MoreVertical, X, 
  ChevronRight, GripVertical, CheckCircle2
} from 'lucide-react';
import { getAuditionSlots, updateAuditionSlot } from '@/app/lib/baserow'; 

// --- TYPES ---
interface Student {
  id: number;
  name: string;
  avatar: string;
  age: string;
  gender: string;
  score: number; // Avg audition score
  tags: string[]; // "Mover", "Strong Vocal", etc.
  callbackString: string; // The text saved to DB (e.g. "Dance, Ariel")
}

interface CallbackSlot {
  id: string;
  time: string;
  title: string;
  type: 'dance' | 'vocal' | 'read';
  material?: string; // Link to PDF/MP3
  assignedIds: number[];
}

const DEFAULT_SLOTS: CallbackSlot[] = [
  { id: 'dance-1', time: '10:00 AM', title: 'General Dance Call', type: 'dance', assignedIds: [] },
  { id: 'vocal-leads', time: '11:30 AM', title: 'Lead Vocals (Ariel/Eric)', type: 'vocal', assignedIds: [] },
  { id: 'read-1', time: '01:00 PM', title: 'Sc 4: Ariel & Flounder', type: 'read', assignedIds: [] },
];

export default function CallbackMatrixPage() {
  // --- STATE ---
  const [students, setStudents] = useState<Student[]>([]);
  const [slots, setSlots] = useState<CallbackSlot[]>(DEFAULT_SLOTS);
  const [loading, setLoading] = useState(true);
  
  // UI State
  const [benchOpen, setBenchOpen] = useState(false); // Mobile Drawer
  const [search, setSearch] = useState("");
  const [draggedStudentId, setDraggedStudentId] = useState<number | null>(null);
  const [activeMobileStudent, setActiveMobileStudent] = useState<Student | null>(null);

  // --- DATA LOADING ---
  useEffect(() => {
    async function load() {
      const rows = await getAuditionSlots();
      const activeShowId = localStorage.getItem('activeShowId'); 

      const cleanData = rows
        .filter((r: any) => {
            const prodArray = r.Production || [];
            if (!prodArray.length) return false;
            if (activeShowId && prodArray.some((p: any) => String(p.id) === activeShowId)) return true;
            return (prodArray[0]?.value || "").toLowerCase().includes("mermaid");
        })
        .map((r: any) => ({
            id: r.id,
            name: r.Performer?.[0]?.value || "Unknown",
            avatar: r.Headshot?.[0]?.url || "",
            age: r.Age?.value || "?",
            gender: r.Gender?.value || "",
            score: parseFloat(r["Vocal Score"]) || 0,
            tags: [], // Could parse from notes if needed
            callbackString: r["Callbacks"] || "" // Assuming you add a "Callbacks" text field
        }));
      
      setStudents(cleanData);
      setLoading(false);
    }
    load();
  }, []);

  // --- ACTIONS ---

  const handleAddSlot = () => {
      const time = prompt("Time (e.g. 2:00 PM):", "2:00 PM");
      if(!time) return;
      const title = prompt("Title (e.g. Ursula Sides):", "New Slot");
      if(!title) return;
      
      const newSlot: CallbackSlot = {
          id: Date.now().toString(),
          time,
          title,
          type: 'read',
          assignedIds: []
      };
      setSlots(prev => [...prev, newSlot]);
  };

  const handleRemoveSlot = (id: string) => {
      if(confirm("Delete this callback slot?")) {
          setSlots(prev => prev.filter(s => s.id !== id));
      }
  };

  const handleAssign = (studentId: number, slotId: string) => {
      setSlots(prev => prev.map(s => {
          if (s.id === slotId && !s.assignedIds.includes(studentId)) {
              return { ...s, assignedIds: [...s.assignedIds, studentId] };
          }
          return s;
      }));
      setActiveMobileStudent(null);
      setBenchOpen(false);
  };

  const handleUnassign = (studentId: number, slotId: string) => {
      setSlots(prev => prev.map(s => {
          if (s.id === slotId) {
              return { ...s, assignedIds: s.assignedIds.filter(id => id !== studentId) };
          }
          return s;
      }));
  };

  const handlePublish = async () => {
      if(!confirm("Update the 'Callbacks' field in the database for all assigned students?")) return;
      
      // 1. Calculate strings for each student
      const updates: Record<number, string> = {};
      
      slots.forEach(slot => {
          slot.assignedIds.forEach(id => {
              const entry = `${slot.time}: ${slot.title}`;
              if (updates[id]) updates[id] += `\n${entry}`;
              else updates[id] = entry;
          });
      });

      // 2. Perform updates (In real app, bundle this or show progress bar)
      let count = 0;
      for (const [id, text] of Object.entries(updates)) {
          // This assumes you made a text field called "Callbacks" in Baserow!
          await updateAuditionSlot(Number(id), { "Callbacks": text });
          count++;
      }
      alert(`Published schedules for ${count} students!`);
  };

  // --- FILTERED BENCH ---
  const benchList = useMemo(() => {
      return students
        .filter(s => s.name.toLowerCase().includes(search.toLowerCase()))
        .sort((a, b) => b.score - a.score); // Highest score first
  }, [students, search]);

  // --- DRAG HANDLERS ---
  const handleDragStart = (e: React.DragEvent, id: number) => {
      setDraggedStudentId(id);
      e.dataTransfer.effectAllowed = "copy";
  };
  const handleDragOver = (e: React.DragEvent) => { e.preventDefault(); };
  const handleDrop = (e: React.DragEvent, slotId: string) => {
      e.preventDefault();
      if(draggedStudentId) handleAssign(draggedStudentId, slotId);
      setDraggedStudentId(null);
  };

  if (loading) return <div className="h-screen bg-zinc-950 flex items-center justify-center text-white">Loading Matrix...</div>;

  return (
    <div className="h-screen bg-zinc-950 text-white flex flex-col md:grid md:grid-cols-[300px_1fr] divide-x divide-white/10 font-sans overflow-hidden">
        
        {/* === LEFT: THE BENCH (Desktop Sidebar / Mobile Drawer) === */}
        <aside className={`
            fixed inset-0 z-50 bg-zinc-900/95 backdrop-blur transition-transform duration-300 md:relative md:translate-y-0 md:bg-zinc-900 md:flex flex-col
            ${benchOpen ? 'translate-y-0' : 'translate-y-full md:translate-y-0'}
        `}>
            {/* Header */}
            <div className="p-4 border-b border-white/5 flex justify-between items-center bg-zinc-900">
                <div className="flex items-center gap-2">
                    <Users size={18} className="text-zinc-400" />
                    <h2 className="text-sm font-black uppercase tracking-widest">The Bench</h2>
                    <span className="bg-zinc-800 text-zinc-500 px-2 py-0.5 rounded-full text-[10px] font-bold">{benchList.length}</span>
                </div>
                <button onClick={() => setBenchOpen(false)} className="md:hidden p-2 text-zinc-500"><X size={20}/></button>
            </div>

            {/* Search */}
            <div className="p-2 border-b border-white/5">
                <div className="bg-black/20 rounded-lg flex items-center px-3 py-2 border border-white/5">
                    <Search size={14} className="text-zinc-600 mr-2" />
                    <input 
                        value={search} 
                        onChange={(e) => setSearch(e.target.value)} 
                        className="bg-transparent outline-none text-xs text-white placeholder:text-zinc-600 w-full" 
                        placeholder="Search actors..." 
                    />
                </div>
            </div>

            {/* List */}
            <div className="flex-1 overflow-y-auto p-2 space-y-1 custom-scrollbar">
                {benchList.map(student => (
                    <div 
                        key={student.id}
                        draggable
                        onDragStart={(e) => handleDragStart(e, student.id)}
                        onClick={() => {
                            if (window.innerWidth < 768) {
                                setActiveMobileStudent(student);
                                setBenchOpen(false); // Close bench to show slots for assignment
                            }
                        }}
                        className={`group flex items-center gap-3 p-2 rounded-lg hover:bg-white/5 cursor-pointer select-none transition-colors 
                            ${activeMobileStudent?.id === student.id ? 'bg-blue-900/20 border border-blue-500/30' : 'border border-transparent'}
                        `}
                    >
                        <div className="w-8 h-8 rounded-full bg-zinc-800 overflow-hidden shrink-0">
                            {student.avatar && <img src={student.avatar} className="w-full h-full object-cover" />}
                        </div>
                        <div className="min-w-0 flex-1">
                            <p className="text-xs font-bold truncate">{student.name}</p>
                            <p className="text-[10px] text-zinc-500">{student.gender} • Score: {student.score || "-"}</p>
                        </div>
                        {student.score >= 4 && <div className="w-2 h-2 rounded-full bg-emerald-500"></div>}
                        <GripVertical size={14} className="text-zinc-700 opacity-0 group-hover:opacity-100" />
                    </div>
                ))}
            </div>
        </aside>


        {/* === RIGHT: THE MATRIX (Schedule) === */}
        <main className="flex flex-col h-full overflow-hidden relative">
            
            {/* Header */}
            <header className="h-16 border-b border-white/10 bg-zinc-900/50 flex items-center justify-between px-4 md:px-8 shrink-0">
                <div className="flex items-center gap-4">
                    <button onClick={() => setBenchOpen(true)} className="md:hidden p-2 bg-zinc-800 rounded-lg text-zinc-400">
                        <Users size={18} />
                    </button>
                    <div>
                        <h1 className="text-lg font-black uppercase italic tracking-tighter">Callback Matrix</h1>
                        <p className="text-[10px] text-zinc-500 font-bold uppercase hidden md:block">Friday Night Planning</p>
                    </div>
                </div>

                <div className="flex gap-2">
                    <button onClick={handleAddSlot} className="flex items-center gap-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 px-4 py-2 rounded-lg text-xs font-bold uppercase transition-all">
                        <Plus size={14} /> <span className="hidden md:inline">Add Slot</span>
                    </button>
                    <button onClick={handlePublish} className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-lg text-xs font-bold uppercase transition-all shadow-lg shadow-blue-900/20">
                        <Share size={14} /> <span className="hidden md:inline">Publish</span>
                    </button>
                </div>
            </header>

            {/* Mobile "Assigning Mode" Banner */}
            {activeMobileStudent && (
                <div className="bg-blue-600 text-white p-3 text-xs font-bold flex justify-between items-center shadow-lg z-20">
                    <span>Assigning: {activeMobileStudent.name}</span>
                    <button onClick={() => setActiveMobileStudent(null)} className="p-1 hover:bg-white/20 rounded"><X size={14}/></button>
                </div>
            )}

            {/* Timeline */}
            <div className="flex-1 overflow-y-auto p-4 md:p-8 space-y-6 custom-scrollbar bg-zinc-950">
                {slots.map((slot) => (
                    <div 
                        key={slot.id}
                        onDragOver={handleDragOver}
                        onDrop={(e) => handleDrop(e, slot.id)}
                        onClick={() => {
                            if (activeMobileStudent) {
                                handleAssign(activeMobileStudent.id, slot.id);
                            }
                        }}
                        className={`relative rounded-2xl border transition-all overflow-hidden group
                            ${activeMobileStudent ? 'border-blue-500/50 bg-blue-900/5 cursor-pointer hover:bg-blue-900/10' : 'border-white/5 bg-zinc-900/30'}
                        `}
                    >
                        {/* Time Column (Left Decorator) */}
                        <div className={`absolute left-0 top-0 bottom-0 w-1 ${
                            slot.type === 'dance' ? 'bg-emerald-500' : slot.type === 'vocal' ? 'bg-purple-500' : 'bg-blue-500'
                        }`} />

                        <div className="p-4 md:p-6 pl-6 flex flex-col md:flex-row gap-4 md:gap-8 items-start md:items-center">
                            
                            {/* Slot Info */}
                            <div className="min-w-[150px] shrink-0">
                                <div className="flex items-center gap-2 text-zinc-500 mb-1">
                                    <Clock size={12} />
                                    <span className="text-xs font-black uppercase tracking-wider">{slot.time}</span>
                                </div>
                                <h3 className="text-xl font-bold text-white leading-tight mb-2">{slot.title}</h3>
                                {slot.material ? (
                                    <a href="#" className="flex items-center gap-1.5 text-[10px] font-bold text-blue-400 hover:text-blue-300 uppercase">
                                        <FileText size={12} /> View Sides
                                    </a>
                                ) : (
                                    <button className="text-[10px] text-zinc-600 hover:text-zinc-400 font-bold uppercase flex items-center gap-1">
                                        <Plus size={10} /> Add Material
                                    </button>
                                )}
                            </div>

                            {/* Assigned Grid */}
                            <div className="flex-1 w-full">
                                {slot.assignedIds.length === 0 ? (
                                    <div className="h-16 border-2 border-dashed border-white/5 rounded-xl flex items-center justify-center text-zinc-700 text-xs font-bold uppercase tracking-wider">
                                        {activeMobileStudent ? "Tap here to assign" : "Drag students here"}
                                    </div>
                                ) : (
                                    <div className="flex flex-wrap gap-2">
                                        {slot.assignedIds.map(id => {
                                            const student = students.find(s => s.id === id);
                                            if (!student) return null;
                                            return (
                                                <div key={id} className="flex items-center gap-2 bg-zinc-800 border border-white/5 pl-1 pr-3 py-1 rounded-full group/chip hover:border-white/20 transition-colors">
                                                    <img src={student.avatar || DEFAULT_AVATAR} className="w-5 h-5 rounded-full object-cover" />
                                                    <span className="text-xs font-bold text-zinc-300">{student.name}</span>
                                                    <button 
                                                        onClick={(e) => { e.stopPropagation(); handleUnassign(id, slot.id); }}
                                                        className="ml-1 text-zinc-600 hover:text-red-400"
                                                    >
                                                        <X size={12} />
                                                    </button>
                                                </div>
                                            )
                                        })}
                                    </div>
                                )}
                            </div>

                            {/* Actions */}
                            <div className="self-start md:self-center">
                                <button onClick={() => handleRemoveSlot(slot.id)} className="p-2 text-zinc-600 hover:text-red-500 transition-colors">
                                    <Trash2 size={16} />
                                </button>
                            </div>
                        </div>
                    </div>
                ))}

                {/* Add Slot Placeholder */}
                <button onClick={handleAddSlot} className="w-full py-8 border-2 border-dashed border-white/5 rounded-2xl flex flex-col items-center justify-center text-zinc-600 hover:text-zinc-400 hover:border-white/10 transition-all gap-2 group">
                    <Plus size={24} className="group-hover:scale-110 transition-transform" />
                    <span className="text-xs font-black uppercase tracking-widest">Create New Slot</span>
                </button>
            </div>
        </main>
    </div>
  );
}