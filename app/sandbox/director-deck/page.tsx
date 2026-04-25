'use client';

import { useState, useEffect } from 'react';

const AUDITION_DAYS = ['Thursday', 'Friday', 'Video/Remote', 'Walk-In'];
const ALL_TIME_SLOTS = ['5:00 PM', '5:30 PM', '6:00 PM', '6:30 PM', '7:00 PM', '7:30 PM'];

// --- CUSTOM SPIDER CHART COMPONENT ---
const SpiderChart = ({ skills }: { skills: Record<string, number> }) => {
  const size = 220;
  const center = size / 2;
  const radius = center - 40;
  const labels = Object.keys(skills);
  const angles = labels.map((_, i) => (Math.PI * 2 * i) / labels.length - Math.PI / 2);

  // Generate the polygon points for the actual skill values
  const dataPoints = labels.map((key, i) => {
    const value = skills[key] / 100;
    const x = center + radius * value * Math.cos(angles[i]);
    const y = center + radius * value * Math.sin(angles[i]);
    return `${x},${y}`;
  }).join(' ');

  // Generate the background "webs" (5 levels: 20, 40, 60, 80, 100)
  const webs = [0.2, 0.4, 0.6, 0.8, 1].map(level => {
    return labels.map((_, i) => {
      const x = center + radius * level * Math.cos(angles[i]);
      const y = center + radius * level * Math.sin(angles[i]);
      return `${x},${y}`;
    }).join(' ');
  });

  return (
    <div className="relative flex items-center justify-center">
      <svg width={size} height={size} className="overflow-visible">
        {/* Background Webs */}
        {webs.map((webPoints, idx) => (
          <polygon key={idx} points={webPoints} fill="none" stroke="#27272a" strokeWidth="1" />
        ))}
        {/* Axis Lines */}
        {angles.map((angle, idx) => (
          <line key={idx} x1={center} y1={center} x2={center + radius * Math.cos(angle)} y2={center + radius * Math.sin(angle)} stroke="#27272a" strokeWidth="1" />
        ))}
        {/* The Data Polygon */}
        <polygon points={dataPoints} fill="rgba(59, 130, 246, 0.2)" stroke="#3b82f6" strokeWidth="2" />
        {/* Data Point Dots */}
        {labels.map((key, i) => {
          const value = skills[key] / 100;
          const x = center + radius * value * Math.cos(angles[i]);
          const y = center + radius * value * Math.sin(angles[i]);
          return <circle key={i} cx={x} cy={y} r="4" fill="#60a5fa" />;
        })}
        {/* Labels */}
        {labels.map((label, i) => {
          const x = center + (radius + 20) * Math.cos(angles[i]);
          const y = center + (radius + 20) * Math.sin(angles[i]);
          return (
            <text key={i} x={x} y={y} fill="#a1a1aa" fontSize="9" fontWeight="900" textAnchor="middle" dominantBaseline="middle" className="uppercase tracking-widest">
              {label}
            </text>
          );
        })}
      </svg>
    </div>
  );
};

// --- DATA GENERATOR ---
const generateMassiveRoster = () => {
  const firstNames = ['Emma', 'Liam', 'Olivia', 'Noah', 'Ava', 'Oliver', 'Isabella', 'Elijah', 'Sophia', 'James', 'Charlotte', 'William', 'Mia', 'Benjamin', 'Amelia', 'Lucas', 'Harper', 'Henry', 'Evelyn', 'Theodore'];
  const lastNames = ['Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller', 'Davis', 'Rodriguez', 'Martinez', 'Hernandez', 'Lopez', 'Gonzalez', 'Wilson', 'Anderson'];
  
  const roster = [];
  for (let i = 0; i < 76; i++) {
    const fName = firstNames[i % firstNames.length];
    const lName = lastNames[i % lastNames.length];
    const isFirst = Math.random() > 0.8;
    const isCheckedIn = Math.random() > 0.5;
    
    let note = '';
    if (i === 0) note = 'Terrified, needs a smile!';
    if (i === 5) note = 'Just getting over a cough, voice might be rough.';
    
    roster.push({
      id: (1000 + i).toString(),
      name: `${fName} ${lName}`,
      avatar: `https://i.pravatar.cc/400?u=${1000 + i}`,
      status: isCheckedIn ? 'Checked In' : 'Pending',
      auditioned: false,
      timeSlot: ALL_TIME_SLOTS[i % ALL_TIME_SLOTS.length],
      auditionDay: 'Thursday',
      isFirstShow: isFirst,
      age: Math.floor(Math.random() * 10) + 8,
      showHistory: isFirst ? [] : [
        { title: 'The Little Mermaid', role: 'Ensemble', season: 'Spring', year: '2024' },
        { title: 'Beauty and the Beast', role: 'Chip', season: 'Fall', year: '2023' }
      ],
      auditionPrep: { monologue: i % 2 === 0 ? 'Comedic 1' : 'Dramatic 2', songTitle: i % 3 === 0 ? 'Tomorrow (Annie)' : 'Stars (Les Mis)', musicProvided: true },
      lobbyNote: note,
      skills: {
        Vocal: Math.floor(Math.random() * 60) + 40,
        Acting: Math.floor(Math.random() * 60) + 40,
        Dance: Math.floor(Math.random() * 60) + 40,
        Presence: Math.floor(Math.random() * 60) + 40,
        Prep: Math.floor(Math.random() * 60) + 40,
      },
      directorNotes: {
        Connor: 'Great projection. Took redirection very well.',
        Rebecca: 'Picked up the combo fast, but needs to spot turns.',
        Hailey: 'Pitch was slightly sharp on the high belt, but good tone.'
      }
    });
  }
  return roster;
};

