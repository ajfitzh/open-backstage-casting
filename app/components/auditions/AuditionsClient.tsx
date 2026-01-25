"use client";

import React, { useState, useEffect, useMemo } from "react";
import {
  User, Star, Music, Move, X, Save, Clock, CheckCircle2, 
  MessageSquare, Search, UserPlus, PlayCircle, Film, Loader2
} from "lucide-react";
import { getAuditionees, updateAuditionSlot, submitAudition } from "@/app/lib/baserow";
import ActorProfileModal from "@/app/components/ActorProfileModal";
import ChoreoWorkspace from "@/app/components/ChoreoWorkspace";

// --- TYPES ---
interface Performer {
  id: number;
  originalId: number;
  performerId?: number;
  name: string;
  avatar: string | null;
  age: string;
  video: string | null;
  height: string;
  vocalRange: string;
  dob: string;
  conflicts: string;
  tenure: string;
  pastRoles: string | string[];
  song: string;
  monologue: string;
  timeSlot: string;
  session: AuditionSession;
  vocal: number;
  acting: number;
  dance: number;
  presence: number;
  actingNotes: string;
  musicNotes: string;
  choreoNotes: string;
  dropInNotes: string;
  adminNotes: string;
  isWalkIn: boolean;
}

type AuditionSession = "Thursday" | "Friday" | "Video/Remote" | "Walk-In";
type JudgeRole = "Director" | "Music" | "Choreographer" | "Drop-In" | "Admin";

const ROLE_THEMES: Record<JudgeRole, { color: string; text: string; glow: string; weight: string }> = {
  Director: { color: "border-blue-500", text: "text-blue-400", glow: "shadow-blue-500/20", weight: "Acting 60% | Vocal 20% | Dance 20%" },
  Music: { color: "border-purple-500", text: "text-purple-400", glow: "shadow-purple-500/20", weight: "Vocal 80% | Acting 20%" },
  Choreographer: { color: "border-emerald-500", text: "text-emerald-400", glow: "shadow-emerald-500/20", weight: "Dance 80% | Presence 20%" },
  "Drop-In": { color: "border-amber-500", text: "text-amber-400", glow: "shadow-amber-500/20", weight: "Impression Only" },
  Admin: { color: "border-zinc-100", text: "text-zinc-100", glow: "shadow-white/5", weight: "Full Access" },
};

// --- HELPER COMPONENT: RUBRIC SLIDER ---
const RubricSlider = ({ label, val, setVal, disabled }: { label: string, val: number, setVal: (n: number) => void, disabled: boolean }) => (
  <div className={`space-y-3 ${disabled ? 'opacity-50 pointer-events-none grayscale' : ''}`}>
    <div className="flex justify-between items-end">
      <label className="text-xs font-black uppercase tracking-widest text-zinc-400 flex items-center gap-2">
        {label === "Vocal Ability" && <Music size={14} className="text-purple-500" />}
        {label === "Acting / Reads" && <Star size={14} className="text-blue-500" />}
        {label === "Dance / Movement" && <Move size={14} className="text-emerald-500" />}
        {label}
      </label>
      <span className={`text-xl font-black ${val > 0 ? 'text-white' : 'text-zinc-700'}`}>{val || "-"}</span>
    </div>
    <input 
      type="range" min="0" max="5" step="1" value={val} 
      onChange={(e) => setVal(Number(e.target.value))} 
      className="w-full h-2 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-blue-500" 
      aria-label={`Score for ${label}`} 
    />
    <div className="flex justify-between text-[9px] font-bold uppercase text-zinc-600 px-1">
      <span>N/A</span>
      <span>Weak</span>
      <span>Fair</span>
      <span>Good</span>
      <span>Great</span>
      <span>Exc.</span>
    </div>
  </div>
);

interface AuditionsClientProps {
  productionId: number;
  productionTitle: string;
}

