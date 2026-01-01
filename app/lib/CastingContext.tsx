/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";
import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { getAuditionees, submitAudition } from './baserow';

// 1. Define the shape of our data to kill the "redlines"
export interface Performer {
  id: number;
  name: string;
  age: number | string;
  height: string;
  dob: string;
  headshotUrl: string | null;
  tenure: string;
  conflicts: string;
  pastRoles: string[];
}

interface CastingContextType {
  performers: Performer[];
  grades: Record<number, any>;
  loading: boolean;
  saveAssessment: (performerId: number, productionId: number, newGrades: any) => Promise<void>;
  refreshData: () => Promise<void>;
}

const CastingContext = createContext<CastingContextType | null>(null);

export function CastingProvider({ children }: { children: React.ReactNode }) {
  const [performers, setPerformers] = useState<Performer[]>([]);
  const [grades, setGrades] = useState<Record<number, any>>({});
  const [loading, setLoading] = useState(true);

  const refreshData = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getAuditionees();
      
      // 2. Map raw Baserow People (599) fields to our App's Performer interface
      const mapped: Performer[] = data.map((row: any) => ({
        id: row.id,
        // Match these exactly to your Baserow field names
        name: row["Full Name"] || "Unnamed Performer",
        age: row["Age"] || "N/A",
        height: row["Height (Feet)"] || "-", 
        dob: row["Date of Birth"] || "",
        headshotUrl: row["Headshot"]?.[0]?.url || null,
        // Status is often a single-select in Baserow, which returns an object
        tenure: typeof row["Status"] === 'object' ? row["Status"]?.value : row["Status"] || "Student",
        conflicts: row["Rehearsal Conflicts"] || "No known conflicts",
        pastRoles: row["Cast/Crew Assignments"] 
          ? row["Cast/Crew Assignments"].map((a: any) => a.value) 
          : [],
      }));

      setPerformers(mapped);
    } catch (e) {
      console.error("Baserow Sync Error:", e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshData();
  }, [refreshData]);

  // 3. The new "Save" logic that creates a record in the Auditions (630) table
  const saveAssessment = async (performerId: number, productionId: number, newGrades: any) => {
    // Optimistic Update: Show the score in the UI immediately
    setGrades(prev => ({
      ...prev,
      [performerId]: newGrades
    }));

    try {
      // POSTs a new row to the Auditions table
      await submitAudition(performerId, productionId, newGrades);
      console.log(`Audition record created for performer ${performerId}`);
    } catch (e) {
      console.error("Failed to save audition record:", e);
      alert("Error saving to Baserow. Check console.");
    }
  };

  return (
    <CastingContext.Provider value={{ 
      performers, 
      grades, 
      saveAssessment, 
      loading, 
      refreshData 
    }}>
      {children}
    </CastingContext.Provider>
  );
}

export const useCasting = () => {
  const context = useContext(CastingContext);
  if (!context) {
    throw new Error("useCasting must be used within a CastingProvider");
  }
  return context;
};