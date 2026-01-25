"use client";

import React, { useState, useMemo } from 'react';
import { 
  Mail, Phone, Search, 
  CheckCircle2, XCircle, 
  User, FileText, DollarSign, Ruler, AlertTriangle
} from 'lucide-react';

export default function StaffClient({ productionTitle, assignments, people, complianceData }: any) {
  const [filter, setFilter] = useState("");
  const [filterMode, setFilterMode] = useState<'All' | 'Issues'>('All');

  // --- 🧠 MERGE DATA STREAMS ---
  const roster = useMemo(() => {
      // 1. Index Compliance by Name (safest link for now)
      const complianceMap = new Map();
      if (Array.isArray(complianceData)) {
          complianceData.forEach((c: any) => {
              // Normalize name to lowercase for fuzzy matching if needed, 
              // but exact match is usually fine if Baserow is the source for both.
              if(c.performerName) complianceMap.set(c.performerName, c);
          });
      }

      // 2. Build the Master Roster from Assignments
      const personMap = new Map();

      if (Array.isArray(assignments)) {
        assignments.forEach((a: any) => {
            const personId = a["Person"]?.[0]?.id;
            const personName = a["Person"]?.[0]?.value || "Unknown";
            const roleName = a["Performance Identity"]?.[0]?.value || "Unassigned";

            if (!personId) return;

            if (!personMap.has(personId)) {
                // Find Contact Info from People array
                const contact = people.find((p: any) => p.id === personId);
                // Find Compliance Info
                const comp = complianceMap.get(personName) || {};

                personMap.set(personId, {
                    id: personId,
                    name: personName,
                    roles: [roleName],
                    email: contact ? contact["Email"] || contact["Signer Email"] || "No Email" : "No Email",
                    phone: contact ? contact["Phone Number"] || "No Phone" : "No Phone",
                    avatar: contact ? contact["Headshot"]?.[0]?.url : null,
                    // Compliance Flags (default to false if not found)
                    fees: comp.paidFees || false,
                    forms: comp.signedAgreement || false,
                    bio: comp.measurementsTaken || false, 
                    headshot: comp.headshotSubmitted || false
                });
            } else {
                // Add second role if they already exist in map
                personMap.get(personId).roles.push(roleName);
            }
        });
      }

      return Array.from(personMap.values()).sort((a: any, b: any) => a.name.localeCompare(b.name));
  }, [assignments, people, complianceData]);

  // --- FILTERING ---
  const filteredRoster = roster.filter((p: any) => {
      const matchesSearch = p.name.toLowerCase().includes(filter.toLowerCase()) || p.roles.join(" ").toLowerCase().includes(filter.toLowerCase());
      
      if (filterMode === 'All') return matchesSearch;
      
      // 'Issues' Mode: Show only if something is RED
      const hasIssue = !p.fees || !p.forms || !p.bio;
      return matchesSearch && hasIssue;
  });

  const totalIssues = roster.filter((p: any) => !p.fees || !p.forms || !p.bio).length;

  return (
    <div className="flex flex-col h-screen bg-zinc-950 text-white overflow-hidden font-sans">
      
      {/* HEADER TOOLBAR */}
      <header className="h-16 border-b border-white/10 flex items-center justify-between px-6 bg-zinc-900/50 backdrop-blur-md shrink-0 z-20">
          <div className="flex items-center gap-4 w-full max-w-2xl">
              <h1 className="text-lg font-black uppercase italic tracking-tighter text-zinc-400 border-r border-white/10 pr-4 mr-2 hidden md:block">
                  {productionTitle}
              </h1>

              {/* SEARCH */}
              <div className="relative flex-1">
                  <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500"/>
                  <input 
                      value={filter}
                      onChange={(e) => setFilter(e.target.value)}
                      placeholder="Search cast list..." 
                      className="w-full bg-zinc-900 border border-white/10 rounded-full pl-10 pr-4 py-2 text-sm focus:border-emerald-500 outline-none transition-all placeholder:text-zinc-600"
                  />
              </div>

              {/* FILTER TOGGLE */}
              <div className="flex bg-zinc-900 rounded-full p-1 border border-white/10">
                  <button onClick={() => setFilterMode('All')} className={`px-4 py-1.5 rounded-full text-xs font-bold uppercase transition-all ${filterMode === 'All' ? 'bg-zinc-700 text-white' : 'text-zinc-500 hover:text-white'}`}>
                      All Cast
                  </button>
                  <button onClick={() => setFilterMode('Issues')} className={`px-4 py-1.5 rounded-full text-xs font-bold uppercase transition-all flex items-center gap-2 ${filterMode === 'Issues' ? 'bg-red-900/50 text-red-200 border border-red-500/30' : 'text-zinc-500 hover:text-red-400'}`}>
                      Action Needed {totalIssues > 0 && <span className="bg-red-500 text-white text-[9px] px-1.5 rounded-full">{totalIssues}</span>}
                  </button>
              </div>
          </div>
          
          <button className="bg-white text-black px-4 py-2 rounded-full text-xs font-bold uppercase tracking-wider hover:bg-zinc-200 transition-colors flex items-center gap-2">
              <Mail size={14}/> Email Blast
          </button>
      </header>

      {/* ROSTER GRID */}
      <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-4">
              {filteredRoster.map((member: any) => {
                  const isFullyCompliant = member.fees && member.forms && member.bio;
                  
                  return (
                    <div key={member.id} className={`group relative bg-zinc-900 border rounded-xl p-4 transition-all hover:shadow-2xl ${isFullyCompliant ? 'border-white/5 hover:border-emerald-500/30' : 'border-red-500/20 hover:border-red-500/50'}`}>
                        
                        {/* IDENTITY */}
                        <div className="flex items-start gap-4 mb-4">
                            <div className="w-12 h-12 rounded-full bg-zinc-800 border border-white/10 overflow-hidden shrink-0">
                                {member.avatar ? (
                                    <img src={member.avatar} className="w-full h-full object-cover" alt={member.name}/>
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center text-zinc-600"><User size={20}/></div>
                                )}
                            </div>
                            <div className="min-w-0">
                                <h3 className="font-bold text-white truncate text-base">{member.name}</h3>
                                <div className="flex flex-wrap gap-1 mt-1">
                                    {member.roles.map((r: string, i: number) => (
                                        <span key={i} className="text-[10px] font-bold uppercase tracking-wide bg-white/5 text-zinc-400 px-1.5 py-0.5 rounded border border-white/5">
                                            {r}
                                        </span>
                                    ))}
                                </div>
                            </div>
                        </div>

                        {/* CONTACT INFO */}
                        <div className="space-y-1 mb-4 pl-1">
                            <div className="flex items-center gap-2 text-xs text-zinc-500 truncate group-hover:text-zinc-300 transition-colors">
                                <Mail size={12}/> {member.email}
                            </div>
                            <div className="flex items-center gap-2 text-xs text-zinc-500 truncate group-hover:text-zinc-300 transition-colors">
                                <Phone size={12}/> {member.phone}
                            </div>
                        </div>

                        {/* COMPLIANCE STATUS BAR */}
                        <div className="pt-3 border-t border-white/5 flex items-center justify-between">
                            <StatusBadge label="Fees" active={member.fees} icon={<DollarSign size={10}/>} />
                            <StatusBadge label="Forms" active={member.forms} icon={<FileText size={10}/>} />
                            <StatusBadge label="Bio/Meas" active={member.bio} icon={<Ruler size={10}/>} />
                        </div>

                        {/* ACTION OVERLAY (Only shows on hover if there are issues) */}
                        {!isFullyCompliant && (
                            <div className="absolute inset-0 bg-red-950/90 backdrop-blur-sm opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center rounded-xl pointer-events-none group-hover:pointer-events-auto">
                                <button className="bg-white text-red-600 px-4 py-2 rounded-full text-xs font-black uppercase tracking-wider flex items-center gap-2 shadow-xl hover:bg-zinc-200">
                                    <Mail size={14}/> Remind {member.name.split(" ")[0]}
                                </button>
                            </div>
                        )}
                    </div>
                  );
              })}
          </div>
          
          {filteredRoster.length === 0 && (
              <div className="text-center text-zinc-500 mt-20">
                  <div className="text-4xl mb-4 opacity-20">👻</div>
                  <p>No cast members found matching your filter.</p>
              </div>
          )}
      </div>
    </div>
  );
}

// --- SUB-COMPONENT ---
function StatusBadge({ label, active, icon }: any) {
    return (
        <div className={`flex items-center gap-1.5 px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wider border ${active ? 'bg-emerald-900/10 text-emerald-500 border-emerald-500/20' : 'bg-red-900/10 text-red-500 border-red-500/20'}`}>
            {active ? <CheckCircle2 size={10} /> : <AlertTriangle size={10} />}
            {label}
        </div>
    )
}