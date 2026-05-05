// app/components/reports/PlaybillExporterClient.tsx
"use client";

import React, { useState } from 'react';
import { BookOpen, Megaphone, ClipboardCopy, CheckCircle2, AlertCircle } from 'lucide-react';

export default function PlaybillExporterClient({ showTitle, castData }: any) {
    const [activeTab, setActiveTab] = useState<'bios' | 'ads'>('bios');
    const [copied, setCopied] = useState(false);

    // Filter to only show cast members who actually submitted something (or show missing)
    const submittedBios = castData.filter((c: any) => c.bio.trim().length > 0);
    const missingBios = castData.filter((c: any) => c.bio.trim().length === 0);
    
    const submittedAds = castData.filter((c: any) => c.ad.trim().length > 0);

    const handleCopyAll = () => {
        let exportText = "";

        if (activeTab === 'bios') {
            exportText = `${showTitle.toUpperCase()} - PROGRAM BIOS\n\n`;
            submittedBios.forEach((c: any) => {
                exportText += `${c.name.toUpperCase()} (${c.role})\n${c.bio}\n\n`;
            });
        } else {
            exportText = `${showTitle.toUpperCase()} - CONGRATS ADS\n\n`;
            submittedAds.forEach((c: any) => {
                exportText += `FOR: ${c.name.toUpperCase()}\n"${c.ad}"\n\n`;
            });
        }

        navigator.clipboard.writeText(exportText);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    return (
        <div className="max-w-6xl mx-auto space-y-8 animate-in fade-in">
            
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                <div>
                    <div className="flex items-center gap-3 mb-2">
                        <span className="text-[10px] font-black uppercase tracking-[0.2em] text-pink-500">Playbill Exporter</span>
                        <span className="w-1 h-1 rounded-full bg-zinc-700"></span>
                        <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">{showTitle}</span>
                    </div>
                    <h1 className="text-3xl lg:text-4xl font-black text-white uppercase italic tracking-tighter flex items-center gap-3">
                        <BookOpen className="text-pink-500" size={32} />
                        Program Content
                    </h1>
                </div>

                <button 
                    onClick={handleCopyAll}
                    className="px-6 py-3 bg-white text-black hover:bg-zinc-200 rounded-xl font-black text-xs uppercase tracking-widest shadow-xl transition-all flex items-center gap-2 active:scale-95"
                >
                    {copied ? <><CheckCircle2 size={16} className="text-emerald-500"/> Copied to Clipboard!</> : <><ClipboardCopy size={16}/> Copy All for InDesign</>}
                </button>
            </div>

            {/* Tabs */}
            <div className="flex gap-2 p-1 bg-zinc-900 border border-white/5 rounded-2xl w-fit">
                <button 
                    onClick={() => setActiveTab('bios')}
                    className={`px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all flex items-center gap-2 ${
                        activeTab === 'bios' ? 'bg-pink-600 text-white shadow-lg' : 'text-zinc-500 hover:text-white hover:bg-zinc-800'
                    }`}
                >
                    <BookOpen size={14} /> Actor Bios ({submittedBios.length})
                </button>
                <button 
                    onClick={() => setActiveTab('ads')}
                    className={`px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all flex items-center gap-2 ${
                        activeTab === 'ads' ? 'bg-purple-600 text-white shadow-lg' : 'text-zinc-500 hover:text-white hover:bg-zinc-800'
                    }`}
                >
                    <Megaphone size={14} /> Congrats Ads ({submittedAds.length})
                </button>
            </div>

            {/* Bios View */}
            {activeTab === 'bios' && (
                <div className="space-y-6">
                    {missingBios.length > 0 && (
                        <div className="bg-amber-500/10 border border-amber-500/30 rounded-2xl p-5 flex items-start gap-4">
                            <AlertCircle className="text-amber-500 shrink-0 mt-0.5" size={20} />
                            <div>
                                <h3 className="text-sm font-black uppercase tracking-widest text-amber-500 mb-1">Missing Bios ({missingBios.length})</h3>
                                <p className="text-xs text-amber-500/80 font-medium">The following actors have not submitted their bios via the Family Hub: {missingBios.map((c:any) => c.name).join(", ")}.</p>
                            </div>
                        </div>
                    )}

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {submittedBios.map((actor: any) => {
                            const wordCount = actor.bio.trim().split(/\s+/).length;
                            return (
                                <div key={actor.id} className="bg-zinc-900 border border-white/5 rounded-2xl p-6 flex flex-col">
                                    <div className="mb-4">
                                        <h3 className="text-lg font-black text-white tracking-tighter leading-none mb-1">{actor.name}</h3>
                                        <p className="text-[10px] font-bold text-pink-500 uppercase tracking-widest">{actor.role}</p>
                                    </div>
                                    <div className="flex-1 bg-zinc-950 rounded-xl p-4 border border-zinc-800/50">
                                        <p className="text-sm text-zinc-300 leading-relaxed">{actor.bio}</p>
                                    </div>
                                    <div className="mt-4 text-[10px] font-black uppercase tracking-widest text-zinc-500 text-right">
                                        <span className={wordCount > 100 ? "text-red-400" : ""}>{wordCount} Words</span>
                                    </div>
                                </div>
                            )
                        })}
                    </div>
                </div>
            )}

            {/* Congrats Ads View */}
            {activeTab === 'ads' && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {submittedAds.map((actor: any) => (
                        <div key={actor.id} className="bg-zinc-900 border border-white/5 rounded-2xl p-6 flex flex-col">
                            <div className="mb-4">
                                <h3 className="text-[10px] font-bold text-purple-500 uppercase tracking-widest mb-1">Ad For:</h3>
                                <p className="text-lg font-black text-white tracking-tighter leading-none">{actor.name}</p>
                            </div>
                            <div className="flex-1 bg-purple-900/10 rounded-xl p-4 border border-purple-500/20">
                                <p className="text-sm text-purple-100 italic leading-relaxed">&ldquo;{actor.ad}&rdquo;</p>
                            </div>
                        </div>
                    ))}
                    
                    {submittedAds.length === 0 && (
                        <div className="col-span-full py-20 text-center text-zinc-500 font-bold uppercase tracking-widest">
                            No Congrats Ads Submitted Yet
                        </div>
                    )}
                </div>
            )}

        </div>
    );
}