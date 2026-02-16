"use client";

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import { 
  Search, User, Users, X, UserCog,
  ShieldCheck, ClipboardCheck, CircleDollarSign,
  Check, AlertTriangle
} from 'lucide-react';

// --- 🗺️ CONFIGURATION ---
const LEGACY_MAP = {
  legal: { 
    title: "Legal & Safety", 
    forms: [
      { id: "medical", label: "Medical Release", key: "Medical" }, 
      { id: "liability", label: "Liability Waiver", key: "Liability" }, 
      { id: "photo", label: "Photo Release", key: "Photo" }
    ] 
  },
  financial: { 
    title: "Financials", 
    forms: [
      { id: "fee", label: "Production Fee", key: "Fee" }, 
      { id: "tickets", label: "Ticket Quota", key: "Tickets" } 
    ] 
  },
  production: { 
    title: "Production Ops", 
    forms: [
      { id: "bio", label: "Performer Bio", key: "Bio" }, 
      { id: "measurements", label: "Measurements", key: "Measurements" }
    ] 
  },
  family: { 
    title: "Family Commitment", 
    forms: [
      { id: "committee", label: "Committee Prefs", key: "Committee" }, 
    ] 
  }
};

export default function StaffClient({ productionId, productionTitle, assignments, people, compliance }: any) {
  const [filter, setFilter] = useState("");
  const [selectedMember, setSelectedMember] = useState<any>(null);
  
  // --- 🧠 REAL DATA ENGINE ---
  const roster = useMemo(() => {
    if (!Array.isArray(assignments)) return [];

    // 1. Create Lookup Maps
    const complianceMap = new Map();
    if (Array.isArray(compliance)) {
        compliance.forEach((row: any) => complianceMap.set(row.id.toString(), row));
    }
    
    // Helper to find headshot in raw Baserow data
    const getHeadshot = (row: any) => {
        if (!row) return null;
        const fileArr = row["Headshot"] || row["headshot"] || row["Avatar"] || row["Profile Picture"];
        const fileArrById = row["field_5776"]; 
        
        const target = fileArr || fileArrById;
        if (Array.isArray(target) && target.length > 0) return target[0].url;
        return null;
    };

    const uniqueActors = new Map();

    assignments.forEach((a: any) => {
      const personId = a.personId?.toString();
      if (!personId) return;

      if (!uniqueActors.has(personId)) {
        // --- 🔍 DATA LOOKUP ---
        const rawPersonData = complianceMap.get(personId) || {};
        const peopleListMatch = people.find((p: any) => p.id.toString() === personId);
        
        const hasSignature = (keyword: string) => {
           const docs = rawPersonData["Signed Doc Types"] || []; 
           if (!Array.isArray(docs)) return false;
           return docs.some((d: any) => d.value && d.value.includes(keyword));
        };

        const hasBio = () => {
           const bio = rawPersonData["Original Bio"]; 
           if (Array.isArray(bio) && bio.length > 0) return true;
           if (typeof bio === 'string' && bio.length > 10) return true;
           return false;
        };

        const hasMeasurements = () => {
            const m = rawPersonData["Measurements"];
            return Array.isArray(m) && m.length > 0;
        };
        
        const avatarUrl = getHeadshot(rawPersonData) || getHeadshot(peopleListMatch);

        uniqueActors.set(personId, {
          id: personId,
          name: a.personName || "Unknown Actor",
          roles: [a.name],
          avatar: avatarUrl,
          
          // --- 🏗️ AUDIT LOGIC ---
          audit: {
            medical: hasSignature("Medical"),
            liability: hasSignature("Liability"),
            photo: hasSignature("Photo"),
            fees: rawPersonData["Paid Fees"] === true,
            ticketsMet: false, 
            bio: hasBio(),
            measurements: hasMeasurements(),
            committee: Array.isArray(rawPersonData["Form Committee Preferences"]) && rawPersonData["Form Committee Preferences"].length > 0
          },
          ticketsSold: 0, 
          committeeName: "Unassigned", 
        });
      } else {
        const existing = uniqueActors.get(personId);
        if (!existing.roles.includes(a.name)) {
            existing.roles.push(a.name);
        }
      }
    });

    return Array.from(uniqueActors.values()).sort((a: any, b: any) => a.name.localeCompare(b.name));
  }, [assignments, people, compliance]);

  // Stats
  const stats = useMemo(() => {
    const total = roster.length || 1;
    const calc = (fn: (p: any) => boolean) => Math.round((roster.filter(fn).length / total) * 100);
    return {
      count: roster.length,
      legal: calc(p => p.audit.medical && p.audit.liability),
      prod: calc(p => p.audit.bio && p.audit.measurements),
      money: calc(p => p.audit.fees),
    };
  }, [roster]);

  return (
    <div className="flex flex-col h-full bg-zinc-950 text-white font-sans">
       
       {/* HEADER */}
       <header className="sticky top-0 z-20 h-20 border-b border-white/10 flex items-center justify-between px-8 bg-zinc-950/80 backdrop-blur-xl shrink-0">
           <div className="flex flex-col justify-center">
             <h1 className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500 mb-1">Production Dashboard</h1>
             <h2 className="text-xl font-bold tracking-tighter truncate max-w-[300px] text-zinc-100">{productionTitle}</h2>
           </div>
           
           <div className="hidden xl:flex items-center gap-8">
              
              {/* 🟢 NEW NAVIGATION BUTTONS */}
              <div className="flex items-center gap-3 border-r border-white/10 pr-8 mr-2">
                <Link 
                  href={`/production/${productionId}/cast`}
                  className="flex items-center gap-3 px-4 py-2 bg-white/5 hover:bg-white/10 rounded-xl border border-white/5 transition-all group cursor-pointer"
                >
                   <Users size={16} className="text-zinc-400 group-hover:text-white transition-colors"/>
                   <div className="flex flex-col">
                      <span className="text-lg font-black leading-none text-white">{stats.count}</span>
                      <span className="text-[9px] font-bold uppercase text-zinc-500 tracking-wider group-hover:text-zinc-300">Cast List</span>
                   </div>
                </Link>

                <Link 
                  href={`/production/${productionId}/team`}
                  className="flex items-center gap-3 px-4 py-2 bg-white/5 hover:bg-white/10 rounded-xl border border-white/5 transition-all group cursor-pointer"
                >
                   <UserCog size={16} className="text-zinc-400 group-hover:text-cyan-400 transition-colors"/>
                   <div className="flex flex-col">
                      <span className="text-lg font-black leading-none text-white">Team</span>
                      <span className="text-[9px] font-bold uppercase text-zinc-500 tracking-wider group-hover:text-zinc-300">Directory</span>
                   </div>
                </Link>
              </div>

              {/* COMPLIANCE STATS */}
              <HeaderStat label="Legal Compliance" value={`${stats.legal}%`} color={stats.legal === 100 ? "text-emerald-400" : "text-zinc-300"} icon={<ShieldCheck size={14}/>} />
              <HeaderStat label="Ops Readiness" value={`${stats.prod}%`} color="text-blue-400" icon={<ClipboardCheck size={14}/>} />
              <HeaderStat label="Fees Paid" value={`${stats.money}%`} color="text-amber-400" icon={<CircleDollarSign size={14}/>} />
           </div>

           <div className="relative w-64 ml-8">
             <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500"/>
             <input 
               onChange={(e) => setFilter(e.target.value)} 
               placeholder="Search actor..." 
               className="w-full bg-black/40 border border-white/10 rounded-xl pl-10 pr-4 py-2 text-sm text-zinc-200 outline-none focus:border-blue-500 focus:bg-zinc-900 transition-all placeholder:text-zinc-600" 
             />
           </div>
       </header>

       {/* MAIN ROSTER GRID */}
       <main className="flex-1 overflow-y-auto custom-scrollbar p-8 bg-[radial-gradient(circle_at_20%_20%,rgba(24,24,27,1)_0%,rgba(9,9,11,1)_100%)]">
         {roster.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-zinc-500">
               <Users size={48} className="mb-4 opacity-20" />
               <p>No cast members found in this production.</p>
               <p className="text-xs mt-2">Check the &quot;Assignments&quot; table in Baserow.</p>
            </div>
         ) : (
           <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4 gap-6 pb-20">
             {roster.filter((p: any) => p.name.toLowerCase().includes(filter.toLowerCase())).map((member: any) => (
               <div 
                 key={member.id} 
                 onClick={() => setSelectedMember(member)}
                 className="group bg-zinc-900/40 border border-white/5 rounded-2xl p-5 hover:border-white/20 hover:bg-zinc-900/60 transition-all cursor-pointer relative hover:z-10"
               >
                 {/* Status Bar Top */}
                 <div className="absolute top-0 left-0 w-full h-1 bg-white/5 rounded-t-2xl">
                   <div 
                       className={`h-full transition-all duration-1000 rounded-tl-2xl ${member.audit.medical && member.audit.liability ? 'bg-emerald-500' : 'bg-red-500'} ${member.audit.medical && member.audit.liability ? 'rounded-tr-2xl' : ''}`} 
                       style={{ width: member.audit.medical && member.audit.liability ? '100%' : '50%' }} 
                   />
                 </div>

                 <div className="flex justify-between items-start mb-4">
                   <div className="flex gap-4 min-w-0">
                     {/* Avatar */}
                     <div className="w-14 h-14 rounded-2xl bg-zinc-800 border border-white/5 overflow-hidden shadow-inner shrink-0 relative">
                       {member.avatar ? (
                           <img src={member.avatar} className="object-cover w-full h-full grayscale group-hover:grayscale-0 transition-all duration-500" />
                       ) : (
                           <div className="w-full h-full flex items-center justify-center text-zinc-700">
                               <User size={24}/>
                           </div>
                       )}
                     </div>

                     {/* Name & Role */}
                     <div className="min-w-0 pt-1">
                       <h3 className="font-bold text-lg text-zinc-100 truncate pr-2 group-hover:text-white transition-colors">{member.name}</h3>
                       <p className="text-[10px] text-zinc-500 font-black uppercase tracking-[0.1em] truncate">
                           {member.roles[0]} {member.roles.length > 1 && <span className="opacity-50">+{member.roles.length - 1}</span>}
                       </p>
                     </div>
                   </div>

                   {/* Quick Status Icons */}
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

                 {/* Footer Info */}
                 <div className="mt-2 flex justify-between items-end border-t border-white/5 pt-4">
                     <div className="flex flex-col">
                       <span className="text-[8px] font-black text-zinc-600 uppercase mb-1">Status</span>
                       <div className="flex gap-1">
                           {member.audit.medical ? (
                               <span className="text-[10px] text-emerald-500 bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/20">Cleared</span>
                           ) : (
                               <span className="text-[10px] text-red-500 bg-red-500/10 px-1.5 py-0.5 rounded border border-red-500/20">Missing Docs</span>
                           )}
                       </div>
                     </div>
                     
                     {member.audit.committee ? (
                        <div className="px-3 py-1 rounded-lg text-[10px] font-bold bg-zinc-800 text-zinc-400 border border-white/5">
                           Committee Set
                        </div>
                     ) : (
                        <div className="px-3 py-1 rounded-lg text-[10px] font-bold bg-red-500/10 text-red-500 border border-red-500/20 animate-pulse">
                           No Committee
                        </div>
                     )}
                 </div>
               </div>
             ))}
           </div>
         )}
       </main>
     
      {/* 🟢 DRAWER COMPONENT */}
      {selectedMember && (
         <div className="fixed inset-0 z-50 flex justify-end">
            <div className="absolute inset-0 bg-black/80 backdrop-blur-md animate-in fade-in duration-300" onClick={() => setSelectedMember(null)} />
            <aside className="relative w-full max-w-md bg-zinc-900 border-l border-white/10 shadow-2xl p-8 flex flex-col animate-in slide-in-from-right duration-300">
               <button onClick={() => setSelectedMember(null)} className="absolute top-6 right-6 p-2 hover:bg-white/10 rounded-full text-zinc-400 hover:text-white transition-colors"><X/></button>
               
               <div className="flex items-center gap-4 mb-8">
                   <div className="w-16 h-16 rounded-2xl bg-zinc-800 overflow-hidden shadow-lg border border-white/10">
                       {selectedMember.avatar ? (
                           <img src={selectedMember.avatar} className="w-full h-full object-cover"/>
                       ) : <div className="w-full h-full flex items-center justify-center text-zinc-600"><User size={24}/></div>}
                   </div>
                   <div>
                       <h3 className="text-2xl font-black uppercase tracking-tighter text-white">{selectedMember.name}</h3>
                       <div className="flex flex-wrap gap-2 mt-2">
                           {selectedMember.roles.map((r: string) => (
                               <span key={r} className="text-[10px] font-bold bg-blue-600/20 text-blue-400 border border-blue-500/30 px-2 py-0.5 rounded-full uppercase tracking-wider">
                                   {r}
                               </span>
                           ))}
                       </div>
                   </div>
               </div>

               <div className="space-y-8 overflow-y-auto custom-scrollbar pr-2">
                  {Object.entries(LEGACY_MAP).map(([key, section]) => (
                    <div key={key}>
                      <h4 className="text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-3 border-b border-white/10 pb-1 flex items-center gap-2">
                          {section.title}
                      </h4>
                      <div className="bg-white/5 rounded-xl overflow-hidden border border-white/5">
                          {section.forms.map((form) => {
                             const isDone = selectedMember.audit[form.id as keyof typeof selectedMember.audit];
                             return (
                               <div key={form.label} className="flex justify-between items-center px-4 py-3 border-b border-white/5 last:border-0 hover:bg-white/5 transition-colors">
                                 <span className="text-sm text-zinc-300 font-medium">{form.label}</span>
                                 {isDone ? (
                                     <div className="flex items-center gap-2 text-emerald-500">
                                         <span className="text-[10px] font-bold uppercase tracking-wider">Complete</span>
                                         <Check size={16}/>
                                     </div>
                                 ) : (
                                     <div className="flex items-center gap-2 text-red-500">
                                         <span className="text-[10px] font-bold uppercase tracking-wider">Missing</span>
                                         <AlertTriangle size={16}/>
                                     </div>
                                 )}
                               </div>
                             )
                          })}
                      </div>
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
      (type === 'financial' && !audit.fees) || 
      (type === 'production' && (!audit.bio || !audit.measurements)) ||
      (type === 'family' && !audit.committee)) {
      status = 'emergency';
  }

  const colors = {
    emergency: "text-red-500 bg-red-500/10 border-red-500/40",
    valid: "text-emerald-500 bg-emerald-500/10 border-emerald-500/30",
  };

  return (
    <div className={`group/icon relative p-1.5 rounded-md border transition-all cursor-help hover:z-50 hover:scale-110 ${colors[status as keyof typeof colors]}`}>
      
      {icons[type as keyof typeof icons]}

      {/* TOOLTIP: FLIPPED TO BOTTOM */}
      <div className="absolute top-full left-1/2 -translate-x-1/2 mt-2 w-48 bg-zinc-950/95 backdrop-blur-xl border border-white/10 rounded-xl shadow-[0_10px_40px_-10px_rgba(0,0,0,1)] opacity-0 group-hover/icon:opacity-100 transition-opacity pointer-events-none z-50 p-3">
        
        {/* Little Arrow pointing UP */}
        <div className="absolute bottom-full left-1/2 -translate-x-1/2 -mb-px border-4 border-transparent border-b-zinc-950/95"></div>

        <div className="text-[9px] font-black uppercase text-zinc-500 tracking-widest mb-2 border-b border-white/10 pb-1">
            {config.title}
        </div>
        <div className="space-y-1.5">
            {config.forms.map((f: any) => {
                const isDone = member.audit[f.id];
                return (
                    <div key={f.label} className="flex justify-between items-center text-[10px] text-zinc-400">
                        <span>{f.label}</span> 
                        <div className={`w-1.5 h-1.5 rounded-full ${isDone ? 'bg-emerald-500 shadow-[0_0_5px_rgba(16,185,129,0.8)]' : 'bg-red-500 shadow-[0_0_5px_rgba(239,68,68,0.8)]'}`}/>
                    </div>
                )
            })}
        </div>
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
        <div className="text-[9px] font-black uppercase text-zinc-600 tracking-wider mt-0.5">{label}</div>
      </div>
    </div>
  );
}