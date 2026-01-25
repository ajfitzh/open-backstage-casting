"use client";

import React, { useState, useEffect, useMemo } from 'react';
import { Loader2, AlertCircle } from 'lucide-react';
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
}

export default function CastingClient({ productionId, productionTitle }: CastingClientProps) {
  // --- STATE ---
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'workspace' | 'chemistry'>('workspace');
  
  // Data Containers
  const [roles, setRoles] = useState<any[]>([]);
  const [actors, setActors] = useState<any[]>([]);
  const [scenes, setScenes] = useState<any[]>([]);
  
  // UI State
  const [inspectingActorId, setInspectingActorId] = useState<number | null>(null);

  // --- 1. DATA LOADING ---
  useEffect(() => {
    async function load() {
        setLoading(true);
        try {
            const [roleRows, auditionRows, sceneRows] = await Promise.all([
                getRoles(), 
                getAuditionSlots(),
                getScenes()
            ]);

            // --- FILTERING BY PRODUCTION ID ---
            
            // 1. Filter Roles (Column: "Master Show Database")
            const showRoles = roleRows.filter((r: any) => 
                r["Master Show Database"]?.some((link: any) => link.id === productionId)
            );

            // 2. Filter Scenes (Column: "Production")
            const showScenes = sceneRows
                .filter((s: any) => s["Production"]?.some((link: any) => link.id === productionId))
                .sort((a: any, b: any) => a.id - b.id);

            // 3. Filter Actors/Auditions (Column: "Production")
            const showActors = auditionRows
                .filter((a: any) => a["Production"]?.some((link: any) => link.id === productionId))
                .map((a: any) => ({
                    ...a,
                    id: a.id, 
                    personId: a["Performer"]?.[0]?.id,
                    Performer: a["Performer"]?.[0]?.value || "Unknown",
                    Headshot: a["Headshot"]?.[0]?.url || "https://cdn.pixabay.com/photo/2015/10/05/22/37/blank-profile-picture-973460_1280.png",
                    grades: {
                        actingNotes: a["Acting Notes"],
                        vocalNotes: a["Music Notes"],
                        danceNotes: a["Choreography Notes"]
                    }
                }));

            // 4. Hydrate Roles with Assigned Actors
            const processedRoles = showRoles.map((r: any) => {
                // Link Scenes
                let sceneIds: number[] = [];
                if (r["Active Scenes"] && Array.isArray(r["Active Scenes"])) {
                    sceneIds = r["Active Scenes"].map((s: any) => s.id);
                }

                // Check Assignment
                const assignedId = r["Assigned Actor"]?.[0]?.id; 
                const assignedActor = showActors.find((a: any) => a.personId === assignedId);

                return {
                    id: r.id,
                    name: r["Role Name"] || r.Name,
                    type: r["Role Type"]?.value || "Ensemble",
                    actors: assignedActor ? [assignedActor] : [],
                    selectedActorIds: assignedActor ? [assignedActor.id] : [], 
                    selectedActorId: assignedActor ? assignedActor.id : null, 
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
  }, [productionId]); // Reload if the production ID changes

  // --- 2. EVENT HANDLERS ---

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

      // UI Update
      setRoles(prev => prev.map(r => {
          if (r.id.toString() !== roleId.toString()) return r;
          
          let newSelected = r.selectedActorIds;
          if (isSelecting) newSelected = [...newSelected, actorId]; 
          else newSelected = newSelected.filter((id: number) => id !== actorId);

          return { 
              ...r, 
              selectedActorIds: isSelecting ? [actorId] : [], 
              selectedActorId: isSelecting ? actorId : null 
          };
      }));

      // DB Update
      try {
          const payload = isSelecting ? { "Assigned Actor": [actor.personId] } : { "Assigned Actor": [] };
          await updateRole(parseInt(roleId), payload);

          if (isSelecting) {
             await createCastAssignment(actor.personId, parseInt(roleId), productionId);
             console.log(`Compliance Record Created for ${productionTitle}`);
          }
      } catch (err) {
          alert("Failed to save assignment.");
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

  const handleDuplicateRole = async (roleId: string) => alert("Feature: Duplicate Role " + roleId);
  
  const handleRemoveRole = async (roleId: string) => {
     if(confirm("Remove this role?")) {
         setRoles(prev => prev.filter(r => r.id.toString() !== roleId.toString()));
     }
  };

  // --- 3. INSPECTOR LOGIC ---
  const inspectorActor = useMemo(() => {
      if (!inspectingActorId) return null;
      return actors.find(a => a.id === inspectingActorId);
  }, [inspectingActorId, actors]);

  const inspectorStats = useMemo(() => {
      const assignments: Record<number, string> = {};
      roles.forEach(role => {
          if (role.selectedActorIds.includes(inspectingActorId)) {
              role.sceneIds.forEach((sid: number) => {
                  assignments[sid] = assignments[sid] ? `${assignments[sid]} + ${role.name}` : role.name;
              });
          }
      });
      return {
          assignments,
          assignedRoleNames: roles.filter(r => r.selectedActorIds.includes(inspectingActorId)).map(r => r.name)
      };
  }, [roles, inspectingActorId]);


  // --- RENDER ---
  if (loading) return <div className="h-screen bg-zinc-950 flex items-center justify-center text-white"><Loader2 className="animate-spin text-blue-500 mr-2"/> Loading {productionTitle}...</div>;

  return (
    <div className="h-screen flex flex-col bg-zinc-950 text-white overflow-hidden">
        
        {/* TOP BAR */}
        <header className="h-14 border-b border-white/10 flex items-center justify-between px-4 bg-zinc-900 shrink-0 z-20">
            <div className="flex gap-4 items-center">
                 <div className="text-xs font-bold text-zinc-500 uppercase tracking-widest border-r border-zinc-700 pr-4 mr-1">
                    {productionTitle}
                 </div>

                 <button 
                    onClick={() => setViewMode('workspace')}
                    className={`text-xs font-black uppercase tracking-widest px-3 py-1.5 rounded transition-all ${viewMode === 'workspace' ? 'bg-white text-black' : 'text-zinc-500 hover:text-white'}`}
                 >
                    Workspace
                 </button>
                 <button 
                    onClick={() => setViewMode('chemistry')}
                    className={`text-xs font-black uppercase tracking-widest px-3 py-1.5 rounded transition-all ${viewMode === 'chemistry' ? 'bg-purple-600 text-white' : 'text-zinc-500 hover:text-purple-400'}`}
                 >
                    Chemistry
                 </button>
            </div>
            
            {/* ACTOR DRAWER */}
            <div className="flex items-center gap-2 overflow-x-auto max-w-[50vw] no-scrollbar">
                 <span className="text-[9px] font-bold text-zinc-600 uppercase mr-2 shrink-0">Cast Drawer:</span>
                 {actors.length === 0 && <span className="text-xs text-zinc-600 italic">No actors found</span>}
                 {actors.map(actor => (
                     <div 
                        key={actor.id}
                        draggable
                        onDragStart={(e) => e.dataTransfer.setData("actorId", actor.id.toString())}
                        onClick={() => setInspectingActorId(actor.id)}
                        className={`w-8 h-8 rounded-full border border-white/10 shrink-0 overflow-hidden cursor-grab active:cursor-grabbing hover:border-blue-500 transition-colors
                            ${inspectingActorId === actor.id ? 'ring-2 ring-blue-500' : ''}
                        `}
                        title={actor.Performer}
                     >
                        <img alt="Headshot" src={actor.Headshot} className="w-full h-full object-cover" />
                     </div>
                 ))}
            </div>
        </header>

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
                        onSelectRole={(r) => {}}
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