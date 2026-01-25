"use client";

import React, { useState } from 'react';
import { 
  CheckCircle2, XCircle, Clock, 
  ChevronRight, Search, Calendar, 
  MoreHorizontal, ArrowLeft
} from 'lucide-react';

export default function ClassManager({ classes, people }: any) {
  const [selectedClass, setSelectedClass] = useState<any>(null);

  // Filter people to simulate "Enrollment" in the selected class
  // In real life, this comes from an Enrollment Table.
  // Here, we grab a random slice of 10 people to pretend they are in the class.
  const enrolledStudents = selectedClass 
    ? people.slice(0, selectedClass.enrolled).map((p:any) => ({
        ...p,
        status: 'Present' // Default state
      }))
    : [];

  return (
    <div className="flex flex-col h-full bg-zinc-950 text-white font-sans">
        
        {/* VIEW 1: CLASS LIST (Elizabeth's View) */}
        {!selectedClass && (
            <div className="p-6">
                <h1 className="text-xl font-black uppercase italic tracking-wider text-blue-500 mb-6">
                    Winter Session 2026
                </h1>
                <div className="grid gap-3">
                    {classes.map((c: any) => (
                        <button 
                            key={c.id}
                            onClick={() => setSelectedClass(c)}
                            className="bg-zinc-900 border border-white/5 p-4 rounded-xl flex justify-between items-center group hover:bg-zinc-800 transition-all text-left"
                        >
                            <div>
                                <div className="font-bold text-white text-lg">{c.name}</div>
                                <div className="text-xs text-zinc-500 flex items-center gap-3 mt-1">
                                    <span className="flex items-center gap-1"><Clock size={12}/> {c.time}</span>
                                    <span className="flex items-center gap-1 text-zinc-600">
                                        Instructor: {c.teacher}
                                    </span>
                                </div>
                            </div>
                            <div className="flex items-center gap-4">
                                <div className="text-right hidden sm:block">
                                    <div className="text-xl font-black text-zinc-300">{c.enrolled}</div>
                                    <div className="text-[9px] uppercase font-bold text-zinc-600">Students</div>
                                </div>
                                <ChevronRight className="text-zinc-600 group-hover:text-white"/>
                            </div>
                        </button>
                    ))}
                </div>
            </div>
        )}

        {/* VIEW 2: TAKING ATTENDANCE (Javier's View) */}
        {selectedClass && (
            <div className="flex flex-col h-full">
                {/* HEADER */}
                <header className="h-16 border-b border-white/10 flex items-center justify-between px-4 bg-zinc-900">
                    <button onClick={() => setSelectedClass(null)} className="flex items-center gap-1 text-zinc-400 hover:text-white">
                        <ArrowLeft size={18}/> <span className="text-xs font-bold uppercase">Back</span>
                    </button>
                    <div className="text-center">
                        <div className="text-sm font-bold text-white">{selectedClass.name}</div>
                        <div className="text-[10px] text-zinc-500 uppercase">{new Date().toLocaleDateString()} Attendance</div>
                    </div>
                    <button className="text-emerald-500 text-xs font-bold uppercase">Save</button>
                </header>

                {/* STUDENT LIST */}
                <div className="flex-1 overflow-y-auto p-4 space-y-2">
                    {enrolledStudents.map((student: any) => (
                        <AttendanceRow key={student.id} student={student} />
                    ))}
                </div>
            </div>
        )}
    </div>
  );
}

// --- SUB-COMPONENT: ATTENDANCE TOGGLE ---
function AttendanceRow({ student }: any) {
    // Local state for the prototype to show interaction
    const [status, setStatus] = useState<'Present'|'Absent'|'Late'>('Present');

    return (
        <div className={`p-3 rounded-xl border flex items-center justify-between transition-all ${status === 'Absent' ? 'bg-red-900/10 border-red-500/30' : 'bg-zinc-900 border-white/5'}`}>
            <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-zinc-800 flex items-center justify-center font-bold text-zinc-500 text-xs">
                    {student["Full Name"]?.charAt(0) || "S"}
                </div>
                <div>
                    <div className="font-bold text-sm">{student["Full Name"]}</div>
                    <div className="text-[10px] text-zinc-500">Age: 14 • M</div>
                </div>
            </div>

            {/* TOGGLES */}
            <div className="flex bg-black/40 rounded-lg p-0.5">
                <button 
                    onClick={() => setStatus('Present')}
                    className={`px-3 py-2 rounded-md transition-all ${status === 'Present' ? 'bg-emerald-600 text-white shadow' : 'text-zinc-600 hover:text-emerald-500'}`}
                >
                    <CheckCircle2 size={18}/>
                </button>
                <button 
                    onClick={() => setStatus('Late')}
                    className={`px-3 py-2 rounded-md transition-all ${status === 'Late' ? 'bg-amber-600 text-white shadow' : 'text-zinc-600 hover:text-amber-500'}`}
                >
                    <Clock size={18}/>
                </button>
                <button 
                    onClick={() => setStatus('Absent')}
                    className={`px-3 py-2 rounded-md transition-all ${status === 'Absent' ? 'bg-red-600 text-white shadow' : 'text-zinc-600 hover:text-red-500'}`}
                >
                    <XCircle size={18}/>
                </button>
            </div>
        </div>
    )
}