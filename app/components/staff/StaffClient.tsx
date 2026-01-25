"use client";

import React, { useState, useMemo } from 'react';
import { 
  Mail, Phone, Search, User, Users, Ticket, MoreHorizontal, 
  ShieldAlert, Scissors, Receipt, GraduationCap, Star, 
  CheckCircle2, AlertTriangle, MessageSquare, Copy
} from 'lucide-react';

export default function StaffClient({ productionTitle, assignments, people, complianceData }) {
  const [filter, setFilter] = useState("");
  const [filterMode, setFilterMode] = useState('All');

  // --- 🧠 THE DATA AUGMENTOR ---
  const roster = useMemo(() => {
    if (!Array.isArray(assignments)) return [];

    const personMap = new Map();

    assignments.forEach((a) => {
      const personId = a["Person"]?.[0]?.id;
      const personName = a["Person"]?.[0]?.value || "Unknown Actor";
      const roleName = a["Performance Identity"]?.[0]?.value || "Chorus";

      if (!personId) return;

      if (!personMap.has(personId)) {
        const contact = people.find((p) => p.id === personId);
        
        // 🧩 DETERMINISTIC MOCK DATA 
        // We use the personId to "fake" data consistently so the UI isn't random
        const isEven = personId % 2 === 0;
        const isThird = personId % 3 === 0;

        personMap.set(personId, {
          id: personId,
          name: personName,
          roles: [roleName],
          email: contact?.["Email"] || "",
          phone: contact?.["Phone Number"] || "",
          avatar: contact?.["Headshot"]?.[0]?.url,
          
          // Compliance (Synthesized)
          legal: isEven, 
          feesPaid: personId % 5 !== 0, // 80% have paid
          costumesDone: isThird,
          
          // Family / Parent Logic
          parentName: `Parent of ${personName.split(' ')[0]}`,
          committee: isThird ? "Props" : isEven ? "Costumes" : "None",
          parentSigned: isEven,
          
          // Ticket Aspiration
          ticketsSold: (personId * 7) % 25, // Generates a number between 0-25
          ticketGoal: 20,
          promoCode: `${personName.substring(0, 3).toUpperCase()}${personId}`,

          // Education
          absences: personId % 4,
          isGoodStanding: (personId % 4) < 3
        });
      } else {
        personMap.get(personId).roles.push(roleName);
      }
    });

    return Array.from(personMap.values()).sort((a, b) => a.name.localeCompare(b.name));
  }, [assignments, people]);

  const filteredRoster = roster.filter(p => 
    p.name.toLowerCase().includes(filter.toLowerCase()) || 
    p.roles.some(r => r.toLowerCase().includes(filter.toLowerCase()))
  );

  return (
    <div className="flex flex-col h-screen bg-zinc-950 text-white font-sans overflow-hidden">
      
      {/* HEADER: GLOBAL HEALTH CHECK */}
      <header className="h-20 border-b border-white/10 flex items-center justify-between px-8 bg-zinc-900/80 backdrop-blur-xl shrink-0 z-30">
          <div className="flex flex-col">
            <h1 className="text-[10px] font-black uppercase tracking-[0.3em] text-blue-500 mb-1">Production Roster</h1>
            <h2 className="text-xl font-bold tracking-tight">{productionTitle}</h2>
          </div>

          <div className="flex items-center gap-4 flex-1 max-w-md mx-12">
            <div className="relative w-full">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500"/>
              <input 
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
                placeholder="Search 41 cast members..." 
                className="w-full bg-black/40 border border-white/10 rounded-xl pl-10 pr-4 py-2 text-sm outline-none focus:border-blue-500 transition-all"
              />
            </div>
          </div>

          <div className="hidden md:flex gap-6">
             <StatMini label="Legal Clear" value="88%" color="text-emerald-500" />
             <StatMini label="Tickets Sold" value="412" color="text-amber-500" />
          </div>
      </header>

      {/* MAIN ROSTER GRID */}
      <main className="flex-1 overflow-y-auto p-8 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-zinc-900/50 via-zinc-950 to-zinc-950">
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-6">
          {filteredRoster.map((member) => (
            <div key={member.id} className="group relative bg-zinc-900 border border-white/5 rounded-2xl flex flex-col transition-all hover:scale-[1.02] hover:border-white/20 hover:shadow-[0_20px_50px_rgba(0,0,0,0.5)] overflow-hidden">
              
              {/* TICKET PROGRESS BAR */}
              <div className="absolute top-0 left-0 w-full h-1 bg-white/5">
                <div 
                   className={`h-full transition-all duration-1000 ${member.ticketsSold >= member.ticketGoal ? 'bg-amber-400 shadow-[0_0_15px_rgba(251,191,36,0.6)]' : 'bg-blue-600'}`}
                   style={{ width: `${Math.min((member.ticketsSold / member.ticketGoal) * 100, 100)}%` }}
                />
              </div>

              <div className="p-5 flex-1">
                <div className="flex justify-between items-start mb-4">
                  <div className="flex gap-4">
                    <div className="w-14 h-14 rounded-2xl bg-zinc-800 border border-white/10 overflow-hidden shrink-0 shadow-inner">
                      {member.avatar ? (
                        <img src={member.avatar} className="w-full h-full object-cover grayscale group-hover:grayscale-0 transition-all" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-zinc-700"><User size={28}/></div>
                      )}
                    </div>
                    <div className="min-w-0">
                      <h3 className="font-bold text-lg text-zinc-100 truncate pr-2">{member.name}</h3>
                      <p className="text-[10px] text-blue-400 font-black uppercase tracking-widest truncate">{member.roles.join(" / ")}</p>
                    </div>
                  </div>

                  {/* STATUS HUD */}
                  <div className="flex flex-col gap-1.5">
                     <div className="flex gap-1 bg-black/40 p-1 rounded-lg border border-white/5">
                        <StatusIcon type="legal" status={member.legal ? 'valid' : 'emergency'} />
                        <StatusIcon type="financial" status={member.feesPaid ? 'valid' : 'overdue'} />
                     </div>
                     <div className="flex gap-1 bg-black/40 p-1 rounded-lg border border-white/5">
                        <StatusIcon type="parent" status={member.parentSigned ? 'valid' : 'emergency'} />
                        <StatusIcon type="ticket" status={member.ticketsSold >= member.ticketGoal ? 'success' : 'pending'} />
                     </div>
                  </div>
                </div>

                {/* FAMILY COMPONENT */}
                <div className="mt-4 bg-black/40 rounded-xl border border-white/5 p-3">
                   <div className="flex justify-between items-center mb-2">
                      <span className="text-[9px] font-black text-zinc-500 uppercase flex items-center gap-1.5"><Users size={12}/> Parent: {member.parentName}</span>
                      <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full ${member.committee === 'None' ? 'bg-red-500/10 text-red-500 border border-red-500/20' : 'bg-zinc-800 text-zinc-300'}`}>
                        {member.committee}
                      </span>
                   </div>

                   <div className="flex justify-between items-end">
                      <div>
                        <span className="text-[8px] font-bold text-zinc-600 block mb-1">PROMO CODE</span>
                        <div className="flex items-center gap-2 bg-zinc-800/50 px-2 py-1 rounded border border-white/5 font-mono text-xs text-blue-300">
                          {member.promoCode} <Copy size={10} className="text-zinc-600 hover:text-white cursor-pointer"/>
                        </div>
                      </div>
                      <div className="text-right">
                        <span className="text-[10px] font-black text-white">
                          {member.ticketsSold} <span className="text-zinc-600">/ {member.ticketGoal}</span>
                        </span>
                        <span className="block text-[8px] text-zinc-500 uppercase font-bold tracking-tighter">Tickets</span>
                      </div>
                   </div>
                </div>
              </div>

              {/* ACTION FOOTER */}
              <div className="px-5 py-3 bg-white/5 border-t border-white/5 flex items-center justify-between">
                 <div className="flex gap-1">
                   <IconButton icon={<Mail size={14}/>} />
                   <IconButton icon={<MessageSquare size={14}/>} />
                 </div>
                 {member.absences > 0 && (
                   <div className={`text-[9px] font-black px-2 py-1 rounded flex items-center gap-1.5 ${member.isGoodStanding ? 'text-zinc-400' : 'text-red-400 bg-red-400/10'}`}>
                     <GraduationCap size={14}/> {member.absences} ABSENCES
                   </div>
                 )}
              </div>

            </div>
          ))}
        </div>
      </main>
    </div>
  );
}

// --- HELPER COMPONENTS ---

function IconButton({ icon }) {
  return (
    <button className="p-2 hover:bg-white/10 rounded-lg text-zinc-500 hover:text-white transition-all border border-transparent hover:border-white/10">
      {icon}
    </button>
  );
}

function StatMini({ label, value, color }) {
  return (
    <div className="flex flex-col items-end">
      <span className="text-[8px] font-black text-zinc-600 uppercase tracking-widest">{label}</span>
      <span className={`text-sm font-black ${color}`}>{value}</span>
    </div>
  );
}

function StatusIcon({ type, status }) {
  const icons = {
    legal: <ShieldAlert size={12} />,
    financial: <Receipt size={12} />,
    parent: <Users size={12} />,
    ticket: <Ticket size={12} />,
    success: <Star size={12} />
  };

  const colors = {
    emergency: "text-red-500 bg-red-500/10 border-red-500/30 animate-pulse",
    overdue: "text-orange-500 bg-orange-500/10",
    pending: "text-blue-400 bg-blue-400/10 border-blue-400/20",
    valid: "text-emerald-500 bg-emerald-500/10 border-emerald-500/20",
    success: "text-amber-400 bg-amber-400/20 border-amber-400/40",
  };

  return (
    <div className={`p-1 rounded-md border transition-all ${colors[status]}`}>
      {icons[status === 'success' ? 'success' : type]}
    </div>
  );
}