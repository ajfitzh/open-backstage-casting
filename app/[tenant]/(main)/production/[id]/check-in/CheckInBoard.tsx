"use client";

import React, { useState, useMemo } from "react";
import Link from "next/link";
import { 
  ChevronLeft, Search, Check, Clock, X, AlertTriangle, 
  Mail, Phone, Music, BookOpen, Send, Pill, UserPlus 
} from "lucide-react";

const FORM_TEMPLATES: Record<string, { title: string, text: string }> = {
  'Code of Conduct': { 
    title: 'Student Code of Conduct', 
    text: 'CYT expects students to exhibit respectful, safe behavior at all times. Bullying, harassment, or unsafe use of props/set pieces will result in immediate disciplinary action.' 
  },
  'Production Manual': {
    title: 'Production Manual Signature',
    text: 'I have read the CYT Fredericksburg Production Manual with my student and agree to abide by the family expectations, student commitments, and attendance policies.'
  }
};

const MOCK_CAST = [
  { 
    id: "1", name: "Tommy Fitzhugh", role: "Oliver", 
    avatar: "https://i.pravatar.cc/150?u=tommy",
    status: "Pending", timeSlot: "5:00 PM",
    phone: "540-809-3106", 
    email: "austin@example.com",
    emergencyContact: "Caitlin Fitzhugh",
    emergencyPhone: "540-555-0199",
    tylenolApproved: true,
    ibuprofenApproved: false,
    medicalNotes: "N/A",
    missingForms: [],
    auditionPrep: { monologue: "Dramatic 1", songTitle: "Consider Yourself", musicUploaded: true },
    lobbyNote: "", conflicts: ""
  },
  { 
    id: "2", name: "Jenny Fitzhugh", role: "Ensemble", 
    avatar: "https://i.pravatar.cc/150?u=jenny",
    status: "Pending", timeSlot: "5:00 PM",
    phone: "540-809-3106", 
    email: "parents@fitzhugh.com",
    emergencyContact: "Austin Fitzhugh",
    emergencyPhone: "540-809-3106",
    tylenolApproved: false,
    ibuprofenApproved: false,
    medicalNotes: "Severe Peanut Allergy",
    missingForms: ["Production Manual"],
    auditionPrep: { monologue: "Comedic 2", songTitle: "Tomorrow", musicUploaded: false },
    lobbyNote: "Nervous!", conflicts: "Leaving early"
  },
];

