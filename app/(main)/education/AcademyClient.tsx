/* eslint-disable react-hooks/set-state-in-effect */
"use client";

import { useState, useMemo, useEffect } from 'react';
import Link from 'next/link';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, 
  ResponsiveContainer, Cell 
} from 'recharts';
import { 
  LayoutGrid, UserSquare2, MapPin, Search, 
  ClipboardList, Users, School, Building2, Calendar, 
  AlertTriangle, Info, ChevronDown, Filter, X,
  Music, Drama, Mic2, Palette, Monitor, Baby, Map
} from 'lucide-react';

// --- HELPERS ---

// 1. Season Sorter (Winter 2026 > Fall 2025)
const SEASON_ORDER: Record<string, number> = {
  "Winter": 1, "Spring": 2, "Summer": 3, "Fall": 4
};

const getSessionScore = (sessionName: string) => {
  const parts = sessionName.split(' ');
  if (parts.length < 2) return 0;
  const season = parts[0];
  const year = parseInt(parts[1]);
  if (isNaN(year)) return 0;
  // Score = Year * 10 + SeasonWeight (e.g. 2026 * 10 + 1 = 20261)
  return (year * 10) + (SEASON_ORDER[season] || 0);
};

// 2. Icon Helper
const getTypeIcon = (type: string) => {
    const t = (type || "").toLowerCase();
    if (t.includes('dance')) return <Music size={14}/>;
    if (t.includes('acting') || t.includes('drama')) return <Drama size={14}/>;
    if (t.includes('voice') || t.includes('musical')) return <Mic2 size={14}/>;
    if (t.includes('tech')) return <Monitor size={14}/>;
    if (t.includes('younger')) return <Baby size={14}/>;
    return <Palette size={14}/>; 
};

