"use client";

import React, { useState, useMemo } from 'react';
import { 
  Users, Search, ArrowLeft, 
  Building2, Waves, Compass, Anchor, Navigation, 
  Archive, Filter, X, AlertTriangle, CalendarDays,
  Map as MapIcon, LayoutGrid
} from 'lucide-react';

// --- MOCK CONFIG ---
const SESSIONS = [
    { id: 'winter2026', label: 'Winter 2026', current: true },
    { id: 'fall2025', label: 'Fall 2025', current: false },
    { id: 'spring2025', label: 'Spring 2025', current: false },
];

const AGE_GROUPS = ["5-8", "8-12", "13-18"];
const DAYS = ["Monday", "Tuesday", "Thursday"];

// --- 🗺️ VENUE MAP DATA ---
// Updated col/row logic for a Horizontal Top-Bar Layout
const VENUE_LAYOUTS: Record<string, any[]> = {
    "River of Life": [
        { id: "main", name: "Sanctuary", capacity: 400, type: "large", col: "col-span-2 md:col-span-1" },
        { id: "lobby", name: "Lobby / Check-In", capacity: 50, type: "common", col: "col-span-2 md:col-span-1" },
        { id: "101", name: "Room 101", capacity: 20, type: "small", col: "col-span-1" },
        { id: "102", name: "Room 102", capacity: 20, type: "small", col: "col-span-1" },
        { id: "hall", name: "Fellowship Hall", capacity: 100, type: "medium", col: "col-span-2 md:col-span-1" },
    ],
    "Hope Presbyterian Church": [
        { id: "gym", name: "Gymnasium", capacity: 200, type: "large", col: "col-span-2 md:col-span-2" },
        { id: "204", name: "Classroom 204", capacity: 15, type: "small", col: "col-span-1" },
        { id: "205", name: "Classroom 205", capacity: 15, type: "small", col: "col-span-1" },
    ]
};

