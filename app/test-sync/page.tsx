/* eslint-disable react-hooks/rules-of-hooks */
/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useState } from 'react';
import { 
  getAuditionees, 
  getSeasonsAndShows, 
  getAuditionSlots, 
  updateAuditionSlot 
} from '@/app/lib/baserow';

export default function TestSyncPage() {
  const [results, setResults] = useState<any>(null);
  const [lastAction, setLastAction] = useState<string>(""); // To track what we pulled
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<string>("Idle");

  // TEST 1: Pull People (Table 599)
  const runPullPeople = async () => {
    setLoading(true);
    setStatus("Pulling People (Table 599)...");
    try {
      const data = await getAuditionees();
      setResults(data);
      setLastAction("people");
      setStatus(`✅ Success! Loaded ${data.length} people.`);
    } catch (e: any) {
      setResults({ error: e.message });
      setStatus("❌ Pull Failed");
    } finally {
      setLoading(false);
    }
  };

  // TEST 2: Pull Audition Slots (Table 630)
  const runPullSlots = async () => {
    setLoading(true);
    setStatus("Pulling Audition Slots (Table 630)...");
    try {
      const data = await getAuditionSlots();
      setResults(data);
      setLastAction("slots");
      setStatus(`✅ Success! Loaded ${data.length} slots.`);
    } catch (e: any) {
      setResults({ error: e.message });
      setStatus("❌ Pull Failed");
    } finally {
      setLoading(false);
    }
  };

  // TEST 3: Verify Show ID (Table 600)
  const verifyWonkaID = async () => {
    setLoading(true);
    setStatus("Searching for 'Little Mermaid' in Table 600...");
    try {
      const { productions } = await getSeasonsAndShows();
      
      // Note: Baserow usually uses "Title" or "Name". We check both.
      const show = productions.find((p: any) => {
        const name = p.Title || p.Name || "";
        return name.toLowerCase().includes("mermaid");
      });

      if (show) {
        setResults(show);
        setStatus(`✅ Found it! ID: ${show.id} | Title: ${show.Title || show.Name}`);
      } else {
        setResults({ available_productions: productions });
        setStatus("❌ Could not find 'Mermaid' in the list.");
      }
    } catch (e: any) {
      setResults({ error: e.message });
      setStatus("❌ Error fetching productions.");
    } finally {
      setLoading(false);
    }
  };

  // TEST 4: Patch (Table 630)
  const runPatchTest = async () => {
    // Safety Check: Force user to pull SLOTS first
    if (lastAction !== "slots" || !results || !results[0]?.id) {
      alert("⚠️ STOP: Please click 'Test PULL (Slots)' first.\n\nWe need a valid Audition Slot ID to patch. Patching a Person ID will break things!");
      return;
    }

    const targetId = results[0].id; // Patch the first slot in the list
    
    setLoading(true);
    setStatus(`Patching Slot #${targetId} (Table 630)...`);
    
    try {
      const testGrades = {
        acting: 5,
        vocal: 5,
        dance: 5,
        notes: "DIAGNOSTIC TEST: " + new Date().toLocaleTimeString()
      };
      
      const response = await updateAuditionSlot(targetId, testGrades);
      setResults(response);
      setStatus("✅ Patch Successful! Check Baserow for update.");
    } catch (e: any) {
      setResults({ error: e.message });
      setStatus("❌ Patch Failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-10 space-y-8 bg-zinc-950 min-h-screen text-white overflow-auto">
      <header>
        <h1 className="text-3xl font-black uppercase italic text-blue-500">Baserow Diagnostics</h1>
        <div className={`mt-2 inline-block px-3 py-1 rounded-full text-xs font-bold ${status.includes('✅') ? 'bg-emerald-500/20 text-emerald-400' : 'bg-zinc-800 text-zinc-400'}`}>
          Status: {status}
        </div>
      </header>

      <div className="flex flex-wrap gap-4">
        <button onClick={runPullPeople} disabled={loading} className="px-6 py-3 bg-zinc-800 text-white font-black uppercase text-xs rounded-xl hover:bg-zinc-700 disabled:opacity-50">
          1. Test PULL (People)
        </button>

        <button onClick={runPullSlots} disabled={loading} className="px-6 py-3 bg-white text-black font-black uppercase text-xs rounded-xl hover:bg-zinc-200 disabled:opacity-50">
          2. Test PULL (Slots)
        </button>
        
        <button onClick={runPatchTest} disabled={loading} className="px-6 py-3 bg-blue-600 text-white font-black uppercase text-xs rounded-xl hover:bg-blue-500 disabled:opacity-50">
          3. Test PATCH (First Slot)
        </button>

        <button onClick={verifyWonkaID} disabled={loading} className="px-6 py-3 bg-amber-500 text-black font-black uppercase text-xs rounded-xl hover:bg-amber-400 disabled:opacity-50">
          4. Verify Show ID
        </button>
      </div>

      <div className="bg-black border border-white/10 rounded-2xl p-6">
        <h2 className="text-xs font-bold uppercase text-zinc-500 mb-4 tracking-widest">API Response</h2>
        <pre className="text-[10px] text-blue-300 overflow-auto max-h-[500px] p-4 bg-zinc-900/50 rounded-lg whitespace-pre-wrap font-mono">
          {JSON.stringify(results, null, 2)}
        </pre>
      </div>
    </div>
  );
}