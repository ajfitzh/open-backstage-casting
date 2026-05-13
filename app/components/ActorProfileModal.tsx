 
"use client";

import React, { useState, useMemo } from "react";
import { 
  X, Star, History, Calendar, Ruler, AlertCircle, User, 
  AlertOctagon, Clock, Mic2, Move, FileText, Clapperboard, CheckCircle2
} from "lucide-react";
import { 
  Radar, RadarChart, PolarGrid, PolarAngleAxis, 
  ResponsiveContainer, RadarProps 
} from "recharts";

// Fix for Recharts TS error
const RechartsRadar = Radar as unknown as React.FC<RadarProps>;

interface ActorProfileModalProps {
  actor: any;
  grades: any; 
  onClose: () => void;
}

export default function ActorProfileModal({ actor, grades, onClose }: ActorProfileModalProps) {
  const [activeTab, setActiveTab] = useState<"insights" | "history">("insights");

  // --- CHART DATA ---
  const chartData = [
    { subject: "Vocal", A: grades?.vocal || 0 },
    { subject: "Acting", A: grades?.acting || 0 },
    { subject: "Dance", A: grades?.dance || 0 },
    { subject: "Presence", A: grades?.presence || 0 },
  ];

  const pastRolesList = useMemo(() => {
    if (!actor.pastRoles) return ["No previous productions listed"];
    if (Array.isArray(actor.pastRoles)) return actor.pastRoles; 
    if (typeof actor.pastRoles === 'string') return actor.pastRoles.split(',').map((s: string) => s.trim());
    return [String(actor.pastRoles)];
  }, [actor.pastRoles]);

  return (
    // 🟢 Wrap the modal in a backdrop div with an onClick handler
    <div 
      className="fixed inset-0 z-[200] bg-black/95 backdrop-blur-sm flex items-center justify-center p-0 md:p-4"
      onClick={onClose} // 🟢 Triggers close when clicking the background
    >
      <div 
        className="bg-zinc-950 w-full h-full md:max-w-4xl md:h-[700px] md:rounded-3xl md:border md:border-white/10 overflow-hidden shadow-2xl flex flex-col md:flex-row relative"
        onClick={(e) => e.stopPropagation()} // 🟢 Prevents closing when clicking INSIDE the modal
      >
        
        {/* CLOSE BUTTON (Mobile) */}
        <button 
            onClick={onClose} 
            className="absolute top-4 right-4 z-50 p-2 bg-black/50 backdrop-blur rounded-full text-zinc-400 hover:text-white md:hidden"
        >
            <X size={24} />
        </button>

        {/* --- LEFT: IDENTITY & RADAR --- */}
        <div className="p-6 md:p-8 border-b md:border-b-0 md:border-r border-white/5 bg-zinc-900/50 w-full md:w-[35%] flex flex-row md:flex-col items-center md:justify-start gap-6 shrink-0">
          <div className="relative w-20 h-20 md:w-32 md:h-32 shrink-0">
            {actor.avatar ? (
              <img 
                src={actor.avatar} 
                alt={actor.name} 
                className="w-full h-full object-cover rounded-2xl border-2 border-white/10 shadow-xl"
              />
            ) : (
              <div className="w-full h-full bg-zinc-800 rounded-2xl flex items-center justify-center border-2 border-dashed border-white/10">
                <User size={32} className="text-zinc-600 md:w-12 md:h-12" />
              </div>
            )}
          </div>
          
          <div className="flex-1 md:w-full md:text-center">
              <h2 className="text-xl md:text-2xl font-black italic uppercase tracking-tight leading-tight">{actor.name}</h2>
              <div className="flex md:grid md:grid-cols-3 gap-2 mt-2 md:mt-6">
                 <div className="bg-black/40 px-3 py-1 md:p-2 rounded-lg text-center border border-white/5">
                    <p className="text-[8px] md:text-[9px] text-zinc-500 font-black uppercase tracking-widest">Height</p>
                    <p className="text-xs font-bold text-white">{actor.height || "-"}</p>
                 </div>
                 <div className="bg-black/40 px-3 py-1 md:p-2 rounded-lg text-center border border-white/5">
                    <p className="text-[8px] md:text-[9px] text-zinc-500 font-black uppercase tracking-widest">Age</p>
                    <p className="text-xs font-bold text-white">{actor.age}</p>
                 </div>
                 <div className="bg-black/40 px-3 py-1 md:p-2 rounded-lg text-center border border-white/5 hidden md:block">
                    <p className="text-[9px] text-zinc-500 font-black uppercase tracking-widest">Range</p>
                    <p className="text-xs font-bold text-white">{actor.vocalRange || "-"}</p>
                 </div>
              </div>
          </div>

          <div className="hidden md:block w-full h-40 mt-auto relative">
             <p className="absolute -top-2 w-full text-[9px] text-center text-zinc-500 font-black uppercase tracking-[0.2em]">Live Analysis</p>
             <ResponsiveContainer width="100%" height="100%">
              <RadarChart cx="50%" cy="55%" outerRadius="70%" data={chartData}>
                <PolarGrid stroke="#27272a" />
                <PolarAngleAxis dataKey="subject" tick={{ fill: '#71717a', fontSize: 10, fontWeight: '900' }} />
                <RechartsRadar dataKey="A" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.4} />
              </RadarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* --- RIGHT: CONTENT AREA --- */}
        <div className="flex-1 flex flex-col bg-zinc-950 relative min-w-0 overflow-hidden">
          <button onClick={onClose} className="absolute top-6 right-6 text-zinc-500 hover:text-white z-10 transition-colors hidden md:block">
            <X size={20} />
          </button>

          <div className="flex border-b border-white/5 p-4 gap-4 shrink-0 bg-zinc-950 sticky top-0 z-10">
            <button 
              onClick={() => setActiveTab("insights")}
              className={`pb-2 text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'insights' ? 'text-white border-b-2 border-blue-500' : 'text-zinc-500 hover:text-zinc-300'}`}
            >
              Casting Insights
            </button>
            <button 
              onClick={() => setActiveTab("history")}
              className={`pb-2 text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'history' ? 'text-white border-b-2 border-blue-500' : 'text-zinc-500 hover:text-zinc-300'}`}
            >
              Bio & Logistics
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-4 md:p-8 custom-scrollbar pb-24 md:pb-8">
            {activeTab === "insights" ? (
              <div className="space-y-6 md:space-y-8">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="p-3 bg-zinc-900 rounded-xl border border-white/5">
                    <p className="text-[9px] font-black text-purple-400 uppercase mb-1 tracking-tighter">Planned Song</p>
                    <p className="text-xs font-bold text-zinc-300 line-clamp-1">{actor.song}</p>
                  </div>
                  <div className="p-3 bg-zinc-900 rounded-xl border border-white/5">
                    <p className="text-[9px] font-black text-emerald-400 uppercase mb-1 tracking-tighter">Monologue</p>
                    <p className="text-xs font-bold text-zinc-300 line-clamp-1">{actor.monologue}</p>
                  </div>
                </div>

                <section>
                   <div className="flex items-center gap-2 text-zinc-400 mb-4">
                    <Star size={14} className="text-blue-500" />
                    <span className="text-[10px] font-black uppercase tracking-widest">Panel Feedback</span>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div className="bg-zinc-900/40 p-4 rounded-xl border border-white/5 hover:bg-zinc-900/60 transition-colors">
                        <div className="flex items-center gap-2 mb-2">
                            <Clapperboard size={12} className="text-blue-400" />
                            <p className="text-[10px] font-bold text-blue-400 uppercase">Director (Acting)</p>
                        </div>
                        <p className="text-xs text-zinc-300 italic leading-relaxed">
                            &quot;{grades?.actingNotes || "No notes logged."}&quot;
                        </p>
                    </div>
                    <div className="bg-zinc-900/40 p-4 rounded-xl border border-white/5 hover:bg-zinc-900/60 transition-colors">
                        <div className="flex items-center gap-2 mb-2">
                            <Mic2 size={12} className="text-purple-400" />
                            <p className="text-[10px] font-bold text-purple-400 uppercase">Musical Director</p>
                        </div>
                        <p className="text-xs text-zinc-300 italic leading-relaxed">
                            &quot;{grades?.vocalNotes || "No notes logged."}&quot;
                        </p>
                    </div>
                    <div className="bg-zinc-900/40 p-4 rounded-xl border border-white/5 hover:bg-zinc-900/60 transition-colors">
                        <div className="flex items-center gap-2 mb-2">
                            <Move size={12} className="text-emerald-400" />
                            <p className="text-[10px] font-bold text-emerald-400 uppercase">Choreographer</p>
                        </div>
                        <p className="text-xs text-zinc-300 italic leading-relaxed">
                            &quot;{grades?.choreoNotes || "No notes logged."}&quot;
                        </p>
                    </div>
                    <div className="bg-zinc-900/40 p-4 rounded-xl border border-white/5 hover:bg-zinc-900/60 transition-colors">
                        <div className="flex items-center gap-2 mb-2">
                            <FileText size={12} className="text-amber-400" />
                            <p className="text-[10px] font-bold text-amber-400 uppercase">Admin / Drop-In</p>
                        </div>
                        <p className="text-xs text-zinc-300 italic leading-relaxed">
                            &quot;{grades?.adminNotes || "No flags."}&quot;
                        </p>
                    </div>
                  </div>
                </section>

                <section className="pt-2">
                  <h4 className="text-[10px] font-black text-amber-500 uppercase tracking-widest mb-3 flex items-center gap-2">
                    <AlertCircle size={14} /> Schedule Conflicts
                  </h4>
                  {/* Assuming ConflictAnalyzer is defined locally or imported */}
                </section>
              </div>
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
                      <Ruler size={12} /> CYT Experience
                    </p>
                    <p className="text-sm font-bold text-white">{actor.tenure}</p>
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

          <div className="p-4 md:p-6 border-t border-white/5 bg-zinc-900/20 shrink-0 absolute bottom-0 w-full md:relative">
            <button 
              onClick={onClose}
              className="w-full bg-white text-black py-4 rounded-2xl font-black uppercase text-[10px] tracking-[0.2em] hover:invert transition-all active:scale-[0.98]"
            >
              Return to Deck
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}