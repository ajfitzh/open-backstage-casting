"use client";

import React, { useState, useTransition } from 'react';
import { updateSceneStatus } from '@/app/lib/actions'; 
import { Search, Loader2 } from 'lucide-react';

export default function DashboardClient({ scenes, demographics }: any) {
  const [filter, setFilter] = useState('');
  
  // Filter scenes based on search
  const filteredScenes = scenes.filter((s: any) => 
    s.name.toLowerCase().includes(filter.toLowerCase()) || 
    s.id.toString().includes(filter)
  );

  return (
    <div className="space-y-6">
       
       {/* 1. SEARCH BAR */}
       <div className="flex gap-4 mb-6">
          <div className="relative flex-1">
             <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500" size={18} />
             <input 
               type="text" 
               placeholder="Search scenes..." 
               value={filter}
               onChange={(e) => setFilter(e.target.value)}
               className="w-full bg-zinc-900 border border-white/10 rounded-xl py-3 pl-12 pr-4 text-white focus:outline-none focus:border-blue-500 transition-colors"
             />
          </div>
       </div>

       {/* 2. THE SCENE LIST */}
       <div className="bg-zinc-900/50 border border-white/5 rounded-2xl overflow-hidden">
          <table className="w-full text-left border-collapse">
             <thead>
                <tr className="border-b border-white/5 text-xs font-black text-zinc-500 uppercase tracking-widest">
                   <th className="p-4 w-16 text-center">#</th>
                   <th className="p-4">Scene Name</th>
                   <th className="p-4 text-center w-32">Music</th>
                   <th className="p-4 text-center w-32">Dance</th>
                   <th className="p-4 text-center w-32">Block</th>
                </tr>
             </thead>
             <tbody className="divide-y divide-white/5">
                {filteredScenes.map((scene: any) => (
                   <SceneRow key={scene.id} scene={scene} />
                ))}
             </tbody>
          </table>
          
          {filteredScenes.length === 0 && (
             <div className="p-12 text-center text-zinc-500">No scenes found matching &ldquo;{filter}&ldquo;</div>
          )}
       </div>
    </div>
  );
}

// --- SUB-COMPONENT: ROW & CLICK LOGIC ---

function SceneRow({ scene }: any) {
  
  // Helper to render a clickable status dot
  const StatusCell = ({ type, value, load }: any) => {
    let [isPending, startTransition] = useTransition();

    // If load is 0 (e.g., No Dance in this scene), show nothing
    if (load === 0) return <div className="text-zinc-800">-</div>;

    // Cycle Logic: New -> Draft -> Polished -> New
    const getNextStatus = (current: string) => {
       if (!current || current === 'New') return 'Draft';
       if (current === 'Draft') return 'Polished';
       return 'New';
    };

    // Color Logic
    const getColor = (status: string) => {
       if (status === 'Polished') return 'bg-emerald-500 text-emerald-950 shadow-[0_0_15px_rgba(16,185,129,0.4)]';
       if (status === 'Draft') return 'bg-amber-500 text-amber-950 shadow-[0_0_15px_rgba(245,158,11,0.2)]';
       return 'bg-zinc-800 text-zinc-500 hover:bg-zinc-700'; // "New"
    };

    const label = value || "New";

    return (
       <button 
         disabled={isPending}
         onClick={() => startTransition(() => updateSceneStatus(scene.id, type, getNextStatus(value)))}
         className={`
            w-24 py-1.5 rounded-full text-[10px] font-black uppercase tracking-wider transition-all transform active:scale-95
            flex items-center justify-center gap-2
            ${getColor(value)}
            ${isPending ? 'opacity-50 cursor-not-allowed' : ''}
         `}
       >
         {isPending ? <Loader2 size={10} className="animate-spin" /> : label}
       </button>
    );
  };

  return (
    <tr className="hover:bg-white/[0.02] transition-colors group">
       <td className="p-4 text-center font-mono text-zinc-600 text-xs">{scene.order}</td>
       <td className="p-4">
          <div className="font-bold text-white group-hover:text-blue-200 transition-colors">{scene.name}</div>
          <div className="text-[10px] text-zinc-500 uppercase font-bold tracking-wider">{scene.pages ? `p. ${scene.pages}` : ''}</div>
       </td>
       <td className="p-4 text-center flex justify-center"><StatusCell type="music" value={scene.status.music} load={scene.load.music} /></td>
       <td className="p-4 text-center"><div className="flex justify-center"><StatusCell type="dance" value={scene.status.dance} load={scene.load.dance} /></div></td>
       <td className="p-4 text-center"><div className="flex justify-center"><StatusCell type="block" value={scene.status.block} load={scene.load.block} /></div></td>
    </tr>
  );
}