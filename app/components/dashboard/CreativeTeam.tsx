"use client";

import { useState } from 'react';
import { User, X, Crown, Mic2, Music, GraduationCap, ClipboardList, Megaphone, Lightbulb, Hammer, Users } from 'lucide-react';

interface TeamMember {
  id: number;
  name: string;
  role: string;
  initials: string;
  color: string;
}

export default function CreativeTeam({ team }: { team: TeamMember[] }) {
  const [isOpen, setIsOpen] = useState(false);

  // Fallback for empty state (prevents UI collapse)
  if (!team || team.length === 0) {
      return (
          <div className="flex items-center gap-3 opacity-60 py-2 border border-white/10 rounded-full px-3 bg-black/20">
              <Users size={14} />
              <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wide">Staff Not Assigned</span>
          </div>
      );
  }

  // --- 1. SORTING LOGIC ---
  // We want the Director first, then MD/Choreo, then SM/Assistants
  const sortedTeam = [...team].sort((a, b) => {
      const score = (role: string) => {
          const r = (role || "").toLowerCase();
          if (r === 'director') return 10;
          if (r.includes('artistic')) return 9;
          if (r.includes('music') || r.includes('vocal')) return 8;
          if (r.includes('choreographer')) return 7;
          if (r.includes('stage manager') && !r.includes('assistant')) return 6;
          return 0;
      };
      return score(b.role) - score(a.role);
  });

  // Display Top 3 + Counter
  const coreTeam = sortedTeam.slice(0, 3);
  const remainingCount = Math.max(0, sortedTeam.length - 3);

  const getIcon = (role: string) => {
      const r = (role || "").toLowerCase();
      if (r.includes('music') || r.includes('vocal')) return <Mic2 size={14}/>;
      if (r.includes('choreographer')) return <Music size={14}/>;
      if (r.includes('stage manager')) return <ClipboardList size={14}/>;
      if (r.includes('assistant')) return <Megaphone size={14}/>;
      if (r.includes('director')) return <Crown size={14}/>;
      if (r.includes('light')) return <Lightbulb size={14}/>;
      if (r.includes('set') || r.includes('tech')) return <Hammer size={14}/>;
      return <User size={14}/>;
  };

  return (
    <>
      {/* --- DASHBOARD PREVIEW ROW --- */}
      <div className="flex flex-col gap-2 mt-4 xl:mt-0">
        <div className="flex flex-wrap items-center gap-3">
            
            {coreTeam.map((member) => (
                <div key={member.id} className="flex items-center gap-2 bg-black/30 p-1.5 pr-3 rounded-full border border-white/5 backdrop-blur-md shadow-sm hover:bg-black/50 transition-colors">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-[10px] font-black text-white shadow-lg ${member.color}`}>
                        {member.initials}
                    </div>
                    <div className="flex flex-col leading-none">
                        <span className="text-[10px] font-bold text-white whitespace-nowrap">{member.name.split(' ')[0]}</span>
                        <span className="text-[8px] font-bold text-zinc-400 uppercase tracking-wider truncate max-w-[90px]">{member.role}</span>
                    </div>
                </div>
            ))}
            
            {/* "More" Button */}
            {remainingCount > 0 && (
                <button 
                    onClick={() => setIsOpen(true)}
                    className="w-8 h-8 rounded-full bg-zinc-800 border border-white/10 flex items-center justify-center text-zinc-400 hover:text-white hover:bg-zinc-700 transition-all shadow-lg shrink-0"
                    title="View Full Staff"
                >
                    <span className="text-[10px] font-black">+{remainingCount}</span>
                </button>
            )}
        </div>
      </div>

      {/* --- MOBILE MODAL --- */}
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-end md:items-center justify-center p-4 md:p-8">
            <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={() => setIsOpen(false)} />
            
            <div className="relative bg-zinc-900 w-full max-w-lg rounded-3xl border border-white/10 shadow-2xl overflow-hidden animate-in slide-in-from-bottom-10 duration-300 max-h-[80vh] flex flex-col">
                <div className="p-6 border-b border-white/10 bg-zinc-950 flex justify-between items-center shrink-0">
                    <div>
                        <h2 className="text-xl font-black uppercase italic tracking-tighter text-white">Creative Team</h2>
                        <p className="text-xs text-zinc-500 font-bold uppercase tracking-widest mt-1">Full Staff Roster</p>
                    </div>
                    <button onClick={() => setIsOpen(false)} className="p-2 bg-zinc-800 rounded-full text-zinc-400 hover:text-white transition-colors">
                        <X size={18} />
                    </button>
                </div>

                <div className="p-6 grid grid-cols-1 sm:grid-cols-2 gap-3 overflow-y-auto custom-scrollbar">
                    {sortedTeam.map((member) => (
                        <div key={member.id} className="flex items-center gap-3 p-3 rounded-xl bg-zinc-800/30 border border-white/5">
                            <div className={`w-10 h-10 rounded-full flex items-center justify-center text-xs font-black text-white shadow-inner shrink-0 ${member.color}`}>
                                {member.initials}
                            </div>
                            <div className="min-w-0">
                                <h3 className="text-sm font-bold text-white truncate">{member.name}</h3>
                                <div className="flex items-center gap-1.5 text-[10px] font-bold text-zinc-400 uppercase tracking-wider mt-0.5">
                                    {getIcon(member.role)} 
                                    <span className="truncate">{member.role}</span>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
      )}
    </>
  );
}