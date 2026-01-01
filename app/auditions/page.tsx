/* eslint-disable react-hooks/rules-of-hooks */
/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";
import { getAuditionSlots, updateAuditionSlot, getAuditionees, submitAudition } from "@/app/lib/baserow";
import React, { useState, useEffect, useMemo } from "react";
import {
  User, Star, Music, Move, X, Save, Clock, CheckCircle2, 
  MessageSquare, ShieldCheck, Search, UserPlus, PlayCircle, Film
} from "lucide-react";
import ActorProfileModal from "@/app/components/ActorProfileModal";

const TARGET_PRODUCTION_STRING = "The Little Mermaid, Jr. - Spring - 2025-2026";

/* =====================
   Types
===================== */
type AuditionSession = "Thursday" | "Friday" | "Video/Remote" | "Walk-In";

type JudgeRole = "Director" | "Music" | "Choreographer" | "Drop-In" | "Admin";

const ROLE_THEMES: Record<JudgeRole, { color: string; text: string; glow: string; weight: string }> = {
  Director: { color: "border-blue-500", text: "text-blue-400", glow: "shadow-blue-500/20", weight: "Acting 60% | Vocal 20% | Dance 20%" },
  Music: { color: "border-purple-500", text: "text-purple-400", glow: "shadow-purple-500/20", weight: "Vocal 80% | Acting 20%" },
  Choreographer: { color: "border-emerald-500", text: "text-emerald-400", glow: "shadow-emerald-500/20", weight: "Dance 80% | Presence 20%" },
  "Drop-In": { color: "border-amber-500", text: "text-amber-400", glow: "shadow-amber-500/20", weight: "Impression Only" },
  Admin: { color: "border-zinc-100", text: "text-zinc-100", glow: "shadow-white/5", weight: "Full Access" },
};

