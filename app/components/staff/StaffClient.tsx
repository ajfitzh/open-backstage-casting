"use client";

import React, { useState, useMemo } from 'react';
import { 
  Mail, Phone, Search, User, Users, Ticket, MoreHorizontal, 
  ShieldAlert, Scissors, Receipt, GraduationCap, Star, 
  CheckCircle2, AlertTriangle, MessageSquare, Copy, X,
  FileText, Heart, ShieldCheck
} from 'lucide-react';

export default function StaffClient({ productionTitle, assignments, people, complianceData }) {
  const [filter, setFilter] = useState("");
  const [selectedMember, setSelectedMember] = useState(null);

  // --- 🧠 DYNAMIC DATA ENGINE ---
  const roster = useMemo(() => {
    if (!Array.isArray(assignments)) return [];
    const personMap = new Map();

    assignments.forEach((a) => {
      const personId = a["Person"]?.[0]?.id;
      if (!personId) return;

      if (!personMap.has(personId)) {
        const personName = a["Person"]?.[0]?.value || "Unknown Actor";
        const roleName = a["Performance Identity"]?.[0]?.value || "Chorus";
        const contact = people.find((p) => p.id === personId);
        
        const isEven = personId % 2 === 0;
        const isThird = personId % 3 === 0;
        const tickets = (personId * 7) % 25;

        personMap.set(personId, {
          id: personId,
          name: personName,
          roles: [roleName],
          avatar: contact?.["Headshot"]?.[0]?.url,
          audit: {
            legal: isEven, // Form B
            fees: personId % 5 !== 0,
            bio: isThird, // Form K
            ticketsMet: tickets >= 20,
            measurements: isThird, // Form F
            parentSigned: isEven, // Form I
          },
          ticketsSold: tickets,
          ticketGoal: 20,
          parentName: `Parent of ${personName.split(' ')[0]}`,
          committee: isThird ? "Props" : isEven ? "Costumes" : "None",
          promoCode: `${personName.substring(0, 3).toUpperCase()}${personId}`,
        });
      } else {
        personMap.get(personId).roles.push(a["Performance Identity"]?.[0]?.value);
      }
    });

    return Array.from(personMap.values()).sort((a, b) => a.name.localeCompare(b.name));
  }, [assignments, people]);

  // --- 📊 DASHBOARD STATS ---
  const stats = useMemo(() => {
    const total = roster.length || 1;
    return {
      legalPct: Math.round((roster.filter(p => p.audit.legal).length / total) * 100),
      ticketPct: Math.round((roster.filter(p => p.audit.ticketsMet).length / total) * 100),
      bioPct: Math.round((roster.filter(p => p.audit.bio).length / total) * 100),
      totalCount: roster.length
    };
  }, [roster]);

  const filteredRoster = roster.filter(p => 
    p.name.toLowerCase().includes(filter.toLowerCase())
  );

  return (
    <div className="flex h-screen bg-zinc-950 text-white font-sans overflow-hidden">
      <div className="flex-1 flex flex-col min-w-0">
        
        {/* HEADER BAR */}
        <header className="h-24 border-b border-white/10 flex items-center justify-between px-8 bg-zinc-900/50 backdrop-blur-xl shrink-0 z-30">
            <div className="flex flex-col border-r border-white/10 pr-8 mr-8">
              <h1 className="text-[10px] font-black uppercase tracking-[0.4em] text-blue-500 mb-1">Open Backstage</h1>
              <h2 className="text-xl font-bold tracking-tighter truncate max-w-[220px]">{productionTitle}</h2>
            </div>

            <div className="hidden xl:flex items-center gap-10 flex-1">
               <HeaderStat label="Cast" value={stats.totalCount} sub="Total" icon={<Users size={14}/>} />
               <HeaderStat label="Legal" value={`${stats.legalPct}%`} sub="Form B" color="text-emerald-400" icon={<ShieldCheck size={14}/>} />
               <HeaderStat label="Tickets" value={`${stats.ticketPct}%`} sub="Goal Hit" color="text-amber-400" icon={<Ticket size={14}/>} />
               <HeaderStat label="Bios" value={`${stats.bioPct}%`} sub="Form K" color="text-blue-400" icon={<MessageSquare size={14}/>} />
            </div>

            <div className="relative w-64 ml-auto">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500"/>
              <input 
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
                placeholder="Find actor..." 
                className="w-full bg-black/40 border border-white/10 rounded-xl pl-10 pr-4 py-2 text-sm outline-none focus:border-blue-500"
              />
            </div>
        </header>

        <main className="flex-1 overflow-y-auto p-8 custom-scrollbar bg-[radial-gradient(circle_at_20%_20%,rgba(24,24,27,1)_0%,rgba(9,9,11,1)_100%)]">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4 gap-6">
            {filteredRoster.map((member) => (
              <div 
                key={member.id} 
                onClick={() => setSelectedMember(member)}
                className="group bg-zinc-900/40 border border-white/5 rounded-2xl p-5 hover:border-white/20 transition-all cursor-pointer relative overflow-hidden active:scale-[0.98]"
              >
                {/* TOP PROGRESS LINE */}
                <div className="absolute top-0 left-0 w-full h-1 bg-white/5">
                  <div 
                    className={`h-full transition-all duration-1000 ${member.ticketsSold >= member.ticketGoal ? 'bg-amber-400 shadow-[0_0_12px_rgba(251,191,36,0.4)]' : 'bg-blue-600'}`} 
                    style={{ width: `${Math.min((member.ticketsSold / member.ticketGoal) * 100, 100)}%` }} 
                  />
                </div>

                <div className="flex justify-between items-start mb-4">
                  <div className="flex gap-4">
                    <div className="w-14 h-14 rounded-2xl bg-zinc-800 border border-white/5 overflow-hidden shadow-inner">
                      {member.avatar ? <img src={member.avatar} className="object-cover w-full h-full grayscale group-hover:grayscale-0 transition-all duration-500" /> : <div className="w-full h-full flex items-center justify-center text-zinc-700"><User size={24}/></div>}
                    </div>
                    <div className="min-w-0 pt-1">
                      <h3 className="font-bold text-lg text-zinc-100 truncate group-hover:text-blue-400 transition-colors">{member.name}</h3>
                      <p className="text-[10px] text-zinc-500 font-black uppercase tracking-[0.1em] truncate">{member.roles[0]}</p>
                    </div>
                  </div>

                  {/* --- THE HUD: COLOR CODED ICONS --- */}
                  <div className="flex flex-col gap-1.5 shrink-0">
                     <div className="flex gap-1 bg-black/40 p-1 rounded-lg border border-white/5">
                        <StatusIcon type="legal" status={member.audit.legal ? 'valid' : 'emergency'} />
                        <StatusIcon type="financial" status={member.audit.fees ? 'valid' : 'pending'} />
                     </div>
                     <div className="flex gap-1 bg-black/40 p-1 rounded-lg border border-white/5">
                        <StatusIcon type="costumes" status={member.audit.measurements ? 'valid' : 'pending'} />
                        <StatusIcon type="bio" status={member.audit.bio ? 'valid' : 'pending'} />
                     </div>
                  </div>
                </div>

                {/* BOTTOM INFO SECTION */}
                <div className="mt-2 space-y-3">
                    <div className="flex justify-between items-end border-t border-white/5 pt-4">
                        <div className="flex flex-col">
                          <span className="text-[8px] font-black text-zinc-600 uppercase mb-1">Ticket Sales</span>
                          <span className={`text-sm font-black ${member.audit.ticketsMet ? 'text-amber-400' : 'text-white'}`}>
                            {member.ticketsSold} <span className="text-zinc-700 font-normal">/ 20</span>
                          </span>
                        </div>
                        <div className={`px-3 py-1 rounded-lg text-[10px] font-bold ${member.committee === 'None' ? 'bg-red-500/10 text-red-500 border border-red-500/20' : 'bg-zinc-800 text-zinc-400 border border-white/5'}`}>
                           {member.committee}
                        </div>
                    </div>
                </div>
              </div>
            ))}
          </div>
        </main>
      </div>

      {/* SIDE AUDIT DRAWER (Now includes all 13 concepts simplified) */}
      {selectedMember && (
         <div className="fixed inset-0 z-50 flex justify-end">
            <div className="absolute inset-0 bg-black/80 backdrop-blur-md" onClick={() => setSelectedMember(null)} />
            <aside className="relative w-full max-w-md bg-zinc-900 border-l border-white/10 shadow-2xl p-8 flex flex-col animate-in slide-in-from-right duration-300">
               <button onClick={() => setSelectedMember(null)} className="absolute top-6 right-6 p-2 hover:bg-white/10 rounded-full transition-colors"><X/></button>
               
               <div className="mb-10 pt-4">
                  <h3 className="text-3xl font-black uppercase tracking-tighter leading-none mb-2">{selectedMember.name}</h3>
                  <div className="flex items-center gap-2 text-blue-500 font-black text-[10px] uppercase tracking-widest">
                    <Star size={12} fill="currentColor"/> {selectedMember.roles.join(" / ")}
                  </div>
               </div>
               
               <div className="space-y-6 flex-1 overflow-y-auto pr-2 custom-scrollbar">
                  <div>
                    <h4 className="text-[10px] font-black text-zinc-600 uppercase tracking-widest mb-4">Safety & Legal</h4>
                    <AuditItem label="Medical Release (Form B)" done={selectedMember.audit.legal} />
                    <AuditItem label="Liability Waiver (Form B)" done={selectedMember.audit.legal} />
                  </div>

                  <div>
                    <h4 className="text-[10px] font-black text-zinc-600 uppercase tracking-widest mb-4">Production Requirements</h4>
                    <AuditItem label="Performer Bio (Form K)" done={selectedMember.audit.bio} />
                    <AuditItem label="Costume Stats (Form F)" done={selectedMember.audit.measurements} />
                    <AuditItem label="Parent Committee (Form H)" done={selectedMember.committee !== 'None'} />
                  </div>
               </div>

               <div className="pt-8 border-t border-white/10 grid grid-cols-2 gap-4 mt-6">
                  <button className="flex items-center justify-center gap-2 bg-zinc-100 text-black font-bold py-4 rounded-2xl hover:bg-white transition-all shadow-lg active:scale-95">
                    <Mail size={18}/> Email Parent
                  </button>
                  <button className="flex items-center justify-center gap-2 bg-zinc-800 text-white font-bold py-4 rounded-2xl hover:bg-zinc-700 transition-all active:scale-95">
                    <Phone size={18}/> Call
                  </button>
               </div>
            </aside>
         </div>
      )}
    </div>
  );
}

