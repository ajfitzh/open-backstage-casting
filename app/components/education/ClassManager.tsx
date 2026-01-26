"use client";

import React, { useState, useMemo } from 'react';
import { 
  CheckCircle2, XCircle, Clock, 
  ChevronRight, Search, ArrowLeft, Users, 
  Building2, Waves, Compass, Anchor, Navigation, 
  Church, Star, LayoutDashboard, ListChecks,
  CalendarDays, Archive
} from 'lucide-react';

// Mock Seasons for the Demo
const SESSIONS = [
    { id: 'winter2026', label: 'Winter 2026', current: true },
    { id: 'fall2025', label: 'Fall 2025', current: false },
    { id: 'spring2025', label: 'Spring 2025', current: false },
];

export default function ClassManager({ classes, people }: any) {
  const [viewState, setViewState] = useState<'locations' | 'classes' | 'attendance'>('locations');
  const [selectedLocation, setSelectedLocation] = useState<string>("");
  const [selectedClass, setSelectedClass] = useState<any>(null);
  const [searchTerm, setSearchTerm] = useState("");
  
  // --- NEW: SESSION STATE ---
  const [currentSession, setCurrentSession] = useState(SESSIONS[0]); // Default to current

  const [selectedWeek, setSelectedWeek] = useState(1);
  const [showSummary, setShowSummary] = useState(false);
  const [attendanceRecords, setAttendanceRecords] = useState<Record<number, Record<string, string>>>({});

  const handleStatusChange = (studentId: string, status: string) => {
    if (!currentSession.current) {
        alert("History Mode: Cannot modify attendance for past seasons.");
        return;
    }
    setAttendanceRecords(prev => ({
      ...prev,
      [selectedWeek]: {
        ...(prev[selectedWeek] || {}),
        [studentId]: status
      }
    }));
  };

  // --- THEME ENGINE ---
  const getLocationTheme = (name: string) => {
    const n = name?.toLowerCase() || "";
    if (n.includes('river of life')) return { icon: <Waves size={24} />, color: 'text-cyan-400', bg: 'bg-cyan-500/10', border: 'border-cyan-500/20' };
    if (n.includes('hope')) return { icon: <Compass size={24} />, color: 'text-purple-400', bg: 'bg-purple-500/10', border: 'border-purple-500/20' };
    if (n.includes('river club')) return { icon: <Anchor size={24} />, color: 'text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-500/20' };
    if (n.includes('highway')) return { icon: <Navigation size={24} />, color: 'text-amber-400', bg: 'bg-amber-500/10', border: 'border-amber-500/20' };
    return { icon: <Building2 size={24} />, color: 'text-blue-400', bg: 'bg-blue-500/10', border: 'border-blue-500/20' };
  };

  const filteredClasses = useMemo(() => {
      // In a real app, you'd filter by session ID here. 
      // For the demo, we just return the mock classes if "Winter 2026" is selected, 
      // or an empty/different list for others to show the UI change.
      if (currentSession.id !== 'winter2026') return []; 
      
      return classes.filter((c:any) => 
          c.location === selectedLocation &&
          (c.name.toLowerCase().includes(searchTerm.toLowerCase()) || c.teacher.toLowerCase().includes(searchTerm.toLowerCase()))
      );
  }, [classes, selectedLocation, searchTerm, currentSession]);

  const locationStats = useMemo(() => {
    // If viewing history (and mock data isn't there), show zeros or mock history data
    if (currentSession.id !== 'winter2026') {
        return [
            { name: "River of Life", count: 0, students: 0 },
            { name: "Hope Presbyterian Church", count: 0, students: 0 },
        ];
    }

    const stats: Record<string, { count: number, students: number }> = {};
    classes.forEach((c: any) => {
        const loc = c.location || "Unknown Location";
        if (!stats[loc]) stats[loc] = { count: 0, students: 0 };
        stats[loc].count++;
        stats[loc].students += c.enrolled;
    });
    return Object.entries(stats).map(([name, data]) => ({ name, ...data }));
  }, [classes, currentSession]);

  // --- RENDER ---
  return (
    <div className="flex flex-col h-full bg-zinc-950 text-white font-sans selection:bg-blue-500/30">
        
        {/* VIEW 1: CAMPUS HUB */}
        {viewState === 'locations' && (
            <div className="p-8 max-w-5xl mx-auto w-full animate-in fade-in duration-500">
                <header className="mb-10 flex flex-col md:flex-row md:items-end justify-between gap-4">
                    <div>
                        <h1 className="text-4xl font-black uppercase italic tracking-tighter text-white flex items-center gap-3">
                            Class Hub 
                            {!currentSession.current && <span className="px-3 py-1 bg-amber-900/30 text-amber-500 text-xs rounded-full not-italic tracking-normal font-bold flex items-center gap-1 border border-amber-500/20"><Archive size={12}/> {currentSession.label} Archive</span>}
                        </h1>
                        <p className="text-xs font-bold uppercase tracking-widest text-zinc-500 mt-1">
                            {currentSession.current ? 'Live Tracking System' : 'Read-Only Historical View'}
                        </p>
                    </div>

                    {/* SESSION SWITCHER */}
                    <div className="relative group z-20">
                        <button className="flex items-center gap-2 bg-zinc-900 border border-white/10 px-4 py-2 rounded-xl text-sm font-bold text-zinc-300 hover:text-white hover:border-white/20 transition-all">
                            <CalendarDays size={16} className="text-blue-500"/>
                            {currentSession.label}
                        </button>
                        <div className="absolute top-full right-0 mt-2 w-48 bg-zinc-900 border border-white/10 rounded-xl shadow-xl overflow-hidden hidden group-hover:block animate-in fade-in slide-in-from-top-2">
                            {SESSIONS.map(s => (
                                <button 
                                    key={s.id}
                                    onClick={() => setCurrentSession(s)}
                                    className={`w-full text-left px-4 py-3 text-xs font-bold uppercase hover:bg-white/5 flex justify-between ${currentSession.id === s.id ? 'text-blue-400 bg-blue-500/10' : 'text-zinc-400'}`}
                                >
                                    {s.label}
                                    {s.current && <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"/>}
                                </button>
                            ))}
                        </div>
                    </div>
                </header>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {locationStats.map((loc) => {
                        const theme = getLocationTheme(loc.name);
                        return (
                            <button key={loc.name} onClick={() => { setSelectedLocation(loc.name); setViewState('classes'); }}
                                className={`bg-zinc-900 border ${theme.border} p-8 rounded-3xl text-left group hover:bg-zinc-800 transition-all shadow-2xl relative overflow-hidden`}>
                                <div className={`absolute -right-4 -bottom-4 opacity-5 group-hover:opacity-10 transition-opacity ${theme.color} rotate-12`}>
                                    {React.cloneElement(theme.icon as React.ReactElement, { size: 140 })}
                                </div>
                                <div className="flex items-start justify-between mb-6 relative z-10">
                                    <div className={`p-4 ${theme.bg} ${theme.color} rounded-2xl group-hover:bg-white group-hover:text-black transition-colors`}>{theme.icon}</div>
                                    <ChevronRight size={20} className="text-zinc-600 group-hover:translate-x-1 transition-transform" />
                                </div>
                                <h3 className="text-xl font-black text-white mb-2 tracking-tight">{loc.name}</h3>
                                <div className="flex items-center gap-4 text-xs font-bold uppercase tracking-widest text-zinc-500 group-hover:text-zinc-400">
                                    <span className="flex items-center gap-1.5"><Church size={12}/> {loc.count} Classes</span>
                                    <span className="flex items-center gap-1.5"><Users size={12}/> {loc.students} Students</span>
                                </div>
                            </button>
                        );
                    })}
                </div>
            </div>
        )}

        {/* VIEW 2 & 3: Just added the session prop passing, keeping UI same as before... */}
        {/* For brevity, assume the rest of the file logic handles the viewState 'classes' and 'attendance' 
            exactly as your previous file, just using the `filteredClasses` calculated above. 
            I am omitting the duplicate code here to keep the answer clean, but in your file, 
            keep the rest of the logic! 
        */}
        
        {viewState === 'classes' && (
             <div className="flex flex-col h-full animate-in slide-in-from-right duration-500">
                <div className="p-8 pb-4 shrink-0">
                    <button onClick={() => setViewState('locations')} className="flex items-center gap-2 text-zinc-500 hover:text-white transition-colors mb-6 text-[10px] font-black uppercase tracking-[0.2em]">
                        <ArrowLeft size={14}/> Back to Hub
                    </button>
                    <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
                        <div>
                            <h1 className="text-4xl font-black uppercase italic tracking-tighter text-white">{selectedLocation}</h1>
                            <span className="text-xs font-bold text-blue-500 uppercase tracking-widest">{currentSession.label}</span>
                        </div>
                        <div className="relative w-full md:w-80">
                            <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-600"/>
                            <input value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} placeholder="Search classes..." className="w-full bg-zinc-900 border border-white/5 rounded-2xl pl-12 pr-4 py-3 text-sm focus:border-white/20 outline-none transition-all placeholder:text-zinc-700"/>
                        </div>
                    </div>
                </div>
                {/* ... existing list logic ... */}
                <div className="flex-1 overflow-y-auto px-8 pb-8 space-y-4 no-scrollbar">
                    {filteredClasses.length === 0 && (
                        <div className="p-12 text-center text-zinc-500 border border-dashed border-white/10 rounded-3xl">
                            No classes found for {currentSession.label} in this location.
                        </div>
                    )}
                    {filteredClasses.map((c: any) => (
                        <button key={c.id} onClick={() => { setSelectedClass(c); setViewState('attendance'); setShowSummary(false); }}
                            className="w-full bg-zinc-900 border border-white/5 p-6 rounded-3xl flex justify-between items-center group hover:bg-zinc-800 transition-all text-left">
                            <div className="flex-1">
                                <div className="text-[10px] font-black uppercase tracking-widest text-zinc-500 mb-1">{c.day}s • {c.time}</div>
                                <div className="font-black text-white text-xl group-hover:text-blue-400 transition-colors">{c.name}</div>
                                <div className="text-[11px] font-bold text-zinc-600 uppercase mt-1">{c.teacher}</div>
                            </div>
                            <div className="text-right">
                                <div className="text-3xl font-black text-white">{c.enrolled}</div>
                                <div className="text-[9px] uppercase font-black text-zinc-700">Students</div>
                            </div>
                        </button>
                    ))}
                </div>
            </div>
        )}

        {/* View 3 (Attendance) remains effectively the same, just utilizing the `handleStatusChange` guard clause */}
        {viewState === 'attendance' && selectedClass && (
             <div className="flex flex-col h-full animate-in slide-in-from-right duration-300">
                 {/* ... header logic ... */}
                 <header className="pt-8 px-8 bg-zinc-950 shrink-0 border-b border-white/5">
                    <div className="flex items-center justify-between mb-8">
                        <button onClick={() => setViewState('classes')} className="text-zinc-500 hover:text-white transition-colors">
                            <ArrowLeft size={24}/>
                        </button>
                        <div className="text-center">
                            <h2 className="text-2xl font-black uppercase italic tracking-tighter leading-none">{selectedClass.name}</h2>
                            <p className="text-[9px] text-zinc-500 font-bold uppercase tracking-[0.2em] mt-2">
                                {currentSession.label} • {showSummary ? "Overview" : `Week ${selectedWeek}`}
                            </p>
                        </div>
                        <button onClick={() => setShowSummary(!showSummary)} className={`flex items-center gap-2 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all border ${showSummary ? 'bg-indigo-500/10 border-indigo-500/30 text-indigo-400' : 'bg-zinc-900 border-white/10 text-zinc-400'}`}>
                            {showSummary ? <ListChecks size={14}/> : <LayoutDashboard size={14}/>}
                            {showSummary ? "Attendance" : "Summary"}
                        </button>
                    </div>
                    {/* ... week selector ... */}
                 </header>
                 {/* ... roster list ... */}
                 <div className="flex-1 overflow-y-auto p-8 space-y-3 bg-zinc-950 no-scrollbar">
                    {/* Reuse your existing StudentSummaryRow / AttendanceRow components here */}
                    {/* If !currentSession.current, maybe disable the buttons visually? */}
                    {!currentSession.current && <div className="mb-4 bg-amber-900/20 border border-amber-500/20 p-3 rounded-xl text-center text-amber-500 text-xs font-bold uppercase tracking-widest">Read Only Mode: Past Session</div>}
                 </div>
             </div>
        )}
    </div>
  );
}