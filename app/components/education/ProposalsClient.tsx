"use client";

import React, { useState } from 'react';
import { BookOpen, User, Calendar, MapPin, CheckCircle, XCircle, Target, Users } from 'lucide-react';

interface EducationClass {
  id: number;
  name: string;
  session: string;
  teacher: string;
  location: string;
  day: string;
  time: string;
  type: string;
  status: string;
  ageRange: string;
}

export default function ProposalsClient({ proposals }: { proposals: EducationClass[] }) {
  const [filter, setFilter] = useState<'All' | 'Proposed' | 'Seeking Instructor'>('All');

  const filteredProposals = proposals.filter(p => filter === 'All' ? true : p.status === filter);

  return (
    <div className="space-y-6 pb-20">
      {/* FILTER TABS */}
      <div className="flex gap-2 border-b border-white/10 pb-4">
        {['All', 'Proposed', 'Seeking Instructor'].map(f => (
          <button 
            key={f}
            onClick={() => setFilter(f as any)}
            className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${
              filter === f ? 'bg-white text-black shadow-lg' : 'bg-zinc-900/50 text-zinc-500 hover:text-white hover:bg-zinc-800'
            }`}
          >
            {f === 'Seeking Instructor' ? 'Open Bounties' : f}
            <span className="ml-2 opacity-50">
                {f === 'All' ? proposals.length : proposals.filter(p => p.status === f).length}
            </span>
          </button>
        ))}
      </div>

      {/* PROPOSALS GRID */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {filteredProposals.map(prop => (
          <div key={prop.id} className="bg-zinc-900/40 border border-white/5 hover:border-white/20 rounded-3xl p-6 transition-all flex flex-col group">
            
            {/* Header */}
            <div className="flex justify-between items-start mb-4">
               <div>
                  <span className={`text-[9px] font-black uppercase tracking-widest px-2 py-1 rounded border ${
                      prop.status === 'Seeking Instructor' 
                      ? 'bg-amber-500/10 text-amber-500 border-amber-500/20' 
                      : 'bg-blue-500/10 text-blue-400 border-blue-500/20'
                  }`}>
                      {prop.status === 'Seeking Instructor' ? 'Open Bounty' : 'Teacher Proposal'}
                  </span>
                  <h3 className="text-lg font-bold text-white mt-3 leading-tight group-hover:text-emerald-400 transition-colors">
                      {prop.name}
                  </h3>
               </div>
            </div>

            {/* Details */}
            <div className="space-y-3 mb-6 flex-1">
                <div className="flex items-center gap-3 text-xs text-zinc-400">
                    <div className="w-6 h-6 rounded bg-zinc-800 flex items-center justify-center text-zinc-500 shrink-0"><User size={12}/></div>
                    <span className="font-bold text-zinc-300">{prop.teacher || "TBA"}</span>
                </div>
                <div className="flex items-center gap-3 text-xs text-zinc-400">
                    <div className="w-6 h-6 rounded bg-zinc-800 flex items-center justify-center text-zinc-500 shrink-0"><Calendar size={12}/></div>
                    <span>{prop.session}</span>
                </div>
                <div className="flex items-center gap-3 text-xs text-zinc-400">
                    <div className="w-6 h-6 rounded bg-zinc-800 flex items-center justify-center text-zinc-500 shrink-0"><Users size={12}/></div>
                    <span>{prop.ageRange} <span className="opacity-50">({prop.type})</span></span>
                </div>
            </div>

            {/* Action Buttons */}
            <div className="grid grid-cols-2 gap-2 pt-4 border-t border-white/5 mt-auto">
                <button className="flex items-center justify-center gap-2 py-2 rounded-xl text-xs font-bold text-red-400 hover:bg-red-500/10 transition-colors">
                    <XCircle size={14} /> Reject
                </button>
                <button className="flex items-center justify-center gap-2 py-2 rounded-xl text-xs font-bold text-emerald-400 bg-emerald-500/10 hover:bg-emerald-500/20 transition-colors">
                    <CheckCircle size={14} /> Approve
                </button>
            </div>

          </div>
        ))}

        {filteredProposals.length === 0 && (
          <div className="col-span-full py-20 text-center border-2 border-dashed border-zinc-800 rounded-3xl bg-zinc-900/20">
              <Target size={48} className="mx-auto text-zinc-700 mb-4" />
              <p className="text-zinc-500 font-bold">No proposals found.</p>
              <p className="text-zinc-600 text-xs mt-1">Try adjusting your filters.</p>
          </div>
        )}
      </div>
    </div>
  );
}