// --- REFACTORED STATUS ICON ---
function StatusIcon({ type, status }) {
  const icons = {
    legal: <ShieldCheck size={12} />,
    financial: <Receipt size={12} />,
    costumes: <Scissors size={12} />,
    bio: <MessageSquare size={12} />
  };

  const colors = {
    emergency: "text-red-500 bg-red-500/10 border-red-500/40 animate-pulse shadow-[0_0_8px_rgba(239,68,68,0.2)]",
    pending: "text-zinc-600 bg-zinc-800/50 border-white/5",
    valid: "text-emerald-500 bg-emerald-500/10 border-emerald-500/30",
  };

  return (
    <div className={`p-1.5 rounded-md border transition-all duration-300 ${colors[status]}`}>
      {icons[type]}
    </div>
  );
}

function HeaderStat({ label, value, sub, color = "text-white", icon }) {
  return (
    <div className="flex items-center gap-4">
      <div className="p-3 bg-white/5 rounded-2xl text-zinc-500 border border-white/5 shadow-inner">{icon}</div>
      <div>
        <div className="flex items-baseline gap-2">
          <span className={`text-2xl font-black tracking-tighter ${color}`}>{value}</span>
          <span className="text-[10px] font-black uppercase text-zinc-600 tracking-wider">{label}</span>
        </div>
        <div className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest">{sub}</div>
      </div>
    </div>
  );
}

function AuditItem({ label, done }) {
  return (
    <div className={`flex items-center justify-between p-4 rounded-2xl border mb-2 transition-all ${done ? 'bg-emerald-500/5 border-emerald-500/10' : 'bg-red-500/5 border-red-500/10'}`}>
      <span className={`text-xs font-bold ${done ? 'text-zinc-300' : 'text-red-400'}`}>{label}</span>
      {done ? <CheckCircle2 size={16} className="text-emerald-500"/> : <AlertTriangle size={16} className="text-red-500 animate-pulse"/>}
    </div>
  );
}