// lib/types.ts

export interface Performer {
  id: number; // Table 599
  name: string;
  age: number;
  headshot?: string; // URL to Baserow file
  vocalRange: string;
  tenure: string; // "New Student", "3+ Shows", etc.
  batch: number; // IMPORTANT: Needed for the Batch 1/2/3 filtering
  auditionDetails?: {
    song: string;
    monologue: string;
  };
  danceLevel?: string;
  stats?: {
    sceneCount: number;
    act1: boolean;
    act2: boolean;
  };
}

export interface Role {
  id: number; // Table 609
  name: string;
  productionId: number;
  isEnsemble: boolean;
}

export interface Scene {
  id: number; // Table 627
  name: string;
  act: 1 | 2;
  weight: 'Small' | 'Medium' | 'Large';
}

export interface Assignment {
  id: number; // Table 603
  personId: number;
  roleId: number;
}

export interface SceneAssignment {
  id: number; // Table 628
  roleId: number;
  sceneId: number;
}