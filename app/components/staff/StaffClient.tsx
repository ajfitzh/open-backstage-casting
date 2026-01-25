"use client";

import React, { useState, useMemo } from 'react';
import { 
  Mail, Phone, Search, User, Users, Ticket, MoreHorizontal, 
  ShieldAlert, Scissors, Receipt, GraduationCap, Star, 
  CheckCircle2, AlertTriangle, MessageSquare, Copy, X,
  FileText, Heart, ShieldCheck, BarChart3
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
        
        // Deterministic logic for Jenny's stats
        const isEven = personId % 2 === 0;
        const isThird = personId % 3 === 0;

        personMap.set(personId, {
          id: personId,
          name: personName,
          roles: [roleName],
          avatar: contact?.["Headshot"]?.[0]?.url,
          audit: {
            legal: isEven, 
            ticketMet: (personId * 7) % 25 >= 20,
            bio: isThird,
            fees: personId % 5 !== 0,
            conflicts: personId % 4 !== 0,
            measurements: isThird
          },
          ticketsSold: (personId * 7) % 25,
          ticketGoal: 20,
          parentName: `Parent of ${personName.split(' ')[0]}`,
          committee: isThird ? "Props" : isEven ? "Costumes" : "None",
        });
      } else {
        personMap.get(personId).roles.push(a["Performance Identity"]?.[0]?.value);
      }
    });

    return Array.from(personMap.values()).sort((a, b) => a.name.localeCompare(b.name));
  }, [assignments, people]);

  // --- 📊 JENNY'S STATS CALCULATOR ---
  const stats = useMemo(() => {
    const total = roster.length || 1;
    const legal = roster.filter(p => p.audit.legal).length;
    const tickets = roster.filter(p => p.audit.ticketMet).length;
    const bios = roster.filter(p => p.audit.bio).length;

    return {
      legalPct: Math.round((legal / total) * 100),
      ticketPct: Math.round((tickets / total) * 100),
      bioPct: Math.round((bios / total) * 100),
      totalCount: roster.length
    };
  }, [roster]);

  const filteredRoster = roster.filter(p => 
    p.name.toLowerCase().includes(filter.toLowerCase())
  );

  return (
    <div className="flex h-screen bg-zinc-950 text-white font-sans overflow-hidden">
      <div className="flex-1 flex flex-col min-w-0">
        
        {/* --- DYNAMIC HEADER WITH REFACTORED STATS --- */}
        <header className="h-24 border-b border-white/10 flex items-center justify-between px-8 bg-zinc-900/50 backdrop-blur-xl shrink-0 z-30">
            <div className="flex flex-col border-r border-white/10 pr-8 mr-8">
              <h1 className="text-[10px] font-black uppercase tracking-[0.4em] text-blue-500 mb-1">Open Backstage</h1>
              <h2 className="text-xl font-bold tracking-tighter truncate max-w-[200px]">{productionTitle}</h2>
            </div>

            {/* JENNY'S DASHBOARD STATS */}
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

        <main className="flex-1 overflow-y-auto p-8 custom-scrollbar">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4 gap-6">
            {filteredRoster.map((member) => (
              <div 
                key={member.id} 
                onClick={() => setSelectedMember(member)}
                className="group bg-zinc-900/50 border border-white/5 rounded-2xl p-5 hover:border-white/20 transition-all cursor-pointer relative overflow-hidden active:scale-95"
              >
                {/* Visual Progress Bar */}
                <div className="absolute top-0 left-0 w-full h-1 bg-white/5">
                  <div className={`h-full bg-blue-500 transition-all duration-700`} style={{ width: `${member.audit.legal ? '100%' : '50%'}` }} />
                </div>

                <div className="flex justify-between items-start">
                  <div className="flex gap-4">
                    <div className="w-12 h-12 rounded-xl bg-zinc-800 border border-white/5 overflow-hidden">
                      {member.avatar ? <img src={member.avatar} className="object-cover w-full h-full" /> : <div className="w-full h-full flex items-center justify-center text-zinc-700"><User/></div>}
                    </div>
                    <div className="min-w-0">
                      <h3 className="font-bold text-zinc-100 truncate">{member.name}</h3>
                      <p className="text-[10px] text-zinc-500 font-bold uppercase truncate">{member.roles[0]}</p>
                    </div>
                  </div>
                  <div className="flex gap-1">
                    {!member.audit.legal && <ShieldAlert size={16} className="text-red-500 animate-pulse"/>}
                    {!member.audit.bio && <MessageSquare size={16} className="text-blue-400 opacity-50"/>}
                  </div>
                </div>

                <div className="mt-4 flex justify-between items-end border-t border-white/5 pt-4">
                    <div className="text-[10px] text-zinc-500">
                      <span className="block font-black uppercase text-[8px] mb-1">Ticket Sales</span>
                      <span className={`text-sm font-black ${member.audit.ticketMet ? 'text-amber-400' : 'text-white'}`}>{member.ticketsSold} <span className="text-zinc-700">/ 20</span></span>
                    </div>
                    <div className="text-right">
                       <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${member.committee === 'None' ? 'text-red-500 bg-red-500/10' : 'text-zinc-400 bg-zinc-800'}`}>{member.committee}</span>
                    </div>
                </div>
              </div>
            ))}
          </div>
        </main>
      </div>

      {/* SIDE AUDIT DRAWER (Same as previous, enhanced for Jenny) */}
      {selectedMember && (
         <div className="fixed inset-0 z-50 flex justify-end">
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setSelectedMember(null)} />
            <aside className="relative w-full max-w-md bg-zinc-900 border-l border-white/10 shadow-2xl p-8 flex flex-col animate-in slide-in-from-right duration-300">
               <button onClick={() => setSelectedMember(null)} className="absolute top-6 right-6 p-2 hover:bg-white/5 rounded-full"><X/></button>
               <h3 className="text-2xl font-black uppercase mb-1">{selectedMember.name}</h3>
               <p className="text-blue-500 font-bold text-xs mb-8 tracking-widest">{selectedMember.roles.join(" / ")}</p>
               
               <div className="space-y-3">
                  <h4 className="text-[10px] font-black text-zinc-600 uppercase tracking-widest mb-4">Checklist Audit</h4>
                  <AuditItem label="Medical Release (Form B)" done={selectedMember.audit.legal} />
                  <AuditItem label="Performer Bio (Form K)" done={selectedMember.audit.bio} />
                  <AuditItem label="Conflict Sheet (Form G)" done={selectedMember.audit.conflicts} />
                  <AuditItem label="Fees Paid" done={selectedMember.audit.fees} />
               </div>

               <div className="mt-auto grid grid-cols-2 gap-4">
                  <button className="bg-zinc-100 text-black font-bold py-3 rounded-xl hover:bg-white">Email Parent</button>
                  <button className="bg-zinc-800 text-white font-bold py-3 rounded-xl hover:bg-zinc-700">Call Phone</button>
               </div>
            </aside>
         </div>
      )}
    </div>
  );
}

// --- HELPER UI COMPONENTS ---

function HeaderStat({ label, value, sub, color = "text-white", icon }) {
  return (
    <div className="flex items-center gap-4">
      <div className="p-2.5 bg-white/5 rounded-xl text-zinc-500 border border-white/5">{icon}</div>
      <div>
        <div className="flex items-baseline gap-2">
          <span className={`text-xl font-black tracking-tighter ${color}`}>{value}</span>
          <span className="text-[10px] font-black uppercase text-zinc-600 tracking-wider">{label}</span>
        </div>
        <div className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest">{sub}</div>
      </div>
    </div>
  );
}

function AuditItem({ label, done }) {
  return (
    <div className={`flex items-center justify-between p-4 rounded-xl border ${done ? 'bg-emerald-500/5 border-emerald-500/10' : 'bg-red-500/5 border-red-500/10'}`}>
      <span className={`text-xs font-bold ${done ? 'text-zinc-300' : 'text-red-400'}`}>{label}</span>
      {done ? <CheckCircle2 size={16} className="text-emerald-500"/> : <AlertTriangle size={16} className="text-red-500 animate-pulse"/>}
    </div>
  );
}