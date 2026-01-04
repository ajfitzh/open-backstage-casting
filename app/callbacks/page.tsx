/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import React, { useState, useEffect, useMemo } from 'react';
import { 
  Users, Clock, Plus, Trash2, Share, Search, X, 
  Link as LinkIcon, Music, FileText,
  Loader2, Copy, UploadCloud, Eye, AlertTriangle, 
  Mic, Move, Theater, Calendar, Archive, EyeOff, RotateCcw, Film,
  Star, TrendingDown
} from 'lucide-react';
import { getAuditionSlots, updateAuditionSlot, getProductionAssets, createProductionAsset } from '@/app/lib/baserow'; 

// --- CONFIG ---
const DISCLAIMER_TEXT = `*** NOTICE ***
The creative team reserves the right to release actors early if requirements are not met. 
Please be prepared for all listed slots, but be aware the schedule may evolve.`;

// --- TYPES ---
interface Student {
  id: number;
  name: string;
  avatar: string;
  gender: string;
  age: string;
  score: number;
  callbackString: string;
  conflicts: string;
  breakdown: { vocal: number; acting: number; dance: number };
  notes: { vocal: string; acting: string; dance: string; admin: string };
}

interface CallbackSlot {
  id: string;
  time: string;
  title: string;
  type: 'dance' | 'vocal' | 'read';
  materialLink?: string; 
  materialName?: string; 
  assignedIds: number[];
  // UPDATED: Now tracks role assignment per student
  pairs?: { 
      name: string, 
      assignments: { studentId: number, role: string }[] 
  }[]; 
}

interface Asset {
    id: number;
    url: string;
    name: string;
    type: 'PDF' | 'Audio' | 'Video';
}

// --- DEMO DATA ---
const DEFAULT_SLOTS: CallbackSlot[] = [
  { 
    id: 'dance-1', 
    time: '10:00 AM', 
    title: 'General Dance Call (Jazz)', 
    type: 'dance', 
    materialName: "Combo Video",
    materialLink: "https://youtu.be/example",
    assignedIds: [] 
  },
  { 
    id: 'vocal-1', 
    time: '11:15 AM', 
    title: 'Ariel / Ursula Vocal Cut', 
    type: 'vocal', 
    materialName: "Sheet Music (m.32-50)",
    assignedIds: [] 
  },
  { 
    id: 'read-1', 
    time: '01:00 PM', 
    title: 'Sc 4: Ariel & Flounder', 
    type: 'read', 
    materialName: "Side #4",
    assignedIds: [] 
  },
];

