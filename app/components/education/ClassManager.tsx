"use client";

import React, { useState, useMemo } from 'react';
import { 
  CheckCircle2, XCircle, Clock, 
  ChevronRight, Search, MapPin, 
  ArrowLeft, Users, Calendar, Building2,
  Waves, Compass, Anchor, Navigation, 
  Church, Star, LayoutDashboard, ListChecks
} from 'lucide-react';

export default function ClassManager({ classes, people }: any) {
  const [viewState, setViewState] = useState<'locations' | 'classes' | 'attendance'>('locations');
  const [selectedLocation, setSelectedLocation] = useState<string>("");
  const [selectedClass, setSelectedClass] = useState<any>(null);
  const [searchTerm, setSearchTerm] = useState("");
  
  // --- NEW: STATE MANAGEMENT ---
  const [selectedWeek, setSelectedWeek] = useState(1);
  const [showSummary, setShowSummary] = useState(false);
  // Attendance: { [weekNumber]: { [studentId]: 'Present' | 'Absent' | 'Late' } }
  const [attendanceRecords, setAttendanceRecords] = useState<Record<number, Record<string, string>>>({});

  const handleStatusChange = (studentId: string, status: string) => {
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
    if (n.includes('river of life')) return { icon: <Waves size={24} />, color: 'text-cyan-400', bg: 'bg-cyan-500/10', border: 'border-cyan-500/20', hover: 'group-hover:bg-cyan-500' };
    if (n.includes('hope')) return { icon: <Compass size={24} />, color: 'text-purple-400', bg: 'bg-purple-500/10', border: 'border-purple-500/20', hover: 'group-hover:bg-purple-500' };
    if (n.includes('river club')) return { icon: <Anchor size={24} />, color: 'text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-500/20', hover: 'group-hover:bg-emerald-500' };
    if (n.includes('highway')) return { icon: <Navigation size={24} />, color: 'text-amber-400', bg: 'bg-amber-500/10', border: 'border-amber-500/20', hover: 'group-hover:bg-amber-500' };
    return { icon: <Building2 size={24} />, color: 'text-blue-400', bg: 'bg-blue-500/10', border: 'border-blue-500/20', hover: 'group-hover:bg-blue-500' };
  };

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

  const classRoster = useMemo(() => {
      if (!selectedClass) return [];
      const roster = [];
      for (let i = 0; i < selectedClass.enrolled; i++) {
          if (i < people.length) {
              roster.push({ id: people[i].id.toString(), name: people[i]["Full Name"] });
          } else {
              roster.push({ id: `ghost-${i}`, name: `Student ${i + 1}` });
          }
      }
      return roster;
  }, [selectedClass, people]);

  const filteredClasses = classes.filter((c:any) => 
      c.location === selectedLocation &&
      (c.name.toLowerCase().includes(searchTerm.toLowerCase()) || c.teacher.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  return (
    <div className="flex flex-col h-full bg-zinc-950 text-white font-sans selection:bg-blue-500/30">
        
        {/* VIEW 1: CAMPUS HUB */}
        {viewState === 'locations' && (
            <div className="p-8 max-w-5xl mx-auto w-full animate-in fade-in duration-500">
                <header className="mb-10">
                    <h1 className="text-4xl font-black uppercase italic tracking-tighter text-white">Class Hub</h1>
                    <p className="text-xs font-bold uppercase tracking-widest text-zinc-500">Winter Session 2026 • Tracking System</p>
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

        {/* VIEW 2: CLASS LIST */}
        {viewState === 'classes' && (
            <div className="flex flex-col h-full animate-in slide-in-from-right duration-500">
                <div className="p-8 pb-4 shrink-0">
                    <button onClick={() => setViewState('locations')} className="flex items-center gap-2 text-zinc-500 hover:text-white transition-colors mb-6 text-[10px] font-black uppercase tracking-[0.2em]">
                        <ArrowLeft size={14}/> Back to Hub
                    </button>
                    <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
                        <h1 className="text-4xl font-black uppercase italic tracking-tighter text-white">{selectedLocation}</h1>
                        <div className="relative w-full md:w-80">
                            <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-600"/>
                            <input value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} placeholder="Search classes or teachers..." className="w-full bg-zinc-900 border border-white/5 rounded-2xl pl-12 pr-4 py-3 text-sm focus:border-white/20 outline-none transition-all placeholder:text-zinc-700"/>
                        </div>
                    </div>
                </div>
                <div className="flex-1 overflow-y-auto px-8 pb-8 space-y-4 no-scrollbar">
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

        {/* VIEW 3: ATTENDANCE & SUMMARY */}
        {viewState === 'attendance' && selectedClass && (
            <div className="flex flex-col h-full animate-in slide-in-from-right duration-300">
                <header className="pt-8 px-8 bg-zinc-950 shrink-0 border-b border-white/5">
                    <div className="flex items-center justify-between mb-8">
                        <button onClick={() => setViewState('classes')} className="text-zinc-500 hover:text-white transition-colors">
                            <ArrowLeft size={24}/>
                        </button>
                        
                        <div className="text-center">
                            <h2 className="text-2xl font-black uppercase italic tracking-tighter leading-none">{selectedClass.name}</h2>
                            <p className="text-[9px] text-zinc-500 font-bold uppercase tracking-[0.2em] mt-2">
                                {showSummary ? "Class Health Overview" : `Recording Week ${selectedWeek}`}
                            </p>
                        </div>

                        <button 
                            onClick={() => setShowSummary(!showSummary)}
                            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all border ${
                                showSummary 
                                ? 'bg-indigo-500/10 border-indigo-500/30 text-indigo-400 shadow-[0_0_20px_rgba(99,102,241,0.1)]' 
                                : 'bg-zinc-900 border-white/10 text-zinc-400 hover:text-white'
                            }`}
                        >
                            {showSummary ? <ListChecks size={14}/> : <LayoutDashboard size={14}/>}
                            {showSummary ? "Take Attendance" : "View Summary"}
                        </button>
                    </div>

                    {!showSummary && (
                        <div className="flex items-center gap-2 overflow-x-auto pb-6 no-scrollbar">
                            {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((week) => (
                                <button
                                    key={week}
                                    onClick={() => setSelectedWeek(week)}
                                    className={`flex-shrink-0 w-14 h-14 rounded-2xl flex flex-col items-center justify-center transition-all border-2 ${
                                        selectedWeek === week 
                                        ? 'bg-blue-600 border-blue-400 text-white shadow-[0_0_20px_rgba(37,99,235,0.3)]' 
                                        : 'bg-zinc-900 border-white/5 text-zinc-500 hover:border-white/10 hover:text-zinc-300'
                                    }`}
                                >
                                    <span className="text-[8px] font-black uppercase leading-none mb-1">
                                        {week === 10 ? 'Finale' : 'Week'}
                                    </span>
                                    <span className="text-lg font-black leading-none">
                                        {week === 10 ? <Star size={16} fill="currentColor"/> : week}
                                    </span>
                                </button>
                            ))}
                        </div>
                    )}
                </header>

                <div className="flex-1 overflow-y-auto p-8 space-y-3 bg-zinc-950 no-scrollbar">
                    {classRoster.map((student) => (
                        showSummary ? (
                            <StudentSummaryRow key={student.id} student={student} allWeeks={attendanceRecords} />
                        ) : (
                            <AttendanceRow 
                                key={student.id} 
                                student={student} 
                                currentStatus={attendanceRecords[selectedWeek]?.[student.id] || 'Present'}
                                onStatusChange={(status) => handleStatusChange(student.id, status)}
                            />
                        )
                    ))}
                    <div className="h-20"/> 
                </div>

                {!showSummary && (
                  <div className="absolute bottom-8 right-8">
                      <button className="bg-emerald-600 hover:bg-emerald-500 text-white px-8 py-4 rounded-2xl text-xs font-black uppercase tracking-widest transition-all shadow-2xl shadow-emerald-900/40 active:scale-95">
                          Finalize Week {selectedWeek}
                      </button>
                  </div>
                )}
            </div>
        )}
    </div>
  );
}

function AttendanceRow({ student, currentStatus, onStatusChange }: any) {
    return (
        <div className={`p-4 rounded-3xl border transition-all flex items-center justify-between ${
            currentStatus === 'Absent' ? 'bg-red-950/10 border-red-500/20' : 'bg-zinc-900/50 border-white/5 hover:border-white/10'
        }`}>
            <div className="flex items-center gap-4">
                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center font-black text-sm transition-all ${
                    currentStatus === 'Absent' ? 'bg-red-500 text-white shadow-lg shadow-red-900/20' : 'bg-zinc-800 text-zinc-500'
                }`}>
                    {student.name.charAt(0)}
                </div>
                <div>
                    <div className="font-black text-base text-zinc-200">{student.name}</div>
                    <div className={`text-[10px] font-black uppercase tracking-widest ${
                        currentStatus === 'Absent' ? 'text-red-400' : 'text-zinc-600'
                    }`}>
                        {currentStatus}
                    </div>
                </div>
            </div>
            
            <div className="flex bg-black/40 rounded-2xl p-1.5 gap-1.5 border border-white/5">
                <AttendanceButton active={currentStatus === 'Present'} onClick={() => onStatusChange('Present')} icon={<CheckCircle2 size={20}/>} color="bg-emerald-600" />
                <AttendanceButton active={currentStatus === 'Late'} onClick={() => onStatusChange('Late')} icon={<Clock size={20}/>} color="bg-amber-600" />
                <AttendanceButton active={currentStatus === 'Absent'} onClick={() => onStatusChange('Absent')} icon={<XCircle size={20}/>} color="bg-red-600" />
            </div>
        </div>
    )
}

function StudentSummaryRow({ student, allWeeks }: any) {
    const weeks = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
    const stats = weeks.reduce((acc, w) => {
        const status = allWeeks[w]?.[student.id];
        if (status === 'Absent') acc.absent++;
        if (status === 'Late') acc.late++;
        return acc;
    }, { absent: 0, late: 0 });

    const isAtRisk = stats.absent >= 3;

    return (
        <div className="p-5 rounded-3xl bg-zinc-900/40 border border-white/5 flex flex-col md:flex-row md:items-center justify-between gap-4 group hover:bg-zinc-900 transition-colors">
            <div className="flex items-center gap-4 min-w-[200px]">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-xs font-bold ${isAtRisk ? 'bg-amber-500/20 text-amber-500' : 'bg-zinc-800 text-zinc-500'}`}>
                    {student.name.charAt(0)}
                </div>
                <div>
                    <div className="font-bold text-zinc-200 text-sm">{student.name}</div>
                    <div className="text-[9px] uppercase font-black tracking-widest text-zinc-600 flex gap-2">
                        <span>{stats.absent} Absences</span>
                        <span>•</span>
                        <span>{stats.late} Lates</span>
                    </div>
                </div>
            </div>

            {/* THE GENTLE DOT HEATMAP */}
            <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-2">
                {weeks.map(w => {
                    const status = allWeeks[w]?.[student.id];
                    let bgColor = 'bg-zinc-800/50'; 
                    let glow = '';

                    if (status === 'Present') bgColor = 'bg-emerald-500/30';
                    if (status === 'Late') bgColor = 'bg-amber-500/30';
                    if (status === 'Absent') {
                        // Using your requested grey for a gentle look in summary
                        bgColor = 'bg-zinc-600'; 
                        glow = 'shadow-[0_0_8px_rgba(255,255,255,0.05)]';
                    }

                    return (
                        <div key={w} className="group/dot relative flex flex-col items-center gap-1">
                            <div className={`w-4 h-4 rounded-full transition-all ${bgColor} ${glow}`} />
                            <span className="text-[7px] font-bold text-zinc-700">{w}</span>
                        </div>
                    );
                })}
            </div>

            <div className="flex justify-end min-w-[120px]">
                {isAtRisk ? (
                    <div className="flex items-center gap-2 px-3 py-1.5 bg-amber-500/10 border border-amber-500/20 rounded-full">
                        <div className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                        <span className="text-[8px] font-black text-amber-500 uppercase tracking-tighter">Coordinator Review</span>
                    </div>
                ) : (
                    <div className="text-[8px] font-black text-zinc-700 uppercase tracking-widest border border-zinc-800/50 px-3 py-1.5 rounded-full">
                        Fully Eligible
                    </div>
                )}
            </div>
        </div>
    );
}

function AttendanceButton({ active, onClick, icon, color }: any) {
    return (
        <button onClick={onClick} className={`p-2.5 rounded-xl transition-all ${active ? `${color} text-white shadow-lg scale-110` : 'text-zinc-800 hover:text-zinc-500'}`}>
            {icon}
        </button>
    )
}