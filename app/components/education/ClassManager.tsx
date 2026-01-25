"use client";

import React, { useState, useMemo } from 'react';
import { 
  CheckCircle2, XCircle, Clock, 
  ChevronRight, Search, MapPin, 
  ArrowLeft, Users, Calendar, Building2,
  Waves, Compass, Anchor, Navigation, 
  Sparkles, Heart, Church
} from 'lucide-react';

export default function ClassManager({ classes, people }: any) {
  const [viewState, setViewState] = useState<'locations' | 'classes' | 'attendance'>('locations');
  const [selectedLocation, setSelectedLocation] = useState<string>("");
  const [selectedClass, setSelectedClass] = useState<any>(null);
  const [searchTerm, setSearchTerm] = useState("");

  // --- 🎨 CAMPUS THEMING ENGINE ---
  const getLocationTheme = (name: string) => {
    const n = name.toLowerCase();
    
    if (n.includes('river of life')) return { 
        icon: <Waves size={24} />, 
        color: 'text-cyan-400', 
        bg: 'bg-cyan-500/10', 
        border: 'border-cyan-500/20',
        hover: 'group-hover:bg-cyan-500' 
    };
    if (n.includes('hope')) return { 
        icon: <Compass size={24} />, 
        color: 'text-purple-400', 
        bg: 'bg-purple-500/10', 
        border: 'border-purple-500/20',
        hover: 'group-hover:bg-purple-500' 
    };
    if (n.includes('river club')) return { 
        icon: <Anchor size={24} />, 
        color: 'text-emerald-400', 
        bg: 'bg-emerald-500/10', 
        border: 'border-emerald-500/20',
        hover: 'group-hover:bg-emerald-500' 
    };
    if (n.includes('highway')) return { 
        icon: <Navigation size={24} />, 
        color: 'text-amber-400', 
        bg: 'bg-amber-500/10', 
        border: 'border-amber-500/20',
        hover: 'group-hover:bg-amber-500' 
    };

    // Default Fallback
    return { 
        icon: <Building2 size={24} />, 
        color: 'text-blue-400', 
        bg: 'bg-blue-500/10', 
        border: 'border-blue-500/20',
        hover: 'group-hover:bg-blue-500' 
    };
  };

  // --- GROUP CLASSES BY LOCATION ---
  const locationStats = useMemo(() => {
    const stats: Record<string, { count: number, students: number }> = {};
    classes.forEach((c: any) => {
        const loc = c.location || "Unknown Location";
        if (!stats[loc]) stats[loc] = { count: 0, students: 0 };
        stats[loc].count++;
        stats[loc].students += c.enrolled;
    });
    return Object.entries(stats).map(([name, data]) => ({ name, ...data }));
  }, [classes]);

  // --- GHOST STUDENT GENERATOR ---
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

  const filteredClasses = classes.filter((c:any) => 
      c.location === selectedLocation &&
      (c.name.toLowerCase().includes(searchTerm.toLowerCase()) || c.teacher.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  return (
    <div className="flex flex-col h-full bg-zinc-950 text-white font-sans">
        
        {/* VIEW 1: CAMPUS HUB */}
        {viewState === 'locations' && (
            <div className="p-8 max-w-5xl mx-auto w-full">
                <header className="mb-10">
                    <h1 className="text-3xl font-black uppercase italic tracking-tighter text-white">
                        Class Hub
                    </h1>
                    <p className="text-xs font-bold uppercase tracking-widest text-zinc-500">
                        Winter Session 2026 • 4 Locations
                    </p>
                </header>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {locationStats.map((loc) => {
                        const theme = getLocationTheme(loc.name);
                        return (
                            <button 
                                key={loc.name}
                                onClick={() => { setSelectedLocation(loc.name); setViewState('classes'); }}
                                className={`bg-zinc-900 border ${theme.border} p-8 rounded-3xl text-left group hover:bg-zinc-800 transition-all shadow-2xl relative overflow-hidden`}
                            >
                                {/* Subtle background icon */}
                                <div className={`absolute -right-4 -bottom-4 opacity-5 group-hover:opacity-10 transition-opacity ${theme.color} rotate-12`}>
                                    {React.cloneElement(theme.icon as React.ReactElement, { size: 140 })}
                                </div>

                                <div className="flex items-start justify-between mb-6 relative z-10">
                                    <div className={`p-4 ${theme.bg} ${theme.color} rounded-2xl ${theme.hover} group-hover:text-white transition-all`}>
                                        {theme.icon}
                                    </div>
                                    <div className="p-2 bg-black/20 rounded-full text-zinc-600 group-hover:text-white transition-colors">
                                        <ChevronRight size={20} />
                                    </div>
                                </div>
                                
                                <div className="relative z-10">
                                    <h3 className="text-xl font-black text-white mb-2 tracking-tight">{loc.name}</h3>
                                    <div className="flex items-center gap-4 text-xs font-bold uppercase tracking-widest text-zinc-500">
                                        <span className="flex items-center gap-1.5"><Church size={12}/> {loc.count} Classes</span>
                                        <span className="flex items-center gap-1.5"><Users size={12}/> {loc.students} Students</span>
                                    </div>
                                </div>
                            </button>
                        );
                    })}
                </div>
            </div>
        )}

        {/* VIEW 2: CLASS LIST (Location Specific) */}
        {viewState === 'classes' && (
            <div className="flex flex-col h-full animate-in slide-in-from-right duration-500">
                <div className="p-8 pb-4 shrink-0 bg-zinc-950 z-10">
                    <button onClick={() => setViewState('locations')} className="flex items-center gap-2 text-zinc-500 hover:text-white transition-colors mb-6 text-[10px] font-black uppercase tracking-[0.2em]">
                        <ArrowLeft size={14}/> Back to Hub
                    </button>
                    
                    <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-8">
                        <div>
                            <h1 className="text-4xl font-black uppercase italic tracking-tighter text-white mb-1">
                                {selectedLocation}
                            </h1>
                            <p className="text-xs font-bold text-zinc-500 uppercase tracking-widest flex items-center gap-2">
                                <MapPin size={12} className={getLocationTheme(selectedLocation).color}/> 
                                Active Roster
                            </p>
                        </div>

                        <div className="relative w-full md:w-80">
                            <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-600"/>
                            <input 
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                placeholder="Search classes or teachers..."
                                className="w-full bg-zinc-900 border border-white/5 rounded-2xl pl-12 pr-4 py-3 text-sm focus:border-white/20 outline-none placeholder:text-zinc-700 transition-all shadow-inner"
                            />
                        </div>
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto px-8 pb-8 space-y-4 custom-scrollbar">
                    {filteredClasses.map((c: any) => (
                        <button 
                            key={c.id}
                            onClick={() => { setSelectedClass(c); setViewState('attendance'); }}
                            className="w-full bg-zinc-900 border border-white/5 p-6 rounded-3xl flex justify-between items-center group hover:bg-zinc-800 hover:border-white/10 transition-all text-left shadow-lg"
                        >
                            <div className="flex-1 min-w-0 pr-4">
                                <div className="flex items-center gap-2 mb-2">
                                    <span className="text-[10px] font-black uppercase tracking-widest bg-black/40 text-zinc-500 px-2 py-1 rounded-lg border border-white/5">
                                        {c.day}s
                                    </span>
                                    <span className={`text-[10px] font-black uppercase tracking-widest bg-blue-500/10 ${getLocationTheme(selectedLocation).color} px-2 py-1 rounded-lg border border-blue-500/10`}>
                                        Ages {c.ages}
                                    </span>
                                </div>
                                <div className="font-black text-white text-xl leading-tight mb-2 truncate group-hover:text-blue-400 transition-colors">{c.name}</div>
                                <div className="text-[11px] font-bold text-zinc-500 uppercase flex items-center gap-4">
                                    <span className="flex items-center gap-1.5"><Clock size={13} className="text-zinc-700"/> {c.time}</span>
                                    <span className="flex items-center gap-1.5"><Users size={13} className="text-zinc-700"/> {c.teacher}</span>
                                </div>
                            </div>
                            <div className="flex flex-col items-end gap-1">
                                <div className="text-3xl font-black text-white leading-none">{c.enrolled}</div>
                                <div className="text-[9px] uppercase font-black text-zinc-700 tracking-tighter">Students</div>
                            </div>
                        </button>
                    ))}
                </div>
            </div>
        )}

        {/* VIEW 3: ATTENDANCE (Teacher View) */}
        {viewState === 'attendance' && selectedClass && (
            <div className="flex flex-col h-full animate-in slide-in-from-right duration-500">
                <header className="h-20 border-b border-white/5 flex items-center justify-between px-8 bg-zinc-950 shrink-0">
                    <button onClick={() => setViewState('classes')} className="flex items-center gap-3 text-zinc-500 hover:text-white transition-colors pr-6">
                        <ArrowLeft size={20}/> 
                        <span className="text-[10px] font-black uppercase tracking-widest hidden sm:inline">Back</span>
                    </button>
                    
                    <div className="text-center">
                        <div className="text-lg font-black uppercase italic tracking-tighter text-white">{selectedClass.name}</div>
                        <div className="text-[10px] text-zinc-600 uppercase font-black flex justify-center items-center gap-3 mt-1">
                            <span className="flex items-center gap-1.5"><Calendar size={12}/> {new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
                            <div className="w-1 h-1 rounded-full bg-zinc-800"/>
                            <span>{selectedClass.enrolled} Enrolled</span>
                        </div>
                    </div>
                    
                    <button className="bg-emerald-600 hover:bg-emerald-500 text-white px-6 py-2.5 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all shadow-xl shadow-emerald-900/20 active:scale-95">
                        Post Attendance
                    </button>
                </header>

                <div className="flex-1 overflow-y-auto p-8 space-y-3 custom-scrollbar bg-zinc-950">
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
        <div className={`p-4 rounded-3xl border transition-all group flex items-center justify-between ${status === 'Absent' ? 'bg-red-950/20 border-red-500/30 shadow-[0_0_20px_rgba(239,68,68,0.05)]' : 'bg-zinc-900/50 border-white/5 hover:border-white/10'}`}>
            <div className="flex items-center gap-4">
                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center font-black text-sm transition-all shadow-lg ${status === 'Absent' ? 'bg-red-500/20 text-red-500' : 'bg-zinc-800 text-zinc-500 group-hover:bg-zinc-700 group-hover:text-zinc-300'}`}>
                    {student.name.charAt(0)}
                </div>
                <div>
                    <div className={`font-black text-base transition-colors ${status === 'Absent' ? 'text-red-200' : 'text-zinc-200'}`}>{student.name}</div>
                    <div className="text-[10px] font-black uppercase tracking-widest text-zinc-600">
                        {status === 'Absent' ? 'Marked Absent' : 'Present'}
                    </div>
                </div>
            </div>
            
            <div className="flex bg-black/40 rounded-2xl p-1.5 gap-1.5 border border-white/5">
                <AttendanceButton active={status === 'Present'} type="Present" onClick={() => setStatus('Present')} icon={<CheckCircle2 size={20}/>} color="bg-emerald-600" />
                <AttendanceButton active={status === 'Late'} type="Late" onClick={() => setStatus('Late')} icon={<Clock size={20}/>} color="bg-amber-600" />
                <AttendanceButton active={status === 'Absent'} type="Absent" onClick={() => setStatus('Absent')} icon={<XCircle size={20}/>} color="bg-red-600" />
            </div>
        </div>
    )
}

function AttendanceButton({ active, onClick, icon, color }: any) {
    return (
        <button 
            onClick={onClick} 
            className={`p-2.5 rounded-xl transition-all ${active ? `${color} text-white shadow-lg` : 'text-zinc-700 hover:text-zinc-400 hover:bg-white/5'}`}
        >
            {icon}
        </button>
    )
}