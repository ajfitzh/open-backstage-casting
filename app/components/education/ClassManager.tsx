"use client";

import React, { useState, useMemo } from 'react';
import { 
  Users, Search, ArrowLeft, 
  Building2, Waves, Compass, Anchor, Navigation, 
  Filter, X, CalendarDays,
  Map as MapIcon, LayoutGrid, CheckCircle2, Clock, UserX, MoreHorizontal, ChevronRight
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
const VENUE_LAYOUTS: Record<string, any[]> = {
    "River of Life": [
        { id: "main", name: "Sanctuary", capacity: 400, type: "large", col: "col-span-2" },
        { id: "lobby", name: "Lobby", capacity: 50, type: "common", col: "col-span-2" },
        { id: "101", name: "Rm 101", capacity: 20, type: "small", col: "col-span-1" },
        { id: "102", name: "Rm 102", capacity: 20, type: "small", col: "col-span-1" },
        { id: "hall", name: "Hall", capacity: 100, type: "medium", col: "col-span-2" },
    ],
    // Add others as needed
};

// --- MOCK STUDENTS FOR ATTENDANCE ---
const MOCK_ROSTER = [
    { id: 1, name: "Sarah Smith", status: 'present' },
    { id: 2, name: "James Johnson", status: 'present' },
    { id: 3, name: "Emily Davis", status: 'absent' },
    { id: 4, name: "Michael Brown", status: 'present' },
    { id: 5, name: "Jessica Wilson", status: 'late' },
];

export default function ClassManager({ classes }: any) {
  const [selectedLocation, setSelectedLocation] = useState<string | null>(null);
  const [selectedClass, setSelectedClass] = useState<any>(null);
  
  // Filters
  const [currentSession, setCurrentSession] = useState(SESSIONS[0]); 
  const [filterDay, setFilterDay] = useState<string | null>(null);
  const [filterAge, setFilterAge] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");

  // --- 🧠 SMART VIEW LOGIC ---
  // If a User filters/searches, we break out of "Location Mode" and show a "Master List"
  const isGlobalSearch = !!(searchTerm || filterDay || filterAge);
  
  const filteredClasses = useMemo(() => {
      let data = classes;
      if (currentSession.id !== 'winter2026') return []; 

      // 1. Location Filter (Only if NOT searching globally)
      if (selectedLocation && !isGlobalSearch) {
          data = data.filter((c:any) => c.location === selectedLocation);
      }

      // 2. Global Filters
      if (filterDay) data = data.filter((c:any) => c.day === filterDay);
      if (filterAge) data = data.filter((c:any) => c.ages.includes(filterAge));
      if (searchTerm) {
          const lower = searchTerm.toLowerCase();
          data = data.filter((c:any) => 
            c.name.toLowerCase().includes(lower) || 
            c.teacher.toLowerCase().includes(lower) ||
            c.location.toLowerCase().includes(lower)
          );
      }
      return data;
  }, [classes, selectedLocation, searchTerm, filterDay, filterAge, isGlobalSearch, currentSession]);

  // --- STATS FOR CAMPUS CARDS ---
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

  // --- THEME ENGINE ---
  const getLocationTheme = (name: string) => {
    const n = name?.toLowerCase() || "";
    if (n.includes('river of life')) return { icon: <Waves size={32} />, color: 'text-cyan-400', bg: 'bg-cyan-500/10', border: 'border-cyan-500/20' };
    if (n.includes('hope')) return { icon: <Compass size={32} />, color: 'text-purple-400', bg: 'bg-purple-500/10', border: 'border-purple-500/20' };
    if (n.includes('river club')) return { icon: <Anchor size={32} />, color: 'text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-500/20' };
    if (n.includes('highway')) return { icon: <Navigation size={32} />, color: 'text-amber-400', bg: 'bg-amber-500/10', border: 'border-amber-500/20' };
    return { icon: <Building2 size={32} />, color: 'text-blue-400', bg: 'bg-blue-500/10', border: 'border-blue-500/20' };
  };

  return (
    <div className="flex flex-col h-full bg-zinc-950 text-white font-sans selection:bg-blue-500/30 overflow-hidden relative">
        
        {/* --- HEADER & FILTERS --- */}
        <div className="p-6 shrink-0 border-b border-white/5 bg-zinc-900/50 backdrop-blur-xl z-20">
            <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-6">
                
                {/* Title Area */}
                <div>
                    <div className="flex items-center gap-2 mb-1">
                        <button 
                            onClick={() => { setSelectedLocation(null); setSearchTerm(""); setFilterDay(null); setFilterAge(null); }}
                            className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500 hover:text-white transition-colors flex items-center gap-1"
                        >
                           CLASS MANAGER {selectedLocation && <><ChevronRight size={10}/> {selectedLocation}</>}
                        </button>
                    </div>
                    <h1 className="text-3xl font-black uppercase italic tracking-tighter text-white">
                        {isGlobalSearch ? "Class Search" : selectedLocation ? selectedLocation : "Campus Overview"}
                    </h1>
                </div>

                {/* Filter Bar */}
                <div className="flex flex-col md:flex-row gap-4 items-start md:items-center">
                    
                    {/* Search Input */}
                    <div className="relative w-full md:w-64">
                        <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500"/>
                        <input 
                            value={searchTerm} 
                            onChange={(e) => setSearchTerm(e.target.value)} 
                            placeholder="Find class, teacher..." 
                            className="w-full bg-black/40 border border-white/10 rounded-xl pl-12 pr-4 py-2.5 text-sm focus:border-blue-500 outline-none transition-all placeholder:text-zinc-600"
                        />
                    </div>

                    {/* Filter Pills */}
                    <div className="flex items-center gap-2 bg-zinc-900 p-1.5 rounded-xl border border-white/5 overflow-x-auto max-w-full">
                        <div className="px-2 text-zinc-500"><Filter size={14}/></div>
                        {DAYS.map(day => (
                            <button key={day} onClick={() => setFilterDay(filterDay === day ? null : day)} className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase transition-all whitespace-nowrap ${filterDay === day ? 'bg-blue-600 text-white' : 'text-zinc-500 hover:text-zinc-300'}`}>{day.substring(0, 3)}</button>
                        ))}
                        <div className="w-px h-4 bg-white/10 mx-1"></div>
                        {AGE_GROUPS.map(age => (
                            <button key={age} onClick={() => setFilterAge(filterAge === age ? null : age)} className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase transition-all whitespace-nowrap ${filterAge === age ? 'bg-emerald-600 text-white' : 'text-zinc-500 hover:text-zinc-300'}`}>{age}</button>
                        ))}
                        {(filterDay || filterAge || searchTerm) && (
                            <button onClick={() => {setFilterDay(null); setFilterAge(null); setSearchTerm("")}} className="px-2 text-zinc-500 hover:text-red-400 transition-colors ml-auto"><X size={14} /></button>
                        )}
                    </div>
                </div>
            </div>
        </div>

        {/* --- MAIN CONTENT AREA --- */}
        <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">
            
            {/* STATE 1: CAMPUS OVERVIEW (No filters, No selection) */}
            {!selectedLocation && !isGlobalSearch && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-in fade-in zoom-in-95 duration-300">
                    {locationStats.map((loc: any) => {
                        const theme = getLocationTheme(loc.name);
                        return (
                            <button key={loc.name} onClick={() => setSelectedLocation(loc.name)} className={`relative overflow-hidden bg-zinc-900 border ${theme.border} p-8 rounded-[2rem] text-left group hover:bg-zinc-800 transition-all shadow-2xl h-64 flex flex-col justify-between`}>
                                <div className={`absolute -right-6 -bottom-6 opacity-10 group-hover:opacity-20 transition-all duration-500 ${theme.color} rotate-12 scale-150`}>
                                    {React.cloneElement(theme.icon as React.ReactElement, { size: 180 })}
                                </div>
                                <div className="flex justify-between items-start relative z-10">
                                    <div className={`p-4 ${theme.bg} ${theme.color} rounded-2xl`}>{theme.icon}</div>
                                    <div className="text-right">
                                        <div className="text-4xl font-black text-white">{loc.count}</div>
                                        <div className="text-[10px] font-bold uppercase text-zinc-500 tracking-wider">Active Classes</div>
                                    </div>
                                </div>
                                <div className="relative z-10">
                                    <h3 className="text-2xl font-black text-white mb-1 tracking-tight truncate">{loc.name}</h3>
                                    <p className="text-xs text-zinc-500 font-medium">{loc.students} Students Enrolled</p>
                                </div>
                            </button>
                        );
                    })}
                </div>
            )}

            {/* STATE 2: CLASS LIST (Filtered or Location Selected) */}
            {(selectedLocation || isGlobalSearch) && (
                <div className="animate-in slide-in-from-bottom-4 duration-500 space-y-6">
                    
                    {/* OPTIONAL: Heads-Up Map (Only show if Specific Location is selected, NOT on global search) */}
                    {selectedLocation && !isGlobalSearch && VENUE_LAYOUTS[selectedLocation] && (
                        <div className="bg-black/20 border border-white/5 rounded-2xl p-6 mb-8 overflow-x-auto">
                            <div className="flex items-center gap-2 mb-4 text-[10px] font-black uppercase text-zinc-500 tracking-widest">
                                <LayoutGrid size={14} className="text-blue-500"/> Facility Map
                            </div>
                            <div className="grid grid-cols-4 gap-4 min-w-[600px]">
                                {VENUE_LAYOUTS[selectedLocation].map((room) => (
                                    <div key={room.id} className={`p-4 rounded-xl border border-white/5 bg-zinc-800/50 flex flex-col justify-between h-24 ${room.col}`}>
                                        <span className="text-[10px] font-bold uppercase text-zinc-400">{room.name}</span>
                                        <div className="flex justify-end">
                                            <span className="text-lg font-black text-zinc-600">{room.capacity}</span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    <div className="grid grid-cols-1 gap-3">
                        {filteredClasses.length === 0 && (
                            <div className="text-center py-20 border-2 border-dashed border-zinc-800 rounded-3xl text-zinc-600">
                                <Search size={48} className="mx-auto mb-4 opacity-20"/>
                                <p>No classes found matching your criteria.</p>
                            </div>
                        )}

                        {filteredClasses.map((c: any) => (
                            <div 
                                key={c.id} 
                                onClick={() => setSelectedClass(c)}
                                className="group bg-zinc-900 border border-white/5 p-4 rounded-2xl flex flex-col md:flex-row md:items-center gap-6 hover:bg-zinc-800 hover:border-white/10 transition-all cursor-pointer relative overflow-hidden"
                            >
                                {/* Left Color Bar */}
                                <div className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-blue-500 to-purple-500 opacity-0 group-hover:opacity-100 transition-opacity"/>

                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-3 mb-1">
                                        <span className="text-[10px] font-black uppercase tracking-widest text-zinc-500 bg-black/20 px-2 py-1 rounded">{c.day} • {c.time}</span>
                                        {isGlobalSearch && <span className="text-[10px] font-bold text-blue-400 border border-blue-500/20 px-2 py-1 rounded">{c.location}</span>}
                                    </div>
                                    <h3 className="text-xl font-black text-white truncate">{c.name}</h3>
                                    <div className="flex items-center gap-3 text-xs text-zinc-400 mt-1">
                                        <span className="flex items-center gap-1"><Users size={12}/> {c.teacher}</span>
                                        <span className="w-1 h-1 rounded-full bg-zinc-700"/>
                                        <span>Ages {c.ages}</span>
                                    </div>
                                </div>

                                <div className="flex items-center gap-6 pl-6 border-l border-white/5 md:border-l-0">
                                    <div className="text-right">
                                        <div className="text-2xl font-black text-white">{c.enrolled}</div>
                                        <div className="text-[9px] font-black text-zinc-600 uppercase tracking-wider">Students</div>
                                    </div>
                                    <div className="bg-white text-black p-2 rounded-full opacity-0 group-hover:opacity-100 transition-all transform translate-x-4 group-hover:translate-x-0">
                                        <ChevronRight size={20}/>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>

        {/* --- ATTENDANCE DRAWER (The "Kiosk" for Elizabeth) --- */}
        {selectedClass && (
            <div className="fixed inset-0 z-50 flex justify-end">
                <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={() => setSelectedClass(null)} />
                
                <aside className="relative w-full max-w-2xl bg-zinc-950 border-l border-white/10 shadow-2xl flex flex-col animate-in slide-in-from-right duration-300">
                    
                    {/* Header */}
                    <div className="p-8 border-b border-white/10 bg-zinc-900 shrink-0">
                        <div className="flex justify-between items-start mb-6">
                            <div>
                                <h2 className="text-3xl font-black uppercase italic tracking-tighter text-white leading-none mb-2">{selectedClass.name}</h2>
                                <div className="flex items-center gap-3 text-zinc-400 text-sm font-medium">
                                    <span className="flex items-center gap-1"><Clock size={14}/> {selectedClass.time}</span>
                                    <span className="w-1 h-1 rounded-full bg-zinc-600"/>
                                    <span className="flex items-center gap-1"><MapIcon size={14}/> {selectedClass.location}</span>
                                </div>
                            </div>
                            <button onClick={() => setSelectedClass(null)} className="p-2 bg-black/40 rounded-full hover:bg-white/10 transition-colors"><X size={20}/></button>
                        </div>

                        {/* Action Tabs */}
                        <div className="flex gap-2">
                            <button className="flex-1 bg-blue-600 text-white py-3 rounded-xl text-xs font-black uppercase tracking-widest hover:bg-blue-500 transition-colors shadow-lg shadow-blue-900/20">
                                Take Attendance
                            </button>
                            <button className="px-6 bg-zinc-800 text-zinc-300 py-3 rounded-xl text-xs font-black uppercase tracking-widest hover:bg-zinc-700 transition-colors">
                                View Roster
                            </button>
                            <button className="px-4 bg-zinc-800 text-zinc-300 py-3 rounded-xl hover:bg-zinc-700 transition-colors">
                                <MoreHorizontal size={16}/>
                            </button>
                        </div>
                    </div>

                    {/* Attendance List */}
                    <div className="flex-1 overflow-y-auto p-8 custom-scrollbar space-y-4">
                        <div className="flex justify-between items-center mb-2">
                            <h3 className="text-xs font-black uppercase tracking-widest text-zinc-500">Student List ({MOCK_ROSTER.length})</h3>
                            <button className="text-[10px] text-blue-400 font-bold uppercase hover:text-white">Mark All Present</button>
                        </div>

                        {MOCK_ROSTER.map((student) => (
                            <div key={student.id} className="flex items-center justify-between p-4 bg-zinc-900 border border-white/5 rounded-2xl group hover:border-white/10 transition-all">
                                <div className="flex items-center gap-4">
                                    <div className="w-10 h-10 rounded-full bg-zinc-800 flex items-center justify-center text-sm font-bold text-zinc-400">
                                        {student.name.charAt(0)}
                                    </div>
                                    <span className="font-bold text-zinc-200 text-lg">{student.name}</span>
                                </div>
                                
                                <div className="flex items-center gap-2">
                                    <button className="w-10 h-10 rounded-full bg-emerald-500/10 text-emerald-500 flex items-center justify-center border border-emerald-500/20 hover:bg-emerald-500 hover:text-white transition-all">
                                        <CheckCircle2 size={20}/>
                                    </button>
                                    <button className="w-10 h-10 rounded-full bg-amber-500/10 text-amber-500 flex items-center justify-center border border-amber-500/20 hover:bg-amber-500 hover:text-white transition-all">
                                        <Clock size={20}/>
                                    </button>
                                    <button className="w-10 h-10 rounded-full bg-red-500/10 text-red-500 flex items-center justify-center border border-red-500/20 hover:bg-red-500 hover:text-white transition-all">
                                        <UserX size={20}/>
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                    
                    {/* Footer */}
                    <div className="p-6 bg-zinc-900 border-t border-white/10 flex justify-between items-center text-xs text-zinc-500 font-mono">
                        <span>Session: {currentSession.label}</span>
                        <span>ID: {selectedClass.id}</span>
                    </div>

                </aside>
            </div>
        )}

    </div>
  );
}