export default function AcademyClient({ classes = [], venues = [] }: { classes: any[], venues: any[] }) {
  
  // --- 1. DERIVE OPTIONS (SESSIONS, TYPES, AGES) ---
  const { sessions, ageRanges, types } = useMemo(() => {
    const s = new Set<string>();
    const a = new Set<string>();
    const t = new Set<string>();

    classes.forEach(c => {
      if (c.session) s.add(c.session);
      if (c.ageRange) a.add(c.ageRange);
      if (c.type && c.type !== "General") t.add(c.type);
    });

    // Sort Sessions Chronologically (Newest First)
    const sortedSessions = Array.from(s).sort((a, b) => getSessionScore(b) - getSessionScore(a));

    return { 
      sessions: sortedSessions, 
      ageRanges: Array.from(a).sort(),
      types: Array.from(t).sort()
    };
  }, [classes]);

  // --- 2. STATE ---
  const [activeTab, setActiveTab] = useState<'manager' | 'logistics' | 'overview' | 'teachers'>('manager');
  const [activeSession, setActiveSession] = useState(sessions[0] || "");
  const [search, setSearch] = useState("");
  
  // Filters
  const [activeDay, setActiveDay] = useState<string | null>(null);
  const [activeAge, setActiveAge] = useState<string | null>(null);
  const [activeType, setActiveType] = useState<string | null>(null);

  // Sync session if data loads late
  useEffect(() => {
    if (sessions.length > 0 && !sessions.includes(activeSession)) {
      setActiveSession(sessions[0]);
    }
  }, [sessions, activeSession]);

  // --- 3. MASTER FILTER LOGIC ---
  const filteredClasses = useMemo(() => {
    return classes.filter(c => {
      // A. Session Match
      if (c.session !== activeSession) return false;

      // B. Search Match (Name, Teacher, Location)
      if (search) {
        const term = search.toLowerCase();
        if (!c.name.toLowerCase().includes(term) && 
            !c.teacher.toLowerCase().includes(term) &&
            !c.location.toLowerCase().includes(term)) return false;
      }

      // C. Sidebar Filters
      if (activeDay && c.day !== activeDay) return false;
      if (activeAge && c.ageRange !== activeAge) return false;
      if (activeType && c.type !== activeType) return false;

      return true;
    });
  }, [classes, activeSession, search, activeDay, activeAge, activeType]);

  // --- 4. DERIVED DATA FOR TABS ---

  // Logistics: Map filtered classes to Venues
  const activeVenues = useMemo(() => {
    const activeClassIds = new Set(filteredClasses.map(c => c.id));
    
    return venues.map(venue => {
        const activeSpaces = venue.spaces.map((space: any) => {
            const relevantClasses = space.classes.filter((c: any) => activeClassIds.has(c.id));
            return { ...space, classes: relevantClasses };
        });

        // Only show venues that have classes matching the current filter
        const hasClasses = activeSpaces.some((s:any) => s.classes.length > 0);
        if (hasClasses) {
            return { ...venue, spaces: activeSpaces };
        }
        return null;
    }).filter(Boolean);
  }, [venues, filteredClasses]);

  // Analytics: Stats for Charts
  const stats = useMemo(() => {
    const teachers: Record<string, number> = {};
    const classTypes: Record<string, number> = {};
    
    filteredClasses.forEach(c => {
      teachers[c.teacher] = (teachers[c.teacher] || 0) + c.students;
      classTypes[c.name] = (classTypes[c.name] || 0) + c.students;
    });
    
    return {
      teacherData: Object.entries(teachers)
        .map(([name, count]) => ({ name, count }))
        .sort((a, b) => b.count - a.count),
      classData: Object.entries(classTypes)
        .map(([name, count]) => ({ name, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 10) // Top 10
    };
  }, [filteredClasses]);

  // --- 5. RENDER ---
  return (
    <div className="h-full flex flex-col bg-zinc-950 text-white">
      
      {/* HEADER TOOLBAR */}
      <div className="px-6 py-4 border-b border-white/5 bg-zinc-900/50 backdrop-blur-md z-20 flex flex-col md:flex-row md:items-center justify-between gap-4">
        
        {/* Left: Tab Switcher */}
        <div className="flex gap-2 bg-zinc-950/50 p-1 rounded-xl border border-white/5 overflow-x-auto shrink-0">
          <TabButton active={activeTab === 'manager'} onClick={() => setActiveTab('manager')} icon={<ClipboardList size={14}/>} label="Classes" />
          <TabButton active={activeTab === 'logistics'} onClick={() => setActiveTab('logistics')} icon={<Map size={14}/>} label="Logistics" />
          <TabButton active={activeTab === 'overview'} onClick={() => setActiveTab('overview')} icon={<LayoutGrid size={14}/>} label="Trends" />
          <TabButton active={activeTab === 'teachers'} onClick={() => setActiveTab('teachers')} icon={<UserSquare2 size={14}/>} label="Faculty" />
        </div>

        {/* Right: Global Filters */}
        <div className="flex gap-4 items-center flex-1 justify-end">
             {/* Session Dropdown */}
             <div className="relative group">
                <select 
                  value={activeSession}
                  onChange={(e) => setActiveSession(e.target.value)}
                  className="appearance-none bg-transparent text-lg font-black italic tracking-tighter text-white pr-8 outline-none cursor-pointer text-right"
                >
                  {sessions.map(s => (
                    <option key={s} value={s} className="bg-zinc-900 text-sm font-sans not-italic">{s}</option>
                  ))}
                </select>
                <ChevronDown size={14} className="absolute right-0 top-1/2 -translate-y-1/2 text-zinc-500 pointer-events-none group-hover:text-white transition-colors" />
             </div>

             {/* Search */}
             <div className="relative">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
                <input 
                  type="text" 
                  placeholder="Search..." 
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="bg-zinc-950 border border-white/10 rounded-full pl-9 pr-4 py-1.5 text-xs text-white focus:outline-none focus:border-blue-500/50 transition-all w-40 focus:w-64"
                />
             </div>
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden">
        
        {/* SIDEBAR FILTERS (Always Visible) */}
        <aside className="w-64 border-r border-white/5 bg-zinc-900/30 overflow-y-auto custom-scrollbar p-6 space-y-8 shrink-0 hidden md:block">
            {/* TYPE FILTER */}
            <div>
                <h3 className="text-[10px] font-black uppercase text-zinc-500 tracking-widest mb-3 flex items-center gap-2">
                    <Filter size={10}/> Class Type
                </h3>
                <div className="space-y-1">
                    {types.map(type => (
                        <FilterButton 
                            key={type}
                            label={type} 
                            active={activeType === type} 
                            icon={getTypeIcon(type)} 
                            onClick={() => setActiveType(activeType === type ? null : type)} 
                        />
                    ))}
                </div>
            </div>

            {/* AGE FILTER */}
            <div>
                <h3 className="text-[10px] font-black uppercase text-zinc-500 tracking-widest mb-3">Age Range</h3>
                <div className="flex flex-wrap gap-2">
                    {ageRanges.map(age => (
                        <button
                            key={age}
                            onClick={() => setActiveAge(activeAge === age ? null : age)}
                            className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-all ${
                                activeAge === age 
                                    ? 'bg-emerald-600 border-emerald-500 text-white' 
                                    : 'bg-zinc-900 border-white/5 text-zinc-400 hover:border-white/10 hover:text-white'
                            }`}
                        >
                            {age}
                        </button>
                    ))}
                </div>
            </div>

            {/* DAY FILTER */}
            <div>
                <h3 className="text-[10px] font-black uppercase text-zinc-500 tracking-widest mb-3">Day of Week</h3>
                <div className="space-y-1">
                    {['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'].map(day => (
                        <button 
                            key={day}
                            onClick={() => setActiveDay(activeDay === day ? null : day)}
                            className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-bold transition-all ${
                                activeDay === day 
                                    ? 'bg-zinc-800 text-white' 
                                    : 'text-zinc-500 hover:bg-zinc-800/50 hover:text-zinc-300'
                            }`}
                        >
                            <span>{day}</span>
                            {activeDay === day && <X size={12} />}
                        </button>
                    ))}
                </div>
            </div>
            
            <div className="pt-4 border-t border-white/5">
                <button 
                    onClick={() => { setActiveDay(null); setActiveAge(null); setActiveType(null); setSearch(""); }}
                    className="w-full py-2 text-xs font-bold text-zinc-500 hover:text-white transition-colors flex items-center justify-center gap-2"
                >
                    <X size={12}/> Clear Filters
                </button>
            </div>
        </aside>

        {/* MAIN CONTENT AREA */}
        <main className="flex-1 overflow-y-auto custom-scrollbar p-6 bg-black/20">
            
            {/* TAB 1: CLASS MANAGER */}
            {activeTab === 'manager' && (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 animate-in fade-in slide-in-from-bottom-4">
                    {filteredClasses.length > 0 ? (
                        filteredClasses.map(cls => (
                            <ClassCard key={cls.id} cls={cls} />
                        ))
                    ) : (
                        <EmptyState session={activeSession} />
                    )}
                </div>
            )}

            {/* TAB 2: LOGISTICS */}
            {activeTab === 'logistics' && (
                <div className="grid grid-cols-1 xl:grid-cols-2 gap-8 animate-in fade-in slide-in-from-bottom-4">
                   {activeVenues.length > 0 ? (
                     activeVenues.map((venue: any) => (
                      <VenueCard key={venue.id} venue={venue} />
                     ))
                   ) : (
                     <EmptyState session={activeSession} />
                   )}
                </div>
            )}

            {/* TAB 3: TRENDS */}
            {activeTab === 'overview' && (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-in fade-in slide-in-from-bottom-4">
                    <div className="lg:col-span-2 bg-zinc-900/50 border border-white/5 p-8 rounded-[2.5rem] min-w-0 relative overflow-hidden">
                        <h3 className="text-xs font-black text-white uppercase tracking-widest mb-8 flex items-center gap-2">
                            <LayoutGrid size={16} className="text-blue-500" /> Top Classes ({activeSession})
                        </h3>
                        <div className="h-[400px]">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={stats.classData} layout="vertical">
                                    <CartesianGrid strokeDasharray="3 3" stroke="#18181b" horizontal={false} />
                                    <XAxis type="number" stroke="#3f3f46" tick={{fill: '#71717a', fontSize: 10}} />
                                    <YAxis dataKey="name" type="category" width={140} stroke="#3f3f46" tick={{fill: '#71717a', fontSize: 10, fontWeight: 'bold'}} />
                                    <Tooltip cursor={{fill: '#27272a'}} contentStyle={{ backgroundColor: '#09090b', borderColor: '#27272a', borderRadius: '16px' }} />
                                    <Bar dataKey="count" radius={[0, 4, 4, 0]} barSize={24}>
                                        {stats.classData.map((e, i) => <Cell key={i} fill={i < 3 ? '#3b82f6' : '#27272a'} />)}
                                    </Bar>
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </div>
                    {/* Highlights */}
                    <div className="bg-zinc-900/50 border border-white/5 p-6 rounded-[2rem] flex flex-col">
                        <h3 className="text-xs font-black text-white uppercase tracking-widest mb-6">Highlights</h3>
                        <div className="p-4 bg-zinc-950 rounded-xl border border-white/5 mb-4">
                            <p className="text-[10px] font-bold text-zinc-500 uppercase">Top Class</p>
                            <p className="text-lg font-black text-white truncate">{stats.classData[0]?.name || "N/A"}</p>
                            <p className="text-xs text-blue-500 font-bold">{stats.classData[0]?.count || 0} Students</p>
                        </div>
                    </div>
                </div>
            )}

            {/* TAB 4: FACULTY */}
            {activeTab === 'teachers' && (
                <div className="bg-zinc-900/50 border border-white/5 p-8 rounded-[2.5rem] animate-in fade-in slide-in-from-bottom-4 min-w-0">
                    <h3 className="text-xs font-black text-white uppercase tracking-widest mb-8 flex items-center gap-2">
                        <UserSquare2 size={16} className="text-purple-500" /> Instructor Load ({activeSession})
                    </h3>
                    <div className="h-[400px]">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={stats.teacherData}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#18181b" vertical={false} />
                                <XAxis dataKey="name" stroke="#3f3f46" tick={{fill: '#71717a', fontSize: 10}} />
                                <YAxis stroke="#3f3f46" tick={{fill: '#71717a', fontSize: 10}} />
                                <Tooltip contentStyle={{ backgroundColor: '#09090b', borderColor: '#27272a', borderRadius: '16px' }} />
                                <Bar dataKey="count" fill="#8b5cf6" radius={[6, 6, 0, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            )}

        </main>
      </div>
    </div>
  );
}

// --- SUB COMPONENTS ---

function FilterButton({ label, active, icon, onClick }: any) {
    return (
        <button 
            onClick={onClick}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-bold transition-all ${
                active 
                    ? 'bg-emerald-600 text-white shadow-lg' 
                    : 'bg-zinc-900 text-zinc-400 hover:bg-zinc-800 hover:text-white'
            }`}
        >
            {icon}
            <span>{label}</span>
            {active && <X size={12} className="ml-auto"/>}
        </button>
    )
}

function TabButton({ active, onClick, icon, label }: { active: boolean, onClick: () => void, icon: any, label: string }) {
  return (
    <button onClick={onClick} className={`px-4 py-2 rounded-lg flex items-center gap-2 text-[10px] font-black uppercase tracking-widest transition-all ${active ? 'bg-zinc-100 text-black shadow-lg scale-[1.02]' : 'text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800'}`}>
      {icon} <span className="hidden sm:inline">{label}</span>
    </button>
  );
}

function EmptyState({ session }: { session: string }) {
    return (
        <div className="col-span-full py-20 text-center text-zinc-500 italic border-2 border-dashed border-zinc-800 rounded-3xl">
            <Info size={32} className="mx-auto text-zinc-700 mb-3" />
            <p className="text-sm font-bold">No data found</p>
            <p className="text-xs text-zinc-600 mt-1">Try adjusting filters or selecting a different season than <strong>{session}</strong>.</p>
        </div>
    )
}

function ClassCard({ cls }: { cls: any }) {
    // Determine color accent based on type
    const isDance = cls.type?.toLowerCase().includes('dance');
    const isActing = cls.type?.toLowerCase().includes('acting') || cls.type?.toLowerCase().includes('drama');
    
    return (
        <div className="group bg-zinc-900/40 border border-white/5 hover:border-white/10 hover:bg-zinc-900/60 rounded-2xl p-5 transition-all flex flex-col h-full relative overflow-hidden">
            <div className={`absolute top-0 right-0 w-24 h-24 bg-gradient-to-br rounded-bl-full -mr-8 -mt-8 pointer-events-none opacity-10 ${
                isDance ? 'from-pink-500 to-transparent' : isActing ? 'from-blue-500 to-transparent' : 'from-white to-transparent'
            }`} />

            <div className="mb-4">
                <div className="flex items-start justify-between gap-4">
                    <h3 className="font-bold text-zinc-100 leading-tight group-hover:text-emerald-400 transition-colors">
                        {cls.name}
                    </h3>
                    <div className="flex flex-col items-end gap-1">
                        <span className="shrink-0 px-2 py-1 bg-white/5 rounded text-[10px] font-bold text-zinc-500 border border-white/5 uppercase tracking-wide whitespace-nowrap">
                            {cls.ageRange}
                        </span>
                        {cls.type && cls.type !== "General" && (
                            <span className="text-[9px] font-black uppercase tracking-wider text-zinc-600">
                                {cls.type}
                            </span>
                        )}
                    </div>
                </div>
                <p className="text-xs text-zinc-500 font-medium mt-1 flex items-center gap-1">
                    <School size={10}/> {cls.teacher}
                </p>
            </div>

            <div className="mt-auto space-y-2 pt-4 border-t border-white/5">
                <div className="flex items-center justify-between">
                     <div className="flex items-center gap-2 text-xs text-zinc-400">
                        <Calendar size={14} className="text-zinc-600"/>
                        <span className="font-bold text-zinc-300">{cls.day}</span>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-zinc-500">
                        <Users size={14} className="text-zinc-600"/>
                        <span>{cls.students} Enrolled</span>
                    </div>
                </div>
                
                <div className="grid grid-cols-2 gap-2 mt-2">
                    <Link href={`/education/class/${cls.id}/attendance`} className="flex items-center justify-center gap-2 py-2 rounded-lg bg-black/20 text-zinc-500 hover:bg-black/40 hover:text-white text-[10px] font-bold uppercase transition-colors">
                        Attendance
                    </Link>
                    <Link href={`/education/class/${cls.id}`} className="flex items-center justify-center gap-2 py-2 rounded-lg bg-black/20 text-zinc-500 hover:bg-black/40 hover:text-white text-[10px] font-bold uppercase transition-colors">
                        Roster
                    </Link>
                </div>
            </div>
        </div>
    )
}

function VenueCard({ venue }: { venue: any }) {
    return (
        <div className="bg-zinc-900/50 border border-white/5 rounded-[2rem] overflow-hidden flex flex-col">
            <div className="p-6 border-b border-white/5 bg-zinc-950/30 flex justify-between items-start">
            <div className="flex gap-4">
                <div className="w-12 h-12 rounded-2xl bg-zinc-800 flex items-center justify-center text-purple-500"><Building2 size={24} /></div>
                <div>
                <h3 className="text-lg font-black text-white">{venue.name}</h3>
                <div className="flex gap-2 text-[10px] font-bold uppercase tracking-widest mt-1">
                    <span className="text-zinc-500">{venue.type}</span><span className="text-zinc-600">•</span>
                    <span className="text-zinc-500">{venue.spaces.length} Rooms</span>
                </div>
                </div>
            </div>
            <div className="text-right">
                <div className="px-3 py-1 bg-purple-500/10 rounded-lg text-[10px] font-bold text-purple-400 border border-purple-500/20">${venue.rates.hourly}/hr</div>
            </div>
            </div>

            <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-4">
            {venue.spaces.map((space: any) => {
                // Calculate utilization based on *filtered* classes
                const currentStudents = space.classes.reduce((acc:number, c:any) => acc + c.students, 0);
                const utilization = Math.round((currentStudents / (space.capacity * Math.max(1, space.classes.length))) * 100) || 0;
                const isOver = utilization > 100;
                const hasClasses = space.classes.length > 0;

                return (
                <div key={space.id} className={`p-4 rounded-2xl border transition-all ${hasClasses ? 'bg-zinc-950 border-white/5 hover:border-purple-500/30' : 'bg-zinc-950/30 border-dashed border-zinc-800'}`}>
                    <div className="flex justify-between items-start mb-4">
                    <div>
                        <h4 className={`text-sm font-bold ${hasClasses ? 'text-white' : 'text-zinc-600'}`}>{space.name}</h4>
                        {hasClasses ? (
                        <div className="mt-1 flex flex-col gap-1">
                            {space.classes.map((cls:any) => (
                            <span key={cls.id} className="text-[9px] text-zinc-400 truncate max-w-[150px] block">• {cls.name}</span>
                            ))}
                        </div>
                        ) : (
                        <span className="text-[9px] text-zinc-700 italic mt-1 block">Empty</span>
                        )}
                    </div>
                    {hasClasses && <div className={`text-xs font-black ${isOver ? 'text-red-500' : 'text-emerald-500'}`}>{utilization}%</div>}
                    </div>
                    
                    {hasClasses && (
                    <div className="space-y-1.5 mt-2">
                        <div className="h-2 w-full bg-zinc-900 rounded-full overflow-hidden border border-white/5">
                        <div className={`h-full rounded-full ${isOver ? 'bg-red-500' : 'bg-purple-500'}`} style={{ width: `${Math.min(100, utilization)}%` }} />
                        </div>
                        {isOver && <div className="flex items-center gap-1 text-[9px] font-bold text-red-500 mt-1 animate-pulse"><AlertTriangle size={10} /> OVERFLOW</div>}
                    </div>
                    )}
                </div>
                );
            })}
            </div>
        </div>
    )
}