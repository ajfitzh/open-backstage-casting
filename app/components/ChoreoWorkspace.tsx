/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import React, { useState, useEffect, useRef, useMemo } from "react";
import { 
  ArrowLeft, ArrowRight, Move, 
  AlertTriangle, Star, Zap, Smile, ThumbsUp, MessageSquare,
  Video, Users, Loader2, Play, RefreshCw, Trash2, ChevronLeft // <--- ADD THIS
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

  // Current Context
  const currentGroup = groupedPeople[activeSlot] || [];
  const activeStudent = currentGroup[selectedIndex];
  const activeGrade = initialGrades[activeStudent?.id] || {};

  // Check if Group has a video (Check first student in group for a video URL)
  // We check initialGrades first (latest save), then fallback to people prop (database load)
  const groupVideoUrl = currentGroup.length > 0 
      ? (initialGrades[currentGroup[0].id]?.video || currentGroup[0].video) 
      : null;

  useEffect(() => {
      setLocalNotes(activeGrade.choreoNotes || "");
  }, [activeStudent?.id, activeGrade.choreoNotes]);


  // --- ACTIONS (GRADING) ---
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

  // --- ACTIONS (VIDEO) ---
  const handleBatchVideoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

      setIsUploading(true);
      setUploadProgress("Start");

      try {
          // 1. Permission Slip
          const res = await fetch('/api/upload', {
              method: 'POST',
              body: JSON.stringify({ filename: `GROUP-${activeSlot}-${file.name}`, fileType: file.type }),
          });
          if (!res.ok) throw new Error("Failed to sign");
          const { uploadUrl, publicUrl } = await res.json();

          // 2. Direct Upload
          setUploadProgress("Uploading...");
          const uploadRes = await fetch(uploadUrl, {
              method: 'PUT',
              body: file,
              headers: { "Content-Type": file.type, "x-amz-acl": "public-read" },
          });
          if (!uploadRes.ok) throw new Error("Upload failed");

          // 3. BATCH SAVE
          alert("Video Uploaded! Linking to all dancers in this group...");
          
          currentGroup.forEach(student => {
              const studentGrade = initialGrades[student.id] || {};
              const oldNotes = studentGrade.choreoNotes || "";
              const oldScore = studentGrade.dance || 0;
              
              if (!oldNotes.includes(publicUrl)) {
                  const newNotes = `${oldNotes} [GROUP VIDEO]`.trim();
                  // Passing publicUrl as 4th arg updates the 'video' field in state
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

  // --- ACTIONS (NAV) ---
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
    <div className="flex flex-col h-full bg-black overflow-hidden">
      
      {/* 0. TIME SLOTS */}
      <div className="h-14 bg-zinc-900 border-b border-white/5 flex items-center px-2 gap-2 overflow-x-auto shrink-0 custom-scrollbar">
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

      {/* === VIEW 1: GROUP DASHBOARD === */}
      {viewMode === 'group' && (
          <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-6">
              
              {/* VIDEO AREA: PLAYER or RECORD BUTTON */}
              {groupVideoUrl ? (
                  <div className="w-full aspect-video bg-black rounded-2xl border border-white/10 overflow-hidden relative group">
                      {/* PLAYER */}
                      <video 
                          src={groupVideoUrl} 
                          controls 
                          playsInline
                          className="w-full h-full object-contain"
                      />
                      
                      {/* RETAKE BUTTON (Top Right Overlay) */}
                      <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                         <label className="flex items-center gap-2 bg-red-600/80 backdrop-blur text-white px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase cursor-pointer hover:bg-red-600">
                             <RefreshCw size={12} /> Retake
                             <input type="file" accept="video/*" capture="environment" className="hidden" onChange={handleBatchVideoUpload} disabled={isUploading} />
                         </label>
                      </div>
                  </div>
              ) : (
                  // RECORD BUTTON
                  <label className={`w-full aspect-video rounded-2xl border-2 border-dashed border-zinc-700 flex flex-col items-center justify-center gap-3 transition-all cursor-pointer bg-zinc-900/50 hover:bg-zinc-900 ${isUploading ? 'opacity-50 cursor-wait' : ''}`}>
                      {isUploading ? (
                          <>
                            <Loader2 size={48} className="text-blue-500 animate-spin" />
                            <span className="text-blue-500 font-black uppercase tracking-widest text-sm">{uploadProgress}</span>
                          </>
                      ) : (
                          <>
                            <div className="w-16 h-16 rounded-full bg-red-600 flex items-center justify-center shadow-lg shadow-red-900/40">
                                <Video size={32} className="text-white" />
                            </div>
                            <div className="text-center">
                                <p className="text-white font-black uppercase tracking-wider text-sm">Record Group Video</p>
                                <p className="text-zinc-500 text-[10px] uppercase font-bold">Landscape • 45s • Linked to all {currentGroup.length} dancers</p>
                            </div>
                            <input type="file" accept="video/*" capture="environment" className="hidden" onChange={handleBatchVideoUpload} disabled={isUploading} />
                          </>
                      )}
                  </label>
              )}

              {/* ROSTER GRID */}
              <div>
                  <div className="flex justify-between items-end mb-3">
                      <h3 className="text-zinc-400 font-black uppercase text-xs tracking-widest flex items-center gap-2">
                          <Users size={14} /> Group Roster
                      </h3>
                      <button 
                        onClick={() => setViewMode('grade')} 
                        className="bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-lg text-xs font-black uppercase tracking-wide flex items-center gap-2"
                      >
                          Start Grading <Play size={12} fill="currentColor" />
                      </button>
                  </div>
                  
                  <div className="grid grid-cols-4 gap-2">
                      {currentGroup.map((p, i) => {
                          const grade = initialGrades[p.id]?.dance || 0;
                          return (
                              <div 
                                key={p.id} 
                                onClick={() => { setSelectedIndex(i); setViewMode('grade'); }}
                                className="aspect-square relative rounded-lg overflow-hidden border border-white/10 cursor-pointer"
                              >
                                  <img src={p.avatar} className="w-full h-full object-cover opacity-80 hover:opacity-100" />
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
          </div>
      )}

      {/* === VIEW 2: GRADING MODE (Swipe) === */}
      {viewMode === 'grade' && activeStudent && (
          <div className="flex-1 flex flex-col h-full overflow-hidden">
              
              {/* STAGE */}
              <div 
                className="flex-1 relative flex flex-col p-4 min-h-0 overflow-y-auto items-center justify-center"
                onTouchStart={handleTouchStart} onTouchMove={handleTouchMove} onTouchEnd={handleTouchEnd}
              >
                 <button 
                    onClick={() => setViewMode('group')}
                    className="absolute top-4 left-4 z-20 flex items-center gap-1 text-zinc-500 hover:text-white text-[10px] font-black uppercase bg-black/40 px-3 py-1.5 rounded-full backdrop-blur"
                 >
                     <ChevronLeft size={12} /> Back to Group
                 </button>

                 <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 flex justify-between px-2 z-10 pointer-events-none">
                    <button onClick={() => changeStudent(-1)} disabled={selectedIndex === 0} className={`pointer-events-auto p-3 bg-black/40 backdrop-blur rounded-full text-white/50 hover:bg-white/10 transition-opacity ${selectedIndex === 0 ? 'opacity-0' : 'opacity-100'}`}><ArrowLeft size={24} /></button>
                    <button onClick={() => changeStudent(1)} disabled={selectedIndex === currentGroup.length - 1} className={`pointer-events-auto p-3 bg-black/40 backdrop-blur rounded-full text-white/50 hover:bg-white/10 transition-opacity ${selectedIndex === currentGroup.length - 1 ? 'opacity-0' : 'opacity-100'}`}><ArrowRight size={24} /></button>
                 </div>

                 <div className="relative">
                     <div className="relative w-28 h-28 md:w-48 md:h-48 rounded-full overflow-hidden border-4 border-white/10 shadow-2xl shrink-0 transition-all">
                         <img src={activeStudent.avatar || "https://cdn.pixabay.com/photo/2015/10/05/22/37/blank-profile-picture-973460_1280.png"} className="w-full h-full object-cover" />
                     </div>
                     {activeGrade.dance > 0 && (
                         <div className="absolute -bottom-2 -right-2 w-10 h-10 md:w-14 md:h-14 bg-blue-600 rounded-full flex items-center justify-center border-4 border-black shadow-lg z-20">
                             <span className="text-xl md:text-2xl font-black text-white">{activeGrade.dance}</span>
                         </div>
                     )}
                 </div>
                 
                 <div className="text-center z-10 mt-3">
                     <h2 className="text-2xl font-black uppercase italic tracking-tight leading-none text-white">{activeStudent.name}</h2>
                     <p className="text-zinc-500 font-bold text-[10px] uppercase tracking-widest mt-1">
                        #{activeStudent.id.toString().slice(-3)} • {activeStudent.age} • {activeStudent.height}
                     </p>
                 </div>
              </div>

              {/* CONTROL PAD */}
              <div className="bg-zinc-900 border-t border-white/10 p-4 pb-12 rounded-t-3xl shadow-[0_-10px_40px_rgba(0,0,0,0.5)] z-30 shrink-0 relative">
                  <div className="grid grid-cols-4 gap-2 mb-4">
                      {LEVELS.map((lvl) => (
                          <button key={lvl.val} onClick={() => handleScore(lvl.val)} className={`h-12 md:h-16 rounded-xl flex flex-col items-center justify-center border-2 transition-all active:scale-95 ${activeGrade.dance === lvl.val ? `${lvl.color.replace('/30', '')} text-white shadow-lg scale-105` : `bg-transparent border-white/5 text-zinc-500 hover:bg-white/5`}`}>
                              <span className="text-lg md:text-xl font-black">{lvl.val}</span>
                              <span className="text-[8px] md:text-[9px] font-bold uppercase whitespace-nowrap">{lvl.label}</span>
                          </button>
                      ))}
                  </div>

                  <div className="mb-4 relative">
                      <input value={localNotes} onChange={(e) => handleManualNoteChange(e.target.value)} onBlur={saveNotes} placeholder="Type note or use tags..." className="w-full bg-black/40 border border-white/5 rounded-lg pl-9 pr-4 py-2 text-xs text-white placeholder:text-zinc-600 focus:border-blue-500 outline-none" />
                      <MessageSquare size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-600" />
                  </div>

                  <div className="flex flex-wrap justify-center gap-2">
                      {STANDARD_TAGS.map((tag) => {
                          const isActive = (localNotes || "").includes(tag.id);
                          return (
                              <button key={tag.id} onClick={() => handleToggleTag(tag.id)} className={`flex items-center gap-1.5 px-3 py-2 md:px-4 md:py-3 rounded-full border transition-all active:scale-95 flex-grow justify-center md:flex-grow-0 ${isActive ? `${tag.color} text-white shadow-lg` : "bg-zinc-950 border-white/10 text-zinc-400"}`}>
                                  <tag.icon size={14} fill={isActive ? "currentColor" : "none"} />
                                  <span className="text-[10px] md:text-xs font-bold uppercase tracking-wide">{tag.label}</span>
                              </button>
                          );
                      })}
                      <button onClick={handleAttitudeCycle} className={`flex items-center gap-1.5 px-3 py-2 md:px-4 md:py-3 rounded-full border transition-all active:scale-95 flex-grow justify-center md:flex-grow-0 ${attState === 'good' ? "bg-emerald-600 border-emerald-400 text-white shadow-lg" : attState === 'bad' ? "bg-red-600 border-red-400 text-white shadow-lg" : "bg-zinc-950 border-white/10 text-zinc-400"}`}>
                          {attState === 'good' ? <ThumbsUp size={14} fill="currentColor" /> : attState === 'bad' ? <AlertTriangle size={14} fill="currentColor" /> : <Smile size={14} />}
                          <span className="text-[10px] md:text-xs font-bold uppercase tracking-wide">{attState === 'good' ? "Good Att." : attState === 'bad' ? "Bad Att." : "Attitude"}</span>
                      </button>
                  </div>
              </div>
          </div>
      )}
    </div>
  );
}