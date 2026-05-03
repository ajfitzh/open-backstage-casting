"use client";

import React, { useState, useMemo } from "react";
import Link from "next/link";
import { ChevronLeft, Search, Check, Clock, X, AlertTriangle } from "lucide-react";

// --- EXPANDED MOCK DATA (Ready for Baserow Wiring) ---
const MOCK_CAST = [
  { 
    id: "1", name: "Tommy Fitzhugh", role: "Oliver", 
    avatar: "https://i.pravatar.cc/150?u=tommy",
    status: "Pending", timeSlot: "5:00 PM", auditionDay: "Thursday",
    isFirstShow: false, phone: "(540) 555-0198", email: "parents@fitzhugh.com",
    family: { parents: ["Austin", "Caitlin"], siblings: ["Jenny"] },
    missingForms: [],
    showHistory: [{ title: "The Wizard of Oz", role: "Munchkin" }],
    auditionPrep: { monologue: "Dramatic 1", songTitle: "Consider Yourself", musicProvided: true },
    lobbyNote: "", conflicts: ""
  },
  { 
    id: "2", name: "Jenny Fitzhugh", role: "Ensemble", 
    avatar: "https://i.pravatar.cc/150?u=jenny",
    status: "Pending", timeSlot: "5:00 PM", auditionDay: "Thursday",
    isFirstShow: true, phone: "(540) 555-0198", email: "parents@fitzhugh.com",
    family: { parents: ["Austin", "Caitlin"], siblings: ["Tommy"] },
    missingForms: ["Medical Release", "Code of Conduct"],
    showHistory: [],
    auditionPrep: { monologue: "Comedic 2", songTitle: "Tomorrow (Annie)", musicProvided: false },
    lobbyNote: "Nervous, first audition!", conflicts: "Leaving early at 7:30"
  },
  { 
    id: "3", name: "Jake Ramirez", role: "Fagin", 
    avatar: "https://i.pravatar.cc/150?u=jake",
    status: "Pending", timeSlot: "5:30 PM", auditionDay: "Thursday",
    isFirstShow: false, phone: "(540) 555-8822", email: "ramirez.fam@example.com",
    family: { parents: ["Maria & Jose"], siblings: [] },
    missingForms: ["Code of Conduct"],
    showHistory: [{ title: "Beauty and the Beast", role: "Lumiere" }],
    auditionPrep: { monologue: "Villain", songTitle: "Reviewing the Situation", musicProvided: true },
    lobbyNote: "", conflicts: "Late arrival (6:15)"
  },
  { 
    id: "4", name: "Griblit Jones", role: "Artful Dodger", 
    avatar: "https://i.pravatar.cc/150?u=griblit",
    status: "Pending", timeSlot: "5:30 PM", auditionDay: "Thursday",
    isFirstShow: false, phone: "(540) 555-1133", email: "jones@example.com",
    family: { parents: ["Sarah"], siblings: [] },
    missingForms: [],
    showHistory: [{ title: "Peter Pan", role: "Lost Boy" }],
    auditionPrep: { monologue: "Comedic 1", songTitle: "Custom Track", musicProvided: true },
    lobbyNote: "Severe Peanut Allergy", conflicts: ""
  },
];

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

