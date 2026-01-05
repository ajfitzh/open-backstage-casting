/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useState } from "react";
import { X, CheckCircle2, Mic2, Move, FileText, ExternalLink, Clock } from "lucide-react";
import ActorProfileModal from "@/app/components/ActorProfileModal";

// Helper to generate consistent colors for roles
const getRoleColor = (roleName: string) => {
  if (!roleName) return "bg-zinc-800 border-zinc-700";
  const name = roleName.toLowerCase();
  if (name.includes("ariel") || name.includes("lead")) return "bg-blue-500 border-blue-400 shadow-[0_0_10px_rgba(59,130,246,0.4)]";
  if (name.includes("ursula") || name.includes("villain")) return "bg-purple-600 border-purple-400 shadow-[0_0_10px_rgba(147,51,234,0.4)]";
  if (name.includes("ensemble")) return "bg-emerald-600 border-emerald-400";
  if (name.includes("new role")) return "bg-amber-600 border-amber-400";
  // Default hash-like fallback
  const colors = [
    "bg-cyan-600 border-cyan-400", 
    "bg-indigo-600 border-indigo-400", 
    "bg-pink-600 border-pink-400",
    "bg-lime-600 border-lime-400"
  ];
  return colors[roleName.length % colors.length];
};

export default function CastingInspector({ actor, allScenes, stats, onClose }: any) {
  const [showFullProfile, setShowFullProfile] = useState(false);

  if (!actor) return null;

  return (
    <>
      {/* MOBILE: Fixed full screen overlay (z-50)
          DESKTOP: Relative sidebar (z-20) 
      */}
      <div className="fixed inset-0 md:static md:inset-auto z-50 md:z-20 w-full md:w-[350px] h-full flex flex-col bg-zinc-900 md:border-l border-white/5 shadow-2xl transition-all">
        
        {/* HEADER */}
        <div className="p-6 pb-4 border-b border-white/5 relative bg-zinc-900 z-10 shrink-0">
          <button onClick={onClose} className="absolute top-4 right-4 text-zinc-500 hover:text-white transition-colors p-2 bg-black/20 rounded-full md:bg-transparent"><X size={20} /></button>
          
          <div className="flex items-start gap-4">
             <div className="w-16 h-16 rounded-full overflow-hidden border-2 border-white/10 shrink-0">
               <img src={actor.Headshot} className="w-full h-full object-cover" />
             </div>
             <div>
                <h2 className="text-lg font-black text-white leading-tight">{actor.Performer}</h2>
                <div className="flex items-center gap-2 mt-1">
                    {actor.Gender && actor.Gender !== "N/A" && (
                        <span className="px-2 py-0.5 bg-zinc-800 text-zinc-400 text-[10px] font-bold uppercase rounded border border-white/5">{actor.Gender}</span>
                    )}
                    <span className="px-2 py-0.5 bg-zinc-800 text-zinc-400 text-[10px] font-bold uppercase rounded border border-white/5">{actor.Age || "Age ?"}</span>
                </div>
                <div className="flex gap-2 mt-3">
                   {actor.grades?.actingNotes && <FileText size={14} className="text-blue-500" title="Has Acting Notes" />}
                   {actor.grades?.vocalNotes && <Mic2 size={14} className="text-purple-500" title="Has Vocal Notes" />}
                   {actor.grades?.danceNotes && <Move size={14} className="text-emerald-500" title="Has Dance Notes" />}
                </div>
             </div>
          </div>
        </div>

        {/* SCROLLABLE TIMELINE BODY */}
        <div className="flex-1 overflow-y-auto custom-scrollbar relative bg-zinc-950/50">
            {/* Timeline Line */}
            <div className="absolute left-[27px] top-0 bottom-0 w-px bg-white/5 z-0" />

            <div className="p-4 space-y-1 relative z-10">
                 {allScenes.map((scene: any) => {
                     const roleInScene = stats.assignments[scene.id];
                     const isCast = !!roleInScene;
                     const isConflict = roleInScene && roleInScene.includes('+'); 
                     const dotColor = isConflict ? "bg-red-500 border-red-400 animate-pulse" : getRoleColor(roleInScene);

                     return (
                         <div 
                            key={scene.id} 
                            className={`group flex items-center gap-3 py-2 px-2 rounded-lg transition-all
                                ${isCast ? 'bg-zinc-800/80 border border-white/10 my-1 shadow-sm' : 'opacity-40 hover:opacity-80 hover:bg-white/5'}`
                            }
                         >
                             <div className="w-8 flex flex-col items-end shrink-0">
                                 <span className={`text-[9px] font-black uppercase ${isCast ? 'text-white' : 'text-zinc-600'}`}>{scene.Act}</span>
                             </div>

                             <div className={`w-3 h-3 rounded-full border-2 shrink-0 transition-transform ${isCast ? dotColor : 'bg-zinc-900 border-zinc-700'}`} />

                             <div className="min-w-0 flex-1">
                                 <div className="flex justify-between items-baseline">
                                     <p className={`text-xs font-bold truncate ${isCast ? 'text-zinc-200' : 'text-zinc-500'}`}>{scene["Scene Name"]}</p>
                                     {!isCast && <span className="text-[9px] text-zinc-700 uppercase hidden group-hover:block">{scene["Scene Type"]}</span>}
                                 </div>
                                 
                                 {isCast && (
                                     <div className="flex items-center gap-1.5 mt-0.5 animate-in slide-in-from-left-2 duration-300">
                                         <span className={`text-[9px] font-black uppercase px-1.5 rounded-sm bg-zinc-950 text-white border border-white/5 truncate max-w-full ${isConflict ? 'text-red-400 border-red-500/30' : ''}`}>
                                            {roleInScene}
                                         </span>
                                         {isConflict && <Clock size={10} className="text-red-500" />}
                                     </div>
                                 )}
                             </div>
                         </div>
                     );
                 })}
            </div>
            <div className="h-20" />
        </div>

        {/* FOOTER ACTIONS */}
        <div className="p-4 border-t border-white/5 bg-zinc-900 z-20 shrink-0 space-y-3 pb-safe">
             {stats.assignedRoleNames.length > 0 && (
                <div className="flex flex-wrap gap-1.5 pb-2">
                    {stats.assignedRoleNames.map((role: string) => (
                        <span key={role} className="text-[9px] font-bold text-zinc-300 bg-zinc-800 px-2 py-1 rounded border border-white/5 flex items-center gap-1">
                            <div className={`w-1.5 h-1.5 rounded-full ${getRoleColor(role).split(' ')[0]}`} />
                            {role}
                        </span>
                    ))}
                </div>
             )}

            <button 
                onClick={() => setShowFullProfile(true)}
                className="w-full flex items-center justify-center gap-2 py-3 bg-white text-black text-xs font-black uppercase tracking-widest rounded-xl hover:scale-[1.02] active:scale-[0.98] transition-all"
            >
                <ExternalLink size={14} />
                View Full Profile
            </button>
        </div>

      </div>

      {/* MODAL (Now matches Callback Logic EXACTLY) */}
      {showFullProfile && (
        <ActorProfileModal 
          actor={{
            ...actor,
            name: actor.Performer,  // Modal expects 'name', we have 'Performer'
            avatar: actor.Headshot, // Modal expects 'avatar', we have 'Headshot'
          }}
          grades={actor.grades} 
          onClose={() => setShowFullProfile(false)}
        />
      )}
    </>
  );
}