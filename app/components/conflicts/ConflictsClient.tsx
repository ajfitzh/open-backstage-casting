"use client";

import React, { useMemo, useState } from "react";
import { 
  Calendar, 
  Clock, 
  Search, 
  Filter, 
  Plus, 
  User
} from "lucide-react";
import ConflictAnalysisDashboard from "./ConflictAnalysisDashboard";

interface Conflict {
  id: number;
  personId?: number;
  personName: string;
  type: string;
  minutes: number;
  submittedVia: string;
  notes: string;
  date: string;
  dateObj: Date;
  eventId?: number; // Added to support linkage
}

interface Props {
  production: any;
  initialConflicts: Conflict[];
  initialEvents?: any[]; // Added for the Dashboard
}

export default function ConflictsClient({ 
  production, 
  initialConflicts, 
  initialEvents = [] 
}: Props) {
  
  // --- State ---
  const [filterText, setFilterText] = useState("");
  const [selectedType, setSelectedType] = useState<string | null>(null);
  const [selectedPersonId, setSelectedPersonId] = useState<number | null>(null);

  // --- Derived Data ---
  
  // 1. Extract Unique People for the Sidebar
  const uniquePeople = useMemo(() => {
    const map = new Map();
    initialConflicts.forEach(c => {
      if (!map.has(c.personId)) {
        map.set(c.personId, { id: c.personId, name: c.personName });
      }
    });
    return Array.from(map.values()).sort((a: any, b: any) => a.name.localeCompare(b.name));
  }, [initialConflicts]);

  // 2. Calculate Cast Size (For Dashboard Analytics)
  const uniquePeopleCount = useMemo(() => {
    return uniquePeople.length > 0 ? uniquePeople.length : 30; // Fallback to 30 if empty
  }, [uniquePeople]);

  // 3. Filter Conflicts
  const filteredConflicts = useMemo(() => {
    return initialConflicts.filter(c => {
      const matchesSearch = c.personName.toLowerCase().includes(filterText.toLowerCase()) || 
                            c.notes.toLowerCase().includes(filterText.toLowerCase());
      const matchesType = selectedType ? c.type === selectedType : true;
      const matchesPerson = selectedPersonId ? c.personId === selectedPersonId : true;

      return matchesSearch && matchesType && matchesPerson;
    });
  }, [initialConflicts, filterText, selectedType, selectedPersonId]);

  // 4. Group by Date
  const groupedConflicts = useMemo(() => {
    const groups: Record<string, Conflict[]> = {};
    
    filteredConflicts.forEach(c => {
      // Handle "Undated" gracefully
      const dateKey = isNaN(c.dateObj.getTime()) ? "Unscheduled" : c.dateObj.toLocaleDateString('en-US', { 
        weekday: 'long', 
        month: 'short', 
        day: 'numeric' 
      });
      
      if (!groups[dateKey]) groups[dateKey] = [];
      groups[dateKey].push(c);
    });
    
    return groups;
  }, [filteredConflicts]);

  // --- Helpers ---

  const getBadgeColor = (type: string) => {
    switch (type?.toLowerCase()) {
      case "absent": return "bg-red-500/20 text-red-400 border-red-500/30";
      case "late": return "bg-amber-500/20 text-amber-400 border-amber-500/30";
      case "leave early": return "bg-blue-500/20 text-blue-400 border-blue-500/30";
      default: return "bg-zinc-700 text-zinc-300 border-zinc-600";
    }
  };

  return (
    <div className="flex h-full text-white font-sans">
      
      {/* 🟢 SIDEBAR: Filters */}
      <aside className="w-72 bg-zinc-900 border-r border-white/10 flex flex-col shrink-0">
        <div className="p-6 border-b border-white/10">
          <h2 className="text-sm font-black uppercase tracking-widest text-zinc-500 mb-4">Filters</h2>
          
          {/* Search */}
          <div className="relative mb-6">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" size={14} />
            <input 
              type="text"
              placeholder="Search conflicts..."
              value={filterText}
              onChange={(e) => setFilterText(e.target.value)}
              className="w-full bg-zinc-950 border border-white/10 rounded-md py-2 pl-9 pr-3 text-sm focus:border-blue-500 focus:outline-none transition-colors"
            />
          </div>

          {/* Type Filter */}
          <div className="space-y-2 mb-6">
             <label className="text-xs font-bold text-zinc-400 uppercase">Conflict Type</label>
             <div className="flex flex-wrap gap-2">
                {["Absent", "Late", "Leave Early"].map((type) => (
                  <button
                    key={type}
                    onClick={() => setSelectedType(selectedType === type ? null : type)}
                    className={`px-3 py-1.5 rounded-md text-xs font-bold border transition-all ${
                      selectedType === type 
                        ? getBadgeColor(type) + " border-opacity-100 bg-opacity-30" 
                        : "bg-zinc-800 border-transparent text-zinc-400 hover:bg-zinc-700"
                    }`}
                  >
                    {type}
                  </button>
                ))}
             </div>
          </div>
        </div>

        {/* People List */}
        <div className="flex-1 overflow-y-auto custom-scrollbar p-4">
          <div className="flex justify-between items-center mb-2 px-2">
            <label className="text-xs font-bold text-zinc-400 uppercase">Filter by Actor</label>
            {selectedPersonId && (
              <button onClick={() => setSelectedPersonId(null)} className="text-[10px] text-blue-400 hover:underline">
                Clear
              </button>
            )}
          </div>
          
          <div className="space-y-1">
            {uniquePeople.map((p: any) => (
              <button
                key={p.id}
                onClick={() => setSelectedPersonId(selectedPersonId === p.id ? null : p.id)}
                className={`w-full flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors ${
                  selectedPersonId === p.id 
                    ? "bg-blue-600 text-white" 
                    : "text-zinc-400 hover:bg-zinc-800 hover:text-white"
                }`}
              >
                <div className={`w-2 h-2 rounded-full ${selectedPersonId === p.id ? "bg-white" : "bg-zinc-600"}`} />
                <span className="truncate">{p.name}</span>
              </button>
            ))}
          </div>
        </div>
      </aside>

      {/* 🟢 MAIN CONTENT */}
      <div className="flex-1 flex flex-col bg-zinc-950 h-full overflow-hidden">
        
        {/* Header */}
        <header className="h-16 border-b border-white/10 bg-zinc-950/50 backdrop-blur-md flex items-center justify-between px-8 shrink-0 z-10">
          <div className="flex items-center gap-4">
            <h1 className="text-xl font-bold flex items-center gap-3">
              <Calendar className="text-blue-500" /> 
              Conflicts Log
            </h1>
            <div className="h-5 w-px bg-white/20" />
            <span className="text-sm text-zinc-400">{production.title}</span>
            <span className="bg-zinc-800 text-zinc-400 text-xs px-2 py-0.5 rounded-full font-mono">
              {filteredConflicts.length} entries
            </span>
          </div>

          <button className="bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-md text-sm font-bold flex items-center gap-2 transition-colors">
            <Plus size={16} /> Log New Conflict
          </button>
        </header>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto custom-scrollbar p-8">
          
          {/* 📊 DASHBOARD INSERTION */}
          <div className="mb-8">
            <ConflictAnalysisDashboard 
              conflicts={initialConflicts}
              events={initialEvents}
              castSize={uniquePeopleCount} 
            />
          </div>

          {Object.keys(groupedConflicts).length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-zinc-500 py-10">
              <div className="w-16 h-16 rounded-full bg-zinc-900 flex items-center justify-center mb-4 border border-white/10">
                <Filter size={24} className="opacity-50" />
              </div>
              <p>No conflicts match your current filters.</p>
              <button 
                onClick={() => { setFilterText(""); setSelectedType(null); setSelectedPersonId(null); }}
                className="mt-4 text-sm text-blue-400 hover:underline"
              >
                Clear all filters
              </button>
            </div>
          ) : (
            <div className="space-y-8 max-w-5xl mx-auto pb-20">
              {Object.entries(groupedConflicts).map(([date, conflicts]) => (
                <div key={date} className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                  {/* Date Header */}
                  <div className="flex items-center gap-4 mb-4 sticky top-0 bg-zinc-950/95 backdrop-blur py-2 z-10 border-b border-white/5">
                    <div className="w-2 h-2 rounded-full bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.5)]" />
                    <h3 className="text-sm font-bold uppercase tracking-widest text-zinc-300">{date}</h3>
                  </div>

                  {/* Conflict Cards Grid */}
                  <div className="grid grid-cols-1 gap-3">
                    {conflicts.map((conflict) => (
                      <div 
                        key={conflict.id} 
                        className="group bg-zinc-900/50 hover:bg-zinc-900 border border-white/5 hover:border-white/10 rounded-lg p-4 transition-all duration-200 flex flex-col md:flex-row md:items-center gap-4"
                      >
                        {/* Left: Type Indicator */}
                        <div className="shrink-0">
                          <span className={`inline-block border px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider min-w-[80px] text-center ${getBadgeColor(conflict.type)}`}>
                            {conflict.type}
                          </span>
                        </div>

                        {/* Middle: Person & Notes */}
                        <div className="flex-1">
                          <div className="flex items-baseline gap-3">
                            <h4 className="font-bold text-white text-base">{conflict.personName}</h4>
                            {conflict.minutes > 0 && (
                                <span className="flex items-center gap-1 text-xs text-amber-400 font-mono">
                                    <Clock size={12} /> {conflict.minutes} mins
                                </span>
                            )}
                          </div>
                          
                          {conflict.notes ? (
                            <p className="text-zinc-400 text-sm mt-1">{conflict.notes}</p>
                          ) : (
                            <p className="text-zinc-600 text-xs mt-1 italic">No additional notes.</p>
                          )}
                        </div>

                        {/* Right: Meta */}
                        <div className="shrink-0 flex flex-col items-end gap-2 text-right">
                           <div className="flex items-center gap-2 text-xs text-zinc-500">
                              <span>via {conflict.submittedVia}</span>
                              <div className="w-1 h-1 bg-zinc-700 rounded-full" />
                              <User size={12} />
                           </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}