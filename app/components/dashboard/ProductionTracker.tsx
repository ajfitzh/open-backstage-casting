"use client";

import React, { useMemo } from 'react';
import { Check, Circle, Minus } from 'lucide-react';

export default function ProductionTracker({ scenes }: { scenes: any[] }) {

  // --- 📊 ANALYTICS ENGINE (WEIGHTED) ---
  const stats = useMemo(() => {
    let totalPoints = 0;
    let earnedPoints = 0;
    
    scenes.forEach(scene => {
      // 1. MUSIC
      if (scene.load.music > 0) {
        totalPoints += scene.load.music; 
        if (scene.status.music === 'polished' || scene.status.music === 'done') earnedPoints += scene.load.music;
        else if (scene.status.music === 'draft') earnedPoints += (scene.load.music * 0.5);
      }

      // 2. DANCE
      if (scene.load.dance > 0) {
        totalPoints += scene.load.dance;
        if (scene.status.dance === 'polished' || scene.status.dance === 'done') earnedPoints += scene.load.dance;
        else if (scene.status.dance === 'draft') earnedPoints += (scene.load.dance * 0.5);
      }

      // 3. BLOCKING
      if (scene.load.block > 0) {
        totalPoints += scene.load.block;
        if (scene.status.block === 'polished' || scene.status.block === 'done') earnedPoints += scene.load.block;
        else if (scene.status.block === 'draft') earnedPoints += (scene.load.block * 0.5);
      }
    });

    const percent = totalPoints > 0 ? Math.round((earnedPoints / totalPoints) * 100) : 0;
    
    // Velocity Estimate (e.g., 4 points per week)
    const remaining = totalPoints - earnedPoints;
    const velocity = 3.8; 
    const weeksLeft = Math.ceil(remaining / velocity);

    return { percent, weeksLeft, earnedPoints, totalPoints, velocity };
  }, [scenes]);

  return (
    <div className="space-y-6">
      
      {/* 📈 BURN-UP HEADER */}
      <div className="bg-zinc-900 border border-white/10 rounded-xl p-6 flex flex-col md:flex-row items-center justify-between gap-6">
        
        {/* Progress Circle */}
        <div className="flex items-center gap-6">
            <div className="relative w-20 h-20 flex items-center justify-center">
                <svg className="w-full h-full -rotate-90" viewBox="0 0 36 36">
                    <path className="text-zinc-800" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="currentColor" strokeWidth="4" />
                    <path className="text-blue-500 transition-all duration-1000 ease-out" strokeDasharray={`${stats.percent}, 100`} d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="currentColor" strokeWidth="4" />
                </svg>
                <span className="absolute text-xl font-bold text-white">{stats.percent}%</span>
            </div>
            <div>
                <h3 className="text-lg font-bold text-white">Show Readiness</h3>
                <p className="text-sm text-zinc-400">
                    Velocity: <span className="text-white font-mono">{stats.velocity} pts/wk</span>
                </p>
                <p className="text-xs text-zinc-500 mt-1">Est. Completion: {stats.weeksLeft} weeks</p>
            </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 gap-8 text-center border-l border-white/10 pl-8">
            <div>
                <div className="text-2xl font-black text-white">{stats.earnedPoints} <span className="text-zinc-600 text-lg">/ {stats.totalPoints}</span></div>
                <div className="text-[10px] uppercase font-bold text-zinc-500 tracking-wider">Total Effort Points</div>
            </div>
            <div>
                <div className="text-2xl font-black text-emerald-400">Wk {8 + stats.weeksLeft}</div>
                <div className="text-[10px] uppercase font-bold text-zinc-500 tracking-wider">Target Finish</div>
            </div>
        </div>
      </div>

      {/* 📋 TRACKER TABLE */}
      <div className="bg-zinc-900 border border-white/10 rounded-xl overflow-hidden">
        <table className="w-full text-left text-sm">
          <thead className="bg-zinc-950 border-b border-white/10 text-xs uppercase font-black text-zinc-500 tracking-wider">
            <tr>
              <th className="p-4 w-12 text-center">#</th>
              <th className="p-4">Scene / Segment</th>
              <th className="p-4 w-32 text-center">Music</th>
              <th className="p-4 w-32 text-center">Dance</th>
              <th className="p-4 w-32 text-center">Block</th>
              <th className="p-4 w-24 text-center">Ready?</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {scenes.map((scene) => {
              // Row Readiness Check
              const isReady = ['music', 'dance', 'block'].every(k => 
                scene.status[k] === 'polished' || scene.status[k] === 'done' || scene.status[k] === 'n/a'
              );

              return (
                <tr key={scene.id} className="hover:bg-white/5 transition-colors">
                  <td className="p-4 text-center font-mono text-zinc-500">{scene.order}</td>
                  <td className="p-4">
                    <div className="font-bold text-zinc-200">{scene.name}</div>
                    <div className="text-[10px] uppercase font-bold text-zinc-500 mt-0.5">{scene.type}</div>
                  </td>
                  
                  {/* Status Cells with Difficulty Dots */}
                  <StatusCell status={scene.status.music} load={scene.load.music} />
                  <StatusCell status={scene.status.dance} load={scene.load.dance} />
                  <StatusCell status={scene.status.block} load={scene.load.block} />

                  {/* Ready Check */}
                  <td className="p-4 text-center">
                    <div className={`mx-auto w-6 h-6 rounded flex items-center justify-center transition-all ${isReady ? 'bg-emerald-500 text-zinc-900 shadow-[0_0_10px_rgba(16,185,129,0.5)]' : 'bg-zinc-800 text-zinc-600'}`}>
                        {isReady ? <Check size={14} strokeWidth={4} /> : <Circle size={8} fill="currentColor" className="opacity-20" />}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// Helper: Status Pill + Difficulty Dots
function StatusCell({ status, load }: { status: string, load: number }) {
    if (load === 0 && (status === 'n/a' || status === 'new')) {
        return <td className="p-4 text-center"><Minus size={12} className="text-zinc-800 mx-auto"/></td>;
    }

    const styles: any = {
        new: "bg-red-500/10 text-red-500 border-red-500/20",
        draft: "bg-amber-500/10 text-amber-500 border-amber-500/20",
        polished: "bg-emerald-500/10 text-emerald-500 border-emerald-500/20",
        done: "bg-emerald-500/10 text-emerald-500 border-emerald-500/20",
        "n/a": "bg-zinc-800 text-zinc-500 border-zinc-700"
    };

    const labels: any = {
        new: "New",
        draft: "Draft",
        polished: "Polished",
        done: "Done",
        "n/a": "N/A"
    };

    return (
        <td className="p-4 text-center align-middle">
            <div className="flex flex-col items-center gap-1.5">
                <span className={`px-2 py-0.5 rounded border text-[10px] font-black uppercase tracking-wider ${styles[status] || styles.new}`}>
                    {labels[status] || "New"}
                </span>
                
                {/* 🔵 Difficulty Dots (0-5) */}
                {load > 0 && (
                  <div className="flex gap-0.5" title={`Effort: ${load} pts`}>
                      {[...Array(5)].map((_, i) => (
                          <div key={i} className={`w-1 h-1 rounded-full ${i < load ? 'bg-blue-600' : 'bg-zinc-800'}`} />
                      ))}
                  </div>
                )}
            </div>
        </td>
    );
}