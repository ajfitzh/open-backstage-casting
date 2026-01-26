"use client";

import React, { useState, useMemo } from 'react';
import { 
  Search, User, Users, X,
  ShieldCheck, ClipboardCheck, CircleDollarSign,
  Check
} from 'lucide-react';

// --- 🗺️ DATA CONSTANTS ---
const LEGACY_MAP = {
  legal: { title: "Legal & Safety", forms: [{ id: "Form B", label: "Medical Release" }, { id: "Form B", label: "Liability Waiver" }, { id: "Form B", label: "Photo Release" }] },
  financial: { title: "Financials", forms: [{ id: "Fee", label: "Production Fee" }, { id: "Cash", label: "$5 Pizza Money" }, { id: "Tix", label: "Ticket Quota (20)" }] },
  production: { title: "Production Ops", forms: [{ id: "Form K", label: "Performer Bio" }, { id: "Form F", label: "Measurements" }, { id: "Form G", label: "Conflict Sheet" }] },
  family: { title: "Family Commitment", forms: [{ id: "Form H", label: "Committee Selection" }, { id: "Form I", label: "Parent Character Contract" }, { id: "Form A", label: "Student Character Contract" }] }
};

export default function StaffClient({ productionTitle, assignments, people }: any) {
  const [filter, setFilter] = useState("");
  const [selectedMember, setSelectedMember] = useState<any>(null);
  
  // --- 🧠 DYNAMIC DATA ENGINE ---
  const roster = useMemo(() => {
    if (!Array.isArray(assignments)) return [];
    const personMap = new Map();
    assignments.forEach((a: any) => {
      const personId = a["Person"]?.[0]?.id;
      if (!personId || personMap.has(personId)) return;
      
      // Deterministic Mock Data logic (Preserved from your original file)
      const isEven = personId % 2 === 0;
      const isThird = personId % 3 === 0;
      const tickets = (personId * 7) % 25;
      
      personMap.set(personId, {
        id: personId,
        name: a["Person"]?.[0]?.value || "Unknown",
        roles: [a["Performance Identity"]?.[0]?.value || "Chorus"],
        avatar: people.find((p: any) => p.id === personId)?.["Headshot"]?.[0]?.url,
        audit: {
          medical: isEven, liability: isEven, photo: isEven,
          fees: personId % 5 !== 0, pizza: personId % 7 !== 0, ticketsMet: tickets >= 20,
          bio: isThird, measurements: isThird, conflicts: personId % 4 !== 0,
          committee: isEven, parentContract: isEven, studentContract: isThird
        },
        ticketsSold: tickets,
        committeeName: isEven ? "Costumes" : isThird ? "Props" : "None",
      });
    });
    return Array.from(personMap.values());
  }, [assignments, people]);

  // Stats for the Dashboard
  const stats = useMemo(() => {
    const total = roster.length || 1;
    const calc = (fn: (p: any) => boolean) => Math.round((roster.filter(fn).length / total) * 100);
    return {
      count: roster.length,
      legal: calc(p => p.audit.medical && p.audit.liability),
      prod: calc(p => p.audit.bio && p.audit.measurements),
      money: calc(p => p.audit.fees && p.audit.pizza),
    };
  }, [roster]);

  return (
    <div className="flex flex-col h-full bg-zinc-950 text-white font-sans">
       
        {/* HEADER */}
        {/* Sticky top-0 ensures the stats bar stays visible while scrolling the grid */}
        <header className="sticky top-0 z-20 h-20 border-b border-white/10 flex items-center justify-between px-8 bg-zinc-950/80 backdrop-blur-xl shrink-0">
            <div>
              <h1 className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500 mb-1">Production Dashboard</h1>
              <h2 className="text-xl font-bold tracking-tighter truncate max-w-[300px]">{productionTitle}</h2>
            </div>
            
            <div className="hidden xl:flex items-center gap-8">
               <HeaderStat label="Cast Size" value={stats.count} color="text-white" icon={<Users size={14}/>} />
               <HeaderStat label="Legal" value={`${stats.legal}%`} color="text-emerald-400" icon={<ShieldCheck size={14}/>} />
               <HeaderStat label="Ops" value={`${stats.prod}%`} color="text-blue-400" icon={<ClipboardCheck size={14}/>} />
               <HeaderStat label="Money" value={`${stats.money}%`} color="text-amber-400" icon={<CircleDollarSign size={14}/>} />
            </div>

            <div className="relative w-64 ml-8">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500"/>
              <input onChange={(e) => setFilter(e.target.value)} placeholder="Search actor..." className="w-full bg-black/40 border border-white/10 rounded-xl pl-10 pr-4 py-2 text-sm outline-none focus:border-blue-500" />
            </div>
        </header>

        {/* MAIN ROSTER GRID */}
        <main className="flex-1 p-8 bg-[radial-gradient(circle_at_20%_20%,rgba(24,24,27,1)_0%,rgba(9,9,11,1)_100%)]">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4 gap-6">
            {roster.filter(p => p.name.toLowerCase().includes(filter.toLowerCase())).map((member: any) => (
              <div 
                key={member.id} 
                onClick={() => setSelectedMember(member)}
                className="group bg-zinc-900/40 border border-white/5 rounded-2xl p-5 hover:border-white/20 transition-all cursor-pointer relative"
              >
                <div className="absolute top-0 left-0 w-full h-1 bg-white/5 rounded-t-2xl overflow-hidden">
                  <div className={`h-full transition-all duration-1000 ${member.ticketsSold >= 20 ? 'bg-amber-400' : 'bg-blue-600'}`} style={{ width: `${Math.min((member.ticketsSold / 20) * 100, 100)}%` }} />
                </div>
                <div className="flex justify-between items-start mb-4">
                  <div className="flex gap-4 min-w-0">
                    <div className="w-14 h-14 rounded-2xl bg-zinc-800 border border-white/5 overflow-hidden shadow-inner shrink-0">
                      {member.avatar ? <img src={member.avatar} className="object-cover w-full h-full grayscale group-hover:grayscale-0 transition-all" /> : <div className="w-full h-full flex items-center justify-center text-zinc-700"><User size={24}/></div>}
                    </div>
                    <div className="min-w-0 pt-1">
                      <h3 className="font-bold text-lg text-zinc-100 truncate">{member.name}</h3>
                      <p className="text-[10px] text-zinc-500 font-black uppercase tracking-[0.1em] truncate">{member.roles[0]}</p>
                    </div>
                  </div>
                  <div className="flex flex-col gap-1.5 shrink-0 z-10">
                      <div className="flex gap-1 bg-black/40 p-1 rounded-lg border border-white/5">
                        <RichStatusIcon type="legal" member={member} />
                        <RichStatusIcon type="financial" member={member} />
                      </div>
                      <div className="flex gap-1 bg-black/40 p-1 rounded-lg border border-white/5">
                        <RichStatusIcon type="production" member={member} />
                        <RichStatusIcon type="family" member={member} />
                      </div>
                  </div>
                </div>
                {/* Footer Info */}
                <div className="mt-2 flex justify-between items-end border-t border-white/5 pt-4">
                    <div className="flex flex-col">
                      <span className="text-[8px] font-black text-zinc-600 uppercase mb-1">Ticket Sales</span>
                      <span className={`text-sm font-black ${member.audit.ticketsMet ? 'text-amber-400' : 'text-white'}`}>{member.ticketsSold} <span className="text-zinc-700 font-normal">/ 20</span></span>
                    </div>
                    <div className={`px-3 py-1 rounded-lg text-[10px] font-bold ${member.committeeName === 'None' ? 'bg-red-500/10 text-red-500 border border-red-500/20' : 'bg-zinc-800 text-zinc-400 border border-white/5'}`}>
                        {member.committeeName}
                    </div>
                </div>
              </div>
            ))}
          </div>
        </main>
      
      {/* DRAWER COMPONENT */}
      {selectedMember && (
         <div className="fixed inset-0 z-50 flex justify-end">
            <div className="absolute inset-0 bg-black/80 backdrop-blur-md" onClick={() => setSelectedMember(null)} />
            <aside className="relative w-full max-w-md bg-zinc-900 border-l border-white/10 shadow-2xl p-8 flex flex-col animate-in slide-in-from-right duration-300">
               <button onClick={() => setSelectedMember(null)} className="absolute top-6 right-6 p-2 hover:bg-white/10 rounded-full"><X/></button>
               <h3 className="text-3xl font-black uppercase tracking-tighter mb-2">{selectedMember.name}</h3>
               <div className="space-y-6 mt-8 overflow-y-auto">
                  {Object.entries(LEGACY_MAP).map(([key, section]) => (
                    <div key={key}>
                      <h4 className="text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-3 border-b border-white/10 pb-1">{section.title}</h4>
                      {section.forms.map(form => {
                         let isDone = false;
                         const audit = selectedMember.audit;
                         if (form.label.includes("Medical")) isDone = audit.medical;
                         else if (form.label.includes("Liability")) isDone = audit.liability;
                         else if (form.label.includes("Photo")) isDone = audit.photo;
                         else if (form.label.includes("Fee")) isDone = audit.fees;
                         else if (form.label.includes("Pizza")) isDone = audit.pizza;
                         else if (form.label.includes("Ticket")) isDone = audit.ticketsMet;
                         else if (form.label.includes("Bio")) isDone = audit.bio;
                         else if (form.label.includes("Measurements")) isDone = audit.measurements;
                         else if (form.label.includes("Conflict")) isDone = audit.conflicts;
                         else if (form.label.includes("Committee")) isDone = audit.committee;
                         else if (form.label.includes("Parent")) isDone = audit.parentContract;
                         else if (form.label.includes("Student")) isDone = audit.studentContract;
                         
                         return (
                           <div key={form.label} className="flex justify-between py-2 text-sm border-b border-white/5 last:border-0">
                             <span className="text-zinc-400">{form.label}</span>
                             {isDone ? <Check size={16} className="text-emerald-500"/> : <X size={16} className="text-red-500"/>}
                           </div>
                         )
                      })}
                    </div>
                  ))}
               </div>
            </aside>
         </div>
      )}
    </div>
  );
}

