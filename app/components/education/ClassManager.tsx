"use client";

import React, { useState, useMemo } from 'react';
import { 
  CheckCircle2, XCircle, Clock, 
  ChevronRight, Search, MapPin, 
  ArrowLeft, Users, Calendar, Building2
} from 'lucide-react';

export default function ClassManager({ classes, people }: any) {
  const [viewState, setViewState] = useState<'locations' | 'classes' | 'attendance'>('locations');
  const [selectedLocation, setSelectedLocation] = useState<string>("");
  const [selectedClass, setSelectedClass] = useState<any>(null);
  const [searchTerm, setSearchTerm] = useState("");

  // --- 1. GROUP CLASSES BY LOCATION ---
  const locationStats = useMemo(() => {
    const stats: Record<string, { count: number, students: number }> = {};
    
    classes.forEach((c: any) => {
        // Normalize location name just in case
        const loc = c.location || "Unknown Location";
        if (!stats[loc]) stats[loc] = { count: 0, students: 0 };
        stats[loc].count++;
        stats[loc].students += c.enrolled;
    });

    return Object.entries(stats).map(([name, data]) => ({ name, ...data }));
  }, [classes]);

  // --- 2. GHOST STUDENT GENERATOR (For Demo) ---
  const classRoster = useMemo(() => {
      if (!selectedClass) return [];
      const roster = [];
      const realPeopleCount = people.length;
      for (let i = 0; i < selectedClass.enrolled; i++) {
          if (i < realPeopleCount) {
              roster.push({ id: people[i].id, name: people[i]["Full Name"], status: 'Present' });
          } else {
              roster.push({ id: `ghost-${i}`, name: `Student ${i + 1}`, status: 'Present' });
          }
      }
      return roster;
  }, [selectedClass, people]);

  // Filter classes based on selected location AND search term
  const filteredClasses = classes.filter((c:any) => 
      c.location === selectedLocation &&
      (c.name.toLowerCase().includes(searchTerm.toLowerCase()) || c.teacher.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  return (
    <div className="flex flex-col h-full bg-zinc-950 text-white font-sans">
        
        {/* =========================================
            VIEW 1: LOCATION SELECTOR (The "Hub") 
           ========================================= */}
        {viewState === 'locations' && (
            <div className="p-6">
                <h1 className="text-xl font-black uppercase italic tracking-wider text-blue-500 mb-2">
                    Select Campus
                </h1>
                <p className="text-xs text-zinc-500 mb-6">Winter Session 2026 • 4 Active Locations</p>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {locationStats.map((loc) => (
                        <button 
                            key={loc.name}
                            onClick={() => { setSelectedLocation(loc.name); setViewState('classes'); }}
                            className="bg-zinc-900 border border-white/5 p-6 rounded-xl text-left group hover:bg-zinc-800 hover:border-white/10 transition-all shadow-lg"
                        >
                            <div className="flex items-start justify-between mb-4">
                                <div className="p-3 bg-blue-900/20 text-blue-400 rounded-lg group-hover:bg-blue-500 group-hover:text-white transition-colors">
                                    <Building2 size={24} />
                                </div>
                                <ChevronRight className="text-zinc-700 group-hover:text-white"/>
                            </div>
                            
                            <h3 className="text-lg font-bold text-white mb-1">{loc.name}</h3>
                            <div className="flex items-center gap-3 text-xs text-zinc-500 font-medium">
                                <span>{loc.count} Classes</span>
                                <span className="w-1 h-1 bg-zinc-700 rounded-full"/>
                                <span>{loc.students} Students</span>
                            </div>
                        </button>
                    ))}
                </div>
            </div>
        )}

        {/* =========================================
            VIEW 2: CLASS LIST (Filtered by Location) 
           ========================================= */}
        {viewState === 'classes' && (
            <div className="flex flex-col h-full animate-in slide-in-from-right-4 duration-300">
                {/* Header */}
                <div className="p-6 pb-2 shrink-0 bg-zinc-950 z-10">
                    <button onClick={() => setViewState('locations')} className="flex items-center gap-2 text-zinc-500 hover:text-white transition-colors mb-4 text-xs font-bold uppercase tracking-wide">
                        <ArrowLeft size={14}/> Back to Locations
                    </button>
                    
                    <h1 className="text-xl font-black uppercase italic tracking-wider text-white mb-1">
                        {selectedLocation}
                    </h1>
                    <p className="text-xs text-zinc-500 mb-4 flex items-center gap-2">
                        <MapPin size={12}/> Showing active classes
                    </p>

                    <div className="relative">
                        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500"/>
                        <input 
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            placeholder={`Search ${filteredClasses.length} classes...`}
                            className="w-full bg-zinc-900 border border-white/10 rounded-xl pl-10 pr-4 py-3 text-sm focus:border-blue-500 outline-none placeholder:text-zinc-600 transition-all"
                        />
                    </div>
                </div>

                {/* List */}
                <div className="flex-1 overflow-y-auto p-6 pt-2 space-y-3 custom-scrollbar">
                    {filteredClasses.map((c: any) => (
                        <button 
                            key={c.id}
                            onClick={() => { setSelectedClass(c); setViewState('attendance'); }}
                            className="w-full bg-zinc-900 border border-white/5 p-4 rounded-xl flex justify-between items-start group hover:bg-zinc-800 hover:border-white/10 transition-all text-left shadow-md"
                        >
                            <div className="flex-1 min-w-0 pr-4">
                                <div className="flex items-center gap-2 mb-1">
                                    <span className="text-[10px] font-bold uppercase tracking-wider bg-zinc-800 text-zinc-400 px-1.5 py-0.5 rounded border border-white/5">
                                        {c.day}s
                                    </span>
                                    <span className="text-[10px] font-bold uppercase tracking-wider bg-blue-900/30 text-blue-400 px-1.5 py-0.5 rounded border border-blue-500/20">
                                        Ages {c.ages}
                                    </span>
                                </div>
                                <div className="font-bold text-white text-lg leading-tight mb-1 truncate">{c.name}</div>
                                <div className="text-xs text-zinc-500 flex items-center gap-2">
                                    <Clock size={12}/> {c.time}
                                    <span className="text-zinc-600">|</span>
                                    <span className="text-zinc-400">{c.teacher}</span>
                                </div>
                            </div>
                            <div className="flex flex-col items-end justify-center h-full gap-2">
                                <div className="text-right">
                                    <div className="text-xl font-black text-white leading-none">{c.enrolled}</div>
                                    <div className="text-[9px] uppercase font-bold text-zinc-600">Students</div>
                                </div>
                            </div>
                        </button>
                    ))}
                </div>
            </div>
        )}

        {/* =========================================
            VIEW 3: ATTENDANCE (Javier's View) 
           ========================================= */}
        {viewState === 'attendance' && selectedClass && (
            <div className="flex flex-col h-full animate-in slide-in-from-right-4 duration-300">
                <header className="h-16 border-b border-white/10 flex items-center justify-between px-4 bg-zinc-900 shrink-0">
                    <button onClick={() => setViewState('classes')} className="flex items-center gap-2 text-zinc-400 hover:text-white transition-colors pr-4 py-2">
                        <ArrowLeft size={18}/> 
                        <span className="text-xs font-bold uppercase tracking-wide hidden sm:inline">Back</span>
                    </button>
                    
                    <div className="text-center flex-1 px-2">
                        <div className="text-sm font-bold text-white truncate max-w-[200px] mx-auto">{selectedClass.name}</div>
                        <div className="text-[10px] text-zinc-500 uppercase flex justify-center items-center gap-2">
                            <span>{new Date().toLocaleDateString()}</span>
                            <span className="w-1 h-1 rounded-full bg-zinc-700"/>
                            <span>{selectedClass.enrolled} Enrolled</span>
                        </div>
                    </div>
                    
                    <button className="bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider transition-colors shadow-lg shadow-emerald-900/20">
                        Save
                    </button>
                </header>

                <div className="flex-1 overflow-y-auto p-4 space-y-2 custom-scrollbar bg-zinc-950">
                    {classRoster.map((student: any) => (
                        <AttendanceRow key={student.id} student={student} />
                    ))}
                    <div className="h-20"/> 
                </div>
            </div>
        )}
    </div>
  );
}

function AttendanceRow({ student }: any) {
    const [status, setStatus] = useState<'Present'|'Absent'|'Late'>('Present');
    return (
        <div className={`p-3 rounded-xl border flex items-center justify-between transition-all group ${status === 'Absent' ? 'bg-red-900/10 border-red-500/30' : 'bg-zinc-900 border-white/5 hover:border-white/10'}`}>
            <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-xs transition-colors ${status === 'Absent' ? 'bg-red-500/20 text-red-500' : 'bg-zinc-800 text-zinc-500'}`}>
                    {student.name.charAt(0)}
                </div>
                <div>
                    <div className={`font-bold text-sm transition-colors ${status === 'Absent' ? 'text-red-200' : 'text-zinc-200'}`}>{student.name}</div>
                    <div className="text-[10px] text-zinc-500">{status === 'Absent' ? 'Marked Absent' : 'Present'}</div>
                </div>
            </div>
            <div className="flex bg-black/40 rounded-lg p-1 gap-1">
                <button onClick={() => setStatus('Present')} className={`p-2 rounded-md transition-all ${status === 'Present' ? 'bg-emerald-600 text-white shadow' : 'text-zinc-600 hover:text-emerald-500 hover:bg-white/5'}`}><CheckCircle2 size={18}/></button>
                <button onClick={() => setStatus('Late')} className={`p-2 rounded-md transition-all ${status === 'Late' ? 'bg-amber-600 text-white shadow' : 'text-zinc-600 hover:text-amber-500 hover:bg-white/5'}`}><Clock size={18}/></button>
                <button onClick={() => setStatus('Absent')} className={`p-2 rounded-md transition-all ${status === 'Absent' ? 'bg-red-600 text-white shadow' : 'text-zinc-600 hover:text-red-500 hover:bg-white/5'}`}><XCircle size={18}/></button>
            </div>
        </div>
    )
}