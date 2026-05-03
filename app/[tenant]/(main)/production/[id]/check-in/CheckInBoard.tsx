"use client";

import React, { useState } from "react";
import Link from "next/link";
import { ChevronLeft, Search, Check, Clock, X, AlertTriangle } from "lucide-react";

// --- Mock Data (To swap with Baserow later) ---
const MOCK_CAST = [
  { id: 1, name: "Tommy Fitzhugh", role: "Oliver", conflicts: "" },
  { id: 2, name: "Jenny Fitzhugh", role: "Ensemble", conflicts: "Leaving early at 7:30" },
  { id: 3, name: "Sarah Smith", role: "Nancy", conflicts: "" },
  { id: 4, name: "Jake Ramirez", role: "Fagin", conflicts: "Late arrival (6:15)" },
  { id: 5, name: "Griblit Jones", role: "Artful Dodger", conflicts: "" },
  { id: 6, name: "Emma Davis", role: "Ensemble", conflicts: "Absent (Sick)" },
];

type Status = "pending" | "present" | "late" | "absent";

export default function CheckInBoard({ productionTitle }: { productionTitle: string }) {
  const [searchQuery, setSearchQuery] = useState("");
  // Track status in state: Record<childId, Status>
  const [attendance, setAttendance] = useState<Record<number, Status>>(
    MOCK_CAST.reduce((acc, cast) => ({ ...acc, [cast.id]: "pending" }), {})
  );

  const handleTap = (id: number) => {
    // Rapid-fire state machine: Pending -> Present -> Late -> Absent -> Pending
    setAttendance(prev => {
      const current = prev[id];
      if (current === "pending") return { ...prev, [id]: "present" };
      if (current === "present") return { ...prev, [id]: "late" };
      if (current === "late") return { ...prev, [id]: "absent" };
      return { ...prev, [id]: "pending" };
    });
  };

  const filteredCast = MOCK_CAST.filter(c => 
    c.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
    c.role.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const stats = {
    present: Object.values(attendance).filter(v => v === "present").length,
    late: Object.values(attendance).filter(v => v === "late").length,
    absent: Object.values(attendance).filter(v => v === "absent").length,
    pending: Object.values(attendance).filter(v => v === "pending").length,
  };

  return (
    <div className="min-h-screen bg-zinc-950 p-4 md:p-8 font-sans text-zinc-100">
      <div className="max-w-5xl mx-auto space-y-6 md:space-y-8">
        
        {/* HEADER */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <Link href={`/`} className="text-xs font-bold text-zinc-500 hover:text-white flex items-center gap-1 transition-colors w-fit mb-4">
              <ChevronLeft size={16} /> Back to Dashboard
            </Link>
            <h1 className="text-3xl md:text-5xl font-black text-white uppercase italic tracking-tighter leading-none">
              Check-In
            </h1>
            <p className="text-blue-500 font-bold mt-1 text-lg">{productionTitle}</p>
          </div>
          
          {/* STATS ROW */}
          <div className="flex gap-2 bg-zinc-900 p-2 rounded-2xl border border-zinc-800">
             <div className="px-4 py-2 bg-zinc-950 rounded-xl text-center">
               <span className="block text-2xl font-black text-white">{stats.present}</span>
               <span className="text-[9px] uppercase tracking-widest text-zinc-500 font-bold">Here</span>
             </div>
             <div className="px-4 py-2 bg-zinc-950 rounded-xl text-center">
               <span className="block text-2xl font-black text-amber-500">{stats.late}</span>
               <span className="text-[9px] uppercase tracking-widest text-zinc-500 font-bold">Late</span>
             </div>
             <div className="px-4 py-2 bg-zinc-950 rounded-xl text-center">
               <span className="block text-2xl font-black text-red-500">{stats.absent}</span>
               <span className="text-[9px] uppercase tracking-widest text-zinc-500 font-bold">Out</span>
             </div>
          </div>
        </div>

        {/* SEARCH & FILTER */}
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500" size={20} />
          <input 
            type="text" 
            placeholder="Search by name or role..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-zinc-900 border border-zinc-800 text-white p-5 pl-12 rounded-2xl text-lg font-bold outline-none focus:border-blue-500 transition-colors"
          />
        </div>

        {/* CAST GRID */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredCast.map(actor => {
            const status = attendance[actor.id];
            const hasConflict = actor.conflicts.length > 0;
            
            return (
              <button
                key={actor.id}
                onClick={() => handleTap(actor.id)}
                className={`text-left p-5 rounded-2xl border-2 transition-all active:scale-95 select-none touch-manipulation ${
                  status === "present" ? "bg-green-500/10 border-green-500" :
                  status === "late" ? "bg-amber-500/10 border-amber-500" :
                  status === "absent" ? "bg-red-500/10 border-red-500" :
                  "bg-zinc-900 border-zinc-800 hover:border-zinc-700"
                }`}
              >
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <h3 className={`text-xl font-black tracking-tighter ${status === "pending" ? "text-white" : "text-white"}`}>
                      {actor.name}
                    </h3>
                    <p className="text-zinc-500 text-sm font-bold">{actor.role}</p>
                  </div>
                  
                  {/* STATUS ICON */}
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 border-2 ${
                    status === "present" ? "bg-green-500 text-zinc-950 border-green-400" :
                    status === "late" ? "bg-amber-500 text-zinc-950 border-amber-400" :
                    status === "absent" ? "bg-red-500 text-white border-red-400" :
                    "bg-zinc-800 border-zinc-700 text-zinc-600"
                  }`}>
                    {status === "present" && <Check size={24} strokeWidth={3} />}
                    {status === "late" && <Clock size={20} strokeWidth={3} />}
                    {status === "absent" && <X size={24} strokeWidth={3} />}
                  </div>
                </div>

                {/* CONFLICT WARNING */}
                {hasConflict && (
                  <div className="mt-4 bg-amber-500/20 text-amber-400 text-xs font-bold px-3 py-2 rounded-lg flex items-start gap-2">
                    <AlertTriangle size={14} className="shrink-0 mt-0.5" />
                    <span>{actor.conflicts}</span>
                  </div>
                )}
              </button>
            );
          })}
        </div>

      </div>
    </div>
  );
}