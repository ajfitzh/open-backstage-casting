'use client';

import { useState, useEffect, useMemo } from 'react';

const AUDITION_DAYS = ['Thursday', 'Friday', 'Video/Remote', 'Walk-In'];
const ALL_TIME_SLOTS = ['5:00 PM', '5:30 PM', '6:00 PM', '6:30 PM', '7:00 PM', '7:30 PM'];
const SLOT_LIMIT = 15;

const FORM_TEMPLATES: Record<string, { title: string, text: string }> = {
  'Medical Release': { 
    title: 'Emergency Medical Release', 
    text: 'I hereby give my consent for emergency medical care, hospitalization, or surgery for my child in the event of an emergency where I cannot be reached. I understand that I am responsible for all costs related to such treatment.' 
  },
  'Code of Conduct': { 
    title: 'Student Code of Conduct', 
    text: 'CYT expects students to exhibit respectful, safe behavior at all times. Bullying, harassment, or unsafe use of props/set pieces will result in immediate disciplinary action or removal from the production without refund.' 
  }
};

const generateMassiveRoster = () => {
  const firstNames = ['Emma', 'Liam', 'Olivia', 'Noah', 'Ava', 'Oliver', 'Isabella', 'Elijah', 'Sophia', 'James', 'Charlotte', 'William', 'Mia', 'Benjamin', 'Amelia', 'Lucas', 'Harper', 'Henry', 'Evelyn', 'Theodore', 'Abigail', 'Jack', 'Emily', 'Levi', 'Elizabeth', 'Alexander', 'Mila', 'Jackson', 'Ella', 'Mateo', 'Avery', 'Daniel', 'Sofia', 'Michael', 'Camila', 'Mason', 'Aria', 'Sebastian', 'Scarlett', 'Ethan', 'Victoria', 'Logan', 'Madison', 'Owen', 'Luna', 'Samuel', 'Grace', 'Jacob', 'Chloe', 'Asher', 'Penelope', 'Aiden', 'Layla', 'John', 'Riley', 'Joseph', 'Zoey', 'Wyatt', 'Nora', 'David', 'Lily', 'Leo', 'Eleanor', 'Luke', 'Hannah', 'Julian', 'Lillian', 'Hudson', 'Addison', 'Grayson', 'Aubrey', 'Matthew', 'Ellie', 'Ezra', 'Stella', 'Gabriel'];
  const lastNames = ['Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller', 'Davis', 'Rodriguez', 'Martinez', 'Hernandez', 'Lopez', 'Gonzalez', 'Wilson', 'Anderson', 'Thomas', 'Taylor', 'Moore', 'Jackson', 'Martin', 'Lee', 'Perez', 'Thompson', 'White', 'Harris', 'Sanchez', 'Clark', 'Ramirez', 'Lewis', 'Robinson', 'Walker', 'Young', 'Allen', 'King', 'Wright', 'Scott', 'Torres', 'Nguyen', 'Hill', 'Flores', 'Green', 'Adams', 'Nelson', 'Baker', 'Hall', 'Rivera', 'Campbell', 'Mitchell', 'Carter', 'Roberts'];
  
  const roster = [];
  for (let i = 0; i < 76; i++) {
    const fName = firstNames[i % firstNames.length];
    const lName = lastNames[i % lastNames.length];
    const isFirst = Math.random() > 0.8;
    const hasForms = Math.random() > 0.7;
    const timeSlot = ALL_TIME_SLOTS[i % ALL_TIME_SLOTS.length];
    const siblings = [];
    const siblingCount = Math.floor(Math.random() * 3); 
    for (let s = 0; s < siblingCount; s++) {
      siblings.push(firstNames[(i + (s + 1) * 12) % firstNames.length]);
    }
    
    roster.push({
      id: (1000 + i).toString(),
      name: `${fName} ${lName}`,
      avatar: `https://i.pravatar.cc/400?u=${1000 + i}`,
      status: Math.random() > 0.9 ? 'Checked In' : 'Pending',
      timeSlot: timeSlot,
      auditionDay: 'Thursday',
      isFirstShow: isFirst,
      preferredName: fName,
      phone: '(540) 555-' + Math.floor(1000 + Math.random() * 9000),
      email: `${fName.toLowerCase()}.${lName.toLowerCase()}@example.com`,
      family: { parents: [`${firstNames[(i + 5) % firstNames.length]} ${lName}`], siblings: siblings },
      completedForms: hasForms ? ['Registration Fee'] : ['Registration Fee', 'Medical Release', 'Code of Conduct'],
      missingForms: hasForms ? ['Medical Release', 'Code of Conduct'] : [],
      showHistory: isFirst ? [] : [{ title: 'The Little Mermaid', role: 'Ensemble', year: '2024' }],
      auditionPrep: { monologue: i % 2 === 0 ? 'Comedic 1' : 'Dramatic 2', songTitle: i % 3 === 0 ? 'Tomorrow' : 'Stars', musicProvided: Math.random() > 0.3 },
      lobbyNote: ''
    });
  }
  return roster;
};

