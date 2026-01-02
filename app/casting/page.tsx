/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useState, useEffect, useMemo } from "react";
import { getAuditionSlots, getScenes, getRoles, createCastAssignment } from "@/app/lib/baserow"; 
import { Users, Filter, Loader2, LayoutGrid, Ban, PanelLeftClose, PanelLeftOpen, RefreshCcw, PlusCircle, AlertTriangle, ShieldAlert, Save, Check, Archive } from "lucide-react";
import CastingInspector from "./CastingInspector";
import ChemistryWorkspace from "./ChemistryWorkspace";
import CastWorkspace from "./CastWorkspace"; 

const DEFAULT_AVATAR = "https://cdn.pixabay.com/photo/2015/10/05/22/37/blank-profile-picture-973460_1280.png";

export default function CastingPage() {
  const [allPerformers, setAllPerformers] = useState<any[]>([]);
  const [allScenes, setAllScenes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // --- UI STATE ---
  const [viewMode, setViewMode] = useState<'cast' | 'lineup'>('cast');
  const [isInspectorOpen, setIsInspectorOpen] = useState(false); 
  const [isBenchCollapsed, setIsBenchCollapsed] = useState(false);
  const [isMobileBenchOpen, setIsMobileBenchOpen] = useState(false);
  const [benchFilter, setBenchFilter] = useState<'all' | 'drafting' | 'uncast' | 'cut'>('all');
  const [activeProduction, setActiveProduction] = useState("Little Mermaid"); 
  const [sortBy, setSortBy] = useState("name");

  // --- SAVE STATE ---
  const [isSaving, setIsSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'success' | 'error'>('idle');

  // --- DATA STATE ---
  const [draggedActor, setDraggedActor] = useState<any | null>(null);
  const [selectedActor, setSelectedActor] = useState<any | null>(null);
  
  // NOTE: Changed selectedActorId -> selectedActorIds (Array)
  const [castState, setCastState] = useState<any[]>([]);
  const [cutActorIds, setCutActorIds] = useState<Set<number>>(new Set());
  const [pendingDrop, setPendingDrop] = useState<{ 
      actor: any; roleId: string; roleName: string; currentActors: any[]; warnings: string[]; 
  } | null>(null);

  // --- HELPERS ---
  const safeString = (val: any): string => {
    if (val === null || val === undefined) return "";
    if (typeof val === 'string') return val;
    if (typeof val === 'number') return String(val);
    if (Array.isArray(val)) return val.length > 0 ? safeString(val[0].value || val[0]) : "";
    if (typeof val === 'object') return val.value ? safeString(val.value) : "";
    return String(val);
  };

  const getHeadshot = (raw: any) => {
    if (Array.isArray(raw) && raw.length > 0 && raw[0].url) return raw[0].url;
    if (typeof raw === 'string' && raw.includes('(') && raw.includes(')')) {
      const match = raw.match(/\((.*?)\)/);
      if (match) return match[1];
    }
    if (typeof raw === 'string' && raw.startsWith('http')) return raw;
    return DEFAULT_AVATAR;
  };

  const calculateTenure = (rawPast: any) => {
    const pastStr = safeString(rawPast);
    if (!pastStr || pastStr.toLowerCase().includes("no past") || pastStr.length < 3) return "New Student";
    return "Returning";
  };

  // --- DATA LOADING ---
  useEffect(() => {
    async function loadData() {
      try {
        const [pData, sData, rData] = await Promise.all([ 
            getAuditionSlots(), 
            getScenes(),
            getRoles() 
        ]);
        
        setAllScenes(sData || []);

        // 1. MAP ROLES
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
                    genderReq: safeString(r["Gender"]) || "Any", 
                    ageReq: safeString(r["Age Range"]) || "Any",
                    production: safeString(r["Master Show Database"]), 
                    actors: [], 
                    selectedActorIds: [], // CHANGED TO ARRAY
                    sceneIds: preSetScenes 
                };
            });
            setCastState(initialCast);
        }

        // 2. MAP PERFORMERS
        const mappedPerformers = (pData || []).map((p: any) => {
            const extractValue = (keys: string[]) => {
                for (const k of keys) {
                    const val = p[k];
                    if (val === undefined || val === null) continue;
                    if (Array.isArray(val) && val.length > 0) return val[0].value || val[0]; 
                    if (typeof val === 'object' && val.value) return val.value;
                    return val;
                }
                return "";
            };

            const rawPast = extractValue(["Past Productions"]);
            const adminNote = safeString(extractValue(["Admin Notes", "General Notes"]));
            const dropInNote = safeString(extractValue(["Drop-In Notes", "Flags"]));

            return {
                id: p.id,
                Performer: safeString(extractValue(["Performer", "Name"])) || "Unknown Actor",
                Gender: safeString(extractValue(["Gender", "Sex", "Pronouns"])), 
                Age: safeString(extractValue(["Age", "Student Age"])),
                Headshot: getHeadshot(p.Headshot), 
                height: safeString(extractValue(["Height"])) || "-",
                tenure: calculateTenure(rawPast),
                grades: {
                    acting: Number(extractValue(["Acting Score"]) || 0),
                    vocal: Number(extractValue(["Vocal Score"]) || 0),
                    dance: Number(extractValue(["Dance Score"]) || 0),
                    actingNotes: safeString(extractValue(["Acting Notes", "Director Notes"])),
                    vocalNotes: safeString(extractValue(["Music Notes", "Vocal Notes"])),
                    choreoNotes: safeString(extractValue(["Choreography Notes", "Dance Notes"])),
                    adminNotes: [adminNote, dropInNote].filter(Boolean).join(" | "),
                },
            };
        });
        setAllPerformers(mappedPerformers);

      } catch (err) { console.error(err); } 
      finally { setLoading(false); }
    }
    loadData();
  }, []);

  // --- STATS & FILTERING ---
  const safeScenes = useMemo(() => {
    return allScenes
        .filter(i => safeString(i.Production).includes(activeProduction))
        .map(s => ({ ...s, "Scene Name": safeString(s["Scene Name"]), "Scene Type": safeString(s["Scene Type"]), "Act": safeString(s.Act) }));
  }, [allScenes, activeProduction]);

  const getActorStats = (actorName: string, actorId: number) => {
    const assignmentMap: Record<number, string> = {};
    const uniqueRoles = new Set<string>();

    castState.forEach(role => {
        // CHECK IF ID IS IN THE ARRAY
        if (role.selectedActorIds.includes(actorId)) {
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
    const filledRoles = r.filter(role => role.selectedActorIds.length > 0).length;
    const percent = totalRoles > 0 ? Math.round((filledRoles / totalRoles) * 100) : 0;

    return { performers: p, filteredRoles: r, progressStats: { filled: filledRoles, total: totalRoles, percent } };
  }, [allPerformers, castState, activeProduction, sortBy, benchFilter, cutActorIds, safeScenes]); 


  // --- ACTIONS ---
  const handleAddRole = () => setCastState(prev => [...prev, { id: Date.now().toString(), name: "New Role", type: "Featured", genderReq: "Any", production: activeProduction, actors: [], selectedActorIds: [], sceneIds: [] }]);
  const handleRemoveRole = (id: string) => setCastState(prev => prev.filter(r => r.id !== id));
  
  const handlePublishCast = async () => {
    const assignedRoles = castState.filter(r => r.selectedActorIds.length > 0);
    if (assignedRoles.length === 0) return;
    
    if (!confirm(`Ready to publish ${assignedRoles.length} roles to the database?`)) return;
    
    setIsSaving(true);
    setSaveStatus('idle');

    try {
      const promises = [];
      
      // Loop through roles, then loop through the IDs in that role
      for (const role of assignedRoles) {
          for (const actorId of role.selectedActorIds) {
              const rId = parseInt(role.id);
              const prodName = role.production;
              promises.push(createCastAssignment(actorId, rId, prodName));
          }
      }

      await Promise.all(promises);
      setSaveStatus('success');
      setTimeout(() => setSaveStatus('idle'), 4000); 
    } catch (err) {
      console.error(err);
      setSaveStatus('error');
      alert("Publish failed. Check console.");
    } finally {
      setIsSaving(false);
    }
  };

  // --- DROP HANDLER (MULTI-CAST LOGIC) ---
  const handleDropActorToRole = (e: React.DragEvent, roleId: string) => {
    if (!draggedActor) return;
    const targetRole = castState.find(r => r.id === roleId);
    if (!targetRole) return;
    if (targetRole.actors.some((a: any) => a.id === draggedActor.id)) return; 

    const warnings: string[] = [];
    const isEnsemble = safeString(targetRole.type).toLowerCase().includes('ensemble') || safeString(targetRole.type).toLowerCase().includes('group');
    
    // GENDER CHECK
    const roleString = safeString(targetRole.genderReq).toLowerCase(); 
    const actorString = safeString(draggedActor.Gender).toLowerCase();
    const roleReqsFemale = roleString.includes('female');
    const roleReqsMale = roleString.includes('male') && !roleString.includes('female'); 
    if (roleReqsFemale && actorString === 'male') warnings.push("GENDER_MISMATCH");
    if (roleReqsMale && actorString === 'female') warnings.push("GENDER_MISMATCH");

    if (warnings.length > 0) {
        setPendingDrop({ actor: draggedActor, roleId, roleName: targetRole.name, currentActors: targetRole.actors, warnings });
        return; 
    }
    
    // If Ensemble, we AUTO-CONFIRM. If Principal, we just ADD AS CANDIDATE.
    const autoConfirm = isEnsemble;
    executeAddActor(roleId, draggedActor, false, autoConfirm);
  };

  const executeAddActor = (roleId: string, actor: any, clearOthers: boolean = false, autoConfirm: boolean = false) => {
     setCastState(prev => prev.map(r => {
         if (r.id !== roleId) return r;
         
         const newActors = clearOthers ? [actor] : [...r.actors, actor];
         let newSelectedIds = r.selectedActorIds;

         if (clearOthers) {
             newSelectedIds = [actor.id]; // Swap
         } else if (autoConfirm) {
             newSelectedIds = [...r.selectedActorIds, actor.id]; // Add to pool
         }

         return { ...r, actors: newActors, selectedActorIds: newSelectedIds };
     }));

     setDraggedActor(null);
     setPendingDrop(null);
     setIsMobileBenchOpen(false);
  };

  // --- TOGGLE CONFIRMATION (Supports Double Casting) ---
  const handleConfirmRole = (roleId: string, actorId: number) => {
      setCastState(prev => prev.map(r => {
          if (r.id !== roleId) return r;
          
          const isSelected = r.selectedActorIds.includes(actorId);
          let newIds;

          if (isSelected) {
              // REMOVE (Toggle Off)
              newIds = r.selectedActorIds.filter((id: number) => id !== actorId);
          } else {
              // ADD (Toggle On - Double Cast)
              newIds = [...r.selectedActorIds, actorId];
          }
          
          return { ...r, selectedActorIds: newIds };
      }));
  };

  const handleRemoveActorFromRole = (roleId: string, actorId: number) => {
    setCastState(prev => prev.map(r => {
        if (r.id !== roleId) return r;
        return { 
            ...r, 
            actors: r.actors.filter((a: any) => a.id !== actorId), 
            selectedActorIds: r.selectedActorIds.filter((id: number) => id !== actorId) 
        };
    }));
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

  return (
    <div className="h-screen bg-zinc-950 text-white flex flex-col md:grid md:divide-x divide-white/5 font-sans transition-all duration-300 ease-in-out relative overflow-hidden" 
         style={{ gridTemplateColumns: isBenchCollapsed ? '70px 1fr' : '280px 1fr' }}>
      
      {/* LEFT SIDEBAR (Desktop) */}
      <aside className={`bg-zinc-900/50 flex flex-col overflow-hidden relative transition-all hidden md:flex`}>
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
                        <img src={p.Headshot || DEFAULT_AVATAR} className="w-full h-full rounded-full object-cover border border-white/10" />
                        {benchFilter !== 'cut' && (<div className={`absolute -bottom-1 -right-1 rounded-full flex items-center justify-center font-black border-2 border-zinc-900 ${isGreen ? 'bg-emerald-500 text-black' : 'bg-red-500 text-white'} ${isBenchCollapsed ? 'w-3 h-3 text-[7px]' : 'w-4 h-4 text-[9px]'}`}>{stats.sceneCount}</div>)}
                    </div>
                    {!isBenchCollapsed && (<div className="min-w-0 flex-1"><h4 className={`text-xs font-bold truncate ${benchFilter === 'cut' ? 'text-zinc-500 line-through' : 'text-zinc-300'}`}>{safeString(p.Performer)}</h4></div>)}
                    {benchFilter === 'cut' && !isBenchCollapsed && (<button onClick={(e) => { e.stopPropagation(); handleRestoreActor(p.id); }} className="p-1.5 text-zinc-500 hover:text-emerald-400 hover:bg-emerald-500/10 rounded"><Archive size={14} /></button>)}
                </div>
            )})}
        </div>
      </aside>

      {/* MOBILE DRAWER */}
      <div className={`md:hidden fixed inset-x-0 bottom-0 z-[100] bg-zinc-900 border-t border-white/10 rounded-t-3xl transition-transform duration-300 ease-out shadow-[0_-10px_40px_rgba(0,0,0,0.5)] ${isMobileBenchOpen ? 'translate-y-0' : 'translate-y-[92%]'}`} style={{ height: '80vh' }}>
          <div onClick={() => setIsMobileBenchOpen(!isMobileBenchOpen)} className="h-10 flex items-center justify-center cursor-pointer">
              <div className="w-12 h-1.5 bg-zinc-700 rounded-full" />
          </div>
          <div className="p-4 h-full overflow-y-auto pb-24">
              <h3 className="text-sm font-black uppercase text-zinc-500 mb-4 tracking-widest flex items-center gap-2"><Users size={16} /> The Bench ({performers.length})</h3>
              <div className="grid grid-cols-2 gap-2">
                  {performers.map(p => (
                      <div 
                          key={p.id}
                          onClick={() => {
                              const roleName = prompt(`Assign ${p.Performer} to which role?`);
                              if (roleName) {
                                  const role = castState.find(r => r.name.toLowerCase().includes(roleName.toLowerCase()));
                                  if (role) {
                                      setDraggedActor(p); 
                                      const isEnsemble = safeString(role.type).toLowerCase().includes('ensemble');
                                      executeAddActor(role.id, p, false, isEnsemble);
                                  } else {
                                      alert("Role not found.");
                                  }
                              }
                          }}
                          className="bg-zinc-950 p-3 rounded-xl border border-white/5 flex items-center gap-3 active:scale-95 transition-transform"
                      >
                          <img src={p.Headshot || DEFAULT_AVATAR} className="w-8 h-8 rounded-full object-cover" />
                          <span className="text-xs font-bold truncate">{p.Performer}</span>
                      </div>
                  ))}
              </div>
          </div>
      </div>

      {/* CENTER */}
      <div className="flex flex-col h-full overflow-hidden bg-zinc-950 relative z-0">
          <div className="p-2 border-b border-white/5 flex items-center justify-between bg-zinc-900/50 shrink-0 px-4">
              <button onClick={() => setIsMobileBenchOpen(true)} className="md:hidden p-2 text-zinc-400">
                  <Users size={20} />
              </button>

              <div className="bg-zinc-950 p-1 rounded-lg border border-white/10 flex gap-1 mx-auto">
                  <button onClick={() => setViewMode('cast')} className={`flex items-center gap-2 px-3 md:px-4 py-1.5 rounded-md text-[10px] font-black uppercase tracking-wider transition-all ${viewMode === 'cast' ? 'bg-blue-600 text-white shadow-lg' : 'text-zinc-500 hover:text-zinc-300'}`}><LayoutGrid size={12} /> <span className="hidden md:inline">Grid</span></button>
                  <button onClick={() => setViewMode('lineup')} className={`flex items-center gap-2 px-3 md:px-4 py-1.5 rounded-md text-[10px] font-black uppercase tracking-wider transition-all ${viewMode === 'lineup' ? 'bg-purple-600 text-white shadow-lg' : 'text-zinc-500 hover:text-zinc-300'}`}><Users size={12} /> <span className="hidden md:inline">Lineup</span></button>
              </div>

              <div className="w-auto md:w-auto flex justify-end gap-3 items-center">
                  <button 
                      onClick={handlePublishCast}
                      disabled={isSaving || progressStats.filled === 0}
                      className={`
                          flex items-center gap-2 px-3 md:px-4 py-2 rounded-lg text-xs font-black uppercase tracking-widest transition-all border
                          ${saveStatus === 'success' 
                              ? 'bg-emerald-500 border-emerald-400 text-white hover:bg-emerald-400' 
                              : saveStatus === 'error'
                              ? 'bg-red-500 border-red-400 text-white'
                              : 'bg-white border-white text-black hover:bg-zinc-200'}
                          ${isSaving ? 'opacity-50 cursor-wait' : ''}
                      `}
                  >
                      {isSaving ? (
                          <><Loader2 size={14} className="animate-spin" /> <span className="hidden md:inline">Saving...</span></>
                      ) : saveStatus === 'success' ? (
                          <><Check size={14} /> <span className="hidden md:inline">Published!</span></>
                      ) : (
                          <><Save size={14} /> <span className="hidden md:inline">Publish</span></>
                      )}
                  </button>
              </div>
          </div>

          <div className="flex-1 overflow-hidden relative pb-20 md:pb-0">
              {viewMode === 'cast' ? (
                  <CastWorkspace 
                      roles={filteredRoles}
                      scenes={safeScenes}
                      onAddRole={handleAddRole}
                      onRemoveRole={(id) => setCastState(prev => prev.filter(r => r.id !== id))}
                      onDuplicateRole={() => {}}
                      onDropActor={handleDropActorToRole}
                      onRemoveActor={handleRemoveActorFromRole}
                      onToggleScene={handleToggleScene}
                      onSelectRole={(role) => { if (role.actors.length > 0) { setSelectedActor(role.actors[0]); setIsInspectorOpen(true); }}}
                      onConfirmRole={handleConfirmRole} // NEW: Handles toggling
                  />
              ) : (
                  <ChemistryWorkspace 
                      roles={filteredRoles}
                      onDropActor={handleDropActorToRole}
                      onRemoveActor={handleRemoveActorFromRole}
                      onSelectRole={(role) => { if (role.actors.length > 0) { setSelectedActor(role.actors[0]); setIsInspectorOpen(true); }}}
                      onConfirmRole={handleConfirmRole}
                  />
              )}
          </div>
      </div>

      {/* RIGHT: INSPECTOR */}
      {isInspectorOpen && (
          <div className={`fixed inset-0 z-[200] md:static md:z-0 md:block`}>
             <CastingInspector 
                actor={selectedActor} 
                allScenes={safeScenes} 
                stats={selectedActor 
                    ? getActorStats(selectedActor.Performer, selectedActor.id) 
                    : { sceneCount: 0, hasAct1: false, hasAct2: false, assignments: {}, assignedRoleNames: [] }
                }
                onClose={() => setIsInspectorOpen(false)}
              />
          </div>
      )}

      {/* --- TRAFFIC CONTROL MODAL --- */}
      {pendingDrop && (
          <div className="absolute inset-0 z-[250] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
              <div className="bg-zinc-900 border border-white/10 rounded-2xl shadow-2xl p-6 max-w-sm w-full animate-in fade-in zoom-in-95 duration-200">
                  <div className="flex flex-col items-center text-center mb-6">
                      <div className={`w-12 h-12 rounded-full flex items-center justify-center mb-3 ${pendingDrop.warnings.includes("GENDER_MISMATCH") ? 'bg-amber-500/20 text-amber-400' : 'bg-blue-500/20 text-blue-400'}`}>
                          {pendingDrop.warnings.includes("GENDER_MISMATCH") ? <AlertTriangle size={24} /> : <ShieldAlert size={24} />}
                      </div>
                      <h3 className="text-lg font-black text-white uppercase italic tracking-wider mb-2">Review Candidate</h3>
                      <div className="space-y-2 text-sm">
                          {pendingDrop.warnings.includes("GENDER_MISMATCH") && (<p className="text-amber-400 font-bold bg-amber-900/10 px-2 py-1 rounded border border-amber-500/20">⚠️ Gender Mismatch Detected</p>)}
                      </div>
                  </div>

                  <div className="space-y-3">
                      <button onClick={() => executeAddActor(pendingDrop.roleId, pendingDrop.actor, false)} className="w-full flex items-center gap-4 p-3 rounded-xl bg-blue-600 hover:bg-blue-500 transition-colors text-left group">
                          <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center shrink-0"><PlusCircle size={16} className="text-white" /></div>
                          <div><div className="text-xs font-black uppercase text-white tracking-wide">Add Candidate</div><div className="text-[10px] text-blue-100 opacity-80">Add to role (Gray)</div></div>
                      </button>
                      <button onClick={() => setPendingDrop(null)} className="w-full py-3 text-xs font-bold text-zinc-500 hover:text-white transition-colors">Cancel</button>
                  </div>
              </div>
          </div>
      )}
    </div>
  );
}