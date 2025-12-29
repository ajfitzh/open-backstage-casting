"use client";
import React, { createContext, useContext, useState } from 'react';
import { Performer, Role, Scene, Assignment, SceneAssignment } from './types';

interface CastingContextType {
  performers: Performer[];
  roles: Role[];
  scenes: Scene[];
  assignments: Assignment[];
  sceneAssignments: SceneAssignment[];
  getPerformerStats: (personId: number) => Performer['stats'];
}

const CastingContext = createContext<CastingContextType | undefined>(undefined);

export function CastingProvider({ children }: { children: React.ReactNode }) {
  // Mock Data for Phase 1 - We will replace with Baserow API later
  const [performers] = useState<Performer[]>([
    { id: 1, name: "Sarah Miller", vocalRange: "Soprano", danceLevel: "Advanced" },
    { id: 2, name: "Timmy Smith", vocalRange: "Tenor", danceLevel: "Beginner" }
  ]);
  
  const [scenes] = useState<Scene[]>([
    { id: 101, name: "Kansas", act: 1, weight: 'Medium' },
    { id: 102, name: "Munchkinland", act: 1, weight: 'Large' },
    { id: 201, name: "Emerald City", act: 2, weight: 'Large' }
  ]);

  const [assignments] = useState<Assignment[]>([
    { id: 1, personId: 1, roleId: 501 }
  ]);

  const [sceneAssignments] = useState<SceneAssignment[]>([
    { id: 1, roleId: 501, sceneId: 101 },
    { id: 2, roleId: 501, sceneId: 201 }
  ]);

  const getPerformerStats = (personId: number) => {
    const roles = assignments.filter(a => a.personId === personId).map(a => a.roleId);
    const sceneIds = sceneAssignments.filter(sa => roles.includes(sa.roleId)).map(sa => sa.sceneId);
    const assignedScenes = scenes.filter(s => sceneIds.includes(s.id));

    return {
      sceneCount: assignedScenes.length,
      act1: assignedScenes.some(s => s.act === 1),
      act2: assignedScenes.some(s => s.act === 2)
    };
  };

  return (
    <CastingContext.Provider value={{ performers, roles: [], scenes, assignments, sceneAssignments, getPerformerStats }}>
      {children}
    </CastingContext.Provider>
  );
}

export const useCasting = () => {
  const context = useContext(CastingContext);
  if (!context) throw new Error('useCasting must be used within CastingProvider');
  return context;
};