/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import React, { useState, useEffect, useRef } from "react";
import { 
  ArrowLeft, ArrowRight, Move, 
  AlertTriangle, Star, Zap, Smile, ThumbsUp, MessageSquare
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
  onSave: (id: number, score: number, tags: string) => void;
}) {
  const [lineup, setLineup] = useState(people);
  const [selectedIndex, setSelectedIndex] = useState(0);
  
  // SWIPE STATE
  const touchStartX = useRef<number | null>(null);
  const touchEndX = useRef<number | null>(null);

  // LOCAL NOTES STATE (To prevent jumpy typing)
  const [localNotes, setLocalNotes] = useState("");

  const activeStudent = lineup[selectedIndex];
  const activeGrade = initialGrades[activeStudent?.id] || {};

  // Sync state when switching students
  useEffect(() => {
      setLineup(people); 
      setSelectedIndex(0);
  }, [people]);

  useEffect(() => {
      // When active student changes, sync the note box
      setLocalNotes(activeGrade.choreoNotes || "");
  }, [activeStudent?.id, activeGrade.choreoNotes]);

  // --- ACTIONS ---

  const handleScore = (score: number) => {
    onSave(activeStudent.id, score, localNotes);
  };

  const handleManualNoteChange = (text: string) => {
      setLocalNotes(text);
      // Debounce could go here, but for now we save on blur or specific actions
  };

  const saveNotes = () => {
      onSave(activeStudent.id, activeGrade.dance || 0, localNotes);
  }

  const handleToggleTag = (tag: string) => {
    let newNotes = localNotes;
    if (newNotes.includes(tag)) {
      newNotes = newNotes.replace(tag, "").trim();
    } else {
      newNotes = `${newNotes} ${tag}`.trim();
    }
    setLocalNotes(newNotes); // Update UI instantly
    onSave(activeStudent.id, activeGrade.dance || 0, newNotes); // Save to DB
  };

  const handleAttitudeCycle = () => {
    let newNotes = localNotes;
    if (newNotes.includes("#GreatAttitude")) {
        newNotes = newNotes.replace("#GreatAttitude", "#BadAttitude");
    } else if (newNotes.includes("#BadAttitude")) {
        newNotes = newNotes.replace("#BadAttitude", "").trim();
    } else {
        newNotes = `${newNotes} #GreatAttitude`.trim();
    }
    setLocalNotes(newNotes);
    onSave(activeStudent.id, activeGrade.dance || 0, newNotes);
  };

  const getAttitudeState = () => {
      if (localNotes.includes("#GreatAttitude")) return "good";
      if (localNotes.includes("#BadAttitude")) return "bad";
      return "none";
  };
  const attState = getAttitudeState();

  const moveLineup = (fromIndex: number, direction: 'left' | 'right') => {
    if (direction === 'left' && fromIndex === 0) return;
    if (direction === 'right' && fromIndex === lineup.length - 1) return;
    
    const toIndex = direction === 'left' ? fromIndex - 1 : fromIndex + 1;
    const newLineup = [...lineup];
    const item = newLineup[fromIndex];
    newLineup.splice(fromIndex, 1);
    newLineup.splice(toIndex, 0, item);
    
    setLineup(newLineup);
    setSelectedIndex(toIndex); 
  };

  // --- SWIPE LOGIC ---
  const handleTouchStart = (e: React.TouchEvent) => {
      touchStartX.current = e.targetTouches[0].clientX;
  };
  const handleTouchMove = (e: React.TouchEvent) => {
      touchEndX.current = e.targetTouches[0].clientX;
  };
  const handleTouchEnd = () => {
      if (!touchStartX.current || !touchEndX.current) return;
      const distance = touchStartX.current - touchEndX.current;
      const isLeftSwipe = distance > 50;
      const isRightSwipe = distance < -50;

      if (isLeftSwipe && selectedIndex < lineup.length - 1) {
          setSelectedIndex(prev => prev + 1); // Next
      }
      if (isRightSwipe && selectedIndex > 0) {
          setSelectedIndex(prev => prev - 1); // Prev
      }
      
      // Reset
      touchStartX.current = null;
      touchEndX.current = null;
  };

  if (!activeStudent) return <div className="p-8 text-center text-zinc-500">No dancers found.</div>;

  return (
    <div className="flex flex-col h-full bg-black overflow-hidden">
      
      {/* 1. TOP: THE "STAGE" (Swipeable Area) */}
      <div 
        className="flex-1 relative flex flex-col p-4 min-h-0 overflow-y-auto items-center justify-center"
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
         
         {/* Navigation Arrows (Visual cues, mostly) */}
         <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 flex justify-between px-2 z-10 pointer-events-none">
            <button 
                onClick={() => setSelectedIndex(Math.max(0, selectedIndex - 1))}
                className={`pointer-events-auto p-3 bg-black/40 backdrop-blur rounded-full text-white/50 hover:bg-white/10 transition-opacity ${selectedIndex === 0 ? 'opacity-0' : 'opacity-100'}`}
            >
                <ArrowLeft size={24} />
            </button>
            <button 
                onClick={() => setSelectedIndex(Math.min(lineup.length - 1, selectedIndex + 1))}
                className={`pointer-events-auto p-3 bg-black/40 backdrop-blur rounded-full text-white/50 hover:bg-white/10 transition-opacity ${selectedIndex === lineup.length - 1 ? 'opacity-0' : 'opacity-100'}`}
            >
                <ArrowRight size={24} />
            </button>
         </div>

         {/* COMPACT IDENTITY CARD */}
         <div className="relative">
             <div className="relative w-24 h-24 md:w-48 md:h-48 rounded-full overflow-hidden border-4 border-white/10 shadow-2xl shrink-0 transition-all">
                 <img src={activeStudent.avatar || "https://cdn.pixabay.com/photo/2015/10/05/22/37/blank-profile-picture-973460_1280.png"} className="w-full h-full object-cover" />
             </div>
             
             {/* NEW: SCORE BADGE (Bottom Right) */}
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

      {/* 2. MIDDLE: CONTROL PAD */}
      <div className="bg-zinc-900 border-t border-white/10 p-4 pb-12 rounded-t-3xl shadow-[0_-10px_40px_rgba(0,0,0,0.5)] z-30 shrink-0 relative">
          
          {/* LEVEL SELECTOR */}
          <div className="grid grid-cols-4 gap-2 mb-4">
              {LEVELS.map((lvl) => (
                  <button
                      key={lvl.val}
                      onClick={() => handleScore(lvl.val)}
                      className={`h-12 md:h-16 rounded-xl flex flex-col items-center justify-center border-2 transition-all active:scale-95
                          ${activeGrade.dance === lvl.val 
                              ? `${lvl.color.replace('/30', '')} text-white shadow-lg scale-105` 
                              : `bg-transparent border-white/5 text-zinc-500 hover:bg-white/5`
                          }
                      `}
                  >
                      <span className="text-lg md:text-xl font-black">{lvl.val}</span>
                      <span className="text-[8px] md:text-[9px] font-bold uppercase whitespace-nowrap">{lvl.label}</span>
                  </button>
              ))}
          </div>

          {/* NEW: QUICK NOTE INPUT */}
          <div className="mb-4 relative">
              <input 
                  value={localNotes}
                  onChange={(e) => handleManualNoteChange(e.target.value)}
                  onBlur={saveNotes} // Save when keyboard closes
                  placeholder="Type note or use tags..."
                  className="w-full bg-black/40 border border-white/5 rounded-lg pl-9 pr-4 py-2 text-xs text-white placeholder:text-zinc-600 focus:border-blue-500 outline-none"
              />
              <MessageSquare size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-600" />
          </div>

          {/* TAG TOGGLES */}
          <div className="flex flex-wrap justify-center gap-2">
              {STANDARD_TAGS.map((tag) => {
                  const isActive = (localNotes || "").includes(tag.id);
                  return (
                      <button
                          key={tag.id}
                          onClick={() => handleToggleTag(tag.id)}
                          className={`flex items-center gap-1.5 px-3 py-2 md:px-4 md:py-3 rounded-full border transition-all active:scale-95 flex-grow justify-center md:flex-grow-0
                              ${isActive 
                                  ? `${tag.color} text-white shadow-lg` 
                                  : "bg-zinc-950 border-white/10 text-zinc-400"
                              }
                          `}
                      >
                          <tag.icon size={14} fill={isActive ? "currentColor" : "none"} />
                          <span className="text-[10px] md:text-xs font-bold uppercase tracking-wide">{tag.label}</span>
                      </button>
                  );
              })}

              <button
                  onClick={handleAttitudeCycle}
                  className={`flex items-center gap-1.5 px-3 py-2 md:px-4 md:py-3 rounded-full border transition-all active:scale-95 flex-grow justify-center md:flex-grow-0
                      ${attState === 'good' ? "bg-emerald-600 border-emerald-400 text-white shadow-lg" : 
                        attState === 'bad' ? "bg-red-600 border-red-400 text-white shadow-lg" : 
                        "bg-zinc-950 border-white/10 text-zinc-400"
                      }
                  `}
              >
                  {attState === 'good' ? <ThumbsUp size={14} fill="currentColor" /> : 
                   attState === 'bad' ? <AlertTriangle size={14} fill="currentColor" /> : 
                   <Smile size={14} />}
                  
                  <span className="text-[10px] md:text-xs font-bold uppercase tracking-wide">
                      {attState === 'good' ? "Good Att." : 
                       attState === 'bad' ? "Bad Att." : 
                       "Attitude"}
                  </span>
              </button>
          </div>
      </div>

      {/* 3. BOTTOM: LINEUP SCROLL */}
      <div className="bg-black border-t border-white/10 h-20 md:h-24 overflow-x-auto custom-scrollbar shrink-0 z-40 relative">
          <div className="flex items-center h-full px-4 gap-2">
              {lineup.map((person, i) => (
                  <div 
                    key={person.id} 
                    onClick={() => setSelectedIndex(i)}
                    className={`relative w-14 h-14 md:w-16 md:h-16 shrink-0 rounded-lg overflow-hidden cursor-pointer transition-all
                        ${selectedIndex === i ? 'ring-2 ring-white scale-110 z-10' : 'opacity-50 grayscale'}
                    `}
                  >
                      <img src={person.avatar} className="w-full h-full object-cover" />
                      
                      {/* Reorder Buttons */}
                      {selectedIndex === i && (
                          <>
                            <button onClick={(e) => {e.stopPropagation(); moveLineup(i, 'left')}} className="absolute left-0 top-0 bottom-0 w-4 bg-black/50 hover:bg-blue-500/50 text-white flex items-center justify-center">‹</button>
                            <button onClick={(e) => {e.stopPropagation(); moveLineup(i, 'right')}} className="absolute right-0 top-0 bottom-0 w-4 bg-black/50 hover:bg-blue-500/50 text-white flex items-center justify-center">›</button>
                          </>
                      )}
                  </div>
              ))}
          </div>
      </div>

    </div>
  );
}