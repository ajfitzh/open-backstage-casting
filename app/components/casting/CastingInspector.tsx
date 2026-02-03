/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useState } from "react";
import { X, Mic2, Move, FileText, ExternalLink, Clock } from "lucide-react";
// import ActorProfileModal from "@/app/components/ActorProfileModal"; // Commented out if not available yet

const getRoleColor = (roleName: string) => {
  if (!roleName) return "bg-zinc-800 border-zinc-700";
  const name = roleName.toLowerCase();
  if (name.includes("ariel") || name.includes("lead")) return "bg-blue-500 border-blue-400 shadow-blue-500/20";
  if (name.includes("ursula") || name.includes("villain")) return "bg-purple-600 border-purple-400 shadow-purple-500/20";
  return "bg-emerald-600 border-emerald-400";
};

export default function CastingInspector({ actor, allScenes = [], stats = { assignments: {}, assignedRoleNames: [] }, onClose }: any) {
  const [showFullProfile, setShowFullProfile] = useState(false);

  if (!actor) return null;

  return (
    <>
      <div className="w-[350px] h-full flex flex-col bg-zinc-900 border-l border-white/10 shadow-2xl shrink-0 z-30">
        
        {/* HEADER */}
        <div className="p-6 pb-4 border-b border-white/5 relative bg-zinc-900/50 backdrop-blur z-10 shrink-0">
          <button onClick={onClose} className="absolute top-4 right-4 text-zinc-500 hover:text-white transition-colors"><X size={20} /></button>
          
          <div className="flex items-start gap-4">
             <div className="w-16 h-16 rounded-full overflow-hidden border-2 border-white/10 shrink-0 bg-zinc-800">
               {actor.headshot ? (
                   <img src={actor.headshot} className="w-full h-full object-cover" alt={actor.name} />
               ) : (
                   <div className="w-full h-full flex items-center justify-center text-zinc-500 font-bold text-xl">{actor.name.charAt(0)}</div>
               )}
             </div>
             <div>
                <h2 className="text-lg font-black text-white leading-tight">{actor.name}</h2>
                <div className="flex items-center gap-2 mt-1">
                    <span className="px-2 py-0.5 bg-zinc-800 text-zinc-400 text-[10px] font-bold uppercase rounded border border-white/5">{actor.gender || "N/A"}</span>
                    <span className="px-2 py-0.5 bg-zinc-800 text-zinc-400 text-[10px] font-bold uppercase rounded border border-white/5">{actor.age || "Age ?"}</span>
                </div>
                <div className="flex gap-2 mt-3">
                   {actor.actingNotes && <FileText size={14} className="text-blue-500" title="Has Acting Notes" />}
                   {actor.musicNotes && <Mic2 size={14} className="text-purple-500" title="Has Vocal Notes" />}
                </div>
             </div>
          </div>
        </div>

        {/* TIMELINE */}
        <div className="flex-1 overflow-y-auto custom-scrollbar relative bg-zinc-950/50">
            <div className="absolute left-[27px] top-0 bottom-0 w-px bg-white/5 z-0" />

            <div className="p-4 space-y-1 relative z-10">
                 {allScenes.map((scene: any) => {
                     const roleInScene = stats.assignments?.[scene.id];
                     const isCast = !!roleInScene;
                     
                     return (
                         <div key={scene.id} className={`group flex items-center gap-3 py-2 px-2 rounded-lg transition-all ${isCast ? 'bg-zinc-800/80 border border-white/10 my-1 shadow-sm' : 'opacity-40 hover:opacity-80'}`}>
                             <div className="w-8 flex flex-col items-end shrink-0">
                                 <span className={`text-[9px] font-black uppercase ${isCast ? 'text-white' : 'text-zinc-600'}`}>{scene.act || "1"}</span>
                             </div>

                             <div className={`w-3 h-3 rounded-full border-2 shrink-0 transition-transform ${isCast ? getRoleColor(roleInScene) : 'bg-zinc-900 border-zinc-700'}`} />

                             <div className="min-w-0 flex-1">
                                 <div className="flex justify-between items-baseline">
                                     <p className={`text-xs font-bold truncate ${isCast ? 'text-zinc-200' : 'text-zinc-500'}`}>{scene.name}</p>
                                 </div>
                                 {isCast && (
                                     <div className="flex items-center gap-1.5 mt-0.5">
                                         <span className="text-[9px] font-black uppercase px-1.5 rounded-sm bg-zinc-950 text-white border border-white/5 truncate">{roleInScene}</span>
                                     </div>
                                 )}
                             </div>
                         </div>
                     );
                 })}
            </div>
        </div>
      </div>
    </>
  );
}