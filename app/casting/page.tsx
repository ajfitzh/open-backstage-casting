/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import React, { useState, useEffect, useMemo } from 'react';
import { Loader2, Save } from 'lucide-react';
import { getRoles, getAuditionSlots, getScenes, updateRole } from '@/app/lib/baserow'; 

// Import your components
import CastWorkspace from '@/app/components/casting/CastWorkspace';
import ChemistryWorkspace from '@/app/components/casting/ChemistryWorkspace';
import CastingInspector from '@/app/components/casting/CastingInspector';

// --- CONFIG ---
const TARGET_SHOW_STRING = "Little Mermaid"; 

export default function CastingPage() {
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
        try {
            const [roleRows, auditionRows, sceneRows] = await Promise.all([
                getRoles(), 
                getAuditionSlots(),
                getScenes()
            ]);

            // Filter for current show
            const showRoles = roleRows.filter((r: any) => {
                const s = r["Master Show Database"]?.[0]?.value || "";
                return s.includes(TARGET_SHOW_STRING) || s.includes("Mermaid");
            });

            // Process Scenes (Sort by Act/Scene)
            const sortedScenes = sceneRows
                .filter((s: any) => s["Production"]?.[0]?.value?.includes(TARGET_SHOW_STRING) || s["Production"]?.[0]?.value?.includes("Mermaid"))
                .sort((a: any, b: any) => a.id - b.id);

            // Process Actors
            const showActors = auditionRows
                .filter((a: any) => {
                     const p = a["Production"]?.[0]?.value || "";
                     return p.includes(TARGET_SHOW_STRING) || p.includes("Mermaid");
                })
                .map((a: any) => ({
                    ...a,
                    // Normalize fields for the components
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

            // Process Roles (Hydrate with Actor Objects)
            const processedRoles = showRoles.map((r: any) => {
                // Parse Scene Data JSON or CSV
                let sceneIds: number[] = [];
                if (r["Scene Data"]) {
                    try {
                        const parsed = JSON.parse(r["Scene Data"]); // { "1": "scene", "2": "song" }
                        // Convert your old map format to just IDs for the new Workspace
                        sceneIds = Object.keys(parsed).map(Number);
                    } catch(e) { /* ignore */ }
                }

                // Get Assigned Actor (Confirmed)
                const assignedId = r["Assigned Actor"]?.[0]?.id; // This is PersonID
                
                // Find the actor object using PersonID
                const assignedActor = showActors.find((a: any) => a.personId === assignedId);

                return {
                    id: r.id,
                    name: r["Role Name"] || r.Name,
                    type: r["Role Type"]?.value || "Ensemble",
                    // Candidates: Start with just the assigned actor if any
                    actors: assignedActor ? [assignedActor] : [],
                    // Selected: The confirmed cast member
                    selectedActorIds: assignedActor ? [assignedActor.id] : [], // Use Audition ID for UI
                    selectedActorId: assignedActor ? assignedActor.id : null, // For Chemistry (Single)
                    sceneIds: sceneIds
                };
            });

            setRoles(processedRoles);
            setActors(showActors);
            setScenes(sortedScenes);

        } catch (e) {
            console.error("Load failed:", e);
        } finally {
            setLoading(false);
        }
    }
    load();
  }, []);

  // --- 2. EVENT HANDLERS ---

  // Handle Drag & Drop: Add candidate to role
  const handleDropActor = (e: React.DragEvent, roleId: string) => {
    e.preventDefault();
    const actorId = parseInt(e.dataTransfer.getData("actorId"));
    if (!actorId) return;

    const actor = actors.find(a => a.id === actorId);
    if (!actor) return;

    setRoles(prev => prev.map(role => {
        if (role.id.toString() !== roleId.toString()) return role;
        // Don't add if already there
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

  // Confirm Casting (Save to DB)
  const handleConfirmRole = async (roleId: string, actorId: number) => {
      const role = roles.find(r => r.id.toString() === roleId.toString());
      if (!role) return;

      const actor = actors.find(a => a.id === actorId);
      if (!actor) return;

      const isSelecting = !role.selectedActorIds.includes(actorId);

      // UI Update
      setRoles(prev => prev.map(r => {
          if (r.id.toString() !== roleId.toString()) return r;
          
          // Toggle selection
          let newSelected = r.selectedActorIds;
          if (isSelecting) newSelected = [...newSelected, actorId]; // Allow multi-cast for now?
          else newSelected = newSelected.filter((id: number) => id !== actorId);

          return { 
              ...r, 
              selectedActorIds: isSelecting ? [actorId] : [], // Forcing Single Cast for now to match DB
              selectedActorId: isSelecting ? actorId : null 
          };
      }));

      // DB Update
      // Note: Baserow expects Person ID, not Audition ID.
      try {
          const payload = isSelecting ? { "Assigned Actor": [actor.personId] } : { "Assigned Actor": [] };
          await updateRole(parseInt(roleId), payload);
      } catch (err) {
          alert("Failed to save assignment to database.");
          console.error(err);
      }
  };

  const handleToggleScene = async (roleId: string, sceneId: number) => {
      // 1. Update Local State
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

      // 2. Save to Baserow (as JSON string in "Scene Data")
      // We convert [1, 2, 5] back to { "1": "scene", "2": "scene" } for compatibility
      const sceneMap: Record<string, string> = {};
      newSceneIds.forEach(id => sceneMap[id] = "scene"); // Defaulting to 'scene' type for toggle
      
      await updateRole(parseInt(roleId), { "Scene Data": JSON.stringify(sceneMap) });
  };

  const handleDuplicateRole = async (roleId: string) => {
     alert("Feature: Duplicate Role " + roleId);
  };
  
  const handleRemoveRole = async (roleId: string) => {
     if(confirm("Remove this role?")) {
         // Add DB delete logic here
         setRoles(prev => prev.filter(r => r.id.toString() !== roleId.toString()));
     }
  };

  // --- 3. DERIVED DATA FOR INSPECTOR ---
  const inspectorActor = useMemo(() => {
      if (!inspectingActorId) return null;
      return actors.find(a => a.id === inspectingActorId);
  }, [inspectingActorId, actors]);

  const inspectorStats = useMemo(() => {
      // Create a map of { sceneId: "Role Name + Role Name" } for the conflict checker
      const assignments: Record<number, string> = {};
      
      roles.forEach(role => {
          // If this role has a selected actor, and that actor is the one being inspected...
          // Actually, the inspector needs to know ALL roles in a scene to show context,
          // OR it needs to know if the *inspected actor* is in that scene via a role.
          
          if (role.selectedActorIds.includes(inspectingActorId)) {
              role.sceneIds.forEach((sid: number) => {
                  assignments[sid] = assignments[sid] ? `${assignments[sid]} + ${role.name}` : role.name;
              });
          }
      });

      return {
          assignments, // Scenes this actor is in
          assignedRoleNames: roles.filter(r => r.selectedActorIds.includes(inspectingActorId)).map(r => r.name)
      };
  }, [roles, inspectingActorId]);


  if (loading) return <div className="h-screen bg-zinc-950 flex items-center justify-center text-white"><Loader2 className="animate-spin text-blue-500"/></div>;

  return (
    <div className="h-screen flex flex-col bg-zinc-950 text-white overflow-hidden">
        
        {/* TOP BAR */}
        <header className="h-14 border-b border-white/10 flex items-center justify-between px-4 bg-zinc-900 shrink-0 z-20">
            <div className="flex gap-4">
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
            
            {/* ACTOR DRAWER (Sidebar Source) */}
            <div className="flex items-center gap-2 overflow-x-auto max-w-[50vw] no-scrollbar">
                 <span className="text-[9px] font-bold text-zinc-600 uppercase mr-2 shrink-0">Cast Drawer:</span>
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
                        <img src={actor.Headshot} className="w-full h-full object-cover" />
                     </div>
                 ))}
            </div>
        </header>

        <div className="flex-1 overflow-hidden relative flex">
            {/* MAIN WORKSPACE */}
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
                        onSelectRole={(r) => { /* Optional: Highlight logic */ }}
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

            {/* INSPECTOR (Right Sidebar) */}
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