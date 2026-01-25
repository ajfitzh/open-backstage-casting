"use client";

import React, { useState, useMemo } from 'react';
import { 
  Search, User, Users, Ticket, 
  ShieldAlert, Scissors, Receipt, MessageSquare, X,
  FileText, Star, ShieldCheck, ClipboardCheck, CircleDollarSign,
  Info, Check, AlertCircle
} from 'lucide-react';

// --- 🗺️ THE ROSETTA STONE: Mapping Old Forms to New Data ---
const LEGACY_MAP = {
  legal: {
    title: "Legal & Safety",
    forms: [
      { id: "Form B", label: "Medical Release" },
      { id: "Form B", label: "Liability Waiver" },
      { id: "Form B", label: "Photo Release" }
    ]
  },
  financial: {
    title: "Financials",
    forms: [
      { id: "Fee", label: "Production Fee" },
      { id: "Cash", label: "$5 Pizza Money" },
      { id: "Tix", label: "Ticket Quota (20)" }
    ]
  },
  production: {
    title: "Production Ops",
    forms: [
      { id: "Form K", label: "Performer Bio" },
      { id: "Form F", label: "Measurements" },
      { id: "Form G", label: "Conflict Sheet" }
    ]
  },
  family: {
    title: "Family Commitment",
    forms: [
      { id: "Form H", label: "Committee Selection" },
      { id: "Form I", label: "Parent Character Contract" },
      { id: "Form A", label: "Student Character Contract" }
    ]
  }
};

