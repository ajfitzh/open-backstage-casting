"use client";

import React, { useState } from 'react';
import { Save, AlertCircle, ArrowLeft } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { updateSceneLoads } from '@/app/lib/actions'; 
import Link from 'next/link';

export default function SceneAnalysisClient({ scenes }: { scenes: any[] }) {
  const router = useRouter();
  const [localScenes, setLocalScenes] = useState(scenes);
  const [saving, setSaving] = useState(false);
  const [dirtyIds, setDirtyIds] = useState<Set<number>>(new Set());

  const handleUpdate = (id: number, type: 'music' | 'dance' | 'block', value: number) => {
    setLocalScenes(prev => prev.map(s => {
        if (s.id !== id) return s;
        return {
            ...s,
            load: { ...s.load, [type]: value }
        };
    }));
    setDirtyIds(prev => new Set(prev).add(id));
  };

  const saveChanges = async () => {
    if (dirtyIds.size === 0) return;
    setSaving(true);
    
    // Filter updates
    const updates = localScenes
      .filter(s => dirtyIds.has(s.id))
      .map(s => ({ id: s.id, load: s.load }));

    await updateSceneLoads(updates);
    
    setSaving(false);
    setDirtyIds(new Set());
    router.refresh();
  };

  return (
    <div className="flex-1 overflow-y-auto custom-scrollbar p-8 pb-32">
      
      {/* Sticky Save Bar */}
      <div className={`fixed bottom-8 right-8 z-50 transition-all duration-300 ${dirtyIds.size > 0 ? 'translate-y-0 opacity-100' : 'translate-y-20 opacity-0'}`}>
         <button 
           onClick={saveChanges}
           disabled={saving}
           className={`px-6 py-3 rounded-full font-bold shadow-2xl flex items-center gap-3 transition-colors ${saving ? 'bg-zinc-700 text-zinc-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-500 text-white'}`}
         >
           {saving ? (
             <>
               <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
               Saving...
             </>
           ) : (
             <>
               <Save size={18} /> Save {dirtyIds.size} Updates
             </>
           )}
         </button>
      </div>

      <div className="max-w-5xl mx-auto space-y-8">
        <Link href="/" className="flex items-center gap-2 text-zinc-500 hover:text-white transition-colors text-sm font-bold mb-4">
            <ArrowLeft size={16} /> Back to Dashboard
        </Link>

        {/* Intro Card */}
        <div className="bg-zinc-900 border border-white/10 rounded-xl p-6 flex gap-4">
           <AlertCircle className="text-blue-500 shrink-0" />
           <div>
              <h3 className="font-bold text-white">Calibration Mode</h3>
              <p className="text-zinc-400 text-sm mt-1">
                Drag the sliders (0-5) to estimate the teaching difficulty for each scene. 
                This data powers the &ldquo;Show Readiness&quot; burn-up chart on your dashboard.
              </p>
           </div>
        </div>

        {/* The Grid */}
        <div className="grid grid-cols-1 gap-4">
           {localScenes.map((scene) => (
             <div key={scene.id} className={`bg-zinc-900/50 border p-6 rounded-xl transition-all ${dirtyIds.has(scene.id) ? 'border-blue-500/30 bg-blue-500/5' : 'border-white/5 hover:border-white/10'}`}>
                <div className="flex justify-between items-start mb-6">
                    <div>
                        <span className="text-xs font-mono text-zinc-500">#{scene.order}</span>
                        <h3 className="text-lg font-bold text-white">{scene.name}</h3>
                        <span className="text-xs uppercase font-bold text-zinc-600">{scene.type}</span>
                    </div>
                    {dirtyIds.has(scene.id) && (
                        <div className="flex items-center gap-1.5 text-[10px] text-blue-400 font-bold uppercase tracking-wider bg-blue-500/10 px-2 py-1 rounded">
                            <div className="w-1.5 h-1.5 bg-blue-400 rounded-full animate-pulse" />
                            Unsaved
                        </div>
                    )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                    <Slider label="Music" value={scene.load.music} color="bg-blue-600" onChange={(v:number) => handleUpdate(scene.id, 'music', v)} />
                    <Slider label="Dance" value={scene.load.dance} color="bg-purple-600" onChange={(v:number) => handleUpdate(scene.id, 'dance', v)} />
                    <Slider label="Blocking" value={scene.load.block} color="bg-emerald-600" onChange={(v:number) => handleUpdate(scene.id, 'block', v)} />
                </div>
             </div>
           ))}
        </div>
      </div>
    </div>
  );
}

function Slider({ label, value, color, onChange }: any) {
    const descriptions = ["None", "Very Easy", "Easy", "Moderate", "Hard", "Complex"];
    return (
        <div>
            <div className="flex justify-between mb-2">
                <span className="text-xs font-bold text-zinc-400 uppercase tracking-wider">{label}</span>
                <span className={`text-xs font-bold ${value > 0 ? 'text-white' : 'text-zinc-600'}`}>
                    {value} - {descriptions[value]}
                </span>
            </div>
            <input 
                type="range" min="0" max="5" step="1" value={value}
                onChange={(e) => onChange(parseInt(e.target.value))}
                className={`w-full h-2 rounded-lg appearance-none cursor-pointer bg-zinc-800 accent-${color.replace('bg-', '')}`}
                style={{ background: `linear-gradient(to right, var(--tw-color-${color.replace('bg-', '')}-500) 0%, var(--tw-color-${color.replace('bg-', '')}-500) ${(value/5)*100}%, #27272a ${(value/5)*100}%, #27272a 100%)` }}
            />
        </div>
    );
}