// --- HELPER COMPONENTS ---

function RichStatusIcon({ type, member }: any) {
  // Config mapping
  const config = LEGACY_MAP[type as keyof typeof LEGACY_MAP];
  
  const icons = { 
    legal: <ShieldCheck size={12}/>, 
    financial: <CircleDollarSign size={12}/>, 
    production: <ClipboardCheck size={12}/>, 
    family: <Users size={12}/> 
  };
  
  // Status Logic
  let status = 'valid';
  const audit = member.audit;
  
  if ((type === 'legal' && (!audit.medical || !audit.liability)) || 
      (type === 'financial' && (!audit.fees || !audit.pizza)) || 
      (type === 'production' && !audit.bio) ||
      (type === 'family' && !audit.committee)) {
      status = 'emergency';
  }

  const colors = {
    emergency: "text-red-500 bg-red-500/10 border-red-500/40 animate-pulse",
    valid: "text-emerald-500 bg-emerald-500/10 border-emerald-500/30",
  };

  return (
    // 1. CHANGED: 'group' -> 'group/icon' (Named Group)
    // 2. ADDED: 'hover:z-50' (Brings active icon to front so tooltip isn't covered)
    <div className={`group/icon relative p-1.5 rounded-md border transition-all cursor-help hover:z-50 ${colors[status as keyof typeof colors]}`}>
      
      {icons[type as keyof typeof icons]}

      {/* TOOLTIP */}
      {/* 3. CHANGED: 'group-hover:opacity-100' -> 'group-hover/icon:opacity-100' */}
      <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-40 bg-zinc-900 border border-white/10 rounded-xl shadow-2xl opacity-0 group-hover/icon:opacity-100 transition-opacity pointer-events-none z-50 p-3">
        <div className="text-[9px] font-black uppercase text-zinc-500 tracking-widest mb-2 border-b border-white/10 pb-1">
            {config.title}
        </div>
        <div className="space-y-1">
            {config.forms.map((f: any) => (
                <div key={f.label} className="flex justify-between text-[10px] text-zinc-400">
                    <span>{f.label}</span> 
                    {/* Visual fake-check for demo */}
                    <div className={`w-1.5 h-1.5 rounded-full ${status === 'valid' ? 'bg-emerald-500' : 'bg-zinc-700'}`}/>
                </div>
            ))}
        </div>
        {/* Little Arrow */}
        <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-px border-4 border-transparent border-t-zinc-900"></div>
      </div>
    </div>
  );
}

function HeaderStat({ label, value, color, icon }: any) {
  return (
    <div className="flex items-center gap-3">
      <div className="p-2 bg-white/5 rounded-lg text-zinc-500 border border-white/5">{icon}</div>
      <div>
        <div className={`text-xl font-black leading-none ${color}`}>{value}</div>
        <div className="text-[9px] font-black uppercase text-zinc-600 tracking-wider">{label}</div>
      </div>
    </div>
  );
}