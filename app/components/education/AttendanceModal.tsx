"use client";

import { useState } from 'react';
import { Check, X, Clock, Save, ClipboardList } from 'lucide-react';

export default function AttendanceModal({ students, className }: { students: any[], className?: string }) {
  const [isOpen, setIsOpen] = useState(false);
  const [status, setStatus] = useState<Record<string, 'present' | 'absent' | 'late' | null>>({});

  const toggleStatus = (id: string, newStatus: 'present' | 'absent' | 'late') => {
    setStatus(prev => ({
      ...prev,
      [id]: prev[id] === newStatus ? null : newStatus
    }));
  };

  const markAll = () => {
    const next = { ...status };
    students.forEach(s => next[s.id] = 'present');
    setStatus(next);
  };

  if (!isOpen) {
    return (
      <button 
        onClick={() => setIsOpen(true)}
        className={className}
      >
        <ClipboardList size={16} /> Take Attendance
      </button>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-zinc-900 border border-white/10 rounded-3xl w-full max-w-2xl max-h-[85vh] flex flex-col shadow-2xl">
        
        {/* Header */}
        <div className="p-6 border-b border-white/5 flex justify-between items-center bg-zinc-950/30 rounded-t-3xl">
          <div>
            <h2 className="text-xl font-black text-white">Attendance</h2>
            <p className="text-xs text-zinc-500 font-medium uppercase tracking-wider">{students.length} Students Enrolled</p>
          </div>
          <button onClick={() => setIsOpen(false)} className="p-2 hover:bg-white/10 rounded-full transition-colors">
            <X size={20} className="text-zinc-400" />
          </button>
        </div>

        {/* Scrollable List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-2 custom-scrollbar">
          {students.map((student) => {
            const s = status[student.id];
            return (
              <div key={student.id} className="p-3 bg-black/20 border border-white/5 rounded-xl flex items-center justify-between hover:bg-white/[0.02] transition-colors">
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center text-xs font-black shrink-0 ${student.photo ? '' : 'bg-zinc-800 text-zinc-500'}`}>
                    {student.photo ? (
                      <img src={student.photo} alt={student.name} className="w-full h-full object-cover rounded-full" />
                    ) : (
                      student.name.substring(0, 2).toUpperCase()
                    )}
                  </div>
                  <div>
                    <div className="text-sm font-bold text-white leading-tight">{student.name}</div>
                    <div className="text-[10px] font-medium text-zinc-600 uppercase tracking-wider">{student.status}</div>
                  </div>
                </div>

                <div className="flex gap-1">
                  <StatusBtn active={s === 'present'} color="bg-emerald-500" icon={<Check size={14} />} onClick={() => toggleStatus(student.id, 'present')} />
                  <StatusBtn active={s === 'late'} color="bg-amber-500" icon={<Clock size={14} />} onClick={() => toggleStatus(student.id, 'late')} />
                  <StatusBtn active={s === 'absent'} color="bg-red-500" icon={<X size={14} />} onClick={() => toggleStatus(student.id, 'absent')} />
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-white/5 bg-zinc-950/30 rounded-b-3xl flex justify-between items-center">
          <button onClick={markAll} className="text-[10px] font-bold uppercase tracking-wider text-zinc-500 hover:text-white transition-colors">
            Mark All Present
          </button>
          <button 
            onClick={() => setIsOpen(false)} // Mock save for now
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white px-6 py-3 rounded-xl text-xs font-bold uppercase tracking-wide transition-all shadow-lg shadow-blue-900/20"
          >
            <Save size={14} /> Save Record
          </button>
        </div>
      </div>
    </div>
  );
}

function StatusBtn({ active, color, icon, onClick }: any) {
  return (
    <button 
      onClick={onClick}
      className={`w-8 h-8 rounded-lg flex items-center justify-center transition-all ${active ? `${color} text-white shadow-lg scale-105` : 'bg-zinc-800 text-zinc-600 hover:bg-zinc-700'}`}
    >
      {icon}
    </button>
  )
}