"use client";

import { useState, useMemo } from "react";
import { 
  Users, MapPin, Clock, Filter, ChevronDown, Calendar, Search, X, 
  LayoutGrid, Building2, BarChart3, Church, School, DollarSign, UserSquare2
} from "lucide-react";
import ClassManagerModal from "@/app/components/education/ClassManagerModal";

// --- HELPERS ---

function getSessionValue(sessionName: string) {
  if (!sessionName) return 0;
  const parts = sessionName.split(' ');
  let year = 0;
  let term = 0;
  parts.forEach(p => {
    if (p.match(/^\d{4}$/)) year = parseInt(p);
    if (p.includes('Winter')) term = 1;
    if (p.includes('Spring')) term = 4;
    if (p.includes('Summer')) term = 6;
    if (p.includes('Fall')) term = 9;
  });
  return (year * 100) + term;
}

function getVenueName(cls: any) {
    if (!cls.spaceName) return "TBD Location";
    return cls.spaceName.split(' - ')[0].trim();
}

function getVenueTheme(venueName: string) {
    const name = venueName.toLowerCase();
    if (name.includes('river club')) return { color: 'text-blue-400', bg: 'bg-blue-500/10', border: 'border-blue-500/20', icon: <Church size={14}/> };
    if (name.includes('hope')) return { color: 'text-orange-400', bg: 'bg-orange-500/10', border: 'border-orange-500/20', icon: <School size={14}/> };
    if (name.includes('highway')) return { color: 'text-purple-400', bg: 'bg-purple-500/10', border: 'border-purple-500/20', icon: <Building2 size={14}/> };
    if (name.includes('life')) return { color: 'text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-500/20', icon: <Users size={14}/> };
    return { color: 'text-zinc-400', bg: 'bg-zinc-800', border: 'border-white/5', icon: <MapPin size={14}/> };
}

// 🆕 NEW: Age Buckets for smarter filtering
const AGE_BUCKETS = [
  { label: "Minis (5-7)", min: 5, max: 7 },
  { label: "Youth (8-12)", min: 8, max: 12 },
  { label: "Teens (13-18)", min: 13, max: 18 },
  { label: "Adult (18+)", min: 18, max: 100 },
];

