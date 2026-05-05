// app/components/production/CheckInKioskClient.tsx
"use client";

import React, { useState } from 'react';
import { Search, UserCheck, UserMinus, LogOut, Clock, CheckCircle2 } from 'lucide-react';
import { toggleAttendance } from '@/app/actions/attendance';

export default function CheckInKioskClient({ tenant, productionId, event, castList, initialAttendance }: any) {
    const [search, setSearch] = useState("");
    const [localAttendance, setLocalAttendance] = useState<any[]>(initialAttendance || []);
    const [processingId, setProcessingId] = useState<number | null>(null);

    // Filter cast list based on search (to quickly find kids in a 100-person cast)
    const filteredCast = castList.filter((c: any) => 
        c.name.toLowerCase().includes(search.toLowerCase())
    );

    // Get a student's current status for today's event
    const getStudentStatus = (personId: number) => {
        return localAttendance.find(a => a.personId === personId);
    };

    const handleAction = async (personId: number, action: "IN" | "OUT" | "ABSENT") => {
        setProcessingId(personId);
        
        const res = await toggleAttendance(tenant, productionId, personId, event.id, action);
        
        if (res.success) {
            // Optimistically update the UI so the Parent Monitor doesn't have to wait for a refresh
            const now = new Date().toISOString();
            setLocalAttendance(prev => {
                const existing = prev.find(p => p.personId === personId);
                if (existing) {
                    return prev.map(p => p.personId === personId ? {
                        ...p,
                        checkIn: action === "IN" ? now : p.checkIn,
                        checkOut: action === "OUT" ? now : p.checkOut,
                        status: action === "ABSENT" ? "Unexcused Absence" : "Present"
                    } : p);
                } else {
                    return [...prev, {
                        personId,
                        checkIn: action === "IN" ? now : null,
                        checkOut: action === "OUT" ? now : null,
                        status: action === "ABSENT" ? "Unexcused Absence" : "Present"
                    }];
                }
            });
        } else {
            alert("Failed to record attendance. Please try again.");
        }
        setProcessingId(null);
    };

    return (
        <div className="max-w-5xl mx-auto space-y-6 animate-in fade-in">
            
            {/* KIOSK HEADER */}
            <div className="bg-blue-600 rounded-3xl p-8 flex flex-col md:flex-row items-center justify-between gap-6 shadow-xl text-white">
                <div>
                    <div className="flex items-center gap-2 mb-2 justify-center md:justify-start">
                        <span className="px-3 py-1 bg-white/20 rounded-full text-[10px] font-black uppercase tracking-widest backdrop-blur-md">
                            Live Kiosk Mode
                        </span>
                    </div>
                    <h1 className="text-4xl font-black uppercase italic tracking-tighter text-center md:text-left leading-none mb-1">
                        {event.name}
                    </h1>
                    <p className="text-blue-200 font-medium text-center md:text-left flex items-center justify-center md:justify-start gap-2">
                        <Clock size={16} /> {new Date(event.date).toLocaleDateString()} • {event.startTime} - {event.endTime}
                    </p>
                </div>

                <div className="relative w-full md:w-96">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-blue-300" size={24} />
                    <input 
                        type="text" 
                        placeholder="Search student name..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="w-full bg-blue-700/50 border-2 border-blue-400 rounded-2xl py-4 pl-14 pr-4 text-white placeholder:text-blue-300 font-bold text-lg outline-none focus:border-white transition-all shadow-inner"
                    />
                </div>
            </div>

            {/* THE CAST GRID */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredCast.map((actor: any) => {
                    const statusRecord = getStudentStatus(actor.personId);
                    const isCheckedIn = !!statusRecord?.checkIn;
                    const isCheckedOut = !!statusRecord?.checkOut;
                    const isAbsent = statusRecord?.status === "Unexcused Absence";
                    const isProcessing = processingId === actor.personId;

                    return (
                        <div key={actor.personId} className="bg-zinc-900 border border-white/5 rounded-2xl p-4 flex flex-col justify-between shadow-lg">
                            <div className="flex items-center gap-3 mb-4">
                                <div className={`w-12 h-12 rounded-full flex items-center justify-center shrink-0 border-2 ${
                                    isAbsent ? "bg-red-500/20 border-red-500 text-red-500" :
                                    isCheckedOut ? "bg-zinc-800 border-zinc-600 text-zinc-500" :
                                    isCheckedIn ? "bg-emerald-500/20 border-emerald-500 text-emerald-500" :
                                    "bg-blue-500/10 border-blue-500/30 text-blue-400"
                                }`}>
                                    {isAbsent ? <UserMinus size={24} /> : <UserCheck size={24} />}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <h3 className="text-lg font-black text-white truncate">{actor.name}</h3>
                                    <p className="text-[10px] font-bold uppercase tracking-widest truncate text-zinc-500">
                                        {actor.role}
                                    </p>
                                </div>
                            </div>

                            {/* TOUCH ACTIONS */}
                            <div className="grid grid-cols-2 gap-2 mt-auto">
                                {!isCheckedIn && !isAbsent && (
                                    <>
                                        <button 
                                            onClick={() => handleAction(actor.personId, "IN")}
                                            disabled={isProcessing}
                                            className="col-span-2 py-4 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-black text-sm uppercase tracking-widest active:scale-95 transition-all shadow-lg flex justify-center items-center gap-2 disabled:opacity-50"
                                        >
                                            <UserCheck size={18} /> Tap In
                                        </button>
                                        <button 
                                            onClick={() => handleAction(actor.personId, "ABSENT")}
                                            disabled={isProcessing}
                                            className="col-span-2 py-3 mt-1 bg-zinc-950 border border-zinc-800 hover:border-red-500 text-zinc-500 hover:text-red-500 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all"
                                        >
                                            Mark Absent
                                        </button>
                                    </>
                                )}

                                {isCheckedIn && !isCheckedOut && !isAbsent && (
                                    <button 
                                        onClick={() => handleAction(actor.personId, "OUT")}
                                        disabled={isProcessing}
                                        className="col-span-2 py-4 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-black text-sm uppercase tracking-widest active:scale-95 transition-all shadow-lg flex justify-center items-center gap-2 disabled:opacity-50"
                                    >
                                        <LogOut size={18} /> Tap Out
                                    </button>
                                )}

                                {isCheckedOut && (
                                    <div className="col-span-2 py-4 bg-zinc-950 border border-zinc-800 text-zinc-500 rounded-xl font-black text-sm uppercase tracking-widest text-center flex justify-center items-center gap-2">
                                        <CheckCircle2 size={18} /> Checked Out
                                    </div>
                                )}

                                {isAbsent && (
                                    <div className="col-span-2 py-4 bg-red-500/10 border border-red-500/30 text-red-500 rounded-xl font-black text-sm uppercase tracking-widest text-center flex flex-col justify-center items-center gap-1">
                                        <UserMinus size={18} />
                                        <span className="text-[10px]">Absent</span>
                                    </div>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}