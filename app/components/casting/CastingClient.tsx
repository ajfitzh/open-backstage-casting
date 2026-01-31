"use client";

import React, { useState, useEffect } from 'react';
import { updateCastAssignment, getCastingData, getScenes } from '@/app/lib/baserow';
import CastWorkspace from './CastWorkspace';
import CastingInspector from './CastingInspector';
import ChemistryWorkspace from './ChemistryWorkspace';
import { LayoutGrid, Scale, X } from "lucide-react";

interface Props {
  productionId: number;
  productionTitle: string;
  masterShowId: number | null;
  initialScenes: any[];
  initialAuditionees: any[];
  initialAssignments: any[];
}

export default function CastingClient({ 
  productionId, 
  productionTitle, 
  masterShowId,
  initialScenes = [],
  initialAuditionees = [],
  initialAssignments = []
}: Props) {
  const [activeTab, setActiveTab] = useState<'grid' | 'chemistry'>('grid'); // Simple state toggle
  const [loading, setLoading] = useState(false);
  const [scenes, setScenes] = useState(initialScenes);
  const [auditionees, setAuditionees] = useState(initialAuditionees);
  const [assignments, setAssignments] = useState(initialAssignments);
  const [selectedActor, setSelectedActor] = useState<any>(null);

  useEffect(() => {
    async function refreshData() {
      if (!productionId || (scenes.length > 0 && scenes[0].productionId === productionId)) return;
      setLoading(true);
      const [newScenes, newCasting] = await Promise.all([
        getScenes(productionId),
        getCastingData(productionId)
      ]);
      setScenes(newScenes);
      setAuditionees(newCasting.auditionees);
      setAssignments(newCasting.assignments);
      setLoading(false);
    }
    refreshData();
  }, [productionId]);

  const handleConfirmRole = async (roleId: string | number, actorId: number) => {
    const assignmentId = typeof roleId === 'string' ? parseInt(roleId) : roleId;
    const currentAssignment = assignments.find(a => a.id === assignmentId);
    const isAlreadyCast = currentAssignment?.personId === actorId;
    const newActorId = isAlreadyCast ? null : actorId;

    const previousAssignments = [...assignments];
    setAssignments(prev => prev.map(a => 
      a.id === assignmentId 
        ? { ...a, personId: newActorId, name: newActorId ? auditionees.find(act => act.id === actorId)?.name : "Unassigned" } 
        : a
    ));

    const result = await updateCastAssignment(assignmentId, newActorId);
    if (!result) {
      setAssignments(previousAssignments);
      alert("Failed to update Baserow.");
    }
  };

  if (loading) return <div className="h-screen bg-zinc-950 flex items-center justify-center text-zinc-500">Syncing...</div>;

  return (
    <div className="h-screen flex flex-col overflow-hidden bg-zinc-950 text-white">
      
      {/* MANUAL TAB HEADER */}
      <div className="px-6 py-2 border-b border-white/5 bg-zinc-900/50 flex justify-between items-center shrink-0">
        <div className="flex bg-black/40 border border-white/5 p-1 rounded-lg">
          <button 
            onClick={() => setActiveTab('grid')}
            className={`flex items-center gap-2 px-4 py-1.5 rounded-md text-xs font-bold transition-all ${activeTab === 'grid' ? 'bg-zinc-800 text-white shadow-sm' : 'text-zinc-500 hover:text-zinc-300'}`}
          >
            <LayoutGrid size={14} /> Grid View
          </button>
          <button 
            onClick={() => setActiveTab('chemistry')}
            className={`flex items-center gap-2 px-4 py-1.5 rounded-md text-xs font-bold transition-all ${activeTab === 'chemistry' ? 'bg-zinc-800 text-white shadow-sm' : 'text-zinc-500 hover:text-zinc-300'}`}
          >
            <Scale size={14} /> Chemistry
          </button>
        </div>

        <div className="text-right">
          <h2 className="text-sm font-bold leading-none">{productionTitle}</h2>
          <p className="text-[10px] text-zinc-500 uppercase font-black">ID: {productionId}</p>
        </div>
      </div>

      {/* MAIN CONTENT AREA */}
      <div className="flex-1 flex overflow-hidden">
        <div className="flex-1 flex flex-col overflow-hidden">
          {activeTab === 'grid' ? (
            <CastWorkspace 
              roles={assignments} 
              scenes={scenes}
              onConfirmRole={handleConfirmRole}
              onSelectRole={(role: any) => {
                const actor = auditionees.find(a => a.id === role.personId);
                setSelectedActor(actor || null);
              }}
              onAddRole={() => {}} onRemoveRole={() => {}} onDuplicateRole={() => {}} onDropActor={() => {}} onRemoveActor={() => {}} onToggleScene={() => {}}
            />
          ) : (
            <ChemistryWorkspace 
              roles={assignments}
              onConfirmRole={handleConfirmRole}
              onDropActor={() => {}}
              onRemoveActor={() => {}}
            />
          )}
        </div>

        {/* INSPECTOR */}
        {selectedActor && (
          <aside className="w-80 border-l border-white/5 bg-zinc-900 flex flex-col">
            <CastingInspector 
              actor={selectedActor} 
              allScenes={scenes}
              onClose={() => setSelectedActor(null)}
              stats={{
                 assignments: {},
                 assignedRoleNames: assignments.filter(a => a.personId === selectedActor.id).map(a => a.role)
              }}
            />
          </aside>
        )}
      </div>
    </div>
  );
}