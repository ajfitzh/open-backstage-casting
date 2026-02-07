"use client";

import React, { useState } from "react";
import { 
  X, Star, History, Calendar, Ruler, AlertCircle, User, 
  Mic2, Move, FileText, Clapperboard
} from "lucide-react";
import { 
  Radar, RadarChart, PolarGrid, PolarAngleAxis, 
  ResponsiveContainer, RadarProps 
} from "recharts";

// TypeScript fix for Recharts
const RechartsRadar = Radar as unknown as React.FC<RadarProps>;

interface ActorProfileModalProps {
  actor: any;
  grades: any; 
  timeline?: React.ReactNode; 
  onClose: () => void;
}

export default function CallbackActorModal({ actor, grades, timeline, onClose }: ActorProfileModalProps) {
  const [activeTab, setActiveTab] = useState<"insights" | "history">("insights");

  const chartData = [
    { subject: "Vocal", A: grades?.vocal || 0 },
    { subject: "Acting", A: grades?.acting || 0 },
    { subject: "Dance", A: grades?.dance || 0 },
    { subject: "Presence", A: grades?.presence || 0 },
  ];

  const getRolesList = (roles: any) => {
    if (!roles) return ["No previous productions listed"];
    if (Array.isArray(roles)) return roles; 
    if (typeof roles === 'string') return roles.split(',').map((s: string) => s.trim());
    return [String(roles)];
  };

  const pastRolesList = getRolesList(actor.pastRoles);

  return (
    <div className="fixed inset-0 z-[200] bg-black/90 backdrop-blur-md flex items-center justify-center p-4">
      {/* CONTAINER FIX: 
         max-h-[90vh] ensures it fits on laptop screens.
         overflow-hidden contains the inner scrollbars.
      */}
      <div className="bg-zinc-950 w-full max-w-5xl max-h-[90vh] rounded-2xl border border-white/10 shadow-2xl flex flex-col md:flex-row overflow-hidden relative">
        
        {/* MOBILE CLOSE BUTTON */}
        <button 
            onClick={onClose} 
            className="absolute top-4 right-4 z-50 p-2 bg-black/50 backdrop-blur rounded-full text-zinc-400 hover:text-white md:hidden"
        >
            <X size={24} />
        </button>

        {/* --- LEFT SIDEBAR (Sticky/Scrollable) --- */}
        <div className="p-6 border-b md:border-b-0 md:border-r border-white/5 bg-zinc-900/50 w-full md:w-[320px] flex flex-row md:flex-col items-center md:items-start gap-6 shrink-0 md:overflow-y-auto custom-scrollbar">
          
{/* Avatar */}
          <div className="relative w-20 h-20 md:w-full md:h-auto md:aspect-square shrink-0 rounded-xl overflow-hidden border-2 border-white/10 shadow-lg bg-zinc-900">
            {actor.avatar ? (
              <img 
                src={actor.avatar} 
                alt={actor.name} 
                // object-top is correct for headshots, but only if the container is actually a square!
                className="w-full h-full object-cover object-top" 
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center"><User size={48} className="text-zinc-700"/></div>
            )}
          </div>
          
          <div className="flex-1 md:w-full md:text-left">
              <h2 className="text-xl md:text-2xl font-black italic uppercase text-white leading-none mb-4">{actor.name}</h2>
              
              {/* Vitals */}
              <div className="grid grid-cols-3 gap-2">
                 <div className="bg-black/40 p-2 rounded border border-white/5 text-center">
                    <p className="text-[9px] text-zinc-500 font-black uppercase">Height</p>
                    <p className="text-xs font-bold text-white">{actor.height || "-"}</p>
                 </div>
                 <div className="bg-black/40 p-2 rounded border border-white/5 text-center">
                    <p className="text-[9px] text-zinc-500 font-black uppercase">Age</p>
                    <p className="text-xs font-bold text-white">{actor.age || "?"}</p>
                 </div>
                 <div className="bg-black/40 p-2 rounded border border-white/5 text-center">
                    <p className="text-[9px] text-zinc-500 font-black uppercase">Range</p>
                    <p className="text-xs font-bold text-white">{actor.vocalRange || "-"}</p>
                 </div>
              </div>
          </div>

          {/* Radar Chart */}
          <div className="hidden md:block w-full aspect-square relative opacity-80 mt-auto min-h-[200px]">
             <ResponsiveContainer width="100%" height="100%">
              <RadarChart cx="50%" cy="50%" outerRadius="70%" data={chartData}>
                <PolarGrid stroke="#27272a" />
                <PolarAngleAxis dataKey="subject" tick={{ fill: '#71717a', fontSize: 10, fontWeight: '900' }} />
                <RechartsRadar dataKey="A" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.4} />
              </RadarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* --- RIGHT CONTENT (Scrollable) --- */}
        <div className="flex-1 flex flex-col min-w-0 bg-zinc-950">
          
          {/* DESKTOP CLOSE */}
          <div className="absolute top-4 right-4 hidden md:block z-20">
            <button onClick={onClose} className="p-2 text-zinc-500 hover:text-white bg-black/20 hover:bg-black/50 rounded-full transition-all">
              <X size={20} />
            </button>
          </div>

          {/* TABS */}
          <div className="flex border-b border-white/5 px-6 pt-6 gap-6 bg-zinc-950 shrink-0">
            <button 
              onClick={() => setActiveTab("insights")}
              className={`pb-3 text-xs font-black uppercase tracking-widest border-b-2 transition-colors ${activeTab === 'insights' ? 'border-blue-500 text-white' : 'border-transparent text-zinc-500 hover:text-zinc-300'}`}
            >
              Casting Insights
            </button>
            <button 
              onClick={() => setActiveTab("history")}
              className={`pb-3 text-xs font-black uppercase tracking-widest border-b-2 transition-colors ${activeTab === 'history' ? 'border-blue-500 text-white' : 'border-transparent text-zinc-500 hover:text-zinc-300'}`}
            >
              Bio & Logistics
            </button>
          </div>

          {/* CONTENT AREA */}
          <div className="flex-1 overflow-y-auto p-6 md:p-8 custom-scrollbar space-y-8">
            {activeTab === "insights" ? (
              <>
                {timeline && (
                  <div className="bg-zinc-900/30 p-4 rounded-xl border border-white/5">
                    <p className="text-[9px] font-black text-blue-400 uppercase mb-3 tracking-widest">Current Production Track</p>
                    {timeline}
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="p-4 bg-zinc-900 rounded-xl border border-white/5">
                    <p className="text-[9px] font-black text-purple-400 uppercase mb-1 tracking-tighter">Planned Song</p>
                    <p className="text-sm font-bold text-zinc-300">{actor.song || "N/A"}</p>
                  </div>
                  <div className="p-4 bg-zinc-900 rounded-xl border border-white/5">
                    <p className="text-[9px] font-black text-emerald-400 uppercase mb-1 tracking-tighter">Monologue</p>
                    <p className="text-sm font-bold text-zinc-300">{actor.monologue || "N/A"}</p>
                  </div>
                </div>

                <div className="space-y-3">
                   <div className="flex items-center gap-2 text-zinc-400">
                    <Star size={14} className="text-blue-500" />
                    <span className="text-[10px] font-black uppercase tracking-widest">Panel Feedback</span>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {[
                      { l: "Director", v: grades?.actingNotes, c: "text-blue-400", i: Clapperboard },
                      { l: "Music", v: grades?.vocalNotes, c: "text-purple-400", i: Mic2 },
                      { l: "Dance", v: grades?.choreoNotes, c: "text-emerald-400", i: Move },
                      { l: "Admin", v: grades?.adminNotes, c: "text-amber-400", i: FileText },
                    ].map((item, i) => (
                      <div key={i} className="bg-zinc-900/40 p-4 rounded-xl border border-white/5">
                          <div className="flex items-center gap-2 mb-2">
                              <item.i size={12} className={item.c} />
                              <p className={`text-[10px] font-bold uppercase ${item.c}`}>{item.l}</p>
                          </div>
                          <p className="text-xs text-zinc-300 italic">"{item.v || "No notes."}"</p>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="pt-2">
                  <h4 className="text-[10px] font-black text-amber-500 uppercase tracking-widest mb-3 flex items-center gap-2">
                    <AlertCircle size={14} /> Schedule Conflicts
                  </h4>
                  <ConflictAnalyzer conflicts={actor.conflicts} />
                </div>
              </>
            ) : (
              <div className="space-y-8">
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-zinc-900 p-4 rounded-2xl border border-white/5">
                    <p className="text-[10px] font-black text-zinc-500 uppercase flex items-center gap-2 mb-1">
                      <Calendar size={12} /> Birthdate
                    </p>
                    <p className="text-sm font-bold text-white">{actor.dob || "N/A"}</p>
                  </div>
                  <div className="bg-zinc-900 p-4 rounded-2xl border border-white/5">
                    <p className="text-[10px] font-black text-zinc-500 uppercase flex items-center gap-2 mb-1">
                      <Ruler size={12} /> Experience
                    </p>
                    <p className="text-sm font-bold text-white">{actor.tenure || "New"}</p>
                  </div>
                </div>

                <section>
                  <h4 className="text-[10px] font-black text-blue-500 uppercase tracking-widest mb-3 flex items-center gap-2">
                    <History size={14} /> Production History
                  </h4>
                  <div className="flex flex-wrap gap-2">
                    {pastRolesList.map((role: string, i: number) => (
                      <div key={i} className="text-[11px] bg-zinc-900 text-zinc-300 px-3 py-2 rounded-lg border border-white/5 font-bold">
                        {role}
                      </div>
                    ))}
                  </div>
                </section>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// Conflict Helper
function ConflictAnalyzer({ conflicts }: { conflicts: any }) {
    const items = typeof conflicts === 'string' ? conflicts.split(',').filter(Boolean) : [];
    if(items.length === 0) return <div className="text-zinc-500 text-xs italic">No conflicts listed.</div>
    return (
        <div className="flex flex-wrap gap-2">
            {items.map((c: string, i: number) => (
                <span key={i} className="px-2 py-1 bg-red-500/10 text-red-400 border border-red-500/20 rounded text-xs">
                    {c}
                </span>
            ))}
        </div>
    )
}