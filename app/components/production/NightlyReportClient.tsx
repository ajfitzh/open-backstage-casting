"use client";

import React, { useState } from 'react';
import { Send, Users, Mic, BookOpen, AlertTriangle, CheckCircle2, XCircle } from 'lucide-react';
import { sendNightlyReport } from '@/app/actions/reports'; // 🟢 Import the new action

export default function NightlyReportClient({ todayEvent, attendance, scenesWorked, castEmails }: any) {
    const [directorNotes, setDirectorNotes] = useState("");
    const [isSending, setIsSending] = useState(false);
    const [sent, setSent] = useState(false);
    const [errorMsg, setErrorMsg] = useState(""); // 🟢 New error state

    // Calculate today's metrics
    const absences = attendance.filter((a: any) => a.status === "Unexcused Absence" || a.status === "Excused");
    
    const handleSendReport = async () => {
        setIsSending(true);
        setErrorMsg("");

        // 🟢 Actually call the server action with the real data
        const result = await sendNightlyReport({
            emails: castEmails,
            eventName: todayEvent?.name || "Today's Rehearsal",
            date: new Date().toLocaleDateString(),
            absences: absences.map((a: any) => ({ name: a.name, status: a.status })),
            scenes: scenesWorked || [],
            notes: directorNotes
        });

        if (result.success) {
            setSent(true);
        } else {
            setErrorMsg(result.error || "Failed to send the report.");
        }
        
        setIsSending(false);
    };

    if (sent) {
        return (
            <div className="bg-emerald-900/20 border border-emerald-500/30 rounded-3xl p-12 text-center animate-in zoom-in-95">
                <CheckCircle2 size={48} className="text-emerald-500 mx-auto mb-4" />
                <h2 className="text-2xl font-black text-white tracking-tighter mb-2">Report Sent!</h2>
                <p className="text-emerald-400/80 font-medium">The nightly summary has been emailed to {castEmails.length} cast and crew members.</p>
            </div>
        );
    }

    return (
        <div className="bg-zinc-900 border border-white/5 rounded-3xl p-6 sm:p-8 shadow-xl max-w-4xl mx-auto space-y-8">
            <div>
                <h2 className="text-2xl font-black text-white tracking-tighter flex items-center gap-2 mb-1">
                    <BookOpen className="text-blue-500" /> Director&apos;s Nightly Report
                </h2>
                <p className="text-sm font-bold text-zinc-500 uppercase tracking-widest">
                    {todayEvent?.name || "Today's Rehearsal"} • {new Date().toLocaleDateString()}
                </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Panel 1: Auto-Generated Data */}
                <div className="space-y-6">
                    <div className="bg-zinc-950 border border-white/5 rounded-2xl p-5">
                        <h3 className="text-[10px] font-black uppercase tracking-widest text-zinc-500 mb-3 flex items-center gap-2">
                            <Users size={14} className="text-emerald-500" /> Today&apos;s Absences
                        </h3>
                        {absences.length === 0 ? (
                            <p className="text-sm font-bold text-emerald-400">Perfect attendance today!</p>
                        ) : (
                            <ul className="space-y-2">
                                {absences.map((a: any, i: number) => (
                                    <li key={i} className="flex items-center justify-between text-sm">
                                        <span className="font-bold text-white">{a.name}</span>
                                        <span className="text-[10px] uppercase font-black text-amber-500 bg-amber-500/10 px-2 py-0.5 rounded">{a.status}</span>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </div>

                    <div className="bg-zinc-950 border border-white/5 rounded-2xl p-5">
                        <h3 className="text-[10px] font-black uppercase tracking-widest text-zinc-500 mb-3 flex items-center gap-2">
                            <Mic size={14} className="text-purple-500" /> Scenes Worked
                        </h3>
                        {scenesWorked?.length === 0 ? (
                            <p className="text-sm text-zinc-500">No scenes explicitly scheduled for today.</p>
                        ) : (
                            <div className="flex flex-wrap gap-2">
                                {scenesWorked?.map((scene: string, i: number) => (
                                    <span key={i} className="text-xs font-bold text-white bg-purple-500/20 border border-purple-500/30 px-3 py-1 rounded-lg">
                                        {scene}
                                    </span>
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                {/* Panel 2: Director's Input */}
                <div className="bg-zinc-950 border border-white/5 rounded-2xl p-5 flex flex-col">
                    <h3 className="text-[10px] font-black uppercase tracking-widest text-zinc-500 mb-3 flex items-center gap-2">
                        <AlertTriangle size={14} className="text-blue-500" /> Rehearsal Notes & Homework
                    </h3>
                    <textarea 
                        value={directorNotes}
                        onChange={(e) => setDirectorNotes(e.target.value)}
                        placeholder="E.g., Great energy today! Ensemble, please review the harmony in measure 45. Leads, be off-book for Act 1 by Thursday."
                        className="flex-1 w-full bg-zinc-900 border border-zinc-800 rounded-xl p-4 text-sm text-zinc-300 outline-none focus:border-blue-500 resize-none min-h-[150px]"
                    />
                </div>
            </div>

            {/* 🟢 Render error message if the send fails */}
            {errorMsg && (
                <div className="bg-red-500/10 border border-red-500/30 text-red-400 p-4 rounded-xl flex items-center gap-2 text-sm font-medium">
                    <XCircle size={16} /> {errorMsg}
                </div>
            )}

            <button 
                onClick={handleSendReport}
                disabled={isSending || !directorNotes.trim() || castEmails?.length === 0}
                className="w-full py-4 bg-blue-600 hover:bg-blue-500 disabled:bg-zinc-800 disabled:text-zinc-500 text-white rounded-xl font-black text-xs uppercase tracking-widest transition-all flex items-center justify-center gap-2 shadow-xl active:scale-95"
            >
                {isSending ? "Compiling Report..." : "Send Nightly Summary to Cast"} <Send size={16} />
            </button>
        </div>
    );
}