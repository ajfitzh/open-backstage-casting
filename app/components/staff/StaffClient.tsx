"use client";

import React, { useState, useMemo } from 'react';
import { 
  Mail, Phone, Search, 
  User, MoreHorizontal, Check, AlertCircle,
  CheckCircle2, XCircle
} from 'lucide-react';
import { getStudentClassData } from '../../lib/mockEducation';

export default function StaffClient({ productionTitle, assignments, people, complianceData }: any) {
  const [filter, setFilter] = useState("");
  const [filterMode, setFilterMode] = useState<'All' | 'Issues'>('All');

  // --- 🧠 DATA MERGE ENGINE ---
  const roster = useMemo(() => {
      // 1. Index Compliance Data
      const complianceMap = new Map();
      if (Array.isArray(complianceData)) {
          complianceData.forEach((c: any) => {
              if(c.performerName) complianceMap.set(c.performerName, c);
          });
      }

      // 2. Build the Master Person Map
      const personMap = new Map();
      
      if (Array.isArray(assignments)) {
        assignments.forEach((a: any) => {
            const personId = a["Person"]?.[0]?.id;
            const personName = a["Person"]?.[0]?.value || "Unknown";
            const roleName = a["Performance Identity"]?.[0]?.value || "Unassigned";

            if (!personId) return;

            if (!personMap.has(personId)) {
                const contact = people.find((p: any) => p.id === personId);
                const comp = complianceMap.get(personName) || {};
                
                // 🎓 EDUCATION INTEGRATION (The Bridge)
                const eduData = getStudentClassData(personId);
                const classStatus = {
                    isEnrolled: !!eduData,
                    className: eduData?.className || "Not Enrolled",
                    absences: eduData?.absences || 0,
                    // "Good Standing" = Fewer than 3 absences
                    isGoodStanding: (eduData?.absences || 0) < 3 
                };

                personMap.set(personId, {
                    id: personId,
                    name: personName,
                    roles: [roleName],
                    email: contact ? contact["Email"] || contact["Signer Email"] || "" : "",
                    phone: contact ? contact["Phone Number"] || "" : "",
                    avatar: contact ? contact["Headshot"]?.[0]?.url : null,
                    // Compliance Flags
                    fees: comp.paidFees || false,
                    forms: comp.signedAgreement || false,
                    bio: comp.measurementsTaken || false, 
                    // Education Flag
                    education: classStatus
                });
            } else {
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
      
      // 'Issues' Mode: Show if ANY dot is Red
      const complianceIssue = !p.fees || !p.forms || !p.bio;
      const educationIssue = p.education.isEnrolled && !p.education.isGoodStanding;
      
      return matchesSearch && (complianceIssue || educationIssue);
  });

  const totalIssues = roster.filter((p: any) => {
      const complianceIssue = !p.fees || !p.forms || !p.bio;
      const educationIssue = p.education.isEnrolled && !p.education.isGoodStanding;
      return complianceIssue || educationIssue;
  }).length;

  return (
    <div className="flex flex-col h-screen bg-zinc-950 text-white overflow-hidden font-sans">
      
      {/* HEADER TOOLBAR */}
      <header className="h-16 border-b border-white/10 flex items-center justify-between px-6 bg-zinc-900/50 backdrop-blur-md shrink-0 z-20">
          <div className="flex items-center gap-4 w-full max-w-xl">
              <h1 className="text-sm font-black uppercase tracking-widest text-zinc-400 hidden md:block">
                  {productionTitle}
              </h1>

              {/* COMPACT SEARCH */}
              <div className="relative flex-1">
                  <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500"/>
                  <input 
                      value={filter}
                      onChange={(e) => setFilter(e.target.value)}
                      placeholder="Find actor..." 
                      className="w-full bg-zinc-900 border border-white/10 rounded-lg pl-9 pr-3 py-1.5 text-xs focus:border-blue-500 outline-none transition-all placeholder:text-zinc-600"
                  />
              </div>

              {/* SIMPLE TOGGLE */}
              <div className="flex bg-zinc-900 rounded-lg p-0.5 border border-white/10">
                  <button onClick={() => setFilterMode('All')} className={`px-3 py-1 rounded-md text-[10px] font-bold uppercase transition-all ${filterMode === 'All' ? 'bg-zinc-700 text-white' : 'text-zinc-500 hover:text-white'}`}>
                      All
                  </button>
                  <button onClick={() => setFilterMode('Issues')} className={`px-3 py-1 rounded-md text-[10px] font-bold uppercase transition-all flex items-center gap-1.5 ${filterMode === 'Issues' ? 'bg-red-900/50 text-red-200' : 'text-zinc-500 hover:text-red-400'}`}>
                      Issues {totalIssues > 0 && <span className="bg-red-500 text-white text-[8px] px-1 rounded-full">{totalIssues}</span>}
                  </button>
              </div>
          </div>
          
          <button className="text-zinc-400 hover:text-white transition-colors">
              <MoreHorizontal size={20} />
          </button>
      </header>

      {/* ROSTER LIST */}
      <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
          <div className="grid grid-cols-1 lg:grid-cols-2 2xl:grid-cols-3 gap-2">
              {filteredRoster.map((member: any) => (
                <div key={member.id} className="group flex items-center gap-3 bg-zinc-900/50 border border-white/5 rounded-lg p-2 hover:bg-zinc-800 hover:border-white/10 transition-all">
                    
                    {/* AVATAR */}
                    <div className="w-10 h-10 rounded-full bg-black/40 border border-white/5 overflow-hidden shrink-0 relative">
                        {member.avatar ? (
                            <img src={member.avatar} className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity" alt={member.name}/>
                        ) : (
                            <div className="w-full h-full flex items-center justify-center text-zinc-700"><User size={16}/></div>
                        )}
                    </div>

                    {/* TEXT INFO */}
                    <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                            <span className="font-bold text-sm text-zinc-200 truncate">{member.name}</span>
                        </div>
                        <div className="text-[10px] text-zinc-500 truncate flex items-center gap-2">
                            <span className="text-blue-400">{member.roles[0]}</span>
                            {member.roles.length > 1 && <span className="text-zinc-600">+{member.roles.length - 1}</span>}
                        </div>
                    </div>

                    {/* CONTACT ACTIONS (Hidden until hover) */}
                    <div className="hidden group-hover:flex items-center gap-1 mr-2 animate-in fade-in slide-in-from-right-2 duration-200">
                        {member.email && (
                            <a href={`mailto:${member.email}`} className="p-1.5 text-zinc-500 hover:text-white hover:bg-white/10 rounded" title={member.email}>
                                <Mail size={14}/>
                            </a>
                        )}
                        {member.phone && (
                            <a href={`tel:${member.phone}`} className="p-1.5 text-zinc-500 hover:text-white hover:bg-white/10 rounded" title={member.phone}>
                                <Phone size={14}/>
                            </a>
                        )}
                    </div>

                    {/* TRAFFIC LIGHTS (The Dots) */}
                    <div className="flex flex-col gap-1 pl-3 border-l border-white/5 py-1">
                        <StatusDot active={member.fees} label="Production Fees" />
                        <StatusDot active={member.forms} label="Liability Forms" />
                        <StatusDot active={member.bio} label="Measurements/Bio" />
                        
                        {/* 4th DOT: Education Status (Only if Enrolled) */}
                        {member.education.isEnrolled && (
                             <EducationDot 
                                goodStanding={member.education.isGoodStanding} 
                                absences={member.education.absences}
                                className={member.education.className}
                            />
                        )}
                    </div>

                </div>
              ))}
          </div>
          
          {filteredRoster.length === 0 && (
              <div className="text-center text-zinc-600 mt-10 text-xs italic">
                  No actors found.
              </div>
          )}
      </div>
    </div>
  );
}

// --- SUB-COMPONENT: STATUS DOT ---
function StatusDot({ active, label }: { active: boolean, label: string }) {
    return (
        <div className="group/dot relative flex items-center justify-end">
            {/* The Indicator */}
            <div className={`w-1.5 h-1.5 rounded-full transition-colors ${active ? 'bg-zinc-700 group-hover/dot:bg-emerald-500' : 'bg-red-500 animate-pulse'}`} />
            
            {/* The Hover Tooltip */}
            <div className="absolute right-4 top-1/2 -translate-y-1/2 bg-zinc-950 border border-zinc-700 px-2 py-1 rounded shadow-xl opacity-0 group-hover/dot:opacity-100 pointer-events-none transition-opacity z-50 whitespace-nowrap">
                <div className="flex items-center gap-1.5">
                    {active ? <Check size={8} className="text-emerald-500"/> : <AlertCircle size={8} className="text-red-500"/>}
                    <span className={`text-[9px] font-bold uppercase tracking-wider ${active ? 'text-zinc-400' : 'text-red-400'}`}>
                        {label} {active ? "OK" : "Missing"}
                    </span>
                </div>
            </div>
        </div>
    )
}

// --- SUB-COMPONENT: EDUCATION DOT ---
function EducationDot({ goodStanding, absences, className }: any) {
    return (
        <div className="group/dot relative flex items-center justify-end">
            {/* The Indicator */}
            <div className={`w-1.5 h-1.5 rounded-full transition-colors ${goodStanding ? 'bg-blue-900/50 group-hover/dot:bg-blue-500' : 'bg-red-500 animate-pulse'}`} />
            
            {/* The Hover Tooltip */}
            <div className="absolute right-4 top-1/2 -translate-y-1/2 bg-zinc-950 border border-zinc-700 p-2 rounded shadow-xl opacity-0 group-hover/dot:opacity-100 pointer-events-none transition-opacity z-50 whitespace-nowrap">
                <div className="text-[9px] font-black uppercase text-zinc-500 mb-0.5">{className}</div>
                <div className="flex items-center gap-1.5">
                    {goodStanding ? <CheckCircle2 size={10} className="text-blue-500"/> : <XCircle size={10} className="text-red-500"/>}
                    <span className={`text-[10px] font-bold ${goodStanding ? 'text-zinc-300' : 'text-red-400'}`}>
                        {absences} Absences {goodStanding ? "(OK)" : "(At Risk)"}
                    </span>
                </div>
            </div>
        </div>
    )
}