export default function CheckInBoard({ productionTitle }: { productionTitle: string }) {
  const [students, setStudents] = useState<any[]>(MOCK_CAST);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeStudent, setActiveStudent] = useState<any | null>(null);
  
  // Modal States
  const [sentLinks, setSentLinks] = useState<string[]>([]);
  const [currentNote, setCurrentNote] = useState("");
  const [viewingForm, setViewingForm] = useState<string | null>(null);
  const [maximizedImage, setMaximizedImage] = useState<string | null>(null);

  // --- STATS ---
  const stats = useMemo(() => {
    const total = students.length;
    const checkedIn = students.filter(s => s.status === 'Checked In').length;
    const late = students.filter(s => s.status === 'Late').length;
    const noShow = students.filter(s => s.status === 'No Show').length;
    const pending = total - checkedIn - late - noShow;
    const percent = total > 0 ? ((checkedIn + late) / total) * 100 : 0;
    return { total, checkedIn, late, noShow, pending, percent };
  }, [students]);

  // --- HANDLERS ---
  const handleOpenModal = (student: any) => {
    setActiveStudent(student);
    setCurrentNote(student.lobbyNote || '');
  };

  const handleUpdateStatus = (id: string, newStatus: string) => {
    setStudents(students.map(s => s.id === id ? { ...s, status: newStatus, lobbyNote: currentNote } : s));
    setActiveStudent(null);
    setSentLinks([]); 
  };

  const handleReassign = (id: string, field: string, value: string) => {
    setStudents(students.map(s => s.id === id ? { ...s, [field]: value } : s));
    setActiveStudent((prev: any) => prev ? { ...prev, [field]: value } : null);
  };

  const handleSendLink = (linkId: string) => setSentLinks([...sentLinks, linkId]);

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
            type="text" 
            placeholder="Search by name or role..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-slate-900 border border-slate-800 text-white p-5 pl-12 rounded-2xl text-lg font-bold outline-none focus:border-indigo-500 focus:ring-1 ring-indigo-500 transition-colors"
          />
        </div>

        {/* CAST GRID */}
        <div className="overflow-y-auto custom-scrollbar flex-1 pr-2">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-3">
            {filteredStudents.map(student => (
              <div 
                key={student.id} 
                onClick={() => handleOpenModal(student)} 
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
                    {student.conflicts && (
                      <p className="text-amber-500 text-[10px] font-bold mt-1 flex items-center gap-1">
                        <AlertTriangle size={10} /> {student.conflicts}
                      </p>
                    )}
                  </div>
                </div>
                {getStatusBadge(student.status)}
              </div>
            ))}
          </div>
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
                  <input type="text" value={activeStudent.name} onChange={(e) => handleReassign(activeStudent.id, 'name', e.target.value)} className="bg-transparent border-none text-2xl md:text-3xl font-black text-white leading-none outline-none focus:ring-1 ring-indigo-500 rounded w-full" />
                  <p className="text-indigo-400 font-bold text-sm">{activeStudent.timeSlot} Block</p>
                </div>
              </div>
              <button onClick={() => setActiveStudent(null)} className="text-slate-500 hover:text-white text-4xl leading-none">&times;</button>
            </div>

            {/* Modal Body */}
            <div className={`p-4 md:p-6 space-y-6 overflow-y-auto custom-scrollbar ${activeStudent.status !== 'Pending' ? 'opacity-40 pointer-events-none' : ''}`}>
              
              {/* Context Block */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {activeStudent.isFirstShow ? (
                  <div className="p-4 rounded-xl border bg-emerald-500/5 border-emerald-500/20 text-emerald-400 flex flex-col justify-center">
                    <p className="font-black text-[10px] uppercase tracking-widest mb-1">🎉 New Family</p>
                    <p className="text-xs opacity-80">Point out the parent orientation table.</p>
                  </div>
                ) : (
                  <div className="p-4 rounded-xl border bg-indigo-500/5 border-indigo-500/20 text-indigo-400 flex flex-col justify-center">
                    <p className="font-black text-[10px] uppercase tracking-widest mb-2">✨ Welcome Back</p>
                    <div className="space-y-1 border-t border-indigo-500/20 pt-2 mt-1">
                      {activeStudent.showHistory.length > 0 ? activeStudent.showHistory.slice(0,2).map((show: any, idx: number) => (
                        <div key={idx} className="flex justify-between items-center text-xs">
                          <span className="truncate pr-2 opacity-80">{show.title}</span>
                          <span className="font-bold whitespace-nowrap">{show.role}</span>
                        </div>
                      )) : <span className="text-xs opacity-80">Returning Student</span>}
                    </div>
                  </div>
                )}
                
                <div className="space-y-2">
                  <div className="p-4 bg-slate-950/50 border border-slate-800 rounded-xl">
                    <span className="text-[10px] text-slate-500 font-bold uppercase tracking-widest block mb-1">Guardians</span>
                    <p className="text-sm font-medium">{activeStudent.family.parents.join(' & ')}</p>
                  </div>
                  {activeStudent.family.siblings.length > 0 && (
                    <div className="p-3 bg-indigo-500/5 border border-indigo-500/20 rounded-xl">
                      <span className="text-[9px] text-indigo-400/60 font-black uppercase tracking-widest block mb-1">CYT Siblings</span>
                      <div className="flex flex-wrap gap-2">
                        {activeStudent.family.siblings.map((sib: string) => (
                          <span key={sib} className="px-2 py-0.5 bg-indigo-500/10 text-indigo-300 text-[10px] font-bold rounded border border-indigo-500/20">{sib}</span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Lobby Note */}
              <div className="p-4 border border-slate-800 rounded-xl bg-slate-950/30">
                <p className="text-[10px] font-black text-slate-500 mb-2 uppercase tracking-widest flex items-center gap-2">
                  Director / Admin Note
                </p>
                <textarea 
                  value={currentNote} 
                  onChange={(e) => setCurrentNote(e.target.value)} 
                  placeholder="Scared, cough, peanut allergy, stressed parent..." 
                  className="w-full bg-slate-950 border border-slate-800 text-white p-3 rounded-xl focus:ring-1 ring-indigo-500 outline-none text-sm min-h-[70px] resize-none placeholder:opacity-30"
                />
              </div>

              {/* Audition Material */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-slate-950 border border-slate-800 p-4 rounded-xl flex justify-between items-center shadow-inner">
                  <div>
                    <p className="text-[9px] text-slate-500 uppercase font-black tracking-widest mb-1">Monologue</p>
                    <p className="text-sm font-bold">{activeStudent.auditionPrep.monologue}</p>
                  </div>
                </div>
                <div className={`border p-4 rounded-xl flex justify-between items-center shadow-inner ${activeStudent.auditionPrep.musicProvided ? 'bg-emerald-500/5 border-emerald-500/20' : 'bg-rose-500/5 border-rose-500/20'}`}>
                  <div>
                    <p className="text-[9px] text-slate-500 uppercase font-black tracking-widest mb-1">Audition Song</p>
                    <p className={`text-sm font-bold ${activeStudent.auditionPrep.musicProvided ? 'text-emerald-400' : 'text-rose-400'}`}>
                      {activeStudent.auditionPrep.songTitle} 
                      <span className="text-[10px] ml-1 opacity-70">({activeStudent.auditionPrep.musicProvided ? 'LOADED' : 'MISSING'})</span>
                    </p>
                  </div>
                </div>
              </div>

              {/* Contact Info Editing */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest ml-1">Parent Phone</label>
                  <input type="text" value={activeStudent.phone} onChange={(e) => handleReassign(activeStudent.id, 'phone', e.target.value)} className="w-full bg-slate-950 border border-slate-800 text-white px-4 py-2.5 rounded-xl text-sm focus:ring-1 ring-indigo-500 outline-none" />
                </div>
                <div className="space-y-1">
                  <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest ml-1">Parent Email</label>
                  <input type="email" value={activeStudent.email} onChange={(e) => handleReassign(activeStudent.id, 'email', e.target.value)} className="w-full bg-slate-950 border border-slate-800 text-white px-4 py-2.5 rounded-xl text-sm focus:ring-1 ring-indigo-500 outline-none" />
                </div>
              </div>

              {/* Paperwork Logic */}
              <div className="space-y-3">
                <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Outstanding Paperwork</p>
                {activeStudent.missingForms.length === 0 ? (
                  <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-emerald-400 text-xs font-bold text-center">All Forms Complete</div>
                ) : (
                  activeStudent.missingForms.map((form: string) => {
                    const isSent = sentLinks.includes(form);
                    return (
                      <div key={form} className="flex flex-col md:flex-row md:items-center justify-between bg-slate-950 border border-rose-500/20 p-3 rounded-xl gap-3">
                        <div className="flex items-center gap-3">
                          <div className="w-1.5 h-1.5 rounded-full bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.6)]"></div>
                          <span className="text-sm font-bold text-rose-100">{form}</span>
                        </div>
                        <div className="flex gap-2">
                          <button onClick={() => setViewingForm(form)} className="px-4 py-2 bg-slate-800 text-slate-400 text-[10px] font-bold rounded-lg uppercase tracking-widest hover:text-white transition-colors flex-1 md:flex-none">Preview</button>
                          <button onClick={() => handleSendLink(form)} disabled={isSent} className={`px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all flex-1 md:flex-none ${isSent ? 'bg-emerald-500/20 text-emerald-400' : 'bg-rose-600 text-white hover:bg-rose-500 shadow-lg'}`}>{isSent ? 'Sent' : 'Re-send Link'}</button>
                        </div>
                      </div>
                    );
                  })
                )}
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

      {/* Form Overlay */}
      {viewingForm && (
        <div className="fixed inset-0 bg-slate-950/95 backdrop-blur-xl flex items-center justify-center p-4 z-[100]" onClick={() => setViewingForm(null)}>
          <div className="bg-slate-900 border border-white/10 rounded-2xl w-full max-w-lg shadow-2xl p-6 md:p-8" onClick={e => e.stopPropagation()}>
            <h3 className="text-xl md:text-2xl font-black text-white mb-4 border-b border-white/5 pb-4">{FORM_TEMPLATES[viewingForm].title}</h3>
            <p className="text-slate-400 text-sm leading-relaxed mb-8">{FORM_TEMPLATES[viewingForm].text}</p>
            <div className="flex justify-between items-center">
              <span className="text-[10px] font-black text-rose-500 uppercase tracking-[0.2em]">Signature Required</span>
              <button onClick={() => setViewingForm(null)} className="px-6 py-3 bg-slate-800 text-white text-[10px] font-black uppercase tracking-widest rounded-xl hover:bg-slate-700">Close Preview</button>
            </div>
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