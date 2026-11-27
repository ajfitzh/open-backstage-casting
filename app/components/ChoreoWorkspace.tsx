"use client";

import React, { useState, useRef, useMemo } from "react";
import { toast } from "@/app/components/ToastProvider";
import {
  ArrowLeft,
  ArrowRight,
  Move,
  AlertTriangle,
  Star,
  Zap,
  Smile,
  ThumbsUp,
  MessageSquare,
  Video,
  Users,
  RefreshCw,
  ChevronDown,
  Trash2,
  Eraser,
} from "lucide-react";
import VideoRecorderModal from "@/app/components/auditions/VideoRecorderModal";
import { sortAuditionSlots } from "@/app/lib/audition-workflow-helpers";
import type { AuditionDeckPerformer } from "@/app/lib/db/audition-panel-repo";

const STANDARD_TAGS = [
  { id: "#Featured", label: "Featured", icon: Star, color: "bg-purple-600 border-purple-400" },
  { id: "#Tap", label: "Tap", icon: Zap, color: "bg-blue-600 border-blue-400" },
  { id: "#Acro", label: "Acro", icon: Move, color: "bg-emerald-600 border-emerald-400" },
];

const LEVELS = [
  { val: 2, label: "Non-Mover", color: "bg-zinc-800 text-zinc-300 border-zinc-500" },
  { val: 3, label: "Mover", color: "bg-blue-600 text-white border-blue-400" },
  { val: 4, label: "Dancer", color: "bg-purple-600 text-white border-purple-400" },
  { val: 5, label: "Advanced", color: "bg-emerald-600 text-white border-emerald-400" },
];

