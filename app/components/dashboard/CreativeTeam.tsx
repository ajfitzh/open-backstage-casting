"use client";

import { useState } from 'react';
import { User, X, Crown, Mic2, Music, GraduationCap, ClipboardList, Megaphone } from 'lucide-react';

// You can swap this mock data for a DB fetch later
const TEAM_MEMBERS = [
  { name: "Austin Fitzhugh", role: "Director", initials: "AF", color: "bg-blue-600", icon: <Crown size={14}/> },
  { name: "Elizabeth ", role: "Artistic Dir.", initials: "EM", color: "bg-purple-600", icon: <GraduationCap size={14}/> },
  { name: "Sarah M.", role: "Choreographer", initials: "SM", color: "bg-emerald-600", icon: <Music size={14}/> },
  { name: "Kevin L.", role: "Music Director", initials: "KL", color: "bg-pink-500", icon: <Mic2 size={14}/> },
  { name: "Jessica T.", role: "Stage Manager", initials: "JT", color: "bg-amber-500", icon: <ClipboardList size={14}/> },
  { name: "Mike R.", role: "Asst. Director", initials: "MR", color: "bg-cyan-500", icon: <Megaphone size={14}/> },
];

export default function CreativeTeam() {
  const [isOpen, setIsOpen] = useState(false);

  // Core team shows on the main card (Director + SM)
  const coreTeam = TEAM_MEMBERS.slice(0, 3);

  return (
    <>
      {/* --- PREVIEW ROW (Visible on Hero) --- */}
      <div className="flex flex-col gap-2 mt-4 md:mt-0">
        <div className="flex items-center gap-3">
            {/* Spread out avatars with labels for Desktop/Tablet */}
            {coreTeam.map((member, i) => (
                <div key={i} className="flex items-center gap-2 bg-black/20 p-1.5 pr-3 rounded-full border border-white/5 backdrop-blur-sm">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-[10px] font-black text-white shadow-lg ${member.color}`}>
                        {member.initials}
                    </div>
                    <div className="flex flex-col leading-none">
                        <span className="text-[10px] font-bold text-white">{member.name.split(' ')[0]}</span>
                        <span className="text-[8px] font-bold text-zinc-400 uppercase tracking-wider">{member.role}</span>
                    </div>
                </div>
            ))}
            
            {/* The "More" Button */}
            <button 
                onClick={() => setIsOpen(true)}
                className="w-8 h-8 rounded-full bg-zinc-800 border border-white/10 flex items-center justify-center text-zinc-400 hover:text-white hover:bg-zinc-700 transition-all shadow-lg"
            >
                <span className="text-[10px] font-black">+{TEAM_MEMBERS.length - 3}</span>
            </button>
        </div>
      </div>

      {/* --- MOBILE MODAL (The Full Roster) --- */}
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-end md:items-center justify-center p-4 md:p-8">
            <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={() => setIsOpen(false)} />
            
            <div className="relative bg-zinc-900 w-full max-w-lg rounded-3xl border border-white/10 shadow-2xl overflow-hidden animate-in slide-in-from-bottom-10 duration-300">
                
                {/* Header */}
                <div className="p-6 border-b border-white/10 bg-zinc-950 flex justify-between items-center">
                    <div>
                        <h2 className="text-xl font-black uppercase italic tracking-tighter text-white">Creative Team</h2>
                        <p className="text-xs text-zinc-500 font-bold uppercase tracking-widest mt-1">Production Staff Roster</p>
                    </div>
                    <button onClick={() => setIsOpen(false)} className="p-2 bg-zinc-800 rounded-full text-zinc-400 hover:text-white">
                        <X size={18} />
                    </button>
                </div>

                {/* Grid List */}
                <div className="p-6 grid grid-cols-1 sm:grid-cols-2 gap-4 max-h-[60vh] overflow-y-auto custom-scrollbar">
                    {TEAM_MEMBERS.map((member, i) => (
                        <div key={i} className="flex items-center gap-4 p-3 rounded-xl bg-zinc-800/50 border border-white/5">
                            <div className={`w-12 h-12 rounded-full flex items-center justify-center text-sm font-black text-white shadow-inner ${member.color}`}>
                                {member.initials}
                            </div>
                            <div>
                                <h3 className="text-sm font-bold text-white">{member.name}</h3>
                                <div className="flex items-center gap-1.5 text-[10px] font-bold text-zinc-400 uppercase tracking-wider bg-black/20 px-2 py-0.5 rounded w-fit mt-1">
                                    {member.icon} {member.role}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>

                {/* Footer Action */}
                <div className="p-4 bg-zinc-950 border-t border-white/10 text-center">
                    <button className="text-xs font-bold text-blue-400 hover:text-blue-300 uppercase tracking-widest">
                        Manage Staff Permissions
                    </button>
                </div>
            </div>
        </div>
      )}
    </>
  );
}