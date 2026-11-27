"use client";

import React, { useState, useMemo } from "react";
import { User, X, Calendar, Plus, Trash2, Loader2 } from "lucide-react";
import ConflictAnalysisDashboard from "./ConflictAnalysisDashboard";
import { createShowConflict, deleteShowConflict } from "@/app/actions/admin-crud";
import { VALID_CONFLICT_TYPES } from "@/app/lib/admin-crud-helpers";

interface Conflict {
  id: number;
  personId: number | null;
  personName: string;
  eventId: number | null;
  date: string;
  type: string;
  notes: string;
}

interface Actor {
  id: number;
  name: string;
}

interface Props {
  tenant?: string;
  productionId?: number;
  initialConflicts: Conflict[];
  events: any[];
  showTitle: string;
  actors: Actor[];
}

export default function ConflictsClient({
  tenant = "",
  productionId = 0,
  initialConflicts,
  events,
  showTitle,
  actors,
}: Props) {
  const [conflicts, setConflicts] = useState<Conflict[]>(initialConflicts);
  const [selectedActorId, setSelectedActorId] = useState<number | null>(null);
  const [filterType, setFilterType] = useState<string>("all");

  // Add Conflict Form
  const [showAddForm, setShowAddForm] = useState(false);
  const [personId, setPersonId] = useState("");
  const [eventId, setEventId] = useState("");
  const [conflictType, setConflictType] = useState("Absent");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  const filteredConflicts = useMemo(() => {
    return conflicts.filter((c) => {
      const matchesActor = selectedActorId ? c.personId === selectedActorId : true;
      const matchesType =
        filterType === "all" ? true : (c.type || "").toLowerCase() === filterType.toLowerCase();
      return matchesActor && matchesType;
    });
  }, [conflicts, selectedActorId, filterType]);

  const handleAddConflict = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tenant || !productionId || !personId) return;
    setSaving(true);
    setError(null);
    const res = await createShowConflict(tenant, productionId, {
      personId: Number(personId),
      eventId: eventId ? Number(eventId) : null,
      conflictType,
      notes,
    });
    setSaving(false);
    if (res.success && "conflict" in res && res.conflict) {
      setConflicts((prev) => [res.conflict as Conflict, ...prev]);
      setPersonId("");
      setEventId("");
      setNotes("");
      setShowAddForm(false);
    } else {
      setError(res.error || "Could not add conflict.");
    }
  };

  const handleDeleteConflict = async (id: number) => {
    if (!tenant || !productionId) return;
    if (!confirm("Remove this conflict?")) return;
    setDeletingId(id);
    const res = await deleteShowConflict(tenant, productionId, id);
    setDeletingId(null);
    if (res.success) {
      setConflicts((prev) => prev.filter((c) => c.id !== id));
    }
  };

  return (
    <div className="flex h-full pb-16">
      {/* SIDEBAR FILTERS */}
      <div className="w-64 border-r border-white/10 bg-zinc-900/30 overflow-y-auto custom-scrollbar p-4 space-y-8 shrink-0 hidden md:block">
        <div>
          <h3 className="text-xs font-black text-zinc-500 uppercase tracking-widest mb-3">
            Conflict Type
          </h3>
          <div className="space-y-1">
            {["All", "Absent", "Late", "Leave Early"].map((type) => (
              <button
                key={type}
                onClick={() => setFilterType(type.toLowerCase())}
                className={`w-full text-left px-3 py-2 rounded text-xs font-bold transition-colors ${
                  filterType === type.toLowerCase()
                    ? "bg-blue-600 text-white shadow-lg"
                    : "text-zinc-400 hover:bg-white/5"
                }`}
              >
                {type}
              </button>
            ))}
          </div>
        </div>

        <div>
          <div className="flex justify-between items-center mb-3">
            <h3 className="text-xs font-black text-zinc-500 uppercase tracking-widest">
              Filter by Actor ({actors.length})
            </h3>
            {selectedActorId && (
              <button
                onClick={() => setSelectedActorId(null)}
                className="text-[10px] text-blue-400 hover:text-blue-300 flex items-center gap-1"
              >
                <X size={10} /> Clear
              </button>
            )}
          </div>

          <div className="space-y-1">
            {actors.map((actor) => (
              <button
                key={actor.id}
                onClick={() => setSelectedActorId(actor.id)}
                className={`w-full text-left px-3 py-1.5 rounded text-xs transition-colors flex items-center gap-2 ${
                  selectedActorId === actor.id
                    ? "bg-zinc-800 text-white border border-white/10 shadow-lg"
                    : "text-zinc-500 hover:text-zinc-300 hover:bg-white/5"
                }`}
              >
                <User size={12} />
                <span className="truncate">{actor.name}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* MAIN CONTENT AREA */}
      <div className="flex-1 overflow-y-auto custom-scrollbar p-6 md:p-8">
        <div className="max-w-4xl mx-auto space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl font-black uppercase italic tracking-tight text-white">
                {showTitle || "Production"} Conflicts
              </h1>
              <p className="text-xs text-zinc-500">
                {conflicts.length} logged conflicts across {events.length} rehearsal events
              </p>
            </div>
            {tenant && productionId > 0 && (
              <button
                type="button"
                onClick={() => setShowAddForm((v) => !v)}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-black uppercase tracking-wider transition-colors"
              >
                <Plus size={14} /> Log Conflict
              </button>
            )}
          </div>

          {error && (
            <div className="px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-300 text-xs font-bold">
              {error}
            </div>
          )}

          {showAddForm && (
            <form
              onSubmit={handleAddConflict}
              className="p-5 rounded-2xl bg-zinc-900 border border-blue-500/30 space-y-4"
            >
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-black uppercase tracking-widest text-blue-400">
                  Add Actor Conflict
                </h3>
                <button type="button" onClick={() => setShowAddForm(false)} className="text-zinc-500 hover:text-white">
                  <X size={14} />
                </button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <select
                  required
                  value={personId}
                  onChange={(e) => setPersonId(e.target.value)}
                  className="px-3 py-2 rounded-xl bg-zinc-950 border border-white/10 text-sm text-white"
                >
                  <option value="">Select actor *</option>
                  {actors.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.name}
                    </option>
                  ))}
                </select>
                <select
                  value={eventId}
                  onChange={(e) => setEventId(e.target.value)}
                  className="px-3 py-2 rounded-xl bg-zinc-950 border border-white/10 text-sm text-white"
                >
                  <option value="">Select rehearsal event (optional)</option>
                  {events.map((ev: any) => (
                    <option key={ev.id} value={ev.id}>
                      {ev.date || "TBD"} — {ev.type || "Rehearsal"}
                    </option>
                  ))}
                </select>
                <select
                  value={conflictType}
                  onChange={(e) => setConflictType(e.target.value)}
                  className="px-3 py-2 rounded-xl bg-zinc-950 border border-white/10 text-sm text-white"
                >
                  {VALID_CONFLICT_TYPES.map((ct) => (
                    <option key={ct} value={ct}>
                      {ct}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex gap-3">
                <input
                  placeholder="Notes (e.g., Soccer tournament, arriving at 6:30 PM)..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="flex-1 px-3 py-2 rounded-xl bg-zinc-950 border border-white/10 text-sm text-white"
                />
                <button
                  type="submit"
                  disabled={saving}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-black uppercase disabled:opacity-50"
                >
                  {saving ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
                  Save
                </button>
              </div>
            </form>
          )}

          <ConflictAnalysisDashboard
            conflicts={filteredConflicts}
            events={events}
            castSize={actors.length}
          />

          <div className="grid grid-cols-1 gap-3">
            {filteredConflicts.map((c) => (
              <div
                key={c.id}
                className="bg-zinc-900 border border-white/5 p-4 rounded-xl flex justify-between items-center gap-4 hover:bg-zinc-800/80 transition-colors shadow-sm"
              >
                <div className="flex items-center gap-4 min-w-0">
                  <div
                    className={`w-2 h-10 rounded-full shrink-0 ${
                      c.type === "Absent"
                        ? "bg-red-500 shadow-[0_0_10px_rgba(239,68,68,0.5)]"
                        : "bg-amber-500 shadow-[0_0_10px_rgba(245,158,11,0.5)]"
                    }`}
                  />
                  <div className="min-w-0">
                    <div className="font-bold text-white truncate">{c.personName}</div>
                    <div className="text-xs text-zinc-400">
                      {c.date || "General"} • {c.type || "Absent"}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <div
                    className="text-xs text-zinc-400 max-w-xs text-right truncate"
                    title={c.notes || "No notes provided"}
                  >
                    {c.notes || <span className="italic opacity-50">No notes</span>}
                  </div>
                  {tenant && productionId > 0 && (
                    <button
                      type="button"
                      disabled={deletingId === c.id}
                      onClick={() => handleDeleteConflict(c.id)}
                      className="p-2 rounded-lg text-zinc-500 hover:text-red-400 hover:bg-red-500/10 transition-colors disabled:opacity-50"
                      title="Delete conflict"
                    >
                      {deletingId === c.id ? (
                        <Loader2 size={14} className="animate-spin" />
                      ) : (
                        <Trash2 size={14} />
                      )}
                    </button>
                  )}
                </div>
              </div>
            ))}

            {filteredConflicts.length === 0 && (
              <div className="text-center py-20 border border-dashed border-white/10 rounded-xl bg-zinc-900/20">
                <Calendar className="mx-auto h-10 w-10 text-zinc-600 mb-3" />
                <h3 className="text-lg font-bold text-zinc-300">No conflicts found</h3>
                <p className="text-xs text-zinc-500 mt-1">No conflicts match the current filters.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