export default function ChoreoWorkspace({
  tenant,
  people,
  judgeEmail,
  onSaveDanceBallot,
  onSaveGroupVideo,
}: {
  tenant: string;
  people: AuditionDeckPerformer[];
  judgeEmail: string;
  onSaveDanceBallot: (auditionId: number, score: number, notes: string) => Promise<void> | void;
  onSaveGroupVideo: (auditionIds: number[], videoUrl: string | null) => Promise<void> | void;
}) {
  const [selectedSlot, setSelectedSlot] = useState<string>("");
  const [viewMode, setViewMode] = useState<"group" | "grade">("group");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [noteDraft, setNoteDraft] = useState<{ key: string; value: string } | null>(null);
  const [showRecorder, setShowRecorder] = useState(false);

  const touchStartX = useRef<number | null>(null);
  const touchEndX = useRef<number | null>(null);

  const groupedPeople = useMemo(() => {
    const groups: Record<string, AuditionDeckPerformer[]> = {};
    people.forEach((p) => {
      const slot = p.timeSlot || "Unscheduled";
      if (!groups[slot]) groups[slot] = [];
      groups[slot].push(p);
    });
    return groups;
  }, [people]);

  const slots = useMemo(() => sortAuditionSlots(Object.keys(groupedPeople)), [groupedPeople]);
  const activeSlot = selectedSlot && groupedPeople[selectedSlot] ? selectedSlot : slots[0] || "";

  const currentGroup = groupedPeople[activeSlot] || [];
  const activeStudent = currentGroup[selectedIndex];

  const getMyDanceBallot = (student?: AuditionDeckPerformer) => {
    if (!student) return { dance: 0, notes: "" };
    const mine = student.ballots.find(
      (b) => b.round === "audition" && b.judgeEmail.toLowerCase() === judgeEmail.toLowerCase()
    );
    return {
      dance: mine?.danceScore ?? student.dance ?? 0,
      notes: mine?.notes || student.choreoNotes || "",
    };
  };

  const activeBallot = getMyDanceBallot(activeStudent);
  const groupVideoUrl = useMemo(() => {
    for (const s of currentGroup) {
      if (s.danceVideoUrl) return s.danceVideoUrl;
    }
    return null;
  }, [currentGroup]);

  const noteKey = `${activeStudent?.id ?? ""}|${activeBallot.notes}`;
  const localNotes = noteDraft?.key === noteKey ? noteDraft.value : activeBallot.notes;
  const setLocalNotes = (value: string) => setNoteDraft({ key: noteKey, value });

  const handleScore = (score: number) => {
    if (!activeStudent) return;
    onSaveDanceBallot(activeStudent.id, score, localNotes);
  };

  const handleClear = () => {
    if (!activeStudent) return;
    setLocalNotes("");
    onSaveDanceBallot(activeStudent.id, 0, "");
  };

  const saveNotes = () => {
    if (!activeStudent) return;
    onSaveDanceBallot(activeStudent.id, activeBallot.dance || 0, localNotes);
  };

  const handleToggleTag = (tag: string) => {
    if (!activeStudent) return;
    const newNotes = localNotes.includes(tag)
      ? localNotes.replace(tag, "").replace(/\s+/g, " ").trim()
      : `${localNotes} ${tag}`.trim();
    setLocalNotes(newNotes);
    onSaveDanceBallot(activeStudent.id, activeBallot.dance || 0, newNotes);
  };

  const handleAttitudeCycle = () => {
    if (!activeStudent) return;
    let newNotes = localNotes;
    if (newNotes.includes("#GreatAttitude")) {
      newNotes = newNotes.replace("#GreatAttitude", "#BadAttitude");
    } else if (newNotes.includes("#BadAttitude")) {
      newNotes = newNotes.replace("#BadAttitude", "").replace(/\s+/g, " ").trim();
    } else {
      newNotes = `${newNotes} #GreatAttitude`.trim();
    }
    setLocalNotes(newNotes);
    onSaveDanceBallot(activeStudent.id, activeBallot.dance || 0, newNotes);
  };

  const attState = localNotes.includes("#GreatAttitude")
    ? "good"
    : localNotes.includes("#BadAttitude")
    ? "bad"
    : "none";

  const handleGroupVideoSaved = async (publicUrl: string) => {
    const ids = currentGroup.map((s) => s.id);
    await onSaveGroupVideo(ids, publicUrl);
    toast.success(`Dance video linked to all ${ids.length} dancers in ${activeSlot}!`);
  };

  const handleDeleteVideo = async () => {
    if (!confirm("Remove this group dance video from this time slot?")) return;
    const ids = currentGroup.map((s) => s.id);
    await onSaveGroupVideo(ids, null);
    toast.success("Group dance video removed.");
  };

  const changeStudent = (delta: number) => {
    const newIndex = selectedIndex + delta;
    if (newIndex >= 0 && newIndex < currentGroup.length) setSelectedIndex(newIndex);
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.targetTouches[0].clientX;
  };
  const handleTouchMove = (e: React.TouchEvent) => {
    touchEndX.current = e.targetTouches[0].clientX;
  };
  const handleTouchEnd = () => {
    if (!touchStartX.current || !touchEndX.current) return;
    const distance = touchStartX.current - touchEndX.current;
    if (distance > 50) changeStudent(1);
    if (distance < -50) changeStudent(-1);
    touchStartX.current = null;
    touchEndX.current = null;
  };

  if (!activeSlot) {
    return (
      <div className="p-8 text-center text-zinc-500 text-sm">
        No dancers found for this production yet.
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-black overflow-hidden relative">
      {/* TIME SLOTS */}
      <div
        className={`h-14 bg-zinc-900 border-b border-white/5 flex items-center px-3 gap-2 overflow-x-auto shrink-0 custom-scrollbar transition-all duration-300 ${
          viewMode === "grade" ? "h-0 opacity-0 overflow-hidden border-none" : ""
        }`}
      >
        {slots.map((slot) => {
          const isActive = slot === activeSlot;
          const count = groupedPeople[slot].length;
          return (
            <button
              key={slot}
              type="button"
              onClick={() => {
                setSelectedSlot(slot);
                setViewMode("group");
                setSelectedIndex(0);
              }}
              className={`px-4 py-2 rounded-full text-[11px] font-black uppercase whitespace-nowrap transition-all shrink-0 flex flex-col items-center leading-none gap-1 ${
                isActive
                  ? "bg-emerald-600 text-white shadow-lg"
                  : "bg-zinc-800 text-zinc-400 border border-white/5 hover:text-white"
              }`}
            >
              <span>{slot}</span>
              <span className={`text-[8px] ${isActive ? "text-emerald-100" : "text-zinc-500"}`}>
                {count} Dancers
              </span>
            </button>
          );
        })}
      </div>

      {/* PERSISTENT GROUP VIDEO PLAYER */}
      <div
        className={`w-full bg-black border-b border-white/10 shrink-0 relative transition-all duration-300 ${
          viewMode === "group" ? "h-[34dvh] min-h-[200px]" : "h-40 md:h-64"
        }`}
      >
        {groupVideoUrl ? (
          <div className="relative w-full h-full">
            <video
              key={groupVideoUrl}
              src={groupVideoUrl}
              controls
              playsInline
              preload="metadata"
              className="w-full h-full object-contain bg-zinc-950"
            />
            <div className="absolute top-2 right-2 flex gap-2 z-10">
              <button
                type="button"
                onClick={() => setShowRecorder(true)}
                className="flex items-center gap-1.5 bg-black/70 hover:bg-black/90 backdrop-blur text-white px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase border border-white/10"
              >
                <RefreshCw size={12} /> Retake
              </button>
              <button
                type="button"
                onClick={handleDeleteVideo}
                className="flex items-center gap-1.5 bg-red-600/80 hover:bg-red-600 backdrop-blur text-white px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase border border-white/10"
              >
                <Trash2 size={12} /> Delete
              </button>
            </div>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setShowRecorder(true)}
            className="w-full h-full flex flex-col items-center justify-center gap-3 bg-zinc-900/70 hover:bg-zinc-900 transition-colors"
          >
            <div className="w-12 h-12 rounded-full bg-red-600 flex items-center justify-center shadow-lg shadow-red-900/40">
              <Video size={22} className="text-white" />
            </div>
            <div className="text-center">
              <p className="text-white font-black uppercase tracking-wider text-xs">
                Record or Upload Group Dance Video
              </p>
              <p className="text-[10px] text-zinc-400 mt-0.5">
                Links automatically to all {currentGroup.length} dancers in {activeSlot}
              </p>
            </div>
          </button>
        )}

        {viewMode === "grade" && (
          <button
            type="button"
            onClick={() => setViewMode("group")}
            className="absolute top-2 left-2 z-20 flex items-center gap-1 text-white text-[10px] font-black uppercase bg-black/70 px-3 py-1.5 rounded-full backdrop-blur border border-white/10 hover:bg-black/90"
          >
            <ChevronDown size={12} /> Show Roster
          </button>
        )}
      </div>

      {/* CONTENT AREA */}
      <div className="flex-1 overflow-y-auto relative bg-zinc-950 flex flex-col">
        {viewMode === "group" && (
          <div className="p-4">
            <div className="flex justify-between items-center mb-3">
              <h3 className="text-zinc-400 font-black uppercase text-xs tracking-widest flex items-center gap-2">
                <Users size={14} /> {activeSlot} ({currentGroup.length})
              </h3>
              {currentGroup.length > 0 && (
                <button
                  type="button"
                  onClick={() => {
                    setSelectedIndex(0);
                    setViewMode("grade");
                  }}
                  className="bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-2 rounded-lg text-xs font-black uppercase tracking-wide"
                >
                  Start Grading
                </button>
              )}
            </div>
            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2.5 pb-16">
              {currentGroup.map((p, i) => {
                const grade = getMyDanceBallot(p).dance;
                return (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => {
                      setSelectedIndex(i);
                      setViewMode("grade");
                    }}
                    className={`aspect-square relative rounded-xl overflow-hidden border transition-all text-left ${
                      grade > 0
                        ? "border-emerald-500/70"
                        : "border-white/10 hover:border-white/30"
                    }`}
                  >
                    <img
                      src={p.avatar || ""}
                      alt={p.name}
                      className="w-full h-full object-cover object-top"
                    />
                    {grade > 0 && (
                      <div className="absolute inset-0 bg-emerald-950/65 flex items-center justify-center">
                        <span className="text-2xl font-black text-white">{grade}</span>
                      </div>
                    )}
                    <div className="absolute bottom-0 inset-x-0 bg-black/70 px-1.5 py-1">
                      <p className="text-[10px] font-bold text-white truncate text-center">
                        {p.auditionNumber ? `#${p.auditionNumber} ` : ""}
                        {p.name}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {viewMode === "grade" && activeStudent && (
          <div className="flex flex-col flex-1 h-full min-h-0">
            <div className="flex items-center justify-between p-3 border-b border-white/5 bg-zinc-900/50 shrink-0">
              <button
                type="button"
                onClick={() => changeStudent(-1)}
                disabled={selectedIndex === 0}
                className="p-2 text-zinc-400 hover:text-white disabled:opacity-20"
              >
                <ArrowLeft size={20} />
              </button>

              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full overflow-hidden border border-white/10 shrink-0">
                  <img
                    src={activeStudent.avatar || ""}
                    alt={activeStudent.name}
                    className="w-full h-full object-cover object-top"
                  />
                </div>
                <div className="text-center">
                  <h2 className="text-sm font-black uppercase text-white leading-none">
                    {activeStudent.name}
                  </h2>
                  <p className="text-[10px] text-zinc-400 font-bold uppercase mt-0.5">
                    {activeStudent.auditionNumber ? `#${activeStudent.auditionNumber} · ` : ""}
                    Age {activeStudent.age} · {selectedIndex + 1}/{currentGroup.length}
                  </p>
                </div>
                {activeBallot.dance > 0 && (
                  <div className="w-8 h-8 bg-emerald-600 rounded-full flex items-center justify-center border-2 border-black shadow-lg">
                    <span className="text-sm font-black text-white">{activeBallot.dance}</span>
                  </div>
                )}
              </div>

              <button
                type="button"
                onClick={() => changeStudent(1)}
                disabled={selectedIndex === currentGroup.length - 1}
                className="p-2 text-zinc-400 hover:text-white disabled:opacity-20"
              >
                <ArrowRight size={20} />
              </button>
            </div>

            <div
              className="flex-1 bg-zinc-900 border-t border-white/10 p-4 pb-16 rounded-t-3xl flex flex-col justify-start max-w-2xl w-full mx-auto"
              onTouchStart={handleTouchStart}
              onTouchMove={handleTouchMove}
              onTouchEnd={handleTouchEnd}
            >
              <div className="grid grid-cols-4 gap-2 mb-2 mt-1">
                {LEVELS.map((lvl) => (
                  <button
                    key={lvl.val}
                    type="button"
                    onClick={() => handleScore(lvl.val)}
                    className={`h-14 rounded-xl flex flex-col items-center justify-center border-2 transition-all active:scale-95 ${
                      activeBallot.dance === lvl.val
                        ? `${lvl.color} shadow-lg scale-[1.03]`
                        : "bg-zinc-950 border-white/10 text-zinc-400 hover:bg-white/5"
                    }`}
                  >
                    <span className="text-lg font-black">{lvl.val}</span>
                    <span className="text-[9px] font-bold uppercase whitespace-nowrap">
                      {lvl.label}
                    </span>
                  </button>
                ))}
              </div>

              <div className="flex justify-end mb-2 h-5">
                {activeBallot.dance > 0 && (
                  <button
                    type="button"
                    onClick={handleClear}
                    className="flex items-center gap-1 text-[10px] font-bold uppercase text-zinc-500 hover:text-red-400"
                  >
                    <Eraser size={12} /> Clear Score & Notes
                  </button>
                )}
              </div>

              <div className="mb-3 relative">
                <input
                  value={localNotes}
                  onChange={(e) => setLocalNotes(e.target.value)}
                  onBlur={saveNotes}
                  placeholder="Type choreography note..."
                  className="w-full bg-black/40 border border-white/10 rounded-xl pl-9 pr-4 py-3 text-sm text-white placeholder:text-zinc-600 focus:border-emerald-500 outline-none"
                />
                <MessageSquare
                  size={14}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500"
                />
              </div>

              <div className="flex flex-wrap justify-center gap-2">
                {STANDARD_TAGS.map((tag) => {
                  const isActive = localNotes.includes(tag.id);
                  return (
                    <button
                      key={tag.id}
                      type="button"
                      onClick={() => handleToggleTag(tag.id)}
                      className={`flex items-center gap-1.5 px-3 py-2.5 rounded-full border transition-all active:scale-95 flex-grow justify-center ${
                        isActive
                          ? `${tag.color} text-white shadow-lg`
                          : "bg-zinc-950 border-white/10 text-zinc-400"
                      }`}
                    >
                      <tag.icon size={14} />
                      <span className="text-[10px] font-bold uppercase tracking-wide">
                        {tag.label}
                      </span>
                    </button>
                  );
                })}
                <button
                  type="button"
                  onClick={handleAttitudeCycle}
                  className={`flex items-center gap-1.5 px-3 py-2.5 rounded-full border transition-all active:scale-95 flex-grow justify-center ${
                    attState === "good"
                      ? "bg-emerald-600 border-emerald-400 text-white shadow-lg"
                      : attState === "bad"
                      ? "bg-red-600 border-red-400 text-white shadow-lg"
                      : "bg-zinc-950 border-white/10 text-zinc-400"
                  }`}
                >
                  {attState === "good" ? (
                    <ThumbsUp size={14} />
                  ) : attState === "bad" ? (
                    <AlertTriangle size={14} />
                  ) : (
                    <Smile size={14} />
                  )}
                  <span className="text-[10px] font-bold uppercase tracking-wide">
                    {attState === "good"
                      ? "Good Att."
                      : attState === "bad"
                      ? "Bad Att."
                      : "Attitude"}
                  </span>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {showRecorder && (
        <VideoRecorderModal
          tenant={tenant}
          subjectLabel={`Dance Group — ${activeSlot}`}
          videoKind="dance"
          onSaved={handleGroupVideoSaved}
          onClose={() => setShowRecorder(false)}
        />
      )}
    </div>
  );
}
