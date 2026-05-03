// app/[tenant]/(main)/production/[id]/check-in/CheckInBoard.tsx
"use client";

import React, { useState, useMemo } from "react";
import Link from "next/link";
import { ChevronLeft, Search, Check, Clock, X, AlertTriangle } from "lucide-react";
import { saveCheckIn } from "@/app/actions/checkin";

export default function CheckInBoard({ tenant, productionTitle, initialCast }: { tenant: string, productionTitle: string, initialCast: any[] }) {
  const [students, setStudents] = useState<any[]>(initialCast);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeStudent, setActiveStudent] = useState<any | null>(null);
  const [currentNote, setCurrentNote] = useState("");
  const [maximizedImage, setMaximizedImage] = useState<string | null>(null);

  const stats = useMemo(() => {
    const total = students.length;
    const checkedIn = students.filter(s => s.status === 'Checked In').length;
    const late = students.filter(s => s.status === 'Late').length;
    const noShow = students.filter(s => s.status === 'No Show').length;
    const pending = total - checkedIn - late - noShow;
    return { total, checkedIn, late, noShow, pending };
  }, [students]);

  const handleOpenModal = (student: any) => {
    setActiveStudent(student);
    setCurrentNote(student.lobbyNote || '');
  };

  const handleUpdateStatus = async (id: string, newStatus: string) => {
    // 1. Optimistically update the UI so the check-in mom doesn't have to wait
    setStudents(students.map(s => s.id === id ? { ...s, status: newStatus, lobbyNote: currentNote } : s));
    setActiveStudent(null);

    // 2. Save it to Baserow in the background
    await saveCheckIn(tenant, parseInt(id), newStatus, currentNote);
  };

  const filteredStudents = students.filter(s => 
    s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    s.role.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getStatusBadge = (status: string) => {
    switch(status) {
      case 'Checked In': return <div className="px-4 py-1.5 rounded-md font-bold text-emerald-400 bg-emerald-400/10 border border-emerald-400/20 text-[10px] shrink-0">✓ CHECKED IN</div>;
      case 'Late': return <div className="px-4 py-1.5 rounded-md font-bold text-amber-400 bg-amber-400/10 border border-amber-400/20 text-[10px] shrink-0">⏰ LATE</div>;
      case 'No Show': return <div className="px-4 py-1.5 rounded-md font-bold text-rose-400 bg-rose-950 border border-rose-900 text-[10px] shrink-0">✕ NO SHOW</div>;
      default: return <div className="px-5 py-2 rounded-lg font-bold text-indigo-400 flex items-center gap-2 group-hover:text-white transition-colors text-xs shrink-0">REVIEW &rarr;</div>;
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 p-4 md:p-8 font-sans text-slate-200">
      <div className="max-w-5xl mx-auto space-y-6 md:space-y-8 flex flex-col max-h-[90vh]">
        
        {/* HEADER & STATS */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 shrink-0">
          <div>
            <Link href={`/`} className="text-xs font-bold text-slate-500 hover:text-white flex items-center gap-1 transition-colors w-fit mb-4">
              <ChevronLeft size={16} /> Back to Dashboard
            </Link>
            <h1 className="text-3xl md:text-5xl font-black text-white uppercase italic tracking-tighter leading-none">
              Check-In
            </h1>
            <p className="text-indigo-400 font-bold mt-1 text-lg">{productionTitle}</p>
          </div>
          
          <div className="flex gap-2 bg-slate-900 p-2 rounded-2xl border border-slate-800">
             <div className="px-4 py-2 bg-slate-950 rounded-xl text-center">
               <span className="block text-2xl font-black text-emerald-400">{stats.checkedIn}</span>
               <span className="text-[9px] uppercase tracking-widest text-slate-500 font-bold">In</span>
             </div>
             <div className="px-4 py-2 bg-slate-950 rounded-xl text-center">
               <span className="block text-2xl font-black text-amber-400">{stats.late}</span>
               <span className="text-[9px] uppercase tracking-widest text-slate-500 font-bold">Late</span>
             </div>
             <div className="px-4 py-2 bg-slate-950 rounded-xl text-center">
               <span className="block text-2xl font-black text-slate-600">{stats.pending}</span>
               <span className="text-[9px] uppercase tracking-widest text-slate-500 font-bold">Wait</span>
             </div>
          </div>
        </div>

        {/* SEARCH BAR */}
        <div className="relative shrink-0">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={20} />
          <input 
            type="text" placeholder="Search by name or song..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-slate-900 border border-slate-800 text-white p-5 pl-12 rounded-2xl text-lg font-bold outline-none focus:border-indigo-500 focus:ring-1 ring-indigo-500 transition-colors"
          />
        </div>

        {/* CAST GRID */}
        <div className="overflow-y-auto custom-scrollbar flex-1 pr-2">
          {filteredStudents.length === 0 ? (
            <div className="text-center py-20 border-2 border-dashed border-slate-800 rounded-3xl text-slate-500">
              No students found. Have they registered through the Audition Portal yet?
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-3">
              {filteredStudents.map(student => (
                <div 
                  key={student.id} onClick={() => handleOpenModal(student)} 
                  className={`flex justify-between items-center p-4 rounded-2xl transition-all group cursor-pointer border hover:border-indigo-500/50 ${
                    student.status !== 'Pending' ? 'opacity-50 bg-slate-900/50 border-slate-800' : 'bg-slate-900 border-slate-700'
                  }`}
                >
                  <div className="flex items-center gap-4 min-w-0 pr-4">
                    <div className="shrink-0 relative">
                      <img src={student.avatar} alt={student.name} className="w-12 h-12 md:w-14 md:h-14 rounded-full border-2 border-slate-700 bg-slate-800 object-cover" />
                      {student.lobbyNote && <div className="absolute -top-1 -right-1 w-3.5 h-3.5 border-2 border-slate-900 rounded-full bg-indigo-500 animate-pulse"></div>}
                    </div>
                    <div className="min-w-0">
                      <h3 className="text-white font-black text-lg truncate tracking-tighter">{student.name}</h3>
                      <p className="text-slate-400 text-xs font-bold mt-0.5 truncate">{student.role} • {student.timeSlot}</p>
                    </div>
                  </div>
                  {getStatusBadge(student.status)}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* VERIFICATION MODAL */}
      {activeStudent && (
        <div className="fixed inset-0 bg-slate-950/90 backdrop-blur-md flex items-center justify-center p-2 md:p-4 z-40" onClick={() => setActiveStudent(null)}>
          <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-2xl overflow-hidden shadow-2xl flex flex-col max-h-[95vh]" onClick={(e) => e.stopPropagation()}>
            
            {/* Modal Header */}
            <div className="p-4 md:p-6 border-b border-slate-800 flex justify-between items-start shrink-0 bg-slate-900/50">
              <div className="flex gap-4 items-center w-full">
                <img src={activeStudent.avatar} alt="Avatar" onClick={() => setMaximizedImage(activeStudent.avatar)} className="w-16 h-16 rounded-full border-2 border-slate-700 shadow-lg cursor-zoom-in hover:border-indigo-400 transition-colors" />
                <div className="space-y-1 w-full pr-4">
                  <h2 className="text-2xl md:text-3xl font-black text-white leading-none">{activeStudent.name}</h2>
                  <p className="text-indigo-400 font-bold text-sm">{activeStudent.timeSlot} Block • {activeStudent.auditionDay}</p>
                </div>
              </div>
              <button onClick={() => setActiveStudent(null)} className="text-slate-500 hover:text-white text-4xl leading-none">&times;</button>
            </div>

            {/* Modal Body */}
            <div className={`p-4 md:p-6 space-y-6 overflow-y-auto custom-scrollbar ${activeStudent.status !== 'Pending' ? 'opacity-40 pointer-events-none' : ''}`}>
              
              {/* Lobby Note */}
              <div className="p-4 border border-slate-800 rounded-xl bg-slate-950/30">
                <p className="text-[10px] font-black text-slate-500 mb-2 uppercase tracking-widest flex items-center gap-2">
                   Director / Admin Note
                </p>
                <textarea 
                  value={currentNote} 
                  onChange={(e) => setCurrentNote(e.target.value)} 
                  placeholder="E.g. Scared, cough, peanut allergy, stressed parent..." 
                  className="w-full bg-slate-950 border border-slate-800 text-white p-3 rounded-xl focus:ring-1 ring-indigo-500 outline-none text-sm min-h-[70px] resize-none placeholder:opacity-30"
                />
              </div>

              {/* Audition Material */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-slate-950 border border-slate-800 p-4 rounded-xl flex flex-col justify-center shadow-inner">
                  <p className="text-[9px] text-slate-500 uppercase font-black tracking-widest mb-1">Monologue</p>
                  <p className="text-sm font-bold">{activeStudent.auditionPrep.monologue}</p>
                </div>
                <div className={`border p-4 rounded-xl flex flex-col justify-center shadow-inner ${activeStudent.auditionPrep.musicProvided ? 'bg-emerald-500/5 border-emerald-500/20' : 'bg-amber-500/5 border-amber-500/20'}`}>
                  <p className="text-[9px] text-slate-500 uppercase font-black tracking-widest mb-1">Audition Song</p>
                  <p className={`text-sm font-bold ${activeStudent.auditionPrep.musicProvided ? 'text-emerald-400' : 'text-amber-400'}`}>
                    {activeStudent.auditionPrep.songTitle} 
                    <span className="text-[10px] ml-1 opacity-70">({activeStudent.auditionPrep.musicProvided ? 'LOADED' : 'UNVERIFIED'})</span>
                  </p>
                </div>
              </div>

            </div>

            {/* Modal Footer Actions */}
            {activeStudent.status === 'Pending' ? (
              <div className="p-4 md:p-6 border-t border-slate-800 bg-slate-900 flex justify-between items-center shrink-0">
                <div className="flex gap-2">
                  <button onClick={() => handleUpdateStatus(activeStudent.id, 'No Show')} className="px-4 py-3 rounded-xl font-black text-slate-500 hover:text-rose-400 hover:bg-rose-400/10 text-[10px] uppercase tracking-widest transition-all">No-Show</button>
                  <button onClick={() => handleUpdateStatus(activeStudent.id, 'Late')} className="px-4 py-3 rounded-xl font-black text-amber-500/60 hover:text-amber-400 hover:bg-amber-400/10 text-[10px] uppercase tracking-widest transition-all">Mark Late</button>
                </div>
                <div className="flex gap-4 items-center">
                  <button onClick={() => setActiveStudent(null)} className="font-bold text-slate-500 hover:text-white text-xs transition-colors p-2 hidden md:block">Cancel</button>
                  <button onClick={() => handleUpdateStatus(activeStudent.id, 'Checked In')} className="px-8 py-3.5 rounded-xl font-black text-white bg-indigo-600 text-[10px] uppercase tracking-[0.2em] shadow-lg hover:bg-indigo-500 transition-all active:scale-95">Verify & Check In</button>
                </div>
              </div>
            ) : (
              <div className="p-6 border-t border-slate-800 bg-slate-950 flex justify-between items-center shrink-0">
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">Status: <span className="text-white ml-2 px-2 py-1 bg-slate-800 rounded">{activeStudent.status}</span></p>
                <button onClick={() => handleUpdateStatus(activeStudent.id, 'Pending')} className="px-6 py-2 rounded-xl font-black text-rose-500 border border-rose-500/20 text-[10px] uppercase tracking-widest hover:bg-rose-500 hover:text-white transition-all">Undo Check-In</button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Image Zoom Overlay */}
      {maximizedImage && (
        <div className="fixed inset-0 z-[110] bg-slate-950/90 backdrop-blur-xl flex items-center justify-center p-4 cursor-zoom-out" onClick={() => setMaximizedImage(null)}>
          <div className="relative group">
            <img src={maximizedImage} alt="Maximized Headshot" className="max-w-full max-h-[85vh] rounded-2xl border-4 border-white/10 shadow-2xl" />
            <div className="absolute -top-12 left-1/2 -translate-x-1/2 bg-white/10 px-4 py-1 rounded-full text-white/50 text-[10px] font-black uppercase tracking-[0.2em] opacity-0 group-hover:opacity-100 transition-opacity">Click to close</div>
          </div>
        </div>
      )}

      <style jsx global>{`
        .custom-scrollbar::-webkit-scrollbar { width: 6px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #334155; border-radius: 10px; }
      `}</style>
    </div>
  );
}