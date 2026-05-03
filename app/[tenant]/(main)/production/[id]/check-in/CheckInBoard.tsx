"use client";

import React, { useState, useMemo } from "react";
import Link from "next/link";
import { 
  ChevronLeft, Search, Check, Clock, X, AlertTriangle, 
  Mail, Phone, Music, BookOpen, Send, Pill, UserPlus, Layers, List
} from "lucide-react";

const FORM_TEMPLATES: Record<string, { title: string, text: string }> = {
  'Code of Conduct': { 
    title: 'Student Code of Conduct', 
    text: 'CYT expects students to exhibit respectful, safe behavior at all times.' 
  },
  'Production Manual': {
    title: 'Production Manual Signature',
    text: 'I have read the CYT Fredericksburg Production Manual and agree to the policies.'
  }
};

const AUDITION_BLOCKS = ["5:00 PM", "5:30 PM", "6:00 PM", "6:30 PM", "7:00 PM"];

const MOCK_CAST = [
  { 
    id: "1", name: "James Fitzhugh", role: "Oliver", 
    avatar: "https://i.pravatar.cc/150?u=james",
    status: "Pending", timeSlot: "5:00 PM",
    phone: "540-809-3106", email: "austin@example.com",
    emergencyContact: "Caitlin Fitzhugh", emergencyPhone: "540-555-0199",
    tylenolApproved: true, ibuprofenApproved: true, medicalNotes: "N/A",
    missingForms: [],
    auditionPrep: { monologue: "Dramatic 1", songTitle: "Consider Yourself", musicUploaded: true },
    lobbyNote: "", conflicts: ""
  },
  { 
    id: "2", name: "Gabriel Fitzhugh", role: "Fagin", 
    avatar: "https://i.pravatar.cc/150?u=gabriel",
    status: "Pending", timeSlot: "5:00 PM",
    phone: "540-809-3106", email: "austin@example.com",
    emergencyContact: "Caitlin Fitzhugh", emergencyPhone: "540-555-0199",
    tylenolApproved: true, ibuprofenApproved: false, medicalNotes: "N/A",
    missingForms: ["Production Manual"],
    auditionPrep: { monologue: "Villain 2", songTitle: "Reviewing the Situation", musicUploaded: false },
    lobbyNote: "", conflicts: ""
  },
  { 
    id: "3", name: "Oliver Fitzhugh", role: "Artful Dodger", 
    avatar: "https://i.pravatar.cc/150?u=oliver",
    status: "Pending", timeSlot: "5:30 PM",
    phone: "540-809-3106", email: "austin@example.com",
    emergencyContact: "Caitlin Fitzhugh", emergencyPhone: "540-555-0199",
    tylenolApproved: true, ibuprofenApproved: true, medicalNotes: "N/A",
    missingForms: [],
    auditionPrep: { monologue: "Comedic 1", songTitle: "I'd Do Anything", musicUploaded: true },
    lobbyNote: "Loud voice!", conflicts: ""
  },
  { 
    id: "4", name: "Penelope Fitzhugh", role: "Nancy", 
    avatar: "https://i.pravatar.cc/150?u=penelope",
    status: "Pending", timeSlot: "5:30 PM",
    phone: "540-809-3106", email: "austin@example.com",
    emergencyContact: "Caitlin Fitzhugh", emergencyPhone: "540-555-0199",
    tylenolApproved: false, ibuprofenApproved: false, medicalNotes: "N/A",
    missingForms: ["Code of Conduct"],
    auditionPrep: { monologue: "Dramatic 2", songTitle: "As Long as He Needs Me", musicUploaded: false },
    lobbyNote: "", conflicts: ""
  },
];

