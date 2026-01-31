"use client";

import { useState, useEffect } from 'react';
import { 
  X, Users, Calendar, Phone, Mail, 
  CheckCircle2, Clock, XCircle, Loader2, 
  Save, ChevronRight, Search 
} from 'lucide-react';
import { fetchRosterAction } from "@/app/lib/actions";

export default function ClassManagerModal({ cls, onClose }: { cls: any, onClose: () => void }) {
  const [activeTab, setActiveTab] = useState<'roster' | 'attendance'>('roster');
  const [students, setStudents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Attendance State
  const [attendance, setAttendance] = useState<Record<string, string>>({});

  // Fetch data when modal opens
  useEffect(() => {
    async function load() {
      const data = await fetchRosterAction(cls.id);
      setStudents(data);
      setLoading(false);
    }
    load();
  }, [cls.id]);

  const toggleAttendance = (studentId: string) => {
    const current = attendance[studentId];
    const next = current === 'present' ? 'late' : current === 'late' ? 'absent' : 'present';
    setAttendance(prev => ({ ...prev, [studentId]: next }));
  };

  const markAllPresent = () => {
    const update: any = {};
    students.forEach(s => update[s.id] = 'present');
    setAttendance(update);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-zinc-900 border border-white/10 rounded-3xl w-full max-w-4xl h-[80vh] flex flex-col shadow-2xl overflow-hidden">
        
        {/* HEADER */}
        <div className="p-6 border-b border-white/5 bg-zinc-950 flex justify-between items-start shrink-0">
          <div>
            <h2 className="text-2xl font-black text-white tracking-tight">{cls.name}</h2>
            <div className="flex items-center gap-3 mt-2 text-sm font-medium text-zinc-400">
              <span className="flex items-center gap-1"><Calendar size={14}/> {cls.day}</span>
              <span className="w-1 h-1 rounded-full bg-zinc-700"></span>
              <span>{cls.time}</span>
              <span className="w-1 h-1 rounded-full bg-zinc-700"></span>
              <span className="text-blue-400">{cls.teacher}</span>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full transition-colors">
            <X size={24} className="text-zinc-400" />
          </button>
        </div>

        {/* TABS */}
        <div className="flex border-b border-white/5 bg-black/20 shrink-0">
          <TabButton 
            active={activeTab === 'roster'} 
            onClick={() => setActiveTab('roster')} 
            icon={<Users size={16}/>} 
            label={`Roster (${students.length})`} 
          />
          <TabButton 
            active={activeTab === 'attendance'} 
            onClick={() => setActiveTab('attendance')} 
            icon={<CheckCircle2 size={16}/>} 
            label="Attendance" 
          />
        </div>

        {/* CONTENT AREA */}
        <div className="flex-1 overflow-y-auto p-6 bg-zinc-900/50 custom-scrollbar relative">
          {loading ? (
            <div className="absolute inset-0 flex items-center justify-center">
              <Loader2 className="animate-spin text-blue-500" size={32} />
            </div>
          ) : students.length === 0 ? (
            <div className="text-center py-20 opacity-50">
              <Users size={48} className="mx-auto mb-4 text-zinc-600" />
              <p>No students found in this roster.</p>
            </div>
          ) : (
            <>
              {activeTab === 'roster' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {students.map(student => (
                    <div key={student.id} className="bg-zinc-950 border border-white/5 p-4 rounded-xl flex items-start gap-4 hover:border-white/10 transition-colors">
                      <div className="w-10 h-10 rounded-full bg-zinc-800 flex items-center justify-center text-xs font-black text-zinc-500 shrink-0">
                        {student.name.substring(0,2).toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <div className="font-bold text-white truncate">{student.name}</div>
                        <div className="text-[10px] text-zinc-500 uppercase font-bold tracking-wider mb-2">Age: {student.age || '?'}</div>
                        <div className="space-y-1">
                          {student.email && (
                            <div className="flex items-center gap-2 text-xs text-zinc-400">
                              <Mail size={12} className="text-zinc-600"/> <span className="truncate">{student.email}</span>
                            </div>
                          )}
                          {student.phone && (
                            <div className="flex items-center gap-2 text-xs text-zinc-400">
                              <Phone size={12} className="text-zinc-600"/> <span>{student.phone}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {activeTab === 'attendance' && (
                <div className="space-y-2">
                   <div className="flex justify-between items-center mb-4 bg-blue-500/10 border border-blue-500/20 p-3 rounded-xl">
                      <div className="text-xs font-bold text-blue-300 uppercase tracking-wide flex items-center gap-2">
                        <Calendar size={14} /> Today: {new Date().toLocaleDateString()}
                      </div>
                      <button onClick={markAllPresent} className="text-[10px] font-black uppercase text-blue-400 hover:text-white transition-colors">
                        Mark All Present
                      </button>
                   </div>

                   {students.map(student => {
                     const status = attendance[student.id];
                     return (
                       <div key={student.id} onClick={() => toggleAttendance(student.id)} className="group cursor-pointer bg-zinc-950 border border-white/5 p-3 rounded-xl flex items-center justify-between hover:bg-zinc-800 transition-colors select-none">
                         <div className="flex items-center gap-3">
                           <div className={`w-8 h-8 rounded-full flex items-center justify-center text-[10px] font-black transition-colors ${
                             status === 'present' ? 'bg-emerald-500 text-black' : 
                             status === 'late' ? 'bg-amber-500 text-black' :
                             status === 'absent' ? 'bg-red-500 text-white' : 'bg-zinc-800 text-zinc-600'
                           }`}>
                             {student.name.substring(0,2).toUpperCase()}
                           </div>
                           <span className={`font-bold transition-colors ${status ? 'text-white' : 'text-zinc-400'}`}>{student.name}</span>
                         </div>
                         
                         <div className="flex gap-1">
                            <StatusIndicator active={status === 'present'} color="bg-emerald-500" icon={<CheckCircle2 size={14}/>} />
                            <StatusIndicator active={status === 'late'} color="bg-amber-500" icon={<Clock size={14}/>} />
                            <StatusIndicator active={status === 'absent'} color="bg-red-500" icon={<XCircle size={14}/>} />
                         </div>
                       </div>
                     )
                   })}
                </div>
              )}
            </>
          )}
        </div>

        {/* FOOTER (Attendance Only) */}
        {activeTab === 'attendance' && (
          <div className="p-4 border-t border-white/5 bg-zinc-950 flex justify-end">
            <button className="bg-white text-black px-6 py-3 rounded-xl font-bold text-xs uppercase tracking-widest hover:bg-zinc-200 transition-colors flex items-center gap-2">
              <Save size={16} /> Save Record
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function TabButton({ active, onClick, icon, label }: any) {
  return (
    <button 
      onClick={onClick}
      className={`flex-1 flex items-center justify-center gap-2 py-4 text-xs font-bold uppercase tracking-widest transition-all ${
        active 
          ? 'bg-zinc-900 text-white border-b-2 border-blue-500' 
          : 'text-zinc-500 hover:text-zinc-300 hover:bg-white/5'
      }`}
    >
      {icon} {label}
    </button>
  )
}

function StatusIndicator({ active, color, icon }: any) {
  return (
    <div className={`w-8 h-8 rounded-lg flex items-center justify-center transition-all ${active ? `${color} text-white shadow-lg scale-110` : 'bg-transparent text-zinc-700'}`}>
      {icon}
    </div>
  )
}