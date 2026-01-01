/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import React, { useState, useEffect } from "react";
import { 
  ArrowLeft, ArrowRight, Move, 
  AlertTriangle, Star, Zap, Smile, ThumbsUp
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
  
  const activeStudent = lineup[selectedIndex];
  const activeGrade = initialGrades[activeStudent?.id] || {};

  useEffect(() => { setLineup(people); setSelectedIndex(0); }, [people]);

  const handleScore = (score: number) => {
    onSave(activeStudent.id, score, activeGrade.choreoNotes || "");
  };

  const handleToggleTag = (tag: string) => {
    const currentNotes = activeGrade.choreoNotes || "";
    let newNotes = "";
    
    if (currentNotes.includes(tag)) {
      newNotes = currentNotes.replace(tag, "").trim();
    } else {
      newNotes = `${currentNotes} ${tag}`.trim();
    }
    onSave(activeStudent.id, activeGrade.dance || 0, newNotes);
  };

  // --- ATTITUDE CYCLER ---
  const handleAttitudeCycle = () => {
    const currentNotes = activeGrade.choreoNotes || "";
    let newNotes = currentNotes;

    // Cycle: None -> Good -> Bad -> None
    if (currentNotes.includes("#GreatAttitude")) {
        // Switch to Bad
        newNotes = currentNotes.replace("#GreatAttitude", "#BadAttitude");
    } else if (currentNotes.includes("#BadAttitude")) {
        // Switch to None (Remove)
        newNotes = currentNotes.replace("#BadAttitude", "").trim();
    } else {
        // Switch to Good
        newNotes = `${currentNotes} #GreatAttitude`.trim();
    }
    onSave(activeStudent.id, activeGrade.dance || 0, newNotes);
  };

  const getAttitudeState = () => {
      const n = activeGrade.choreoNotes || "";
      if (n.includes("#GreatAttitude")) return "good";
      if (n.includes("#BadAttitude")) return "bad";
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

  if (!activeStudent) return <div className="p-8 text-center text-zinc-500">No dancers found in this filter.</div>;

  return (
    <div className="flex flex-col h-full bg-black overflow-hidden">
      
      {/* 1. TOP: THE "STAGE" */}
      {/* Added min-h-0 to allow this section to shrink aggressively on small screens */}
      <div className="flex-1 relative flex flex-col p-4 min-h-0 overflow-y-auto">
         
         {/* Navigation Overlay */}
         <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 flex justify-between px-2 z-10 pointer-events-none">
            <button 
                onClick={() => setSelectedIndex(Math.max(0, selectedIndex - 1))}
                className="pointer-events-auto p-4 bg-black/50 backdrop-blur rounded-full text-white hover:bg-white/20 disabled:opacity-0 active:scale-90 transition-transform"
                disabled={selectedIndex === 0}
            >
                <ArrowLeft size={32} />
            </button>
            <button 
                onClick={() => setSelectedIndex(Math.min(lineup.length - 1, selectedIndex + 1))}
                className="pointer-events-auto p-4 bg-black/50 backdrop-blur rounded-full text-white hover:bg-white/20 disabled:opacity-0 active:scale-90 transition-transform"
                disabled={selectedIndex === lineup.length - 1}
            >
                <ArrowRight size={32} />
            </button>
         </div>

         {/* BIG IDENTITY CARD */}
         <div className="flex-1 flex flex-col items-center justify-center space-y-2 md:space-y-4">
             {/* Shrunk the mobile image size to w-28 (7rem) to save vertical space */}
             <div className="relative w-28 h-28 md:w-56 md:h-56 rounded-full overflow-hidden border-4 border-white/10 shadow-2xl shrink-0 transition-all">
                 <img src={activeStudent.avatar || "https://cdn.pixabay.com/photo/2015/10/05/22/37/blank-profile-picture-973460_1280.png"} className="w-full h-full object-cover" />
                 {activeGrade.dance > 0 && (
                     <div className="absolute inset-0 bg-black/40 flex items-center justify-center backdrop-blur-[2px]">
                         <span className="text-4xl md:text-6xl font-black text-white drop-shadow-lg">{activeGrade.dance}</span>
                     </div>
                 )}
             </div>
             
             <div className="text-center z-10">
                 <h2 className="text-2xl md:text-3xl font-black uppercase italic tracking-tight leading-none">{activeStudent.name}</h2>
                 <p className="text-zinc-400 font-bold text-xs md:text-sm uppercase tracking-widest mt-1">#{activeStudent.id.toString().slice(-3)} • {activeStudent.age} • {activeStudent.height}</p>
             </div>
         </div>
      </div>

      {/* 2. MIDDLE: CONTROL PAD */}
      {/* Added z-30 and extra pb-8 bottom padding to clear the bottom bar */}
      <div className="bg-zinc-900 border-t border-white/10 p-4 pb-8 rounded-t-3xl shadow-[0_-10px_40px_rgba(0,0,0,0.5)] z-30 shrink-0 relative">
          
          {/* LEVEL SELECTOR */}
          <div className="grid grid-cols-4 gap-2 mb-4">
              {LEVELS.map((lvl) => (
                  <button
                      key={lvl.val}
                      onClick={() => handleScore(lvl.val)}
                      className={`h-14 md:h-16 rounded-xl flex flex-col items-center justify-center border-2 transition-all active:scale-95
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

          {/* TAG TOGGLES (Flex Wrap) */}
          <div className="flex flex-wrap justify-center gap-2">
              {/* Standard Tags */}
              {STANDARD_TAGS.map((tag) => {
                  const isActive = (activeGrade.choreoNotes || "").includes(tag.id);
                  return (
                      <button
                          key={tag.id}
                          onClick={() => handleToggleTag(tag.id)}
                          className={`flex items-center gap-1.5 px-4 py-3 rounded-full border transition-all active:scale-95 flex-grow justify-center md:flex-grow-0
                              ${isActive 
                                  ? `${tag.color} text-white shadow-lg` 
                                  : "bg-zinc-950 border-white/10 text-zinc-400"
                              }
                          `}
                      >
                          <tag.icon size={16} fill={isActive ? "currentColor" : "none"} />
                          <span className="text-xs font-bold uppercase tracking-wide">{tag.label}</span>
                      </button>
                  );
              })}

              {/* SPECIAL ATTITUDE TOGGLE */}
              <button
                  onClick={handleAttitudeCycle}
                  className={`flex items-center gap-1.5 px-4 py-3 rounded-full border transition-all active:scale-95 flex-grow justify-center md:flex-grow-0
                      ${attState === 'good' ? "bg-emerald-600 border-emerald-400 text-white shadow-lg" : 
                        attState === 'bad' ? "bg-red-600 border-red-400 text-white shadow-lg" : 
                        "bg-zinc-950 border-white/10 text-zinc-400"
                      }
                  `}
              >
                  {attState === 'good' ? <ThumbsUp size={16} fill="currentColor" /> : 
                   attState === 'bad' ? <AlertTriangle size={16} fill="currentColor" /> : 
                   <Smile size={16} />}
                  
                  <span className="text-xs font-bold uppercase tracking-wide">
                      {attState === 'good' ? "Good" : 
                       attState === 'bad' ? "Bad" : 
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