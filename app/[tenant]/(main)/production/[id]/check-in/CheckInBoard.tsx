"use client";

import React, { useState, useMemo } from "react";
import Link from "next/link";
import { ChevronLeft, Search, Check, Clock, X, AlertTriangle } from "lucide-react";

// --- FORM TEMPLATES ---
const FORM_TEMPLATES: Record<string, { title: string, text: string }> = {
  'Medical Release': { 
    title: 'Emergency Medical Release', 
    text: 'I hereby give my consent for emergency medical care, hospitalization, or surgery for my child in the event of an emergency where I cannot be reached.' 
  },
  'Code of Conduct': { 
    title: 'Student Code of Conduct', 
    text: 'CYT expects students to exhibit respectful, safe behavior at all times. Bullying, harassment, or unsafe use of props/set pieces will result in immediate disciplinary action.' 
  }
};

// Note: This Mock Data structure matches your sandbox page.
// You will eventually map your Baserow response to this structure.
const MOCK_CAST = [
  { 
    id: "1", name: "Tommy Fitzhugh", role: "Oliver", 
    avatar: "https://i.pravatar.cc/150?u=tommy",
    status: "Pending", timeSlot: "5:00 PM",
    isFirstShow: false, family: { parents: ["Austin", "Caitlin"], siblings: ["Jenny"] },
    missingForms: [],
    auditionPrep: { monologue: "Dramatic 1", songTitle: "Consider Yourself", musicProvided: true },
    lobbyNote: "", conflicts: ""
  },
  { 
    id: "2", name: "Jenny Fitzhugh", role: "Ensemble", 
    avatar: "https://i.pravatar.cc/150?u=jenny",
    status: "Pending", timeSlot: "5:00 PM",
    isFirstShow: true, family: { parents: ["Austin", "Caitlin"], siblings: ["Tommy"] },
    missingForms: ["Medical Release", "Code of Conduct"],
    auditionPrep: { monologue: "Comedic 2", songTitle: "Tomorrow (Annie)", musicProvided: false },
    lobbyNote: "Nervous, first audition!", conflicts: "Leaving early at 7:30"
  },
];

