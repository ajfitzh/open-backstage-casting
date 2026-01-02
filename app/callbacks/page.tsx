/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import React, { useState, useMemo, useEffect } from 'react';
import { 
  Users, Music, Star, Search, Loader2, Plus, 
  Trash2, ArrowDownAZ, ArrowUpNarrowWide, PieChart, AlertCircle, MoveRight
} from 'lucide-react';
import { getAuditionSlots } from '@/app/lib/baserow'; 
import ActorProfileModal from '@/app/components/ActorProfileModal'; 

// --- TYPES ---
interface CallbackCandidate {
  id: number;
  name: string;
  headshot: string;
  score: number;
  dance: number;
  acting: number;
  groupId: string; 
  gender: string;
  notes: string;
  age: string;
  height: string;
  birthdate: string; 
  tenure: string; 
  conflicts: string;
  song: string;
  monologue: string;
  bio: string;
  email: string;
  phone: string;
  pastRoles: string[]; 
  actingNotes: string;
  vocalNotes: string;
  danceNotes: string;
  adminNotes: string;
}

interface CallbackColumn {
  id: string;
  title: string;
  type: 'pool' | 'role' | 'dance';
  color: string;
}

const DEFAULT_AVATAR = "https://cdn.pixabay.com/photo/2015/10/05/22/37/blank-profile-picture-973460_1280.png";

