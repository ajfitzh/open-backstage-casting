/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import React, { useState, useEffect, useRef } from "react";
import { 
  ArrowLeft, ArrowRight, Move, 
  AlertTriangle, Star, Zap, Smile, ThumbsUp, MessageSquare,
  Video, Users, Loader2, Check
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
  // BATCHING STATE
  const [batchSize, setBatchSize] = useState(10);
  const [activeBatchIndex, setActiveBatchIndex] = useState(0);
  
  // NAVIGATION STATE
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [localNotes, setLocalNotes] = useState("");
  
  // UPLOAD STATE
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState("0%");
  
  // SWIPE REFS
  const touchStartX = useRef<number | null>(null);
  const touchEndX = useRef<number | null>(null);

  const currentBatchPeople = people.slice(activeBatchIndex * batchSize, (activeBatchIndex + 1) * batchSize);
  const activeStudent = currentBatchPeople[selectedIndex];
  const activeGrade = initialGrades[activeStudent?.id] || {};

  useEffect(() => { setLocalNotes(activeGrade.choreoNotes || ""); }, [activeStudent?.id, activeGrade.choreoNotes]);

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

  // --- 🚀 DIRECT UPLOAD HANDLER ---
  const handleVideoSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

      setIsUploading(true);
      setUploadProgress("Start");

      try {
          // 1. Get Permission Slip (Presigned URL)
          const res = await fetch('/api/upload', {
              method: 'POST',
              body: JSON.stringify({ filename: file.name, fileType: file.type }),
          });
          
          if (!res.ok) throw new Error("Failed to sign upload");
          const { uploadUrl, publicUrl } = await res.json();

          // 2. Direct Upload to DigitalOcean (Bypassing Vercel)
          setUploadProgress("Uploading...");
          const uploadRes = await fetch(uploadUrl, {
              method: 'PUT',
              body: file,
              headers: { "Content-Type": file.type, "x-amz-acl": "public-read" },
          });

          if (!uploadRes.ok) throw new Error("Upload failed");

          // 3. Save Link to Baserow (Batch Save - saves to current student for now, 
          // logic could be expanded to save to a 'Batch' table if you have one)
          alert("Video Uploaded! Link saved to current student notes.");
          
          // Append video link to notes for now (or a specific field if you added one)
          const noteWithVideo = `${localNotes} [VIDEO: ${publicUrl}]`;
          setLocalNotes(noteWithVideo);
          onSave(activeStudent.id, activeGrade.dance || 0, noteWithVideo, publicUrl);

      } catch (err) {
          console.error(err);
          alert("Upload failed. Please try again or use Camera Roll.");
      } finally {
          setIsUploading(false);
          setUploadProgress("0%");
      }
  };

  const changeStudent = (delta: number) => {
      const newIndex = selectedIndex + delta;
      if (newIndex >= 0 && newIndex < currentBatchPeople.length) setSelectedIndex(newIndex);
  };

  // --- SWIPE LOGIC ---
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

  if (!activeStudent) return <div className="p-8 text-center text-zinc-500">No dancers in this batch.</div>;
  const totalBatches = Math.ceil(people.length / batchSize);

  return (
    <div className="flex flex-col h-full bg-black overflow-hidden">
      
      {/* 0. BATCH NAVIGATOR */}
      <div className="h-12 bg-zinc-900 border-b border-white/5 flex items-center px-2 gap-2 overflow-x-auto shrink-0 custom-scrollbar">
          <div className="flex items-center gap-1 pr-2 border-r border-white/10 mr-2">
              <Users size={14} className="text-zinc-500" />
              <select 
                value={batchSize} 
                onChange={(e) => { setBatchSize(Number(e.target.value)); setActiveBatchIndex(0); setSelectedIndex(0); }}
                className="bg-transparent text-[10px] font-bold text-zinc-400 outline-none uppercase"
              >
                  <option value={5}>5s</option>
                  <option value={10}>10s</option>
                  <option value={20}>20s</option>
              </select>
          </div>
          
          {Array.from({ length: totalBatches }).map((_, i) => {
              const start = i * batchSize + 1;
              const end = Math.min((i + 1) * batchSize, people.length);
              const isActive = i === activeBatchIndex;
              return (
                  <button key={i} onClick={() => { setActiveBatchIndex(i); setSelectedIndex(0); }} className={`px-3 py-1.5 rounded-full text-[10px] font-black uppercase whitespace-nowrap transition-all flex-shrink-0 ${isActive ? 'bg-blue-600 text-white shadow-lg' : 'bg-zinc-800 text-zinc-500 border border-white/5'}`}>
                      {start}-{end}
                  </button>
              )
          })}
      </div>

      {/* 1. STAGE */}
      <div 
        className="flex-1 relative flex flex-col p-4 min-h-0 overflow-y-auto items-center justify-center"
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
         <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 flex justify-between px-2 z-10 pointer-events-none">
            <button onClick={() => changeStudent(-1)} disabled={selectedIndex === 0} className={`pointer-events-auto p-3 bg-black/40 backdrop-blur rounded-full text-white/50 hover:bg-white/10 transition-opacity ${selectedIndex === 0 ? 'opacity-0' : 'opacity-100'}`}><ArrowLeft size={24} /></button>
            <button onClick={() => changeStudent(1)} disabled={selectedIndex === currentBatchPeople.length - 1} className={`pointer-events-auto p-3 bg-black/40 backdrop-blur rounded-full text-white/50 hover:bg-white/10 transition-opacity ${selectedIndex === currentBatchPeople.length - 1 ? 'opacity-0' : 'opacity-100'}`}><ArrowRight size={24} /></button>
         </div>

         <div className="relative">
             <div className="relative w-24 h-24 md:w-48 md:h-48 rounded-full overflow-hidden border-4 border-white/10 shadow-2xl shrink-0 transition-all">
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
             <p className="text-zinc-500 font-bold text-[10px] uppercase tracking-widest mt-1">#{activeStudent.id.toString().slice(-3)} • {activeStudent.age} • {activeStudent.height}</p>
         </div>
      </div>

      {/* 2. CONTROL PAD */}
      <div className="bg-zinc-900 border-t border-white/10 p-4 pb-12 rounded-t-3xl shadow-[0_-10px_40px_rgba(0,0,0,0.5)] z-30 shrink-0 relative">
          
          {/* UPLOAD BUTTON */}
          <div className="absolute -top-6 right-6">
              <label className={`flex items-center justify-center w-12 h-12 rounded-full shadow-lg border-4 border-zinc-900 transition-all ${isUploading ? 'bg-zinc-700 cursor-wait' : 'bg-red-600 cursor-pointer hover:bg-red-500 active:scale-95'}`}>
                  {isUploading ? (
                      <Loader2 size={20} className="text-white animate-spin" />
                  ) : (
                      <Video size={20} className="text-white" />
                  )}
                  <input 
                    type="file" accept="video/*" capture="environment" 
                    className="hidden" onChange={handleVideoSelected} disabled={isUploading}
                  />
              </label>
              {isUploading && <span className="absolute top-14 right-0 text-[9px] font-bold text-white bg-black/50 px-2 py-1 rounded whitespace-nowrap">{uploadProgress}</span>}
          </div>

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

      {/* 3. LINEUP PREVIEW */}
      <div className="bg-black border-t border-white/10 h-16 md:h-24 overflow-x-auto custom-scrollbar shrink-0 z-40 relative">
          <div className="flex items-center h-full px-4 gap-2">
              {currentBatchPeople.map((person, i) => (
                  <div key={person.id} onClick={() => setSelectedIndex(i)} className={`relative w-10 h-10 md:w-16 md:h-16 shrink-0 rounded-lg overflow-hidden cursor-pointer transition-all ${selectedIndex === i ? 'ring-2 ring-white scale-110 z-10' : 'opacity-50 grayscale'}`}>
                      <img src={person.avatar} className="w-full h-full object-cover" />
                  </div>
              ))}
          </div>
      </div>
    </div>
  );
}