export default function CheckInBoard({ productionTitle }: { productionTitle: string }) {
  const [students, setStudents] = useState<any[]>(MOCK_CAST);
  const [searchQuery, setSearchQuery] = useState("");
  const [viewMode, setViewMode] = useState<'list' | 'blocks'>('blocks');
  const [activeStudent, setActiveStudent] = useState<any | null>(null);
  const [sentLinks, setSentLinks] = useState<string[]>([]);
  const [viewingForm, setViewingForm] = useState<string | null>(null);
  const [maximizedImage, setMaximizedImage] = useState<string | null>(null);

  const stats = useMemo(() => {
    const checkedIn = students.filter(s => s.status === 'Checked In').length;
    const late = students.filter(s => s.status === 'Late').length;
    const pending = students.length - (checkedIn + late + students.filter(s => s.status === 'No Show').length);
    return { checkedIn, late, pending };
  }, [students]);

  const updateStudentData = (id: string, field: string, value: any) => {
    setStudents(prev => prev.map(s => s.id === id ? { ...s, [field]: value } : s));
    if (activeStudent?.id === id) {
      setActiveStudent((prev: any) => ({ ...prev, [field]: value }));
    }
  };

  const filteredStudents = students.filter(s => 
    s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    s.role.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const groupedStudents = useMemo(() => {
    const groups: Record<string, any[]> = {};
    AUDITION_BLOCKS.forEach(block => groups[block] = []);
    filteredStudents.forEach(s => {
      if (!groups[s.timeSlot]) groups[s.timeSlot] = [];
      groups[s.timeSlot].push(s);
    });
    return groups;
  }, [filteredStudents]);

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
          
          <div className="flex items-center gap-4">
            <div className="flex bg-slate-900 rounded-xl p-1 border border-slate-800">
              <button onClick={() => setViewMode('blocks')} className={`p-2 rounded-lg transition-colors ${viewMode === 'blocks' ? 'bg-indigo-600 text-white' : 'text-slate-500 hover:text-white'}`}><Layers size={18}/></button>
              <button onClick={() => setViewMode('list')} className={`p-2 rounded-lg transition-colors ${viewMode === 'list' ? 'bg-indigo-600 text-white' : 'text-slate-500 hover:text-white'}`}><List size={18}/></button>
            </div>
            <div className="flex gap-2 bg-slate-900 p-2 rounded-2xl border border-slate-800">
               <div className="px-4 py-2 bg-slate-950 rounded-xl text-center">
                 <span className="block text-2xl font-black text-emerald-400">{stats.checkedIn}</span>
                 <span className="text-[9px] uppercase text-slate-500 font-bold tracking-widest">In</span>
               </div>
               <div className="px-4 py-2 bg-slate-950 rounded-xl text-center">
                 <span className="block text-2xl font-black text-amber-400">{stats.late}</span>
                 <span className="text-[9px] uppercase text-slate-500 font-bold tracking-widest">Late</span>
               </div>
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

        {/* Main Grid / Block View */}
        <div className="overflow-y-auto flex-1 pr-2 custom-scrollbar">
          {viewMode === 'list' ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pb-8">
              {filteredStudents.map(student => (
                <StudentCard key={student.id} student={student} onClick={() => setActiveStudent(student)} />
              ))}
            </div>
          ) : (
            <div className="space-y-8 pb-8">
              {AUDITION_BLOCKS.map(block => groupedStudents[block].length > 0 && (
                <div key={block} className="space-y-4">
                  <h3 className="text-xs font-black text-slate-500 uppercase tracking-[0.3em] flex items-center gap-4">
                    {block} Block <span className="h-px bg-slate-800 flex-1"></span>
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {groupedStudents[block].map(student => (
                      <StudentCard key={student.id} student={student} onClick={() => setActiveStudent(student)} />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* VERIFICATION MODAL */}
      {activeStudent && (
        <div className="fixed inset-0 bg-slate-950/90 backdrop-blur-md flex items-center justify-center p-4 z-40" onClick={() => setActiveStudent(null)}>
          <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-2xl overflow-hidden shadow-2xl flex flex-col max-h-[95vh]" onClick={(e) => e.stopPropagation()}>
            
            <div className="p-6 border-b border-slate-800 flex justify-between items-start bg-slate-900/50">
              <div className="flex gap-4 items-center">
                <img src={activeStudent.avatar} onClick={() => setMaximizedImage(activeStudent.avatar)} className="w-16 h-16 rounded-full border-2 border-slate-700 cursor-zoom-in hover:border-indigo-400" />
                <div>
                  <h2 className="text-2xl font-black text-white leading-none">{activeStudent.name}</h2>
                  <div className="mt-2 flex items-center gap-2">
                    <span className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Block:</span>
                    <select 
                      value={activeStudent.timeSlot}
                      onChange={(e) => updateStudentData(activeStudent.id, 'timeSlot', e.target.value)}
                      className="bg-slate-800 text-indigo-400 text-xs font-bold px-2 py-1 rounded outline-none border border-slate-700"
                    >
                      {AUDITION_BLOCKS.map(b => <option key={b} value={b}>{b}</option>)}
                    </select>
                  </div>
                </div>
              </div>
              <button onClick={() => setActiveStudent(null)} className="text-slate-500 hover:text-white text-3xl">&times;</button>
            </div>

            <div className="p-6 space-y-6 overflow-y-auto custom-scrollbar">
              {/* Contact Updates */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[9px] text-slate-500 font-bold uppercase ml-1">Parent Email</label>
                  <input type="email" value={activeStudent.email} onChange={(e) => updateStudentData(activeStudent.id, 'email', e.target.value)} className="w-full bg-slate-950 border border-slate-800 text-white px-3 py-2 rounded-lg text-sm" />
                </div>
                <div className="space-y-1">
                  <label className="text-[9px] text-slate-500 font-bold uppercase ml-1">Parent Phone</label>
                  <input type="text" value={activeStudent.phone} onChange={(e) => updateStudentData(activeStudent.id, 'phone', e.target.value)} className="w-full bg-slate-950 border border-slate-800 text-white px-3 py-2 rounded-lg text-sm" />
                </div>
              </div>

              {/* Medication Approvals */}
              <div className="p-4 bg-slate-950 border border-slate-800 rounded-xl grid grid-cols-2 gap-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold flex items-center gap-2"><Pill size={14} className="text-indigo-400"/> Tylenol</span>
                  <button onClick={() => updateStudentData(activeStudent.id, 'tylenolApproved', !activeStudent.tylenolApproved)} className={`px-3 py-1 rounded text-[10px] font-black ${activeStudent.tylenolApproved ? 'bg-emerald-500/20 text-emerald-400' : 'bg-slate-800 text-slate-500'}`}>
                    {activeStudent.tylenolApproved ? 'YES' : 'NO'}
                  </button>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold flex items-center gap-2"><Pill size={14} className="text-indigo-400"/> Ibuprofen</span>
                  <button onClick={() => updateStudentData(activeStudent.id, 'ibuprofenApproved', !activeStudent.ibuprofenApproved)} className={`px-3 py-1 rounded text-[10px] font-black ${activeStudent.ibuprofenApproved ? 'bg-emerald-500/20 text-emerald-400' : 'bg-slate-800 text-slate-500'}`}>
                    {activeStudent.ibuprofenApproved ? 'YES' : 'NO'}
                  </button>
                </div>
              </div>

              {/* Audition Material + Music Resend */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 bg-slate-950 border border-slate-800 rounded-xl">
                  <span className="text-[10px] text-slate-500 font-bold uppercase tracking-widest block mb-2"><BookOpen size={10} className="inline mr-1"/> Monologue</span>
                  <p className="text-sm font-bold text-white">{activeStudent.auditionPrep.monologue}</p>
                </div>
                <div className={`p-4 border rounded-xl flex justify-between items-center ${activeStudent.auditionPrep.musicUploaded ? 'bg-emerald-500/5 border-emerald-500/20' : 'bg-rose-500/5 border-rose-500/20'}`}>
                  <div>
                    <span className="text-[10px] text-slate-500 font-bold uppercase tracking-widest block mb-1"><Music size={10} className="inline mr-1"/> Song</span>
                    <p className="text-sm font-bold text-white">{activeStudent.auditionPrep.songTitle}</p>
                  </div>
                  {!activeStudent.auditionPrep.musicUploaded && (
                    <button onClick={() => setSentLinks(prev => [...prev, 'Music'])} disabled={sentLinks.includes('Music')} className={`p-2 rounded-lg transition-all ${sentLinks.includes('Music') ? 'bg-emerald-500/20 text-emerald-400' : 'bg-rose-600 text-white hover:bg-rose-500 shadow-md'}`}>
                      <Send size={14}/>
                    </button>
                  )}
                </div>
              </div>

              {/* Forms Resend */}
              <div className="space-y-3">
                <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Outstanding Paperwork</p>
                {activeStudent.missingForms.length === 0 ? (
                  <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-emerald-400 text-xs font-bold text-center">Complete</div>
                ) : (
                  activeStudent.missingForms.map((form: string) => (
                    <div key={form} className="flex items-center justify-between bg-slate-950 border border-rose-500/20 p-3 rounded-xl">
                      <span className="text-sm font-bold text-rose-100">{form}</span>
                      <button onClick={() => setSentLinks(prev => [...prev, form])} disabled={sentLinks.includes(form)} className={`px-3 py-2 rounded-lg text-[10px] font-bold flex items-center gap-1 ${sentLinks.includes(form) ? 'bg-emerald-500/20 text-emerald-400' : 'bg-rose-600 text-white'}`}>
                        {sentLinks.includes(form) ? <Check size={12}/> : <Send size={12}/>}
                        {sentLinks.includes(form) ? 'Sent' : 'Re-send'}
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>

            <div className="p-6 border-t border-slate-800 bg-slate-900 flex justify-between items-center">
              <button onClick={() => handleUpdateStatus(activeStudent.id, 'No Show')} className="px-4 py-3 text-slate-500 hover:text-rose-400 text-[10px] font-black uppercase">No-Show</button>
              <button onClick={() => handleUpdateStatus(activeStudent.id, 'Checked In')} className="px-8 py-3.5 rounded-xl font-black text-white bg-indigo-600 text-[10px] uppercase tracking-[0.2em] shadow-lg">Verify & Check In</button>
            </div>
          </div>
        </div>
      )}

      {/* Overlays */}
      {maximizedImage && (
        <div className="fixed inset-0 z-[110] bg-slate-950/90 backdrop-blur-xl flex items-center justify-center p-4" onClick={() => setMaximizedImage(null)}>
          <img src={maximizedImage} className="max-w-full max-h-[85vh] rounded-2xl border-4 border-white/10 shadow-2xl" />
        </div>
      )}
    </div>
  );
}

function StudentCard({ student, onClick }: { student: any, onClick: () => void }) {
  return (
    <div 
      onClick={onClick} 
      className={`flex justify-between items-center p-4 rounded-2xl cursor-pointer border transition-all ${
        student.status !== 'Pending' ? 'opacity-50 bg-slate-900/50 border-slate-800' : 'bg-slate-900 border-slate-700 hover:border-indigo-500/50'
      }`}
    >
      <div className="flex items-center gap-4">
        <img src={student.avatar} className="w-12 h-12 rounded-full border-2 border-slate-700 object-cover" />
        <div>
          <h3 className="text-white font-black text-lg tracking-tighter leading-tight">{student.name}</h3>
          <p className="text-slate-400 text-xs font-bold uppercase tracking-widest">{student.role}</p>
        </div>
      </div>
      {student.status === 'Pending' ? (
        <div className="text-indigo-400 font-bold text-xs px-3">REVIEW &rarr;</div>
      ) : (
        <div className="px-3 py-1 bg-slate-800 rounded font-bold text-[10px] text-white uppercase">{student.status}</div>
      )}
    </div>
  );
}