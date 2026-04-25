'use client';

import { useState, useEffect, useMemo } from 'react';

const AUDITION_DAYS = ['Thursday', 'Friday', 'Video/Remote', 'Walk-In'];
const ALL_TIME_SLOTS = ['5:00 PM', '5:30 PM', '6:00 PM', '6:30 PM', '7:00 PM', '7:30 PM'];

const generateMassiveRoster = () => {
  const firstNames = ['Emma', 'Liam', 'Olivia', 'Noah', 'Ava', 'Oliver', 'Isabella', 'Elijah', 'Sophia', 'James', 'Charlotte', 'William', 'Mia', 'Benjamin', 'Amelia', 'Lucas', 'Harper', 'Henry', 'Evelyn', 'Theodore', 'Abigail', 'Jack', 'Emily', 'Levi', 'Elizabeth', 'Alexander', 'Mila', 'Jackson', 'Ella', 'Mateo', 'Avery', 'Daniel', 'Sofia', 'Michael', 'Camila', 'Mason', 'Aria', 'Sebastian', 'Scarlett', 'Ethan', 'Victoria', 'Logan', 'Madison', 'Owen', 'Luna', 'Samuel', 'Grace', 'Jacob', 'Chloe', 'Asher', 'Penelope', 'Aiden', 'Layla', 'John', 'Riley', 'Joseph', 'Zoey', 'Wyatt', 'Nora', 'David', 'Lily', 'Leo', 'Eleanor', 'Luke', 'Hannah', 'Julian', 'Lillian', 'Hudson', 'Addison', 'Grayson', 'Aubrey', 'Matthew', 'Ellie', 'Ezra', 'Stella', 'Gabriel'];
  const lastNames = ['Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller', 'Davis', 'Rodriguez', 'Martinez', 'Hernandez', 'Lopez', 'Gonzalez', 'Wilson', 'Anderson', 'Thomas', 'Taylor', 'Moore', 'Jackson', 'Martin', 'Lee', 'Perez', 'Thompson', 'White', 'Harris', 'Sanchez', 'Clark', 'Ramirez', 'Lewis', 'Robinson', 'Walker', 'Young', 'Allen', 'King', 'Wright', 'Scott', 'Torres', 'Nguyen', 'Hill', 'Flores', 'Green', 'Adams', 'Nelson', 'Baker', 'Hall', 'Rivera', 'Campbell', 'Mitchell', 'Carter', 'Roberts'];
  
  const roster = [];
  for (let i = 0; i < 76; i++) {
    const fName = firstNames[i % firstNames.length];
    const lName = lastNames[i % lastNames.length];
    const isFirst = Math.random() > 0.8;
    const timeSlot = ALL_TIME_SLOTS[i % ALL_TIME_SLOTS.length];
    const isCheckedIn = Math.random() > 0.5; // 50% chance they are ready
    
    // Inject a few fake lobby notes for the demo
    let note = '';
    if (i === 0) note = 'Terrified, needs a smile!';
    if (i === 5) note = 'Just getting over a cough, voice might be rough.';
    
    roster.push({
      id: (1000 + i).toString(),
      name: `${fName} ${lName}`,
      avatar: `https://i.pravatar.cc/400?u=${1000 + i}`,
      status: isCheckedIn ? 'Checked In' : 'Pending',
      auditioned: false, // Have they performed for the director yet?
      timeSlot: timeSlot,
      auditionDay: 'Thursday',
      isFirstShow: isFirst,
      age: Math.floor(Math.random() * 10) + 8, // Ages 8-18
      showHistory: isFirst ? [] : [{ title: 'The Little Mermaid', role: 'Ensemble', year: '2024' }],
      auditionPrep: { monologue: i % 2 === 0 ? 'Comedic 1' : 'Dramatic 2', songTitle: i % 3 === 0 ? 'Tomorrow (Annie)' : 'Stars (Les Mis)', musicProvided: true },
      lobbyNote: note,
      directorScore: null
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

  // Filter only for the active day, and ONLY students who have Checked In
  const filteredStudents = students.filter(s => 
    s.name.toLowerCase().includes(searchQuery.toLowerCase()) &&
    s.auditionDay === activeDayFilter &&
    s.status === 'Checked In' // Crucial: Directors only see kids who have cleared the lobby
  );

  // Group by time slot
  const groupedStudents = filteredStudents.reduce((acc, student) => {
    if (!acc[student.timeSlot]) acc[student.timeSlot] = [];
    acc[student.timeSlot].push(student);
    return acc;
  }, {} as Record<string, any[]>);

  // When director clicks "Complete Audition"
  const handleScoreStudent = (id: string, score: number) => {
    setStudents(students.map(s => s.id === id ? { ...s, auditioned: true, directorScore: score } : s));
    setActiveStudent(null);
  };

  // Temporary function to simulate a kid walking in (changes a pending kid to checked-in)
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
      
      {/* SIDEBAR (Visual Only) */}
      <aside className="hidden md:flex h-full shrink-0 flex-col w-20 border-r border-zinc-800 bg-zinc-950 items-center py-6 gap-8">
        <div className="text-blue-500 font-black text-2xl">CYT</div>
        <div className="space-y-6 text-zinc-500">
          <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center text-blue-500 border border-blue-500/20"><i className="fas fa-theater-masks"></i></div>
          <div className="w-10 h-10 rounded-xl flex items-center justify-center hover:bg-white/5"><i className="fas fa-calendar"></i></div>
          <div className="w-10 h-10 rounded-xl flex items-center justify-center hover:bg-white/5"><i className="fas fa-users"></i></div>
        </div>
      </aside>

      <main className="flex-1 flex flex-col min-w-0 h-full relative">
        
        {/* HEADER */}
        <header className="p-4 md:p-6 border-b-2 bg-zinc-950 border-blue-500 shrink-0 z-20">
          <div className="flex flex-col md:flex-row justify-between md:items-center gap-4">
            <div>
              <h1 className="text-xl md:text-2xl font-black italic uppercase text-white">Audition Deck</h1>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Sandbox Director</span>
                <span className="text-[10px] font-black uppercase tracking-widest text-blue-500">Little Mermaid Jr.</span>
              </div>
            </div>
            
            <div className="flex gap-2 overflow-x-auto pb-2 md:pb-0 no-scrollbar">
              {AUDITION_DAYS.map(day => (
                <button 
                  key={day} 
                  onClick={() => setActiveDayFilter(day)}
                  className={`px-4 py-2 rounded-lg text-[10px] font-black uppercase transition-colors whitespace-nowrap border ${activeDayFilter === day ? 'bg-white text-black border-transparent' : 'bg-zinc-900 text-zinc-500 border-white/5 hover:text-white'}`}
                >
                  {day}
                </button>
              ))}
            </div>
          </div>

          <div className="flex justify-between items-center mt-4">
            <div className="relative w-full md:w-64">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 opacity-40 text-xs">🔍</span>
              <input type="text" placeholder="Find checked-in student..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="w-full bg-zinc-900 border border-white/5 rounded-lg py-2 pl-10 pr-4 text-xs focus:ring-1 ring-blue-500 outline-none text-white"/>
            </div>

            {/* DEMO BUTTON */}
            <button onClick={simulateLobbyCheckIn} className="px-4 py-2 bg-blue-600/20 text-blue-400 text-[10px] font-black uppercase tracking-widest rounded border border-blue-500/30 hover:bg-blue-600 hover:text-white transition-colors hidden md:block">
              Simulate Lobby Check-In
            </button>
          </div>
        </header>

        {/* LIST */}
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
                      <button 
                        key={student.id} 
                        onClick={() => setActiveStudent(student)}
                        className={`text-left p-3 rounded-xl transition-all border border-white/5 flex items-center gap-4 group ${student.auditioned ? 'bg-zinc-900/40 opacity-50' : 'bg-zinc-900 hover:bg-zinc-800'}`}
                      >
                        <div className="relative shrink-0">
                          <img src={student.avatar} className="w-12 h-12 rounded-full object-cover border border-zinc-700" alt="" />
                          {/* THE LOBBY NOTE ALERT */}
                          {student.lobbyNote && !student.auditioned && (
                            <div className="absolute -top-1 -right-1 w-4 h-4 bg-amber-500 border-2 border-zinc-900 rounded-full flex items-center justify-center shadow-[0_0_10px_rgba(245,158,11,0.5)] animate-bounce">
                              <i className="fas fa-exclamation text-[8px] text-black"></i>
                            </div>
                          )}
                          {student.auditioned && (
                            <div className="absolute -top-1 -right-1 w-4 h-4 bg-emerald-500 border-2 border-zinc-900 rounded-full flex items-center justify-center">
                              <i className="fas fa-check text-[8px] text-black"></i>
                            </div>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-bold text-sm text-white truncate">{student.name}</p>
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

      {/* GRADING MODAL OVERLAY */}
      {activeStudent && (
        <div className="fixed inset-0 bg-black/90 backdrop-blur-sm flex items-center justify-center p-4 z-50" onClick={() => setActiveStudent(null)}>
          <div className="bg-zinc-950 border border-zinc-800 rounded-2xl w-full max-w-4xl overflow-hidden shadow-2xl flex flex-col md:flex-row h-full max-h-[90vh]" onClick={(e) => e.stopPropagation()}>
            
            {/* LEFT COLUMN: Student Context */}
            <div className="w-full md:w-1/3 border-b md:border-b-0 md:border-r border-zinc-800 bg-zinc-900/30 p-6 flex flex-col">
              <button onClick={() => setActiveStudent(null)} className="absolute top-4 right-4 md:hidden text-zinc-500 hover:text-white">&times;</button>
              
              <div className="flex items-center gap-4 mb-6">
                <img src={activeStudent.avatar} className="w-20 h-20 rounded-full border-2 border-zinc-700 shadow-xl" alt="" />
                <div>
                  <h2 className="text-2xl font-black text-white leading-tight mb-1">{activeStudent.name}</h2>
                  <p className="text-xs font-bold text-zinc-500 uppercase tracking-widest">Age {activeStudent.age} • ID #{activeStudent.id}</p>
                </div>
              </div>

              {/* CRITICAL: The Note From the Lobby */}
              {activeStudent.lobbyNote && (
                <div className="mb-6 p-4 bg-amber-500/10 border border-amber-500/20 rounded-xl relative overflow-hidden">
                  <div className="absolute top-0 left-0 w-1 h-full bg-amber-500"></div>
                  <p className="text-[10px] font-black uppercase tracking-widest text-amber-500 mb-1 flex items-center gap-2">
                    <i className="fas fa-bell"></i> Note from Lobby
                  </p>
                  <p className="text-amber-100 text-sm font-medium">{activeStudent.lobbyNote}</p>
                </div>
              )}

              {activeStudent.isFirstShow && (
                <div className="mb-6 p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl">
                  <p className="text-[10px] font-black uppercase tracking-widest text-emerald-400 mb-1">First Show</p>
                  <p className="text-emerald-100 text-xs">Be sure to welcome them to CYT!</p>
                </div>
              )}

              <div className="space-y-4">
                <div>
                  <p className="text-[9px] font-black uppercase tracking-widest text-zinc-600 mb-1">Monologue</p>
                  <p className="text-white text-sm font-medium">{activeStudent.auditionPrep.monologue}</p>
                </div>
                <div>
                  <p className="text-[9px] font-black uppercase tracking-widest text-zinc-600 mb-1">Song Title</p>
                  <p className="text-white text-sm font-medium">{activeStudent.auditionPrep.songTitle}</p>
                </div>
                {activeStudent.showHistory.length > 0 && (
                  <div className="pt-4 border-t border-zinc-800">
                    <p className="text-[9px] font-black uppercase tracking-widest text-zinc-600 mb-2">Past CYT Shows</p>
                    {activeStudent.showHistory.map((s:any, i:number) => (
                      <p key={i} className="text-xs text-zinc-400 font-medium">{s.title} ({s.role})</p>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* RIGHT COLUMN: The Grading Rubric */}
            <div className="flex-1 p-6 flex flex-col bg-zinc-950 relative">
              <button onClick={() => setActiveStudent(null)} className="hidden md:block absolute top-4 right-6 text-zinc-600 hover:text-white text-3xl leading-none">&times;</button>
              
              <div className="mb-8">
                <h3 className="text-sm font-black uppercase tracking-widest text-blue-500 mb-1">Director's Rubric</h3>
                <p className="text-zinc-500 text-xs">Score out of 100 possible points.</p>
              </div>

              <div className="flex-1 overflow-y-auto custom-scrollbar pr-4 space-y-6">
                
                {/* MOCK SCORING SLIDERS */}
                {['Vocal Projection', 'Pitch & Tone', 'Character Commitment', 'Monologue Delivery'].map((rubric) => (
                  <div key={rubric} className="space-y-2">
                    <div className="flex justify-between">
                      <label className="text-xs font-bold text-zinc-300 uppercase tracking-wider">{rubric}</label>
                      <span className="text-blue-400 font-mono text-sm">-- / 25</span>
                    </div>
                    <input type="range" min="0" max="25" defaultValue="15" className="w-full h-2 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-blue-500" />
                  </div>
                ))}

                <div className="pt-6 border-t border-zinc-800">
                  <label className="text-xs font-bold text-zinc-500 uppercase tracking-widest block mb-2">Director's Private Notes</label>
                  <textarea placeholder="Great energy. Pitch was a little sharp on the high note..." className="w-full bg-zinc-900 border border-zinc-800 rounded-xl p-3 text-sm text-white focus:ring-1 ring-blue-500 outline-none min-h-[100px] resize-none" />
                </div>
              </div>

              {/* FOOTER */}
              <div className="mt-6 pt-4 border-t border-zinc-800 flex justify-end gap-3 shrink-0">
                <button onClick={() => setActiveStudent(null)} className="px-6 py-3 rounded-xl font-black text-zinc-500 text-[10px] uppercase tracking-widest hover:text-white transition-colors">Cancel</button>
                <button onClick={() => handleScoreStudent(activeStudent.id, 85)} className="px-8 py-3 rounded-xl font-black text-white bg-blue-600 text-[10px] uppercase tracking-[0.2em] shadow-lg shadow-blue-500/20 hover:bg-blue-500 transition-all">Complete Audition</button>
              </div>

            </div>
          </div>
        </div>
      )}

    </div>
  );
}