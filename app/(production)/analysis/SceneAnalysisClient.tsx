"use client";

import React, { useState } from 'react';
import { Save, CheckCircle2, AlertCircle } from 'lucide-react';
import { useRouter } from 'next/navigation';

export default function SceneAnalysisClient({ scenes }: { scenes: any[] }) {
  const router = useRouter();
  const [localScenes, setLocalScenes] = useState(scenes);
  const [saving, setSaving] = useState(false);
  
  // Track changes so we only save what changed
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
    setSaving(true);
    
    // In a real app, use Promise.all to save all dirty rows
    // For now, we simulate the save delay
    // await Promise.all(Array.from(dirtyIds).map(id => updateSceneBaserow(id, ...)))
    
    setTimeout(() => {
        setSaving(false);
        setDirtyIds(new Set());
        // Move to next step?
        // router.push('/scheduler'); 
    }, 1500);
  };

  return (
    <div className="flex-1 overflow-y-auto custom-scrollbar p-8">
      
      {/* Sticky Save Bar */}
      <div className={`fixed bottom-8 right-8 z-50 transition-all ${dirtyIds.size > 0 ? 'translate-y-0 opacity-100' : 'translate-y-20 opacity-0'}`}>
         <button 
           onClick={saveChanges}
           disabled={saving}
           className="bg-blue-600 hover:bg-blue-500 text-white px-6 py-3 rounded-full font-bold shadow-2xl flex items-center gap-3"
         >
           {saving ? (
             <span className="animate-pulse">Saving...</span> 
           ) : (
             <>
               <Save size={18} /> Save {dirtyIds.size} Updates
             </>
           )}
         </button>
      </div>

      <div className="max-w-5xl mx-auto space-y-12 pb-24">
        
        {/* Intro Card */}
        <div className="bg-zinc-900 border border-white/10 rounded-xl p-6 flex gap-4">
           <AlertCircle className="text-blue-500 shrink-0" />
           <div>
              <h3 className="font-bold text-white">How this works</h3>
              <p className="text-zinc-400 text-sm mt-1">
                Drag the sliders to estimate the teaching difficulty for each scene (0-5). 
                <br/>
                <strong>0 = None</strong> (e.g. no music), <strong>5 = Extreme</strong> (e.g. full company tap number).
                <br/>
                This data populates the Dashboard Burn-up Chart.
              </p>
           </div>
        </div>

        {/* The Grid */}
        <div className="grid grid-cols-1 gap-4">
           {localScenes.map((scene) => (
             <div key={scene.id} className="bg-zinc-900/50 border border-white/5 p-6 rounded-xl hover:border-white/10 transition-colors">
                <div className="flex justify-between items-start mb-6">
                    <div>
                        <span className="text-xs font-mono text-zinc-500">#{scene.order}</span>
                        <h3 className="text-lg font-bold text-white">{scene.name}</h3>
                        <span className="text-xs uppercase font-bold text-zinc-600">{scene.type}</span>
                    </div>
                    {dirtyIds.has(scene.id) && <span className="text-[10px] text-amber-500 font-bold uppercase tracking-wider">Unsaved</span>}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                    {/* MUSIC SLIDER */}
                    <Slider 
                        label="Music" 
                        value={scene.load.music} 
                        color="bg-blue-600"
                        onChange={(v: number) => handleUpdate(scene.id, 'music', v)}
                    />
                    {/* DANCE SLIDER */}
                    <Slider 
                        label="Dance" 
                        value={scene.load.dance} 
                        color="bg-purple-600"
                        onChange={(v: number) => handleUpdate(scene.id, 'dance', v)}
                    />
                    {/* BLOCK SLIDER */}
                    <Slider 
                        label="Blocking" 
                        value={scene.load.block} 
                        color="bg-emerald-600"
                        onChange={(v: number) => handleUpdate(scene.id, 'block', v)}
                    />
                </div>
             </div>
           ))}
        </div>

        <div className="text-center py-12">
            <button 
                onClick={() => router.push('/dashboard')} 
                className="text-zinc-500 hover:text-white underline underline-offset-4 text-sm"
            >
                Skip setup and go to Dashboard &rarr;
            </button>
        </div>

      </div>
    </div>
  );
}

// Reusable Slider Component
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
                type="range" 
                min="0" 
                max="5" 
                step="1"
                value={value}
                onChange={(e) => onChange(parseInt(e.target.value))}
                className={`w-full h-2 rounded-lg appearance-none cursor-pointer bg-zinc-800 accent-${color.replace('bg-', '')}`}
                style={{
                    background: `linear-gradient(to right, var(--tw-color-${color.replace('bg-', '')}-500) 0%, var(--tw-color-${color.replace('bg-', '')}-500) ${(value/5)*100}%, #27272a ${(value/5)*100}%, #27272a 100%)`
                }}
            />
            <div className="flex justify-between mt-1 px-1">
                {[0,1,2,3,4,5].map(n => (
                    <div key={n} className="w-px h-1 bg-zinc-800" />
                ))}
            </div>
        </div>
    );
}