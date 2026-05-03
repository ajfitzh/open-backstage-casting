/* eslint-disable react-hooks/set-state-in-effect */
"use client";

import React, { useState, useEffect, useMemo } from "react";
import {
  User, Clock, CheckCircle2, Search, UserPlus, PlayCircle, Film, Loader2, Music
} from "lucide-react";
import { getAuditionees, updateAuditionSlot, submitAudition } from "@/app/lib/baserow";
import ActorProfileModal from "@/app/components/ActorProfileModal";
import ChoreoWorkspace from "@/app/components/ChoreoWorkspace";

import JudgeSetupModal from "./JudgeSetupModal";
import ScoringSidebar from "./ScoringSidebar";

export type AuditionSession = "Scheduled" | "Video/Remote" | "Walk-In";
export type JudgeRole = "Director" | "Music" | "Choreographer" | "Drop-In" | "Admin";

export interface Performer {
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
  isCheckedIn: boolean;
  backingTrack: string; // 🟢 Added
  lobbyNote: string;    // 🟢 Added
}

export const ROLE_THEMES: Record<JudgeRole, { color: string; text: string; glow: string; weight: string }> = {
  Director: { color: "border-blue-500", text: "text-blue-400", glow: "shadow-blue-500/20", weight: "Acting 70% | Vocal 30%" },
  Music: { color: "border-purple-500", text: "text-purple-400", glow: "shadow-purple-500/20", weight: "Vocal 80% | Acting 20%" },
  Choreographer: { color: "border-emerald-500", text: "text-emerald-400", glow: "shadow-emerald-500/20", weight: "Dance 100%" },
  "Drop-In": { color: "border-amber-500", text: "text-amber-400", glow: "shadow-amber-500/20", weight: "Impression Only" },
  Admin: { color: "border-zinc-100", text: "text-zinc-100", glow: "shadow-white/5", weight: "Full Access" },
};

interface AuditionsClientProps {
  tenant: string;
  productionId: number;
  productionTitle: string;
}