export default function CallbackPage() {
  const [candidates, setCandidates] = useState<CallbackCandidate[]>([]);
  const [loading, setLoading] = useState(true);
  const [inspectingActor, setInspectingActor] = useState<CallbackCandidate | null>(null);
  const [draggedActorId, setDraggedActorId] = useState<number | null>(null);

  // View State
  const [sortBy, setSortBy] = useState<'score' | 'dance' | 'name'>('score');
  
  // STATS STATE (New!)
  const [targetLimit, setTargetLimit] = useState(40); // Default to 40% limit

  const [columns, setColumns] = useState<CallbackColumn[]>([
    { id: 'pool', title: 'The Bench', type: 'pool', color: 'border-zinc-700 bg-zinc-900/50' },
    { id: 'leads', title: 'Principal Roles', type: 'role', color: 'border-blue-500/30 bg-blue-900/10' },
    { id: 'dance', title: 'Dance Call', type: 'dance', color: 'border-emerald-500/30 bg-emerald-900/10' },
  ]);

  // --- STATS CALCULATOR ---
  const stats = useMemo(() => {
    const total = candidates.length;
    if (total === 0) return { total: 0, pool: 0, callbacks: 0, percent: 0, isOverLimit: false };

    const poolCount = candidates.filter(c => c.groupId === 'pool').length;
    const callbacksCount = total - poolCount;
    const percent = Math.round((callbacksCount / total) * 100);
    
    return {
        total,
        pool: poolCount,
        callbacks: callbacksCount,
        percent,
        isOverLimit: percent > targetLimit
    };
  }, [candidates, targetLimit]);

  // --- HELPERS ---
  const safeString = (val: any): string => {
    if (val === null || val === undefined) return "";
    if (typeof val === 'string') return val;
    if (typeof val === 'number') return String(val);
    if (Array.isArray(val)) return val.length > 0 ? safeString(val[0].value) : "";
    if (typeof val === 'object') return val.value ? safeString(val.value) : "";
    return String(val);
  };

  const getHeadshot = (raw: any) => {
    if (Array.isArray(raw) && raw.length > 0 && raw[0].url) return raw[0].url;
    if (typeof raw === 'string' && raw.includes('(') && raw.includes(')')) {
      const match = raw.match(/\((.*?)\)/);
      if (match) return match[1];
    }
    if (typeof raw === 'string' && raw.startsWith('http')) return raw;
    return DEFAULT_AVATAR;
  };

  const formatDate = (raw: any) => {
    const val = safeString(raw);
    if (!val || val === "N/A") return "N/A";
    try {
      const date = new Date(val);
      if (isNaN(date.getTime())) return val;
      return date.toLocaleDateString("en-US", { month: 'short', day: 'numeric', year: 'numeric' });
    } catch (e) { return val; }
  };

  const calculateTenure = (rawPast: any) => {
    const pastStr = safeString(rawPast);
    if (!pastStr || pastStr.toLowerCase().includes("no past") || pastStr.length < 3) return "New Student";
    return "Returning";
  };

  // --- DATA LOADING ---
  useEffect(() => {
    async function loadData() {
      try {
        const rows = await getAuditionSlots();
        const activeShowId = localStorage.getItem('activeShowId'); 

        // Filter based on active show (Same logic as AuditionsPage)
        const showRows = rows.filter((row: any) => {
            const prodArray = row.Production || [];
            if (!prodArray.length) return false;
            if (activeShowId && prodArray.some((p: any) => String(p.id) === activeShowId)) return true;
            return (prodArray[0]?.value || "").toLowerCase().includes("mermaid");
        });

        const cleanCandidates = showRows.map((row: any) => {
          const name = safeString(row.Performer) || "Unknown Actor";
          const imageUrl = getHeadshot(row.Headshot);
          const dbVocal = parseFloat(row["Vocal Score"]) || 0;
          const dbActing = parseFloat(row["Acting Score"]) || 0;
          const dbDance = parseFloat(row["Dance Score"]) || 0;
          const isUnscored = dbVocal === 0;

          const age = safeString(row.Age) || "N/A";
          let height = safeString(row.Height);
          if (height && !height.includes("'") && !isNaN(Number(height))) {
             const inches = Number(height);
             height = `${Math.floor(inches / 12)}'${inches % 12}"`;
          } else if (!height) height = "-";

          const rawBirth = row.Birthdate || row.birthdate || row["Date of Birth"];
          const rawPast = safeString(row["Past Productions"]);

          const actingNotes = safeString(row["Acting Notes"]);
          const vocalNotes = safeString(row["Music Notes"]);
          const danceNotes = safeString(row["Choreography Notes"]);
          const adminNoteRaw = safeString(row["Admin Notes"]);
          const dropInNoteRaw = safeString(row["Drop-In Notes"]);
          const adminNotes = [adminNoteRaw, dropInNoteRaw].filter(Boolean).join(" | ");

          return {
            id: row.id,
            name,
            headshot: imageUrl,
            score: isUnscored ? Number((Math.random() * (5 - 3) + 3).toFixed(1)) : dbVocal,
            acting: isUnscored ? Number((Math.random() * (5 - 3) + 3).toFixed(1)) : dbActing,
            dance: isUnscored ? Math.floor(Math.random() * 5) + 1 : dbDance,
            groupId: 'pool',
            gender: "Unknown", 
            age,
            height,
            birthdate: formatDate(rawBirth),
            tenure: calculateTenure(row["Past Productions"]),
            conflicts: safeString(row.Conflicts) || "No known conflicts.",
            song: safeString(row.Song) || "N/A",
            monologue: safeString(row.Monologue) || "N/A",
            bio: rawPast || "No past productions listed.",
            pastRoles: rawPast ? [rawPast] : [], 
            actingNotes,
            vocalNotes,
            danceNotes,
            adminNotes,
            notes: safeString(row.Notes) || "", // Fallback
            email: "student@cyt.org",
            phone: "555-0123"
          };
        });
        setCandidates(cleanCandidates);
      } catch (error) { console.error("Baserow Error:", error); } 
      finally { setLoading(false); }
    }
    loadData();
  }, []);

  const getSortedCandidates = (groupId: string) => {
    return candidates.filter(c => c.groupId === groupId).sort((a, b) => {
        if (sortBy === 'score') return b.score - a.score; 
        if (sortBy === 'dance') return b.dance - a.dance; 
        if (sortBy === 'name') return a.name.localeCompare(b.name); 
        return 0;
    });
  };

  const addColumn = () => {
    const name = prompt("Name your new callback group:");
    if (!name) return;
    const newId = name.toLowerCase().replace(/\s+/g, '-');
    setColumns(prev => [...prev, { id: newId, title: name, type: 'role', color: 'border-white/10 bg-zinc-900/30' }]);
  };

  const removeColumn = (colId: string) => {
    if (colId === 'pool') return; 
    if (!confirm("Remove this group? Actors will return to the Bench.")) return;
    setCandidates(prev => prev.map(c => c.groupId === colId ? { ...c, groupId: 'pool' } : c));
    setColumns(prev => prev.filter(col => col.id !== colId));
  };

  const moveStudent = (actorId: number, targetGroupId: string) => {
    setCandidates(prev => prev.map(c => c.id === actorId ? { ...c, groupId: targetGroupId } : c));
  };

  const handleDragStart = (e: React.DragEvent, id: number) => { setDraggedActorId(id); e.dataTransfer.effectAllowed = "move"; };
  const handleDragOver = (e: React.DragEvent) => { e.preventDefault(); e.dataTransfer.dropEffect = "move"; };
  const handleDrop = (e: React.DragEvent, targetGroupId: string) => {
    e.preventDefault();
    if (!draggedActorId) return;
    moveStudent(draggedActorId, targetGroupId);
    setDraggedActorId(null);
  };

  if (loading) return (
    <div className="h-screen bg-zinc-950 flex items-center justify-center text-white gap-3">
        <Loader2 className="animate-spin text-blue-500" />
        <p className="uppercase font-bold tracking-widest text-xs">Loading Bench...</p>
    </div>
  );

  return (
    <div className="flex flex-col h-screen bg-zinc-950 text-white overflow-hidden font-sans">
      
      {/* HEADER */}
      <header className="px-6 py-4 border-b border-white/5 bg-zinc-900/30 backdrop-blur-xl shrink-0 flex flex-col md:flex-row justify-between items-center gap-4">
        
        {/* LEFT: TITLE & STATS DASHBOARD */}
        <div className="flex items-center gap-8 w-full md:w-auto justify-between md:justify-start">
            <div>
                <h1 className="text-xl md:text-2xl font-black uppercase italic tracking-tighter text-white">Callbacks</h1>
                <div className="flex items-center gap-2 mt-1">
                    <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse"></span>
                    <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest">Drafting Mode</p>
                </div>
            </div>

            {/* STATS (Visible on Mobile too, simplified) */}
            <div className="flex flex-col gap-1.5 min-w-[120px] md:min-w-[200px] border-l border-white/10 pl-6">
                <div className="flex justify-between items-end text-[9px] md:text-[10px] font-bold uppercase tracking-widest text-zinc-400">
                    <span className="hidden md:inline">Callbacks: {stats.callbacks}/{stats.total}</span>
                    <span className="md:hidden">{stats.percent}% Called</span>
                    <span className={stats.isOverLimit ? "text-red-500" : "text-emerald-500"}>
                        {stats.percent}%
                    </span>
                </div>
                
                <div className="h-1.5 md:h-2 w-full bg-zinc-800 rounded-full overflow-hidden relative">
                    <div 
                        className={`h-full transition-all duration-500 ${stats.isOverLimit ? 'bg-red-500' : 'bg-emerald-500'}`} 
                        style={{ width: `${stats.percent}%` }}
                    />
                    <div className="absolute top-0 bottom-0 w-0.5 bg-white/50 z-10" style={{ left: `${targetLimit}%` }} />
                </div>
            </div>
        </div>

        {/* RIGHT: TOOLBAR */}
        <div className="flex items-center gap-3 w-full md:w-auto overflow-x-auto pb-2 md:pb-0 scrollbar-hide">
             <div className="flex items-center bg-zinc-900 border border-white/10 rounded-lg px-3 py-1.5 gap-2 shrink-0">
                {sortBy === 'name' ? <ArrowDownAZ size={14} className="text-zinc-400" /> : <ArrowUpNarrowWide size={14} className="text-zinc-400" />}
                <select 
                    value={sortBy} 
                    onChange={(e) => setSortBy(e.target.value as any)}
                    className="bg-transparent text-[11px] font-bold uppercase outline-none text-zinc-300"
                >
                    <option value="score">Sort: Vocal</option>
                    <option value="dance">Sort: Dance</option>
                    <option value="name">Sort: Name</option>
                </select>
             </div>
             <button onClick={addColumn} className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white px-4 py-1.5 rounded-lg text-[11px] font-black uppercase tracking-wide transition-all shrink-0">
                <Plus size={14} /> New Group
             </button>
        </div>
      </header>

      {/* KANBAN BOARD (Responsive) */}
      <div className="flex-1 overflow-x-auto overflow-y-hidden p-4 md:p-6 pb-20 md:pb-6">
        <div className="flex flex-col md:flex-row h-full gap-6">
            {columns.map((col) => (
                <div 
                    key={col.id}
                    onDragOver={handleDragOver}
                    onDrop={(e) => handleDrop(e, col.id)}
                    className={`flex-shrink-0 w-full md:w-80 lg:w-96 flex flex-col rounded-3xl border transition-all duration-200 h-auto md:h-full ${col.color} ${draggedActorId ? 'border-dashed opacity-90' : 'opacity-100'}`}
                >
                    {/* Column Header */}
                    <div className="p-4 md:p-5 flex justify-between items-center border-b border-white/5 sticky top-0 bg-inherit z-10 rounded-t-3xl">
                        <div className="flex items-center gap-2">
                            {col.type === 'pool' ? <Users size={16} className="text-zinc-500" /> : <Star size={16} className="text-blue-400" />}
                            <h2 className="text-xs font-black uppercase tracking-[0.2em] text-zinc-400">{col.title}</h2>
                        </div>
                        <div className="flex items-center gap-2">
                             <span className="bg-black/30 text-zinc-400 px-2 py-0.5 rounded text-[10px] font-bold">{getSortedCandidates(col.id).length}</span>
                             {col.id !== 'pool' && (
                                 <button onClick={() => removeColumn(col.id)} className="text-zinc-600 hover:text-red-400 transition-colors"><Trash2 size={14} /></button>
                             )}
                        </div>
                    </div>

                    {/* Draggable List */}
                    <div className="flex-1 overflow-y-auto p-2 md:p-3 space-y-2 custom-scrollbar min-h-[150px] md:min-h-0">
                        {getSortedCandidates(col.id).map(actor => (
                            <div 
                                key={actor.id}
                                draggable
                                onDragStart={(e) => handleDragStart(e, actor.id)}
                                onClick={() => setInspectingActor(actor)}
                                className="group cursor-pointer active:cursor-grabbing p-3 bg-zinc-950/40 hover:bg-zinc-800 border border-white/5 rounded-xl transition-all flex items-center gap-3 relative"
                            >
                                <img src={actor.headshot} alt={actor.name} className="w-10 h-10 rounded-full object-cover border border-white/10" />
                                <div className="flex-1 min-w-0">
                                    <h4 className="text-sm font-bold text-zinc-200 truncate">{actor.name}</h4>
                                    <div className="flex gap-2 mt-0.5">
                                        <span className={`text-[10px] font-bold ${actor.score >= 4 ? 'text-emerald-400' : 'text-zinc-500'}`}>Voc: {actor.score}</span>
                                        <span className={`text-[10px] font-bold ${actor.dance >= 4 ? 'text-blue-400' : 'text-zinc-500'}`}>Dan: {actor.dance}</span>
                                    </div>
                                </div>
                                
                                {/* MOBILE "MOVE" DROPDOWN (Replaces Dragging) */}
                                <div 
                                    className="md:hidden p-2 text-zinc-500 active:text-blue-500"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        // Simple cycle for now, or prompt? Let's do a simple cycle or prompt
                                        const target = prompt("Move to which group? (Type name)", "Leads");
                                        const targetCol = columns.find(c => c.title.toLowerCase().includes(target?.toLowerCase() || ""));
                                        if (targetCol) moveStudent(actor.id, targetCol.id);
                                    }}
                                >
                                    <MoveRight size={16} />
                                </div>

                                {/* DESKTOP "REMOVE" BUTTON */}
                                {col.id !== 'pool' && (
                                    <button 
                                        onClick={(e) => { e.stopPropagation(); moveStudent(actor.id, 'pool'); }}
                                        className="hidden md:block opacity-0 group-hover:opacity-100 p-1.5 text-zinc-600 hover:text-red-400 transition-all"
                                    >
                                        <Trash2 size={14} />
                                    </button>
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            ))}
        </div>
      </div>

      {/* MODAL */}
      {inspectingActor && (
        <ActorProfileModal 
          actor={{
             ...inspectingActor,
             avatar: inspectingActor.headshot, 
             dob: inspectingActor.birthdate,
             vocalRange: "-",
             pastRoles: inspectingActor.pastRoles
          }} 
          grades={{
            vocal: inspectingActor.score, 
            acting: inspectingActor.acting, 
            dance: inspectingActor.dance, 
            presence: 3.5, 
            actingNotes: inspectingActor.actingNotes,
            vocalNotes: inspectingActor.vocalNotes,
            danceNotes: inspectingActor.danceNotes,
            adminNotes: inspectingActor.adminNotes
          }} 
          onClose={() => setInspectingActor(null)} 
        />
      )}
    </div>
  );
}