export default function StaffClient({ productionTitle, assignments, people }) {
  const [filter, setFilter] = useState("");
  const [selectedMember, setSelectedMember] = useState(null);

  // --- 🧠 DYNAMIC DATA ENGINE ---
  const roster = useMemo(() => {
    if (!Array.isArray(assignments)) return [];
    const personMap = new Map();

    assignments.forEach((a) => {
      const personId = a["Person"]?.[0]?.id;
      if (!personId || personMap.has(personId)) return;

      const personName = a["Person"]?.[0]?.value || "Unknown";
      const contact = people.find((p) => p.id === personId);
      
      // Deterministic Mock Data based on ID
      const isEven = personId % 2 === 0;
      const isThird = personId % 3 === 0;
      const tickets = (personId * 7) % 25;

      personMap.set(personId, {
        id: personId,
        name: personName,
        roles: [a["Performance Identity"]?.[0]?.value || "Chorus"],
        avatar: contact?.["Headshot"]?.[0]?.url,
        // The Audit Object tracks the granular "Truth"
        audit: {
          // Legal
          medical: isEven, liability: isEven, photo: isEven,
          // Financial
          fees: personId % 5 !== 0, pizza: personId % 7 !== 0, ticketsMet: tickets >= 20,
          // Production
          bio: isThird, measurements: isThird, conflicts: personId % 4 !== 0,
          // Family
          committee: isEven, parentContract: isEven, studentContract: isThird
        },
        ticketsSold: tickets,
        ticketGoal: 20,
        committeeName: isEven ? "Costumes" : isThird ? "Props" : "None",
      });
    });

    return Array.from(personMap.values()).sort((a, b) => a.name.localeCompare(b.name));
  }, [assignments, people]);

  // --- 📊 STATS CALCULATOR ---
  const stats = useMemo(() => {
    const total = roster.length || 1;
    const calc = (fn) => Math.round((roster.filter(fn).length / total) * 100);
    
    return {
      count: roster.length,
      legal: calc(p => p.audit.medical && p.audit.liability),
      prod: calc(p => p.audit.bio && p.audit.measurements && p.audit.conflicts),
      money: calc(p => p.audit.fees && p.audit.pizza),
    };
  }, [roster]);

  return (
    <div className="flex h-screen bg-zinc-950 text-white font-sans overflow-hidden">
      <div className="flex-1 flex flex-col min-w-0">
        
        {/* HEADER */}
        <header className="h-20 border-b border-white/10 flex items-center justify-between px-8 bg-zinc-900/50 backdrop-blur-xl shrink-0 z-30">
            <div className="flex flex-col border-r border-white/10 pr-8 mr-8">
              <h1 className="text-[10px] font-black uppercase tracking-[0.4em] text-blue-500 mb-1">Open Backstage</h1>
              <h2 className="text-xl font-bold tracking-tighter truncate max-w-[220px]">{productionTitle}</h2>
            </div>
            
            <div className="hidden xl:flex items-center gap-10 flex-1">
               <HeaderStat label="Cast" value={stats.count} sub="Total" icon={<Users size={14}/>} />
               <HeaderStat label="Legal" value={`${stats.legal}%`} sub="Form B" color="text-emerald-400" icon={<ShieldCheck size={14}/>} />
               <HeaderStat label="Production" value={`${stats.prod}%`} sub="Form K/F/G" color="text-blue-400" icon={<ClipboardCheck size={14}/>} />
               <HeaderStat label="Financials" value={`${stats.money}%`} sub="Fees + Pizza" color="text-amber-400" icon={<CircleDollarSign size={14}/>} />
            </div>

            <div className="relative w-64 ml-auto">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500"/>
              <input onChange={(e) => setFilter(e.target.value)} placeholder="Search actor..." className="w-full bg-black/40 border border-white/10 rounded-xl pl-10 pr-4 py-2 text-sm outline-none focus:border-blue-500" />
            </div>
        </header>

        {/* MAIN GRID */}
        <main className="flex-1 overflow-y-auto p-8 custom-scrollbar bg-[radial-gradient(circle_at_20%_20%,rgba(24,24,27,1)_0%,rgba(9,9,11,1)_100%)]">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4 gap-6">
            {roster.filter(p => p.name.toLowerCase().includes(filter.toLowerCase())).map((member) => (
              <div 
                key={member.id} 
                onClick={() => setSelectedMember(member)}
                className="group bg-zinc-900/40 border border-white/5 rounded-2xl p-5 hover:border-white/20 transition-all cursor-pointer relative overflow-visible"
              >
                {/* TICKET BAR */}
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

                  {/* --- RICH TOOLTIP ICONS --- */}
                  <div className="flex flex-col gap-1.5 shrink-0 z-20">
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
      </div>
      
      {/* DRAWER COMPONENT (Simulated) */}
      {selectedMember && (
         <div className="fixed inset-0 z-50 flex justify-end">
            <div className="absolute inset-0 bg-black/80 backdrop-blur-md" onClick={() => setSelectedMember(null)} />
            <aside className="relative w-full max-w-md bg-zinc-900 border-l border-white/10 shadow-2xl p-8 flex flex-col animate-in slide-in-from-right duration-300">
               <button onClick={() => setSelectedMember(null)} className="absolute top-6 right-6 p-2 hover:bg-white/10 rounded-full"><X/></button>
               <h3 className="text-3xl font-black uppercase tracking-tighter mb-2">{selectedMember.name}</h3>
               <div className="space-y-6 mt-8">
                  {/* Reusing logic to show expanded list */}
                  {Object.entries(LEGACY_MAP).map(([key, section]) => (
                    <div key={key}>
                      <h4 className="text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-3 border-b border-white/10 pb-1">{section.title}</h4>
                      {section.forms.map(form => {
                         // Simple logic mapping for demo
                         let isDone = false;
                         if (form.label.includes("Medical")) isDone = selectedMember.audit.medical;
                         else if (form.label.includes("Liability")) isDone = selectedMember.audit.liability;
                         else if (form.label.includes("Photo")) isDone = selectedMember.audit.photo;
                         else if (form.label.includes("Bio")) isDone = selectedMember.audit.bio;
                         else if (form.label.includes("Measurements")) isDone = selectedMember.audit.measurements;
                         else if (form.label.includes("Conflict")) isDone = selectedMember.audit.conflicts;
                         else if (form.label.includes("Fee")) isDone = selectedMember.audit.fees;
                         else if (form.label.includes("Pizza")) isDone = selectedMember.audit.pizza;
                         else if (form.label.includes("Ticket")) isDone = selectedMember.audit.ticketsMet;
                         else if (form.label.includes("Committee")) isDone = selectedMember.audit.committee;
                         else isDone = true; // Fallback

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

// --- 🪄 THE MAGIC TOOLTIP COMPONENT ---
function RichStatusIcon({ type, member }) {
  const config = LEGACY_MAP[type];
  
  // Icon Mapping
  const icons = {
    legal: <ShieldCheck size={12} />,
    financial: <CircleDollarSign size={12} />,
    production: <ClipboardCheck size={12} />,
    family: <Users size={12} />
  };

  // Determine Overall Status for color
  let status = 'valid'; // default
  // Simple logic to detect if ANY item in this category is missing
  const audit = member.audit;
  let missingCount = 0;
  
  if (type === 'legal') { if(!audit.medical || !audit.liability) missingCount++; }
  if (type === 'financial') { if(!audit.fees || !audit.pizza) missingCount++; }
  if (type === 'production') { if(!audit.bio || !audit.measurements) missingCount++; }
  if (type === 'family') { if(!audit.committee) missingCount++; }

  if (missingCount > 0) status = 'emergency';

  const colors = {
    emergency: "text-red-500 bg-red-500/10 border-red-500/40 animate-pulse",
    valid: "text-emerald-500 bg-emerald-500/10 border-emerald-500/30",
  };

  return (
    <div className={`group relative p-1.5 rounded-md border transition-all duration-300 cursor-help ${colors[status]}`}>
      {icons[type]}

      {/* --- HOVER TOOLTIP (THE TRAINING WHEELS) --- */}
      <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-48 bg-zinc-900 border border-white/10 rounded-xl shadow-2xl opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50 p-3">
        <div className="text-[10px] font-black uppercase text-zinc-500 tracking-widest mb-2 border-b border-white/10 pb-1">
          {config.title}
        </div>
        <div className="space-y-1.5">
          {config.forms.map((form) => {
             // Logic to check individual status for tooltip
             let isDone = false;
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
               <div key={form.label} className="flex items-center justify-between text-[10px]">
                 <span className={isDone ? "text-zinc-400" : "text-red-400"}>{form.label}</span>
                 {isDone ? <Check size={10} className="text-emerald-500"/> : <X size={10} className="text-red-500"/>}
               </div>
             )
          })}
        </div>
        
        {/* The Arrow */}
        <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-1 border-4 border-transparent border-t-zinc-900"></div>
      </div>
    </div>
  );
}

function HeaderStat({ label, value, sub, color = "text-white", icon }) {
  return (
    <div className="flex items-center gap-4">
      <div className="p-3 bg-white/5 rounded-2xl text-zinc-500 border border-white/5 shadow-inner">{icon}</div>
      <div>
        <div className="flex items-baseline gap-2 leading-none mb-1">
          <span className={`text-2xl font-black tracking-tighter ${color}`}>{value}</span>
          <span className="text-[10px] font-black uppercase text-zinc-600 tracking-wider">{label}</span>
        </div>
        <div className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest">{sub}</div>
      </div>
    </div>
  );
}