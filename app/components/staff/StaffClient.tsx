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

  // --- 🧠 DATA AUGMENTOR (Enhanced for Audit) ---
  const roster = useMemo(() => {
    if (!Array.isArray(assignments)) return [];
    const personMap = new Map();

    assignments.forEach((a) => {
      const personId = a["Person"]?.[0]?.id;
      const personName = a["Person"]?.[0]?.value || "Unknown Actor";
      const roleName = a["Performance Identity"]?.[0]?.value || "Chorus";

      if (!personId || personMap.has(personId)) {
        if (personId) personMap.get(personId).roles.push(roleName);
        return;
      }

      const contact = people.find((p) => p.id === personId);
      const isEven = personId % 2 === 0;
      const isThird = personId % 3 === 0;

      personMap.set(personId, {
        id: personId,
        name: personName,
        roles: [roleName],
        email: contact?.["Email"] || "",
        phone: contact?.["Phone Number"] || "",
        avatar: contact?.["Headshot"]?.[0]?.url,
        // Mocking the specific "Legacy Forms" for the audit view
        audit: {
          medical: isEven, // Form B
          liability: isEven, // Form B
          photoRelease: isEven, // Form B
          studentCharacter: isThird, // Form A
          parentCharacter: isEven, // Form I
          conflicts: personId % 4 !== 0, // Form G
          bio: isThird, // Form K
          measurements: isThird, // Form F
        },
        parentName: `Parent of ${personName.split(' ')[0]}`,
        committee: isThird ? "Props" : isEven ? "Costumes" : "None",
        ticketsSold: (personId * 7) % 25,
        ticketGoal: 20,
        promoCode: `${personName.substring(0, 3).toUpperCase()}${personId}`,
        absences: personId % 4,
      });
    });

    return Array.from(personMap.values()).sort((a, b) => a.name.localeCompare(b.name));
  }, [assignments, people]);

  const filteredRoster = roster.filter(p => 
    p.name.toLowerCase().includes(filter.toLowerCase()) || 
    p.roles.some(r => r.toLowerCase().includes(filter.toLowerCase()))
  );

  return (
    <div className="flex h-screen bg-zinc-950 text-white font-sans overflow-hidden">
      <div className="flex-1 flex flex-col min-w-0">
        <header className="h-20 border-b border-white/10 flex items-center justify-between px-4 md:px-8 bg-zinc-900/80 backdrop-blur-xl shrink-0 z-30">
            <div className="flex flex-col">
              <h1 className="text-[8px] md:text-[10px] font-black uppercase tracking-[0.3em] text-blue-500">Open Backstage</h1>
              <h2 className="text-sm md:text-xl font-bold truncate max-w-[150px] md:max-w-none">{productionTitle}</h2>
            </div>
            <div className="relative flex-1 max-w-md mx-4 md:mx-12">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500"/>
              <input 
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
                placeholder="Find actor..." 
                className="w-full bg-black/40 border border-white/10 rounded-xl pl-10 pr-4 py-2 text-sm outline-none focus:border-blue-500 transition-all"
              />
            </div>
            <div className="hidden lg:flex gap-6 shrink-0">
               <StatMini label="Cast Size" value={roster.length} color="text-blue-400" />
               <StatMini label="Compliance" value="82%" color="text-emerald-500" />
            </div>
        </header>

        <main className="flex-1 overflow-y-auto p-4 md:p-8">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4 gap-4 md:gap-6">
            {filteredRoster.map((member) => (
              <div 
                key={member.id} 
                onClick={() => setSelectedMember(member)}
                className="group relative bg-zinc-900 border border-white/5 rounded-2xl flex flex-col transition-all active:scale-95 cursor-pointer hover:border-white/20 hover:shadow-2xl overflow-hidden"
              >
                <div className="absolute top-0 left-0 w-full h-1 bg-white/5">
                  <div className={`h-full transition-all duration-1000 ${member.ticketsSold >= member.ticketGoal ? 'bg-amber-400 shadow-[0_0_15px_rgba(251,191,36,0.6)]' : 'bg-blue-600'}`} style={{ width: `${Math.min((member.ticketsSold / member.ticketGoal) * 100, 100)}%` }} />
                </div>
                <div className="p-4 md:p-5">
                  <div className="flex justify-between items-start mb-4">
                    <div className="flex gap-3">
                      <div className="w-12 h-12 rounded-xl bg-zinc-800 border border-white/10 overflow-hidden shrink-0">
                        {member.avatar ? <img src={member.avatar} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center text-zinc-700"><User size={24}/></div>}
                      </div>
                      <div className="min-w-0">
                        <h3 className="font-bold text-base text-zinc-100 truncate">{member.name}</h3>
                        <p className="text-[9px] text-blue-400 font-black uppercase tracking-widest truncate">{member.roles[0]}</p>
                      </div>
                    </div>
                    <div className="flex flex-col gap-1 items-end">
                       <div className="flex gap-1 bg-black/40 p-1 rounded-lg">
                          <StatusIcon type="legal" status={member.audit.medical ? 'valid' : 'emergency'} />
                          <StatusIcon type="financial" status={'valid'} />
                       </div>
                    </div>
                  </div>
                  <div className="bg-black/40 rounded-xl border border-white/5 p-3 text-[10px]">
                     <div className="flex justify-between text-zinc-500 mb-2">
                        <span>Parent: {member.parentName}</span>
                        <span className={member.committee === 'None' ? 'text-red-500' : 'text-zinc-300'}>{member.committee}</span>
                     </div>
                     <div className="flex justify-between items-end">
                        <span className="text-blue-300 font-mono">{member.promoCode}</span>
                        <span className="font-bold">{member.ticketsSold} / 20 sold</span>
                     </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </main>
      </div>

      {/* --- SIDE DETAIL DRAWER (Mobile Friendly) --- */}
      {selectedMember && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setSelectedMember(null)} />
          <aside className="relative w-full max-w-md bg-zinc-900 border-l border-white/10 shadow-2xl flex flex-col animate-in slide-in-from-right duration-300">
            <div className="p-6 border-b border-white/10 flex items-center justify-between">
              <h2 className="text-xl font-black uppercase tracking-tighter">Compliance Audit</h2>
              <button onClick={() => setSelectedMember(null)} className="p-2 hover:bg-white/10 rounded-full transition-colors"><X/></button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-6 space-y-8">
              {/* Profile Header */}
              <div className="flex items-center gap-4">
                <div className="w-20 h-20 rounded-2xl bg-zinc-800 border border-white/10 overflow-hidden shrink-0">
                  {selectedMember.avatar ? <img src={selectedMember.avatar} className="w-full h-full object-cover" /> : <User size={40} className="m-5 text-zinc-700"/>}
                </div>
                <div>
                  <h3 className="text-2xl font-bold">{selectedMember.name}</h3>
                  <p className="text-blue-400 font-black uppercase tracking-widest text-xs">{selectedMember.roles.join(" / ")}</p>
                </div>
              </div>

              {/* AUDIT CHECKLIST */}
              <div className="space-y-4">
                <h4 className="text-[10px] font-black text-zinc-500 uppercase tracking-[0.2em] border-b border-white/5 pb-2">Required Paperwork</h4>
                <div className="grid gap-2">
                  <AuditRow label="Medical Consent (Form B)" active={selectedMember.audit.medical} icon={<ShieldCheck size={14}/>} />
                  <AuditRow label="Liability Waiver (Form B)" active={selectedMember.audit.liability} icon={<ShieldCheck size={14}/>} />
                  <AuditRow label="Photo/Media Release (Form B)" active={selectedMember.audit.photoRelease} icon={<ShieldCheck size={14}/>} />
                  <AuditRow label="Student Commitment (Form A)" active={selectedMember.audit.studentCharacter} icon={<Heart size={14}/>} />
                  <AuditRow label="Parent Commitment (Form I)" active={selectedMember.audit.parentCharacter} icon={<Users size={14}/>} />
                  <AuditRow label="Conflict Sheet (Form G)" active={selectedMember.audit.conflicts} icon={<FileText size={14}/>} />
                  <AuditRow label="Performer Bio (Form K)" active={selectedMember.audit.bio} icon={<MessageSquare size={14}/>} color="text-blue-400" />
                  <AuditRow label="Costume Stats (Form F)" active={selectedMember.audit.measurements} icon={<Scissors size={14}/>} color="text-teal-400" />
                </div>
              </div>

              {/* Action Buttons */}
              <div className="pt-6 grid grid-cols-2 gap-3">
                <button className="flex items-center justify-center gap-2 bg-zinc-100 text-black font-bold py-3 rounded-xl hover:bg-white transition-colors text-sm">
                  <Mail size={16}/> Email Parent
                </button>
                <button className="flex items-center justify-center gap-2 bg-zinc-800 text-white font-bold py-3 rounded-xl hover:bg-zinc-700 transition-colors text-sm">
                  <Phone size={16}/> Call
                </button>
              </div>
            </div>
          </aside>
        </div>
      )}
    </div>
  );
}

// --- NEW COMPONENT: AUDIT ROW ---
function AuditRow({ label, active, icon, color = "text-emerald-500" }) {
  return (
    <div className={`flex items-center justify-between p-3 rounded-xl border ${active ? 'bg-emerald-500/5 border-emerald-500/10' : 'bg-red-500/5 border-red-500/10'}`}>
      <div className="flex items-center gap-3">
        <div className={active ? color : 'text-red-500'}>{icon}</div>
        <span className={`text-xs font-medium ${active ? 'text-zinc-200' : 'text-red-200'}`}>{label}</span>
      </div>
      {active ? <CheckCircle2 size={16} className="text-emerald-500"/> : <AlertTriangle size={16} className="text-red-500 animate-pulse"/>}
    </div>
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
  const icons = { legal: <ShieldAlert size={12} />, financial: <Receipt size={12} /> };
  const colors = { emergency: "text-red-500 bg-red-500/10 border-red-500/30 animate-pulse", valid: "text-emerald-500 bg-emerald-500/10 border-emerald-500/20" };
  return <div className={`p-1 rounded-md border ${colors[status]}`}>{icons[type]}</div>;
}

function IconButton({ icon }) {
  return <button className="p-2 hover:bg-white/10 rounded-lg text-zinc-500 transition-all">{icon}</button>;
}