export default function ClassManager({ classes }: any) {
  const [viewState, setViewState] = useState<'locations' | 'classes'>('locations');
  const [selectedLocation, setSelectedLocation] = useState<string>("");
  const [selectedClass, setSelectedClass] = useState<any>(null); // Kept for future attendance logic
  
  // Filters
  const [currentSession, setCurrentSession] = useState(SESSIONS[0]); 
  const [filterDay, setFilterDay] = useState<string | null>(null);
  const [filterAge, setFilterAge] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");

  // Map Interaction
  const [hoveredClassId, setHoveredClassId] = useState<number | null>(null);

  // --- THEME ENGINE ---
  const getLocationTheme = (name: string) => {
    const n = name?.toLowerCase() || "";
    if (n.includes('river of life')) return { icon: <Waves size={24} />, color: 'text-cyan-400', bg: 'bg-cyan-500/10', border: 'border-cyan-500/20' };
    if (n.includes('hope')) return { icon: <Compass size={24} />, color: 'text-purple-400', bg: 'bg-purple-500/10', border: 'border-purple-500/20' };
    if (n.includes('river club')) return { icon: <Anchor size={24} />, color: 'text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-500/20' };
    if (n.includes('highway')) return { icon: <Navigation size={24} />, color: 'text-amber-400', bg: 'bg-amber-500/10', border: 'border-amber-500/20' };
    return { icon: <Building2 size={24} />, color: 'text-blue-400', bg: 'bg-blue-500/10', border: 'border-blue-500/20' };
  };

  // Mock assignment of classes to rooms
  const getRoomForClass = (classId: number, location: string) => {
      const rooms = VENUE_LAYOUTS[location];
      if (!rooms || rooms.length === 0) return null;
      const index = classId % rooms.length;
      return rooms[index];
  };

  const visibleClasses = useMemo(() => {
      if (currentSession.id !== 'winter2026') return []; 
      return classes.filter((c:any) => {
          if (c.location !== selectedLocation) return false;
          const matchesSearch = c.name.toLowerCase().includes(searchTerm.toLowerCase()) || c.teacher.toLowerCase().includes(searchTerm.toLowerCase());
          const matchesDay = filterDay ? c.day === filterDay : true;
          const matchesAge = filterAge ? c.ages.includes(filterAge) : true;
          return matchesSearch && matchesDay && matchesAge;
      });
  }, [classes, selectedLocation, searchTerm, currentSession, filterDay, filterAge]);

  const locationStats = useMemo(() => {
    if (currentSession.id !== 'winter2026') return [];
    const stats: Record<string, { count: number, students: number }> = {};
    const globalFiltered = classes.filter((c:any) => {
         const matchesDay = filterDay ? c.day === filterDay : true;
         const matchesAge = filterAge ? c.ages.includes(filterAge) : true;
         return matchesDay && matchesAge;
    });
    globalFiltered.forEach((c: any) => {
        const loc = c.location || "Unknown Location";
        if (!stats[loc]) stats[loc] = { count: 0, students: 0 };
        stats[loc].count++;
        stats[loc].students += c.enrolled;
    });
    return Object.entries(stats).map(([name, data]) => ({ name, ...data }));
  }, [classes, currentSession, filterDay, filterAge]);

  return (
    <div className="flex flex-col h-full bg-zinc-950 text-white font-sans selection:bg-blue-500/30">
        
        {/* VIEW 1: CAMPUS HUB */}
        {viewState === 'locations' && (
            <div className="p-8 max-w-6xl mx-auto w-full animate-in fade-in duration-500">
                <header className="mb-8 flex flex-col xl:flex-row xl:items-end justify-between gap-6">
                    <div>
                        <h1 className="text-4xl font-black uppercase italic tracking-tighter text-white flex items-center gap-3">
                            Class Hub 
                            {!currentSession.current && <span className="px-3 py-1 bg-amber-900/30 text-amber-500 text-xs rounded-full not-italic tracking-normal font-bold flex items-center gap-1 border border-amber-500/20"><Archive size={12}/> Archive</span>}
                        </h1>
                        <p className="text-xs font-bold uppercase tracking-widest text-zinc-500 mt-1">
                            {currentSession.current ? 'Live Enrollment & Logistics' : 'Historical Data Viewer'}
                        </p>
                    </div>

                    <div className="flex flex-col md:flex-row gap-4 items-start md:items-center">
                        {/* SMART FILTERS */}
                        <div className="flex items-center gap-2 bg-zinc-900 p-1 rounded-xl border border-white/5">
                            <div className="px-3 text-zinc-500"><Filter size={14}/></div>
                            <div className="flex gap-1 border-r border-white/10 pr-2">
                                {DAYS.map(day => (
                                    <button key={day} onClick={() => setFilterDay(filterDay === day ? null : day)} className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase transition-all ${filterDay === day ? 'bg-blue-600 text-white' : 'text-zinc-500 hover:text-zinc-300'}`}>{day.substring(0, 3)}</button>
                                ))}
                            </div>
                            <div className="flex gap-1 pl-2">
                                {AGE_GROUPS.map(age => (
                                    <button key={age} onClick={() => setFilterAge(filterAge === age ? null : age)} className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase transition-all ${filterAge === age ? 'bg-emerald-600 text-white' : 'text-zinc-500 hover:text-zinc-300'}`}>{age}</button>
                                ))}
                            </div>
                            {(filterDay || filterAge) && <button onClick={() => {setFilterDay(null); setFilterAge(null)}} className="px-2 text-zinc-500 hover:text-red-400"><X size={14} /></button>}
                        </div>

                        {/* SESSION SWITCHER */}
                        <div className="relative group z-20">
                            <button className="flex items-center gap-2 bg-zinc-900 border border-white/10 px-4 py-2.5 rounded-xl text-sm font-bold text-zinc-300 hover:text-white hover:border-white/20 transition-all min-w-[140px] justify-between">
                                <span className="flex items-center gap-2"><CalendarDays size={16} className="text-blue-500"/> {currentSession.label}</span>
                            </button>
                            <div className="absolute top-full right-0 mt-2 w-48 bg-zinc-900 border border-white/10 rounded-xl shadow-xl overflow-hidden hidden group-hover:block animate-in fade-in slide-in-from-top-2">
                                {SESSIONS.map(s => (
                                    <button key={s.id} onClick={() => setCurrentSession(s)} className={`w-full text-left px-4 py-3 text-xs font-bold uppercase hover:bg-white/5 flex justify-between ${currentSession.id === s.id ? 'text-blue-400 bg-blue-500/10' : 'text-zinc-400'}`}>{s.label}{s.current && <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"/>}</button>
                                ))}
                            </div>
                        </div>
                    </div>
                </header>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {locationStats.map((loc: any) => {
                        const theme = getLocationTheme(loc.name);
                        return (
                            <button key={loc.name} onClick={() => { setSelectedLocation(loc.name); setViewState('classes'); }}
                                className={`bg-zinc-900 border ${theme.border} p-8 rounded-3xl text-left group hover:bg-zinc-800 transition-all shadow-2xl relative overflow-hidden h-48 flex flex-col justify-between`}>
                                <div className={`absolute -right-4 -bottom-4 opacity-5 group-hover:opacity-10 transition-opacity ${theme.color} rotate-12`}>{React.cloneElement(theme.icon as React.ReactElement, { size: 140 })}</div>
                                <div className="flex items-start justify-between relative z-10">
                                    <div className={`p-3 ${theme.bg} ${theme.color} rounded-2xl group-hover:bg-white group-hover:text-black transition-colors`}>{theme.icon}</div>
                                    <div className="text-right">
                                        <div className="text-3xl font-black text-white">{loc.count}</div>
                                        <div className="text-[9px] font-bold uppercase text-zinc-500 tracking-wider">Classes</div>
                                    </div>
                                </div>
                                <div className="relative z-10">
                                    <h3 className="text-xl font-black text-white mb-1 tracking-tight truncate">{loc.name}</h3>
                                    <div className="flex items-center gap-3 text-xs font-bold uppercase tracking-widest text-zinc-500 group-hover:text-zinc-300">
                                        <span className="flex items-center gap-1.5"><MapIcon size={12}/> View Map</span>
                                        <span className="w-1 h-1 rounded-full bg-zinc-700"/>
                                        <span className="flex items-center gap-1.5"><Users size={12}/> {loc.students} Students</span>
                                    </div>
                                </div>
                            </button>
                        );
                    })}
                </div>
            </div>
        )}

        {/* VIEW 2: CLASS LIST & HEADS-UP MAP */}
        {viewState === 'classes' && (
             <div className="flex flex-col h-full animate-in slide-in-from-right duration-500">
                <div className="p-6 shrink-0 bg-zinc-900/50 border-b border-white/5 z-20 backdrop-blur-xl">
                    <div className="flex justify-between items-start mb-4">
                        <button onClick={() => setViewState('locations')} className="flex items-center gap-2 text-zinc-500 hover:text-white transition-colors text-[10px] font-black uppercase tracking-[0.2em]">
                            <ArrowLeft size={14}/> Back to Hub
                        </button>
                        <div className="flex gap-2">
                            <span className="px-2 py-1 bg-zinc-800 text-zinc-400 text-[10px] font-bold uppercase rounded border border-white/5">{currentSession.label}</span>
                            {filterDay && <span className="px-2 py-1 bg-blue-900/30 text-blue-400 text-[10px] font-bold uppercase rounded border border-blue-500/20">{filterDay}s Only</span>}
                        </div>
                    </div>
                    
                    <div className="flex flex-col lg:flex-row gap-6">
                        <div className="lg:w-1/3">
                            <h1 className="text-3xl font-black uppercase italic tracking-tighter text-white mb-4">{selectedLocation}</h1>
                            <div className="relative w-full">
                                <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-600"/>
                                <input value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} placeholder="Filter classes..." className="w-full bg-black/40 border border-white/5 rounded-xl pl-12 pr-4 py-2 text-sm focus:border-white/20 outline-none transition-all placeholder:text-zinc-700"/>
                            </div>
                        </div>

                        {/* --- 🗺️ HEADS-UP VENUE MAP --- */}
                        <div className="flex-1 bg-black/20 rounded-xl border border-white/5 p-4 overflow-x-auto">
                            <div className="flex items-center gap-2 mb-3 text-[10px] font-bold uppercase text-zinc-500 tracking-widest">
                                <LayoutGrid size={12} className="text-blue-500"/> Facility Map
                            </div>
                            
                            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-3 min-w-[500px]">
                                {(VENUE_LAYOUTS[selectedLocation] || []).map((room) => {
                                    const classesInRoom = visibleClasses.filter((c:any) => getRoomForClass(c.id, selectedLocation)?.id === room.id);
                                    const totalStudents = classesInRoom.reduce((acc: number, c:any) => acc + c.enrolled, 0);
                                    const isHighlighted = hoveredClassId && getRoomForClass(hoveredClassId, selectedLocation)?.id === room.id;
                                    const isFull = totalStudents >= room.capacity;
                                    
                                    return (
                                        <div key={room.id} className={`
                                            p-3 rounded-lg border transition-all duration-300 relative overflow-hidden group
                                            ${room.col} 
                                            ${isHighlighted ? 'bg-blue-600 border-blue-400 scale-105 shadow-xl z-10' : 'bg-zinc-800/50 border-white/5 hover:border-white/10'}
                                            ${isFull && !isHighlighted ? 'border-red-500/30 bg-red-900/10' : ''}
                                        `}>
                                            <div className="flex justify-between items-start mb-2">
                                                <span className={`text-[10px] font-black uppercase tracking-tight leading-none ${isHighlighted ? 'text-white' : 'text-zinc-400'}`}>{room.name}</span>
                                                {isFull && <AlertTriangle size={10} className="text-red-500"/>}
                                            </div>
                                            
                                            <div className="flex items-end justify-between">
                                                <div className="flex flex-col">
                                                    <span className={`text-lg font-black leading-none ${isHighlighted ? 'text-white' : 'text-zinc-300'}`}>{totalStudents}</span>
                                                    <span className={`text-[8px] font-bold uppercase ${isHighlighted ? 'text-blue-200' : 'text-zinc-600'}`}>Capacity {room.capacity}</span>
                                                </div>
                                                {/* Mini Bar */}
                                                <div className="w-1.5 h-6 bg-black/40 rounded-full overflow-hidden flex flex-col justify-end">
                                                    <div className={`w-full ${isFull ? 'bg-red-500' : 'bg-emerald-500'}`} style={{ height: `${Math.min((totalStudents / room.capacity) * 100, 100)}%` }} />
                                                </div>
                                            </div>
                                        </div>
                                    )
                                })}
                                {(VENUE_LAYOUTS[selectedLocation] || []).length === 0 && <div className="text-xs text-zinc-500 italic col-span-full py-4 text-center">No map data.</div>}
                            </div>
                        </div>
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto px-6 pb-8 space-y-3 custom-scrollbar pt-4">
                    {visibleClasses.length === 0 && (
                        <div className="p-12 text-center text-zinc-500 border border-dashed border-white/10 rounded-3xl">No classes found.</div>
                    )}
                    {visibleClasses.map((c: any) => {
                        const room = getRoomForClass(c.id, selectedLocation);
                        const isOverCapacity = room && c.enrolled > room.capacity;

                        return (
                            <button key={c.id} 
                                onClick={() => { setSelectedClass(c); /* Add attendance logic here if needed */ }}
                                onMouseEnter={() => setHoveredClassId(c.id)}
                                onMouseLeave={() => setHoveredClassId(null)}
                                className={`w-full bg-zinc-900 border p-4 rounded-2xl flex justify-between items-center group transition-all text-left relative overflow-hidden cursor-default
                                    ${hoveredClassId === c.id ? 'border-blue-500/50 bg-zinc-800' : 'border-white/5 hover:bg-zinc-800'}
                                `}
                            >
                                <div className="flex-1">
                                    <div className="flex items-center gap-3 mb-1">
                                        <span className="text-[10px] font-black uppercase tracking-widest text-zinc-500 bg-black/20 px-2 py-0.5 rounded">{c.day} • {c.time}</span>
                                        {/* Room Badge */}
                                        <span className={`text-[10px] font-mono border px-1.5 py-0.5 rounded flex items-center gap-1 ${isOverCapacity ? 'text-red-400 border-red-500/30 bg-red-900/10' : 'text-zinc-400 border-white/10 bg-zinc-950'}`}>
                                            <MapIcon size={10}/> {room ? room.name : "Unassigned"}
                                        </span>
                                    </div>
                                    <div className="font-black text-white text-lg group-hover:text-blue-400 transition-colors">{c.name}</div>
                                    <div className="text-[10px] font-bold text-zinc-500 uppercase mt-0.5 flex items-center gap-2">
                                        <span className="text-zinc-400">{c.teacher}</span>
                                        <span className="w-1 h-1 rounded-full bg-zinc-700"/>
                                        <span>Ages {c.ages}</span>
                                    </div>
                                </div>
                                <div className="text-right pl-4 border-l border-white/5 ml-4">
                                    <div className={`text-2xl font-black ${isOverCapacity ? 'text-red-500' : 'text-white'}`}>{c.enrolled}</div>
                                    <div className="text-[8px] uppercase font-black text-zinc-700">Students</div>
                                </div>
                            </button>
                        );
                    })}
                </div>
            </div>
        )}
    </div>
  );
}