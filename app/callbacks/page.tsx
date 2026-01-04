/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import React, { useState, useEffect, useMemo } from 'react';
import { 
  Users, Clock, Plus, Trash2, 
  Share, Search, X, GripVertical, 
  Link as LinkIcon, Music, FileText,
  Loader2, Copy, UploadCloud, CheckCircle2
} from 'lucide-react';
import { getAuditionSlots, updateAuditionSlot } from '@/app/lib/baserow'; 

// --- CONFIGURATION ---

const DISCLAIMER_TEXT = `
*** NOTICE ***
This schedule represents the maximum potential callbacks for each actor. 
The creative team reserves the right to release actors early if vocal/dance requirements 
for specific roles are not met during the morning sessions. 
Please be prepared for all listed slots, but be aware the schedule may evolve in real-time.
`;

// You can edit this list for each show! No DB needed.
const SMART_DEFAULTS: Record<string, { title: string, link: string }> = {
    "ariel": { title: "Part of Your World", link: "" }, // Add your links here
    "ursula": { title: "Poor Unfortunate Souls", link: "" },
    "eric": { title: "One Step Closer", link: "" },
    "sebastian": { title: "Under the Sea", link: "" },
    "dance": { title: "Jazz Combo Video", link: "" },
};

// --- TYPES ---

interface Student {
  id: number;
  name: string;
  avatar: string;
  gender: string;
  score: number; // Avg audition score
  callbackString: string; // Current DB value
}

interface CallbackSlot {
  id: string;
  time: string;
  title: string;
  type: 'dance' | 'vocal' | 'read';
  materialLink?: string; 
  materialName?: string; 
  assignedIds: number[];
}

interface Asset {
    url: string;
    name: string;
    type: 'pdf' | 'audio' | 'video';
}

const DEFAULT_SLOTS: CallbackSlot[] = [
  { id: 'dance-1', time: '10:00 AM', title: 'General Dance Call', type: 'dance', assignedIds: [] },
  { id: 'vocal-lead', time: '11:30 AM', title: 'Lead Vocals', type: 'vocal', assignedIds: [] },
];

