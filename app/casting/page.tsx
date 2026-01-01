/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useState, useEffect, useMemo } from "react";
import { getAuditionSlots, getScenes, getRoles } from "@/app/lib/baserow"; 
import { Users, Filter, Loader2, ArrowDownAZ, LayoutGrid, FileText, Ban, Archive, PanelLeftClose, PanelLeftOpen, RefreshCcw, PlusCircle, AlertTriangle, ShieldAlert } from "lucide-react";
import CastingInspector from "./CastingInspector";
import ChemistryWorkspace from "./ChemistryWorkspace";
import CastWorkspace from "./CastWorkspace"; 

export default function CastingPage() {
  const [allPerformers, setAllPerformers] = useState<any[]>([]);
  const [allScenes, setAllScenes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // --- UI STATE ---
  const [viewMode, setViewMode] = useState<'cast' | 'lineup'>('cast');
  const [isInspectorOpen, setIsInspectorOpen] = useState(false); 
  const [isBenchCollapsed, setIsBenchCollapsed] = useState(false);
  const [benchFilter, setBenchFilter] = useState<'all' | 'drafting' | 'uncast' | 'cut'>('all');
  const [activeProduction, setActiveProduction] = useState("Little Mermaid"); 
  const [sortBy, setSortBy] = useState("name");

  // --- DATA STATE ---
  const [draggedActor, setDraggedActor] = useState<any | null>(null);
  const [selectedActor, setSelectedActor] = useState<any | null>(null);
  const [castState, setCastState] = useState<any[]>([]);
  const [cutActorIds, setCutActorIds] = useState<Set<number>>(new Set());

  // --- NEW: SMART INTERCEPTOR STATE ---
  const [pendingDrop, setPendingDrop] = useState<{ 
      actor: any; 
      roleId: string; 
      roleName: string; 
      currentActors: any[];
      warnings: string[]; // List of issues (Gender, Age, Occupied)
  } | null>(null);

  const safeString = (val: any): string => {
    if (val === null || val === undefined) return "";
    if (typeof val === 'string') return val;
    if (typeof val === 'number') return String(val);
    if (Array.isArray(val)) return val.length > 0 ? safeString(val[0].value || val[0]) : "";
    if (typeof val === 'object') return val.value ? safeString(val.value) : "";
    return String(val);
  };

  const getSafeValue = (val: any) => {
      if (typeof val === 'object' && val?.value) return val.value;
      if (Array.isArray(val) && val[0]?.value) return val[0].value; 
      return val;
  };

  useEffect(() => {
    async function loadData() {
      try {
        const [pData, sData, rData] = await Promise.all([ 
            getAuditionSlots(), 
            getScenes(),
            getRoles() 
        ]);
        setAllPerformers(pData || []);
        setAllScenes(sData || []);

        if (rData && rData.length > 0) {
            const initialCast = rData.map((r: any) => {
                const rawActiveScenes = r["Active Scenes"] || [];
                const preSetScenes = Array.isArray(rawActiveScenes) 
                    ? rawActiveScenes.map((s: any) => typeof s === 'object' && s.id ? s.id : s)
                    : [];

                return {
                    id: r.id.toString(),
                    name: safeString(r["Role Name"]),
                    type: safeString(r["Role Type"]),
                    // Assume we have these fields, or fallback to empty
                    genderReq: getSafeValue(r["Gender"]) || "Any", 
                    ageReq: getSafeValue(r["Age Range"]) || "Any",
                    production: safeString(r["Master Show Database"]), 
                    actors: [], 
                    selectedActorId: null,
                    sceneIds: preSetScenes 
                };
            });
            setCastState(initialCast);
        }

      } catch (err) { console.error(err); } 
      finally { setLoading(false); }
    }
    loadData();
  }, []);

  const safeScenes = useMemo(() => {
    return allScenes
        .filter(i => safeString(i.Production).includes(activeProduction))
        .map(s => ({ ...s, "Scene Name": safeString(s["Scene Name"]), "Scene Type": safeString(s["Scene Type"]), "Act": safeString(s.Act) }));
  }, [allScenes, activeProduction]);


  const getActorStats = (actorName: string, actorId: number) => {
    const assignmentMap: Record<number, string> = {};
    const uniqueRoles = new Set<string>();

    castState.forEach(role => {
        if (role.selectedActorId === actorId) {
            uniqueRoles.add(role.name); 
            role.sceneIds.forEach((sceneId: number) => {
                if (assignmentMap[sceneId]) assignmentMap[sceneId] = `${assignmentMap[sceneId]} + ${role.name}`;
                else assignmentMap[sceneId] = role.name;
            });
        }
    });

    const activeSceneIds = Object.keys(assignmentMap).map(Number);
    const myScenes = safeScenes.filter(s => activeSceneIds.includes(s.id));

    return {
        sceneCount: activeSceneIds.length,
        hasAct1: myScenes.some(s => safeString(s.Act).includes('1')),
        hasAct2: myScenes.some(s => safeString(s.Act).includes('2')),
        assignments: assignmentMap,
        assignedRoleNames: Array.from(uniqueRoles)
    };
  };

  const { performers, filteredRoles, progressStats } = useMemo(() => {
    let p = allPerformers.filter(i => safeString(i.Production).includes(activeProduction));
    if (sortBy === 'name') p.sort((a, b) => safeString(a.Performer).localeCompare(safeString(b.Performer)));

    if (benchFilter === 'cut') {
        p = p.filter(a => cutActorIds.has(a.id));
    } else {
        p = p.filter(a => !cutActorIds.has(a.id)); 
        if (benchFilter === 'drafting') {
            p = p.filter(a => getActorStats(a.Performer, a.id).sceneCount < 3);
        } else if (benchFilter === 'uncast') {
            p = p.filter(a => getActorStats(a.Performer, a.id).sceneCount === 0);
        }
    }

    const r = castState.filter(role => role.production.includes(activeProduction));
    const totalRoles = r.length;
    const filledRoles = r.filter(role => role.selectedActorId !== null).length;
    const percent = totalRoles > 0 ? Math.round((filledRoles / totalRoles) * 100) : 0;

    return { performers: p, filteredRoles: r, progressStats: { filled: filledRoles, total: totalRoles, percent } };
  }, [allPerformers, castState, activeProduction, sortBy, benchFilter, cutActorIds, safeScenes]); 


  // --- ACTIONS ---
  const handleAddRole = () => setCastState(prev => [...prev, { id: Date.now().toString(), name: "New Role", type: "Featured", genderReq: "Any", production: activeProduction, actors: [], selectedActorId: null, sceneIds: [] }]);
  const handleRemoveRole = (id: string) => setCastState(prev => prev.filter(r => r.id !== id));
  const handleDuplicateRole = (roleId: string) => {
    const original = castState.find(r => r.id === roleId);
    if (!original) return;
    const clone = { ...original, id: Date.now().toString(), name: `${original.name} (Copy)`, actors: [], selectedActorId: null };
    setCastState(prev => {
        const index = prev.findIndex(r => r.id === roleId);
        const newArr = [...prev];
        newArr.splice(index + 1, 0, clone);
        return newArr;
    });
  };

// --- NEW: INTELLIGENT DROP HANDLER ---
  const handleDropActorToRole = (e: React.DragEvent, roleId: string) => {
    if (!draggedActor) return;
    const targetRole = castState.find(r => r.id === roleId);
    if (!targetRole) return;
    if (targetRole.actors.some((a: any) => a.id === draggedActor.id)) return; 

    // 1. GATHER WARNINGS
    const warnings: string[] = [];

    // Check A: Occupancy
    const isEnsemble = safeString(targetRole.type).toLowerCase().includes('ensemble');
    if (viewMode === 'cast' && targetRole.actors.length > 0 && !isEnsemble) {
        warnings.push("OCCUPIED");
    }

    // Check B: Gender Mismatch (FIXED)
    const roleString = safeString(targetRole.genderReq).toLowerCase(); // e.g. "typically female"
    const actorString = safeString(getSafeValue(draggedActor.Gender)).toLowerCase(); // e.g. "male"
    
    // We use .includes() because the role is "typically female", not just "female"
    // CRITICAL: We check for "female" first. "Male" checks must ensure the word isn't part of "feMALE"
    const roleReqsFemale = roleString.includes('female');
    const roleReqsMale = roleString.includes('male') && !roleString.includes('female');

    if (roleReqsFemale && actorString === 'male') {
        warnings.push("GENDER_MISMATCH");
    }
    if (roleReqsMale && actorString === 'female') {
        warnings.push("GENDER_MISMATCH");
    }

    // Check C: Age Mismatch (Optional/Future)
    // const roleAge = safeString(targetRole.ageReq).toLowerCase();
    // const actorAge = Number(getSafeValue(draggedActor.Age));
    // if (roleAge === 'adult' && actorAge > 0 && actorAge < 16) warnings.push("AGE_MISMATCH");


    // 2. IF WARNINGS EXIST -> SHOW MODAL
    if (warnings.length > 0) {
        setPendingDrop({ 
            actor: draggedActor, 
            roleId, 
            roleName: targetRole.name, 
            currentActors: targetRole.actors,
            warnings 
        });
        return; 
    }

    // 3. NO WARNINGS -> PROCEED
    executeAddActor(roleId, draggedActor);
  };
  const executeAddActor = (roleId: string, actor: any, clearOthers: boolean = false) => {
     setCastState(prev => prev.map(r => {
         if (r.id !== roleId) return r;
         const newActors = clearOthers ? [actor] : [...r.actors, actor];
         const newSelectedId = clearOthers ? actor.id : r.selectedActorId; 
         return { ...r, actors: newActors, selectedActorId: newSelectedId };
     }));

     // Auto-select if safe to do so
     if (!clearOthers && viewMode === 'cast') {
         setTimeout(() => {
             setCastState(curr => {
                 const role = curr.find(r => r.id === roleId);
                 if (role && role.selectedActorId === null) handleConfirmRole(roleId, actor.id); 
                 return curr;
             });
         }, 50);
     }
     setDraggedActor(null);
     setPendingDrop(null); 
  };

  const handleConfirmRole = (roleId: string, actorId: number) => {
      const targetRole = castState.find(r => r.id === roleId);
      if (!targetRole) return;

      const conflictingRoles = castState.filter(r => r.selectedActorId === actorId && r.id !== roleId);

      for (const existingRole of conflictingRoles) {
          const overlap = targetRole.sceneIds.filter((id: number) => existingRole.sceneIds.includes(id));
          if (overlap.length > 0) {
              const conflictNames = safeScenes.filter(s => overlap.includes(s.id)).map(s => safeString(s["Scene Name"]));
              alert(`🚫 CONFLICT DETECTED\n\nThis actor is already "${existingRole.name}" in:\n• ${conflictNames.join("\n• ")}`);
              return; 
          }
      }
      setCastState(prev => prev.map(r => r.id === roleId ? { ...r, selectedActorId: actorId } : r));
  };

  const handleRemoveActorFromRole = (roleId: string, actorId: number) => {
    setCastState(prev => prev.map(r => r.id === roleId ? { ...r, actors: r.actors.filter((a: any) => a.id !== actorId), selectedActorId: r.selectedActorId === actorId ? null : r.selectedActorId } : r));
  };

  const handleToggleScene = (roleId: string, sceneId: number) => {
    setCastState(prev => prev.map(r => r.id === roleId ? { ...r, sceneIds: r.sceneIds.includes(sceneId) ? r.sceneIds.filter((id: number) => id !== sceneId) : [...r.sceneIds, sceneId] } : r));
  };

  const handleCutActor = (e: React.DragEvent) => {
      e.preventDefault();
      if (!draggedActor) return;
      setCutActorIds(prev => new Set(prev).add(draggedActor.id));
      setDraggedActor(null);
  };
  const handleRestoreActor = (id: number) => setCutActorIds(prev => { const n = new Set(prev); n.delete(id); return n; });

  if (loading) return <div className="h-screen bg-zinc-950 flex items-center justify-center text-white"><Loader2 className="animate-spin" /></div>;

  const getGridCols = () => {
      const left = isBenchCollapsed ? '70px' : '280px';
      if (isInspectorOpen) return `${left} 1fr 350px`;
      return `${left} 1fr`;
  };

  return (
    <div className="h-screen bg-zinc-950 text-white grid divide-x divide-white/5 font-sans transition-all duration-300 ease-in-out relative" style={{ gridTemplateColumns: getGridCols() }}>
      
      {/* LEFT SIDEBAR */}
      <aside className="bg-zinc-900/50 flex flex-col overflow-hidden relative transition-all">
        <header className={`p-4 border-b border-white/5 bg-zinc-900/80 backdrop-blur-md z-10 space-y-3 ${isBenchCollapsed ? 'px-2 items-center' : ''}`}>
            <div className={`flex items-center ${isBenchCollapsed ? 'justify-center flex-col gap-4' : 'justify-between'}`}>
                 {!isBenchCollapsed && <div className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">Progress {progressStats.percent}%</div>}
                 <button onClick={() => setIsBenchCollapsed(!isBenchCollapsed)} className="p-1 text-zinc-500 hover:text-white bg-zinc-800 rounded hover:bg-zinc-700 transition-colors">
                    {isBenchCollapsed ? <PanelLeftOpen size={16} /> : <PanelLeftClose size={16} />}
                 </button>
            </div>
            {!isBenchCollapsed ? (
                <>
                    <div className="h-1.5 w-full bg-zinc-800 rounded-full overflow-hidden"><div className="h-full bg-blue-500 transition-all duration-500" style={{ width: `${progressStats.percent}%` }} /></div>
                    <div className="h-px bg-white/5 my-2"></div>
                    <div className="flex gap-1 bg-zinc-950 p-1 rounded-lg border border-white/5">
                        <button onClick={() => setBenchFilter('all')} className={`flex-1 py-1 rounded text-[10px] font-bold uppercase ${benchFilter === 'all' ? 'bg-zinc-800 text-white' : 'text-zinc-500 hover:text-zinc-300'}`}>All</button>
                        <button onClick={() => setBenchFilter('drafting')} className={`flex-1 py-1 rounded text-[10px] font-bold uppercase ${benchFilter === 'drafting' ? 'bg-blue-900/30 text-blue-300' : 'text-zinc-500 hover:text-zinc-300'}`}>Draft</button>
                        <button onClick={() => setBenchFilter('uncast')} className={`flex-1 py-1 rounded text-[10px] font-bold uppercase ${benchFilter === 'uncast' ? 'bg-amber-900/30 text-amber-300' : 'text-zinc-500 hover:text-zinc-300'}`}>Uncast</button>
                        <button onClick={() => setBenchFilter('cut')} className={`flex-1 py-1 rounded text-[10px] font-bold uppercase flex items-center justify-center gap-1 ${benchFilter === 'cut' ? 'bg-red-900/30 text-red-200' : 'text-zinc-600 hover:text-red-400'}`}><Ban size={10} /></button>
                    </div>
                </>
            ) : (
                <div className="flex flex-col gap-3 mt-2">
                     <button title="Show All" onClick={() => setBenchFilter('all')} className={`p-1.5 rounded ${benchFilter === 'all' ? 'bg-zinc-700 text-white' : 'text-zinc-600'}`}><Users size={16}/></button>
                     <button title="Drafting" onClick={() => setBenchFilter('drafting')} className={`p-1.5 rounded ${benchFilter === 'drafting' ? 'bg-blue-900/30 text-blue-300' : 'text-zinc-600'}`}><Filter size={16}/></button>
                     <button title="Cuts" onClick={() => setBenchFilter('cut')} className={`p-1.5 rounded ${benchFilter === 'cut' ? 'bg-red-900/30 text-red-300' : 'text-zinc-600'}`}><Ban size={16}/></button>
                </div>
            )}
        </header>
        <div className={`flex-1 overflow-y-auto p-2 space-y-2 custom-scrollbar pb-20 ${isBenchCollapsed ? 'flex flex-col items-center' : ''}`}>
            {performers.map(p => {
                const stats = getActorStats(p.Performer, p.id); 
                const isGreen = stats.sceneCount >= 3;
                return (
                <div 
                    key={p.id} draggable
                    onDragStart={() => { setDraggedActor(p); setSelectedActor(p); }}
                    onClick={() => { setSelectedActor(p); setIsInspectorOpen(true); }}
                    className={`group rounded-xl border transition-all flex items-center cursor-grab active:cursor-grabbing hover:bg-zinc-800 
                        ${selectedActor?.id === p.id ? 'bg-blue-900/20 border-blue-500/50' : 'bg-zinc-900/40 border-white/5'}
                        ${isBenchCollapsed ? 'justify-center p-1.5 w-10 h-10' : 'p-2 gap-3'}
                        ${benchFilter === 'cut' ? 'opacity-70 grayscale-[0.5]' : ''}
                    `}
                    title={safeString(p.Performer)}
                >
                    <div className={`relative shrink-0 ${isBenchCollapsed ? 'w-8 h-8' : 'w-9 h-9'}`}>
                        <img src={p.Headshot?.[0]?.url || "https://cdn.pixabay.com/photo/2015/10/05/22/37/blank-profile-picture-973460_1280.png"} className="w-full h-full rounded-full object-cover border border-white/10" />
                        {benchFilter !== 'cut' && (<div className={`absolute -bottom-1 -right-1 rounded-full flex items-center justify-center font-black border-2 border-zinc-900 ${isGreen ? 'bg-emerald-500 text-black' : 'bg-red-500 text-white'} ${isBenchCollapsed ? 'w-3 h-3 text-[7px]' : 'w-4 h-4 text-[9px]'}`}>{stats.sceneCount}</div>)}
                    </div>
                    {!isBenchCollapsed && (<div className="min-w-0 flex-1"><h4 className={`text-xs font-bold truncate ${benchFilter === 'cut' ? 'text-zinc-500 line-through' : 'text-zinc-300'}`}>{safeString(p.Performer)}</h4></div>)}
                    {benchFilter === 'cut' && !isBenchCollapsed && (<button onClick={(e) => { e.stopPropagation(); handleRestoreActor(p.id); }} className="p-1.5 text-zinc-500 hover:text-emerald-400 hover:bg-emerald-500/10 rounded"><Archive size={14} /></button>)}
                </div>
            )})}
        </div>
        {benchFilter !== 'cut' && (
            <div onDragOver={(e) => { e.preventDefault(); e.dataTransfer.dropEffect = 'move'; }} onDrop={handleCutActor} className={`absolute bottom-0 left-0 right-0 bg-zinc-950/90 border-t border-white/10 backdrop-blur-md flex items-center justify-center transition-all hover:bg-red-900/40 hover:border-red-500/30 group z-20 ${isBenchCollapsed ? 'h-12' : 'h-14'}`}>
                <div className="flex flex-col items-center text-zinc-600 group-hover:text-red-400 pointer-events-none transition-colors">{isBenchCollapsed ? <Ban size={20} /> : <span className="text-[10px] font-black uppercase tracking-wider flex items-center gap-2"><Ban size={14} /> Drag here to Cut</span>}</div>
            </div>
        )}
      </aside>

      {/* CENTER */}
      <div className="flex flex-col h-full overflow-hidden bg-zinc-950">
          <div className="p-2 border-b border-white/5 flex justify-center bg-zinc-900/50 shrink-0 relative">
              <div className="bg-zinc-950 p-1 rounded-lg border border-white/10 flex gap-1">
                  <button onClick={() => setViewMode('cast')} className={`flex items-center gap-2 px-4 py-1.5 rounded-md text-[10px] font-black uppercase tracking-wider transition-all ${viewMode === 'cast' ? 'bg-blue-600 text-white shadow-lg' : 'text-zinc-500 hover:text-zinc-300'}`}><LayoutGrid size={12} /> Grid</button>
                  <button onClick={() => setViewMode('lineup')} className={`flex items-center gap-2 px-4 py-1.5 rounded-md text-[10px] font-black uppercase tracking-wider transition-all ${viewMode === 'lineup' ? 'bg-purple-600 text-white shadow-lg' : 'text-zinc-500 hover:text-zinc-300'}`}><Users size={12} /> Lineup</button>
              </div>
              {!isInspectorOpen && selectedActor && (<button onClick={() => setIsInspectorOpen(true)} className="absolute right-4 top-1/2 -translate-y-1/2 flex items-center gap-2 text-[10px] font-bold uppercase text-zinc-500 hover:text-white transition-colors"><Users size={14} /> Show Inspector</button>)}
          </div>

          <div className="flex-1 overflow-hidden relative">
              {viewMode === 'cast' ? (
                  <CastWorkspace 
                      roles={filteredRoles}
                      scenes={safeScenes}
                      onAddRole={handleAddRole}
                      onRemoveRole={handleRemoveRole}
                      onDuplicateRole={handleDuplicateRole}
                      onDropActor={handleDropActorToRole}
                      onRemoveActor={handleRemoveActorFromRole}
                      onToggleScene={handleToggleScene}
                      onConfirmRole={handleConfirmRole}
                      onSelectRole={(role) => { if (role.actors.length > 0) { setSelectedActor(role.actors[0]); setIsInspectorOpen(true); }}}
                  />
              ) : (
                  <ChemistryWorkspace 
                      roles={filteredRoles}
                      onDropActor={handleDropActorToRole}
                      onRemoveActor={handleRemoveActorFromRole}
                      onConfirmRole={handleConfirmRole}
                      onSelectRole={(role) => { if (role.actors.length > 0) { setSelectedActor(role.actors[0]); setIsInspectorOpen(true); }}}
                  />
              )}
          </div>
      </div>

      {/* RIGHT: INSPECTOR */}
      {isInspectorOpen && (
          <CastingInspector 
            actor={selectedActor} 
            allScenes={safeScenes} 
            stats={selectedActor 
                ? getActorStats(selectedActor.Performer, selectedActor.id) 
                : { sceneCount: 0, hasAct1: false, hasAct2: false, assignments: {}, assignedRoleNames: [] }
            }
            onClose={() => setIsInspectorOpen(false)}
          />
      )}

      {/* --- SMART DECISION MODAL --- */}
      {pendingDrop && (
          <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
              <div className="bg-zinc-900 border border-white/10 rounded-2xl shadow-2xl p-6 max-w-sm w-full animate-in fade-in zoom-in-95 duration-200">
                  
                  {/* WARNING HEADER */}
                  <div className="flex flex-col items-center text-center mb-6">
                      <div className={`w-12 h-12 rounded-full flex items-center justify-center mb-3
                         ${pendingDrop.warnings.includes("GENDER_MISMATCH") ? 'bg-amber-500/20 text-amber-400' : 'bg-blue-500/20 text-blue-400'}
                      `}>
                          {pendingDrop.warnings.includes("GENDER_MISMATCH") ? <AlertTriangle size={24} /> : <ShieldAlert size={24} />}
                      </div>
                      
                      <h3 className="text-lg font-black text-white uppercase italic tracking-wider mb-2">
                          {pendingDrop.warnings.includes("OCCUPIED") ? "Traffic Control" : "Review Candidate"}
                      </h3>
                      
                      {/* DYNAMIC WARNING TEXT */}
                      <div className="space-y-2 text-sm">
                          {pendingDrop.warnings.includes("GENDER_MISMATCH") && (
                              <p className="text-amber-400 font-bold bg-amber-900/10 px-2 py-1 rounded border border-amber-500/20">
                                  ⚠️ Gender Mismatch Detected
                              </p>
                          )}
                          {pendingDrop.warnings.includes("OCCUPIED") && (
                              <p className="text-zinc-400">
                                  <span className="text-white font-bold">{pendingDrop.roleName}</span> is already filled by <span className="text-white font-bold">{safeString(pendingDrop.currentActors[0]?.Performer)}</span>.
                              </p>
                          )}
                      </div>
                  </div>

                  <div className="space-y-3">
                      {/* OPTION 1: SWAP (Only if Occupied) */}
                      {pendingDrop.warnings.includes("OCCUPIED") && (
                          <button 
                              onClick={() => executeAddActor(pendingDrop.roleId, pendingDrop.actor, true)}
                              className="w-full flex items-center gap-4 p-3 rounded-xl bg-blue-600 hover:bg-blue-500 transition-colors text-left group"
                          >
                              <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center shrink-0"><RefreshCcw size={16} className="text-white" /></div>
                              <div>
                                  <div className="text-xs font-black uppercase text-white tracking-wide">Swap</div>
                                  <div className="text-[10px] text-blue-100 opacity-80">Replace current actor</div>
                              </div>
                          </button>
                      )}

                      {/* OPTION 2: ADD / CO-CAST (Always available) */}
                      <button 
                          onClick={() => executeAddActor(pendingDrop.roleId, pendingDrop.actor, false)}
                          className={`w-full flex items-center gap-4 p-3 rounded-xl transition-colors text-left group border 
                              ${!pendingDrop.warnings.includes("OCCUPIED") ? 'bg-blue-600 border-blue-500 text-white hover:bg-blue-500' : 'bg-zinc-800 border-white/5 hover:border-white/10 hover:bg-zinc-700'}
                          `}
                      >
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${!pendingDrop.warnings.includes("OCCUPIED") ? 'bg-white/20' : 'bg-purple-500/20'}`}>
                              <PlusCircle size={16} className={!pendingDrop.warnings.includes("OCCUPIED") ? 'text-white' : 'text-purple-400'} />
                          </div>
                          <div>
                              <div className={`text-xs font-black uppercase tracking-wide ${!pendingDrop.warnings.includes("OCCUPIED") ? 'text-white' : 'text-zinc-200'}`}>
                                  {pendingDrop.warnings.includes("OCCUPIED") ? "Double Cast" : "Cast Anyway"}
                              </div>
                              <div className={`text-[10px] ${!pendingDrop.warnings.includes("OCCUPIED") ? 'text-blue-100' : 'text-zinc-400'}`}>
                                  {pendingDrop.warnings.includes("OCCUPIED") ? "Add as alternate" : "Ignore warning & proceed"}
                              </div>
                          </div>
                      </button>

                      {/* CANCEL */}
                      <button 
                          onClick={() => setPendingDrop(null)}
                          className="w-full py-3 text-xs font-bold text-zinc-500 hover:text-white transition-colors"
                      >
                          Cancel
                      </button>
                  </div>
              </div>
          </div>
      )}

    </div>
  );
}