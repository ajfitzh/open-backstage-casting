"use client";

import { useState, useMemo } from 'react';
import Link from 'next/link';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, 
  ResponsiveContainer, Cell 
} from 'recharts';
import { 
  LayoutGrid, UserSquare2, MapPin, Search, 
  ClipboardList, Users, School, Building2, Map, AlertTriangle, Info 
} from 'lucide-react';

export default function AcademyClient({ classes, venues }: { classes: any[], venues: any[] }) {
  
  // --- 1. AUTO-DETECT LATEST SEASON ---
  // This logic scans all classes and finds the "Highest Number" year (e.g., 2026 > 2025).
  // If years are equal, it prioritizes order: Fall > Summer > Spring > Winter.
  const defaultSeason = useMemo(() => {
    const uniqueSessions = Array.from(new Set(classes.map(c => c.session).filter(Boolean)));
    
    if (uniqueSessions.length === 0) return "";

    const sortedSessions = uniqueSessions.sort((a, b) => {
      // Extract the year (e.g., "Winter 2026" -> 2026)
      const yearA = parseInt(a.match(/\d{4}/)?.[0] || "0");
      const yearB = parseInt(b.match(/\d{4}/)?.[0] || "0");

      // Primary Sort: Year (Descending)
      if (yearA !== yearB) return yearB - yearA;

      // Secondary Sort: Season Weight (Fall > Summer > Spring > Winter)
      const weights: Record<string, number> = { "Fall": 4, "Summer": 3, "Spring": 2, "Winter": 1 };
      const seasonA = weights[a.split(" ")[0]] || 0;
      const seasonB = weights[b.split(" ")[0]] || 0;
      
      return seasonB - seasonA;
    });

    return sortedSessions[0]; // Returns the "Future-most" session
  }, [classes]);

  const [activeTab, setActiveTab] = useState<'manager' | 'logistics' | 'overview' | 'teachers'>('manager');
  // Initialize search with the auto-detected season
  const [searchTerm, setSearchTerm] = useState(defaultSeason);

  // --- 2. MASTER FILTER ---
  const filteredClasses = useMemo(() => {
    const term = searchTerm.toLowerCase();
    return classes.filter(c => 
      c.name.toLowerCase().includes(term) || 
      c.teacher.toLowerCase().includes(term) ||
      c.session.toLowerCase().includes(term) ||
      c.day.toLowerCase().includes(term) ||
      c.location.toLowerCase().includes(term)
    );
  }, [classes, searchTerm]);

  // --- 3. SMART VENUE FILTER ---
  const activeVenues = useMemo(() => {
    const activeClassIds = new Set(filteredClasses.map(c => c.id));
    const term = searchTerm.toLowerCase();

    return venues.map(venue => {
      const venueMatches = venue.name.toLowerCase().includes(term) || venue.type.toLowerCase().includes(term);

      const activeSpaces = venue.spaces.map((space: any) => {
        const relevantClasses = space.classes.filter((c: any) => activeClassIds.has(c.id));
        return { ...space, classes: relevantClasses };
      });

      const hasActiveClasses = activeSpaces.some((s:any) => s.classes.length > 0);
      
      if (venueMatches || hasActiveClasses) {
        return { ...venue, spaces: activeSpaces, hasActiveClasses };
      }
      return null;
    }).filter(Boolean);
  }, [venues, filteredClasses, searchTerm]);

  // --- 4. ANALYTICS ---
  const stats = useMemo(() => {
    const teachers: Record<string, number> = {};
    const classTypes: Record<string, number> = {};
    filteredClasses.forEach(c => {
      teachers[c.teacher] = (teachers[c.teacher] || 0) + c.students;
      classTypes[c.name] = (classTypes[c.name] || 0) + c.students;
    });
    return {
      teacherData: Object.entries(teachers).map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count),
      classData: Object.entries(classTypes).map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count).slice(0, 10)
    };
  }, [filteredClasses]);

  return (
    <div className="h-full flex flex-col">
      {/* TOOLBAR */}
      <div className="px-8 py-4 bg-zinc-950 flex flex-col md:flex-row gap-4 border-b border-white/5 justify-between items-center">
        <div className="flex gap-2 bg-zinc-900/50 p-1 rounded-xl border border-white/5 overflow-x-auto max-w-full">
          <TabButton active={activeTab === 'manager'} onClick={() => setActiveTab('manager')} icon={<ClipboardList size={14}/>} label="Class Manager" />
          <TabButton active={activeTab === 'logistics'} onClick={() => setActiveTab('logistics')} icon={<Map size={14}/>} label="Logistics" />
          <TabButton active={activeTab === 'overview'} onClick={() => setActiveTab('overview')} icon={<LayoutGrid size={14}/>} label="Trends" />
          <TabButton active={activeTab === 'teachers'} onClick={() => setActiveTab('teachers')} icon={<UserSquare2 size={14}/>} label="Faculty" />
        </div>
        
        <div className="relative group">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500 group-focus-within:text-blue-500 transition-colors" size={14} />
          <input 
            type="text" 
            placeholder="Search classes, days, or venues..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="bg-zinc-900 border border-zinc-800 rounded-xl py-2.5 pl-9 pr-4 text-xs text-white focus:outline-none focus:border-blue-500/50 focus:ring-4 focus:ring-blue-500/10 w-64 transition-all"
          />
        </div>
      </div>

      <div className="flex-1 p-8 overflow-y-auto custom-scrollbar bg-black/20">
        
        {/* TAB 1: CLASS MANAGER */}
        {activeTab === 'manager' && (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 animate-in fade-in slide-in-from-bottom-4">
            {filteredClasses.length > 0 ? (
              filteredClasses.map(cls => (
                <div key={cls.id} className="bg-zinc-900 border border-white/5 p-5 rounded-2xl group hover:border-blue-500/30 hover:shadow-lg hover:shadow-blue-900/10 transition-all flex flex-col">
                  <div className="flex justify-between items-start mb-3">
                    <span className="text-[10px] font-black text-zinc-500 uppercase tracking-widest bg-zinc-950 px-2 py-1 rounded border border-white/5">{cls.session}</span>
                    <div className="text-right">
                       <span className="text-[10px] font-bold text-zinc-400 flex items-center justify-end gap-1"><MapPin size={10} /> {cls.location}</span>
                       {cls.spaceName ? (
                         <span className="text-[9px] font-bold text-blue-500/80 block uppercase tracking-wide mt-0.5">@{cls.spaceName}</span>
                       ) : cls.campus && (
                         <span className="text-[9px] font-bold text-zinc-600 block uppercase tracking-wide mt-0.5">@{cls.campus}</span>
                       )}
                    </div>
                  </div>
                  <div className="flex-1 mb-4">
                    <h3 className="text-sm font-black text-white mb-1 leading-tight group-hover:text-blue-400 transition-colors">{cls.name}</h3>
                    <div className="flex items-center gap-2 text-xs text-zinc-500 mb-2"><School size={12} /><span>{cls.teacher}</span></div>
                    <div className="flex items-center gap-4 text-[10px] font-bold text-zinc-600 uppercase tracking-wider">
                       <span>{cls.day}</span><span>•</span><span>{cls.ageRange} yrs</span><span>•</span>
                       <span className={cls.students > 0 ? "text-emerald-500" : ""}>{cls.students} Enrolled</span>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2 mt-auto pt-4 border-t border-white/5">
                    <Link href={`/education/class/${cls.id}/attendance`} className="flex items-center justify-center gap-2 py-2 rounded-lg bg-zinc-800 text-zinc-400 text-[10px] font-bold uppercase tracking-wide hover:bg-blue-600 hover:text-white transition-all"><ClipboardList size={12} /> Attendance</Link>
                    <Link href={`/education/class/${cls.id}`} className="flex items-center justify-center gap-2 py-2 rounded-lg bg-zinc-800 text-zinc-400 text-[10px] font-bold uppercase tracking-wide hover:bg-zinc-700 hover:text-white transition-all"><Users size={12} /> Roster</Link>
                  </div>
                </div>
              ))
            ) : (
              <div className="col-span-full py-20 text-center text-zinc-500 italic">No classes found matching &quot;{searchTerm}&quot;</div>
            )}
          </div>
        )}

        {/* TAB 2: LOGISTICS */}
        {activeTab === 'logistics' && (
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-8 animate-in fade-in slide-in-from-bottom-4">
             {activeVenues.length > 0 ? (
               activeVenues.map((venue: any) => (
                <div key={venue.id} className="bg-zinc-900/50 border border-white/5 rounded-[2rem] overflow-hidden flex flex-col">
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
                      {venue.rates.weekend > 0 && <p className="text-[9px] text-zinc-600 mt-1 uppercase font-bold">+${venue.rates.weekend} Wknd</p>}
                    </div>
                  </div>

                  <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-4">
                    {venue.spaces.map((space: any) => {
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
              ))
             ) : (
               <div className="col-span-full py-12 text-center border-2 border-dashed border-zinc-800 rounded-3xl">
                 <Info size={32} className="mx-auto text-zinc-700 mb-3" />
                 <p className="text-sm font-bold text-zinc-500">Logistics Data Unavailable</p>
                 <p className="text-xs text-zinc-600 mt-1 max-w-md mx-auto">
                   No venues match &ldquo;{searchTerm}&ldquo;. Try clearing the search or checking your Class-Space links.
                 </p>
               </div>
             )}
          </div>
        )}

        {/* TAB 3: TRENDS */}
        {activeTab === 'overview' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-in fade-in slide-in-from-bottom-4">
            <div className="lg:col-span-2 bg-zinc-900/50 border border-white/5 p-8 rounded-[2.5rem]">
              <h3 className="text-xs font-black text-white uppercase tracking-widest mb-8 flex items-center gap-2"><LayoutGrid size={16} className="text-blue-500" /> Top Classes</h3>
              <div className="h-[400px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={stats.classData} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" stroke="#18181b" horizontal={false} />
                    <XAxis type="number" stroke="#3f3f46" tick={{fill: '#71717a', fontSize: 10}} />
                    <YAxis dataKey="name" type="category" width={140} stroke="#3f3f46" tick={{fill: '#71717a', fontSize: 10, fontWeight: 'bold'}} />
                    <Tooltip cursor={{fill: '#27272a'}} contentStyle={{ backgroundColor: '#09090b', borderColor: '#27272a', borderRadius: '16px' }} />
                    <Bar dataKey="count" radius={[0, 4, 4, 0]} barSize={24}>{stats.classData.map((e, i) => <Cell key={i} fill={i < 3 ? '#3b82f6' : '#27272a'} />)}</Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        )}

        {/* TAB 4: FACULTY */}
        {activeTab === 'teachers' && (
          <div className="bg-zinc-900/50 border border-white/5 p-8 rounded-[2.5rem] animate-in fade-in slide-in-from-bottom-4">
            <h3 className="text-xs font-black text-white uppercase tracking-widest mb-8 flex items-center gap-2"><UserSquare2 size={16} className="text-purple-500" /> Instructor Load</h3>
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
      </div>
    </div>
  );
}

function TabButton({ active, onClick, icon, label }: { active: boolean, onClick: () => void, icon: any, label: string }) {
  return (
    <button onClick={onClick} className={`px-4 py-2 rounded-lg flex items-center gap-2 text-[10px] font-black uppercase tracking-widest transition-all ${active ? 'bg-zinc-100 text-black shadow-lg scale-[1.02]' : 'text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800'}`}>
      {icon} <span className="hidden sm:inline">{label}</span>
    </button>
  );
}