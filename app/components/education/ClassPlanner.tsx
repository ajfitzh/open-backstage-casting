// app/components/education/ClassPlanner.tsx
"use client";

import React, { useMemo, useState } from "react";
import {
  AlertTriangle,
  Building2,
  Calendar,
  CheckCircle2,
  DoorOpen,
  Loader2,
  MapPin,
  Pencil,
  Plus,
  Ruler,
  Save,
  Trash2,
  Users,
  X,
} from "lucide-react";
import {
  assignClassToSpace,
  removeClassroomSpace,
  saveClassroomSpace,
  saveVenueRentalRate,
} from "@/app/actions/reporting";
import {
  detectRoomConflicts,
  evaluateRoomCapacity,
  parseClassTimeRange,
} from "@/app/lib/reporting-helpers";
import type {
  ClassroomPlannerClass,
  ClassroomSpaceItem,
  ClassroomVenueItem,
} from "@/app/lib/db/reporting-repo";

const DAY_OPTIONS = [
  "All Days",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
  "All Week",
];

export default function ClassPlanner({
  tenant,
  initialVenues,
  initialSpaces,
  sessions,
  initialClasses,
}: {
  tenant: string;
  initialVenues: ClassroomVenueItem[];
  initialSpaces: ClassroomSpaceItem[];
  sessions: string[];
  initialClasses: ClassroomPlannerClass[];
}) {
  const [activeTab, setActiveTab] = useState<"board" | "rooms">("board");
  const [venues, setVenues] = useState<ClassroomVenueItem[]>(initialVenues);
  const [spaces, setSpaces] = useState<ClassroomSpaceItem[]>(initialSpaces);
  const [classes, setClasses] = useState<ClassroomPlannerClass[]>(initialClasses);

  // Pick newest session that actually has classes
  const [activeSession, setActiveSession] = useState<string>(() => {
    for (const s of sessions) {
      if (initialClasses.some((c) => c.session === s)) return s;
    }
    return sessions[0] || "";
  });
  const [activeDay, setActiveDay] = useState<string>("All Days");
  const [venueFilterId, setVenueFilterId] = useState<number>(0);
  const [savingId, setSavingId] = useState<number | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  // Room editor state
  const [editingSpaceId, setEditingSpaceId] = useState<number | "new" | null>(null);
  const [roomVenueId, setRoomVenueId] = useState<string>(() =>
    initialVenues[0]?.id ? String(initialVenues[0].id) : ""
  );
  const [roomName, setRoomName] = useState("");
  const [roomCap, setRoomCap] = useState("20");
  const [roomSqFt, setRoomSqFt] = useState("");
  const [roomFloor, setRoomFloor] = useState("");
  const [savingRoom, setSavingRoom] = useState(false);

  // Venue rent inline edit
  const [rentDrafts, setRentDrafts] = useState<Record<number, string>>({});
  const [savingVenueId, setSavingVenueId] = useState<number | null>(null);

  const namedSpaces = useMemo(
    () => spaces.filter((s) => !s.isPlaceholder),
    [spaces]
  );

  const placeholderSpaces = useMemo(
    () => spaces.filter((s) => s.isPlaceholder),
    [spaces]
  );

  const sessionClasses = useMemo(
    () => classes.filter((c) => c.session === activeSession),
    [classes, activeSession]
  );

  const filteredClasses = useMemo(() => {
    return sessionClasses.filter((c) => {
      if (activeDay !== "All Days" && c.day !== activeDay) return false;
      if (venueFilterId > 0 && c.venueId !== venueFilterId) return false;
      return true;
    });
  }, [sessionClasses, activeDay, venueFilterId]);

  const conflicts = useMemo(
    () =>
      detectRoomConflicts(
        sessionClasses
          .filter((c) => c.spaceId && !c.isPlaceholderSpace)
          .map((c) => ({
            id: c.id,
            name: c.name,
            spaceId: c.spaceId,
            day: c.day,
            time: c.time,
          }))
      ),
    [sessionClasses]
  );

  const conflictClassIds = useMemo(() => {
    const set = new Set<number>();
    for (const c of conflicts) {
      set.add(c.classIds[0]);
      set.add(c.classIds[1]);
    }
    return set;
  }, [conflicts]);

  // Dynamic sorted time buckets built from actual class times
  const timeBuckets = useMemo(() => {
    const map = new Map<string, number>();
    for (const c of filteredClasses) {
      const parsed = parseClassTimeRange(c.time);
      if (parsed) {
        if (!map.has(parsed.startLabel)) map.set(parsed.startLabel, parsed.startMinutes);
      } else {
        map.set("TBD Time", 9999);
      }
    }
    if (map.size === 0) {
      return ["4:30 PM", "6:00 PM", "6:30 PM", "7:00 PM"];
    }
    return Array.from(map.entries())
      .sort((a, b) => a[1] - b[1])
      .map(([label]) => label);
  }, [filteredClasses]);

  const visibleRooms = useMemo(() => {
    const base =
      venueFilterId > 0
        ? namedSpaces.filter((s) => s.venueId === venueFilterId)
        : namedSpaces;
    return base.sort((a, b) =>
      `${a.venueName} ${a.roomName}`.localeCompare(`${b.venueName} ${b.roomName}`)
    );
  }, [namedSpaces, venueFilterId]);

  const unassignedClasses = useMemo(
    () => filteredClasses.filter((c) => !c.spaceId || c.isPlaceholderSpace),
    [filteredClasses]
  );

  const unassignedTotalInSession = useMemo(
    () => sessionClasses.filter((c) => !c.spaceId || c.isPlaceholderSpace).length,
    [sessionClasses]
  );

  const handleAssignRoom = async (cls: ClassroomPlannerClass, nextSpaceId: number | null) => {
    setSavingId(cls.id);
    const sp = nextSpaceId ? spaces.find((s) => s.id === nextSpaceId) : null;

    setClasses((prev) =>
      prev.map((c) =>
        c.id === cls.id
          ? {
              ...c,
              spaceId: sp?.id ?? null,
              roomName: sp?.roomName || "Unassigned Room",
              venueId: sp?.venueId ?? null,
              venueName: sp?.venueName || c.location,
              isPlaceholderSpace: !sp || sp.isPlaceholder,
            }
          : c
      )
    );

    const res = await assignClassToSpace(tenant, cls.id, { spaceId: nextSpaceId });
    setSavingId(null);
    if (res.success) {
      setStatusMessage(
        sp ? `Assigned "${cls.name}" to ${sp.venueName} — ${sp.roomName}` : `Cleared room for "${cls.name}"`
      );
      setTimeout(() => setStatusMessage(null), 2600);
    }
  };

  const handleDropOnRoom = async (e: React.DragEvent, targetSpaceId: number) => {
    e.preventDefault();
    const classId = Number(e.dataTransfer.getData("classId"));
    const cls = classes.find((c) => c.id === classId);
    if (!cls) return;
    await handleAssignRoom(cls, targetSpaceId);
  };

  const startEditSpace = (sp?: ClassroomSpaceItem) => {
    if (sp) {
      setEditingSpaceId(sp.id);
      setRoomVenueId(sp.venueId ? String(sp.venueId) : "");
      setRoomName(sp.roomName);
      setRoomCap(sp.capacity != null ? String(sp.capacity) : "");
      setRoomSqFt(sp.squareFootage != null ? String(sp.squareFootage) : "");
      setRoomFloor(sp.floorType || "");
    } else {
      setEditingSpaceId("new");
      setRoomVenueId(venues[0]?.id ? String(venues[0].id) : "");
      setRoomName("");
      setRoomCap("20");
      setRoomSqFt("");
      setRoomFloor("");
    }
  };

  const handleSaveSpace = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!roomName.trim()) return;
    setSavingRoom(true);
    const res = await saveClassroomSpace(tenant, {
      id: typeof editingSpaceId === "number" ? editingSpaceId : null,
      venueId: roomVenueId ? Number(roomVenueId) : null,
      roomName,
      capacity: roomCap ? Number(roomCap) : null,
      squareFootage: roomSqFt ? Number(roomSqFt) : null,
      floorType: roomFloor || null,
    });
    setSavingRoom(false);

    if (res.success) {
      const vName =
        venues.find((v) => v.id === (res.space.venueId ?? -1))?.name || "Unassigned Venue";
      const mapped: ClassroomSpaceItem = {
        id: res.space.id,
        venueId: res.space.venueId ?? null,
        venueName: vName,
        roomName: res.space.roomName,
        capacity: res.space.capacity ?? null,
        squareFootage: res.space.squareFootage ?? null,
        floorType: res.space.floorType || "",
        isPlaceholder: res.space.roomName.trim().toLowerCase() === "unknown",
        classCount:
          typeof editingSpaceId === "number"
            ? spaces.find((s) => s.id === editingSpaceId)?.classCount || 0
            : 0,
      };
      setSpaces((prev) =>
        typeof editingSpaceId === "number"
          ? prev.map((s) => (s.id === editingSpaceId ? mapped : s))
          : [...prev, mapped]
      );
      setEditingSpaceId(null);
      setStatusMessage(`Saved room "${mapped.roomName}"`);
      setTimeout(() => setStatusMessage(null), 2600);
    }
  };

  const handleDeleteSpace = async (sp: ClassroomSpaceItem) => {
    const res = await removeClassroomSpace(tenant, sp.id);
    if (res.success) {
      setSpaces((prev) => prev.filter((s) => s.id !== sp.id));
      setClasses((prev) =>
        prev.map((c) =>
          c.spaceId === sp.id
            ? { ...c, spaceId: null, roomName: "Unassigned Room", isPlaceholderSpace: true }
            : c
        )
      );
    }
  };

  const handleSaveVenueRent = async (venueId: number) => {
    const raw = rentDrafts[venueId];
    if (raw === undefined) return;
    const flatRate = Number(raw) || 0;
    setSavingVenueId(venueId);
    const res = await saveVenueRentalRate(tenant, venueId, flatRate);
    setSavingVenueId(null);
    if (res.success) {
      setVenues((prev) => prev.map((v) => (v.id === venueId ? { ...v, flatRate } : v)));
      setStatusMessage("Saved venue rental rate to database.");
      setTimeout(() => setStatusMessage(null), 2400);
    }
  };

  return (
    <div className="min-h-full bg-zinc-950 text-white p-4 sm:p-6 lg:p-8 space-y-6 pb-20">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4 border-b border-white/10 pb-5">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.25em] text-pink-400 mb-1">
            Academy Logistics &amp; Space Management
          </p>
          <h1 className="text-3xl font-black uppercase italic tracking-tighter flex items-center gap-3">
            <DoorOpen className="text-pink-500 shrink-0" size={30} />
            Classroom &amp; Space Planner
          </h1>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="flex bg-zinc-900 p-1 rounded-xl border border-white/10">
            <button
              type="button"
              onClick={() => setActiveTab("board")}
              className={`px-4 py-2 rounded-lg text-xs font-black uppercase tracking-wider flex items-center gap-1.5 transition-all ${
                activeTab === "board" ? "bg-pink-600 text-white" : "text-zinc-400 hover:text-white"
              }`}
            >
              <Calendar size={14} /> Room Schedule
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("rooms")}
              className={`px-4 py-2 rounded-lg text-xs font-black uppercase tracking-wider flex items-center gap-1.5 transition-all ${
                activeTab === "rooms" ? "bg-pink-600 text-white" : "text-zinc-400 hover:text-white"
              }`}
            >
              <Building2 size={14} /> Rooms &amp; Sizes ({namedSpaces.length})
            </button>
          </div>
        </div>
      </div>

      {statusMessage && (
        <div className="p-3.5 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-xs font-bold flex items-center gap-2">
          <CheckCircle2 size={15} /> {statusMessage}
        </div>
      )}

      {/* ================================================================== */}
      {/* TAB 1: ROOM SCHEDULE BOARD                                         */}
      {/* ================================================================== */}
      {activeTab === "board" && (
        <div className="space-y-5">
          {/* Controls */}
          <div className="bg-zinc-900 border border-white/10 rounded-2xl p-4 flex flex-col lg:flex-row gap-3 items-stretch lg:items-center justify-between">
            <div className="flex flex-wrap items-center gap-2">
              <select
                value={activeSession}
                onChange={(e) => setActiveSession(e.target.value)}
                className="bg-zinc-950 border border-white/15 rounded-xl px-3.5 py-2 text-xs font-black text-white"
              >
                {sessions.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>

              <select
                value={venueFilterId}
                onChange={(e) => setVenueFilterId(Number(e.target.value))}
                className="bg-zinc-950 border border-white/15 rounded-xl px-3.5 py-2 text-xs font-bold text-zinc-200"
              >
                <option value={0}>All Buildings ({namedSpaces.length} Named Rooms)</option>
                {venues
                  .filter((v) => namedSpaces.some((s) => s.venueId === v.id))
                  .map((v) => (
                    <option key={v.id} value={v.id}>
                      {v.name}
                    </option>
                  ))}
              </select>
            </div>

            <div className="flex flex-wrap gap-1">
              {DAY_OPTIONS.map((day) => (
                <button
                  key={day}
                  type="button"
                  onClick={() => setActiveDay(day)}
                  className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all ${
                    activeDay === day
                      ? "bg-white text-black"
                      : "bg-zinc-950 text-zinc-400 hover:text-white border border-white/5"
                  }`}
                >
                  {day === "All Days" ? "All" : day === "All Week" ? "All Wk" : day.slice(0, 3)}
                </button>
              ))}
            </div>
          </div>

          {/* Diagnostics Strip */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="bg-zinc-900 border border-white/10 rounded-2xl p-4">
              <p className="text-[10px] font-black uppercase tracking-widest text-zinc-500">
                {activeSession} Classes
              </p>
              <p className="text-2xl font-black text-white mt-0.5">{sessionClasses.length}</p>
              <p className="text-[11px] text-zinc-400">
                {sessionClasses.length - unassignedTotalInSession} in named rooms •{" "}
                {unassignedTotalInSession} need room assignment
              </p>
            </div>

            <div
              className={`border rounded-2xl p-4 ${
                conflicts.length > 0
                  ? "bg-red-500/10 border-red-500/30"
                  : "bg-zinc-900 border-white/10"
              }`}
            >
              <p className="text-[10px] font-black uppercase tracking-widest text-zinc-400">
                Room Double-Bookings
              </p>
              <p
                className={`text-2xl font-black mt-0.5 ${
                  conflicts.length > 0 ? "text-red-400" : "text-emerald-400"
                }`}
              >
                {conflicts.length}
              </p>
              <p className="text-[11px] text-zinc-400">
                {conflicts.length > 0
                  ? `${conflicts[0].classNames[0]} overlaps ${conflicts[0].classNames[1]} (${conflicts[0].day})`
                  : "No overlapping classes in any named room."}
              </p>
            </div>

            <div className="bg-zinc-900 border border-white/10 rounded-2xl p-4 flex items-center justify-between">
              <div>
                <p className="text-[10px] font-black uppercase tracking-widest text-zinc-500">
                  Placeholder &ldquo;Unknown&rdquo; Rooms
                </p>
                <p className="text-2xl font-black text-amber-400 mt-0.5">
                  {placeholderSpaces.length}
                </p>
                <p className="text-[11px] text-zinc-400">
                  Clean up or rename in Rooms &amp; Sizes tab.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setActiveTab("rooms")}
                className="px-3 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-xs font-bold text-white shrink-0"
              >
                Manage
              </button>
            </div>
          </div>

          {/* Unassigned / Needs Room Column + Named Room Columns */}
          <div className="flex gap-4 overflow-x-auto pb-4">
            {/* Needs Room Assignment Column */}
            <div className="w-80 shrink-0 bg-amber-500/5 border border-amber-500/25 rounded-2xl flex flex-col max-h-[70vh]">
              <div className="p-4 border-b border-amber-500/20 flex items-center justify-between">
                <div>
                  <h3 className="text-xs font-black uppercase tracking-widest text-amber-400 flex items-center gap-1.5">
                    <AlertTriangle size={14} /> Needs Room ({unassignedClasses.length})
                  </h3>
                  <p className="text-[10px] text-zinc-400 mt-0.5">
                    Drag to a room or pick one below
                  </p>
                </div>
              </div>
              <div className="p-3 space-y-2.5 overflow-y-auto flex-1">
                {unassignedClasses.length === 0 ? (
                  <p className="text-xs text-zinc-500 text-center py-8 italic">
                    Every visible class is assigned to a named room!
                  </p>
                ) : (
                  unassignedClasses.map((cls) => (
                    <ClassCard
                      key={cls.id}
                      cls={cls}
                      rooms={namedSpaces}
                      capacity={null}
                      hasConflict={false}
                      saving={savingId === cls.id}
                      onAssign={(spaceId) => handleAssignRoom(cls, spaceId)}
                    />
                  ))
                )}
              </div>
            </div>

            {/* Named Room Columns */}
            {visibleRooms.map((room) => {
              const roomClasses = filteredClasses.filter((c) => c.spaceId === room.id);
              return (
                <div
                  key={room.id}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={(e) => void handleDropOnRoom(e, room.id)}
                  className="w-80 shrink-0 bg-zinc-900/70 border border-white/10 rounded-2xl flex flex-col max-h-[70vh]"
                >
                  <div className="p-4 border-b border-white/10 bg-zinc-950/60">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-blue-400 truncate">
                      {room.venueName}
                    </p>
                    <div className="flex items-center justify-between gap-2 mt-0.5">
                      <h3 className="text-sm font-black text-white truncate">{room.roomName}</h3>
                      <span className="px-2 py-0.5 rounded-full bg-zinc-800 text-[10px] font-mono font-bold text-zinc-300 shrink-0">
                        {room.capacity ? `Cap ${room.capacity}` : "No Cap"}
                      </span>
                    </div>
                    {(room.squareFootage || room.floorType) && (
                      <p className="text-[10px] text-zinc-500 mt-1 flex items-center gap-2">
                        {room.squareFootage && (
                          <span className="inline-flex items-center gap-1">
                            <Ruler size={10} /> {room.squareFootage.toLocaleString()} sq ft
                          </span>
                        )}
                        {room.floorType && <span>• {room.floorType}</span>}
                      </p>
                    )}
                  </div>

                  <div className="p-3 space-y-3 overflow-y-auto flex-1">
                    {roomClasses.length === 0 ? (
                      <div className="border border-dashed border-white/10 rounded-xl p-6 text-center text-[11px] text-zinc-600">
                        Drop a class here to assign it to {room.roomName}
                      </div>
                    ) : (
                      timeBuckets.map((bucket) => {
                        const inSlot = roomClasses.filter((c) => {
                          const parsed = parseClassTimeRange(c.time);
                          return (parsed?.startLabel || "TBD Time") === bucket;
                        });
                        if (inSlot.length === 0) return null;
                        return (
                          <div key={bucket} className="space-y-2">
                            <div className="text-[10px] font-mono font-bold text-zinc-500 uppercase px-1">
                              {bucket}
                            </div>
                            {inSlot.map((cls) => (
                              <ClassCard
                                key={cls.id}
                                cls={cls}
                                rooms={namedSpaces}
                                capacity={room.capacity}
                                hasConflict={conflictClassIds.has(cls.id)}
                                saving={savingId === cls.id}
                                onAssign={(spaceId) => handleAssignRoom(cls, spaceId)}
                              />
                            ))}
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ================================================================== */}
      {/* TAB 2: ROOMS, CAPACITIES, SQ FT & VENUE RENTAL RATES               */}
      {/* ================================================================== */}
      {activeTab === "rooms" && (
        <div className="space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-black text-white">Classroom Directory &amp; Capacities</h2>
              <p className="text-xs text-zinc-400">
                Set real room capacities, square footage, and floor types so the planner flags
                over-crowded rooms automatically.
              </p>
            </div>
            <button
              type="button"
              onClick={() => startEditSpace()}
              className="px-4 py-2.5 rounded-xl bg-pink-600 hover:bg-pink-500 text-white text-xs font-black uppercase tracking-widest flex items-center gap-2"
            >
              <Plus size={15} /> Add Classroom
            </button>
          </div>

          {editingSpaceId !== null && (
            <form
              onSubmit={handleSaveSpace}
              className="bg-zinc-900 border border-pink-500/30 rounded-2xl p-5 space-y-4"
            >
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-black uppercase tracking-widest text-pink-400">
                  {editingSpaceId === "new" ? "Add New Classroom" : "Edit Classroom"}
                </h3>
                <button
                  type="button"
                  onClick={() => setEditingSpaceId(null)}
                  className="text-zinc-500 hover:text-white"
                >
                  <X size={16} />
                </button>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
                <div>
                  <label className="block text-[10px] font-bold uppercase text-zinc-400 mb-1">
                    Building / Venue
                  </label>
                  <select
                    value={roomVenueId}
                    onChange={(e) => setRoomVenueId(e.target.value)}
                    className="w-full bg-zinc-950 border border-white/10 rounded-xl px-3 py-2 text-sm text-white"
                  >
                    <option value="">Unassigned Venue</option>
                    {venues.map((v) => (
                      <option key={v.id} value={String(v.id)}>
                        {v.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-bold uppercase text-zinc-400 mb-1">
                    Room Name *
                  </label>
                  <input
                    required
                    value={roomName}
                    onChange={(e) => setRoomName(e.target.value)}
                    placeholder="e.g. Room 104 / Dance Studio"
                    className="w-full bg-zinc-950 border border-white/10 rounded-xl px-3 py-2 text-sm text-white"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold uppercase text-zinc-400 mb-1">
                    Max Students
                  </label>
                  <input
                    type="number"
                    min={1}
                    value={roomCap}
                    onChange={(e) => setRoomCap(e.target.value)}
                    placeholder="20"
                    className="w-full bg-zinc-950 border border-white/10 rounded-xl px-3 py-2 text-sm font-mono text-white"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold uppercase text-zinc-400 mb-1">
                    Square Feet
                  </label>
                  <input
                    type="number"
                    min={50}
                    value={roomSqFt}
                    onChange={(e) => setRoomSqFt(e.target.value)}
                    placeholder="e.g. 650"
                    className="w-full bg-zinc-950 border border-white/10 rounded-xl px-3 py-2 text-sm font-mono text-white"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold uppercase text-zinc-400 mb-1">
                    Floor Type
                  </label>
                  <input
                    value={roomFloor}
                    onChange={(e) => setRoomFloor(e.target.value)}
                    placeholder="Marley, Wood, Carpet..."
                    className="w-full bg-zinc-950 border border-white/10 rounded-xl px-3 py-2 text-sm text-white"
                  />
                </div>
              </div>
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setEditingSpaceId(null)}
                  className="px-4 py-2 rounded-xl bg-zinc-800 text-xs font-bold text-zinc-300"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingRoom}
                  className="px-5 py-2 rounded-xl bg-pink-600 hover:bg-pink-500 text-white text-xs font-black uppercase tracking-widest flex items-center gap-2"
                >
                  {savingRoom ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
                  Save Room
                </button>
              </div>
            </form>
          )}

          {/* Spaces Table */}
          <div className="bg-zinc-900 border border-white/10 rounded-2xl overflow-x-auto">
            <table className="w-full min-w-[680px] text-left text-xs">
              <thead className="bg-zinc-950/60 text-zinc-500 uppercase text-[10px] font-black tracking-wider border-b border-white/5">
                <tr>
                  <th className="p-3.5">Building / Venue</th>
                  <th className="p-3.5">Room Name</th>
                  <th className="p-3.5">Capacity</th>
                  <th className="p-3.5">Sq Ft</th>
                  <th className="p-3.5">Floor</th>
                  <th className="p-3.5">Linked Classes</th>
                  <th className="p-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {spaces.map((sp) => (
                  <tr
                    key={sp.id}
                    className={`hover:bg-zinc-800/30 ${sp.isPlaceholder ? "opacity-70" : ""}`}
                  >
                    <td className="p-3.5 font-bold text-zinc-200">{sp.venueName}</td>
                    <td className="p-3.5">
                      <span className="font-bold text-white">{sp.roomName}</span>
                      {sp.isPlaceholder && (
                        <span className="ml-2 px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-300 text-[9px] font-black uppercase">
                          Placeholder
                        </span>
                      )}
                    </td>
                    <td className="p-3.5 font-mono text-zinc-300">
                      {sp.capacity != null ? `${sp.capacity} students` : "—"}
                    </td>
                    <td className="p-3.5 font-mono text-zinc-300">
                      {sp.squareFootage != null ? `${sp.squareFootage.toLocaleString()} sq ft` : "—"}
                    </td>
                    <td className="p-3.5 text-zinc-400">{sp.floorType || "—"}</td>
                    <td className="p-3.5 font-mono text-zinc-400">{sp.classCount}</td>
                    <td className="p-3.5 text-right">
                      <div className="inline-flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => startEditSpace(sp)}
                          className="p-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300"
                          title="Edit room"
                        >
                          <Pencil size={13} />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteSpace(sp)}
                          className="p-1.5 rounded-lg bg-zinc-800 hover:bg-red-500/20 text-zinc-400 hover:text-red-400"
                          title="Delete room"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Venue Rental Rates Section */}
          <div className="space-y-3 pt-2">
            <h2 className="text-lg font-black text-white">Venue Rental Rates (Saved to Neon)</h2>
            <p className="text-xs text-zinc-400">
              Used automatically by Show Analytics to calculate net profit per production.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {venues.slice(0, 18).map((v) => {
                const draft = rentDrafts[v.id] ?? String(v.flatRate || 0);
                return (
                  <div
                    key={v.id}
                    className="bg-zinc-900 border border-white/10 rounded-2xl p-4 flex items-center justify-between gap-3"
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-bold text-white truncate">{v.name}</p>
                      <p className="text-[11px] text-zinc-500">
                        {v.seatingCapacity ? `Seats ${v.seatingCapacity}` : "Class / Studio Venue"}
                      </p>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <span className="text-xs text-zinc-500">$</span>
                      <input
                        type="number"
                        min={0}
                        value={draft}
                        onChange={(e) =>
                          setRentDrafts((prev) => ({ ...prev, [v.id]: e.target.value }))
                        }
                        className="w-20 bg-zinc-950 border border-white/10 rounded-lg px-2 py-1 text-xs font-mono text-white text-right"
                      />
                      <button
                        type="button"
                        disabled={savingVenueId === v.id}
                        onClick={() => void handleSaveVenueRent(v.id)}
                        className="p-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white"
                        title="Save venue rent"
                      >
                        {savingVenueId === v.id ? (
                          <Loader2 size={12} className="animate-spin" />
                        ) : (
                          <Save size={12} />
                        )}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function ClassCard({
  cls,
  rooms,
  capacity,
  hasConflict,
  saving,
  onAssign,
}: {
  cls: ClassroomPlannerClass;
  rooms: ClassroomSpaceItem[];
  capacity: number | null;
  hasConflict: boolean;
  saving: boolean;
  onAssign: (spaceId: number | null) => void;
}) {
  const fit = evaluateRoomCapacity(cls.students, capacity);

  return (
    <div
      draggable
      onDragStart={(e) => e.dataTransfer.setData("classId", String(cls.id))}
      className={`p-3 rounded-xl border transition-all space-y-2 cursor-grab active:cursor-grabbing ${
        hasConflict
          ? "bg-red-950/40 border-red-500/60"
          : fit.status === "over_capacity"
            ? "bg-amber-950/30 border-amber-500/50"
            : "bg-zinc-950 border-white/10 hover:border-white/25"
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <h4 className="text-xs font-black text-white leading-snug">{cls.name}</h4>
        <span
          className={`px-1.5 py-0.5 rounded text-[10px] font-mono font-bold shrink-0 inline-flex items-center gap-1 ${
            fit.status === "over_capacity"
              ? "bg-red-500/20 text-red-300"
              : fit.status === "near_full"
                ? "bg-amber-500/20 text-amber-300"
                : "bg-zinc-800 text-zinc-300"
          }`}
        >
          <Users size={10} />
          {capacity ? `${cls.students}/${capacity}` : cls.students}
        </span>
      </div>

      <div className="text-[11px] text-zinc-400 flex flex-wrap items-center gap-x-2 gap-y-0.5">
        <span>{cls.day}</span>
        <span>•</span>
        <span className="font-mono">{cls.time}</span>
      </div>

      <div className="text-[10px] text-zinc-500 flex items-center justify-between">
        <span className="truncate">{cls.teacher}</span>
        <span className="shrink-0">{cls.ageRange}</span>
      </div>

      {hasConflict && (
        <p className="text-[10px] font-black text-red-400 flex items-center gap-1">
          <AlertTriangle size={11} /> Room time overlap detected
        </p>
      )}
      {fit.status === "over_capacity" && (
        <p className="text-[10px] font-black text-amber-400">
          Over room capacity ({fit.utilizationPct}%)
        </p>
      )}

      <div className="pt-1 flex items-center gap-1.5">
        <MapPin size={11} className="text-zinc-600 shrink-0" />
        <select
          disabled={saving}
          value={cls.spaceId && !cls.isPlaceholderSpace ? String(cls.spaceId) : ""}
          onChange={(e) => onAssign(e.target.value ? Number(e.target.value) : null)}
          className="flex-1 bg-zinc-900 border border-white/10 rounded-lg px-2 py-1 text-[10px] font-bold text-zinc-200 truncate"
        >
          <option value="">Assign Room...</option>
          {rooms.map((r) => (
            <option key={r.id} value={String(r.id)}>
              {r.venueName} — {r.roomName} {r.capacity ? `(Cap ${r.capacity})` : ""}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}