export default function CheckInBoard({ productionTitle }: { productionTitle: string }) {
  const [students, setStudents] = useState<any[]>(MOCK_CAST);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeStudent, setActiveStudent] = useState<any | null>(null);
  
  const [sentLinks, setSentLinks] = useState<string[]>([]);
  const [viewingForm, setViewingForm] = useState<string | null>(null);
  const [maximizedImage, setMaximizedImage] = useState<string | null>(null);

  // Stats
  const stats = useMemo(() => {
    const checkedIn = students.filter(s => s.status === 'Checked In').length;
    const late = students.filter(s => s.status === 'Late').length;
    const pending = students.length - (checkedIn + late + students.filter(s => s.status === 'No Show').length);
    return { checkedIn, late, pending };
  }, [students]);

  // Handlers for Live Updates
  const updateStudentData = (id: string, field: string, value: any) => {
    setStudents(prev => prev.map(s => s.id === id ? { ...s, [field]: value } : s));
    if (activeStudent?.id === id) {
      setActiveStudent((prev: any) => ({ ...prev, [field]: value }));
    }
  };

  const handleUpdateStatus = (id: string, newStatus: string) => {
    updateStudentData(id, 'status', newStatus);
    setActiveStudent(null);
    setSentLinks([]); 
  };

  const filteredStudents = students.filter(s => 
    s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    s.role.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-slate-950 p-4 md:p-8 font-sans text-slate-200">
      <div className="max-w-5xl mx-auto space-y-6 flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 shrink-0">
          <div>
            <Link href={`/`} className="text-xs font-bold text-slate-500 hover:text-white flex items-center gap-1 mb-4">
              <ChevronLeft size={16} /> Back to Dashboard
            </Link>
            <h1 className="text-3xl md:text-5xl font-black text-white uppercase italic tracking-tighter">Check-In</h1>
            <p className="text-indigo-400 font-bold mt-1 text-lg">{productionTitle}</p>
          </div>
          
          <div className="flex gap-2 bg-slate-900 p-2 rounded-2xl border border-slate-800">
             <div className="px-4 py-2 bg-slate-950 rounded-xl text-center">
               <span className="block text-2xl font-black text-emerald-400">{stats.checkedIn}</span>
               <span className="text-[9px] uppercase text-slate-500 font-bold">In</span>
             </div>
             <div className="px-4 py-2 bg-slate-950 rounded-xl text-center">
               <span className="block text-2xl font-black text-amber-400">{stats.late}</span>
               <span className="text-[9px] uppercase text-slate-500 font-bold">Late</span>
             </div>
             <div className="px-4 py-2 bg-slate-950 rounded-xl text-center">
               <span className="block text-2xl font-black text-slate-600">{stats.pending}</span>
               <span className="text-[9px] uppercase text-slate-500 font-bold">Wait</span>
             </div>
          </div>
        </div>

        {/* Search */}
        <div className="relative shrink-0">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={20} />
          <input 
            type="text" 
            placeholder="Search student or role..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-slate-900 border border-slate-800 text-white p-5 pl-12 rounded-2xl text-lg font-bold outline-none focus:border-indigo-500"
          />
        </div>

        {/* Cast Grid */}
        <div className="overflow-y-auto flex-1 pr-2">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {filteredStudents.map(student => (
              <div 
                key={student.id} 
                onClick={() => setActiveStudent(student)} 
                className={`flex justify-between items-center p-4 rounded-2xl cursor-pointer border hover:border-indigo-500/50 ${
                  student.status !== 'Pending' ? 'opacity-50 bg-slate-900/50 border-slate-800' : 'bg-slate-900 border-slate-700'
                }`}
              >
                <div className="flex items-center gap-4">
                  <img src={student.avatar} alt="" className="w-12 h-12 rounded-full border-2 border-slate-700 object-cover" />
                  <div>
                    <h3 className="text-white font-black text-lg tracking-tighter">{student.name}</h3>
                    <p className="text-slate-400 text-xs font-bold">{student.role} • {student.timeSlot}</p>
                  </div>
                </div>
                {student.status === 'Pending' ? (
                  <div className="text-indigo-400 font-bold text-xs shrink-0 px-3">REVIEW &rarr;</div>
                ) : (
                  <div className="px-3 py-1 bg-slate-800 rounded font-bold text-[10px] text-white uppercase">{student.status}</div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* VERIFICATION MODAL */}
      {activeStudent && (
        <div className="fixed inset-0 bg-slate-950/90 backdrop-blur-md flex items-center justify-center p-4 z-40" onClick={() => setActiveStudent(null)}>
          <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-2xl overflow-hidden shadow-2xl flex flex-col max-h-[95vh]" onClick={(e) => e.stopPropagation()}>
            
            {/* Modal Header */}
            <div className="p-6 border-b border-slate-800 flex justify-between items-start bg-slate-900/50">
              <div className="flex gap-4 items-center">
                <img 
                  src={activeStudent.avatar} 
                  onClick={() => setMaximizedImage(activeStudent.avatar)}
                  className="w-16 h-16 rounded-full border-2 border-slate-700 cursor-zoom-in hover:border-indigo-400 transition-colors" 
                />
                <div>
                  <h2 className="text-2xl font-black text-white leading-none">{activeStudent.name}</h2>
                  <p className="text-indigo-400 font-bold text-sm mt-1">{activeStudent.timeSlot} Block</p>
                </div>
              </div>
              <button onClick={() => setActiveStudent(null)} className="text-slate-500 hover:text-white text-3xl">&times;</button>
            </div>

            <div className="p-6 space-y-6 overflow-y-auto custom-scrollbar">
              
              {/* PRIMARY CONTACT (Updateable) */}
              <div className="space-y-3">
                <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Parent Notifications</p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[9px] text-slate-500 font-bold flex items-center gap-1 ml-1"><Mail size={10}/> Email Address</label>
                    <input 
                      type="email" 
                      value={activeStudent.email}
                      onChange={(e) => updateStudentData(activeStudent.id, 'email', e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 text-white px-3 py-2 rounded-lg text-sm focus:ring-1 ring-indigo-500 outline-none"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[9px] text-slate-500 font-bold flex items-center gap-1 ml-1"><Phone size={10}/> Notification Phone</label>
                    <input 
                      type="text" 
                      value={activeStudent.phone}
                      onChange={(e) => updateStudentData(activeStudent.id, 'phone', e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 text-white px-3 py-2 rounded-lg text-sm focus:ring-1 ring-indigo-500 outline-none"
                    />
                  </div>
                </div>
              </div>

              {/* EMERGENCY CONTACT & MEDICAL (Updateable) */}
              <div className="space-y-3">
                <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Medical & Emergency</p>
                <div className="p-4 bg-slate-950 border border-slate-800 rounded-xl space-y-4">
                  <div className="grid grid-cols-2 gap-4 border-b border-slate-800 pb-4">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold flex items-center gap-2"><Pill size={14} className="text-indigo-400"/> Tylenol OK?</span>
                      <button 
                        onClick={() => updateStudentData(activeStudent.id, 'tylenolApproved', !activeStudent.tylenolApproved)}
                        className={`px-3 py-1 rounded text-[10px] font-black transition-colors ${activeStudent.tylenolApproved ? 'bg-emerald-500/20 text-emerald-400' : 'bg-slate-800 text-slate-500'}`}
                      >
                        {activeStudent.tylenolApproved ? 'YES' : 'NO'}
                      </button>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold flex items-center gap-2"><Pill size={14} className="text-indigo-400"/> Ibuprofen OK?</span>
                      <button 
                        onClick={() => updateStudentData(activeStudent.id, 'ibuprofenApproved', !activeStudent.ibuprofenApproved)}
                        className={`px-3 py-1 rounded text-[10px] font-black transition-colors ${activeStudent.ibuprofenApproved ? 'bg-emerald-500/20 text-emerald-400' : 'bg-slate-800 text-slate-500'}`}
                      >
                        {activeStudent.ibuprofenApproved ? 'YES' : 'NO'}
                      </button>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-[9px] text-slate-500 font-bold flex items-center gap-1"><UserPlus size={10}/> Emergency Contact</label>
                      <input 
                        type="text" 
                        value={activeStudent.emergencyContact}
                        onChange={(e) => updateStudentData(activeStudent.id, 'emergencyContact', e.target.value)}
                        className="w-full bg-slate-900 border border-slate-700 text-white px-3 py-2 rounded-lg text-sm"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[9px] text-slate-500 font-bold flex items-center gap-1"><Phone size={10}/> Emergency Phone</label>
                      <input 
                        type="text" 
                        value={activeStudent.emergencyPhone}
                        onChange={(e) => updateStudentData(activeStudent.id, 'emergencyPhone', e.target.value)}
                        className="w-full bg-slate-900 border border-slate-700 text-white px-3 py-2 rounded-lg text-sm"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* AUDITION MATERIAL */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 bg-slate-950 border border-slate-800 rounded-xl">
                  <span className="text-[10px] text-slate-500 font-bold uppercase tracking-widest block mb-2 flex items-center gap-1"><BookOpen size={10}/> Monologue</span>
                  <p className="text-sm font-bold text-indigo-100">{activeStudent.auditionPrep.monologue || "Not Selected"}</p>
                </div>
                <div className={`p-4 border rounded-xl ${activeStudent.auditionPrep.musicUploaded ? 'bg-emerald-500/5 border-emerald-500/20' : 'bg-rose-500/5 border-rose-500/20'}`}>
                  <span className="text-[10px] text-slate-500 font-bold uppercase tracking-widest block mb-2 flex items-center gap-1"><Music size={10}/> Audition Song</span>
                  <p className="text-sm font-bold text-white">
                    {activeStudent.auditionPrep.songTitle}
                    <span className="ml-2 text-[9px] opacity-60">({activeStudent.auditionPrep.musicUploaded ? "LOADED" : "MISSING"})</span>
                  </p>
                </div>
              </div>

              {/* LOBBY NOTE */}
              <div className="space-y-2">
                <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Admin / Lobby Note</p>
                <textarea 
                  value={activeStudent.lobbyNote} 
                  onChange={(e) => updateStudentData(activeStudent.id, 'lobbyNote', e.target.value)} 
                  className="w-full bg-slate-950 border border-slate-800 text-white p-3 rounded-xl text-sm min-h-[60px]"
                />
              </div>

              {/* PAPERWORK (Re-send Links) */}
              <div className="space-y-3">
                <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Outstanding Paperwork</p>
                {activeStudent.missingForms.length === 0 ? (
                  <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-emerald-400 text-xs font-bold text-center">All Forms Complete</div>
                ) : (
                  activeStudent.missingForms.map((form: string) => (
                    <div key={form} className="flex items-center justify-between bg-slate-950 border border-rose-500/20 p-3 rounded-xl">
                      <span className="text-sm font-bold text-rose-100">{form}</span>
                      <div className="flex gap-2">
                        <button onClick={() => setViewingForm(form)} className="px-3 py-2 bg-slate-800 text-slate-400 text-[10px] font-bold rounded-lg uppercase">Preview</button>
                        <button 
                          onClick={() => setSentLinks(prev => [...prev, form])} 
                          disabled={sentLinks.includes(form)}
                          className={`px-3 py-2 rounded-lg text-[10px] font-bold uppercase flex items-center gap-1 ${sentLinks.includes(form) ? 'bg-emerald-500/20 text-emerald-400' : 'bg-rose-600 text-white'}`}
                        >
                          {sentLinks.includes(form) ? <Check size={12}/> : <Send size={12}/>}
                          {sentLinks.includes(form) ? 'Sent' : 'Re-send'}
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Footer Actions */}
            <div className="p-6 border-t border-slate-800 bg-slate-900 flex justify-between items-center">
              <button onClick={() => handleUpdateStatus(activeStudent.id, 'No Show')} className="px-4 py-3 rounded-xl font-black text-slate-500 hover:text-rose-400 text-[10px] uppercase">No-Show</button>
              <button onClick={() => handleUpdateStatus(activeStudent.id, 'Checked In')} className="px-8 py-3.5 rounded-xl font-black text-white bg-indigo-600 text-[10px] uppercase tracking-[0.2em] shadow-lg active:scale-95">Verify & Check In</button>
            </div>
          </div>
        </div>
      )}

      {/* Overlays (Zoom & Form Preview) */}
      {maximizedImage && (
        <div className="fixed inset-0 z-[110] bg-slate-950/90 backdrop-blur-xl flex items-center justify-center p-4 cursor-zoom-out" onClick={() => setMaximizedImage(null)}>
          <img src={maximizedImage} className="max-w-full max-h-[85vh] rounded-2xl border-4 border-white/10 shadow-2xl" />
        </div>
      )}

      {viewingForm && (
        <div className="fixed inset-0 bg-slate-950/95 backdrop-blur-xl flex items-center justify-center p-4 z-[100]" onClick={() => setViewingForm(null)}>
          <div className="bg-slate-900 border border-white/10 rounded-2xl w-full max-w-lg p-8">
            <h3 className="text-2xl font-black text-white mb-4">{FORM_TEMPLATES[viewingForm].title}</h3>
            <p className="text-slate-400 text-sm leading-relaxed mb-8">{FORM_TEMPLATES[viewingForm].text}</p>
            <button onClick={() => setViewingForm(null)} className="w-full px-6 py-4 bg-slate-800 text-white text-[10px] font-black uppercase rounded-xl">Close Preview</button>
          </div>
        </div>
      )}
    </div>
  );
}