export default function EducationGrid({ classes }: { classes: any[] }) {
  const [selectedClass, setSelectedClass] = useState<any>(null);
  const [isSessionMenuOpen, setIsSessionMenuOpen] = useState(false);
  const [viewMode, setViewMode] = useState<'grid' | 'campus' | 'metrics'>('grid');
  
  // 1. EXTRACT & SORT SESSIONS
  const sessions = useMemo(() => {
    const unique = Array.from(new Set(classes.map(c => c.session).filter(Boolean)));
    return unique.sort((a, b) => getSessionValue(b) - getSessionValue(a));
  }, [classes]);

  const [activeSession, setActiveSession] = useState<string>(sessions[0] || "");

  // 2. DERIVED DATA FOR CURRENT SESSION
  const sessionClasses = useMemo(() => {
    return classes.map(c => ({
        ...c,
        venue: getVenueName(c),
        // Ensure we have numbers for math
        minAge: c.minAge || 0,
        maxAge: c.maxAge || 99
    })).filter(c => c.session === activeSession);
  }, [classes, activeSession]);

  // 3. EXTRACT FILTERS
  const availableVenues = useMemo(() => Array.from(new Set(sessionClasses.map(c => c.venue))).sort(), [sessionClasses]);
  const availableDays = useMemo(() => Array.from(new Set(sessionClasses.map(c => c.day).filter(Boolean))).sort(), [sessionClasses]);

  // 4. FILTERS STATE
  const [filterVenue, setFilterVenue] = useState<string | null>(null);
  const [filterDay, setFilterDay] = useState<string | null>(null);
  const [filterAgeLabel, setFilterAgeLabel] = useState<string | null>(null); // Use Label, not exact string
  const [searchQuery, setSearchQuery] = useState("");

  // 5. APPLY FILTERS (Upgraded Logic)
  const visibleClasses = sessionClasses.filter(c => {
    const matchesVenue = filterVenue ? c.venue === filterVenue : true;
    const matchesDay = filterDay ? c.day === filterDay : true;
    
    // 🆕 NEW: Age Range Overlap Logic
    let matchesAge = true;
    if (filterAgeLabel) {
       const bucket = AGE_BUCKETS.find(b => b.label === filterAgeLabel);
       if (bucket) {
          // Check intersection: [ClassMin, ClassMax] overlaps with [BucketMin, BucketMax]
          matchesAge = c.maxAge >= bucket.min && c.minAge <= bucket.max;
       }
    }

    const matchesSearch = c.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          c.teacher.toLowerCase().includes(searchQuery.toLowerCase());
    
    return matchesVenue && matchesDay && matchesAge && matchesSearch;
  });

  // 6. METRICS
  const metrics = useMemo(() => {
    const totalStudents = sessionClasses.reduce((acc, c) => acc + c.students, 0);
    const totalRevenue = totalStudents * 275; 
    const byTeacher = Object.entries(sessionClasses.reduce((acc: any, c) => {
        if (!acc[c.teacher]) acc[c.teacher] = { count: 0, students: 0 };
        acc[c.teacher].count++;
        acc[c.teacher].students += c.students;
        return acc;
    }, {})).sort((a: any, b: any) => b[1].students - a[1].students);

    const byVenue = Object.entries(sessionClasses.reduce((acc: any, c) => {
        if (!acc[c.venue]) acc[c.venue] = { classes: 0, students: 0 };
        acc[c.venue].classes++;
        acc[c.venue].students += c.students;
        return acc;
    }, {})).sort((a: any, b: any) => b[1].students - a[1].students);

    return { totalStudents, totalRevenue, byTeacher, byVenue };
  }, [sessionClasses]);

  // Group by Venue for "Campus View"
  const classesByVenue = useMemo(() => {
    return visibleClasses.reduce((acc: any, c) => {
      if (!acc[c.venue]) acc[c.venue] = [];
      acc[c.venue].push(c);
      return acc;
    }, {});
  }, [visibleClasses]);

  return (
    <>
      {/* --- TOP CONTROL BAR --- */}
      <div className="space-y-6 mb-8">
        
        <div className="flex flex-col xl:flex-row justify-between gap-6">
            {/* Session & View Switcher */}
            <div className="flex flex-col md:flex-row gap-4 flex-1">
                <div className="relative z-20 min-w-[240px]">
                    <button 
                        onClick={() => setIsSessionMenuOpen(!isSessionMenuOpen)}
                        className="flex items-center gap-3 bg-white text-black px-6 py-3 rounded-2xl font-black uppercase tracking-widest shadow-xl hover:bg-zinc-200 transition-colors w-full justify-between"
                    >
                        <span className="flex items-center gap-2 truncate">
                            <Calendar size={16} className="text-blue-600"/> 
                            {activeSession || "Select Session"}
                        </span>
                        <ChevronDown size={16} className={`transition-transform duration-300 ${isSessionMenuOpen ? 'rotate-180' : ''}`} />
                    </button>
                    {isSessionMenuOpen && (
                        <div className="absolute top-full left-0 mt-2 w-full bg-zinc-900 border border-white/10 rounded-2xl shadow-2xl overflow-hidden max-h-80 overflow-y-auto custom-scrollbar ring-1 ring-black/50">
                            {sessions.map((s, i) => (
                                <button key={s} onClick={() => { setActiveSession(s); setIsSessionMenuOpen(false); }} className={`w-full text-left px-5 py-3 text-xs font-bold uppercase tracking-widest border-b border-white/5 hover:bg-white/5 transition-colors ${activeSession === s ? 'text-blue-400 bg-blue-500/10' : 'text-zinc-400'}`}>
                                    {s}
                                </button>
                            ))}
                        </div>
                    )}
                </div>

                <div className="bg-zinc-900 border border-white/10 rounded-2xl p-1 flex items-center shrink-0">
                    <button onClick={() => setViewMode('grid')} className={`p-2.5 rounded-xl transition-all ${viewMode === 'grid' ? 'bg-zinc-800 text-white shadow-sm' : 'text-zinc-500 hover:text-zinc-300'}`} title="Grid View"><LayoutGrid size={18} /></button>
                    <button onClick={() => setViewMode('campus')} className={`p-2.5 rounded-xl transition-all ${viewMode === 'campus' ? 'bg-zinc-800 text-white shadow-sm' : 'text-zinc-500 hover:text-zinc-300'}`} title="Venue View"><Building2 size={18} /></button>
                    <div className="w-px h-6 bg-white/5 mx-1"></div>
                    <button onClick={() => setViewMode('metrics')} className={`p-2.5 rounded-xl transition-all ${viewMode === 'metrics' ? 'bg-blue-600 text-white shadow-lg' : 'text-zinc-500 hover:text-blue-400'}`} title="Analytics"><BarChart3 size={18} /></button>
                </div>

                {viewMode !== 'metrics' && (
                    <div className="relative flex-1">
                        <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500" />
                        <input type="text" placeholder="Search..." className="w-full bg-zinc-900/50 border border-white/5 rounded-2xl pl-12 pr-4 py-3 text-sm text-white focus:outline-none focus:border-blue-500/50 transition-all focus:bg-zinc-900" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
                        {searchQuery && <button onClick={() => setSearchQuery('')} className="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-white"><X size={14} /></button>}
                    </div>
                )}
            </div>
        </div>

        {/* --- VENUE STRIP --- */}
        {viewMode !== 'metrics' && (
            <div className="space-y-4">
                {/* Venue Pills */}
                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
                    <button 
                        onClick={() => setFilterVenue(null)}
                        className={`flex flex-col items-center justify-center p-3 rounded-2xl border transition-all ${
                            filterVenue === null 
                            ? 'bg-zinc-100 border-white text-black shadow-lg scale-105' 
                            : 'bg-zinc-900/50 border-white/5 text-zinc-500 hover:bg-zinc-800'
                        }`}
                    >
                        <LayoutGrid size={18} className="mb-2"/>
                        <span className="text-[9px] font-black uppercase tracking-widest">All Venues</span>
                        <span className="text-[9px] font-medium opacity-60">{sessionClasses.length} Classes</span>
                    </button>

                    {availableVenues.map(venue => {
                        const theme = getVenueTheme(venue);
                        const count = sessionClasses.filter(c => c.venue === venue).length;
                        const isActive = filterVenue === venue;

                        return (
                            <button
                                key={venue}
                                onClick={() => setFilterVenue(isActive ? null : venue)}
                                className={`flex flex-col items-center justify-center p-3 rounded-2xl border transition-all relative overflow-hidden group ${
                                    isActive 
                                    ? `bg-zinc-950 ${theme.border} ${theme.color} shadow-lg scale-105 ring-1 ring-inset ${theme.color}` 
                                    : 'bg-zinc-900/50 border-white/5 text-zinc-500 hover:bg-zinc-800 hover:text-zinc-300'
                                }`}
                            >
                                <div className={`mb-2 p-2 rounded-full ${isActive ? theme.bg : 'bg-zinc-950'}`}>
                                    {theme.icon}
                                </div>
                                <span className="text-[9px] font-black uppercase tracking-widest text-center truncate w-full px-1">{venue}</span>
                                <span className="text-[9px] font-medium opacity-60 mt-0.5">{count} Classes</span>
                                
                                {isActive && <div className={`absolute inset-0 opacity-10 ${theme.bg}`} />}
                            </button>
                        )
                    })}
                </div>

                {/* Secondary Filters (Day/Age) */}
                <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-white/5">
                    <span className="text-[10px] font-black uppercase text-zinc-600 tracking-widest mr-2 flex items-center gap-1"><Filter size={12}/> Refine:</span>
                    {availableDays.map(day => (
                        <button key={day} onClick={() => setFilterDay(filterDay === day ? null : day)} className={`px-4 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wide border transition-all ${filterDay === day ? 'bg-zinc-100 text-black border-white' : 'bg-zinc-900/30 border-white/5 text-zinc-500 hover:text-white'}`}>
                            {day}
                        </button>
                    ))}
                    <div className="w-px h-4 bg-white/10 mx-1 hidden sm:block"></div>
                    
                    {/* 🆕 UPDATED AGE FILTERS: Using Buckets */}
                    {AGE_BUCKETS.map(bucket => (
                        <button 
                           key={bucket.label} 
                           onClick={() => setFilterAgeLabel(filterAgeLabel === bucket.label ? null : bucket.label)} 
                           className={`px-4 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wide border transition-all ${filterAgeLabel === bucket.label ? 'bg-zinc-100 text-black border-white' : 'bg-zinc-900/30 border-white/5 text-zinc-500 hover:text-white'}`}
                        >
                            {bucket.label.split(" ")[0]}
                        </button>
                    ))}
                </div>
            </div>
        )}
      </div>

      {/* --- VIEW: GRID --- */}
      {viewMode === 'grid' && (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 pb-20">
            {visibleClasses.map((cls) => (
                <ClassCard key={cls.id} cls={cls} onClick={() => setSelectedClass(cls)} />
            ))}
            {visibleClasses.length === 0 && <EmptyState />}
        </div>
      )}

      {/* --- VIEW: VENUE (Grouped) --- */}
      {viewMode === 'campus' && (
        <div className="space-y-8 pb-20">
            {Object.keys(classesByVenue).sort().map(venue => {
                const theme = getVenueTheme(venue);
                return (
                    <div key={venue} className="space-y-4">
                        <div className={`flex items-center gap-3 sticky top-0 bg-zinc-950/95 backdrop-blur-md p-4 z-10 border-y border-white/5 ${theme.color}`}>
                            {theme.icon}
                            <h3 className="text-lg font-black uppercase tracking-tight text-white">{venue}</h3>
                            <span className="ml-auto text-xs font-bold text-zinc-500 bg-zinc-900 border border-white/5 px-3 py-1 rounded-full">
                                {classesByVenue[venue].length} Classes
                            </span>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 px-2">
                            {classesByVenue[venue].map((cls: any) => (
                                <ClassCard key={cls.id} cls={cls} onClick={() => setSelectedClass(cls)} />
                            ))}
                        </div>
                    </div>
                )
            })}
            {visibleClasses.length === 0 && <EmptyState />}
        </div>
      )}

      {/* --- VIEW: METRICS --- */}
      {viewMode === 'metrics' && (
        <div className="space-y-8 pb-20 animate-in fade-in slide-in-from-bottom-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <MetricCard icon={<Users className="text-blue-400"/>} label="Total Enrollment" value={metrics.totalStudents} sub="Students Active" color="bg-blue-500/10 border-blue-500/20"/>
                <MetricCard icon={<School className="text-purple-400"/>} label="Total Classes" value={sessionClasses.length} sub="Active Courses" color="bg-purple-500/10 border-purple-500/20"/>
                <MetricCard icon={<DollarSign className="text-emerald-400"/>} label="Est. Revenue" value={`$${(metrics.totalRevenue / 1000).toFixed(1)}k`} sub="Based on $275 avg" color="bg-emerald-500/10 border-emerald-500/20"/>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <div className="bg-zinc-900/50 border border-white/5 rounded-3xl p-6">
                    <h3 className="text-sm font-black uppercase text-zinc-500 tracking-widest mb-6 flex items-center gap-2"><Building2 size={16} className="text-emerald-500"/> Venue Utilization</h3>
                    <div className="space-y-4">
                        {metrics.byVenue.map(([loc, data]: any) => {
                             const theme = getVenueTheme(loc);
                             return (
                                <div key={loc} className="flex-1">
                                    <div className="flex justify-between mb-1 items-center">
                                        <span className={`font-bold text-sm ${theme.color} flex items-center gap-2`}>{theme.icon} {loc}</span>
                                        <span className="text-xs font-mono text-zinc-400">{data.students} students</span>
                                    </div>
                                    <div className="h-2 w-full bg-zinc-950 rounded-full overflow-hidden border border-white/5">
                                        <div className={`h-full rounded-full ${theme.bg.replace('/10', '')}`} style={{ width: `${(data.students / metrics.totalStudents) * 100}%` }} />
                                    </div>
                                </div>
                             )
                        })}
                    </div>
                </div>

                <div className="bg-zinc-900/50 border border-white/5 rounded-3xl p-6">
                    <h3 className="text-sm font-black uppercase text-zinc-500 tracking-widest mb-6 flex items-center gap-2"><Users size={16} className="text-blue-500"/> Teacher Performance</h3>
                    <div className="space-y-3 max-h-[300px] overflow-y-auto custom-scrollbar pr-2">
                        {metrics.byTeacher.map(([teacher, data]: any) => (
                            <div key={teacher} className="flex items-center justify-between p-3 bg-zinc-950 border border-white/5 rounded-xl">
                                <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 rounded-full bg-zinc-900 flex items-center justify-center text-[10px] font-black text-zinc-500 border border-white/5">{teacher.substring(0,2).toUpperCase()}</div>
                                    <div><div className="font-bold text-white text-sm">{teacher}</div><div className="text-[10px] text-zinc-500 uppercase tracking-wider">{data.count} Classes</div></div>
                                </div>
                                <div className="text-right"><div className="font-black text-white">{data.students}</div><div className="text-[9px] text-zinc-600 font-black uppercase">Students</div></div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
      )}

      {selectedClass && <ClassManagerModal cls={selectedClass} onClose={() => setSelectedClass(null)} />}
    </>
  );
}

// ... (Subcomponents remain the same, just copied from your original file)
function ClassCard({ cls, onClick }: any) {
    const theme = getVenueTheme(cls.venue);
    return (
        <div onClick={onClick} className="group cursor-pointer bg-zinc-900/40 border border-white/5 hover:border-white/10 hover:bg-zinc-900/60 rounded-2xl p-5 transition-all flex flex-col h-full relative overflow-hidden shadow-sm hover:shadow-2xl">
            <div className={`absolute top-0 right-0 w-24 h-24 bg-gradient-to-br rounded-bl-full -mr-8 -mt-8 pointer-events-none opacity-10 ${theme.bg.replace('bg-', 'from-').replace('/10', '')} to-transparent`} />

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
            </div>
        </div>
    )
}

function MetricCard({ icon, label, value, sub, color }: any) {
    return (
        <div className={`p-6 rounded-3xl border ${color} flex items-center gap-5`}>
            <div className="p-3 bg-zinc-950 rounded-xl border border-white/5">{icon}</div>
            <div>
                <div className="text-3xl font-black text-white tracking-tighter">{value}</div>
                <div className="text-xs font-bold uppercase text-zinc-500 tracking-widest mb-0.5">{label}</div>
                <div className="text-[10px] text-zinc-600">{sub}</div>
            </div>
        </div>
    )
}

function EmptyState() {
    return (
        <div className="col-span-full py-20 text-center border-2 border-dashed border-zinc-800 rounded-3xl bg-zinc-900/20">
            <Search size={48} className="mx-auto text-zinc-700 mb-4" />
            <p className="text-zinc-500 font-bold">No classes found.</p>
            <p className="text-zinc-600 text-xs mt-1">Try adjusting your filters or search terms.</p>
        </div>
    )
}