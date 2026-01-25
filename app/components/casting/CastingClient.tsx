"use client";

import React, { useState, useEffect, useMemo } from 'react';
import { 
    Loader2, Wand2, Check, AlertCircle, RotateCcw, 
    ClipboardList, X, ChevronDown, ChevronUp, Users, Database 
} from 'lucide-react';
import { 
    getRoles, 
    getAuditionSlots, 
    getScenes, 
    updateRole, 
    createCastAssignment,
    getAssignments, 
    deleteRow,      
    TABLES          
} from '@/app/lib/baserow'; 

import CastWorkspace from '@/app/components/casting/CastWorkspace';
import ChemistryWorkspace from '@/app/components/casting/ChemistryWorkspace';
import CastingInspector from '@/app/components/casting/CastingInspector';

interface CastingClientProps {
  productionId: number;
  productionTitle: string;
  masterShowId?: number | null;
}

export default function CastingClient({ productionId, productionTitle, masterShowId }: CastingClientProps) {
  const [loading, setLoading] = useState(true);
  const [isAutoCasting, setIsAutoCasting] = useState(false);
  const [isClearing, setIsClearing] = useState(false);
  
  // 📊 PROGRESS STATE
  const [progress, setProgress] = useState({ current: 0, total: 0, message: "" });

  const [showAudit, setShowAudit] = useState(false);
  const [drawerExpanded, setDrawerExpanded] = useState(false);
  const [viewMode, setViewMode] = useState<'workspace' | 'chemistry'>('workspace');
  
  const [roles, setRoles] = useState<any[]>([]);
  const [actors, setActors] = useState<any[]>([]);
  const [scenes, setScenes] = useState<any[]>([]);
  const [allAssignments, setAllAssignments] = useState<any[]>([]);
  const [inspectingActorId, setInspectingActorId] = useState<number | null>(null);

  // --- DATA LOADING (Unchanged) ---
  useEffect(() => {
    async function load() {
        setLoading(true);
        try {
            const [roleRows, auditionRows, sceneRows, assignmentRows] = await Promise.all([
                getRoles(), getAuditionSlots(), getScenes(), getAssignments()
            ]);

            const currentAssignments = assignmentRows.filter((a: any) => 
                a.Production?.some((p: any) => p.id === productionId)
            );
            setAllAssignments(currentAssignments);

            const assignmentMap: Record<number, any[]> = {};
            currentAssignments.forEach((a: any) => {
                const roleId = a["Performance Identity"]?.[0]?.id;
                const personId = a["Person"]?.[0]?.id;
                if (roleId && personId) {
                    const actorObj = auditionRows.find((ar: any) => ar["Performer"]?.[0]?.id === personId);
                    if (actorObj) {
                        if (!assignmentMap[roleId]) assignmentMap[roleId] = [];
                        assignmentMap[roleId].push(actorObj);
                    }
                }
            });

            const showActors = auditionRows
                .filter((a: any) => a["Production"]?.some((link: any) => link.id === productionId))
                .map((a: any) => ({
                    ...a,
                    id: a.id, 
                    personId: a["Performer"]?.[0]?.id,
                    Performer: a["Performer"]?.[0]?.value || "Unknown",
                    Headshot: a["Headshot"]?.[0]?.url || null,
                    grades: { actingNotes: a["Acting Notes"], vocalNotes: a["Music Notes"], danceNotes: a["Choreography Notes"] }
                }));

            const showRoles = roleRows.filter((r: any) => {
                const prodLinks = r["Production"] || [];
                const isDirectLink = prodLinks.some((link: any) => link.id === productionId);
                const masterLinks = r["Master Show Database"] || [];
                const isMasterLink = masterShowId && masterLinks.some((link: any) => link.id === masterShowId);
                return isDirectLink || isMasterLink;
            });

            const processedRoles = showRoles.map((r: any) => {
                let sceneIds: number[] = [];
                if (r["Active Scenes"] && Array.isArray(r["Active Scenes"])) {
                    sceneIds = r["Active Scenes"].map((s: any) => s.id);
                }
                const assignedActorsRaw = assignmentMap[r.id] || [];
                const assignedActors = assignedActorsRaw.map(raw => showActors.find(sa => sa.id === raw.id) || null).filter(Boolean);

                return {
                    id: r.id,
                    name: r["Role Name"] || r.Name,
                    type: r["Role Type"]?.value || "Ensemble",
                    actors: assignedActors, 
                    selectedActorIds: assignedActors.map((a: any) => a.id), 
                    selectedActorId: assignedActors[0]?.id || null, 
                    sceneIds: sceneIds
                };
            });

            const showScenes = sceneRows
                .filter((s: any) => s["Production"]?.some((link: any) => link.id === productionId))
                .sort((a: any, b: any) => a.id - b.id);

            setRoles(processedRoles);
            setActors(showActors);
            setScenes(showScenes);

        } catch (e) { console.error("Load failed:", e); } finally { setLoading(false); }
    }
    if(productionId) load();
  }, [productionId, masterShowId]);

  const getActorStats = (actorId: number) => {
      const myRoles = roles.filter(r => r.selectedActorIds.includes(actorId));
      const mySceneIds = new Set(myRoles.flatMap(r => r.sceneIds));
      const splitIndex = Math.floor(scenes.length / 2);
      const act1Scenes = scenes.slice(0, splitIndex).map(s => s.id);
      const act2Scenes = scenes.slice(splitIndex).map(s => s.id);
      const hasAct1 = Array.from(mySceneIds).some(sid => act1Scenes.includes(sid as number));
      const hasAct2 = Array.from(mySceneIds).some(sid => act2Scenes.includes(sid as number));
      const count = mySceneIds.size;
      return { count, hasAct1, hasAct2, isCompliant: count >= 3 && hasAct1 && hasAct2, roleCount: myRoles.length };
  };

  // --- 🪄 SMART AUTO-CAST ---
  const handleAutoCast = async () => {
    const confirmMsg = `Auto-Assign Roles?\n\nLogic:\n1. Fill Empty LEAD, SUPPORTING, & FEATURED roles.\n2. Balance remaining students into ENSEMBLE.\n3. Verify min 3 scenes.`;
    if (!confirm(confirmMsg)) return;

    setIsAutoCasting(true);
    
    // Reset Progress
    setProgress({ current: 0, total: 0, message: "Calculating Logic..." });

    const splitIndex = Math.floor(scenes.length / 2);
    const act1Scenes = new Set(scenes.slice(0, splitIndex).map(s => s.id));
    const act2Scenes = new Set(scenes.slice(splitIndex).map(s => s.id));

    let newRoles = JSON.parse(JSON.stringify(roles));
    const updatesToSave: any[] = [];

    // --- ALGORITHM START ---
    actors.forEach(actor => {
        let currentAssignments = newRoles.filter((r: any) => r.selectedActorIds.includes(actor.id));
        const hasPrimaryRole = currentAssignments.some((r: any) => ['Lead', 'Supporting', 'Featured'].includes(r.type));
        let currentSceneIds = new Set(currentAssignments.flatMap((r: any) => r.sceneIds));
        let hasAct1 = Array.from(currentSceneIds).some(sid => act1Scenes.has(sid as number));
        let hasAct2 = Array.from(currentSceneIds).some(sid => act2Scenes.has(sid as number));
        let totalScenes = currentSceneIds.size;

        let attempts = 0;
        while ((totalScenes < 3 || !hasAct1 || !hasAct2) && attempts < 10) {
            attempts++;
            let bestRole = null;
            if (!hasPrimaryRole) {
                bestRole = newRoles.find((r: any) => ['Lead', 'Supporting', 'Featured'].includes(r.type) && r.selectedActorIds.length === 0 && r.sceneIds.length > 0 && !r.selectedActorIds.includes(actor.id));
            }
            if (!bestRole) {
                const ensembleOptions = newRoles.filter((r: any) => r.type === 'Ensemble' && !r.selectedActorIds.includes(actor.id) && r.sceneIds.length > 0);
                ensembleOptions.sort((a: any, b: any) => a.selectedActorIds.length - b.selectedActorIds.length);
                bestRole = ensembleOptions.find((r: any) => {
                    const roleHasAct1 = r.sceneIds.some((sid: number) => act1Scenes.has(sid));
                    const roleHasAct2 = r.sceneIds.some((sid: number) => act2Scenes.has(sid));
                    if (!hasAct1 && roleHasAct1) return true;
                    if (!hasAct2 && roleHasAct2) return true;
                    if (totalScenes < 3) return true;
                    return false;
                });
            }
            if (bestRole) {
                bestRole.selectedActorIds.push(actor.id);
                if (!bestRole.actors.find((a: any) => a.id === actor.id)) bestRole.actors.push(actor);
                if(['Lead', 'Supporting', 'Featured'].includes(bestRole.type)) {
                    if (!updatesToSave.includes(bestRole)) updatesToSave.push(bestRole);
                    break; 
                }
                bestRole.sceneIds.forEach((sid: number) => {
                    if (act1Scenes.has(sid)) hasAct1 = true;
                    if (act2Scenes.has(sid)) hasAct2 = true;
                    currentSceneIds.add(sid);
                });
                totalScenes = currentSceneIds.size;
                if (!updatesToSave.includes(bestRole)) updatesToSave.push(bestRole);
            } else {
                break; 
            }
        }
    });
    // --- ALGORITHM END ---

    setRoles(newRoles);

    // --- CALCULATE TOTAL OPERATIONS ---
    // Total = (Roles to update) + (Assignments to create)
    // Actually, updateRole is fast. createCastAssignment is the bottleneck. 
    // Let's count total assignment creations.
    let totalOps = 0;
    updatesToSave.forEach(r => totalOps += r.selectedActorIds.length); // Rough estimate (re-assigns existing ones too, but good enough for bar)
    
    setProgress({ current: 0, total: totalOps, message: "Starting Database Sync..." });

    try {
        let opCount = 0;
        for (const role of updatesToSave) {
            const personIds = role.selectedActorIds.map((auditionId: number) => {
                const a = actors.find(act => act.id === auditionId);
                return a ? a.personId : null;
            }).filter(Boolean);

            // Update Role
            setProgress(prev => ({ ...prev, message: `Updating Role: ${role.name}...` }));
            await updateRole(role.id, { "Assigned Actor": personIds });

            // Create Assignments (The Slow Part)
            for (const personId of personIds) {
                 opCount++;
                 setProgress(prev => ({ 
                     ...prev, 
                     current: opCount, 
                     message: `Assigning ${role.name} (${opCount}/${totalOps})` 
                 }));
                 
                 // Fire and wait
                 await createCastAssignment(personId, role.id, productionId);
            }
        }
        
        // Done
        setProgress(prev => ({ ...prev, message: "Done! Reloading..." }));
        setTimeout(() => window.location.reload(), 1000);

    } catch (e) {
        console.error("Auto-cast partial failure", e);
        alert("Some saves failed. Check audit.");
        setIsAutoCasting(false);
    }
  };

  // --- ☢️ CLEAR CAST ---
  const handleClearCast = async () => {
      const mode = prompt("Type 'ENSEMBLE' to clear only ensemble.\nType 'ALL' to wipe EVERYTHING.\n\n(Deletes DB records)");
      if (!mode) return;
      const cleanMode = mode.toUpperCase();
      if (cleanMode !== 'ENSEMBLE' && cleanMode !== 'ALL') return;

      setIsClearing(true);
      
      // Calculate what to delete
      const rowsToDelete = allAssignments.filter((assignmentRow: any) => {
          const roleId = assignmentRow["Performance Identity"]?.[0]?.id;
          const roleDef = roles.find(r => r.id === roleId);
          if (!roleDef) return false;
          if (cleanMode === 'ALL') return true;
          if (cleanMode === 'ENSEMBLE') return roleDef.type !== 'Lead'; 
          return false;
      });

      // Init Progress
      setProgress({ current: 0, total: rowsToDelete.length, message: "Initializing Deletion..." });

      try {
          let count = 0;
          // Batch delete in chunks of 5 for speed + safety? 
          // Or just sequential for safety. Let's do sequential to be safe with rate limits.
          for (const row of rowsToDelete) {
              count++;
              setProgress({ 
                  current: count, 
                  total: rowsToDelete.length, 
                  message: `Deleting Assignment ${count}/${rowsToDelete.length}...` 
              });
              
              await deleteRow(Number(TABLES.ASSIGNMENTS), row.id);
          }

          setProgress(prev => ({ ...prev, message: "Deletion Complete. Reloading..." }));
          setTimeout(() => window.location.reload(), 500);

      } catch (e) {
          console.error("Clear cast failure", e);
          alert("Failed to delete some rows.");
          setIsClearing(false);
      }
  };

  // --- HANDLERS (Unchanged) ---
  const handleDropActor = (e: React.DragEvent, roleId: string) => {
    e.preventDefault();
    const actorId = parseInt(e.dataTransfer.getData("actorId"));
    if (!actorId) return;
    const actor = actors.find(a => a.id === actorId);
    if (!actor) return;
    setRoles(prev => prev.map(role => {
        if (role.id.toString() !== roleId.toString()) return role;
        if (role.actors.find((a: any) => a.id === actor.id)) return role;
        return { ...role, actors: [...role.actors, actor] };
    }));
  };

  const handleRemoveActor = (roleId: string, actorId: number) => {
      setRoles(prev => prev.map(role => {
          if (role.id.toString() !== roleId.toString()) return role;
          return {
              ...role,
              actors: role.actors.filter((a: any) => a.id !== actorId),
              selectedActorIds: role.selectedActorIds.filter((id: number) => id !== actorId),
              selectedActorId: role.selectedActorId === actorId ? null : role.selectedActorId
          };
      }));
  };

  const handleConfirmRole = async (roleId: string, actorId: number) => {
      const role = roles.find(r => r.id.toString() === roleId.toString());
      if (!role) return;
      const actor = actors.find(a => a.id === actorId);
      if (!actor) return;
      const isSelecting = !role.selectedActorIds.includes(actorId);

      setRoles(prev => prev.map(r => {
          if (r.id.toString() !== roleId.toString()) return r;
          let newSelected = r.selectedActorIds;
          if (isSelecting) newSelected = [...newSelected, actorId]; 
          else newSelected = newSelected.filter((id: number) => id !== actorId);
          return { ...r, selectedActorIds: newSelected, selectedActorId: isSelecting ? actorId : null };
      }));

      try {
          const currentSelectedIds = isSelecting 
            ? [...role.selectedActorIds, actorId] 
            : role.selectedActorIds.filter((id: number) => id !== actorId);
          const personIds = currentSelectedIds.map((audId: any) => {
             const a = actors.find(act => act.id === audId);
             return a ? a.personId : null;
          }).filter(Boolean);
          await updateRole(parseInt(roleId), { "Assigned Actor": personIds });
          if (isSelecting) await createCastAssignment(actor.personId, parseInt(roleId), productionId);
      } catch (err) { console.error(err); }
  };

  const handleToggleScene = async (roleId: string, sceneId: number) => {
      let newSceneIds: number[] = [];
      setRoles(prev => prev.map(r => {
          if (r.id.toString() !== roleId.toString()) return r;
          if (r.sceneIds.includes(sceneId)) {
              newSceneIds = r.sceneIds.filter((id: number) => id !== sceneId);
          } else {
              newSceneIds = [...r.sceneIds, sceneId];
          }
          return { ...r, sceneIds: newSceneIds };
      }));
      await updateRole(parseInt(roleId), { "Active Scenes": newSceneIds });
  };

  const handleRemoveRole = async (roleId: string) => { if(confirm("Remove this role?")) setRoles(prev => prev.filter(r => r.id.toString() !== roleId.toString())); };
  const handleDuplicateRole = async (roleId: string) => alert("Feature: Duplicate Role " + roleId);

  const inspectorActor = useMemo(() => (!inspectingActorId ? null : actors.find(a => a.id === inspectingActorId)), [inspectingActorId, actors]);
  const inspectorStats = useMemo(() => {
      const assignments: Record<number, string> = {};
      roles.forEach(role => {
          if (role.selectedActorIds.includes(inspectingActorId)) {
              role.sceneIds.forEach((sid: number) => {
                  assignments[sid] = assignments[sid] ? `${assignments[sid]} + ${role.name}` : role.name;
              });
          }
      });
      return { assignments, assignedRoleNames: roles.filter(r => r.selectedActorIds.includes(inspectingActorId)).map(r => r.name) };
  }, [roles, inspectingActorId]);


  if (loading) return <div className="h-screen bg-zinc-950 flex items-center justify-center text-white"><Loader2 className="animate-spin text-blue-500 mr-2"/> Loading {productionTitle}...</div>;

  return (
    <div className="h-screen flex flex-col bg-zinc-950 text-white overflow-hidden relative">
        
        {/* HEADER */}
        <header className="h-14 border-b border-white/10 flex items-center justify-between px-4 bg-zinc-900 shrink-0 z-30 relative">
            <div className="flex gap-4 items-center">
                 <div className="text-xs font-bold text-zinc-500 uppercase tracking-widest border-r border-zinc-700 pr-4 mr-1">
                    {productionTitle}
                 </div>
                 
                 <div className="flex bg-zinc-800 rounded-lg p-1 gap-1">
                    <button onClick={() => setViewMode('workspace')} className={`text-[10px] font-black uppercase px-3 py-1 rounded transition-all ${viewMode === 'workspace' ? 'bg-white text-black' : 'text-zinc-400 hover:text-white'}`}>Grid</button>
                    <button onClick={() => setViewMode('chemistry')} className={`text-[10px] font-black uppercase px-3 py-1 rounded transition-all ${viewMode === 'chemistry' ? 'bg-purple-600 text-white' : 'text-zinc-400 hover:text-white'}`}>Chemistry</button>
                 </div>

                 <div className="flex items-center gap-2 border-l border-zinc-700 pl-4 ml-1">
                     <button onClick={() => setShowAudit(true)} className="flex items-center gap-2 bg-zinc-800 text-zinc-300 border border-zinc-700 hover:bg-zinc-700 hover:text-white px-3 py-1.5 rounded text-[10px] font-black uppercase tracking-wider transition-all">
                        <ClipboardList size={14} /> Audit
                     </button>
                     <button onClick={handleAutoCast} disabled={isAutoCasting || isClearing} className="flex items-center gap-2 bg-emerald-600/20 text-emerald-400 border border-emerald-500/50 hover:bg-emerald-500 hover:text-white px-3 py-1.5 rounded text-[10px] font-black uppercase tracking-wider transition-all disabled:opacity-50">
                        {isAutoCasting ? <Loader2 size={14} className="animate-spin"/> : <Wand2 size={14} />} Quick Cast
                     </button>
                     <button onClick={handleClearCast} disabled={isAutoCasting || isClearing} className="flex items-center gap-2 bg-red-600/10 text-red-400 border border-red-500/30 hover:bg-red-500 hover:text-white px-3 py-1.5 rounded text-[10px] font-black uppercase tracking-wider transition-all disabled:opacity-50">
                        {isClearing ? <Loader2 size={14} className="animate-spin"/> : <RotateCcw size={14} />} Reset
                     </button>
                 </div>
            </div>

            <div className="flex items-center gap-4 h-full">
                <div className="flex items-center gap-2 h-full cursor-pointer hover:bg-white/5 px-2 rounded transition-colors" onClick={() => setDrawerExpanded(!drawerExpanded)}>
                    <span className="text-[9px] font-bold text-zinc-600 uppercase">Cast Drawer</span>
                    {drawerExpanded ? <ChevronUp size={14} className="text-zinc-400"/> : <ChevronDown size={14} className="text-zinc-400"/>}
                </div>
                {!drawerExpanded && (
                    <div className="flex items-center gap-2 overflow-x-auto max-w-[20vw] no-scrollbar mask-linear-fade-left">
                        {actors.map(actor => {
                            const isAssigned = roles.some(r => r.selectedActorIds.includes(actor.id));
                            const stats = getActorStats(actor.id);
                            const hasWarning = isAssigned && !stats.isCompliant;
                            return (
                                <div key={actor.id} className={`w-8 h-8 rounded-full border shrink-0 overflow-hidden relative ${hasWarning ? 'border-red-500' : isAssigned ? 'border-emerald-500 opacity-50' : 'border-white/10'}`}>
                                    <img src={actor.Headshot || "https://placehold.co/100x100/333/999?text=?"} className="w-full h-full object-cover" />
                                </div>
                            )
                        })}
                    </div>
                )}
            </div>
        </header>

        {/* PROGRESS OVERLAY (New Feature) */}
        {(isAutoCasting || isClearing) && (
            <div className="absolute inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-8">
                <div className="bg-zinc-900 border border-white/10 p-8 rounded-2xl w-full max-w-md text-center shadow-2xl">
                    <div className="flex justify-center mb-6">
                        {isClearing ? <RotateCcw size={48} className="text-red-500 animate-pulse"/> : <Wand2 size={48} className="text-emerald-500 animate-bounce"/>}
                    </div>
                    <h2 className="text-2xl font-black uppercase italic text-white mb-2">{isClearing ? "Clearing Database..." : "Casting Magic..."}</h2>
                    <p className="text-sm text-zinc-400 font-mono mb-6">{progress.message}</p>
                    
                    {/* Progress Bar */}
                    <div className="h-4 bg-zinc-800 rounded-full overflow-hidden border border-white/5 relative">
                        <div 
                            className={`h-full transition-all duration-300 ease-out ${isClearing ? 'bg-red-600' : 'bg-emerald-500'}`}
                            style={{ width: `${(progress.current / (progress.total || 1)) * 100}%` }}
                        />
                    </div>
                    <div className="flex justify-between text-[10px] font-bold text-zinc-500 mt-2 uppercase tracking-widest">
                        <span>{progress.current} Rows</span>
                        <span>{progress.total} Total</span>
                    </div>
                </div>
            </div>
        )}

        {/* EXPANDED DRAWER */}
        {drawerExpanded && (
            <div className="absolute top-14 left-0 right-0 bottom-0 bg-zinc-950/95 backdrop-blur-xl z-40 p-8 overflow-y-auto border-t border-white/10" onClick={() => setDrawerExpanded(false)}>
                <div className="max-w-7xl mx-auto" onClick={e => e.stopPropagation()}>
                    <div className="flex justify-between items-end mb-6 border-b border-white/10 pb-4">
                        <h2 className="text-3xl font-black uppercase italic tracking-tighter text-white flex items-center gap-3">
                            <Users size={32} className="text-zinc-600"/> Cast Pool
                        </h2>
                        <button onClick={() => setDrawerExpanded(false)} className="text-zinc-500 hover:text-white flex items-center gap-2 text-xs font-bold uppercase"><X size={16}/> Close Drawer</button>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8 gap-4">
                        {actors.map(actor => {
                            const isAssigned = roles.some(r => r.selectedActorIds.includes(actor.id));
                            const stats = getActorStats(actor.id);
                            const hasWarning = isAssigned && !stats.isCompliant;
                            return (
                                <div key={actor.id} draggable onDragStart={(e) => { e.dataTransfer.setData("actorId", actor.id.toString()); setDrawerExpanded(false); }} onClick={() => setInspectingActorId(actor.id)} className={`relative bg-zinc-900 border rounded-xl p-3 hover:bg-zinc-800 transition-all cursor-grab active:cursor-grabbing group ${hasWarning ? 'border-red-500/50 hover:border-red-500' : isAssigned ? 'border-emerald-500/30' : 'border-white/5 hover:border-white/20'}`}>
                                    <div className="flex items-center gap-3 mb-2">
                                        <div className="w-10 h-10 rounded-full overflow-hidden shrink-0 bg-zinc-950 border border-white/10"><img src={actor.Headshot || "https://placehold.co/100x100/333/999?text=?"} className="w-full h-full object-cover" /></div>
                                        <div className="min-w-0"><p className="text-xs font-bold text-white truncate">{actor.Performer}</p><p className="text-[10px] text-zinc-500 font-mono">ID: {actor.id}</p></div>
                                    </div>
                                    <div className="flex gap-1 flex-wrap">
                                        <span className={`text-[9px] font-black uppercase px-1.5 py-0.5 rounded border ${isAssigned ? 'bg-zinc-800 text-zinc-300 border-zinc-700' : 'bg-red-900/10 text-red-400 border-red-900/20'}`}>{isAssigned ? `${stats.roleCount} Roles` : 'Uncast'}</span>
                                        {hasWarning && <span className="text-[9px] font-black uppercase px-1.5 py-0.5 rounded bg-red-500 text-white flex items-center gap-1"><AlertCircle size={8}/> Needs Scenes</span>}
                                    </div>
                                </div>
                            )
                        })}
                    </div>
                </div>
            </div>
        )}

        {/* WORKSPACE */}
        <div className="flex-1 overflow-hidden relative flex">
            <div className="flex-1 relative z-0 h-full">
                {viewMode === 'workspace' ? (
                    <CastWorkspace roles={roles} scenes={scenes} onAddRole={() => {}} onRemoveRole={handleRemoveRole} onDuplicateRole={handleDuplicateRole} onDropActor={handleDropActor} onRemoveActor={handleRemoveActor} onToggleScene={handleToggleScene} onSelectRole={() => {}} onConfirmRole={(rId, aId) => handleConfirmRole(rId, aId)} />
                ) : (
                    <ChemistryWorkspace roles={roles} onDropActor={handleDropActor} onRemoveActor={handleRemoveActor} onSelectRole={() => {}} onConfirmRole={(rId, aId) => handleConfirmRole(rId, aId)} />
                )}
            </div>
            {inspectingActorId && <CastingInspector actor={inspectorActor} allScenes={scenes} stats={inspectorStats} onClose={() => setInspectingActorId(null)} />}
        </div>

        {/* AUDIT MODAL */}
        {showAudit && (
            <div className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-sm flex items-center justify-center p-8" onClick={() => setShowAudit(false)}>
                <div className="bg-zinc-900 border border-white/10 rounded-2xl w-full max-w-4xl max-h-[80vh] flex flex-col shadow-2xl" onClick={e => e.stopPropagation()}>
                    <div className="p-6 border-b border-white/10 flex justify-between items-center bg-zinc-900 rounded-t-2xl">
                        <div><h2 className="text-xl font-black uppercase italic text-white flex items-center gap-2"><ClipboardList size={20}/> Casting Audit</h2><p className="text-xs text-zinc-500 mt-1">Rules: Min 3 Scenes • Must have Act 1 • Must have Act 2</p></div>
                        <button onClick={() => setShowAudit(false)}><X className="text-zinc-500 hover:text-white"/></button>
                    </div>
                    <div className="flex-1 overflow-y-auto p-0">
                        <table className="w-full text-left text-sm">
                            <thead className="bg-zinc-950 text-zinc-500 uppercase text-[10px] font-bold tracking-wider sticky top-0 z-10">
                                <tr><th className="px-6 py-3">Actor</th><th className="px-6 py-3 text-center">Roles</th><th className="px-6 py-3 text-center">Scenes (3+)</th><th className="px-6 py-3 text-center">Act 1</th><th className="px-6 py-3 text-center">Act 2</th><th className="px-6 py-3 text-right">Status</th></tr>
                            </thead>
                            <tbody className="divide-y divide-white/5">
                                {actors.map(actor => {
                                    const stats = getActorStats(actor.id);
                                    if(stats.roleCount === 0) return null;
                                    return (
                                        <tr key={actor.id} className="hover:bg-white/5">
                                            <td className="px-6 py-3 font-bold text-white flex items-center gap-3"><img src={actor.Headshot || "https://placehold.co/100x100/333/999?text=?"} className="w-8 h-8 rounded-full object-cover" />{actor.Performer}</td>
                                            <td className="px-6 py-3 text-center font-mono text-zinc-400">{stats.roleCount}</td>
                                            <td className={`px-6 py-3 text-center font-black ${stats.count >= 3 ? 'text-emerald-500' : 'text-red-500'}`}>{stats.count}</td>
                                            <td className="px-6 py-3 text-center">{stats.hasAct1 ? <Check size={16} className="mx-auto text-emerald-500"/> : <X size={16} className="mx-auto text-red-500 opacity-50"/>}</td>
                                            <td className="px-6 py-3 text-center">{stats.hasAct2 ? <Check size={16} className="mx-auto text-emerald-500"/> : <X size={16} className="mx-auto text-red-500 opacity-50"/>}</td>
                                            <td className="px-6 py-3 text-right">{stats.isCompliant ? <span className="inline-flex items-center gap-1 bg-emerald-500/10 text-emerald-500 px-2 py-1 rounded text-[10px] font-black uppercase tracking-wider">Pass</span> : <span className="inline-flex items-center gap-1 bg-red-500/10 text-red-500 px-2 py-1 rounded text-[10px] font-black uppercase tracking-wider"><AlertCircle size={12}/> Fail</span>}</td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        )}
    </div>
  );
}