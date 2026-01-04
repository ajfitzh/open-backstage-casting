/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import React, { useState, useEffect, useMemo } from 'react';
import { 
  Users, Clock, Plus, Trash2, Share, Search, X, 
  GripVertical, Link as LinkIcon, Music, FileText,
  Loader2, Copy, UploadCloud, CheckCircle2, Film
} from 'lucide-react';
// IMPORT THE NEW FUNCTIONS
import { getAuditionSlots, updateAuditionSlot, getProductionAssets, createProductionAsset } from '@/app/lib/baserow'; 

// --- CONFIG ---
const DISCLAIMER_TEXT = `*** NOTICE ***
The creative team reserves the right to release actors early if requirements are not met. 
Please be prepared for all listed slots, but be aware the schedule may evolve.`;

interface Student {
  id: number;
  name: string;
  avatar: string;
  score: number;
  callbackString: string;
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
    id: number;
    url: string;
    name: string;
    type: 'PDF' | 'Audio' | 'Video';
}

const DEFAULT_SLOTS: CallbackSlot[] = [
  { id: 'dance-1', time: '10:00 AM', title: 'General Dance Call', type: 'dance', assignedIds: [] },
];

export default function CallbackMatrixPage() {
  const [students, setStudents] = useState<Student[]>([]);
  const [slots, setSlots] = useState<CallbackSlot[]>(DEFAULT_SLOTS);
  
  // THE PERSISTENT LIBRARY
  const [assets, setAssets] = useState<Asset[]>([]); 
  
  const [loading, setLoading] = useState(true);
  const [leftPanelOpen, setLeftPanelOpen] = useState(true); 
  const [rightPanelOpen, setRightPanelOpen] = useState(true); // Open by default for prep
  const [search, setSearch] = useState("");
  const [draggedStudentId, setDraggedStudentId] = useState<number | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [activeMobileStudent, setActiveMobileStudent] = useState<Student | null>(null);
  
  const [activeProductionId, setActiveProductionId] = useState<number | null>(null);

  // --- DATA LOADING ---
  useEffect(() => {
    async function load() {
      const rows = await getAuditionSlots();
      const activeShowIdStr = localStorage.getItem('activeShowId'); 
      const activeShowId = activeShowIdStr ? parseInt(activeShowIdStr) : null;
      setActiveProductionId(activeShowId);

      // 1. Load Students for this show
      const cleanData = rows
        .filter((r: any) => {
            const prodArray = r.Production || [];
            if (!prodArray.length) return false;
            if (activeShowId && prodArray.some((p: any) => p.id === activeShowId)) return true;
            return (prodArray[0]?.value || "").toLowerCase().includes("mermaid"); // Fallback
        })
        .map((r: any) => ({
            id: r.id,
            name: r.Performer?.[0]?.value || "Unknown",
            avatar: r.Headshot?.[0]?.url || "",
            score: parseFloat(r["Vocal Score"]) || 0,
            callbackString: r["Callbacks"] || ""
        }));
      setStudents(cleanData);

      // 2. LOAD ASSETS FOR THIS SHOW (Persistent Library)
      if (activeShowId) {
          try {
              const remoteAssets = await getProductionAssets(activeShowId);
              const formattedAssets = remoteAssets.map((a: any) => ({
                  id: a.id,
                  name: a.Name,
                  url: a.Link,
                  type: a.Type?.value || 'PDF'
              }));
              setAssets(formattedAssets);
          } catch (e) {
              console.error("Failed to load assets", e);
          }
      }

      setLoading(false);
    }
    load();
  }, []);

  // --- ASSET ACTIONS ---
  const handleUploadAsset = async (e: React.ChangeEvent<HTMLInputElement>) => {
      if (!e.target.files || !e.target.files[0]) return;
      if (!activeProductionId) { alert("Please select a Production first!"); return; }

      const file = e.target.files[0];
      setIsUploading(true);
      
      try {
          // A. Get Permission
          const res = await fetch('/api/upload', {
              method: 'POST',
              body: JSON.stringify({ filename: `SIDE-${file.name}`, fileType: file.type }),
          });
          if (!res.ok) throw new Error("Sign failed");
          const { uploadUrl, publicUrl } = await res.json();

          // B. Upload to DigitalOcean
          await fetch(uploadUrl, {
              method: 'PUT',
              body: file,
              headers: { "Content-Type": file.type, "x-amz-acl": "public-read" },
          });

          // C. Save to Baserow (Persistent!)
          const type = file.type.includes('pdf') ? 'PDF' : file.type.includes('audio') ? 'Audio' : 'Video';
          await createProductionAsset(file.name, publicUrl, type, activeProductionId);

          // D. Update Local State
          setAssets(prev => [...prev, { id: Date.now(), name: file.name, url: publicUrl, type }]);
          
      } catch (err) {
          console.error(err);
          alert("Upload failed. Check API keys.");
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
      const time = prompt("Time (e.g. 2:00 PM):", "2:00 PM");
      if(!time) return;
      const title = prompt("Title (e.g. Ursula Sides):", "New Slot");
      if(!title) return;
      
      const link = prompt("Material Link (Paste from Library):");
      
      const newSlot: CallbackSlot = {
          id: Date.now().toString(),
          time,
          title,
          type: title.toLowerCase().includes('dance') ? 'dance' : title.toLowerCase().includes('vocal') ? 'vocal' : 'read',
          materialLink: link || undefined,
          materialName: link ? "View Sides" : undefined,
          assignedIds: []
      };
      setSlots(prev => [...prev, newSlot]);
  };

  const handleRemoveSlot = (id: string) => setSlots(prev => prev.filter(s => s.id !== id));

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
      if(!confirm("Publish updates to Baserow?")) return;
      const updates: Record<number, string> = {};
      slots.forEach(slot => {
          slot.assignedIds.forEach(id => {
              let entry = `${slot.time}: ${slot.title}`;
              if (slot.materialLink) entry += ` (Link: ${slot.materialLink})`;
              if (updates[id]) updates[id] += `\n${entry}`;
              else updates[id] = entry;
          });
      });

      let count = 0;
      for (const [id, text] of Object.entries(updates)) {
          const finalString = `${text}\n\n${DISCLAIMER_TEXT}`;
          await updateAuditionSlot(Number(id), { "Callbacks": finalString });
          count++;
      }
      alert(`Published ${count} schedules!`);
  };

  const benchList = useMemo(() => {
      return students
        .filter(s => s.name.toLowerCase().includes(search.toLowerCase()))
        .sort((a, b) => b.score - a.score); 
  }, [students, search]);

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
        
        {/* LEFT: BENCH */}
        <aside className={`${leftPanelOpen ? 'w-[300px]' : 'w-0'} bg-zinc-900 border-r border-white/5 transition-all duration-300 flex flex-col shrink-0 overflow-hidden`}>
            <div className="p-4 border-b border-white/5 bg-zinc-900 shrink-0 flex justify-between items-center">
                <div className="flex items-center gap-2">
                    <Users size={18} className="text-zinc-400" />
                    <h2 className="text-sm font-black uppercase tracking-widest">Bench</h2>
                    <span className="bg-zinc-800 text-zinc-500 px-2 py-0.5 rounded-full text-[10px] font-bold">{benchList.length}</span>
                </div>
                <button onClick={() => setLeftPanelOpen(false)} className="md:hidden"><X size={16}/></button>
            </div>
            <div className="p-2 border-b border-white/5 shrink-0">
                <input value={search} onChange={(e) => setSearch(e.target.value)} className="bg-zinc-950 rounded p-2 text-xs w-full border border-white/5 focus:border-blue-500 outline-none" placeholder="Search..." />
            </div>
            <div className="flex-1 overflow-y-auto p-2 space-y-1 custom-scrollbar pb-20">
                {benchList.map(student => (
                    <div 
                        key={student.id} draggable onDragStart={(e) => handleDragStart(e, student.id)}
                        onClick={() => { if (window.innerWidth < 768) { setActiveMobileStudent(student); setLeftPanelOpen(false); }}}
                        className={`flex items-center gap-3 p-2 rounded-lg hover:bg-white/5 cursor-grab active:cursor-grabbing border ${activeMobileStudent?.id === student.id ? 'bg-blue-900/20 border-blue-500/30' : 'border-transparent'}`}
                    >
                        <img src={student.avatar || "https://cdn.pixabay.com/photo/2015/10/05/22/37/blank-profile-picture-973460_1280.png"} className="w-8 h-8 rounded-full object-cover bg-zinc-800" />
                        <div className="min-w-0 flex-1"><p className="text-xs font-bold truncate">{student.name}</p></div>
                        {student.score >= 4.5 && <div className="w-2 h-2 rounded-full bg-emerald-500"></div>}
                    </div>
                ))}
            </div>
        </aside>

        {/* CENTER: MATRIX */}
        <main className="flex-1 flex flex-col min-w-0 bg-zinc-950 relative">
            <header className="h-16 border-b border-white/10 bg-zinc-900/50 flex items-center justify-between px-6 shrink-0">
                <div className="flex items-center gap-4">
                    <button onClick={() => setLeftPanelOpen(!leftPanelOpen)} className={`p-2 rounded-lg ${!leftPanelOpen ? 'bg-blue-600' : 'bg-zinc-800'}`}><Users size={18} /></button>
                    <div><h1 className="text-lg font-black uppercase italic tracking-tighter">Callback Matrix</h1></div>
                </div>
                <div className="flex gap-2">
                    <button onClick={() => setRightPanelOpen(!rightPanelOpen)} className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-bold uppercase ${rightPanelOpen ? 'bg-zinc-700' : 'bg-zinc-800 text-zinc-300'}`}><UploadCloud size={14} /> <span className="hidden md:inline">Library</span></button>
                    <button onClick={handleAddSlot} className="flex items-center gap-2 bg-zinc-800 text-zinc-300 px-3 py-2 rounded-lg text-xs font-bold uppercase"><Plus size={14} /> <span className="hidden md:inline">Slot</span></button>
                    <button onClick={handlePublish} className="flex items-center gap-2 bg-blue-600 text-white px-3 py-2 rounded-lg text-xs font-bold uppercase shadow-lg shadow-blue-900/20"><Share size={14} /> <span className="hidden md:inline">Publish</span></button>
                </div>
            </header>

            {activeMobileStudent && (
                <div className="bg-blue-600 text-white p-3 text-xs font-bold flex justify-between items-center shadow-lg z-20">
                    <span>Assigning: {activeMobileStudent.name}</span>
                    <button onClick={() => setActiveMobileStudent(null)} className="p-1 hover:bg-white/20 rounded"><X size={14}/></button>
                </div>
            )}

            <div className="flex-1 overflow-y-auto p-4 md:p-8 space-y-6 custom-scrollbar">
                {slots.map((slot) => (
                    <div 
                        key={slot.id} onDragOver={handleDragOver} onDrop={(e) => handleDrop(e, slot.id)}
                        onClick={() => { if(activeMobileStudent) handleAssign(activeMobileStudent.id, slot.id); }}
                        className={`relative rounded-2xl border transition-all overflow-hidden group ${activeMobileStudent ? 'border-blue-500/50 bg-blue-900/5 cursor-pointer' : 'border-white/5 bg-zinc-900/30'}`}
                    >
                        <div className={`absolute left-0 top-0 bottom-0 w-1 ${slot.type === 'dance' ? 'bg-emerald-500' : slot.type === 'vocal' ? 'bg-purple-500' : 'bg-blue-500'}`} />
                        <div className="p-4 pl-6 flex flex-col md:flex-row gap-6 md:items-center">
                            <div className="min-w-[200px] shrink-0">
                                <div className="flex items-center gap-2 text-zinc-500 mb-1"><Clock size={12} /><span className="text-xs font-black uppercase tracking-wider">{slot.time}</span></div>
                                <h3 className="text-lg font-bold text-white leading-tight mb-2">{slot.title}</h3>
                                {slot.materialLink ? (
                                    <a href={slot.materialLink} target="_blank" className="flex items-center gap-1.5 text-[10px] font-bold text-blue-400 uppercase bg-blue-900/20 px-2 py-1 rounded w-fit border border-blue-500/20" onClick={(e) => e.stopPropagation()}><LinkIcon size={10} /> {slot.materialName || "Sides"}</a>
                                ) : <p className="text-[10px] text-zinc-600 italic">No assets</p>}
                            </div>
                            <div className="flex-1 flex flex-wrap gap-2 min-h-[40px] items-center">
                                {slot.assignedIds.length === 0 && <span className="text-zinc-700 text-xs font-bold uppercase tracking-wider">Empty Slot</span>}
                                {slot.assignedIds.map(id => {
                                    const student = students.find(s => s.id === id);
                                    if (!student) return null;
                                    return (
                                        <div key={id} className="flex items-center gap-2 bg-zinc-800 border border-white/5 pl-1 pr-2 py-1 rounded-full"><img src={student.avatar} className="w-5 h-5 rounded-full object-cover" /><span className="text-xs font-bold text-zinc-300">{student.name}</span><button onClick={(e) => { e.stopPropagation(); handleUnassign(id, slot.id); }} className="ml-1 text-zinc-600 hover:text-red-400"><X size={12} /></button></div>
                                    )
                                })}
                            </div>
                            <button onClick={(e) => { e.stopPropagation(); handleRemoveSlot(slot.id); }} className="text-zinc-600 hover:text-red-500 p-2"><Trash2 size={16} /></button>
                        </div>
                    </div>
                ))}
            </div>
        </main>

        {/* RIGHT: ASSET LIBRARY */}
        <aside className={`${rightPanelOpen ? 'w-[300px]' : 'w-0'} bg-zinc-900 border-l border-white/5 transition-all duration-300 flex flex-col shrink-0 overflow-hidden`}>
             <div className="p-4 border-b border-white/5 bg-zinc-900 shrink-0 flex justify-between items-center">
                <h2 className="text-sm font-black uppercase tracking-widest flex items-center gap-2"><UploadCloud size={16} className="text-blue-500"/> Library</h2>
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
                {assets.map((asset, i) => (
                    <div key={i} className="bg-zinc-950 p-3 rounded-xl border border-white/5 group relative">
                        <div className="flex items-start gap-3 mb-2">
                            <div className="w-8 h-8 rounded bg-zinc-800 flex items-center justify-center shrink-0">
                                {asset.type === 'PDF' ? <FileText size={16} className="text-blue-400"/> : asset.type === 'Video' ? <Film size={16} className="text-pink-400"/> : <Music size={16} className="text-purple-400"/>}
                            </div>
                            <div className="min-w-0">
                                <p className="text-xs font-bold text-zinc-300 truncate" title={asset.name}>{asset.name}</p>
                                <p className="text-[10px] text-zinc-600 uppercase">{asset.type}</p>
                            </div>
                        </div>
                        <button onClick={() => handleCopyAsset(asset)} className="w-full py-1.5 bg-zinc-800 hover:bg-blue-600 hover:text-white text-zinc-400 rounded text-[10px] font-bold uppercase transition-colors flex items-center justify-center gap-2 border border-white/5 hover:border-blue-500"><Copy size={12} /> Copy Link</button>
                    </div>
                ))}
            </div>
        </aside>
    </div>
  );
}