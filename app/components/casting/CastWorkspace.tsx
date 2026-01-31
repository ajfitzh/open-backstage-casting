/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { Plus, Trash2, X, Copy } from "lucide-react";

interface Props {
  roles: any[];
  scenes: any[];
  onAddRole: () => void;
  onRemoveRole: (id: string) => void;
  onDuplicateRole: (id: string) => void;
  onDropActor: (e: React.DragEvent, roleId: string) => void;
  onRemoveActor: (roleId: string, actorId: number) => void;
  onToggleScene: (roleId: string, sceneId: number) => void;
  onSelectRole: (role: any) => void;
  onConfirmRole: (roleId: string, actorId: number) => void;
}

export default function CastWorkspace({ 
  roles, scenes, onAddRole, onRemoveRole, onDuplicateRole, onDropActor, onRemoveActor, onToggleScene, onSelectRole, onConfirmRole 
}: Props) {

  // 🛡️ REFACTORED: Use cleaner mapping for scene properties
  // Assuming your scenes come from a 'getScenes' that maps IDs to these keys
// 🛡️ REFACTORED HELPERS
const getSceneName = (scene: any) => {
  const val = scene.name || scene["Scene Name"];
  return typeof val === 'object' ? val.value : (val || "Untitled Scene");
};

const getSceneType = (scene: any) => {
  const val = scene.type || scene["Scene Type"];
  // If Baserow returns a Select object, grab the .value
  return typeof val === 'object' ? val.value : (val || "Scene");
};

const getSceneAct = (scene: any) => {
  const val = scene.act || scene.Act;
  return typeof val === 'object' ? val.value : (val || "");
};
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  };

  const getSceneColor = (type: string) => {
    const t = String(type).toLowerCase();
    if (t.includes('song')) return 'bg-blue-500 border-blue-400';
    if (t.includes('dance')) return 'bg-purple-500 border-purple-400';
    return 'bg-emerald-600 border-emerald-500'; 
  };

  return (
    <main className="bg-zinc-950 flex flex-col overflow-hidden relative h-full">
      <header className="p-4 border-b border-white/5 bg-zinc-900/80 backdrop-blur-md z-10 flex justify-between items-center shrink-0">
        <div className="flex items-center gap-4">
            <h1 className="text-xl font-black italic uppercase hidden md:block text-white">Cast Grid</h1>
            <div className="flex items-center gap-3 px-3 py-1 bg-zinc-900 rounded-full border border-white/5 overflow-x-auto">
                <div className="flex items-center gap-1.5 shrink-0"><div className="w-2 h-2 rounded-full bg-emerald-500"></div><span className="text-[9px] font-bold text-zinc-400 uppercase">Scene</span></div>
                <div className="flex items-center gap-1.5 shrink-0"><div className="w-2 h-2 rounded-full bg-blue-500"></div><span className="text-[9px] font-bold text-zinc-400 uppercase">Song</span></div>
                <div className="flex items-center gap-1.5 shrink-0"><div className="w-2 h-2 rounded-full bg-purple-500"></div><span className="text-[9px] font-bold text-zinc-400 uppercase">Dance</span></div>
            </div>
        </div>

        <button onClick={onAddRole} className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wide transition-all shadow-lg shadow-blue-900/20">
           <Plus size={14} /> <span className="hidden md:inline">Add Role</span>
        </button>
      </header>

      <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
        <div className="space-y-4 pb-20">
            {/* COLUMN HEADERS (SCENE NUMBERS) */}
            <div className="grid grid-cols-[140px_1fr_30px] md:grid-cols-[280px_1fr_30px] gap-4 mb-2 sticky top-0 z-20 pr-2">
                <div className="bg-zinc-950/80 backdrop-blur-sm rounded-lg"></div> 
                <div className="flex gap-0.5 h-8">
                    {scenes.map((scene, i) => (
                        <div key={scene.id} className="flex-1 min-w-0 group relative bg-zinc-800 border border-white/5 hover:bg-zinc-700 transition-colors cursor-help rounded-sm flex flex-col items-center justify-end pb-1">
                            <span className="text-[9px] font-bold text-zinc-500 group-hover:text-white truncate px-0.5">{i + 1}</span>
                            
                            {/* TOOLTIP */}
                            <div className="absolute top-full left-1/2 -translate-x-1/2 mt-2 w-max max-w-[180px] hidden group-hover:block bg-black border border-white/20 text-white text-[10px] p-2 rounded shadow-2xl z-50 pointer-events-none">
                                <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-black border-t border-l border-white/20 rotate-45"></div>
                                <p className="font-bold text-blue-200">{getSceneName(scene)}</p>
                                <div className="h-px bg-white/10 my-1"></div>
                                <div className="flex justify-between gap-4 text-[9px] text-zinc-400">
                                    <span>{getSceneAct(scene)}</span>
                                    <span className={`${getSceneColor(getSceneType(scene)).split(' ')[0]} bg-clip-text text-transparent font-black uppercase`}>
                                      {getSceneType(scene)}
                                    </span>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
                <div></div> 
            </div>

            {roles.map((role) => (
                <div key={role.id} className="group grid grid-cols-[140px_1fr_30px] md:grid-cols-[280px_1fr_30px] gap-4 p-2 bg-zinc-900/30 border border-white/5 rounded-xl hover:bg-zinc-900 transition-all items-start">
                    
                    {/* LEFT: ROLE CARD */}
                    <div 
                        onDragOver={handleDragOver}
                        onDrop={(e) => onDropActor(e, role.id)}
                        onClick={() => onSelectRole(role)}
                        className={`min-h-[4rem] rounded-lg border-2 border-dashed transition-all cursor-pointer flex flex-col p-2 gap-2 relative
                             ${role.actors?.length > 0 ? 'bg-zinc-800 border-white/10' : 'bg-black/20 border-white/5 hover:border-blue-500/50 hover:bg-blue-500/5'}
                             ${role.selectedActorIds?.length > 0 ? 'ring-1 ring-purple-500/50' : ''}
                        `}
                    >
                         <div className="flex justify-between items-center mb-1">
                            <span className="text-xs font-black uppercase text-zinc-400 truncate max-w-[120px] md:max-w-[180px]" title={role.name}>{role.name}</span>
                            <span className="text-[9px] font-bold px-1.5 rounded bg-black/40 text-zinc-500 shrink-0 hidden md:block">{role.sceneIds?.length || 0} Scn</span>
                         </div>

                        <div className="flex flex-wrap gap-1.5">
                            {!role.actors?.length && <p className="text-[10px] text-zinc-600 italic py-1 w-full text-center hidden md:block">Drag actors here...</p>}
                            
                            {role.actors?.map((actor: any) => {
                                const isSelected = role.selectedActorIds?.includes(actor.id);
                                return (
                                    <div 
                                        key={actor.id} 
                                        onClick={(e) => { e.stopPropagation(); onConfirmRole(role.id, actor.id); }} 
                                        className={`flex items-center gap-1.5 rounded-full pr-2 pl-1 py-0.5 shadow-sm max-w-full cursor-pointer transition-all border
                                            ${isSelected 
                                                ? 'bg-purple-600 border-purple-400 text-white shadow-lg shadow-purple-900/50' 
                                                : 'bg-zinc-900 border-white/10 text-zinc-400 hover:border-white/30 hover:text-white'
                                            }
                                        `}
                                        title={isSelected ? "Cast (Click to Uncast)" : "Candidate (Click to Cast)"}
                                    >
                                        <img src={actor.headshot || "https://cdn.pixabay.com/photo/2015/10/05/22/37/blank-profile-picture-973460_1280.png"} className="w-4 h-4 rounded-full object-cover shrink-0" alt="" />
                                        {/* 🚨 FIX: actor.name instead of actor.Performer */}
                                        <span className="text-[9px] font-bold truncate max-w-[60px] md:max-w-full">{actor.name}</span>
                                        <button 
                                            onClick={(e) => { e.stopPropagation(); onRemoveActor(role.id, actor.id); }}
                                            className={`hover:text-red-400 shrink-0 ${isSelected ? 'text-purple-200' : 'text-zinc-500'}`}
                                        >
                                            <X size={10} />
                                        </button>
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    {/* MIDDLE: BARCODE GRID */}
                    <div className="flex gap-0.5 h-auto min-h-[4rem] relative bg-zinc-950/30 p-1 rounded-lg border border-white/5">
                        {scenes.map((scene) => {
                            const isActive = role.sceneIds?.includes(scene.id);
                            const type = getSceneType(scene);
                            return (
                                <button
                                    key={scene.id}
                                    onClick={() => onToggleScene(role.id, scene.id)}
                                    className={`flex-1 min-w-0 transition-all rounded-sm relative overflow-hidden border
                                        ${isActive ? `opacity-100 ${getSceneColor(type)}` : 'bg-zinc-800/30 border-white/5 hover:bg-zinc-700/50 hover:border-white/20'}
                                    `}
                                >
                                    {isActive && <div className="absolute inset-0 bg-gradient-to-b from-white/30 to-transparent"></div>}
                                </button>
                            );
                        })}
                    </div>
                    
                    <div className="flex flex-col gap-1 items-center opacity-100 md:opacity-0 group-hover:opacity-100 transition-opacity pt-1">
                         <button onClick={() => onDuplicateRole(role.id)} className="p-1.5 text-zinc-500 hover:text-blue-400 hover:bg-blue-500/10 rounded"><Copy size={14} /></button>
                        <button onClick={() => onRemoveRole(role.id)} className="p-1.5 text-zinc-500 hover:text-red-500 hover:bg-red-500/10 rounded"><Trash2 size={14} /></button>
                    </div>
                </div>
            ))}
        </div>
      </div>
    </main>
  );
}