export default function CallbackMatrixPage() {
  // --- STATE ---
  const [students, setStudents] = useState<Student[]>([]);
  const [slots, setSlots] = useState<CallbackSlot[]>(DEFAULT_SLOTS);
  const [assets, setAssets] = useState<Asset[]>([]);
  const [loading, setLoading] = useState(true);
  
  // UI State
  const [leftPanelOpen, setLeftPanelOpen] = useState(true); // Bench
  const [rightPanelOpen, setRightPanelOpen] = useState(false); // Asset Library
  const [search, setSearch] = useState("");
  const [draggedStudentId, setDraggedStudentId] = useState<number | null>(null);
  const [isUploading, setIsUploading] = useState(false);
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
            gender: r.Gender?.value || "",
            score: parseFloat(r["Vocal Score"]) || 0,
            callbackString: r["Callbacks"] || ""
        }));
      
      setStudents(cleanData);
      setLoading(false);
    }
    load();
  }, []);

  // --- ASSET ACTIONS (DigitalOcean) ---
  const handleUploadAsset = async (e: React.ChangeEvent<HTMLInputElement>) => {
      if (!e.target.files || !e.target.files[0]) return;
      const file = e.target.files[0];
      
      setIsUploading(true);
      try {
          // 1. Get Permission (Presigned URL)
          const res = await fetch('/api/upload', {
              method: 'POST',
              body: JSON.stringify({ filename: `SIDE-${file.name}`, fileType: file.type }),
          });
          if (!res.ok) throw new Error("Sign failed");
          const { uploadUrl, publicUrl } = await res.json();

          // 2. Upload directly to DO Spaces
          await fetch(uploadUrl, {
              method: 'PUT',
              body: file,
              headers: { "Content-Type": file.type, "x-amz-acl": "public-read" },
          });

          // 3. Add to Local List
          const type = file.type.includes('pdf') ? 'pdf' : file.type.includes('audio') ? 'audio' : 'video';
          setAssets(prev => [...prev, { name: file.name, url: publicUrl, type }]);
          
      } catch (err) {
          console.error(err);
          alert("Upload failed. Check your API keys.");
      } finally {
          setIsUploading(false);
      }
  };

  const handleCopyAsset = (asset: Asset) => {
      navigator.clipboard.writeText(asset.url);
      alert("Link copied! Paste it when creating a slot.");
  };

  // --- SLOT ACTIONS ---
  const handleAddSlot = () => {
      // 1. Basic Info
      const time = prompt("Time (e.g. 2:00 PM):", "2:00 PM");
      if(!time) return;
      const title = prompt("Title (e.g. Ursula Sides):", "New Slot");
      if(!title) return;
      
      // 2. Check Smart Defaults
      let defaultLink = "";
      let defaultLabel = "";
      const lowerTitle = title.toLowerCase();
      
      for (const [key, val] of Object.entries(SMART_DEFAULTS)) {
          if (lowerTitle.includes(key)) {
              defaultLink = val.link;
              defaultLabel = val.title;
              break;
          }
      }

      // 3. User Override
      const materialLink = prompt("Material Link (Optional - leave blank, paste link, or accept default):", defaultLink);
      
      const newSlot: CallbackSlot = {
          id: Date.now().toString(),
          time,
          title,
          type: lowerTitle.includes('dance') ? 'dance' : lowerTitle.includes('vocal') ? 'vocal' : 'read',
          materialLink: materialLink || undefined,
          materialName: materialLink ? (defaultLabel || "Sides") : undefined,
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
      if(!confirm("Update the 'Callbacks' field in the database for all assigned students? This will overwrite existing data.")) return;
      
      const updates: Record<number, string> = {};
      
      // Build the strings
      slots.forEach(slot => {
          slot.assignedIds.forEach(id => {
              let entry = `${slot.time}: ${slot.title}`;
              if (slot.materialLink) entry += ` (Link: ${slot.materialLink})`;
              
              if (updates[id]) updates[id] += `\n${entry}`;
              else updates[id] = entry;
          });
      });

      // Send to Baserow with Disclaimer
      let count = 0;
      for (const [id, text] of Object.entries(updates)) {
          const finalString = `${text}\n\n${DISCLAIMER_TEXT}`;
          await updateAuditionSlot(Number(id), { "Callbacks": finalString });
          count++;
      }
      alert(`Published schedules for ${count} students!`);
  };

  // --- FILTERED BENCH ---
  const benchList = useMemo(() => {
      return students
        .filter(s => s.name.toLowerCase().includes(search.toLowerCase()))
        .sort((a, b) => b.score - a.score); 
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

  if (loading) return <div className="h-screen bg-zinc-950 flex items-center justify-center text-white"><Loader2 className="animate-spin text-blue-500" /></div>;

  return (
    <div className="h-screen bg-zinc-950 text-white flex overflow-hidden relative font-sans">
        
        {/* === LEFT: THE BENCH === */}
        <aside className={`${leftPanelOpen ? 'w-[300px]' : 'w-0'} bg-zinc-900 border-r border-white/5 transition-all duration-300 flex flex-col shrink-0 overflow-hidden`}>
            <div className="p-4 border-b border-white/5 flex justify-between items-center shrink-0 bg-zinc-900 z-10">
                <div className="flex items-center gap-2">
                    <Users size={18} className="text-zinc-400" />
                    <h2 className="text-sm font-black uppercase tracking-widest">Bench</h2>
                    <span className="bg-zinc-800 text-zinc-500 px-2 py-0.5 rounded-full text-[10px] font-bold">{benchList.length}</span>
                </div>
                <button onClick={() => setLeftPanelOpen(false)} className="md:hidden"><X size={16}/></button>
            </div>
            
            <div className="p-2 border-b border-white/5 shrink-0">
                <div className="bg-black/20 rounded-lg flex items-center px-3 py-2 border border-white/5">
                    <Search size={14} className="text-zinc-600 mr-2" />
                    <input value={search} onChange={(e) => setSearch(e.target.value)} className="bg-transparent outline-none text-xs text-white placeholder:text-zinc-600 w-full" placeholder="Search actors..." />
                </div>
            </div>

            <div className="flex-1 overflow-y-auto p-2 space-y-1 custom-scrollbar pb-20">
                {benchList.map(student => (
                    <div 
                        key={student.id}
                        draggable
                        onDragStart={(e) => handleDragStart(e, student.id)}
                        onClick={() => {
                            if (window.innerWidth < 768) {
                                setActiveMobileStudent(student);
                                setLeftPanelOpen(false); // Close bench to show slots
                            }
                        }}
                        className={`group flex items-center gap-3 p-2 rounded-lg hover:bg-white/5 cursor-grab active:cursor-grabbing border transition-colors 
                             ${activeMobileStudent?.id === student.id ? 'bg-blue-900/20 border-blue-500/30' : 'border-transparent hover:border-white/5'}
                        `}
                    >
                        <img src={student.avatar || "https://cdn.pixabay.com/photo/2015/10/05/22/37/blank-profile-picture-973460_1280.png"} className="w-8 h-8 rounded-full object-cover bg-zinc-800" />
                        <div className="min-w-0 flex-1">
                            <p className="text-xs font-bold truncate">{student.name}</p>
                            <div className="flex gap-2 text-[10px] text-zinc-500">
                                <span>{student.gender}</span>
                                {student.score > 0 && <span className="text-zinc-400">Score: {student.score}</span>}
                            </div>
                        </div>
                        {student.score >= 4.5 && <div className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)]"></div>}
                        <GripVertical size={14} className="text-zinc-700 opacity-0 group-hover:opacity-100" />
                    </div>
                ))}
            </div>
        </aside>

        {/* === CENTER: THE MATRIX === */}
        <main className="flex-1 flex flex-col min-w-0 bg-zinc-950 relative">
            
            {/* Header */}
            <header className="h-16 border-b border-white/10 bg-zinc-900/50 flex items-center justify-between px-4 md:px-6 shrink-0">
                <div className="flex items-center gap-4">
                    <button onClick={() => setLeftPanelOpen(!leftPanelOpen)} className={`p-2 rounded-lg transition-colors ${!leftPanelOpen ? 'text-white bg-blue-600' : 'text-zinc-400 bg-zinc-800'}`}>
                        <Users size={18} />
                    </button>
                    <div>
                        <h1 className="text-lg font-black uppercase italic tracking-tighter">Callback Matrix</h1>
                        <p className="text-[10px] text-zinc-500 font-bold uppercase hidden md:block">Friday Night Strategy</p>
                    </div>
                </div>

                <div className="flex gap-2">
                    <button onClick={() => setRightPanelOpen(!rightPanelOpen)} className={`flex items-center gap-2 px-3 md:px-4 py-2 rounded-lg text-xs font-bold uppercase transition-all ${rightPanelOpen ? 'bg-zinc-700 text-white' : 'bg-zinc-800 text-zinc-300'}`}>
                        <UploadCloud size={14} /> <span className="hidden md:inline">Assets</span>
                    </button>
                    <button onClick={handleAddSlot} className="flex items-center gap-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 px-3 md:px-4 py-2 rounded-lg text-xs font-bold uppercase transition-all">
                        <Plus size={14} /> <span className="hidden md:inline">Add Slot</span>
                    </button>
                    <button onClick={handlePublish} className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white px-3 md:px-4 py-2 rounded-lg text-xs font-bold uppercase transition-all shadow-lg shadow-blue-900/20">
                        <Share size={14} /> <span className="hidden md:inline">Publish</span>
                    </button>
                </div>
            </header>

            {/* Mobile Assignment Banner */}
            {activeMobileStudent && (
                <div className="bg-blue-600 text-white p-3 text-xs font-bold flex justify-between items-center shadow-lg z-20 animate-in slide-in-from-top">
                    <span>Tap a slot to assign: {activeMobileStudent.name}</span>
                    <button onClick={() => setActiveMobileStudent(null)} className="p-1 hover:bg-white/20 rounded"><X size={14}/></button>
                </div>
            )}

            {/* Scrollable Canvas */}
            <div className="flex-1 overflow-y-auto p-4 md:p-8 space-y-6 custom-scrollbar">
                {slots.map((slot) => (
                    <div 
                        key={slot.id}
                        onDragOver={handleDragOver}
                        onDrop={(e) => handleDrop(e, slot.id)}
                        onClick={() => { if(activeMobileStudent) handleAssign(activeMobileStudent.id, slot.id); }}
                        className={`relative rounded-2xl border transition-all overflow-hidden group
                            ${activeMobileStudent ? 'border-blue-500/50 bg-blue-900/5 cursor-pointer hover:bg-blue-900/10' : 'border-white/5 bg-zinc-900/30 hover:border-white/10'}
                        `}
                    >
                        {/* Type Indicator */}
                        <div className={`absolute left-0 top-0 bottom-0 w-1 ${slot.type === 'dance' ? 'bg-emerald-500' : slot.type === 'vocal' ? 'bg-purple-500' : 'bg-blue-500'}`} />
                        
                        <div className="p-4 pl-6 flex flex-col md:flex-row gap-6 md:items-center">
                            
                            {/* Slot Info */}
                            <div className="min-w-[200px] shrink-0">
                                <div className="flex items-center gap-2 text-zinc-500 mb-1">
                                    <Clock size={12} />
                                    <span className="text-xs font-black uppercase tracking-wider">{slot.time}</span>
                                </div>
                                <h3 className="text-lg font-bold text-white leading-tight mb-2">{slot.title}</h3>
                                {slot.materialLink ? (
                                    <a 
                                        href={slot.materialLink} 
                                        target="_blank" 
                                        rel="noopener noreferrer" 
                                        className="flex items-center gap-1.5 text-[10px] font-bold text-blue-400 hover:text-blue-300 uppercase bg-blue-900/20 px-2 py-1 rounded w-fit border border-blue-500/20"
                                        onClick={(e) => e.stopPropagation()}
                                    >
                                        <LinkIcon size={10} /> {slot.materialName || "View Sides"}
                                    </a>
                                ) : <p className="text-[10px] text-zinc-600 italic">No assets attached</p>}
                            </div>

                            {/* Assigned Grid */}
                            <div className="flex-1 w-full">
                                {slot.assignedIds.length === 0 ? (
                                    <div className="h-12 border-2 border-dashed border-white/5 rounded-xl flex items-center justify-center text-zinc-700 text-xs font-bold uppercase tracking-wider">
                                        {activeMobileStudent ? "Tap Here" : "Drag Students Here"}
                                    </div>
                                ) : (
                                    <div className="flex flex-wrap gap-2">
                                        {slot.assignedIds.map(id => {
                                            const student = students.find(s => s.id === id);
                                            if (!student) return null;
                                            return (
                                                <div key={id} className="flex items-center gap-2 bg-zinc-800 border border-white/5 pl-1 pr-2 py-1 rounded-full group/chip">
                                                    <img src={student.avatar || "https://cdn.pixabay.com/photo/2015/10/05/22/37/blank-profile-picture-973460_1280.png"} className="w-5 h-5 rounded-full object-cover" />
                                                    <span className="text-xs font-bold text-zinc-300">{student.name}</span>
                                                    <button onClick={(e) => { e.stopPropagation(); handleUnassign(id, slot.id); }} className="ml-1 text-zinc-600 hover:text-red-400 p-0.5 rounded-full hover:bg-white/10 transition-colors"><X size={12} /></button>
                                                </div>
                                            )
                                        })}
                                    </div>
                                )}
                            </div>

                            {/* Slot Actions */}
                            <button onClick={(e) => { e.stopPropagation(); handleRemoveSlot(slot.id); }} className="absolute top-2 right-2 md:static text-zinc-600 hover:text-red-500 p-2 md:p-0 transition-colors opacity-100 md:opacity-0 group-hover:opacity-100">
                                <Trash2 size={16} />
                            </button>
                        </div>
                    </div>
                ))}
            </div>
        </main>

        {/* === RIGHT: ASSET LIBRARY === */}
        <aside className={`${rightPanelOpen ? 'w-[300px]' : 'w-0'} bg-zinc-900 border-l border-white/5 transition-all duration-300 flex flex-col shrink-0 overflow-hidden`}>
             <div className="p-4 border-b border-white/5 bg-zinc-900 shrink-0 flex justify-between items-center">
                <h2 className="text-sm font-black uppercase tracking-widest flex items-center gap-2">
                    <UploadCloud size={16} className="text-blue-500"/> Library
                </h2>
                <button onClick={() => setRightPanelOpen(false)} className="md:hidden"><X size={16}/></button>
            </div>
            
            <div className="p-4 shrink-0 border-b border-white/5">
                <label className={`w-full h-24 border-2 border-dashed border-zinc-700 rounded-xl flex flex-col items-center justify-center gap-2 cursor-pointer hover:bg-white/5 transition-colors ${isUploading ? 'opacity-50 cursor-wait' : ''}`}>
                    {isUploading ? <Loader2 className="animate-spin text-blue-500" /> : <Plus className="text-zinc-500" />}
                    <span className="text-[10px] font-bold uppercase text-zinc-500">{isUploading ? "Uploading..." : "Upload PDF / MP3"}</span>
                    <input type="file" accept=".pdf,audio/*,video/*" className="hidden" onChange={handleUploadAsset} disabled={isUploading} />
                </label>
            </div>
            
            <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
                {assets.length === 0 && <p className="text-center text-zinc-600 text-xs mt-4 italic">No assets uploaded yet.</p>}
                
                {assets.map((asset, i) => (
                    <div key={i} className="bg-zinc-950 p-3 rounded-xl border border-white/5 group relative">
                        <div className="flex items-start gap-3 mb-2">
                            <div className="w-8 h-8 rounded bg-zinc-800 flex items-center justify-center shrink-0">
                                {asset.type === 'pdf' ? <FileText size={16} className="text-blue-400"/> : <Music size={16} className="text-purple-400"/>}
                            </div>
                            <div className="min-w-0">
                                <p className="text-xs font-bold text-zinc-300 truncate" title={asset.name}>{asset.name}</p>
                                <p className="text-[10px] text-zinc-600 uppercase">{asset.type}</p>
                            </div>
                        </div>
                        <button 
                            onClick={() => handleCopyAsset(asset)}
                            className="w-full py-1.5 bg-zinc-800 hover:bg-blue-600 hover:text-white text-zinc-400 rounded text-[10px] font-bold uppercase transition-colors flex items-center justify-center gap-2 border border-white/5 hover:border-blue-500"
                        >
                            <Copy size={12} /> Copy Link
                        </button>
                    </div>
                ))}
            </div>
        </aside>

    </div>
  );
}