// --- PARTNER MATCHER COMPONENT ---
const PartnerMatcher = ({ 
    slot, 
    students, 
    onSave, 
    onClose 
}: { 
    slot: CallbackSlot, 
    students: Student[], 
    onSave: (updatedSlot: CallbackSlot) => void, 
    onClose: () => void 
}) => {
    // 1. Detect Roles from Title (Simple Split)
    const availableRoles = useMemo(() => {
        // Split by common separators: " vs ", " & ", " / ", " and "
        const raw = slot.title.split(/ vs | & | \/ | and /i);
        // If no split found (e.g. "General Reading"), just use "Reader"
        return raw.length > 1 ? raw.map(r => r.trim()) : ["Reader 1", "Reader 2"];
    }, [slot.title]);

    const [localPairs, setLocalPairs] = useState<{ name: string, assignments: { studentId: number, role: string }[] }[]>(slot.pairs || []);
    const [unpairedIds, setUnpairedIds] = useState<number[]>([]);

    useEffect(() => {
        const pairedSet = new Set(localPairs.flatMap(p => p.assignments.map(a => a.studentId)));
        setUnpairedIds(slot.assignedIds.filter(id => !pairedSet.has(id)));
    }, [slot.assignedIds, localPairs]);

    const addPair = () => {
        setLocalPairs([...localPairs, { name: `Read ${localPairs.length + 1}`, assignments: [] }]);
    };

    const toggleStudentInPair = (studentId: number, pairIndex: number) => {
        const newPairs = [...localPairs];
        const currentPair = newPairs[pairIndex];
        
        // Check if student is already in this pair
        const existingIdx = currentPair.assignments.findIndex(a => a.studentId === studentId);

        if (existingIdx >= 0) {
            // REMOVE: Send back to tank
            currentPair.assignments.splice(existingIdx, 1);
            setUnpairedIds([...unpairedIds, studentId]);
        } else {
            // ADD: Assign first available role
            // Find which roles are already taken in this pair
            const takenRoles = new Set(currentPair.assignments.map(a => a.role));
            // Find first role NOT taken, or default to first role
            const nextRole = availableRoles.find(r => !takenRoles.has(r)) || availableRoles[0];
            
            currentPair.assignments.push({ studentId, role: nextRole });
            setUnpairedIds(unpairedIds.filter(id => id !== studentId));
        }
        setLocalPairs(newPairs);
    };

    const cycleRole = (pairIndex: number, assignmentIndex: number) => {
        const newPairs = [...localPairs];
        const assignment = newPairs[pairIndex].assignments[assignmentIndex];
        
        const currentRoleIdx = availableRoles.indexOf(assignment.role);
        const nextRoleIdx = (currentRoleIdx + 1) % availableRoles.length;
        
        assignment.role = availableRoles[nextRoleIdx];
        setLocalPairs(newPairs);
    };

    const handleSave = () => {
        onSave({ ...slot, pairs: localPairs });
        onClose();
    };

    return (
        <div className="fixed inset-0 z-[100] bg-black/90 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-zinc-900 border border-white/10 rounded-2xl w-full max-w-2xl h-[80vh] flex flex-col shadow-2xl">
                <div className="p-4 border-b border-white/10 flex justify-between items-center bg-zinc-900 rounded-t-2xl">
                    <div>
                        <h2 className="text-lg font-black uppercase italic text-white">Partner Matcher</h2>
                        <div className="flex gap-2 mt-1">
                            {availableRoles.map(r => (
                                <span key={r} className="text-[10px] font-bold bg-white/10 px-2 py-0.5 rounded text-zinc-400">{r}</span>
                            ))}
                        </div>
                    </div>
                    <button onClick={handleSave} className="bg-blue-600 px-4 py-2 rounded font-bold text-xs uppercase hover:bg-blue-500 text-white shadow-lg">Save Pairs</button>
                </div>

                <div className="flex-1 flex overflow-hidden">
                    {/* LEFT: UNPAIRED POOL */}
                    <div className="w-1/3 border-r border-white/10 p-4 bg-zinc-950 overflow-y-auto custom-scrollbar">
                        <h3 className="text-xs font-bold text-zinc-500 uppercase mb-4 sticky top-0 bg-zinc-950 py-2">Holding Tank</h3>
                        {unpairedIds.map(id => {
                            const s = students.find(st => st.id === id);
                            if (!s) return null;
                            return (
                                <div key={id} className="mb-2 p-2 bg-zinc-900 border border-white/10 rounded flex items-center gap-2 opacity-75 hover:opacity-100">
                                    <img src={s.avatar || "https://cdn.pixabay.com/photo/2015/10/05/22/37/blank-profile-picture-973460_1280.png"} className="w-6 h-6 rounded-full object-cover" />
                                    <span className="text-xs font-bold text-zinc-300">{s.name}</span>
                                </div>
                            );
                        })}
                        {unpairedIds.length === 0 && <p className="text-[10px] text-zinc-600 italic">All actors assigned!</p>}
                    </div>

                    {/* RIGHT: PAIRS */}
                    <div className="flex-1 p-4 overflow-y-auto custom-scrollbar bg-zinc-900">
                        <div className="flex justify-between mb-4 items-center">
                            <h3 className="text-xs font-bold text-zinc-500 uppercase">Reads / Groups</h3>
                            <button onClick={addPair} className="flex items-center gap-1 text-xs font-bold text-blue-400 uppercase hover:text-blue-300 bg-blue-900/20 px-3 py-1.5 rounded-full border border-blue-500/30"><Plus size={12}/> Add Read</button>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {localPairs.map((pair, idx) => (
                                <div key={idx} className="bg-zinc-800/50 border border-white/10 rounded-xl p-3 relative group">
                                    <div className="flex justify-between items-center mb-2">
                                        <input 
                                            value={pair.name} 
                                            onChange={(e) => {
                                                const copy = [...localPairs];
                                                copy[idx].name = e.target.value;
                                                setLocalPairs(copy);
                                            }}
                                            className="bg-transparent font-bold text-sm text-blue-300 outline-none w-full placeholder:text-zinc-600"
                                            placeholder="Group Name"
                                        />
                                        <button onClick={() => setLocalPairs(localPairs.filter((_, i) => i !== idx))} className="text-zinc-600 hover:text-red-500"><X size={12}/></button>
                                    </div>
                                    
                                    {/* ASSIGNED TO THIS PAIR */}
                                    <div className="space-y-1 mb-3 min-h-[40px]">
                                        {pair.assignments.map((assign, aIdx) => {
                                            const s = students.find(st => st.id === assign.studentId);
                                            if(!s) return null;
                                            return (
                                                <div key={assign.studentId} className="flex items-center justify-between bg-blue-600/20 border border-blue-500/30 text-blue-100 p-1.5 rounded group/item">
                                                    <div 
                                                        className="flex items-center gap-2 cursor-pointer"
                                                        onClick={() => toggleStudentInPair(assign.studentId, idx)} // Click name to remove
                                                        title="Click to Remove"
                                                    >
                                                        <img src={s.avatar || "https://cdn.pixabay.com/photo/2015/10/05/22/37/blank-profile-picture-973460_1280.png"} className="w-4 h-4 rounded-full object-cover" />
                                                        <span className="text-[10px] font-bold">{s.name}</span>
                                                    </div>
                                                    
                                                    {/* ROLE BADGE (Click to Cycle) */}
                                                    <button 
                                                        onClick={(e) => { e.stopPropagation(); cycleRole(idx, aIdx); }}
                                                        className="ml-2 bg-blue-500 text-white text-[8px] font-black uppercase px-1.5 py-0.5 rounded hover:bg-blue-400 transition-colors"
                                                        title="Tap to switch role"
                                                    >
                                                        {assign.role}
                                                    </button>
                                                </div>
                                            )
                                        })}
                                        {pair.assignments.length === 0 && <p className="text-[10px] text-zinc-600 italic py-2 text-center border-2 border-dashed border-zinc-800 rounded">Empty Read</p>}
                                    </div>

                                    {/* AVAILABLE TO ADD */}
                                    {unpairedIds.length > 0 && (
                                        <div className="pt-2 border-t border-white/5">
                                            <p className="text-[8px] font-bold text-zinc-500 uppercase mb-1">Tap to Add:</p>
                                            <div className="flex flex-wrap gap-1">
                                                {unpairedIds.map(id => {
                                                    const s = students.find(st => st.id === id);
                                                    if(!s) return null;
                                                    return (
                                                        <button key={id} onClick={() => toggleStudentInPair(id, idx)} className="text-[8px] bg-zinc-950 border border-white/10 px-2 py-1 rounded hover:border-blue-500 hover:text-blue-400 text-zinc-400 transition-colors">
                                                            {s.name.split(' ')[0]}
                                                        </button>
                                                    )
                                                })}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default function CallbackMatrixPage() {
  // --- STATE ---
  const [students, setStudents] = useState<Student[]>([]);
  const [slots, setSlots] = useState<CallbackSlot[]>(DEFAULT_SLOTS);
  const [assets, setAssets] = useState<Asset[]>([]);
  
  const [loading, setLoading] = useState(true);
  const [leftPanelOpen, setLeftPanelOpen] = useState(true); 
  const [rightPanelOpen, setRightPanelOpen] = useState(false); 
  const [search, setSearch] = useState("");
  const [draggedStudentId, setDraggedStudentId] = useState<number | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [activeMobileStudent, setActiveMobileStudent] = useState<Student | null>(null);
  const [inspectingStudent, setInspectingStudent] = useState<Student | null>(null);
  const [activeProductionId, setActiveProductionId] = useState<number | null>(null);
  
  // Sorting & Filtering
  const [hiddenIds, setHiddenIds] = useState<Set<number>>(new Set());
  const [showHidden, setShowHidden] = useState(false);
  const [sortMode, setSortMode] = useState<'overall' | 'vocal' | 'acting' | 'dance' | 'bottom'>('overall');

  // Modals
  const [isAddingSlot, setIsAddingSlot] = useState(false);
  const [newSlotData, setNewSlotData] = useState({ time: "02:00 PM", title: "", link: "", label: "" });
  const [pairingSlotId, setPairingSlotId] = useState<string | null>(null);

  // --- HELPERS ---
  const safeString = (val: any): string => {
    if (val === null || val === undefined) return "";
    if (typeof val === 'string') return val;
    if (typeof val === 'number') return String(val);
    if (Array.isArray(val)) return val.length > 0 ? safeString(val[0].value || val[0]) : "";
    if (typeof val === 'object') return val.value ? safeString(val.value) : "";
    return String(val);
  };

  const safeNumber = (val: any): number => {
      const s = safeString(val);
      const n = parseFloat(s);
      return isNaN(n) ? 0 : n;
  };

  // --- DATA LOADING ---
  useEffect(() => {
    async function load() {
      const rows = await getAuditionSlots();
      const activeShowIdStr = localStorage.getItem('activeShowId'); 
      const activeShowId = activeShowIdStr ? parseInt(activeShowIdStr) : null;
      setActiveProductionId(activeShowId);

      if (activeShowId) {
          const savedHidden = localStorage.getItem(`hiddenCallbacks_${activeShowId}`);
          if (savedHidden) setHiddenIds(new Set(JSON.parse(savedHidden)));
      }

      const cleanData = rows
        .filter((r: any) => {
            const prodArray = r.Production || [];
            if (!prodArray.length) return false;
            if (activeShowId && prodArray.some((p: any) => p.id === activeShowId)) return true;
            return (prodArray[0]?.value || "").toLowerCase().includes("mermaid");
        })
        .map((r: any) => ({
            id: r.id,
            name: safeString(r.Performer),
            avatar: r.Headshot?.[0]?.url || "",
            age: safeString(r.Age),
            gender: safeString(r.Gender),
            score: safeNumber(r["Average Score"] || r["Vocal Score"]), 
            callbackString: safeString(r["Callbacks"]),
            conflicts: safeString(r["Conflicts"]) || "None listed",
            breakdown: {
                vocal: safeNumber(r["Vocal Score"]),
                acting: safeNumber(r["Acting Score"]),
                dance: safeNumber(r["Dance Score"]),
            },
            notes: {
                vocal: safeString(r["Music Notes"]),
                acting: safeString(r["Acting Notes"]),
                dance: safeString(r["Choreography Notes"]),
                admin: safeString(r["Admin Notes"])
            }
        }));
      setStudents(cleanData);

      if (activeShowId) {
          try {
              const remoteAssets = await getProductionAssets(activeShowId);
              setAssets(remoteAssets.map((a: any) => ({
                  id: a.id, name: safeString(a.Name), url: a.Link, type: safeString(a.Type?.value || a.Type) as any
              })));
          } catch (e) { console.error(e); }
      }
      setLoading(false);
    }
    load();
  }, []);

  // --- ACTIONS ---
  const toggleHideStudent = (e: React.MouseEvent, id: number) => {
      e.stopPropagation();
      setHiddenIds(prev => {
          const next = new Set(prev);
          if (next.has(id)) next.delete(id);
          else next.add(id);
          if (activeProductionId) localStorage.setItem(`hiddenCallbacks_${activeProductionId}`, JSON.stringify(Array.from(next)));
          return next;
      });
  };

  const handleUploadAsset = async (e: React.ChangeEvent<HTMLInputElement>) => {
      if (!e.target.files || !e.target.files[0]) return;
      if (!activeProductionId) { alert("Please select a Production first!"); return; }
      const file = e.target.files[0];
      setIsUploading(true);
      try {
          const res = await fetch('/api/upload', {
              method: 'POST',
              body: JSON.stringify({ filename: `SIDE-${file.name}`, fileType: file.type }),
          });
          if (!res.ok) throw new Error("Sign failed");
          const { uploadUrl, publicUrl } = await res.json();
          await fetch(uploadUrl, { method: 'PUT', body: file, headers: { "Content-Type": file.type, "x-amz-acl": "public-read" } });
          const type = file.type.includes('pdf') ? 'PDF' : file.type.includes('audio') ? 'Audio' : 'Video';
          await createProductionAsset(file.name, publicUrl, type, activeProductionId);
          setAssets(prev => [...prev, { id: Date.now(), name: file.name, url: publicUrl, type }]);
      } catch (err) { alert("Upload failed."); } finally { setIsUploading(false); }
  };

  const handleCopyAsset = (asset: Asset) => {
      navigator.clipboard.writeText(asset.url);
      setNewSlotData(prev => ({ ...prev, link: asset.url, label: asset.name }));
      alert("Link copied! It will auto-fill if you create a slot now.");
  };

  const handleCreateSlot = (e: React.FormEvent) => {
      e.preventDefault();
      const title = newSlotData.title || "New Slot";
      const type = title.toLowerCase().includes('dance') ? 'dance' : title.toLowerCase().includes('vocal') ? 'vocal' : 'read';
      
      setSlots(prev => [...prev, {
          id: Date.now().toString(),
          time: newSlotData.time,
          title,
          type,
          materialLink: newSlotData.link || undefined,
          materialName: newSlotData.link ? (newSlotData.label || "Material") : undefined,
          assignedIds: []
      }]);
      setIsAddingSlot(false);
      setNewSlotData({ time: "", title: "", link: "", label: "" });
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
              // UPDATED: Include Role Info
              if (slot.pairs && slot.pairs.length > 0) {
                  // Find assignment
                  const pair = slot.pairs.find(p => p.assignments.some(a => a.studentId === id));
                  if (pair) {
                      const assignment = pair.assignments.find(a => a.studentId === id);
                      entry += ` [${pair.name}: ${assignment?.role}]`;
                  }
              }
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
        .filter(s => {
            const matchesSearch = s.name.toLowerCase().includes(search.toLowerCase());
            const isVisible = showHidden || !hiddenIds.has(s.id);
            return matchesSearch && isVisible;
        })
        .sort((a, b) => {
            if (sortMode === 'overall') return b.score - a.score;
            if (sortMode === 'vocal') return b.breakdown.vocal - a.breakdown.vocal;
            if (sortMode === 'acting') return b.breakdown.acting - a.breakdown.acting;
            if (sortMode === 'dance') return b.breakdown.dance - a.breakdown.dance;
            if (sortMode === 'bottom') return a.score - b.score; 
            return 0;
        });
  }, [students, search, hiddenIds, showHidden, sortMode]);

  const getDisplayScore = (student: Student) => {
      if (sortMode === 'vocal') return `Vocal: ${student.breakdown.vocal}`;
      if (sortMode === 'acting') return `Act: ${student.breakdown.acting}`;
      if (sortMode === 'dance') return `Dance: ${student.breakdown.dance}`;
      return `Avg: ${student.score.toFixed(1)}`;
  };

  const getSortLabel = () => {
      switch(sortMode) {
          case 'overall': return "Top Overall Scores";
          case 'vocal': return "Top Vocal Scores";
          case 'acting': return "Top Acting Scores";
          case 'dance': return "Top Dance Scores";
          case 'bottom': return "Lowest Scores (Cuts)";
      }
  };

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
        <aside className={`${leftPanelOpen ? 'w-[320px]' : 'w-0'} bg-zinc-900 border-r border-white/5 transition-all duration-300 flex flex-col shrink-0 overflow-hidden`}>
            {/* Header */}
            <div className="p-4 border-b border-white/5 bg-zinc-900 shrink-0 flex justify-between items-center">
                <div className="flex items-center gap-2">
                    <Users size={18} className="text-zinc-400" />
                    <h2 className="text-sm font-black uppercase tracking-widest">Bench</h2>
                    <span className="bg-zinc-800 text-zinc-500 px-2 py-0.5 rounded-full text-[10px] font-bold">{benchList.length}</span>
                </div>
                <div className="flex gap-2">
                    <button onClick={() => setShowHidden(!showHidden)} className={`p-2 rounded-lg transition-colors group relative ${showHidden ? 'bg-amber-900/30 text-amber-500' : 'text-zinc-600 hover:text-zinc-400'}`}>
                        {showHidden ? <Eye size={16} /> : <EyeOff size={16} />}
                        <span className="absolute bottom-full right-0 mb-2 hidden group-hover:block bg-black text-white text-[10px] font-bold px-2 py-1 rounded whitespace-nowrap z-50">
                            {showHidden ? "Hide Archived" : "Show Archived"}
                        </span>
                    </button>
                    <button onClick={() => setLeftPanelOpen(false)} className="md:hidden text-zinc-500"><X size={16}/></button>
                </div>
            </div>
            
            {/* SORT BAR */}
            <div className="px-2 pt-2 flex gap-1 justify-between shrink-0">
                {[
                    { id: 'overall', icon: Star, label: "Top Overall" },
                    { id: 'vocal', icon: Mic, label: "Top Vocal" },
                    { id: 'acting', icon: Theater, label: "Top Acting" },
                    { id: 'dance', icon: Move, label: "Top Dance" },
                    { id: 'bottom', icon: TrendingDown, label: "Lowest Scores" },
                ].map((btn) => (
                    <button key={btn.id} onClick={() => setSortMode(btn.id as any)} className={`group relative flex-1 py-2 rounded flex justify-center transition-colors ${sortMode === btn.id ? 'bg-blue-600 text-white' : btn.id === 'bottom' ? 'bg-zinc-900 text-red-400 hover:bg-zinc-800' : 'bg-zinc-900 text-zinc-500 hover:bg-zinc-800'}`}>
                        <btn.icon size={14} />
                        <span className="absolute bottom-full mb-2 hidden group-hover:block bg-black border border-white/10 text-white text-[10px] font-bold px-2 py-1 rounded whitespace-nowrap z-50 shadow-xl">{btn.label}</span>
                    </button>
                ))}
            </div>

            <div className="px-3 pb-2 pt-1 text-center border-b border-white/5 bg-zinc-900/50">
                <p className="text-[9px] font-black uppercase tracking-widest text-zinc-500">Sorting By: <span className="text-blue-400">{getSortLabel()}</span></p>
            </div>

            <div className="p-2 border-b border-white/5 shrink-0">
                <div className="relative">
                    <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
                    <input value={search} onChange={(e) => setSearch(e.target.value)} className="bg-zinc-950 rounded p-2 pl-9 text-xs w-full border border-white/5 focus:border-blue-500 outline-none" placeholder="Search..." />
                </div>
            </div>

            {/* List */}
            <div className="flex-1 overflow-y-auto p-2 space-y-1 custom-scrollbar pb-20">
                {benchList.map(student => (
                    <div 
                        key={student.id} draggable onDragStart={(e) => handleDragStart(e, student.id)}
                        onClick={() => { if (window.innerWidth < 768) { setActiveMobileStudent(student); setLeftPanelOpen(false); }}}
                        className={`group flex items-center gap-3 p-2 rounded-lg hover:bg-white/5 cursor-grab active:cursor-grabbing border relative transition-colors ${activeMobileStudent?.id === student.id ? 'bg-blue-900/20 border-blue-500/30' : 'border-transparent'} ${hiddenIds.has(student.id) ? 'opacity-50 grayscale' : ''}`}
                    >
                        <img src={student.avatar || "https://cdn.pixabay.com/photo/2015/10/05/22/37/blank-profile-picture-973460_1280.png"} className="w-8 h-8 rounded-full object-cover bg-zinc-800" />
                        <div className="min-w-0 flex-1">
                            <p className="text-xs font-bold truncate">{student.name}</p>
                            <div className="flex gap-2 text-[10px] text-zinc-500">
                                <span className={`font-bold ${student.score >= 4 ? 'text-green-400' : 'text-zinc-400'}`}>{getDisplayScore(student)}</span>
                            </div>
                        </div>
                        <div className="flex items-center gap-1">
                            <button onClick={(e) => toggleHideStudent(e, student.id)} className={`group/btn relative p-1.5 rounded-full transition-colors ${hiddenIds.has(student.id) ? 'text-amber-500 bg-amber-900/20' : 'text-zinc-600 hover:text-white hover:bg-white/10'}`}>
                                {hiddenIds.has(student.id) ? <RotateCcw size={14} /> : <Archive size={14} />}
                                <span className="absolute bottom-full right-0 mb-2 hidden group-hover/btn:block bg-black border border-white/10 text-white text-[10px] font-bold px-2 py-1 rounded whitespace-nowrap z-50 shadow-xl">{hiddenIds.has(student.id) ? "Restore to Bench" : "Archive (Hide)"}</span>
                            </button>
                            <button onClick={(e) => { e.stopPropagation(); setInspectingStudent(student); }} className="group/btn relative p-1.5 rounded-full text-zinc-600 hover:text-white hover:bg-white/10 transition-colors">
                                <Eye size={14} />
                                <span className="absolute bottom-full right-0 mb-2 hidden group-hover/btn:block bg-black border border-white/10 text-white text-[10px] font-bold px-2 py-1 rounded whitespace-nowrap z-50 shadow-xl">View Profile</span>
                            </button>
                        </div>
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
                    <button onClick={() => setIsAddingSlot(true)} className="flex items-center gap-2 bg-zinc-800 text-zinc-300 px-3 py-2 rounded-lg text-xs font-bold uppercase"><Plus size={14} /> <span className="hidden md:inline">Slot</span></button>
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
                        className={`relative rounded-2xl border transition-all overflow-hidden group ${activeMobileStudent ? 'border-blue-500/50 bg-blue-900/5 cursor-pointer' : 'border-white/5 bg-zinc-900/30 hover:border-white/10'}`}
                    >
                        <div className={`absolute left-0 top-0 bottom-0 w-1 ${slot.type === 'dance' ? 'bg-emerald-500' : slot.type === 'vocal' ? 'bg-purple-500' : 'bg-blue-500'}`} />
                        <div className="p-4 pl-6 flex flex-col md:flex-row gap-6 md:items-center">
                            
                            {/* SLOT INFO */}
                            <div className="min-w-[200px] shrink-0">
                                <div className="flex items-center gap-2 text-zinc-500 mb-1"><Clock size={12} /><span className="text-xs font-black uppercase tracking-wider">{slot.time}</span></div>
                                <h3 className="text-lg font-bold text-white leading-tight mb-2">{slot.title}</h3>
                                {slot.materialLink ? (
                                    <a href={slot.materialLink} target="_blank" className="flex items-center gap-1.5 text-[10px] font-bold text-blue-400 uppercase bg-blue-900/20 px-2 py-1 rounded w-fit border border-blue-500/20" onClick={(e) => e.stopPropagation()}><LinkIcon size={10} /> {slot.materialName || "Sides"}</a>
                                ) : <p className="text-[10px] text-zinc-600 italic">No assets attached</p>}
                            </div>

                            {/* ASSIGNED GRID or PAIRS */}
                            <div className="flex-1 w-full">
                                {slot.pairs && slot.pairs.length > 0 ? (
                                    <div className="flex flex-wrap gap-2">
                                        {slot.pairs.map((pair, pIdx) => (
                                            <div key={pIdx} className="bg-zinc-800/80 border border-blue-500/30 rounded-lg px-3 py-1.5 flex items-center gap-2">
                                                <span className="text-[10px] font-black text-blue-400 uppercase mr-1">{pair.name}:</span>
                                                <div className="flex -space-x-1.5">
                                                    {pair.assignments.map(a => {
                                                        const s = students.find(st => st.id === a.studentId);
                                                        return s ? (
                                                            <div key={a.studentId} className="relative group/face">
                                                                <img src={s.avatar || "https://cdn.pixabay.com/photo/2015/10/05/22/37/blank-profile-picture-973460_1280.png"} className="w-6 h-6 rounded-full border border-black object-cover" title={`${s.name} (${a.role})`} />
                                                                <span className="absolute bottom-full mb-1 hidden group-hover/face:block bg-black text-white text-[8px] px-1 py-0.5 rounded whitespace-nowrap">{a.role}</span>
                                                            </div>
                                                        ) : null;
                                                    })}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="flex flex-wrap gap-2">
                                        {slot.assignedIds.length === 0 && <span className="text-zinc-700 text-xs font-bold uppercase tracking-wider">Drag students here...</span>}
                                        {slot.assignedIds.map(id => {
                                            const student = students.find(s => s.id === id);
                                            if (!student) return null;
                                            return (
                                                <div key={id} onClick={(e) => { e.stopPropagation(); setInspectingStudent(student); }} className="flex items-center gap-2 bg-zinc-800 border border-white/5 pl-1 pr-2 py-1 rounded-full cursor-pointer hover:bg-zinc-700">
                                                    <img src={student.avatar || "https://cdn.pixabay.com/photo/2015/10/05/22/37/blank-profile-picture-973460_1280.png"} className="w-5 h-5 rounded-full object-cover" />
                                                    <span className="text-xs font-bold text-zinc-300">{student.name}</span>
                                                    <button onClick={(e) => { e.stopPropagation(); handleUnassign(id, slot.id); }} className="ml-1 text-zinc-600 hover:text-red-400"><X size={12} /></button>
                                                </div>
                                            )
                                        })}
                                    </div>
                                )}
                            </div>

                            {/* SLOT ACTIONS */}
                            <div className="flex flex-col gap-2 items-end">
                                <button onClick={(e) => { e.stopPropagation(); setPairingSlotId(slot.id); }} className="text-zinc-500 hover:text-blue-400 p-1.5 bg-zinc-800/50 rounded-lg hover:bg-zinc-800 transition-colors" title="Manage Pairs / Reads"><Users size={16} /></button>
                                <button onClick={(e) => { e.stopPropagation(); handleRemoveSlot(slot.id); }} className="text-zinc-600 hover:text-red-500 p-1.5 hover:bg-zinc-800 rounded-lg transition-colors"><Trash2 size={16} /></button>
                            </div>
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

        {/* MODAL: ADD SLOT */}
        {isAddingSlot && (
            <div className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setIsAddingSlot(false)}>
                <form onSubmit={handleCreateSlot} onClick={e => e.stopPropagation()} className="bg-zinc-900 border border-white/10 rounded-2xl shadow-2xl w-full max-w-sm p-6 space-y-4">
                    <h3 className="text-lg font-black uppercase italic">Create Callback Slot</h3>
                    <div>
                        <label className="text-[10px] font-bold uppercase text-zinc-500">Time</label>
                        <input autoFocus value={newSlotData.time} onChange={e => setNewSlotData({...newSlotData, time: e.target.value})} className="w-full bg-zinc-950 border border-white/10 rounded p-2 text-sm focus:border-blue-500 outline-none text-white" />
                    </div>
                    <div>
                        <label className="text-[10px] font-bold uppercase text-zinc-500">Title</label>
                        <input placeholder="e.g. Ariel Reading" value={newSlotData.title} onChange={e => setNewSlotData({...newSlotData, title: e.target.value})} className="w-full bg-zinc-950 border border-white/10 rounded p-2 text-sm focus:border-blue-500 outline-none text-white" />
                    </div>
                    <div>
                        <label className="text-[10px] font-bold uppercase text-zinc-500">Asset Link (Optional)</label>
                        <input placeholder="https://..." value={newSlotData.link} onChange={e => setNewSlotData({...newSlotData, link: e.target.value})} className="w-full bg-zinc-950 border border-white/10 rounded p-2 text-sm focus:border-blue-500 outline-none text-white" />
                        {newSlotData.link && (
                            <input placeholder="Label (e.g. Sheet Music)" value={newSlotData.label} onChange={e => setNewSlotData({...newSlotData, label: e.target.value})} className="w-full bg-zinc-950 border border-white/10 rounded p-2 text-sm mt-2 focus:border-blue-500 outline-none text-white" />
                        )}
                    </div>
                    <div className="flex gap-2 pt-2">
                        <button type="button" onClick={() => setIsAddingSlot(false)} className="flex-1 py-3 bg-zinc-800 rounded-lg text-xs font-bold uppercase hover:bg-zinc-700">Cancel</button>
                        <button type="submit" className="flex-1 py-3 bg-blue-600 rounded-lg text-xs font-bold uppercase hover:bg-blue-500 text-white">Create Slot</button>
                    </div>
                </form>
            </div>
        )}

        {/* MODAL: PARTNER MATCHER (With Role Logic) */}
        {pairingSlotId && (
            <PartnerMatcher 
                slot={slots.find(s => s.id === pairingSlotId)!}
                students={students}
                onClose={() => setPairingSlotId(null)}
                onSave={(updatedSlot) => {
                    setSlots(prev => prev.map(s => s.id === updatedSlot.id ? updatedSlot : s));
                }}
            />
        )}

        {/* MODAL: INSPECTOR */}
        {inspectingStudent && (
             <div className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setInspectingStudent(null)}>
                 <div className="bg-zinc-900 border border-white/10 rounded-2xl shadow-2xl max-w-lg w-full max-h-[85vh] overflow-hidden flex flex-col" onClick={(e) => e.stopPropagation()}>
                     <div className="p-6 pb-4 border-b border-white/5 flex gap-4 items-start">
                         <img src={inspectingStudent.avatar || "https://cdn.pixabay.com/photo/2015/10/05/22/37/blank-profile-picture-973460_1280.png"} className="w-20 h-20 rounded-xl object-cover bg-zinc-800" />
                         <div className="flex-1">
                             <h2 className="text-2xl font-black uppercase italic leading-none">{inspectingStudent.name}</h2>
                             <p className="text-zinc-500 text-xs font-bold uppercase mt-1">Age {inspectingStudent.age} • {inspectingStudent.gender}</p>
                             <div className="flex gap-2 mt-3">
                                <div className="bg-blue-900/30 text-blue-300 px-3 py-1 rounded text-xs font-bold">Vocal: {inspectingStudent.breakdown.vocal || '-'}</div>
                                <div className="bg-purple-900/30 text-purple-300 px-3 py-1 rounded text-xs font-bold">Dance: {inspectingStudent.breakdown.dance || '-'}</div>
                                <div className="bg-emerald-900/30 text-emerald-300 px-3 py-1 rounded text-xs font-bold">Act: {inspectingStudent.breakdown.acting || '-'}</div>
                             </div>
                         </div>
                         <button onClick={() => setInspectingStudent(null)} className="p-2 bg-zinc-800 rounded-full hover:bg-zinc-700 text-zinc-400"><X size={20}/></button>
                     </div>
                     <div className="p-6 overflow-y-auto space-y-6 custom-scrollbar">
                        <div className="bg-red-900/10 border border-red-500/20 p-4 rounded-xl">
                            <h3 className="text-red-400 font-black uppercase text-xs tracking-widest flex items-center gap-2 mb-2"><Calendar size={14} /> Conflicts</h3>
                            <p className="text-zinc-300 text-sm leading-relaxed">{inspectingStudent.conflicts}</p>
                        </div>
                        <div className="space-y-4">
                            {inspectingStudent.notes.vocal && <div><h4 className="text-xs font-bold uppercase text-zinc-500 mb-1 flex items-center gap-2"><Mic size={12}/> Music Notes</h4><p className="text-sm text-zinc-300 bg-zinc-950 p-3 rounded-lg border border-white/5">{inspectingStudent.notes.vocal}</p></div>}
                            {inspectingStudent.notes.acting && <div><h4 className="text-xs font-bold uppercase text-zinc-500 mb-1 flex items-center gap-2"><Theater size={12}/> Acting Notes</h4><p className="text-sm text-zinc-300 bg-zinc-950 p-3 rounded-lg border border-white/5">{inspectingStudent.notes.acting}</p></div>}
                            {inspectingStudent.notes.dance && <div><h4 className="text-xs font-bold uppercase text-zinc-500 mb-1 flex items-center gap-2"><Move size={12}/> Choreography Notes</h4><p className="text-sm text-zinc-300 bg-zinc-950 p-3 rounded-lg border border-white/5">{inspectingStudent.notes.dance}</p></div>}
                            {inspectingStudent.notes.admin && <div><h4 className="text-xs font-bold uppercase text-zinc-500 mb-1 flex items-center gap-2"><AlertTriangle size={12}/> Admin Notes</h4><p className="text-sm text-zinc-300 bg-zinc-950 p-3 rounded-lg border border-white/5">{inspectingStudent.notes.admin}</p></div>}
                        </div>
                     </div>
                 </div>
             </div>
        )}
    </div>
  );
}