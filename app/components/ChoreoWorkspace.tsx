/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import React, { useState, useEffect, useRef, useMemo } from "react";
import { 
  ArrowLeft, ArrowRight, Move, 
  AlertTriangle, Star, Zap, Smile, ThumbsUp, MessageSquare,
  Video, Users, Loader2, RefreshCw, ChevronDown, Trash2
} from "lucide-react";

// --- CONFIG ---
const STANDARD_TAGS = [
  { id: "#Featured", label: "Featured", icon: Star, color: "bg-purple-600 border-purple-400" },
  { id: "#Tap", label: "Tap", icon: Zap, color: "bg-blue-600 border-blue-400" },
  { id: "#Acro", label: "Acro", icon: Move, color: "bg-emerald-600 border-emerald-400" },
];

const LEVELS = [
  { val: 2, label: "Non-Mover", color: "bg-zinc-800 text-zinc-400 border-zinc-600" },
  { val: 3, label: "Mover", color: "bg-blue-900/30 text-blue-300 border-blue-500/50" },
  { val: 4, label: "Dancer", color: "bg-purple-900/30 text-purple-300 border-purple-500/50" },
  { val: 5, label: "Advanced", color: "bg-emerald-900/30 text-emerald-300 border-emerald-500/50" },
];

export default function ChoreoWorkspace({ 
  people, 
  initialGrades, 
  onSave 
}: { 
  people: any[]; 
  initialGrades: any; 
  onSave: (id: number, score: number, tags: string, videoUrl?: string) => void;
}) {
  // --- STATE ---
  const [activeSlot, setActiveSlot] = useState<string>("");
  const [viewMode, setViewMode] = useState<'group' | 'grade'>('group');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [localNotes, setLocalNotes] = useState("");
  
  // UPLOAD STATE
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState("0%");

  // SWIPE REFS
  const touchStartX = useRef<number | null>(null);
  const touchEndX = useRef<number | null>(null);

  // --- GROUPING LOGIC ---
  const groupedPeople = useMemo(() => {
      const groups: Record<string, any[]> = {};
      people.forEach(p => {
          const slot = p.timeSlot || "Unscheduled";
          if (!groups[slot]) groups[slot] = [];
          groups[slot].push(p);
      });
      return groups;
  }, [people]);

  const slots = Object.keys(groupedPeople).sort();
  
  useEffect(() => {
      if (slots.length > 0 && !activeSlot) setActiveSlot(slots[0]);
  }, [slots, activeSlot]);

  const currentGroup = groupedPeople[activeSlot] || [];
  const activeStudent = currentGroup[selectedIndex];
  const activeGrade = initialGrades[activeStudent?.id] || {};

  const groupVideoUrl = currentGroup.length > 0 
      ? (initialGrades[currentGroup[0].id]?.video || currentGroup[0].video) 
      : null;

  useEffect(() => {
      setLocalNotes(activeGrade.choreoNotes || "");
  }, [activeStudent?.id, activeGrade.choreoNotes]);


  // --- ACTIONS ---
  const handleScore = (score: number) => onSave(activeStudent.id, score, localNotes);
  const handleManualNoteChange = (text: string) => setLocalNotes(text);
  const saveNotes = () => onSave(activeStudent.id, activeGrade.dance || 0, localNotes);

  const handleToggleTag = (tag: string) => {
    let newNotes = localNotes;
    if (newNotes.includes(tag)) newNotes = newNotes.replace(tag, "").trim();
    else newNotes = `${newNotes} ${tag}`.trim();
    setLocalNotes(newNotes); 
    onSave(activeStudent.id, activeGrade.dance || 0, newNotes); 
  };

  const handleAttitudeCycle = () => {
    let newNotes = localNotes;
    if (newNotes.includes("#GreatAttitude")) newNotes = newNotes.replace("#GreatAttitude", "#BadAttitude");
    else if (newNotes.includes("#BadAttitude")) newNotes = newNotes.replace("#BadAttitude", "").trim();
    else newNotes = `${newNotes} #GreatAttitude`.trim();
    setLocalNotes(newNotes);
    onSave(activeStudent.id, activeGrade.dance || 0, newNotes);
  };

  const getAttitudeState = () => {
      if (localNotes.includes("#GreatAttitude")) return "good";
      if (localNotes.includes("#BadAttitude")) return "bad";
      return "none";
  };
  const attState = getAttitudeState();

  const handleBatchVideoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      setIsUploading(true);
      setUploadProgress("Start");
      try {
          const res = await fetch('/api/upload', {
              method: 'POST',
              body: JSON.stringify({ filename: `GROUP-${activeSlot}-${file.name}`, fileType: file.type }),
          });
          if (!res.ok) throw new Error("Failed to sign");
          const { uploadUrl, publicUrl } = await res.json();

          setUploadProgress("Uploading...");
          const uploadRes = await fetch(uploadUrl, {
              method: 'PUT',
              body: file,
              headers: { "Content-Type": file.type, "x-amz-acl": "public-read" },
          });
          if (!uploadRes.ok) throw new Error("Upload failed");

          alert("Video Uploaded! Linking to all dancers in this group...");
          currentGroup.forEach(student => {
              const oldNotes = initialGrades[student.id]?.choreoNotes || "";
              const oldScore = initialGrades[student.id]?.dance || 0;
              if (!oldNotes.includes(publicUrl)) {
                  const newNotes = `${oldNotes} [GROUP VIDEO]`.trim();
                  onSave(student.id, oldScore, newNotes, publicUrl);
              }
          });
      } catch (err) {
          console.error(err);
          alert("Upload failed. Use Camera Roll.");
      } finally {
          setIsUploading(false);
          setUploadProgress("0%");
      }
  };

  const handleDeleteVideo = () => {
      if(!confirm("Delete this group video? This cannot be undone.")) return;
      currentGroup.forEach(student => {
          const oldScore = initialGrades[student.id]?.dance || 0;
          const oldNotes = initialGrades[student.id]?.choreoNotes || "";
          const cleanNotes = oldNotes.replace("[GROUP VIDEO]", "").trim();
          onSave(student.id, oldScore, cleanNotes, "DELETE");
      });
  };

  const changeStudent = (delta: number) => {
      const newIndex = selectedIndex + delta;
      if (newIndex >= 0 && newIndex < currentGroup.length) setSelectedIndex(newIndex);
  };

  const handleTouchStart = (e: React.TouchEvent) => { touchStartX.current = e.targetTouches[0].clientX; };
  const handleTouchMove = (e: React.TouchEvent) => { touchEndX.current = e.targetTouches[0].clientX; };
  const handleTouchEnd = () => {
      if (!touchStartX.current || !touchEndX.current) return;
      const distance = touchStartX.current - touchEndX.current;
      if (distance > 50) changeStudent(1);
      if (distance < -50) changeStudent(-1);
      touchStartX.current = null;
      touchEndX.current = null;
  };

  if (!activeSlot) return <div className="p-8 text-center text-zinc-500">Loading Groups...</div>;

  return (
    <div className="flex flex-col h-full bg-black overflow-hidden relative">
      
      {/* 0. TIME SLOTS */}
      <div className={`h-14 bg-zinc-900 border-b border-white/5 flex items-center px-2 gap-2 overflow-x-auto shrink-0 custom-scrollbar transition-all duration-300 ${viewMode === 'grade' ? 'h-0 opacity-0 overflow-hidden border-none' : ''}`}>
          {slots.map((slot) => {
              const isActive = slot === activeSlot;
              const count = groupedPeople[slot].length;
              return (
                  <button
                    key={slot}
                    onClick={() => { setActiveSlot(slot); setViewMode('group'); setSelectedIndex(0); }}
                    className={`px-4 py-2 rounded-full text-[11px] font-black uppercase whitespace-nowrap transition-all flex-shrink-0 flex flex-col items-center leading-none gap-1
                        ${isActive ? 'bg-blue-600 text-white shadow-lg' : 'bg-zinc-800 text-zinc-500 border border-white/5'}
                    `}
                  >
                      <span>{slot}</span>
                      <span className={`text-[8px] ${isActive ? 'text-blue-200' : 'text-zinc-600'}`}>{count} Dancers</span>
                  </button>
              )
          })}
      </div>

      {/* === PERSISTENT VIDEO PLAYER === */}
      {/* UPDATE: Adjusted height to h-36 (9rem) on mobile grade mode to save space */}
      <div className={`w-full bg-black border-b border-white/10 shrink-0 relative transition-all duration-500 ease-in-out
          ${viewMode === 'group' ? 'flex-1 max-h-[40vh]' : 'h-36 md:h-64'}
      `}>
          {groupVideoUrl ? (
              <div className="relative w-full h-full group">
                  <video 
                      src={groupVideoUrl} 
                      controls 
                      playsInline
                      className="w-full h-full object-contain bg-zinc-950"
                  />
                  <div className="absolute top-2 right-2 flex gap-2 z-10">
                     <label className="flex items-center gap-2 bg-black/60 hover:bg-black/80 backdrop-blur text-white px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase cursor-pointer border border-white/10 transition-colors">
                         <RefreshCw size={12} /> Retake
                         <input type="file" accept="video/*" capture="environment" className="hidden" onChange={handleBatchVideoUpload} disabled={isUploading} />
                     </label>
                     <button 
                        onClick={handleDeleteVideo}
                        className="flex items-center gap-2 bg-red-600/80 hover:bg-red-600 backdrop-blur text-white px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase cursor-pointer border border-white/10 transition-colors"
                     >
                         <Trash2 size={12} /> Delete
                     </button>
                  </div>
              </div>
          ) : (
              <label className={`w-full h-full flex flex-col items-center justify-center gap-3 transition-all cursor-pointer bg-zinc-900 ${isUploading ? 'opacity-50 cursor-wait' : ''}`}>
                  {isUploading ? (
                      <>
                        <Loader2 size={32} className="text-blue-500 animate-spin" />
                        <span className="text-blue-500 font-black uppercase tracking-widest text-xs">{uploadProgress}</span>
                      </>
                  ) : (
                      <>
                        <div className="w-12 h-12 rounded-full bg-red-600 flex items-center justify-center shadow-lg shadow-red-900/40">
                            <Video size={24} className="text-white" />
                        </div>
                        <div className="text-center">
                            <p className="text-white font-black uppercase tracking-wider text-xs">Record Group Video</p>
                        </div>
                        <input type="file" accept="video/*" capture="environment" className="hidden" onChange={handleBatchVideoUpload} disabled={isUploading} />
                      </>
                  )}
              </label>
          )}

          {viewMode === 'grade' && (
              <button 
                  onClick={() => setViewMode('group')}
                  className="absolute top-2 left-2 z-20 flex items-center gap-1 text-white text-[10px] font-black uppercase bg-black/60 px-3 py-1.5 rounded-full backdrop-blur border border-white/10 hover:bg-black/80"
              >
                  <ChevronDown size={12} /> Show Roster
              </button>
          )}
      </div>

      {/* === CONTENT AREA === */}
      {/* This allows the control pad to scroll naturally */}
      <div className="flex-1 overflow-y-auto relative bg-zinc-950">
          
          {viewMode === 'group' && (
              <div className="p-4">
                  <div className="flex justify-between items-end mb-3">
                      <h3 className="text-zinc-400 font-black uppercase text-xs tracking-widest flex items-center gap-2">
                          <Users size={14} /> {activeSlot} Roster
                      </h3>
                      {currentGroup.length > 0 && (
                          <button 
                            onClick={() => { setSelectedIndex(0); setViewMode('grade'); }} 
                            className="bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-lg text-xs font-black uppercase tracking-wide flex items-center gap-2"
                          >
                              Start Grading
                          </button>
                      )}
                  </div>
                  <div className="grid grid-cols-4 gap-2 pb-24">
                      {currentGroup.map((p, i) => {
                          const grade = initialGrades[p.id]?.dance || 0;
                          return (
                              <div 
                                key={p.id} 
                                onClick={() => { setSelectedIndex(i); setViewMode('grade'); }}
                                className={`aspect-square relative rounded-lg overflow-hidden border cursor-pointer transition-all
                                    ${grade > 0 ? 'border-blue-500/50' : 'border-white/10 hover:border-white/30'}
                                `}
                              >
                                  <img src={p.avatar || "https://cdn.pixabay.com/photo/2015/10/05/22/37/blank-profile-picture-973460_1280.png"} className="w-full h-full object-cover" />
                                  {grade > 0 && (
                                      <div className="absolute inset-0 bg-blue-900/60 flex items-center justify-center">
                                          <span className="text-xl font-black text-white">{grade}</span>
                                      </div>
                                  )}
                                  <div className="absolute bottom-0 inset-x-0 bg-black/60 p-1">
                                      <p className="text-[8px] font-bold text-white truncate text-center">{p.name}</p>
                                  </div>
                              </div>
                          )
                      })}
                  </div>
              </div>
          )}

          {viewMode === 'grade' && activeStudent && (
              <div className="flex flex-col">
                  
                  {/* COMPACT STUDENT HEADER */}
                  <div className="flex items-center justify-between p-3 border-b border-white/5 bg-zinc-900/50">
                      <button onClick={() => changeStudent(-1)} disabled={selectedIndex === 0} className="p-2 text-zinc-400 hover:text-white disabled:opacity-20"><ArrowLeft size={20} /></button>
                      
                      <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full overflow-hidden border border-white/10 shrink-0">
                              <img src={activeStudent.avatar || "https://cdn.pixabay.com/photo/2015/10/05/22/37/blank-profile-picture-973460_1280.png"} className="w-full h-full object-cover" />
                          </div>
                          <div className="text-center">
                              <h2 className="text-sm font-black uppercase text-white leading-none">{activeStudent.name}</h2>
                              <p className="text-[9px] text-zinc-500 font-bold uppercase mt-0.5">#{activeStudent.id.toString().slice(-3)} • {activeStudent.age}</p>
                          </div>
                          {activeGrade.dance > 0 && (
                             <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center border-2 border-black shadow-lg ml-2">
                                 <span className="text-sm font-black text-white">{activeGrade.dance}</span>
                             </div>
                          )}
                      </div>

                      <button onClick={() => changeStudent(1)} disabled={selectedIndex === currentGroup.length - 1} className="p-2 text-zinc-400 hover:text-white disabled:opacity-20"><ArrowRight size={20} /></button>
                  </div>

                  {/* SWIPE AREA */}
                  <div 
                    className="w-full h-8 shrink-0" 
                    onTouchStart={handleTouchStart} onTouchMove={handleTouchMove} onTouchEnd={handleTouchEnd}
                  ></div>

                  {/* CONTROL PAD */}
                  {/* UPDATE: Increased pb to 48 (12rem) to clear fixed bottom nav bars */}
                  <div className="bg-zinc-900 border-t border-white/10 p-4 pb-48 rounded-t-3xl shadow-[0_-10px_40px_rgba(0,0,0,0.5)]">
                      <div className="grid grid-cols-4 gap-2 mb-3">
                          {LEVELS.map((lvl) => (
                              <button key={lvl.val} onClick={() => handleScore(lvl.val)} className={`h-14 rounded-xl flex flex-col items-center justify-center border-2 transition-all active:scale-95 ${activeGrade.dance === lvl.val ? `${lvl.color.replace('/30', '')} text-white shadow-lg scale-105` : `bg-transparent border-white/5 text-zinc-500 hover:bg-white/5`}`}>
                                  <span className="text-lg font-black">{lvl.val}</span>
                                  <span className="text-[8px] font-bold uppercase whitespace-nowrap">{lvl.label}</span>
                              </button>
                          ))}
                      </div>

                      <div className="mb-3 relative">
                          <input value={localNotes} onChange={(e) => handleManualNoteChange(e.target.value)} onBlur={saveNotes} placeholder="Type note..." className="w-full bg-black/40 border border-white/5 rounded-lg pl-9 pr-4 py-3 text-sm text-white placeholder:text-zinc-600 focus:border-blue-500 outline-none" />
                          <MessageSquare size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-600" />
                      </div>

                      <div className="flex flex-wrap justify-center gap-2">
                          {STANDARD_TAGS.map((tag) => {
                              const isActive = (localNotes || "").includes(tag.id);
                              return (
                                  <button key={tag.id} onClick={() => handleToggleTag(tag.id)} className={`flex items-center gap-1.5 px-3 py-3 rounded-full border transition-all active:scale-95 flex-grow justify-center ${isActive ? `${tag.color} text-white shadow-lg` : "bg-zinc-950 border-white/10 text-zinc-400"}`}>
                                      <tag.icon size={14} fill={isActive ? "currentColor" : "none"} />
                                      <span className="text-[10px] font-bold uppercase tracking-wide">{tag.label}</span>
                                  </button>
                              );
                          })}
                          <button onClick={handleAttitudeCycle} className={`flex items-center gap-1.5 px-3 py-3 rounded-full border transition-all active:scale-95 flex-grow justify-center ${attState === 'good' ? "bg-emerald-600 border-emerald-400 text-white shadow-lg" : attState === 'bad' ? "bg-red-600 border-red-400 text-white shadow-lg" : "bg-zinc-950 border-white/10 text-zinc-400"}`}>
                              {attState === 'good' ? <ThumbsUp size={14} fill="currentColor" /> : attState === 'bad' ? <AlertTriangle size={14} fill="currentColor" /> : <Smile size={14} />}
                              <span className="text-[10px] font-bold uppercase tracking-wide">{attState === 'good' ? "Good Att." : attState === 'bad' ? "Bad Att." : "Attitude"}</span>
                          </button>
                      </div>
                  </div>
              </div>
          )}
      </div>
    </div>
  );
}