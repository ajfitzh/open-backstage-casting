"use client";

import React, { useState, useMemo } from 'react';
import { 
  Users, ChevronRight, Search, ArrowLeft, 
  Building2, Waves, Compass, Anchor, Navigation, 
  Archive, Filter, X, AlertTriangle, Map, CalendarDays,
  Church, Layout
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
// NOTE: These keys must match your baserow "Location" strings exactly
const VENUE_LAYOUTS: Record<string, any[]> = {
    "River of Life": [
        { id: "main", name: "Sanctuary", capacity: 400, col: "col-span-2", row: "row-span-2" },
        { id: "lobby", name: "Lobby / Check-In", capacity: 50, col: "col-span-2", row: "row-span-1" },
        { id: "101", name: "Room 101", capacity: 20, col: "col-span-1", row: "row-span-1" },
        { id: "102", name: "Room 102", capacity: 20, col: "col-span-1", row: "row-span-1" },
        { id: "hall", name: "Fellowship Hall", capacity: 100, col: "col-span-2", row: "row-span-1" },
    ],
    "Hope Presbyterian Church": [
        { id: "gym", name: "Gymnasium", capacity: 200, col: "col-span-2", row: "row-span-2" },
        { id: "204", name: "Classroom 204", capacity: 15, col: "col-span-1", row: "row-span-1" },
        { id: "205", name: "Classroom 205", capacity: 15, col: "col-span-1", row: "row-span-1" },
    ]
};

export default function ClassManager({ classes, people }: any) {
  const [viewState, setViewState] = useState<'locations' | 'classes'>('locations');
  const [selectedLocation, setSelectedLocation] = useState<string>("");
  
  // Filters
  const [currentSession, setCurrentSession] = useState(SESSIONS[0]); 
  const [filterDay, setFilterDay] = useState<string | null>(null);
  const [filterAge, setFilterAge] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");

  // Map Interaction
  const [hoveredClassId, setHoveredClassId] = useState<number | null>(null);
  const [showMobileMap, setShowMobileMap] = useState(false); // New Mobile Toggle

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
      // Deterministic pseudo-random assignment based on ID
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
                                        <span className="flex items-center gap-1.5"><Map size={12}/> View Map</span>
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

        {/* VIEW 2: CLASS LIST & VENUE MAP */}
        {viewState === 'classes' && (
             <div className="flex flex-col h-full animate-in slide-in-from-right duration-500">
                <div className="p-8 pb-4 shrink-0 bg-zinc-950 z-20">
                    <button onClick={() => setViewState('locations')} className="flex items-center gap-2 text-zinc-500 hover:text-white transition-colors mb-6 text-[10px] font-black uppercase tracking-[0.2em]">
                        <ArrowLeft size={14}/> Back to Hub
                    </button>
                    <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
                        <div>
                            <h1 className="text-4xl font-black uppercase italic tracking-tighter text-white">{selectedLocation}</h1>
                            <div className="flex gap-2 mt-2">
                                <span className="px-2 py-1 bg-zinc-800 text-zinc-400 text-[10px] font-bold uppercase rounded border border-white/5">{currentSession.label}</span>
                                {filterDay && <span className="px-2 py-1 bg-blue-900/30 text-blue-400 text-[10px] font-bold uppercase rounded border border-blue-500/20">{filterDay}s Only</span>}
                            </div>
                        </div>
                        <div className="flex gap-2 w-full md:w-auto">
                            <div className="relative w-full md:w-80">
                                <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-600"/>
                                <input value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} placeholder="Search classes..." className="w-full bg-zinc-900 border border-white/5 rounded-2xl pl-12 pr-4 py-3 text-sm focus:border-white/20 outline-none transition-all placeholder:text-zinc-700"/>
                            </div>
                            {/* MOBILE MAP TOGGLE */}
                            <button onClick={() => setShowMobileMap(!showMobileMap)} className="lg:hidden bg-zinc-800 p-3 rounded-2xl border border-white/5 text-zinc-400 hover:text-white">
                                <Layout size={20} />
                            </button>
                        </div>
                    </div>
                </div>

                <div className="flex-1 flex overflow-hidden relative">
                    {/* LEFT: LIST */}
                    <div className="flex-1 overflow-y-auto px-8 pb-8 space-y-4 custom-scrollbar">
                        {visibleClasses.length === 0 && (
                            <div className="p-12 text-center text-zinc-500 border border-dashed border-white/10 rounded-3xl">No classes found.</div>
                        )}
                        {visibleClasses.map((c: any) => {
                            const room = getRoomForClass(c.id, selectedLocation);
                            const isOverCapacity = room && c.enrolled > room.capacity;

                            return (
                                <div key={c.id} 
                                    onMouseEnter={() => setHoveredClassId(c.id)}
                                    onMouseLeave={() => setHoveredClassId(null)}
                                    className={`w-full bg-zinc-900 border p-6 rounded-3xl flex justify-between items-center group transition-all text-left relative overflow-hidden cursor-default
                                        ${hoveredClassId === c.id ? 'border-blue-500/50 bg-zinc-800' : 'border-white/5 hover:bg-zinc-800'}
                                    `}
                                >
                                    {/* Room Assignment Indicator */}
                                    <div className="absolute right-0 top-0 bg-zinc-800 text-[9px] font-mono text-zinc-500 px-2 py-1 rounded-bl-xl border-l border-b border-white/5">
                                        {room ? room.name : "Unassigned"}
                                    </div>

                                    <div className="flex-1">
                                        <div className="flex items-center gap-3 mb-1">
                                            <span className="text-[10px] font-black uppercase tracking-widest text-zinc-500 bg-black/20 px-2 py-0.5 rounded">{c.day} • {c.time}</span>
                                            {isOverCapacity && <span className="text-[9px] font-bold uppercase text-red-500 border border-red-500/20 px-1.5 rounded bg-red-500/10 flex items-center gap-1"><AlertTriangle size={10}/> Room Overflow</span>}
                                        </div>
                                        <div className="font-black text-white text-xl group-hover:text-blue-400 transition-colors">{c.name}</div>
                                        <div className="text-[11px] font-bold text-zinc-500 uppercase mt-1 flex items-center gap-2">
                                            <span className="text-zinc-400">{c.teacher}</span>
                                            <span className="w-1 h-1 rounded-full bg-zinc-700"/>
                                            <span>Ages {c.ages}</span>
                                        </div>
                                    </div>
                                    <div className="text-right pl-4">
                                        <div className={`text-3xl font-black ${isOverCapacity ? 'text-red-500' : 'text-white'}`}>{c.enrolled}</div>
                                        <div className="text-[9px] uppercase font-black text-zinc-700">Students</div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>

                    {/* RIGHT: VENUE MAP (Desktop: lg+, Mobile: Overlay) */}
                    <div className={`
                        fixed inset-y-0 right-0 w-[400px] bg-zinc-900 border-l border-white/10 p-6 z-30 transform transition-transform duration-300 shadow-2xl
                        ${showMobileMap ? 'translate-x-0' : 'translate-x-full'} 
                        lg:static lg:translate-x-0 lg:block lg:shadow-none
                    `}>
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="text-sm font-black uppercase tracking-widest text-zinc-400 flex items-center gap-2">
                                <Building2 size={16} className="text-blue-500"/> Facility Map
                            </h3>
                            {/* Mobile Close Button */}
                            <button onClick={() => setShowMobileMap(false)} className="lg:hidden p-2 bg-zinc-800 rounded-full text-zinc-400">
                                <X size={16}/>
                            </button>
                            <span className="hidden lg:inline text-[10px] font-bold text-zinc-600 uppercase bg-zinc-950 px-2 py-1 rounded">
                                {filterDay || "All Days"} View
                            </span>
                        </div>

                        {/* GRID LAYOUT */}
                        <div className="grid grid-cols-2 gap-3 auto-rows-[100px] overflow-y-auto h-[calc(100vh-200px)] custom-scrollbar pb-10">
                            {(VENUE_LAYOUTS[selectedLocation] || []).map((room) => {
                                const classesInRoom = visibleClasses.filter((c:any) => getRoomForClass(c.id, selectedLocation)?.id === room.id);
                                const totalStudents = classesInRoom.reduce((acc: number, c:any) => acc + c.enrolled, 0);
                                const isHighlighted = hoveredClassId && getRoomForClass(hoveredClassId, selectedLocation)?.id === room.id;
                                const isFull = totalStudents >= room.capacity;
                                const isEmpty = classesInRoom.length === 0;

                                return (
                                    <div key={room.id} 
                                        className={`rounded-2xl border p-3 flex flex-col justify-between transition-all duration-300
                                            ${room.col} ${room.row}
                                            ${isHighlighted 
                                                ? 'bg-blue-600 border-blue-400 shadow-[0_0_30px_rgba(37,99,235,0.3)] scale-[1.02] z-10' 
                                                : isEmpty 
                                                    ? 'bg-zinc-950/50 border-white/5 opacity-60 border-dashed' 
                                                    : 'bg-zinc-800 border-white/10'
                                            }
                                            ${isFull && !isEmpty && !isHighlighted ? 'border-red-500/50 bg-red-900/10' : ''}
                                        `}
                                    >
                                        <div className="flex justify-between items-start">
                                            <span className={`text-[10px] font-black uppercase tracking-tighter ${isHighlighted ? 'text-white' : 'text-zinc-500'}`}>{room.name}</span>
                                            {isFull && <AlertTriangle size={12} className="text-red-500"/>}
                                        </div>

                                        <div className="space-y-1">
                                            {classesInRoom.map((c:any) => (
                                                <div key={c.id} className={`text-[9px] truncate px-1.5 py-0.5 rounded ${isHighlighted ? 'bg-white/20 text-white' : 'bg-black/20 text-zinc-400'}`}>
                                                    {c.name}
                                                </div>
                                            ))}
                                            {isEmpty && <div className="text-[9px] text-zinc-600 italic">No classes</div>}
                                        </div>

                                        <div className="flex items-end justify-between mt-2">
                                            <div className="w-full bg-black/30 h-1.5 rounded-full overflow-hidden flex">
                                                <div className={`h-full ${isFull ? 'bg-red-500' : 'bg-emerald-500'}`} style={{ width: `${Math.min((totalStudents / room.capacity) * 100, 100)}%` }} />
                                            </div>
                                            <span className={`text-[9px] font-mono ml-2 ${isHighlighted ? 'text-white' : 'text-zinc-500'}`}>
                                                {totalStudents}/{room.capacity}
                                            </span>
                                        </div>
                                    </div>
                                );
                            })}
                            
                            {(VENUE_LAYOUTS[selectedLocation] || []).length === 0 && (
                                <div className="col-span-2 text-center py-10 text-zinc-600 text-xs italic">
                                    No map data available for this venue.
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        )}
    </div>
  );
}