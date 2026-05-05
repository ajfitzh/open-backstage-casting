"use client";

import React from 'react';
import { Download, Scissors, AlertCircle } from 'lucide-react';

export default function CostumePullSheet({ castWithMeasurements, showTitle }: any) {
    
    // Quick validation to see who is missing measurements
    const missingCount = castWithMeasurements.filter((c: any) => !c.height).length;

    const handleExportCSV = () => {
        const headers = ["Name", "Role", "Height", "Chest", "Waist", "Inseam", "Shoe Size"];
        const rows = castWithMeasurements.map((c: any) => [
            `"${c.name}"`, 
            `"${c.role}"`, 
            c.height || "MISSING", 
            c.chest || "-", 
            c.waist || "-", 
            c.inseam || "-", 
            c.shoeSize || "-"
        ]);

        const csvContent = [headers.join(","), ...rows.map((r: any) => r.join(","))].join("\n");
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.setAttribute("href", url);
        link.setAttribute("download", `${showTitle.replace(/\s+/g, '_')}_Costume_Pull_Sheet.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    return (
        <div className="bg-zinc-900 border border-white/5 rounded-3xl p-6 sm:p-8 shadow-xl">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4 mb-6">
                <div>
                    <h2 className="text-2xl font-black text-white tracking-tighter flex items-center gap-2 mb-1">
                        <Scissors className="text-pink-500" /> Costume Pull Sheet
                    </h2>
                    <p className="text-sm font-bold text-zinc-500 uppercase tracking-widest">{showTitle}</p>
                </div>
                
                <button 
                    onClick={handleExportCSV}
                    className="px-6 py-3 bg-pink-600 hover:bg-pink-500 text-white rounded-xl font-black text-xs uppercase tracking-widest shadow-xl transition-all flex items-center gap-2 active:scale-95"
                >
                    <Download size={16} /> Export CSV
                </button>
            </div>

            {missingCount > 0 && (
                <div className="bg-amber-500/10 border border-amber-500/30 rounded-2xl p-4 flex items-center gap-3 mb-6">
                    <AlertCircle className="text-amber-500 shrink-0" size={18} />
                    <p className="text-xs font-bold text-amber-500">
                        Warning: {missingCount} cast members have not submitted their measurements in the Family Hub.
                    </p>
                </div>
            )}

            <div className="overflow-x-auto rounded-2xl border border-white/5 bg-zinc-950">
                <table className="w-full text-left text-sm text-zinc-300">
                    <thead className="bg-black/40 text-[10px] font-black uppercase tracking-widest text-zinc-500">
                        <tr>
                            <th className="px-6 py-4">Actor</th>
                            <th className="px-6 py-4">Role</th>
                            <th className="px-6 py-4">Height</th>
                            <th className="px-6 py-4">Chest</th>
                            <th className="px-6 py-4">Waist</th>
                            <th className="px-6 py-4">Inseam</th>
                            <th className="px-6 py-4">Shoe</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                        {castWithMeasurements.map((actor: any, idx: number) => (
                            <tr key={idx} className="hover:bg-white/[0.02] transition-colors">
                                <td className="px-6 py-4 font-bold text-white whitespace-nowrap">{actor.name}</td>
                                <td className="px-6 py-4 text-pink-400 font-medium whitespace-nowrap">{actor.role}</td>
                                <td className={`px-6 py-4 font-mono ${!actor.height ? 'text-red-500 font-bold' : ''}`}>
                                    {actor.height ? `${actor.height}"` : 'Missing'}
                                </td>
                                <td className="px-6 py-4 font-mono">{actor.chest || '-'}</td>
                                <td className="px-6 py-4 font-mono">{actor.waist || '-'}</td>
                                <td className="px-6 py-4 font-mono">{actor.inseam || '-'}</td>
                                <td className="px-6 py-4 font-mono">{actor.shoeSize || '-'}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}