export default function CheckInBoard({ productionTitle }: { productionTitle: string }) {
  const [students, setStudents] = useState<any[]>(MOCK_CAST);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeStudent, setActiveStudent] = useState<any | null>(null);
  
  const [sentLinks, setSentLinks] = useState<string[]>([]);
  const [currentNote, setCurrentNote] = useState("");
  const [viewingForm, setViewingForm] = useState<string | null>(null);
  const [maximizedImage, setMaximizedImage] = useState<string | null>(null);

  // Stats Logic
  const stats = useMemo(() => {
    const total = students.length;
    const checkedIn = students.filter(s => s.status === 'Checked In').length;
    const late = students.filter(s => s.status === 'Late').length;
    const pending = total - (checkedIn + late + students.filter(s => s.status === 'No Show').length);
    return { checkedIn, late, pending };
  }, [students]);

  const handleOpenModal = (student: any) => {
    setActiveStudent(student);
    setCurrentNote(student.lobbyNote || '');
  };

  const handleUpdateStatus = (id: string, newStatus: string) => {
    setStudents(students.map(s => s.id === id ? { ...s, status: newStatus, lobbyNote: currentNote } : s));
    setActiveStudent(null);
    setSentLinks([]); 
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
      <div className="max-w-5xl mx-auto space-y-6 flex flex-col max-h-[90vh]">
        
        {/* Header with Stats */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 shrink-0">
          <div>
            <Link href={`/`} className="text-xs font-bold text-slate-500 hover:text-white flex items-center gap-1 transition-colors w-fit mb-4">
              <ChevronLeft size={16} /> Back to Dashboard
            </Link>
            <h1 className="text-3xl md:text-5xl font-black text-white uppercase italic tracking-tighter leading-none">Check-In</h1>
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

        {/* Search Bar */}
        <div className="relative shrink-0">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={20} />
          <input 
            type="text" 
            placeholder="Search by name or role..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-slate-900 border border-slate-800 text-white p-5 pl-12 rounded-2xl text-lg font-bold outline-none focus:border-indigo-500 transition-colors"
          />
        </div>

        {/* Cast Grid */}
        <div className="overflow-y-auto custom-scrollbar flex-1 pr-2">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
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
                    <img src={student.avatar} alt={student.name} className="w-12 h-12 rounded-full border-2 border-slate-700 bg-slate-800 object-cover" />
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
        </div>
      </div>

      {/* VERIFICATION MODAL */}
      {activeStudent && (
        <div className="fixed inset-0 bg-slate-950/90 backdrop-blur-md flex items-center justify-center p-4 z-40" onClick={() => setActiveStudent(null)}>
          <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-2xl overflow-hidden shadow-2xl flex flex-col max-h-[95vh]" onClick={(e) => e.stopPropagation()}>
            <div className="p-6 border-b border-slate-800 flex justify-between items-start bg-slate-900/50">
              <div className="flex gap-4 items-center">
                <img src={activeStudent.avatar} alt="Avatar" className="w-16 h-16 rounded-full border-2 border-slate-700" />
                <div>
                  <h2 className="text-2xl font-black text-white leading-none">{activeStudent.name}</h2>
                  <p className="text-indigo-400 font-bold text-sm mt-1">{activeStudent.timeSlot} Block</p>
                </div>
              </div>
              <button onClick={() => setActiveStudent(null)} className="text-slate-500 hover:text-white text-3xl">&times;</button>
            </div>

            <div className="p-6 space-y-6 overflow-y-auto">
              {/* Context Block */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {activeStudent.isFirstShow ? (
                  <div className="p-4 rounded-xl border bg-emerald-500/5 border-emerald-500/20 text-emerald-400">
                    <p className="font-black text-[10px] uppercase tracking-widest mb-1">🎉 New Family</p>
                    <p className="text-xs opacity-80">Point out the parent orientation table.</p>
                  </div>
                ) : (
                  <div className="p-4 rounded-xl border bg-indigo-500/5 border-indigo-500/20 text-indigo-400">
                    <p className="font-black text-[10px] uppercase tracking-widest mb-1">✨ Welcome Back</p>
                    <p className="text-xs opacity-80">Check for sibling check-ins.</p>
                  </div>
                )}
                <div className="p-4 bg-slate-950/50 border border-slate-800 rounded-xl">
                  <span className="text-[10px] text-slate-500 font-bold uppercase tracking-widest block mb-1">Guardians</span>
                  <p className="text-sm font-medium">{activeStudent.family.parents.join(' & ')}</p>
                </div>
              </div>

              {/* Lobby Note */}
              <div className="space-y-2">
                <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Lobby Note</p>
                <textarea 
                  value={currentNote} 
                  onChange={(e) => setCurrentNote(e.target.value)} 
                  placeholder="Notes for the director..." 
                  className="w-full bg-slate-950 border border-slate-800 text-white p-3 rounded-xl focus:ring-1 ring-indigo-500 outline-none text-sm min-h-[80px]"
                />
              </div>

              {/* Outstanding Paperwork */}
              <div className="space-y-3">
                <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Missing Forms</p>
                {activeStudent.missingForms.length === 0 ? (
                  <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-emerald-400 text-xs font-bold text-center">All Forms Complete</div>
                ) : (
                  activeStudent.missingForms.map((form: string) => (
                    <div key={form} className="flex items-center justify-between bg-slate-950 border border-rose-500/20 p-3 rounded-xl">
                      <span className="text-sm font-bold text-rose-100">{form}</span>
                      <button onClick={() => setViewingForm(form)} className="px-4 py-2 bg-slate-800 text-slate-400 text-[10px] font-bold rounded-lg uppercase tracking-widest hover:text-white transition-colors">Preview</button>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Footer Actions */}
            <div className="p-6 border-t border-slate-800 bg-slate-900 flex justify-between items-center">
              <button onClick={() => handleUpdateStatus(activeStudent.id, 'No Show')} className="px-4 py-3 rounded-xl font-black text-slate-500 hover:text-rose-400 text-[10px] uppercase tracking-widest">No-Show</button>
              <button onClick={() => handleUpdateStatus(activeStudent.id, 'Checked In')} className="px-8 py-3.5 rounded-xl font-black text-white bg-indigo-600 text-[10px] uppercase tracking-[0.2em] shadow-lg hover:bg-indigo-500 transition-all">Verify & Check In</button>
            </div>
          </div>
        </div>
      )}

      {/* Form Preview Overlay */}
      {viewingForm && (
        <div className="fixed inset-0 bg-slate-950/95 backdrop-blur-xl flex items-center justify-center p-4 z-[100]" onClick={() => setViewingForm(null)}>
          <div className="bg-slate-900 border border-white/10 rounded-2xl w-full max-w-lg p-8" onClick={e => e.stopPropagation()}>
            <h3 className="text-2xl font-black text-white mb-4">{FORM_TEMPLATES[viewingForm].title}</h3>
            <p className="text-slate-400 text-sm leading-relaxed mb-8">{FORM_TEMPLATES[viewingForm].text}</p>
            <button onClick={() => setViewingForm(null)} className="w-full px-6 py-4 bg-slate-800 text-white text-[10px] font-black uppercase tracking-widest rounded-xl hover:bg-slate-700">Close Preview</button>
          </div>
        </div>
      )}
    </div>
  );
}