"use client";

import React, { useState, useEffect, useMemo } from 'react';
import { Loader2, Wand2, Calculator, Check, AlertCircle, Trash2, RotateCcw } from 'lucide-react';
import { 
    getRoles, 
    getAuditionSlots, 
    getScenes, 
    updateRole, 
    createCastAssignment 
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
  const [isClearing, setIsClearing] = useState(false); // <--- New State for Clear Button
  const [viewMode, setViewMode] = useState<'workspace' | 'chemistry'>('workspace');
  
  const [roles, setRoles] = useState<any[]>([]);
  const [actors, setActors] = useState<any[]>([]);
  const [scenes, setScenes] = useState<any[]>([]);
  
  const [inspectingActorId, setInspectingActorId] = useState<number | null>(null);

  // --- DATA LOADING ---
  useEffect(() => {
    async function load() {
        setLoading(true);
        try {
            const [roleRows, auditionRows, sceneRows] = await Promise.all([
                getRoles(), getAuditionSlots(), getScenes()
            ]);

            // Smart Filter: Matches Production ID OR Master Blueprint ID
            const showRoles = roleRows.filter((r: any) => {
                const prodLinks = r["Production"] || [];
                const isDirectLink = prodLinks.some((link: any) => link.id === productionId);
                const masterLinks = r["Master Show Database"] || [];
                const isMasterLink = masterShowId && masterLinks.some((link: any) => link.id === masterShowId);
                return isDirectLink || isMasterLink;
            });

            // Filter Scenes & Actors
            const showScenes = sceneRows
                .filter((s: any) => s["Production"]?.some((link: any) => link.id === productionId))
                .sort((a: any, b: any) => a.id - b.id);

            const showActors = auditionRows
                .filter((a: any) => a["Production"]?.some((link: any) => link.id === productionId))
                .map((a: any) => ({
                    ...a,
                    id: a.id, 
                    personId: a["Performer"]?.[0]?.id,
                    Performer: a["Performer"]?.[0]?.value || "Unknown",
                    Headshot: a["Headshot"]?.[0]?.url || null,
                    grades: {
                        actingNotes: a["Acting Notes"],
                        vocalNotes: a["Music Notes"],
                        danceNotes: a["Choreography Notes"]
                    }
                }));

            // Hydrate Roles
            const processedRoles = showRoles.map((r: any) => {
                let sceneIds: number[] = [];
                if (r["Active Scenes"] && Array.isArray(r["Active Scenes"])) {
                    sceneIds = r["Active Scenes"].map((s: any) => s.id);
                }

                // Check Assigned
                const assignedRaw = r["Assigned Actor"] || [];
                const assignedActors = assignedRaw.map((link: any) => showActors.find((a: any) => a.personId === link.id)).filter(Boolean);

                return {
                    id: r.id,
                    name: r["Role Name"] || r.Name,
                    type: r["Role Type"]?.value || "Ensemble",
                    actors: assignedActors.length > 0 ? assignedActors : [],
                    selectedActorIds: assignedActors.map((a: any) => a.id), 
                    selectedActorId: assignedActors[0]?.id || null, 
                    sceneIds: sceneIds
                };
            });

            setRoles(processedRoles);
            setActors(showActors);
            setScenes(showScenes);

        } catch (e) {
            console.error("Load failed:", e);
        } finally {
            setLoading(false);
        }
    }
    if(productionId) load();
  }, [productionId, masterShowId]);


  // --- 🪄 AUTO-CAST ALGORITHM ---
  const handleAutoCast = async () => {
    const confirmMsg = `Auto-Assign Ensemble?\n\nConstraints:\n- Minimum 3 Scenes per student\n- Must have Act 1 & Act 2\n- Will NOT overwrite existing Leads`;
    if (!confirm(confirmMsg)) return;

    setIsAutoCasting(true);

    const splitIndex = Math.floor(scenes.length / 2);
    const act1Scenes = new Set(scenes.slice(0, splitIndex).map(s => s.id));
    const act2Scenes = new Set(scenes.slice(splitIndex).map(s => s.id));

    let newRoles = JSON.parse(JSON.stringify(roles));
    const updatesToSave: any[] = [];

    actors.forEach(actor => {
        const currentAssignments = newRoles.filter((r: any) => r.selectedActorIds.includes(actor.id));
        const currentSceneIds = new Set(currentAssignments.flatMap((r: any) => r.sceneIds));
        
        let hasAct1 = Array.from(currentSceneIds).some(sid => act1Scenes.has(sid as number));
        let hasAct2 = Array.from(currentSceneIds).some(sid => act2Scenes.has(sid as number));
        let totalScenes = currentSceneIds.size;

        let attempts = 0;
        while ((totalScenes < 3 || !hasAct1 || !hasAct2) && attempts < 10) {
            attempts++;
            const bestRole = newRoles.find((r: any) => {
                if (r.type === "Lead" || r.selectedActorIds.includes(actor.id)) return false;
                if (r.sceneIds.length === 0) return false;

                const roleHasAct1 = r.sceneIds.some((sid: number) => act1Scenes.has(sid));
                const roleHasAct2 = r.sceneIds.some((sid: number) => act2Scenes.has(sid));

                if (!hasAct1 && roleHasAct1) return true;
                if (!hasAct2 && roleHasAct2) return true;
                if (totalScenes < 3) return true;

                return false;
            });

            if (bestRole) {
                bestRole.selectedActorIds.push(actor.id);
                if (!bestRole.actors.find((a: any) => a.id === actor.id)) {
                    bestRole.actors.push(actor);
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

    setRoles(newRoles);

    try {
        console.log(`Auto-Cast: Updating ${updatesToSave.length} roles...`);
        await Promise.all(updatesToSave.map(async (role) => {
            const personIds = role.selectedActorIds.map((auditionId: number) => {
                const a = actors.find(act => act.id === auditionId);
                return a ? a.personId : null;
            }).filter(Boolean);

            await updateRole(role.id, { "Assigned Actor": personIds });
        }));
        alert(`Auto-cast complete! ${updatesToSave.length} roles updated.`);
    } catch (e) {
        console.error("Auto-cast partial failure", e);
        alert("Visual update done, but some database saves may have timed out.");
    } finally {
        setIsAutoCasting(false);
    }
  };

  // --- 🧹 CLEAR CAST FUNCTION ---
  const handleClearCast = async () => {
      if(!confirm("⚠️ RESET ENSEMBLE?\n\nThis will remove all actors from Ensemble, Featured, and Supporting roles.\n\nLeads will NOT be affected.")) return;
      
      setIsClearing(true);
      
      const newRoles = JSON.parse(JSON.stringify(roles));
      const updatesToSave: any[] = [];

      newRoles.forEach((role: any) => {
          // Safety: Skip Leads
          if (role.type === "Lead") return;

          // If the role has actors, clear them
          if (role.selectedActorIds.length > 0) {
              role.selectedActorIds = [];
              role.actors = []; // Clear the visual card too
              updatesToSave.push(role);
          }
      });

      // Optimistic Update
      setRoles(newRoles);

      try {
          await Promise.all(updatesToSave.map(async (role) => {
              // Send empty array to clear assignments in DB
              await updateRole(role.id, { "Assigned Actor": [] });
          }));
          alert("Ensemble roles have been reset.");
      } catch (e) {
          console.error("Clear cast failure", e);
          alert("Failed to clear some roles in the database.");
      } finally {
          setIsClearing(false);
      }
  };


  // --- EVENT HANDLERS (Standard) ---
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
            
          const personIds = currentSelectedIds.map(audId => {
             const a = actors.find(act => act.id === audId);
             return a ? a.personId : null;
          }).filter(Boolean);

          await updateRole(parseInt(roleId), { "Assigned Actor": personIds });
          
          if (isSelecting) {
             await createCastAssignment(actor.personId, parseInt(roleId), productionId);
          }
      } catch (err) {
          console.error(err);
      }
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

  const handleRemoveRole = async (roleId: string) => {
     if(confirm("Remove this role?")) setRoles(prev => prev.filter(r => r.id.toString() !== roleId.toString()));
  };
  
  const handleDuplicateRole = async (roleId: string) => alert("Feature: Duplicate Role " + roleId);

  // --- INSPECTOR ---
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
    <div className="h-screen flex flex-col bg-zinc-950 text-white overflow-hidden">
        
        {/* HEADER */}
        <header className="h-14 border-b border-white/10 flex items-center justify-between px-4 bg-zinc-900 shrink-0 z-20">
            <div className="flex gap-4 items-center">
                 <div className="text-xs font-bold text-zinc-500 uppercase tracking-widest border-r border-zinc-700 pr-4 mr-1">
                    {productionTitle}
                 </div>
                 
                 <div className="flex bg-zinc-800 rounded-lg p-1 gap-1">
                    <button onClick={() => setViewMode('workspace')} className={`text-[10px] font-black uppercase px-3 py-1 rounded transition-all ${viewMode === 'workspace' ? 'bg-white text-black' : 'text-zinc-400 hover:text-white'}`}>Grid</button>
                    <button onClick={() => setViewMode('chemistry')} className={`text-[10px] font-black uppercase px-3 py-1 rounded transition-all ${viewMode === 'chemistry' ? 'bg-purple-600 text-white' : 'text-zinc-400 hover:text-white'}`}>Chemistry</button>
                 </div>

                 <div className="flex items-center gap-2 border-l border-zinc-700 pl-4 ml-1">
                     {/* 🪄 AUTO CAST */}
                     <button 
                        onClick={handleAutoCast} 
                        disabled={isAutoCasting || isClearing}
                        className="flex items-center gap-2 bg-emerald-600/20 text-emerald-400 border border-emerald-500/50 hover:bg-emerald-500 hover:text-white px-3 py-1.5 rounded text-[10px] font-black uppercase tracking-wider transition-all disabled:opacity-50"
                     >
                        {isAutoCasting ? <Loader2 size={14} className="animate-spin"/> : <Wand2 size={14} />}
                        {isAutoCasting ? "Casting..." : "Quick Cast"}
                     </button>

                     {/* 🧹 CLEAR CAST */}
                     <button 
                        onClick={handleClearCast}
                        disabled={isAutoCasting || isClearing}
                        className="flex items-center gap-2 bg-red-600/10 text-red-400 border border-red-500/30 hover:bg-red-500 hover:text-white px-3 py-1.5 rounded text-[10px] font-black uppercase tracking-wider transition-all disabled:opacity-50"
                        title="Reset Ensemble"
                     >
                        {isClearing ? <Loader2 size={14} className="animate-spin"/> : <RotateCcw size={14} />}
                        {isClearing ? "Clearing..." : "Reset"}
                     </button>
                 </div>
            </div>

            {/* DRAWER */}
            <div className="flex items-center gap-2 overflow-x-auto max-w-[30vw] no-scrollbar mask-linear-fade-left">
                 <span className="text-[9px] font-bold text-zinc-600 uppercase mr-2 shrink-0">Cast Drawer:</span>
                 {actors.map(actor => {
                     const isAssigned = roles.some(r => r.selectedActorIds.includes(actor.id));
                     return (
                        <div 
                            key={actor.id} 
                            draggable 
                            onDragStart={(e) => e.dataTransfer.setData("actorId", actor.id.toString())} 
                            onClick={() => setInspectingActorId(actor.id)} 
                            className={`w-8 h-8 rounded-full border shrink-0 overflow-hidden cursor-grab active:cursor-grabbing hover:scale-110 transition-transform relative ${isAssigned ? 'border-emerald-500 opacity-50' : 'border-white/10'}`} 
                            title={actor.Performer}
                        >
                            <img alt="Headshot" src={actor.Headshot || "https://placehold.co/100x100/333/999?text=?"} className="w-full h-full object-cover" />
                            {isAssigned && <div className="absolute inset-0 bg-emerald-500/30 flex items-center justify-center"><Check size={12} className="text-white"/></div>}
                        </div>
                     )
                 })}
            </div>
        </header>

        {/* WORKSPACE */}
        <div className="flex-1 overflow-hidden relative flex">
            <div className="flex-1 relative z-0 h-full">
                {viewMode === 'workspace' ? (
                    <CastWorkspace 
                        roles={roles}
                        scenes={scenes}
                        onAddRole={() => alert("Add Role logic")}
                        onRemoveRole={handleRemoveRole}
                        onDuplicateRole={handleDuplicateRole}
                        onDropActor={handleDropActor}
                        onRemoveActor={handleRemoveActor}
                        onToggleScene={handleToggleScene}
                        onSelectRole={() => {}}
                        onConfirmRole={(rId, aId) => handleConfirmRole(rId, aId)}
                    />
                ) : (
                    <ChemistryWorkspace 
                        roles={roles}
                        onDropActor={handleDropActor}
                        onRemoveActor={handleRemoveActor}
                        onSelectRole={() => {}}
                        onConfirmRole={(rId, aId) => handleConfirmRole(rId, aId)}
                    />
                )}
            </div>
            
            {/* INSPECTOR PANEL */}
            {inspectingActorId && (
                <CastingInspector 
                    actor={inspectorActor}
                    allScenes={scenes}
                    stats={inspectorStats}
                    onClose={() => setInspectingActorId(null)}
                />
            )}
        </div>
    </div>
  );
}