export default function DirectorDeckSandbox() {
  const [students, setStudents] = useState<any[]>([]);
  const [hasMounted, setHasMounted] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeDayFilter, setActiveDayFilter] = useState('Thursday');
  const [activeStudent, setActiveStudent] = useState<any | null>(null);

  useEffect(() => {
    setStudents(generateMassiveRoster());
    setHasMounted(true);
  }, []);

  const filteredStudents = students.filter(s => 
    s.name.toLowerCase().includes(searchQuery.toLowerCase()) &&
    s.auditionDay === activeDayFilter &&
    s.status === 'Checked In'
  );

  const groupedStudents = filteredStudents.reduce((acc, student) => {
    if (!acc[student.timeSlot]) acc[student.timeSlot] = [];
    acc[student.timeSlot].push(student);
    return acc;
  }, {} as Record<string, any[]>);

  const handleScoreStudent = (id: string) => {
    setStudents(students.map(s => s.id === id ? { ...s, auditioned: true } : s));
    setActiveStudent(null);
  };

  const simulateLobbyCheckIn = () => {
    const pendingKids = students.filter(s => s.status === 'Pending' && s.auditionDay === activeDayFilter);
    if (pendingKids.length > 0) {
      const luckyKid = pendingKids[0];
      setStudents(students.map(s => s.id === luckyKid.id ? { ...s, status: 'Checked In' } : s));
      alert(`Simulation: ${luckyKid.name} was just checked in by the Lobby! They will now appear in your list.`);
    }
  };

  if (!hasMounted) return <div className="min-h-screen bg-black flex items-center justify-center text-zinc-500 font-black tracking-widest text-xs uppercase">Loading Director Deck...</div>;

  return (
    <div className="flex h-screen bg-black text-white overflow-hidden font-sans">
      
      {/* UNIFIED SIDEBAR BRANDING */}
      <aside className="hidden md:flex h-full shrink-0 flex-col w-64 border-r border-zinc-800 bg-zinc-950">
        <div className="h-16 flex items-center border-b border-white/5 px-6 shrink-0">
          <div className="flex flex-col">
            <h1 className="text-sm font-black tracking-tighter text-blue-500">OPEN<span className="text-white">BACKSTAGE</span></h1>
            <span className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest">Creative Suite</span>
          </div>
        </div>
        <div className="p-4 space-y-2">
          <div className="px-3 py-2 rounded-lg text-zinc-400 hover:bg-white/5 hover:text-zinc-200 text-xs font-bold transition-colors flex items-center gap-3">
            <i className="fas fa-theater-masks"></i> Show Hub
          </div>
          <div className="px-3 py-2 rounded-lg bg-blue-600/20 text-blue-400 text-xs font-bold border border-blue-500/20 flex items-center gap-3">
            <i className="fas fa-clipboard-list"></i> Audition Deck
          </div>
          <div className="px-3 py-2 rounded-lg text-zinc-400 hover:bg-white/5 hover:text-zinc-200 text-xs font-bold transition-colors flex items-center gap-3">
            <i className="fas fa-users"></i> Cast Grid
          </div>
        </div>
      </aside>

      <main className="flex-1 flex flex-col min-w-0 h-full relative">
        <header className="p-4 md:p-6 border-b border-zinc-800 bg-zinc-950 shrink-0 z-20">
          <div className="flex flex-col md:flex-row justify-between md:items-center gap-4">
            <div>
              <h1 className="text-xl md:text-2xl font-black italic uppercase text-white tracking-tight">Audition Deck</h1>
              <div className="flex items-center gap-2 mt-1">
                <span className="px-2 py-0.5 bg-blue-500/10 text-blue-400 text-[9px] font-black uppercase tracking-widest rounded border border-blue-500/20">Little Mermaid Jr.</span>
                <span className="text-[10px] font-black uppercase tracking-widest text-zinc-500">• Sandbox Director</span>
              </div>
            </div>
            
            <div className="flex gap-2 overflow-x-auto pb-2 md:pb-0 no-scrollbar">
              {AUDITION_DAYS.map(day => (
                <button key={day} onClick={() => setActiveDayFilter(day)} className={`px-4 py-2 rounded-lg text-[10px] font-black uppercase transition-colors whitespace-nowrap border ${activeDayFilter === day ? 'bg-white text-black border-transparent' : 'bg-zinc-900 text-zinc-500 border-white/5 hover:text-white'}`}>
                  {day}
                </button>
              ))}
            </div>
          </div>

          <div className="flex justify-between items-center mt-6">
            <div className="relative w-full md:w-64">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 opacity-40 text-xs">🔍</span>
              <input type="text" placeholder="Find checked-in student..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="w-full bg-zinc-900 border border-white/5 rounded-lg py-2.5 pl-10 pr-4 text-xs focus:ring-1 ring-blue-500 outline-none text-white"/>
            </div>
            <button onClick={simulateLobbyCheckIn} className="px-4 py-2 bg-blue-600/20 text-blue-400 text-[10px] font-black uppercase tracking-widest rounded-lg border border-blue-500/30 hover:bg-blue-600 hover:text-white transition-colors hidden md:block">
              Simulate Lobby Check-In
            </button>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-4 md:p-6 custom-scrollbar bg-black relative">
          {Object.keys(groupedStudents).length === 0 ? (
            <div className="text-center py-20 text-zinc-600 font-black tracking-widest text-xs uppercase">No Checked-In Students Found</div>
          ) : (
            ALL_TIME_SLOTS.map(slot => {
              if (!groupedStudents[slot]) return null;
              return (
                <div key={slot} className="mb-8">
                  <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-blue-500 mb-3 flex items-center gap-2 sticky top-0 bg-black/95 backdrop-blur py-2 z-10">
                    <i className="fas fa-clock"></i> {slot}
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
                    {groupedStudents[slot].map((student) => (
                      <button key={student.id} onClick={() => setActiveStudent(student)} className={`text-left p-3 rounded-xl transition-all border flex items-center gap-4 group ${student.auditioned ? 'bg-zinc-900/40 border-transparent opacity-50' : 'bg-zinc-900 border-white/5 hover:border-blue-500/30 hover:bg-zinc-800'}`}>
                        <div className="relative shrink-0">
                          <img src={student.avatar} className="w-12 h-12 rounded-full object-cover border border-zinc-700" alt="" />
                          {student.lobbyNote && !student.auditioned && (
                            <div className="absolute -top-1 -right-1 w-4 h-4 bg-amber-500 border-2 border-zinc-900 rounded-full flex items-center justify-center shadow-[0_0_10px_rgba(245,158,11,0.5)] animate-bounce">
                              <i className="fas fa-exclamation text-[8px] text-black"></i>
                            </div>
                          )}
                          {student.auditioned && (
                            <div className="absolute -top-1 -right-1 w-4 h-4 bg-emerald-500 border-2 border-zinc-900 rounded-full flex items-center justify-center">
                              <i className="fas fa-check text-[8px] text-black font-black"></i>
                            </div>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-bold text-sm text-white truncate group-hover:text-blue-400 transition-colors">{student.name}</p>
                          <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest">Age {student.age} • {student.auditionPrep.monologue.split(' ')[0]}</p>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </main>

      {/* THE MASSIVE DIRECTOR'S MODAL */}
      {activeStudent && (
        <div className="fixed inset-0 bg-black/90 backdrop-blur-md flex items-center justify-center p-4 z-50" onClick={() => setActiveStudent(null)}>
          <div className="bg-zinc-950 border border-zinc-800 rounded-3xl w-full max-w-5xl overflow-hidden shadow-2xl flex flex-col md:flex-row h-full max-h-[85vh]" onClick={(e) => e.stopPropagation()}>
            
            {/* LEFT COLUMN: Bio & Context */}
            <div className="w-full md:w-1/3 border-b md:border-b-0 md:border-r border-zinc-800 bg-zinc-900/30 p-6 md:p-8 flex flex-col overflow-y-auto custom-scrollbar">
              <button onClick={() => setActiveStudent(null)} className="absolute top-4 right-4 md:hidden text-zinc-500 hover:text-white">&times;</button>
              
              <div className="flex flex-col items-center text-center mb-8">
                <img src={activeStudent.avatar} className="w-32 h-32 rounded-full border-4 border-zinc-800 shadow-2xl mb-4 object-cover" alt="" />
                <h2 className="text-3xl font-black text-white leading-tight">{activeStudent.name}</h2>
                <div className="flex gap-2 mt-2">
                  <span className="px-2 py-1 bg-zinc-800 rounded text-[10px] font-black text-zinc-400 uppercase tracking-widest">Age {activeStudent.age}</span>
                  <span className="px-2 py-1 bg-zinc-800 rounded text-[10px] font-black text-zinc-400 uppercase tracking-widest">ID #{activeStudent.id}</span>
                </div>
              </div>

              {activeStudent.lobbyNote && (
                <div className="mb-6 p-4 bg-amber-500/10 border border-amber-500/20 rounded-2xl relative overflow-hidden shrink-0">
                  <div className="absolute top-0 left-0 w-1.5 h-full bg-amber-500"></div>
                  <p className="text-[10px] font-black uppercase tracking-widest text-amber-500 mb-1.5 flex items-center gap-2">
                    <i className="fas fa-bell animate-pulse"></i> Lobby Alert
                  </p>
                  <p className="text-amber-100 text-sm font-medium">{activeStudent.lobbyNote}</p>
                </div>
              )}

              <div className="space-y-6">
                <div className="bg-zinc-900 border border-white/5 p-4 rounded-2xl shadow-inner">
                  <p className="text-[9px] font-black uppercase tracking-widest text-zinc-500 mb-1">Monologue</p>
                  <p className="text-white text-sm font-bold">{activeStudent.auditionPrep.monologue}</p>
                  <div className="w-full h-px bg-white/5 my-3"></div>
                  <p className="text-[9px] font-black uppercase tracking-widest text-zinc-500 mb-1">Song Track</p>
                  <p className="text-white text-sm font-bold flex items-center justify-between">
                    {activeStudent.auditionPrep.songTitle}
                    <span className="text-[9px] text-emerald-500 bg-emerald-500/10 px-2 py-0.5 rounded-full uppercase tracking-widest">Loaded</span>
                  </p>
                </div>

                <div>
                  <p className="text-[10px] font-black uppercase tracking-widest text-zinc-500 mb-3 flex items-center gap-2">
                    <i className="fas fa-history"></i> CYT Resume
                  </p>
                  {activeStudent.isFirstShow ? (
                    <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-center">
                      <p className="text-[10px] font-black uppercase tracking-widest text-emerald-400">First Show</p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {activeStudent.showHistory.map((s:any, i:number) => (
                        <div key={i} className="flex justify-between items-center p-3 bg-zinc-900/50 border border-white/5 rounded-xl">
                          <div>
                            <p className="text-xs font-bold text-white mb-0.5">{s.title}</p>
                            <p className="text-[10px] text-zinc-500 uppercase tracking-widest font-bold">{s.season} {s.year}</p>
                          </div>
                          <span className="text-[10px] font-black text-blue-400 uppercase tracking-widest text-right">{s.role}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* RIGHT COLUMN: Grading & Spider Chart */}
            <div className="flex-1 flex flex-col bg-zinc-950 relative">
              <div className="p-6 md:p-8 border-b border-zinc-800 flex justify-between items-center bg-zinc-900/50 shrink-0">
                <div>
                  <h3 className="text-lg font-black uppercase italic tracking-widest text-white mb-1">Audition Rubric</h3>
                  <p className="text-zinc-500 text-xs font-medium">Evaluate the candidate across 5 key metrics.</p>
                </div>
                <button onClick={() => setActiveStudent(null)} className="hidden md:block w-10 h-10 rounded-full bg-zinc-800 text-zinc-400 hover:text-white hover:bg-zinc-700 transition-colors flex items-center justify-center text-xl font-black">&times;</button>
              </div>

              <div className="flex-1 overflow-y-auto custom-scrollbar p-6 md:p-8 space-y-8">
                
                {/* TOP HALF: SPIDER CHART & SLIDERS */}
                <div className="flex flex-col xl:flex-row gap-8 items-center xl:items-start">
                  {/* The Radar Chart */}
                  <div className="w-full xl:w-1/2 flex flex-col items-center">
                    <p className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-600 mb-6 text-center">Talent Matrix</p>
                    <SpiderChart skills={activeStudent.skills} />
                  </div>

                  {/* The Sliders */}
                  <div className="w-full xl:w-1/2 space-y-5">
                    {Object.keys(activeStudent.skills).map((metric) => (
                      <div key={metric}>
                        <div className="flex justify-between items-end mb-2">
                          <label className="text-[10px] font-black text-white uppercase tracking-widest">{metric}</label>
                          <span className="text-blue-400 font-black text-sm">{activeStudent.skills[metric]} <span className="text-[10px] text-zinc-600">/ 100</span></span>
                        </div>
                        <input 
                          type="range" min="0" max="100" defaultValue={activeStudent.skills[metric]} 
                          className="w-full h-1.5 bg-zinc-800 rounded-full appearance-none cursor-pointer accent-blue-500" 
                        />
                      </div>
                    ))}
                  </div>
                </div>

                <div className="w-full h-px bg-zinc-800"></div>

                {/* BOTTOM HALF: CREATIVE TEAM NOTES */}
                <div>
                  <p className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-600 mb-4 flex items-center gap-2">
                    <i className="fas fa-users"></i> Creative Team Notes
                  </p>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    
                    {/* Director Note */}
                    <div className="bg-zinc-900 border border-white/5 rounded-2xl p-4 flex flex-col">
                      <div className="flex items-center gap-2 mb-3">
                        <div className="w-6 h-6 rounded-full bg-blue-500/20 text-blue-500 flex items-center justify-center text-[10px] font-black">C</div>
                        <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">Connor <span className="opacity-50">(Dir)</span></p>
                      </div>
                      <p className="text-sm text-zinc-300 leading-relaxed font-medium">"{activeStudent.directorNotes.Connor}"</p>
                    </div>

                    {/* Choreographer Note */}
                    <div className="bg-zinc-900 border border-white/5 rounded-2xl p-4 flex flex-col">
                      <div className="flex items-center gap-2 mb-3">
                        <div className="w-6 h-6 rounded-full bg-emerald-500/20 text-emerald-500 flex items-center justify-center text-[10px] font-black">R</div>
                        <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">Rebecca <span className="opacity-50">(Chor)</span></p>
                      </div>
                      <p className="text-sm text-zinc-300 leading-relaxed font-medium">"{activeStudent.directorNotes.Rebecca}"</p>
                    </div>

                    {/* Music Director Note */}
                    <div className="bg-zinc-900 border border-white/5 rounded-2xl p-4 flex flex-col">
                      <div className="flex items-center gap-2 mb-3">
                        <div className="w-6 h-6 rounded-full bg-purple-500/20 text-purple-500 flex items-center justify-center text-[10px] font-black">H</div>
                        <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">Hailey <span className="opacity-50">(MD)</span></p>
                      </div>
                      <p className="text-sm text-zinc-300 leading-relaxed font-medium">"{activeStudent.directorNotes.Hailey}"</p>
                    </div>

                  </div>
                </div>

              </div>

              {/* FOOTER ACTION */}
              <div className="p-6 border-t border-zinc-800 bg-zinc-950 flex justify-between items-center shrink-0">
                <button className="text-[10px] font-black text-zinc-500 hover:text-rose-400 uppercase tracking-widest transition-colors flex items-center gap-2">
                  <i className="fas fa-flag"></i> Flag for Callback
                </button>
                <div className="flex gap-3">
                  <button onClick={() => setActiveStudent(null)} className="px-6 py-3 rounded-xl font-black text-zinc-500 text-[10px] uppercase tracking-widest hover:text-white transition-colors">Cancel</button>
                  <button onClick={() => handleScoreStudent(activeStudent.id)} className="px-8 py-3 rounded-xl font-black text-white bg-blue-600 text-[10px] uppercase tracking-[0.2em] shadow-lg shadow-blue-500/20 hover:bg-blue-500 transition-all">Score & Complete</button>
                </div>
              </div>

            </div>
          </div>
        </div>
      )}

    </div>
  );
}