export default function AuditionsPage() {
  /* ---------- Hydration Fix State ---------- */
  const [isMounted, setIsMounted] = useState(false); 
  
  /* ---------- Judge Onboarding ---------- */
  const [judgeName, setJudgeName] = useState("");
  const [judgeRole, setJudgeRole] = useState<JudgeRole | null>(null);
  const [isReady, setIsReady] = useState(false);

  /* ---------- App State ---------- */
  const [searchQuery, setSearchQuery] = useState("");
  const [activeSession, setActiveSession] = useState<AuditionSession>("Thursday");
  const [selectedPerson, setSelectedPerson] = useState<any | null>(null);
  const [inspectingActor, setInspectingActor] = useState<any | null>(null);

  // Data States
  const [scheduledPerformers, setScheduledPerformers] = useState<any[]>([]);
  const [allStudents, setAllStudents] = useState<any[]>([]); 
  const [grades, setGrades] = useState<Record<number, any>>({});
  
  // Scoring State
  const [currentScores, setCurrentScores] = useState({
    vocal: 0, acting: 0, dance: 0, presence: 0, notes: "",
  });

  const reopenJudgeSetup = () => setIsReady(false);

  /* ---------- Load Judge & Mount ---------- */
  useEffect(() => {
    setIsMounted(true); 
    const savedName = localStorage.getItem("judgeName");
    const savedRole = localStorage.getItem("judgeRole") as JudgeRole | null;
    if (savedName && savedRole) {
      setJudgeName(savedName);
      setJudgeRole(savedRole);
      setIsReady(true);
    }
  }, []);

  /* ---------- Data Fetching (FIXED) ---------- */
  useEffect(() => {
    const loadData = async () => {
      if (!isReady) return;
      try {
        const slots = await getAuditionSlots();
        const activeShowId = localStorage.getItem('activeShowId'); 

        // DEBUG: Check what we are working with
        console.log("🔍 Total Slots Fetched:", slots.length);
        console.log("🎯 Filtering for Show ID:", activeShowId);

        // Filter for this show (ID Match OR String Match Fallback)
        const showAuditions = slots.filter((row: any) => {
          const prodArray = row.Production || [];
          if (!prodArray.length) return false;

          // 1. Try ID Match (Best)
          if (activeShowId && prodArray.some((p: any) => String(p.id) === activeShowId)) {
            return true;
          }
          
          // 2. Fallback: String Match (If IDs don't align)
          const showName = prodArray[0].value || "";
          return showName.toLowerCase().includes("mermaid"); // Loose match
        });

        console.log("✅ Slots after Filter:", showAuditions.length);

        // --- Helpers ---
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

        // Map Scheduled Data
        const formattedSchedule = showAuditions.map((row: any) => {
           const rawDate = row.Date;
           let displayTime = "TBD";
           let session: AuditionSession = "Video/Remote"; // Default

           if (rawDate) {
             const dateObj = new Date(rawDate);
             // Fix for Timezone offsets showing wrong day
             // We use getUTCDay if your dates in Baserow are UTC, 
             // but usually local getDay() is safer for local theatre.
             const dayOfWeek = dateObj.getDay(); 
             
             // 4 = Thursday, 5 = Friday (Standard JS Days)
             if (dayOfWeek === 4) session = "Thursday";
             else if (dayOfWeek === 5) session = "Friday";
             
             displayTime = dateObj.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit', hour12: true });
           }
           
           // If manually flagged as remote/video in a note or empty date
           if (!rawDate) session = "Video/Remote";

           // Video URL Extraction
           let videoUrl = null;
           const rawVideo = row["Audition Video"]; 
           if (Array.isArray(rawVideo) && rawVideo.length > 0) videoUrl = rawVideo[0].url;
           else if (typeof rawVideo === 'string' && rawVideo.startsWith('http')) videoUrl = rawVideo;

           // Headshot Extraction
           let headshotUrl = null;
           const rawHeadshot = row.Headshot;
           if (Array.isArray(rawHeadshot) && rawHeadshot.length > 0) headshotUrl = rawHeadshot[0].url;
           else if (row.Headshot?.url) headshotUrl = row.Headshot.url;

           const experienceData = getExperienceLabel(row["Past Roles"] || row["Past Productions"]);

           return {
             id: row.id,
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
          if (p.vocal > 0) initialGrades[p.id] = p;
        });
        setGrades(initialGrades);

        const students = await getAuditionees();
        setAllStudents(students);

      } catch (err) {
        console.error("Load Error:", err);
      }
    };

    loadData();
  }, [isReady]);

  /* ---------- Save Action (FIXED: MAPS NOTES LOCALLY) ---------- */
  const handleCommit = async () => {
    if (!selectedPerson) return;
    const activeShowId = localStorage.getItem('activeShowId');

    // 1. Prepare the Notes Mapping Logic
    // We need to know WHICH specific field to update based on the current judge
    let noteField = "";
    switch (judgeRole) {
        case "Director": noteField = "actingNotes"; break; // Matches Modal prop
        case "Music": noteField = "musicNotes"; break;
        case "Choreographer": noteField = "choreoNotes"; break;
        case "Drop-In": noteField = "dropInNotes"; break;
        default: noteField = "adminNotes"; break;
    }

    // 2. Optimistic UI Update (The Fix)
    // We merge the new scores AND the specific note field into the existing data
    setGrades((prev) => {
        const existingData = prev[selectedPerson.id] || {};
        return {
            ...prev,
            [selectedPerson.id]: {
                ...existingData,        // Keep existing data (e.g. video url, name)
                ...currentScores,       // Update scores (vocal, acting, etc)
                [noteField]: currentScores.notes // <--- MAP GENERIC TO SPECIFIC LOCALLY
            }
        };
    });

    try {
      // 3. Prepare Database Payload (Same mapping, but for Baserow column names)
      const payload: any = {
          "Vocal Score": currentScores.vocal,
          "Acting Score": currentScores.acting,
          "Dance Score": currentScores.dance,
          "Stage Presence Score": currentScores.presence,
      };

      // Map generic "notes" to specific Baserow Column
      switch (judgeRole) {
          case "Director": payload["Acting Notes"] = currentScores.notes; break;
          case "Music": payload["Music Notes"] = currentScores.notes; break;
          case "Choreographer": payload["Choreography Notes"] = currentScores.notes; break;
          case "Drop-In": payload["Drop-In Notes"] = currentScores.notes; break;
          case "Admin": payload["Admin Notes"] = currentScores.notes; break;
      }

      if (selectedPerson.isWalkIn) {
        const productionId = Number(activeShowId) || 94; 
        await submitAudition(selectedPerson.originalId, productionId, payload);
        alert("Walk-In Created!");
      } else {
        await updateAuditionSlot(selectedPerson.id, payload);
      }
      setSelectedPerson(null);
    } catch (err) {
      console.error(err);
      alert("Save failed! Check connection.");
    }
  };


/* ---------- Logic: Weighted Scores ---------- */
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

  /* ---------- Logic: Grouping ---------- */
  const visibleList = useMemo(() => {
    if (activeSession === "Walk-In") {
      if (!searchQuery) return [];
      return allStudents
        .filter(s => s["Full Name"]?.toLowerCase().includes(searchQuery.toLowerCase()))
        .map(s => ({
          id: `walkin-${s.id}`, originalId: s.id, name: s["Full Name"],
          avatar: s.Headshot?.[0]?.url || null, age: s.Age,
          timeSlot: "WALK-IN", session: "Walk-In", isWalkIn: true,
          vocal: 0, acting: 0, dance: 0, presence: 0, notes: "" 
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
    const groups: Record<string, any[]> = {};
    visibleList.forEach((p) => {
      if (!groups[p.timeSlot]) groups[p.timeSlot] = [];
      groups[p.timeSlot].push(p);
    });
    return Object.keys(groups).sort().reduce((acc, key) => { acc[key] = groups[key]; return acc; }, {} as Record<string, any[]>);
  }, [visibleList, activeSession]);


  return (
    <>
      {/* --- JUDGE SETUP MODAL --- */}
      {!isReady && (
        <div className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-xl flex items-center justify-center">
          <div className="w-[420px] bg-zinc-950 border border-white/10 rounded-2xl p-8 space-y-6 shadow-2xl">
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

      {/* --- MAIN AUDITION DECK --- */}
      {isReady && (
        <div className={`flex h-full bg-black text-white shadow-[0_0_50px_-12px_rgba(255,255,255,0.1)]`}>
          <div className="flex-1 flex flex-col">
            <header className={`p-6 border-b-2 bg-zinc-950 ${ROLE_THEMES[judgeRole!].color}`}>
              <div className="flex justify-between items-center">
                
                {/* LEFT: Judge Info & Escape Hatch */}
                <button onClick={reopenJudgeSetup} className="text-left group">
                  <h1 className="text-2xl font-black italic uppercase">Audition Deck</h1>
                  <div className="flex items-center gap-2">
                      <p className="text-[9px] uppercase text-zinc-500">{judgeName} • {judgeRole}</p>
                      
                      {/* RESET BUTTON */}
                      <span 
                          onClick={(e) => {
                              e.stopPropagation();
                              if(confirm("Reload active production data?")) {
                                  localStorage.removeItem('activeShowId'); 
                                  window.location.href = "/"; 
                              }
                          }}
                          className="text-[9px] text-blue-900 group-hover:text-blue-500 cursor-pointer transition-colors"
                      >
                          (Switch Show)
                      </span>
                  </div>
                </button>

                {/* RIGHT: Session Tabs */}
                <div className="flex gap-2">
                  {(["Thursday", "Friday", "Video/Remote", "Walk-In"] as const).map((s) => (
                    <button key={s} onClick={() => { setActiveSession(s); setSearchQuery(""); }} className={`px-4 py-2 rounded-lg text-[10px] font-black uppercase transition-colors ${activeSession === s ? "bg-white text-black" : "text-zinc-500 hover:text-zinc-300"}`}>
                      {s === "Walk-In" ? <span className="flex items-center gap-1"><UserPlus size={12}/> Walk-In</span> : s}
                    </button>
                  ))}
                </div>
              </div>

              {/* SEARCH BAR */}
              <div className="mt-4 relative w-64">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-600" />
                <input value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="w-full bg-zinc-900 rounded-lg py-2 pl-10 text-xs focus:ring-1 ring-white/10 outline-none" placeholder={activeSession === "Walk-In" ? "Type student name..." : "Find in schedule..."} autoFocus={activeSession === "Walk-In"} />
              </div>
            </header>

            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {activeSession === "Walk-In" && visibleList.length === 0 && (
                <div className="text-center text-zinc-500 mt-20"><UserPlus size={48} className="mx-auto mb-4 opacity-20" /><p className="text-sm">Start typing to find a student...</p></div>
              )}

              {Object.entries(grouped).map(([time, people]) => (
                <div key={time}>
                  {activeSession !== "Walk-In" && <h3 className="text-xs uppercase text-blue-500 mb-2 flex items-center gap-1"><Clock size={12} /> {time}</h3>}
                  {people.map((person) => (
                    <div key={person.id} className="flex gap-2 mb-3 group">
                        <button
                          onClick={() => {
                            setSelectedPerson(person);
                            // --- FIXED LOADING LOGIC START ---
                            // 1. Check if we have unsaved local changes (grades state)
                            const saved = grades[person.id] || {};
                            
                            // 2. Determine which note to display based on the CURRENT JUDGE
                            let loadedNote = "";
                            if (saved.notes) {
                                // Prefer locally saved note if user just typed it
                                loadedNote = saved.notes;
                            } else {
                                // Otherwise load from DB column based on role
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
                            // --- FIXED LOADING LOGIC END ---
                          }}
                          className={`flex-1 flex items-center gap-4 p-3 rounded-xl transition-all border ${selectedPerson?.id === person.id ? "bg-zinc-800 border-blue-500 ring-1 ring-blue-500" : "bg-zinc-900 border-white/5 hover:bg-zinc-800"}`}
                        >
                            <div className="relative flex-shrink-0">
                                {person.avatar ? <img src={person.avatar} className="w-12 h-12 rounded-full object-cover" alt="" /> : <div className="w-12 h-12 rounded-full bg-zinc-800 flex items-center justify-center"><User size={20} className="text-zinc-600"/></div>}
                                {grades[person.id] && !person.isWalkIn && <div className="absolute -top-1 -right-1 bg-black rounded-full"><CheckCircle2 size={16} className="text-emerald-500" /></div>}
                            </div>
                            <div className="text-left">
                                <p className="font-bold text-sm flex items-center gap-2">
                                  {person.name}
                                  {person.video && <Film size={12} className="text-blue-500" />}
                                </p>
                                <p className="text-[10px] text-zinc-500">{person.isWalkIn ? "Click to Audition Now" : `Age ${person.age}`}</p>
                            </div>
                        </button>
                        
                        {person.video && (
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    window.open(person.video, "_blank");
                                }}
                                className="px-4 bg-zinc-900 hover:bg-zinc-800 rounded-xl transition-colors border border-white/5 flex items-center justify-center text-blue-500 hover:text-blue-400 group-hover:border-blue-500/30"
                                title="Watch Audition in New Tab"
                            >
                                <PlayCircle size={20} />
                            </button>
                        )}
                        
                        <button onClick={() => setInspectingActor(person)} className="px-4 bg-zinc-900 hover:bg-zinc-800 rounded-xl transition-colors border border-white/5 flex items-center justify-center text-zinc-400 hover:text-white" title="View Radar Profile"><User size={18} /></button>
                    </div>
                  ))}
                </div>
              ))}
            </div>
          </div>

          {/* --- SCORING SIDEBAR --- */}
          {selectedPerson && (
            <aside className="fixed inset-0 z-[200] w-full bg-zinc-950 flex flex-col md:relative md:w-[420px] md:border-l md:border-white/10 md:z-50">
               
               {/* 1. HEADER */}
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
                    <button onClick={() => setSelectedPerson(null)} className="text-zinc-500 hover:text-white transition-colors"><X size={24}/></button>
                 </div>
               </div>

               <div className="p-6 space-y-6 flex-1 overflow-y-auto custom-scrollbar">
                  
                  {/* VIDEO PLAYER */}
                  {selectedPerson.video && (
                     <div className="rounded-xl overflow-hidden border border-white/10 bg-black aspect-video relative group shadow-2xl">
                        <video 
                            src={selectedPerson.video} 
                            controls 
                            className="w-full h-full object-contain"
                            poster={selectedPerson.avatar}
                        />
                        <div className="absolute top-2 left-2 bg-black/60 backdrop-blur px-2 py-1 rounded text-[10px] font-bold uppercase text-white pointer-events-none border border-white/10">
                            Audition Tape
                        </div>
                     </div>
                  )}

                  {/* 2. SCORE DISPLAY */}
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

                  {/* 3. SLIDERS */}
                  <div className="space-y-6">
                      <RubricSlider label="Vocal Ability" val={currentScores.vocal} setVal={(v) => setCurrentScores((s) => ({ ...s, vocal: v }))} disabled={judgeRole !== "Music" && judgeRole !== "Admin"} />
                      <RubricSlider label="Acting / Reads" val={currentScores.acting} setVal={(v) => setCurrentScores((s) => ({ ...s, acting: v }))} disabled={judgeRole !== "Director" && judgeRole !== "Admin"} />
                      {(judgeRole === "Choreographer" || judgeRole === "Admin") && (
                        <RubricSlider label="Dance / Movement" val={currentScores.dance} setVal={(v) => setCurrentScores((s) => ({ ...s, dance: v }))} disabled={false} />
                      )}
                      <RubricSlider label="Stage Presence" val={currentScores.presence} setVal={(v) => setCurrentScores((s) => ({ ...s, presence: v }))} disabled={judgeRole !== "Director" && judgeRole !== "Admin"} />
                  </div>

                  {/* NOTES */}
                  <div className="pt-2 border-t border-white/5">
                    <label className="text-xs uppercase text-zinc-500 font-bold mb-3 block tracking-widest flex items-center gap-2"><MessageSquare size={12}/> Notes</label>
                    <textarea className="w-full bg-zinc-900 border border-white/10 p-4 rounded-xl text-sm min-h-[100px] focus:border-blue-500 outline-none resize-none transition-all placeholder:text-zinc-700" placeholder={`Internal notes for ${selectedPerson.name}...`} value={currentScores.notes} onChange={(e) => setCurrentScores((s) => ({ ...s, notes: e.target.value }))} />
                  </div>
               </div>

               {/* FOOTER */}
               <div className="p-6 border-t border-white/10 bg-zinc-900/50">
                 <button onClick={handleCommit} className="w-full bg-blue-600 hover:bg-blue-500 py-4 rounded-xl font-black uppercase tracking-widest shadow-lg shadow-blue-900/20 flex items-center justify-center gap-2 transition-transform active:scale-95">
                   <Save size={18} />
                   {selectedPerson.isWalkIn ? "Submit Walk-In" : "Save Score"}
                 </button>
               </div>
            </aside>
          )}
        </div>
      )}

      {/* Modal */}
      {inspectingActor && <ActorProfileModal actor={inspectingActor} grades={grades[inspectingActor.id]} onClose={() => setInspectingActor(null)} />}
    </>
  );
}

function RubricSlider({ label, val, setVal, disabled }: { label: string; val: number; setVal: (v: number) => void; disabled?: boolean }) {
  return (
    <div className={`mb-4 transition-opacity ${disabled ? "opacity-50 grayscale" : "opacity-100"}`}>
      <div className="flex justify-between items-end mb-2">
        <p className="text-[10px] uppercase font-black text-zinc-500 tracking-widest">{label} {disabled && "(View Only)"}</p>
        <span className={`text-xs font-bold ${val > 0 ? 'text-white' : 'text-zinc-700'}`}>{val || '-'}</span>
      </div>
      <div className="flex gap-1.5">
        {[1, 2, 3, 4, 5].map((n) => (
          <button key={n} onClick={() => !disabled && setVal(n)} disabled={disabled} className={`flex-1 py-3 rounded-lg font-black transition-all border ${val === n ? "bg-white text-black border-white shadow-lg" : "bg-zinc-900 border-white/5 text-zinc-500"} ${!disabled && "hover:border-zinc-700 hover:text-zinc-300 cursor-pointer"} ${disabled && "cursor-not-allowed border-transparent"}`}>{n}</button>
        ))}
      </div>
    </div>
  );
}