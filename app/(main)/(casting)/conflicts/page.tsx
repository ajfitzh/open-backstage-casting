"use client";

import React, { useState, useEffect } from "react";
import { getScenes, getRoles, getAssignments, getPeople } from "@/app/lib/baserow";
import ConflictMatrix from "@/app/components/ConflictMatrix";
import { Loader2 } from "lucide-react";

interface ConflictData {
  scenes: any[];
  roles: any[];
  assignments: any[];
  people: any[];
}

export default function ConflictPage() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<ConflictData>({ scenes: [], roles: [], assignments: [], people: [] });

  useEffect(() => {
    async function load() {
      try {
        // Fetch all 4 tables in parallel
        const [scenes, roles, assignments, people] = await Promise.all([
          getScenes(),
          getRoles(),
          getAssignments(),
          getPeople()
        ]);

        setData({ scenes, roles, assignments, people });
      } catch (e) {
        console.error("Failed to load conflict data", e);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  if (loading) {
    return (
      <div className="h-screen bg-zinc-950 flex items-center justify-center text-white">
        <Loader2 className="animate-spin text-red-500" size={48} />
      </div>
    );
  }

  return (
    <div className="h-screen bg-zinc-950 flex flex-col">
      <ConflictMatrix 
        scenes={data.scenes} 
        roles={data.roles} 
        assignments={data.assignments} 
        people={data.people} 
      />
    </div>
  );
}