export default function AuditionsClient({ productionId, productionTitle }: AuditionsClientProps) {
  const [isMounted, setIsMounted] = useState(false); 
  
  // Judge State (Stored in LocalStorage as it's device-specific)
  const [judgeName, setJudgeName] = useState("");
  const [judgeRole, setJudgeRole] = useState<JudgeRole | null>(null);
  const [isReady, setIsReady] = useState(false);

  // App State
  const [searchQuery, setSearchQuery] = useState("");
  const [activeSession, setActiveSession] = useState<AuditionSession>("Thursday");
  const [selectedPerson, setSelectedPerson] = useState<Performer | null>(null);
  const [inspectingActor, setInspectingActor] = useState<Performer | null>(null);
  const [loading, setLoading] = useState(false);

  // Data
  const [scheduledPerformers, setScheduledPerformers] = useState<Performer[]>([]);
  const [allStudents, setAllStudents] = useState<any[]>([]); 
  const [grades, setGrades] = useState<Record<number, any>>({});
  
  // Current Editing Score
  const [currentScores, setCurrentScores] = useState({
    vocal: 0, acting: 0, dance: 0, presence: 0, notes: "",
  });

  const reopenJudgeSetup = () => setIsReady(false);

  // ✅ UPDATED INITIALIZATION LOGIC
  useEffect(() => {
    setIsMounted(true); 
    const savedName = localStorage.getItem("judgeName");
    const savedRole = localStorage.getItem("judgeRole") as JudgeRole | null;
    
    if (savedName && savedRole) {
      // Case A: User has used this before
      setJudgeName(savedName);
      setJudgeRole(savedRole);
      setIsReady(true);
    } else {
      // Case B: First time (or cleared cache) -> Default to Austin/Director
      const defaultName = "Austin Fitzhugh";
      const defaultRole: JudgeRole = "Director";

      setJudgeName(defaultName);
      setJudgeRole(defaultRole);
      
      // Save defaults so we don't have to set them again
      localStorage.setItem("judgeName", defaultName);
      localStorage.setItem("judgeRole", defaultRole);
      
      setIsReady(true); // Skip the modal!
    }
  }, []);

/* ---------- Data Fetching ---------- */
  useEffect(() => {
    const loadData = async () => {
      if (!isReady || !productionId) return;
      
      setLoading(true);
      console.log(`🚀 Loading Auditions for ${productionTitle} (ID: ${productionId})...`);
      
      try {
        // 1. Fetch raw data
        const slots = await getAuditionees();

        // 2. Filter using the PROPS (Server Context)
        const showAuditions = slots.filter((row: any) => {
          const prodArray = row.Production || [];
          if (!prodArray.length) return false;
          // STRICT ID CHECK
          return prodArray.some((p: any) => p.id === productionId);
        });

        console.log(`✅ Loaded ${showAuditions.length} actors.`);
        
        // Helper to extract baserow values
        const getLookupValue = (field: any) => {
          if (!field) return null;
          if (Array.isArray(field)) return field[0]?.value || field[0];
          return field?.value || field;
        };

        const formatHeight = (val: any) => {
          if (!val) return "N/A";
          if (String(val).includes("'")) return val; 
          const num = Number(val);
          if (isNaN(num)) return val;
          return `${Math.floor(num / 12)}'${num % 12}"`;
        };

        const getExperienceLabel = (field: any) => {
          let count = 0;
          let roleList = "";
          if (field) {
            if (Array.isArray(field)) {
               count = field.length;
               roleList = field.map((item: any) => typeof item === 'object' ? item.value : item).join(", ");
            } else if (typeof field === 'string') {
               const split = field.split(',');
               count = split.length;
               roleList = field;
            }
          }
          return { label: count > 0 ? `Shows: ${count}` : "First Show", list: roleList };
        };

        const formattedSchedule: Performer[] = showAuditions.map((row: any) => {
           const rawDate = row.Date;
           let displayTime = "TBD";
           let session: AuditionSession = "Video/Remote";

           if (rawDate) {
             const dateObj = new Date(rawDate);
             const dayOfWeek = dateObj.getDay(); 
             if (dayOfWeek === 4) session = "Thursday";
             else if (dayOfWeek === 5) session = "Friday";
             displayTime = dateObj.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit', hour12: true });
           }
           
           let videoUrl = null;
           if (row["Dance Video"]) {
               videoUrl = row["Dance Video"];
           } 
           if (!videoUrl) {
               const rawVideo = row["Audition Video"]; 
               if (Array.isArray(rawVideo) && rawVideo.length > 0) videoUrl = rawVideo[0].url;
               else if (typeof rawVideo === 'string' && rawVideo.startsWith('http')) videoUrl = rawVideo;
           }

           let headshotUrl = null;
           const rawHeadshot = row.Headshot;
           if (Array.isArray(rawHeadshot) && rawHeadshot.length > 0) headshotUrl = rawHeadshot[0].url;
           else if (row.Headshot?.url) headshotUrl = row.Headshot.url;

           const experienceData = getExperienceLabel(row["Past Roles"] || row["Past Productions"]);

           return {
             id: row.id,
             originalId: row.id, 
             performerId: row.Performer?.[0]?.id,
             name: Array.isArray(row.Performer) ? row.Performer[0]?.value : (row.Performer || "Unknown"),
             avatar: headshotUrl,
             age: String(getLookupValue(row.Age) || "?"),
             video: videoUrl,
             height: formatHeight(getLookupValue(row.Height)),
             vocalRange: getLookupValue(row["Vocal Range"]),
             dob: getLookupValue(row.Birthdate),
             conflicts: getLookupValue(row.Conflicts),
             tenure: experienceData.label,
             pastRoles: experienceData.list,
             song: row.Song || "No song listed",
             monologue: row.Monologue || "No monologue listed",
             timeSlot: displayTime,
             session: session,
             vocal: row["Vocal Score"] || 0,
             acting: row["Acting Score"] || 0,
             dance: row["Dance Score"] || 0,
             presence: row["Stage Presence Score"] || 0,
             actingNotes: row["Acting Notes"] || "",
             musicNotes: row["Music Notes"] || "",
             choreoNotes: row["Choreography Notes"] || "",
             dropInNotes: row["Drop-In Notes"] || "",
             adminNotes: row["Admin Notes"] || "",
             isWalkIn: false
           };
        });

        setScheduledPerformers(formattedSchedule);

        const initialGrades: Record<number, any> = {};
        formattedSchedule.forEach(p => {
          if (p.vocal > 0 || p.dance > 0 || p.acting > 0 || p.video) initialGrades[p.id] = p;
        });
        setGrades(initialGrades);

        // For Walk-Ins, we might want to filter or keep all, strictly logic dictates keep all
        setAllStudents(slots);

      } catch (err) {
        console.error("❌ CRITICAL LOAD ERROR:", err);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [isReady, productionId, productionTitle]);

  const handleChoreoSave = (actorId: number, score: number, notes: string, videoUrl?: string) => {
    const isDelete = videoUrl === "DELETE";

    setGrades(prev => ({
        ...prev,
        [actorId]: {
            ...prev[actorId],
            dance: score,
            choreoNotes: notes,
            video: isDelete ? null : (videoUrl || prev[actorId]?.video)
        }
    }));

    const payload: any = {
        "Dance Score": score > 0 ? score : null, 
        "Choreography Notes": notes
    };
    
    if (isDelete) {
        payload["Dance Video"] = ""; 
    } else if (videoUrl) {
        payload["Dance Video"] = videoUrl; 
    }
    
    updateAuditionSlot(actorId, payload).catch(err => console.error("Auto-save failed", err));
  };

  /* ---------- STANDARD SAVE ACTION ---------- */
  const handleCommit = async () => {
    if (!selectedPerson) return;
    
    const personId = selectedPerson.id;
    const originalId = selectedPerson.originalId;
    const isWalkIn = selectedPerson.isWalkIn;
    const scoresToSave = { ...currentScores };

    let noteField = "";
    switch (judgeRole) {
        case "Director": noteField = "actingNotes"; break; 
        case "Music": noteField = "musicNotes"; break;
        case "Choreographer": noteField = "choreoNotes"; break;
        case "Drop-In": noteField = "dropInNotes"; break;
        default: noteField = "adminNotes"; break;
    }

    setGrades((prev) => {
        const existingData = prev[personId] || {};
        return {
            ...prev,
            [personId]: {
                ...existingData,        
                ...scoresToSave,       
                [noteField]: scoresToSave.notes 
            }
        };
    });

    try {
      const payload: any = {
          "Vocal Score": scoresToSave.vocal > 0 ? scoresToSave.vocal : null,
          "Acting Score": scoresToSave.acting > 0 ? scoresToSave.acting : null,
          "Dance Score": scoresToSave.dance > 0 ? scoresToSave.dance : null,
          "Stage Presence Score": scoresToSave.presence > 0 ? scoresToSave.presence : null,
      };

      switch (judgeRole) {
          case "Director": payload["Acting Notes"] = scoresToSave.notes; break;
          case "Music": payload["Music Notes"] = scoresToSave.notes; break;
          case "Choreographer": payload["Choreography Notes"] = scoresToSave.notes; break;
          case "Drop-In": payload["Drop-In Notes"] = scoresToSave.notes; break;
          case "Admin": payload["Admin Notes"] = scoresToSave.notes; break;
      }

      if (isWalkIn) {
        // Use the SERVER ID provided via props
        await submitAudition(originalId, productionId, payload);
        alert("Walk-In Created!");
      } else {
        await updateAuditionSlot(personId, payload);
      }
      
      setSelectedPerson((current) => (current?.id === personId ? null : current));
      
    } catch (err) {
      console.error(err);
      alert("Save failed! Check connection.");
    }
  };

  /* ---------- Logic: Grouping & Scoring ---------- */
  const calculateWeightedScore = (scores: any) => {
    if (!judgeRole) return 0;
    const s = {
      vocal: Number(scores.vocal) || 0,
      acting: Number(scores.acting) || 0,
      dance: Number(scores.dance) || 0,
      presence: Number(scores.presence) || 0,
    };
    switch(judgeRole) {
      case "Director": return (s.acting * 0.7) + (s.vocal * 0.3); 
      case "Music": return (s.vocal * 0.8) + (s.acting * 0.2);
      case "Choreographer": return (s.dance * 0.8) + (s.presence * 0.2);
      default: return (s.vocal + s.acting + s.dance + s.presence) / 4;
    }
  };

  const visibleList = useMemo(() => {
    if (activeSession === "Walk-In") {
      if (!searchQuery) return [];
      return allStudents
        .filter(s => s["Full Name"]?.toLowerCase().includes(searchQuery.toLowerCase()))
        .map(s => ({
          id: -1, 
          originalId: s.id, 
          name: s["Full Name"],
          avatar: s.Headshot?.[0]?.url || null, 
          age: s.Age,
          timeSlot: "WALK-IN", 
          session: "Walk-In" as AuditionSession, 
          isWalkIn: true,
          vocal: 0, acting: 0, dance: 0, presence: 0, 
          actingNotes: "", musicNotes: "", choreoNotes: "", dropInNotes: "", adminNotes: "",
          height: "", vocalRange: "", dob: "", conflicts: "", tenure: "", pastRoles: [], song: "", monologue: "", video: null
        }));
    }
    return scheduledPerformers.filter((p) => {
        const matchesSession = p.session === activeSession;
        const matchesSearch = searchQuery ? p.name.toLowerCase().includes(searchQuery.toLowerCase()) : true;
        return matchesSession && matchesSearch;
    });
  }, [scheduledPerformers, allStudents, activeSession, searchQuery]);

  const grouped = useMemo(() => {
    if (activeSession === "Walk-In") return { "Walk-In Results": visibleList };
    const groups: Record<string, Performer[]> = {};
    visibleList.forEach((p) => {
      if (!groups[p.timeSlot]) groups[p.timeSlot] = [];
      groups[p.timeSlot].push(p);
    });
    return Object.keys(groups).sort().reduce((acc, key) => { acc[key] = groups[key]; return acc; }, {} as Record<string, Performer[]>);
  }, [visibleList, activeSession]);


 return (
  <>
    {/* --- JUDGE SETUP MODAL --- */}
    {!isReady && (
      <div className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-xl flex items-center justify-center p-4">
        <div className="w-full max-w-[420px] bg-zinc-950 border border-white/10 rounded-2xl p-6 md:p-8 space-y-6 shadow-2xl">
          <h2 className="text-2xl font-black uppercase tracking-tight">Judge Setup</h2>
          <div>
            <label className="block text-[10px] font-bold uppercase text-zinc-500 mb-1">Judge Name</label>
            <input value={judgeName} onChange={(e) => setJudgeName(e.target.value)} className="w-full bg-zinc-900 border border-white/10 rounded-lg p-3 text-sm focus:border-blue-500 outline-none transition-all" placeholder="Enter your name" />
          </div>
          <div>
            <label className="block text-[10px] font-bold uppercase text-zinc-500 mb-2">Judge Role</label>
            <div className="grid grid-cols-2 gap-2">
              {(Object.keys(ROLE_THEMES) as JudgeRole[]).map((role) => (
                <button key={role} onClick={() => setJudgeRole(role)} className={`p-3 rounded-lg border text-xs font-black uppercase transition-all ${judgeRole === role ? "bg-white text-black border-white shadow-lg" : "bg-zinc-900 border-zinc-800 text-zinc-400 hover:border-zinc-600"}`}>{role}</button>
              ))}
            </div>
          </div>
          <div className="flex gap-3 pt-2">
            {isMounted && localStorage.getItem("judgeName") && (
              <button onClick={() => setIsReady(true)} className="px-6 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-xl font-bold uppercase text-[10px] tracking-widest transition-colors">Cancel</button>
            )}
            <button disabled={!judgeName || !judgeRole} onClick={() => { localStorage.setItem("judgeName", judgeName); localStorage.setItem("judgeRole", judgeRole!); setIsReady(true); }} className="flex-1 bg-blue-600 hover:bg-blue-500 disabled:bg-zinc-800 disabled:text-zinc-500 py-4 rounded-xl font-black uppercase tracking-widest transition-colors shadow-lg shadow-blue-900/20">{isMounted && localStorage.getItem("judgeName") ? "Update Profile" : "Start Judging"}</button>
          </div>
        </div>
      </div>
    )}

    {/* --- MAIN UI --- */}
    {isReady && (
      judgeRole === 'Choreographer' ? (
        // === CHOREOGRAPHER WORKSPACE ===
        <div className="h-screen bg-black flex flex-col">
            <div className="h-14 bg-zinc-900 border-b border-white/5 flex items-center justify-between px-4 shrink-0">
                <button onClick={reopenJudgeSetup} className="text-[10px] font-black uppercase text-zinc-500 hover:text-white transition-colors">
                    Exit Dance Mode
                </button>
                <div className="flex gap-2">
                      {(["Thursday", "Friday", "Walk-In"] as const).map((s) => (
                        <button
                          key={s}
                          onClick={() => setActiveSession(s)}
                          className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase transition-all ${
                            activeSession === s ? "bg-white text-black" : "bg-zinc-800 text-zinc-500"
                          }`}
                        >
                          {s}
                        </button>
                      ))}
                </div>
            </div>
            
            <div className="flex-1 overflow-hidden">
                <ChoreoWorkspace 
                    people={visibleList} 
                    initialGrades={grades} 
                    onSave={handleChoreoSave} 
                />
            </div>
        </div>
      ) : (
        // === STANDARD AUDITION DECK ===
        <div className={`flex h-full bg-black text-white shadow-[0_0_50px_-12px_rgba(255,255,255,0.1)]`}>
          <div className="flex-1 flex flex-col min-w-0">
            
            {/* HEADER */}
            <header className={`p-4 md:p-6 border-b-2 bg-zinc-950 ${ROLE_THEMES[judgeRole!].color} shrink-0`}>
              <div className="flex flex-col md:flex-row justify-between md:items-center gap-4">
                <button onClick={reopenJudgeSetup} className="text-left group shrink-0">
                  <h1 className="text-xl md:text-2xl font-black italic uppercase">Audition Deck</h1>
                  <div className="flex items-center gap-2">
                      <p className="text-[9px] uppercase text-zinc-500">{judgeName} • {judgeRole}</p>
                      <span className="text-[9px] uppercase text-blue-500 font-bold ml-2">
                        {productionTitle}
                      </span>
                  </div>
                </button>

                {/* SCROLLABLE TABS */}
                <div className="flex gap-2 overflow-x-auto pb-2 md:pb-0 w-full md:w-auto no-scrollbar mask-linear-fade">
                  {(["Thursday", "Friday", "Video/Remote", "Walk-In"] as const).map((s) => (
                    <button key={s} onClick={() => { setActiveSession(s); setSearchQuery(""); }} className={`px-4 py-2 rounded-lg text-[10px] font-black uppercase transition-colors whitespace-nowrap border border-transparent ${activeSession === s ? "bg-white text-black" : "bg-zinc-900 text-zinc-500 hover:text-zinc-300 border-white/5"}`}>
                      {s === "Walk-In" ? <span className="flex items-center gap-1"><UserPlus size={12}/> Walk-In</span> : s}
                    </button>
                  ))}
                </div>
              </div>

              <div className="mt-4 relative w-full md:w-64">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-600" />
                <input value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="w-full bg-zinc-900 rounded-lg py-2 pl-10 text-xs focus:ring-1 ring-white/10 outline-none text-white" placeholder={activeSession === "Walk-In" ? "Type student name..." : "Find in schedule..."} autoFocus={activeSession === "Walk-In"} />
              </div>
            </header>

            {/* LIST AREA */}
            <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-6">
              {loading && <div className="text-center text-zinc-500 mt-20"><Loader2 className="animate-spin mx-auto mb-2"/> Loading Auditions...</div>}

              {activeSession === "Walk-In" && visibleList.length === 0 && !loading && (
                <div className="text-center text-zinc-500 mt-20"><UserPlus size={48} className="mx-auto mb-4 opacity-20" /><p className="text-sm">Start typing to find a student...</p></div>
              )}

              {Object.entries(grouped).map(([time, people]) => (
                <div key={time}>
                  {activeSession !== "Walk-In" && <h3 className="text-xs uppercase text-blue-500 mb-2 flex items-center gap-1 sticky top-0 bg-black/90 backdrop-blur py-2 z-10"><Clock size={12} /> {time}</h3>}
                  {people.map((person) => (
                    <div key={person.id} className="flex gap-2 mb-3 group">
                        <button
                          onClick={() => {
                            setSelectedPerson(person);
                            const saved = grades[person.id] || {};
                            let loadedNote = "";
                            if (saved.notes) {
                                loadedNote = saved.notes;
                            } else {
                                switch(judgeRole) {
                                    case "Director": loadedNote = person.actingNotes; break;
                                    case "Music": loadedNote = person.musicNotes; break;
                                    case "Choreographer": loadedNote = person.choreoNotes; break;
                                    case "Drop-In": loadedNote = person.dropInNotes; break;
                                    case "Admin": loadedNote = person.adminNotes; break;
                                }
                            }

                            setCurrentScores({
                                vocal: saved.vocal || person.vocal || 0,
                                acting: saved.acting || person.acting || 0,
                                dance: saved.dance || person.dance || 0,
                                presence: saved.presence || person.presence || 0,
                                notes: loadedNote || "", 
                            });
                          }}
                          className={`flex-1 flex items-center gap-3 md:gap-4 p-3 rounded-xl transition-all border min-w-0 ${selectedPerson?.id === person.id ? "bg-zinc-800 border-blue-500 ring-1 ring-blue-500" : "bg-zinc-900 border-white/5 hover:bg-zinc-800"}`}
                        >
                            <div className="relative flex-shrink-0">
                                {person.avatar ? <img src={person.avatar} className="w-10 h-10 md:w-12 md:h-12 rounded-full object-cover" alt="" /> : <div className="w-10 h-10 md:w-12 md:h-12 rounded-full bg-zinc-800 flex items-center justify-center"><User size={20} className="text-zinc-600"/></div>}
                                {grades[person.id] && !person.isWalkIn && <div className="absolute -top-1 -right-1 bg-black rounded-full"><CheckCircle2 size={14} className="text-emerald-500" /></div>}
                            </div>
                            <div className="text-left min-w-0 flex-1">
                                <p className="font-bold text-sm flex items-center gap-2 truncate">
                                  <span className="truncate">{person.name}</span>
                                  {person.video && <Film size={12} className="text-blue-500 shrink-0" />}
                                </p>
                                <p className="text-[10px] text-zinc-500 truncate">{person.isWalkIn ? "Click to Audition Now" : `Age ${person.age}`}</p>
                            </div>
                        </button>
                        
                        {person.video && (
                            <button
                                onClick={(e) => { e.stopPropagation(); window.open(person.video!, "_blank"); }}
                                className="w-10 md:px-4 bg-zinc-900 hover:bg-zinc-800 rounded-xl transition-colors border border-white/5 flex items-center justify-center text-blue-500 hover:text-blue-400 group-hover:border-blue-500/30 shrink-0"
                                title="Watch Audition"
                            >
                                <PlayCircle size={18} />
                            </button>
                        )}
                        
                        <button 
                          onClick={() => setInspectingActor(person)} 
                          className="w-10 md:px-4 bg-zinc-900 hover:bg-zinc-800 rounded-xl transition-colors border border-white/5 flex items-center justify-center text-zinc-400 hover:text-white shrink-0" 
                        >
                          <User size={18} />
                        </button>
                    </div>
                  ))}
                </div>
              ))}
            </div>
          </div>

          {/* SCORING SIDEBAR */}
          {selectedPerson && (
            <aside className="fixed inset-0 z-[200] w-full bg-zinc-950 flex flex-col md:relative md:w-[420px] md:border-l md:border-white/10 md:z-50">
                <div className="p-6 pb-4 border-b border-white/5 bg-zinc-900/50">
                  <div className="flex justify-between items-start mb-4">
                    <div className="flex gap-4">
                      <div className="w-20 h-20 rounded-2xl bg-zinc-800 overflow-hidden shadow-inner border border-white/10 shrink-0">
                        {selectedPerson.avatar ? <img src={selectedPerson.avatar} className="w-full h-full object-cover" alt={selectedPerson.name} /> : <div className="w-full h-full flex items-center justify-center text-zinc-600"><User size={32} /></div>}
                      </div>
                      <div>
                        <h2 className="text-2xl font-black italic uppercase leading-none tracking-tight">{selectedPerson.name}</h2>
                        <div className="flex items-center gap-2 mt-2">
                            <span className="bg-zinc-800 text-zinc-300 px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wide">{selectedPerson.isWalkIn ? "Walk-In" : `Age ${selectedPerson.age}`}</span>
                            {!selectedPerson.isWalkIn && <span className="border border-zinc-700 text-zinc-500 px-2 py-1 rounded text-[10px] font-bold uppercase">{selectedPerson.timeSlot}</span>}
                        </div>
                      </div>
                    </div>
                    <button onClick={() => setSelectedPerson(null)} className="text-zinc-500 hover:text-white transition-colors" aria-label="Close Panel"><X size={24}/></button>
                 </div>
               </div>

               <div className="p-6 space-y-6 flex-1 overflow-y-auto custom-scrollbar">
                  {selectedPerson.video && (
                     <div className="rounded-xl overflow-hidden border border-white/10 bg-black aspect-video relative group shadow-2xl">
                        <video src={selectedPerson.video} controls className="w-full h-full object-contain" poster={selectedPerson.avatar || undefined} />
                        <div className="absolute top-2 left-2 bg-black/60 backdrop-blur px-2 py-1 rounded text-[10px] font-bold uppercase text-white pointer-events-none border border-white/10">Audition Tape</div>
                     </div>
                  )}

                  <div className={`p-4 rounded-xl border ${ROLE_THEMES[judgeRole!].color} bg-zinc-900/50`}>
                      <div className="flex justify-between items-center">
                        <div>
                            <p className="text-[10px] font-black uppercase text-zinc-400 tracking-widest mb-1">Your Rating</p>
                            <p className="text-3xl font-black tabular-nums leading-none">{calculateWeightedScore(currentScores).toFixed(1)} <span className="text-sm text-zinc-600 font-normal">/ 5.0</span></p>
                        </div>
                        <div className="text-right">
                          <p className="text-[9px] uppercase text-zinc-500 font-bold leading-relaxed">{judgeRole} Priority:<br/><span className="text-zinc-300">{judgeRole === "Director" ? "Acting 70% | Vocal 30%" : ROLE_THEMES[judgeRole!].weight}</span></p>
                        </div>
                      </div>
                  </div>

                  <div className="space-y-6">
                      <RubricSlider label="Vocal Ability" val={currentScores.vocal} setVal={(v) => setCurrentScores((s) => ({ ...s, vocal: v }))} disabled={judgeRole !== "Music" && judgeRole !== "Admin"} />
                      <RubricSlider label="Acting / Reads" val={currentScores.acting} setVal={(v) => setCurrentScores((s) => ({ ...s, acting: v }))} disabled={judgeRole !== "Director" && judgeRole !== "Admin"} />
                      {(judgeRole === "Choreographer" || judgeRole === "Admin") && (
                        <RubricSlider label="Dance / Movement" val={currentScores.dance} setVal={(v) => setCurrentScores((s) => ({ ...s, dance: v }))} disabled={false} />
                      )}
                      <RubricSlider label="Stage Presence" val={currentScores.presence} setVal={(v) => setCurrentScores((s) => ({ ...s, presence: v }))} disabled={judgeRole !== "Director" && judgeRole !== "Admin"} />
                  </div>

                  <div className="pt-2 border-t border-white/5">
                    <label className="text-xs uppercase text-zinc-500 font-bold mb-3 block tracking-widest flex items-center gap-2"><MessageSquare size={12}/> Notes</label>
                    <textarea className="w-full bg-zinc-900 border border-white/10 p-4 rounded-xl text-sm min-h-[100px] focus:border-blue-500 outline-none resize-none transition-all placeholder:text-zinc-700" placeholder={`Internal notes for ${selectedPerson.name}...`} value={currentScores.notes} onChange={(e) => setCurrentScores((s) => ({ ...s, notes: e.target.value }))} />
                  </div>
               </div>

               <div className="p-6 border-t border-white/10 bg-zinc-900/50">
                 <button onClick={handleCommit} className="w-full bg-blue-600 hover:bg-blue-500 py-4 rounded-xl font-black uppercase tracking-widest shadow-lg shadow-blue-900/20 flex items-center justify-center gap-2 transition-transform active:scale-95">
                   <Save size={18} />
                   {selectedPerson.isWalkIn ? "Submit Walk-In" : "Save Score"}
                 </button>
               </div>
            </aside>
          )}
        </div>
      )
    )}

    {inspectingActor && <ActorProfileModal actor={inspectingActor} grades={grades[inspectingActor.id]} onClose={() => setInspectingActor(null)} />}
  </>
);
}