export default function SandboxCheckIn() {
  const [students, setStudents] = useState<any[]>([]);
  const [hasMounted, setHasMounted] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeStudent, setActiveStudent] = useState<any | null>(null);
  const [sentLinks, setSentLinks] = useState<string[]>([]);
  const [activeDayFilter, setActiveDayFilter] = useState('Thursday');
  const [activeTimeFilter, setActiveTimeFilter] = useState('All');
  const [currentNote, setCurrentNote] = useState('');
  const [viewingForm, setViewingForm] = useState<string | null>(null);
  const [maximizedImage, setMaximizedImage] = useState<string | null>(null);

  useEffect(() => {
    setStudents(generateMassiveRoster());
    setHasMounted(true);
  }, []);

  // --- STATS CALCULATIONS ---
  const stats = useMemo(() => {
    const total = students.length;
    const checkedIn = students.filter(s => s.status === 'Checked In').length;
    const noShow = students.filter(s => s.status === 'No Show').length;
    const pending = total - checkedIn - noShow;
    const percent = total > 0 ? (checkedIn / total) * 100 : 0;
    return { total, checkedIn, noShow, pending, percent };
  }, [students]);

  // --- CSV EXPORT ---
  const handleExportCSV = () => {
    const headers = ['Name', 'Day', 'Time', 'Status', 'Phone', 'Monologue', 'Note'];
    const rows = students.map(s => [
      s.name, s.auditionDay, s.timeSlot, s.status, s.phone, s.auditionPrep.monologue, s.lobbyNote
    ]);
    const csvContent = [headers, ...rows].map(e => e.join(",")).join("\n");
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.setAttribute("download", `audition_roster_${new Date().toLocaleDateString()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // --- WALK-IN HANDLER ---
  const handleAddWalkIn = () => {
    const newId = Date.now().toString();
    const newStudent = {
      id: newId,
      name: 'New Walk-In',
      avatar: `https://i.pravatar.cc/400?u=${newId}`,
      status: 'Pending',
      timeSlot: activeTimeFilter === 'All' ? '5:00 PM' : activeTimeFilter,
      auditionDay: activeDayFilter,
      isFirstShow: true,
      preferredName: '',
      phone: '',
      email: '',
      family: { parents: ['Needs Contact Info'], siblings: [] },
      completedForms: [],
      missingForms: ['Medical Release', 'Code of Conduct'],
      showHistory: [],
      auditionPrep: { monologue: 'TBD', songTitle: 'TBD', musicProvided: false },
      lobbyNote: 'WALK-IN REGISTRATION'
    };
    setStudents([newStudent, ...students]);
    setActiveStudent(newStudent);
  };

  const getSlotCount = (slot: string, day: string) => students.filter(s => s.timeSlot === slot && s.auditionDay === day).length;

  const handleOpenModal = (student: any) => {
    setActiveStudent(student);
    setCurrentNote(student.lobbyNote || '');
  };

  const handleUpdateStatus = (id: string, newStatus: string) => {
    setStudents(students.map(s => s.id === id ? { ...s, status: newStatus, lobbyNote: currentNote } : s));
    setActiveStudent(null);
    setSentLinks([]); 
  };

  const handleReassign = (id: string, field: 'timeSlot' | 'auditionDay' | 'name', value: string) => {
    setStudents(students.map(s => s.id === id ? { ...s, [field]: value } : s));
    setActiveStudent(prev => prev ? { ...prev, [field]: value } : null);
  };

  const handleSendLink = (linkId: string) => setSentLinks([...sentLinks, linkId]);

  const filteredStudents = students.filter(s => 
    s.name.toLowerCase().includes(searchQuery.toLowerCase()) &&
    s.auditionDay === activeDayFilter &&
    (activeTimeFilter === 'All' || s.timeSlot === activeTimeFilter)
  );

  const groupedStudents = filteredStudents.reduce((acc, student) => {
    if (!acc[student.timeSlot]) acc[student.timeSlot] = [];
    acc[student.timeSlot].push(student);
    return acc;
  }, {} as Record<string, any[]>);

  const getStatusBadge = (status: string) => {
    switch(status) {
      case 'Checked In': return <div className="px-4 py-1.5 rounded-md font-bold text-emerald-400 bg-emerald-400/10 border border-emerald-400/20 text-[10px] shrink-0">✓ CHECKED IN</div>;
      case 'Late': return <div className="px-4 py-1.5 rounded-md font-bold text-amber-400 bg-amber-400/10 border border-amber-400/20 text-[10px] shrink-0">⏰ LATE</div>;
      case 'No Show': return <div className="px-4 py-1.5 rounded-md font-bold text-slate-400 bg-slate-800 border border-slate-700 text-[10px] shrink-0">✕ NO SHOW</div>;
      default: return <div className="px-5 py-2 rounded-lg font-bold text-indigo-400 flex items-center gap-2 group-hover:text-white transition-colors text-xs shrink-0">REVIEW &rarr;</div>;
    }
  };

  if (!hasMounted) {
    return <div className="min-h-screen bg-slate-950 flex items-center justify-center text-slate-500 font-black tracking-widest text-xs uppercase">Loading Sandbox...</div>;
  }

  return (
    <div className="min-h-screen bg-slate-950 p-4 md:p-8 font-sans relative text-slate-200">
      
      {/* HEADER & TOP TOOLS */}
      <div className="max-w-4xl mx-auto flex flex-col md:flex-row md:items-center justify-between mb-6 gap-4">
        <div className="flex items-center space-x-2 select-none">
          <span className="font-black text-white tracking-widest text-2xl">CYT</span>
          <span className="text-indigo-500 font-light text-2xl">|</span>
          <span className="text-slate-400 font-normal lowercase text-xl">open-backstage</span>
        </div>
        
        <div className="flex gap-2">
          <button onClick={handleExportCSV} className="px-4 py-2 bg-slate-900 border border-slate-800 text-slate-400 text-[10px] font-black uppercase tracking-widest rounded-xl hover:text-white transition-colors">Export List</button>
          <button onClick={handleAddWalkIn} className="px-5 py-2 bg-indigo-600 text-white text-[10px] font-black uppercase tracking-widest rounded-xl hover:bg-indigo-500 shadow-lg shadow-indigo-500/20">+ Add Walk-In</button>
        </div>
      </div>

      <div className="max-w-4xl mx-auto bg-slate-900 rounded-2xl border border-slate-800 shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
        
        {/* PROGRESS BAR (The "Go Home" Indicator) */}
        <div className="bg-slate-950 border-b border-slate-800 p-4">
          <div className="flex justify-between items-end mb-2">
            <div className="flex gap-4">
              <div className="text-[10px] font-black uppercase tracking-widest text-emerald-400">{stats.checkedIn} In</div>
              <div className="text-[10px] font-black uppercase tracking-widest text-slate-500">{stats.pending} Waiting</div>
              <div className="text-[10px] font-black uppercase tracking-widest text-rose-500">{stats.noShow} No-Show</div>
            </div>
            <div className="text-[10px] font-black uppercase tracking-widest text-slate-400">{Math.round(stats.percent)}% Complete</div>
          </div>
          <div className="w-full h-1.5 bg-slate-900 rounded-full overflow-hidden">
            <div className="h-full bg-indigo-500 transition-all duration-500 shadow-[0_0_10px_rgba(99,102,241,0.5)]" style={{ width: `${stats.percent}%` }}></div>
          </div>
        </div>

        <div className="p-4 md:p-6 border-b border-slate-800 bg-slate-900 shrink-0 z-20 space-y-4">
          <div className="flex gap-2 overflow-x-auto no-scrollbar border-b border-slate-800 pb-4">
            {AUDITION_DAYS.map(day => (
              <button key={day} onClick={() => setActiveDayFilter(day)} className={`px-5 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all border ${activeDayFilter === day ? 'bg-white text-slate-900 border-white shadow-xl scale-105' : 'bg-slate-950 text-slate-500 border-slate-800 hover:text-slate-300'}`}>
                {day}
              </button>
            ))}
          </div>

          <div className="flex flex-col md:flex-row justify-between gap-4">
            <div className="relative w-full md:max-w-xs shrink-0">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 opacity-40 text-xs">🔍</span>
              <input type="text" placeholder="Search roster..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="bg-slate-950 border border-slate-800 text-white pl-10 pr-4 py-3 rounded-lg focus:ring-1 ring-indigo-500 outline-none w-full text-sm"/>
            </div>
            
            <div className="flex gap-2 overflow-x-auto no-scrollbar items-center">
              <button onClick={() => setActiveTimeFilter('All')} className={`px-4 py-2.5 rounded-lg text-[10px] font-bold uppercase transition-all border ${activeTimeFilter === 'All' ? 'bg-indigo-600 text-white border-indigo-500' : 'bg-slate-950 text-slate-500 border-slate-800'}`}>All Slots</button>
              {ALL_TIME_SLOTS.map(slot => (
                <button key={slot} onClick={() => setActiveTimeFilter(slot)} className={`px-3 py-2.5 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all border whitespace-nowrap ${activeTimeFilter === slot ? 'bg-indigo-600 text-white border-indigo-500 shadow-lg' : 'bg-slate-950 text-slate-500 border-slate-800 hover:text-slate-200'}`}>
                  {slot} <span className="opacity-40 ml-1">({getSlotCount(slot, activeDayFilter)})</span>
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="p-2 md:p-4 overflow-y-auto flex-1 custom-scrollbar">
          {Object.keys(groupedStudents).length === 0 ? (
            <div className="text-center py-20 opacity-30 italic text-sm">No students found.</div>
          ) : (
            Object.keys(groupedStudents).sort().map(slot => (
              <div key={slot} className="mb-8">
                <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-indigo-400 mb-3 flex justify-between items-center sticky top-0 bg-slate-900/95 backdrop-blur py-2 z-10 pr-2">
                  <span>{slot} BLOCK</span>
                  <span className="opacity-50">{getSlotCount(slot, activeDayFilter)} / {SLOT_LIMIT}</span>
                </h3>
                <div className="space-y-1.5">
                  {groupedStudents[slot].map((student) => (
                    <div key={student.id} onClick={() => handleOpenModal(student)} className={`flex justify-between items-center p-3 md:p-4 rounded-xl transition-all group cursor-pointer bg-slate-900/50 border border-white/5 hover:border-indigo-500/50 ${student.status !== 'Pending' ? 'opacity-50' : ''}`}>
                      <div className="flex items-center gap-4 min-w-0 pr-4">
                        <div className="shrink-0 relative">
                          <img src={student.avatar} alt={student.name} onClick={(e) => { e.stopPropagation(); setMaximizedImage(student.avatar); }} className="w-12 h-12 md:w-14 md:h-14 rounded-full border-2 border-slate-700 bg-slate-800 object-cover shadow-md cursor-zoom-in hover:border-indigo-400 transition-colors" />
                          {student.lobbyNote && <div className="absolute -top-1 -right-1 w-3.5 h-3.5 border-2 border-slate-900 rounded-full bg-indigo-500 animate-pulse"></div>}
                        </div>
                        <div className="min-w-0">
                          <h3 className="text-white font-bold text-base md:text-lg truncate">{student.name}</h3>
                          <p className="text-slate-500 text-[10px] md:text-xs uppercase font-bold tracking-wider mt-0.5">{student.auditionPrep.monologue}</p>
                        </div>
                      </div>
                      {getStatusBadge(student.status)}
                    </div>
                  ))}
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* VERIFICATION MODAL */}
      {activeStudent && (
        <div className="fixed inset-0 bg-slate-950/90 backdrop-blur-md flex items-center justify-center p-2 md:p-4 z-40" onClick={() => setActiveStudent(null)}>
          <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-2xl overflow-hidden shadow-2xl flex flex-col max-h-[95vh]" onClick={(e) => e.stopPropagation()}>
            <div className="p-4 md:p-6 border-b border-slate-800 flex justify-between items-start shrink-0 bg-slate-900/50">
              <div className="flex gap-4 items-center">
                <img src={activeStudent.avatar} alt="Avatar" onClick={() => setMaximizedImage(activeStudent.avatar)} className="w-16 h-16 rounded-full border-2 border-slate-700 shadow-lg hidden md:block cursor-zoom-in hover:border-indigo-400 transition-colors" />
                <div className="space-y-2">
                  <input type="text" value={activeStudent.name} onChange={(e) => handleReassign(activeStudent.id, 'name', e.target.value)} className="bg-transparent border-none text-2xl md:text-3xl font-black text-white leading-none outline-none focus:ring-1 ring-indigo-500 rounded px-1 -ml-1 w-full" />
                  <div className="flex flex-wrap items-center gap-2 mt-2">
                    <select value={activeStudent.auditionDay} onChange={(e) => handleReassign(activeStudent.id, 'auditionDay', e.target.value)} className="bg-slate-950 border border-slate-800 text-indigo-400 px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-widest outline-none shadow-inner">
                      {AUDITION_DAYS.map(day => <option key={day} value={day}>{day}</option>)}
                    </select>
                    <select value={activeStudent.timeSlot} onChange={(e) => handleReassign(activeStudent.id, 'timeSlot', e.target.value)} className="bg-slate-950 border border-slate-800 text-indigo-400 px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-widest outline-none shadow-inner">
                      {ALL_TIME_SLOTS.map(slot => <option key={slot} value={slot}>{slot}</option>)}
                    </select>
                  </div>
                </div>
              </div>
              <button onClick={() => setActiveStudent(null)} className="text-slate-500 hover:text-white text-4xl leading-none p-2">&times;</button>
            </div>

            <div className={`p-4 md:p-6 space-y-6 overflow-y-auto custom-scrollbar ${activeStudent.status !== 'Pending' ? 'opacity-40 pointer-events-none' : ''}`}>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className={`p-4 rounded-xl border ${activeStudent.isFirstShow ? 'bg-emerald-500/5 border-emerald-500/20 text-emerald-400' : 'bg-indigo-500/5 border-indigo-500/20 text-indigo-400'} flex flex-col justify-center`}>
                  <p className="font-black text-[10px] uppercase tracking-widest mb-1">{activeStudent.isFirstShow ? '🎉 New Family' : '✨ Welcome Back'}</p>
                  <p className="text-xs opacity-80">{activeStudent.isFirstShow ? 'Point out the parent orientation table.' : 'Returning Student'}</p>
                </div>
                <div className="space-y-2">
                  <div className="p-4 bg-slate-950/50 border border-slate-800 rounded-xl">
                    <span className="text-[10px] text-slate-500 font-bold uppercase tracking-widest block mb-1">Guardians</span>
                    <p className="text-sm font-medium">{activeStudent.family.parents.join(' & ')}</p>
                  </div>
                  {activeStudent.family.siblings.length > 0 && (
                    <div className="p-3 bg-indigo-500/5 border border-indigo-500/20 rounded-xl">
                      <span className="text-[9px] text-indigo-400/60 font-black uppercase tracking-widest block mb-1">CYT Siblings</span>
                      <div className="flex flex-wrap gap-2">{activeStudent.family.siblings.map((sib: string) => <span key={sib} className="px-2 py-0.5 bg-indigo-500/10 text-indigo-300 text-[10px] font-bold rounded border border-indigo-500/20">{sib}</span>)}</div>
                    </div>
                  )}
                </div>
              </div>

              <div className="p-4 border border-slate-800 rounded-xl bg-slate-950/30">
                <p className="text-[10px] font-black text-slate-500 mb-2 uppercase tracking-widest flex items-center gap-2"><i className="fas fa-comment-dots text-indigo-500"></i> Director Alert</p>
                <textarea value={currentNote} onChange={(e) => setCurrentNote(e.target.value)} placeholder="Special notes..." className="w-full bg-slate-950 border border-slate-800 text-white p-3 rounded-xl focus:ring-1 ring-indigo-500 outline-none text-sm min-h-[70px] resize-none"/>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-slate-950 border border-slate-800 p-4 rounded-xl flex justify-between items-center shadow-inner">
                  <div><p className="text-[9px] text-slate-500 uppercase font-black tracking-widest mb-1">Monologue</p><p className="text-sm font-bold">{activeStudent.auditionPrep.monologue}</p></div>
                  <button className="text-[10px] font-black text-indigo-400 hover:text-white uppercase tracking-widest p-2">Change</button>
                </div>
                <div className={`border p-4 rounded-xl flex justify-between items-center shadow-inner ${activeStudent.auditionPrep.musicProvided ? 'bg-emerald-500/5 border-emerald-500/20' : 'bg-rose-500/5 border-rose-500/20'}`}>
                  <div><p className="text-[9px] text-slate-500 uppercase font-black tracking-widest mb-1">Music Track</p><p className={`text-sm font-bold ${activeStudent.auditionPrep.musicProvided ? 'text-emerald-400' : 'text-rose-400'}`}>{activeStudent.auditionPrep.musicProvided ? 'LOADED' : 'MISSING'}</p></div>
                  {!activeStudent.auditionPrep.musicProvided && <button className="text-[10px] font-black text-rose-400 hover:text-white uppercase tracking-widest p-2">Send Link</button>}
                </div>
              </div>

              <div className="space-y-3">
                <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Paperwork</p>
                {activeStudent.missingForms.length === 0 ? (
                  <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-emerald-400 text-xs font-bold text-center">Complete</div>
                ) : (
                  activeStudent.missingForms.map((form: string) => {
                    const isSent = sentLinks.includes(form);
                    return (
                      <div key={form} className="flex flex-col md:flex-row md:items-center justify-between bg-slate-950 border border-rose-500/20 p-3 rounded-xl gap-3">
                        <div className="flex items-center gap-3"><div className="w-1.5 h-1.5 rounded-full bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.6)]"></div><span className="text-sm font-bold text-rose-100">{form}</span></div>
                        <div className="flex gap-2">
                          <button onClick={() => setViewingForm(form)} className="px-4 py-2 bg-slate-800 text-slate-400 text-[10px] font-bold rounded-lg uppercase tracking-widest hover:text-white transition-colors">View</button>
                          <button onClick={() => handleSendLink(form)} disabled={isSent} className={`px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${isSent ? 'bg-emerald-500/20 text-emerald-400' : 'bg-rose-600 text-white hover:bg-rose-500'}`}>{isSent ? 'Sent' : 'Re-send'}</button>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            {activeStudent.status === 'Pending' ? (
              <div className="p-4 md:p-6 border-t border-slate-800 bg-slate-900 flex justify-between items-center shrink-0">
                <div className="flex gap-2">
                  <button onClick={() => handleUpdateStatus(activeStudent.id, 'No Show')} className="px-4 py-3 rounded-xl font-black text-slate-500 hover:text-rose-400 hover:bg-rose-400/10 text-[10px] uppercase tracking-widest transition-all hidden md:block">No-Show</button>
                  <button onClick={() => handleUpdateStatus(activeStudent.id, 'Late')} className="px-4 py-3 rounded-xl font-black text-amber-500/60 hover:text-amber-400 hover:bg-amber-400/10 text-[10px] uppercase tracking-widest transition-all">Late</button>
                </div>
                <button onClick={() => handleUpdateStatus(activeStudent.id, 'Checked In')} className="px-10 py-3.5 rounded-xl font-black text-white bg-indigo-600 text-[10px] uppercase tracking-[0.2em] shadow-2xl shadow-indigo-500/40 hover:bg-indigo-500 transition-all active:scale-95">Verify & Check In</button>
              </div>
            ) : (
              <div className="p-6 border-t border-slate-800 bg-slate-950 flex justify-between items-center shrink-0">
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">Status: <span className="text-white ml-2 px-2 py-1 bg-slate-800 rounded">{activeStudent.status}</span></p>
                <button onClick={() => handleUpdateStatus(activeStudent.id, 'Pending')} className="px-6 py-2 rounded-xl font-black text-rose-500 border border-rose-500/20 text-[10px] uppercase tracking-widest hover:bg-rose-500 hover:text-white transition-all">Undo Status</button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* OVERLAYS (Forms & Images) */}
      {viewingForm && (
        <div className="fixed inset-0 bg-slate-950/95 backdrop-blur-xl flex items-center justify-center p-4 z-[100]" onClick={() => setViewingForm(null)}>
          <div className="bg-slate-900 border border-white/10 rounded-2xl w-full max-w-lg shadow-2xl p-6 md:p-8 relative" onClick={e => e.stopPropagation()}>
            <h3 className="text-xl md:text-2xl font-black text-white mb-4 border-b border-white/5 pb-4">{FORM_TEMPLATES[viewingForm].title}</h3>
            <p className="text-slate-400 text-sm leading-relaxed mb-8">{FORM_TEMPLATES[viewingForm].text}</p>
            <button onClick={() => setViewingForm(null)} className="w-full py-3 bg-slate-800 text-white text-[10px] font-black uppercase tracking-widest rounded-xl hover:bg-slate-700">Close Preview</button>
          </div>
        </div>
      )}

      {maximizedImage && (
        <div className="fixed inset-0 z-[110] bg-slate-950/90 backdrop-blur-xl flex items-center justify-center p-4 cursor-zoom-out" onClick={() => setMaximizedImage(null)}>
          <div className="relative group">
            <img src={maximizedImage} alt="Maximized Headshot" className="max-w-full max-h-[85vh] rounded-2xl border-4 border-white/10 shadow-[0_0_50px_rgba(0,0,0,0.5)]" />
            <div className="absolute -top-12 left-1/2 -translate-x-1/2 bg-white/10 px-4 py-1 rounded-full text-white/50 text-[10px] font-black uppercase tracking-[0.2em] opacity-0 group-hover:opacity-100 transition-opacity">Click to close</div>
          </div>
        </div>
      )}
    </div>
  );
}