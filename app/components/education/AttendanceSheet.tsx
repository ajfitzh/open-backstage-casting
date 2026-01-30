"use client";

import { useState } from 'react';
import { Check, X, Clock, Save, MoreHorizontal } from 'lucide-react';

export default function AttendanceSheet({ students }: { students: any[] }) {
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

  return (
    <div className="bg-zinc-900 border border-white/5 rounded-3xl overflow-hidden">
      {/* Toolbar */}
      <div className="p-4 border-b border-white/5 flex justify-between items-center bg-zinc-950/30">
        <div className="flex gap-2">
            <button onClick={markAll} className="text-[10px] font-bold uppercase tracking-wider bg-zinc-800 hover:bg-zinc-700 px-3 py-1.5 rounded-lg transition-colors text-zinc-300">
                Mark All Present
            </button>
        </div>
        <button className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wide transition-all shadow-lg shadow-blue-900/20">
            <Save size={14} /> Save Record
        </button>
      </div>

      {/* List */}
      <div className="divide-y divide-white/5">
        {students.map((student) => {
            const s = status[student.id];
            return (
                <div key={student.id} className="p-4 flex items-center justify-between hover:bg-white/[0.02] transition-colors">
                    <div className="flex items-center gap-4">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center text-xs font-black ${student.photo ? '' : 'bg-zinc-800 text-zinc-500'}`}>
                            {student.photo ? (
                                <img src={student.photo} alt={student.name} className="w-full h-full object-cover rounded-full" />
                            ) : (
                                student.name.substring(0, 2).toUpperCase()
                            )}
                        </div>
                        <div>
                            <div className="text-sm font-bold text-white">{student.name}</div>
                            <div className="text-[10px] font-medium text-zinc-500 uppercase tracking-wider">ID: {student.id}</div>
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
        {students.length === 0 && (
            <div className="p-12 text-center text-zinc-500 italic text-sm">No students found in roster.</div>
        )}
      </div>
    </div>
  );
}

function StatusBtn({ active, color, icon, onClick }: any) {
    return (
        <button 
            onClick={onClick}
            className={`w-9 h-9 rounded-xl flex items-center justify-center transition-all ${active ? `${color} text-white shadow-lg scale-105` : 'bg-zinc-800 text-zinc-600 hover:bg-zinc-700'}`}
        >
            {icon}
        </button>
    )
}