export default function AuditionsClient({ tenant, productionId, productionTitle }: AuditionsClientProps) {
  const [isMounted, setIsMounted] = useState(false); 
  
  const [judgeName, setJudgeName] = useState("");
  const [judgeRole, setJudgeRole] = useState<JudgeRole | null>(null);
  const [isReady, setIsReady] = useState(false);

  const [searchQuery, setSearchQuery] = useState("");
  const [activeSession, setActiveSession] = useState<AuditionSession>("Scheduled");
  const [selectedPerson, setSelectedPerson] = useState<Performer | null>(null);
  const [inspectingActor, setInspectingActor] = useState<Performer | null>(null);
  const [loading, setLoading] = useState(false);

  const [scheduledPerformers, setScheduledPerformers] = useState<Performer[]>([]);
  const [allStudents, setAllStudents] = useState<any[]>([]); 
  const [grades, setGrades] = useState<Record<number, any>>({});
  
  const [currentScores, setCurrentScores] = useState({
    vocal: 0, acting: 0, dance: 0, presence: 0, notes: "",
  });

  const reopenJudgeSetup = () => setIsReady(false);

  useEffect(() => {
    setIsMounted(true); 
    const savedName = localStorage.getItem("judgeName");
    const savedRole = localStorage.getItem("judgeRole") as JudgeRole | null;
    
    if (savedName && savedRole) {
      setJudgeName(savedName);
      setJudgeRole(savedRole);
      setIsReady(true);
    } else {
      const defaultName = "Austin Fitzhugh";
      const defaultRole: JudgeRole = "Director";
      setJudgeName(defaultName);
      setJudgeRole(defaultRole);
      localStorage.setItem("judgeName", defaultName);
      localStorage.setItem("judgeRole", defaultRole);
      setIsReady(true); 
    }
  }, []);

  useEffect(() => {
    let intervalId: NodeJS.Timeout;

    const loadData = async (isBackgroundPoll = false) => {
      if (!isReady || !productionId) return;
      
      if (!isBackgroundPoll && scheduledPerformers.length === 0) {
        setLoading(true);
      }
      
      try {
        const slots = await getAuditionees(tenant, productionId);
        
        const formatHeight = (val: any) => {
          if (!val) return "N/A";
          if (String(val).includes("'")) return val; 
          const num = Number(val);
          if (isNaN(num)) return val;
          return `${Math.floor(num / 12)}'${num % 12}"`;
        };

        const formattedSchedule: Performer[] = slots.map((row: any) => {
           let session: AuditionSession = "Video/Remote";
           let displayTime = "TBD";

           if (row.timeSlotLabel) {
             session = "Scheduled";
             displayTime = row.timeSlotLabel; 
           } else if (row.date) {
             const dateObj = new Date(row.date);
             session = "Scheduled"; 
             displayTime = dateObj.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit', hour12: true });
           } else if (row.video) {
               session = "Video/Remote";
           }

           if (row.status === "Walk-In") session = "Walk-In";

           const actorIsCheckedIn = row.checkedIn === true || row.status === "Walk-In";

           return {
             id: row.id,
             originalId: row.id, 
             performerId: row.studentId, 
             name: row.name || "Unknown Actor", 
             avatar: row.headshot || null,      
             age: row.age || "?",
             video: row.video || null,
             height: formatHeight(row.height),
             vocalRange: row.vocalRange || "",
             dob: row.dob || "",
             conflicts: row.conflicts || "",
             tenure: row.status || "Unknown", 
             pastRoles: row.pastRoles || [],
             song: row.song || "",
             monologue: row.monologue || "",
             timeSlot: displayTime,
             session: session,
             vocal: parseFloat(row.vocalScore) || 0,
             acting: parseFloat(row.actingScore) || 0,
             dance: parseFloat(row.danceScore) || 0,
             presence: 0, 
             actingNotes: row.actingNotes || "",
             musicNotes: row.musicNotes || "",
             choreoNotes: row.choreoNotes || "",
             dropInNotes: row.dropInNotes || "",
             adminNotes: row.adminNotes || "",
             isWalkIn: row.status === "Walk-In",
             isCheckedIn: actorIsCheckedIn,
             backingTrack: row.backingTrack || "", // 🟢 Mapped cleanly
             lobbyNote: row.lobbyNote || ""        // 🟢 Mapped cleanly
           };
        });

        setScheduledPerformers(formattedSchedule);

        const initialGrades: Record<number, any> = {};
        formattedSchedule.forEach(p => {
          if (p.vocal > 0 || p.dance > 0 || p.acting > 0 || p.video) initialGrades[p.id] = p;
        });
        setGrades(initialGrades);
        setAllStudents(slots);

      } catch (err) {
        console.error("❌ CRITICAL LOAD ERROR:", err);
      } finally {
        if (!isBackgroundPoll) {
          setLoading(false);
        }
      }
    };

    loadData(false);

    if (isReady && productionId) {
      intervalId = setInterval(() => {
        loadData(true);
      }, 15000); 
    }

    return () => {
      if (intervalId) clearInterval(intervalId);
    };
  }, [isReady, productionId, productionTitle, tenant]);

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
    
    updateAuditionSlot(tenant, actorId, payload).catch(err => console.error("Auto-save failed", err));
  };

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
      };

      if (judgeRole === "Admin") {
         const currentNotes = selectedPerson.adminNotes || "";
         payload["Admin Notes"] = currentNotes + "\n\nAdmin Log: " + scoresToSave.notes;
      } else {
         switch (judgeRole) {
            case "Director": payload["Acting Notes"] = scoresToSave.notes; break;
            case "Music": payload["Music Notes"] = scoresToSave.notes; break;
            case "Choreographer": payload["Choreography Notes"] = scoresToSave.notes; break;
            case "Drop-In": payload["Drop-In Notes"] = scoresToSave.notes; break;
         }
      }

      if (isWalkIn) {
        await submitAudition(tenant, originalId, productionId, payload);
        alert("Walk-In Created!");
      } else {
        await updateAuditionSlot(tenant, personId, payload);
      }
      
      setSelectedPerson((current) => (current?.id === personId ? null : current));
      
    } catch (err) {
      console.error(err);
      alert("Save failed! Check connection.");
    }
  };

  const calculateWeightedScore = (scores: any) => {
    if (!judgeRole) return 0;
    const s = {
      vocal: Number(scores.vocal) || 0,
      acting: Number(scores.acting) || 0,
      dance: Number(scores.dance) || 0,
    };
    switch(judgeRole) {
      case "Director": return (s.acting * 0.7) + (s.vocal * 0.3); 
      case "Music": return (s.vocal * 0.8) + (s.acting * 0.2);
      case "Choreographer": return s.dance;
      default: return (s.vocal + s.acting + s.dance) / 3;
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
          isCheckedIn: true,
          vocal: 0, acting: 0, dance: 0, presence: 0, 
          actingNotes: "", musicNotes: "", choreoNotes: "", dropInNotes: "", adminNotes: "",
          height: "", vocalRange: "", dob: "", conflicts: "", tenure: "", pastRoles: [], song: "", monologue: "", video: null,
          backingTrack: "", lobbyNote: ""
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
    {!isReady && (
      <JudgeSetupModal
        isMounted={isMounted}
        judgeName={judgeName}
        setJudgeName={setJudgeName}
        judgeRole={judgeRole}
        setJudgeRole={setJudgeRole}
        setIsReady={setIsReady}
      />
    )}

    {isReady && (
      judgeRole === 'Choreographer' ? (
        <div className="h-screen bg-black flex flex-col">
            <div className="h-14 bg-zinc-900 border-b border-white/5 flex items-center justify-between px-4 shrink-0">
                <button onClick={reopenJudgeSetup} className="text-[10px] font-black uppercase text-zinc-500 hover:text-white transition-colors">
                    Exit Dance Mode
                </button>
                <div className="flex gap-2">
                      {(["Scheduled", "Walk-In"] as const).map((s) => (
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
        <div className={`flex h-full bg-black text-white shadow-[0_0_50px_-12px_rgba(255,255,255,0.1)]`}>
          <div className="flex-1 flex flex-col min-w-0">
            
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

                <div className="flex gap-2 overflow-x-auto pb-2 md:pb-0 w-full md:w-auto no-scrollbar mask-linear-fade">
                  {(["Scheduled", "Video/Remote", "Walk-In"] as const).map((s) => (
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

            <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-6">
              {loading && <div className="text-center text-zinc-500 mt-20"><Loader2 className="animate-spin mx-auto mb-2"/> Loading Auditions...</div>}

              {activeSession === "Walk-In" && visibleList.length === 0 && !loading && (
                <div className="text-center text-zinc-500 mt-20"><UserPlus size={48} className="mx-auto mb-4 opacity-20" /><p className="text-sm">Start typing to find a student...</p></div>
              )}

              {Object.entries(grouped).map(([time, people]) => (
                <div key={time}>
                  {activeSession !== "Walk-In" && <h3 className="text-xs uppercase text-blue-500 mb-2 flex items-center gap-1 sticky top-0 bg-black/90 backdrop-blur py-2 z-10"><Clock size={12} /> {time}</h3>}
                  {people.map((person) => {
                    
                    const displayName = person.isCheckedIn ? person.name : `Actor #${person.id.toString().padStart(3, '0')}`;
                    const displayAge = person.isCheckedIn ? `Age ${person.age}` : "Waiting in Lobby...";
                    const displayAvatar = person.isCheckedIn ? person.avatar : null;
                    
                    return (
                    <div key={person.id} className="flex gap-2 mb-3 group">
                        <button
                          onClick={() => {
                            if (!person.isCheckedIn) {
                              alert("This actor has not been checked in yet.");
                              return;
                            }
                            
                            setSelectedPerson(person);
                            const saved = grades[person.id] || {};
                            let loadedNote = "";
                            if (saved.notes) {
                                loadedNote = saved.notes;
                            } else {
                                switch(judgeRole) {
                                    case "Director": loadedNote = person.actingNotes; break;
                                    case "Music": loadedNote = person.musicNotes; break;
                                    case "Drop-In": loadedNote = person.dropInNotes; break;
                                    case "Admin": loadedNote = person.adminNotes; break;
                                    default: loadedNote = ""; break;
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
                          className={`flex-1 flex items-center gap-3 md:gap-4 p-3 rounded-xl transition-all border min-w-0 ${selectedPerson?.id === person.id ? "bg-zinc-800 border-blue-500 ring-1 ring-blue-500" : "bg-zinc-900 border-white/5 hover:bg-zinc-800"} ${!person.isCheckedIn ? "opacity-60 grayscale" : ""}`}
                        >
                            <div className="relative flex-shrink-0">
                                {displayAvatar ? <img src={displayAvatar} className="w-10 h-10 md:w-12 md:h-12 rounded-full object-cover" alt="" /> : <div className="w-10 h-10 md:w-12 md:h-12 rounded-full bg-zinc-800 flex items-center justify-center"><User size={20} className="text-zinc-600"/></div>}
                                {grades[person.id] && !person.isWalkIn && <div className="absolute -top-1 -right-1 bg-black rounded-full"><CheckCircle2 size={14} className="text-emerald-500" /></div>}
                                
                                {/* 🟢 Replaced parsedNotes logic with direct field read */}
                                {person.lobbyNote && !grades[person.id] && (
                                  <div className="absolute -top-1 -left-1 w-3 h-3 bg-amber-500 border-2 border-zinc-900 rounded-full animate-bounce shadow-[0_0_8px_rgba(245,158,11,0.6)]"></div>
                                )}
                            </div>
                            <div className="text-left min-w-0 flex-1">
                                <p className="font-bold text-sm flex items-center gap-2 truncate">
                                  <span className="truncate">{displayName}</span>
                                  {person.video && <Film size={12} className="text-blue-500 shrink-0" />}
                                  
                                  {/* 🟢 Replaced parsedNotes logic with direct field read */}
                                  {person.backingTrack && <Music size={12} className="text-purple-500 shrink-0" />}
                                </p>
                                <p className="text-[10px] text-zinc-500 truncate">{person.isWalkIn ? "Click to Audition Now" : displayAge}</p>
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
                          onClick={() => {
                            if (!person.isCheckedIn) {
                              alert("Profile locked until actor checks in.");
                              return;
                            }
                            setInspectingActor(person);
                          }} 
                          className={`w-10 md:px-4 bg-zinc-900 hover:bg-zinc-800 rounded-xl transition-colors border border-white/5 flex items-center justify-center shrink-0 ${person.isCheckedIn ? "text-zinc-400 hover:text-white" : "text-zinc-700 cursor-not-allowed"}`} 
                        >
                          <User size={18} />
                        </button>
                    </div>
                  )})}
                </div>
              ))}
            </div>
          </div>

          {selectedPerson && (
            <ScoringSidebar
                selectedPerson={selectedPerson}
                setSelectedPerson={setSelectedPerson}
                judgeRole={judgeRole!}
                currentScores={currentScores}
                setCurrentScores={setCurrentScores}
                handleCommit={handleCommit}
                calculateWeightedScore={calculateWeightedScore}
            />
          )}
        </div>
      )
    )}

    {inspectingActor && <ActorProfileModal actor={inspectingActor} grades={grades[inspectingActor.id]} onClose={() => setInspectingActor(null)} />}
  </>
);
}