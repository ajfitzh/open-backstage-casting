"use client";

import React, { useState } from 'react';
import { Search, UserPlus, GripVertical, Mail, FileText } from 'lucide-react';
import { updateApplicantStatus } from '@/app/lib/baserow';

// Match these IDs exactly to your new Baserow Options
const COLUMNS = [
  { id: 'Faculty Applicant', label: 'New Applicants', color: 'border-zinc-500' },
  { id: 'Faculty Interviewing', label: 'Interviewing', color: 'border-blue-500' },
  { id: 'Active Faculty', label: 'Hired & Active', color: 'border-emerald-500' }
];

export default function HiringKanban({ applicants }: { applicants: any[] }) {
  const [people, setPeople] = useState(applicants);
  const [search, setSearch] = useState("");

  const handleDragStart = (e: React.DragEvent, personId: number) => {
    e.dataTransfer.setData("personId", personId.toString());
  };

  const handleDrop = async (e: React.DragEvent, newStatus: string) => {
    const personId = Number(e.dataTransfer.getData("personId"));
    const person = people.find(p => p.id === personId);
    if (!person) return;

    // 1. Optimistic UI Update
    setPeople(prev => prev.map(p => {
        if (p.id !== personId) return p;
        // Remove old hiring tags locally, add new one
        const hiringTags = ["Faculty Applicant", "Faculty Interviewing", "Active Faculty"];
        const kept = p.status.filter((t: string) => !hiringTags.includes(t));
        return { ...p, status: [...kept, newStatus] };
    }));

    // 2. Server Update
    await updateApplicantStatus(personId, person.status, newStatus);
  };

  return (
    <div className="flex flex-col h-full bg-zinc-950 p-6">
      {/* Header */}
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-2xl font-black uppercase italic tracking-tighter text-white">Faculty Hiring</h1>
        <div className="flex gap-4">
            <div className="relative">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500"/>
                <input 
                    value={search} 
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Search..." 
                    className="bg-zinc-900 border border-white/10 rounded-xl pl-9 pr-4 py-2 text-sm text-white focus:border-blue-500 outline-none"
                />
            </div>
            {/* You would wire this button to a Modal to add a new person row */}
            <button className="bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider flex items-center gap-2 transition-all">
                <UserPlus size={14}/> Add Applicant
            </button>
        </div>
      </div>

      {/* Columns */}
      <div className="flex gap-6 h-full overflow-x-auto pb-4">
        {COLUMNS.map(col => (
          <div 
            key={col.id} 
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => handleDrop(e, col.id)}
            className="flex-1 min-w-[300px] flex flex-col bg-zinc-900/50 border border-white/5 rounded-2xl overflow-hidden"
          >
            <div className={`p-4 border-t-4 ${col.color} bg-zinc-900 flex justify-between items-center`}>
                <h3 className="font-bold text-zinc-300">{col.label}</h3>
                <span className="text-xs bg-zinc-800 px-2 py-1 rounded text-zinc-500 font-mono">
                    {people.filter(p => p.status.includes(col.id)).length}
                </span>
            </div>
            
            <div className="flex-1 p-3 space-y-3 overflow-y-auto custom-scrollbar">
                {people
                    .filter(p => p.status.includes(col.id))
                    .filter(p => p.name.toLowerCase().includes(search.toLowerCase()))
                    .map(person => (
                        <div 
                            key={person.id} 
                            draggable 
                            onDragStart={(e) => handleDragStart(e, person.id)}
                            className="bg-zinc-950 p-4 rounded-xl border border-white/5 hover:border-white/20 shadow-sm hover:shadow-lg cursor-grab active:cursor-grabbing group transition-all"
                        >
                            <div className="flex items-start justify-between mb-3">
                                <div className="flex items-center gap-3">
                                    {person.headshot ? (
                                        <img src={person.headshot} className="w-10 h-10 rounded-full object-cover bg-zinc-800"/>
                                    ) : (
                                        <div className="w-10 h-10 rounded-full bg-zinc-800 flex items-center justify-center text-xs font-bold text-zinc-500">
                                            {person.name.substring(0,2)}
                                        </div>
                                    )}
                                    <div>
                                        <div className="font-bold text-white text-sm">{person.name}</div>
                                        <div className="text-[10px] text-zinc-500">{person.email}</div>
                                    </div>
                                </div>
                                <GripVertical size={14} className="text-zinc-700 opacity-0 group-hover:opacity-100"/>
                            </div>
                            
                            {/* Tags showing other roles (e.g. Parent) */}
                            <div className="flex flex-wrap gap-1 mb-3">
                                {person.status
                                    .filter((t:string) => !["Faculty Applicant", "Faculty Interviewing", "Active Faculty"].includes(t))
                                    .map((t:string) => (
                                        <span key={t} className="px-1.5 py-0.5 rounded bg-zinc-900 border border-white/5 text-[9px] text-zinc-500 uppercase tracking-wide">{t}</span>
                                    ))
                                }
                            </div>

                            <div className="flex gap-2 pt-2 border-t border-white/5">
                                <button className="flex-1 py-1.5 flex items-center justify-center gap-1 text-[10px] font-bold uppercase text-zinc-400 hover:text-white hover:bg-zinc-900 rounded transition-colors">
                                    <Mail size={12}/> Email
                                </button>
                                <button className="flex-1 py-1.5 flex items-center justify-center gap-1 text-[10px] font-bold uppercase text-zinc-400 hover:text-white hover:bg-zinc-900 rounded transition-colors">
                                    <FileText size={12}/> Profile
                                </button>
                            </div>
                        </div>
                    ))
                }
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}