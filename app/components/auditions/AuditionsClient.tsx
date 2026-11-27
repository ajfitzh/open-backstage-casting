// app/components/auditions/AuditionsClient.tsx
"use client";

import React, { useState, useEffect, useMemo, useRef, useCallback } from "react";
import Link from "next/link";
import { toast } from "@/app/components/ToastProvider";
import {
  User,
  Clock,
  CheckCircle2,
  Search,
  PlayCircle,
  Film,
  Music,
  Video,
  Sparkles,
  Users,
  Move,
  ListChecks,
  AlertCircle,
} from "lucide-react";
import ActorProfileModal from "@/app/components/ActorProfileModal";
import ChoreoWorkspace from "@/app/components/ChoreoWorkspace";
import ScoringSidebar, { type BallotDraft } from "./ScoringSidebar";
import VideoRecorderModal from "./VideoRecorderModal";
import {
  fetchAuditionDeckData,
  saveAuditionVideoAction,
  saveGroupDanceVideoAction,
  saveJudgeBallotAction,
  toggleCallbackSelectionAction,
} from "@/app/actions/audition-panel";
import {
  sortAuditionSlots,
  type VideoKind,
} from "@/app/lib/audition-workflow-helpers";
import type { AuditionDeckPerformer } from "@/app/lib/db/audition-panel-repo";

export type AuditionSession = "Scheduled" | "Video/Remote" | "Walk-In";
export type JudgeRole = "Director" | "Music" | "Choreographer" | "Drop-In" | "Admin";
export type Performer = AuditionDeckPerformer;

export const ROLE_THEMES: Record<
  JudgeRole,
  { color: string; text: string; glow: string; weight: string }
> = {
  Director: {
    color: "border-blue-500",
    text: "text-blue-400",
    glow: "shadow-blue-500/20",
    weight: "Acting Priority",
  },
  Music: {
    color: "border-purple-500",
    text: "text-purple-400",
    glow: "shadow-purple-500/20",
    weight: "Vocal Priority",
  },
  Choreographer: {
    color: "border-emerald-500",
    text: "text-emerald-400",
    glow: "shadow-emerald-500/20",
    weight: "Dance Priority",
  },
  "Drop-In": {
    color: "border-amber-500",
    text: "text-amber-400",
    glow: "shadow-amber-500/20",
    weight: "Panel Judge",
  },
  Admin: {
    color: "border-zinc-400",
    text: "text-zinc-200",
    glow: "shadow-white/5",
    weight: "Full Panel",
  },
};

function mapRawRoleToJudgeRole(rawRole: string): JudgeRole {
  const lower = (rawRole || "").toLowerCase();
  if (lower.includes("director") && !lower.includes("music")) return "Director";
  if (lower.includes("music") || lower.includes("vocal")) return "Music";
  if (lower.includes("choreo") || lower.includes("dance")) return "Choreographer";
  if (lower.includes("admin") || lower.includes("producer") || lower.includes("executive")) {
    return "Admin";
  }
  return "Drop-In";
}

function parseHeightInches(heightStr: string): number {
  if (!heightStr || heightStr === "N/A") return 0;
  const match = heightStr.match(/(\d+)'(\d+)?/);
  if (match) return parseInt(match[1], 10) * 12 + (parseInt(match[2], 10) || 0);
  return parseInt(heightStr, 10) || 0;
}

interface AuditionsClientProps {
  tenant: string;
  productionId: number;
  productionTitle: string;
  serverJudgeName: string;
  serverJudgeEmail: string;
  serverJudgeRole: string;
  initialPerformers: AuditionDeckPerformer[];
  blueprintRoles?: string[];
}

export default function AuditionsClient({
  tenant,
  productionId,
  productionTitle,
  serverJudgeName,
  serverJudgeEmail,
  serverJudgeRole,
  initialPerformers,
  blueprintRoles = [],
}: AuditionsClientProps) {
  const judgeName = serverJudgeName || "Panel Judge";
  const judgeEmail = (serverJudgeEmail || "").toLowerCase();
  const initialJudgeRole = mapRawRoleToJudgeRole(serverJudgeRole);

  const [judgeRole, setJudgeRole] = useState<JudgeRole>(initialJudgeRole);
  const [workspaceMode, setWorkspaceMode] = useState<"deck" | "dance">(
    initialJudgeRole === "Choreographer" ? "dance" : "deck"
  );

  const [performers, setPerformers] = useState<AuditionDeckPerformer[]>(
    initialPerformers || []
  );
  const [selectedSlot, setSelectedSlot] = useState<string>("ALL");
  const [statusFilter, setStatusFilter] = useState<
    "all" | "checked_in" | "unscored" | "called_back" | "has_video"
  >("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [maxHeight, setMaxHeight] = useState<number>(84);
  const [rangeFilter, setRangeFilter] = useState<string>("all");

  const [selectedPersonId, setSelectedPersonId] = useState<number | null>(null);
  const [inspectingActorId, setInspectingActorId] = useState<number | null>(null);
  const [recordingTarget, setRecordingTarget] = useState<{
    auditionId: number;
    name: string;
    kind: VideoKind;
  } | null>(null);

  const [isSaving, setIsSaving] = useState(false);
  const [currentScores, setCurrentScores] = useState<BallotDraft>({
    vocal: 0,
    acting: 0,
    dance: 0,
    presence: 0,
    callbackVote: null,
    suggestedRoles: "",
    notes: "",
  });

  const selectedPerson = useMemo(
    () => performers.find((p) => p.id === selectedPersonId) || null,
    [performers, selectedPersonId]
  );

  const inspectingActor = useMemo(
    () => performers.find((p) => p.id === inspectingActorId) || null,
    [performers, inspectingActorId]
  );

  const refreshDeck = useCallback(async () => {
    const res = await fetchAuditionDeckData(tenant, productionId, false);
    if (res.success) {
      setPerformers(res.performers);
    }
  }, [tenant, productionId]);

  // Live 15-second panel sync so all 3-6 judges see updates in near real-time
  useEffect(() => {
    const timer = setInterval(() => {
      refreshDeck().catch(() => {});
    }, 15000);
    return () => clearInterval(timer);
  }, [refreshDeck]);

  const getMyBallot = useCallback(
    (person: AuditionDeckPerformer) => {
      return person.ballots.find(
        (b) => b.round === "audition" && b.judgeEmail.toLowerCase() === judgeEmail
      );
    },
    [judgeEmail]
  );

  const openPersonForScoring = useCallback(
    (person: AuditionDeckPerformer) => {
      setSelectedPersonId(person.id);
      const mine = getMyBallot(person);
      setCurrentScores({
        vocal: mine?.vocalScore ?? 0,
        acting: mine?.actingScore ?? 0,
        dance: mine?.danceScore ?? 0,
        presence: mine?.stagePresenceScore ?? 0,
        callbackVote: mine?.callbackVote ?? null,
        suggestedRoles: mine?.suggestedRoles || "",
        notes: mine?.notes || "",
      });
    },
    [getMyBallot]
  );

  // Chronologically sorted standardized audition slots
  const slotCounts = useMemo(() => {
    const counts = new Map<string, number>();
    for (const p of performers) {
      const slot = p.timeSlot || "Unscheduled";
      counts.set(slot, (counts.get(slot) || 0) + 1);
    }
    return counts;
  }, [performers]);

  const sortedSlots = useMemo(
    () => sortAuditionSlots(Array.from(slotCounts.keys())),
    [slotCounts]
  );

  const visibleList = useMemo(() => {
    return performers.filter((p) => {
      if (selectedSlot !== "ALL" && (p.timeSlot || "Unscheduled") !== selectedSlot) {
        return false;
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const hit =
          p.name.toLowerCase().includes(q) ||
          (p.auditionNumber || "").toLowerCase().includes(q) ||
          (p.song || "").toLowerCase().includes(q) ||
          (p.preferredRoles || "").toLowerCase().includes(q);
        if (!hit) return false;
      }
      if (statusFilter === "checked_in" && !p.isCheckedIn) return false;
      if (statusFilter === "unscored" && Boolean(getMyBallot(p))) return false;
      if (statusFilter === "called_back" && !p.isCalledBack) return false;
      if (
        statusFilter === "has_video" &&
        !p.auditionVideoUrl &&
        !p.danceVideoUrl &&
        !p.callbackVideoUrl
      ) {
        return false;
      }
      const pHeight = parseHeightInches(p.height);
      if (maxHeight < 84 && pHeight > 0 && pHeight > maxHeight) return false;
      if (
        rangeFilter !== "all" &&
        !(p.vocalRange || p.voiceType || "").toLowerCase().includes(rangeFilter.toLowerCase())
      ) {
        return false;
      }
      return true;
    });
  }, [performers, selectedSlot, searchQuery, statusFilter, maxHeight, rangeFilter, getMyBallot]);

  const grouped = useMemo(() => {
    const map: Record<string, AuditionDeckPerformer[]> = {};
    for (const p of visibleList) {
      const key = p.timeSlot || "Unscheduled";
      if (!map[key]) map[key] = [];
      map[key].push(p);
    }
    const ordered: Record<string, AuditionDeckPerformer[]> = {};
    for (const key of sortAuditionSlots(Object.keys(map))) {
      ordered[key] = map[key];
    }
    return ordered;
  }, [visibleList]);

  const flatVisible = useMemo(() => Object.values(grouped).flat(), [grouped]);
  const currentIndex = selectedPerson
    ? flatVisible.findIndex((p) => p.id === selectedPerson.id)
    : -1;

  const navigateActor = (delta: -1 | 1) => {
    const nextIdx = currentIndex + delta;
    if (nextIdx >= 0 && nextIdx < flatVisible.length) {
      openPersonForScoring(flatVisible[nextIdx]);
    }
  };

  const handleSaveBallot = async (advanceNext = false) => {
    if (!selectedPerson) return;
    setIsSaving(true);
    try {
      const res = await saveJudgeBallotAction(tenant, productionId, selectedPerson.id, {
        round: "audition",
        judgeRoleOverride: judgeRole,
        vocalScore: currentScores.vocal || null,
        actingScore: currentScores.acting || null,
        danceScore: currentScores.dance || null,
        stagePresenceScore: currentScores.presence || null,
        callbackVote: currentScores.callbackVote,
        suggestedRoles: currentScores.suggestedRoles,
        notes: currentScores.notes,
      });

      if (!res.success) {
        toast.error(res.error || "Could not save judge ballot.");
        return;
      }

      setPerformers((prev) =>
        prev.map((p) =>
          p.id === selectedPerson.id
            ? {
                ...p,
                ballots: res.ballots,
                auditionConsensus: res.auditionConsensus,
                callbackConsensus: res.callbackConsensus,
                vocal: res.auditionConsensus.avgVocal,
                acting: res.auditionConsensus.avgActing,
                dance: res.auditionConsensus.avgDance,
                presence: res.auditionConsensus.avgPresence,
              }
            : p
        )
      );

      toast.success(`Ballot saved for ${selectedPerson.name}`);
      if (advanceNext && currentIndex >= 0 && currentIndex < flatVisible.length - 1) {
        openPersonForScoring(flatVisible[currentIndex + 1]);
      }
    } catch {
      toast.error("Failed to save ballot. Check your connection.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleToggleCallback = async (person: AuditionDeckPerformer) => {
    const next = !person.isCalledBack;
    setPerformers((prev) =>
      prev.map((p) =>
        p.id === person.id
          ? { ...p, isCalledBack: next, status: next ? "Called Back" : p.isCheckedIn ? "Checked In" : "Pending" }
          : p
      )
    );
    const res = await toggleCallbackSelectionAction(tenant, productionId, person.id, next);
    if (!res.success) {
      toast.error(res.error || "Failed to update callback status.");
      refreshDeck();
    } else {
      toast.success(next ? `${person.name} added to Callbacks` : `${person.name} removed from Callbacks`);
    }
  };

  const handleVideoSaved = async (auditionId: number, kind: VideoKind, publicUrl: string | null) => {
    const res = await saveAuditionVideoAction(tenant, productionId, auditionId, kind, publicUrl);
    if (!res.success) {
      toast.error(res.error || "Failed to save video URL.");
      return;
    }
    setPerformers((prev) =>
      prev.map((p) => {
        if (p.id !== auditionId) return p;
        const updated = { ...p };
        if (kind === "audition") updated.auditionVideoUrl = publicUrl;
        if (kind === "dance") updated.danceVideoUrl = publicUrl;
        if (kind === "callback") updated.callbackVideoUrl = publicUrl;
        updated.video =
          updated.auditionVideoUrl || updated.danceVideoUrl || updated.callbackVideoUrl || null;
        return updated;
      })
    );
  };

  const handleDanceBallotSave = async (auditionId: number, score: number, notes: string) => {
    const res = await saveJudgeBallotAction(tenant, productionId, auditionId, {
      round: "audition",
      judgeRoleOverride: "Choreographer",
      danceScore: score > 0 ? score : null,
      notes,
    });
    if (res.success) {
      setPerformers((prev) =>
        prev.map((p) =>
          p.id === auditionId
            ? {
                ...p,
                ballots: res.ballots,
                auditionConsensus: res.auditionConsensus,
                dance: res.auditionConsensus.avgDance,
                choreoNotes: notes,
              }
            : p
        )
      );
    } else {
      toast.error(res.error || "Could not save dance score.");
    }
  };

  const handleGroupDanceVideo = async (auditionIds: number[], videoUrl: string | null) => {
    const res = await saveGroupDanceVideoAction(tenant, productionId, auditionIds, videoUrl);
    if (!res.success) {
      toast.error(res.error || "Failed to save group dance video.");
      return;
    }
    const idSet = new Set(auditionIds);
    setPerformers((prev) =>
      prev.map((p) =>
        idSet.has(p.id)
          ? {
              ...p,
              danceVideoUrl: videoUrl,
              video: p.auditionVideoUrl || videoUrl || p.callbackVideoUrl || null,
            }
          : p
      )
    );
  };

  const calledBackCount = useMemo(
    () => performers.filter((p) => p.isCalledBack).length,
    [performers]
  );
  const myScoredCount = useMemo(
    () => performers.filter((p) => Boolean(getMyBallot(p))).length,
    [performers, getMyBallot]
  );

  return (
    <>
      <div className="flex flex-col h-full bg-black text-white overflow-hidden">
        {/* TOP HEADER */}
        <header
          className={`px-4 py-3 md:px-6 md:py-4 border-b-2 bg-zinc-950 ${ROLE_THEMES[judgeRole].color} shrink-0 space-y-3`}
        >
          <div className="flex flex-col md:flex-row justify-between md:items-center gap-3">
            <div className="min-w-0">
              <div className="flex items-center gap-2.5 flex-wrap">
                <h1 className="text-lg md:text-2xl font-black italic uppercase tracking-tight">
                  Audition Deck
                </h1>
                <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-blue-500/15 text-blue-400 border border-blue-500/30">
                  {productionTitle}
                </span>
                <span className="text-[10px] font-bold text-zinc-400">
                  {myScoredCount}/{performers.length} Scored by You
                </span>
              </div>
              <div className="flex items-center gap-2 mt-1 flex-wrap">
                <span className="text-[10px] uppercase text-zinc-400 font-bold">
                  {judgeName}
                </span>
                <span className="text-zinc-700">•</span>
                <select
                  value={judgeRole}
                  onChange={(e) => setJudgeRole(e.target.value as JudgeRole)}
                  aria-label="Judge Discipline"
                  className="bg-zinc-900 border border-white/10 rounded px-2 py-0.5 text-[10px] font-black uppercase text-zinc-200 outline-none cursor-pointer"
                >
                  <option value="Director">Director (Acting)</option>
                  <option value="Music">Music Director (Vocal)</option>
                  <option value="Choreographer">Choreographer (Dance)</option>
                  <option value="Drop-In">Panel Judge</option>
                  <option value="Admin">Producer / Admin</option>
                </select>
              </div>
            </div>

            {/* Mode Switcher + Callbacks Link */}
            <div className="flex items-center gap-2 overflow-x-auto no-scrollbar shrink-0">
              <button
                type="button"
                onClick={() => setWorkspaceMode("deck")}
                className={`px-3.5 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider flex items-center gap-1.5 whitespace-nowrap border transition-colors ${
                  workspaceMode === "deck"
                    ? "bg-white text-black border-white"
                    : "bg-zinc-900 text-zinc-400 border-white/10 hover:text-white"
                }`}
              >
                <ListChecks size={13} /> Panel Deck
              </button>
              <button
                type="button"
                onClick={() => setWorkspaceMode("dance")}
                className={`px-3.5 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider flex items-center gap-1.5 whitespace-nowrap border transition-colors ${
                  workspaceMode === "dance"
                    ? "bg-emerald-600 text-white border-emerald-400"
                    : "bg-zinc-900 text-zinc-400 border-white/10 hover:text-white"
                }`}
              >
                <Move size={13} /> Dance Group Mode
              </button>
              <Link
                href={`/${tenant}/production/${productionId}/callbacks`}
                className="px-3.5 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider flex items-center gap-1.5 whitespace-nowrap bg-purple-600/20 hover:bg-purple-600/30 text-purple-300 border border-purple-500/40 transition-colors"
              >
                <Sparkles size={13} /> Callbacks ({calledBackCount})
              </Link>
            </div>
          </div>

          {workspaceMode === "deck" && (
            <>
              {/* Standardized Slot Selector Pills */}
              {sortedSlots.length > 0 && (
                <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-0.5">
                  <button
                    type="button"
                    onClick={() => setSelectedSlot("ALL")}
                    className={`px-3 py-1.5 rounded-full text-[10px] font-black uppercase whitespace-nowrap transition-colors border ${
                      selectedSlot === "ALL"
                        ? "bg-blue-600 border-blue-400 text-white"
                        : "bg-zinc-900 border-white/10 text-zinc-400 hover:text-white"
                    }`}
                  >
                    All Slots ({performers.length})
                  </button>
                  {sortedSlots.map((slot) => (
                    <button
                      key={slot}
                      type="button"
                      onClick={() => setSelectedSlot(slot)}
                      className={`px-3 py-1.5 rounded-full text-[10px] font-black uppercase whitespace-nowrap transition-colors border ${
                        selectedSlot === slot
                          ? "bg-blue-600 border-blue-400 text-white"
                          : "bg-zinc-900 border-white/10 text-zinc-400 hover:text-white"
                      }`}
                    >
                      {slot} ({slotCounts.get(slot) || 0})
                    </button>
                  ))}
                </div>
              )}

              {/* Search & Filter Controls */}
              <div className="flex flex-col lg:flex-row gap-2">
                <div className="relative flex-1">
                  <Search
                    size={14}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500"
                  />
                  <input
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full bg-zinc-900 border border-white/10 rounded-xl py-2 pl-9 pr-3 text-xs focus:border-blue-500 outline-none text-white placeholder:text-zinc-500"
                    placeholder="Search name, #number, song, or preferred role..."
                  />
                </div>

                <div className="flex items-center gap-2 overflow-x-auto no-scrollbar">
                  {(
                    [
                      { id: "all", label: "All" },
                      { id: "checked_in", label: "Checked In" },
                      { id: "unscored", label: "Needs My Score" },
                      { id: "called_back", label: "Called Back" },
                      { id: "has_video", label: "Has Video" },
                    ] as const
                  ).map((f) => (
                    <button
                      key={f.id}
                      type="button"
                      onClick={() => setStatusFilter(f.id)}
                      className={`px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase whitespace-nowrap border transition-colors ${
                        statusFilter === f.id
                          ? "bg-zinc-100 text-black border-white"
                          : "bg-zinc-900 text-zinc-400 border-white/10 hover:text-white"
                      }`}
                    >
                      {f.label}
                    </button>
                  ))}

                  <div className="flex items-center gap-2 bg-zinc-900 rounded-lg px-2.5 py-1.5 border border-white/10 shrink-0">
                    <span className="text-[10px] text-zinc-500 font-bold uppercase">Max Ht</span>
                    <input
                      type="range"
                      min="36"
                      max="84"
                      value={maxHeight}
                      onChange={(e) => setMaxHeight(parseInt(e.target.value, 10))}
                      className="w-20 accent-blue-500 h-1 bg-zinc-800 rounded-lg cursor-pointer"
                    />
                    <span className="text-[10px] text-zinc-300 font-mono w-7 text-right">
                      {maxHeight >= 84
                        ? "Any"
                        : `${Math.floor(maxHeight / 12)}'${maxHeight % 12}"`}
                    </span>
                  </div>

                  <select
                    value={rangeFilter}
                    onChange={(e) => setRangeFilter(e.target.value)}
                    aria-label="Filter by Vocal Range"
                    className="bg-zinc-900 border border-white/10 rounded-lg px-2.5 py-1.5 text-zinc-300 text-[10px] outline-none uppercase font-bold cursor-pointer shrink-0"
                  >
                    <option value="all">Any Range</option>
                    <option value="soprano">Soprano</option>
                    <option value="mezzo">Mezzo</option>
                    <option value="alto">Alto</option>
                    <option value="tenor">Tenor</option>
                    <option value="baritone">Baritone</option>
                    <option value="bass">Bass</option>
                  </select>
                </div>
              </div>
            </>
          )}
        </header>

        {/* WORKSPACE BODY */}
        {workspaceMode === "dance" ? (
          <div className="flex-1 overflow-hidden">
            <ChoreoWorkspace
              tenant={tenant}
              people={performers}
              judgeEmail={judgeEmail}
              onSaveDanceBallot={handleDanceBallotSave}
              onSaveGroupVideo={handleGroupDanceVideo}
            />
          </div>
        ) : (
          <div className="flex-1 flex min-h-0 overflow-hidden">
            {/* LEFT ROSTER LIST */}
            <div className="flex-1 overflow-y-auto p-3 md:p-5 space-y-5 custom-scrollbar">
              {flatVisible.length === 0 ? (
                <div className="text-center py-20 text-zinc-500 space-y-2">
                  <Users size={36} className="mx-auto opacity-30" />
                  <p className="text-sm font-bold text-zinc-300">No matching auditionees</p>
                  <p className="text-xs text-zinc-500">
                    Try clearing your search or slot/status filters.
                  </p>
                </div>
              ) : (
                Object.entries(grouped).map(([slotLabel, groupPeople]) => (
                  <div key={slotLabel} className="space-y-2">
                    <div className="sticky top-0 z-10 bg-black/90 backdrop-blur py-1.5 flex items-center justify-between border-b border-white/5">
                      <h3 className="text-[11px] font-black uppercase tracking-widest text-blue-400 flex items-center gap-1.5">
                        <Clock size={12} /> {slotLabel}
                      </h3>
                      <span className="text-[10px] font-bold text-zinc-500">
                        {groupPeople.length} {groupPeople.length === 1 ? "Actor" : "Actors"}
                      </span>
                    </div>

                    {groupPeople.map((person) => {
                      const myBallot = getMyBallot(person);
                      const consensus = person.auditionConsensus;
                      const isSelected = selectedPersonId === person.id;
                      const hasAnyVideo = Boolean(
                        person.auditionVideoUrl || person.danceVideoUrl || person.callbackVideoUrl
                      );

                      return (
                        <div key={person.id} className="flex items-stretch gap-1.5 md:gap-2">
                          <button
                            type="button"
                            onClick={() => openPersonForScoring(person)}
                            className={`flex-1 flex items-center gap-3 p-2.5 md:p-3 rounded-xl transition-all border min-w-0 text-left ${
                              isSelected
                                ? "bg-zinc-800/90 border-blue-500 ring-1 ring-blue-500"
                                : "bg-zinc-900/80 border-white/5 hover:bg-zinc-800/70"
                            }`}
                          >
                            {/* Avatar */}
                            <div className="relative shrink-0">
                              {person.avatar ? (
                                <img
                                  src={person.avatar}
                                  alt={person.name}
                                  className="w-11 h-11 md:w-12 md:h-12 rounded-xl object-cover object-top border border-white/10"
                                />
                              ) : (
                                <div className="w-11 h-11 md:w-12 md:h-12 rounded-xl bg-zinc-800 flex items-center justify-center">
                                  <User size={18} className="text-zinc-500" />
                                </div>
                              )}
                              <span
                                title={person.isCheckedIn ? "Checked In" : "Not Checked In"}
                                className={`absolute -bottom-1 -left-1 w-3 h-3 rounded-full border-2 border-zinc-900 ${
                                  person.isCheckedIn ? "bg-emerald-500" : "bg-amber-500"
                                }`}
                              />
                              {myBallot && (
                                <div
                                  title="Scored by you"
                                  className="absolute -top-1 -right-1 bg-black rounded-full"
                                >
                                  <CheckCircle2 size={14} className="text-emerald-400" />
                                </div>
                              )}
                            </div>

                            {/* Core Info */}
                            <div className="min-w-0 flex-1 space-y-1">
                              <div className="flex items-center gap-1.5 flex-wrap">
                                {person.auditionNumber && (
                                  <span className="px-1.5 py-0.5 rounded bg-zinc-800 text-[10px] font-black text-zinc-300">
                                    #{person.auditionNumber}
                                  </span>
                                )}
                                <span className="font-bold text-sm text-white truncate">
                                  {person.name}
                                </span>
                                {person.isCalledBack && (
                                  <span className="px-1.5 py-0.5 rounded-full bg-purple-500/20 border border-purple-500/40 text-purple-300 text-[9px] font-black uppercase">
                                    Callback
                                  </span>
                                )}
                                {hasAnyVideo && (
                                  <Film size={12} className="text-blue-400 shrink-0" />
                                )}
                                {person.backingTrack && (
                                  <Music size={12} className="text-purple-400 shrink-0" />
                                )}
                                {person.conflictsList.length > 0 && (
                                  <span
                                    title={`${person.conflictsList.length} schedule conflict(s)`}
                                    className="text-amber-400"
                                  >
                                    <AlertCircle size={12} />
                                  </span>
                                )}
                              </div>

                              <div className="flex items-center gap-2 text-[10px] text-zinc-400 flex-wrap">
                                <span>Age {person.age}</span>
                                {person.height && person.height !== "N/A" && (
                                  <span>• {person.height}</span>
                                )}
                                {person.vocalRange && <span>• {person.vocalRange}</span>}
                                {person.song && (
                                  <span className="truncate max-w-[180px] text-zinc-500">
                                    • 🎵 {person.song}
                                  </span>
                                )}
                              </div>
                            </div>

                            {/* Live 3-6 Judge Consensus Pill */}
                            <div className="hidden sm:flex flex-col items-end gap-1 shrink-0">
                              {consensus.judgeCount > 0 ? (
                                <>
                                  <span className="text-xs font-black text-white tabular-nums">
                                    {consensus.overallAverage.toFixed(1)}{" "}
                                    <span className="text-[10px] font-bold text-zinc-500">
                                      ({consensus.judgeCount}j)
                                    </span>
                                  </span>
                                  <div className="flex gap-1 text-[9px] font-black">
                                    {consensus.votes.strongYes > 0 && (
                                      <span className="px-1 rounded bg-emerald-500/20 text-emerald-300">
                                        {consensus.votes.strongYes}★
                                      </span>
                                    )}
                                    {consensus.votes.yes > 0 && (
                                      <span className="px-1 rounded bg-blue-500/20 text-blue-300">
                                        {consensus.votes.yes}Y
                                      </span>
                                    )}
                                    {consensus.votes.maybe > 0 && (
                                      <span className="px-1 rounded bg-amber-500/20 text-amber-300">
                                        {consensus.votes.maybe}M
                                      </span>
                                    )}
                                  </div>
                                </>
                              ) : (
                                <span className="text-[10px] font-bold text-zinc-600 uppercase">
                                  Unscored
                                </span>
                              )}
                            </div>
                          </button>

                          {/* Quick Record / Watch Video */}
                          <button
                            type="button"
                            onClick={() =>
                              hasAnyVideo
                                ? setInspectingActorId(person.id)
                                : setRecordingTarget({
                                    auditionId: person.id,
                                    name: person.name,
                                    kind: "audition",
                                  })
                            }
                            title={hasAnyVideo ? "Watch / Manage Video" : "Record Audition Tape"}
                            className={`w-10 rounded-xl border flex items-center justify-center shrink-0 transition-colors ${
                              hasAnyVideo
                                ? "bg-blue-500/15 border-blue-500/30 text-blue-400 hover:bg-blue-500/25"
                                : "bg-zinc-900 border-white/5 text-zinc-500 hover:text-red-400 hover:border-red-500/30"
                            }`}
                          >
                            {hasAnyVideo ? <PlayCircle size={17} /> : <Video size={16} />}
                          </button>

                          {/* Backing Track Quick Play */}
                          {person.backingTrack && (
                            <InlineTrackButton trackUrl={person.backingTrack} />
                          )}

                          {/* Quick Callback Toggle */}
                          <button
                            type="button"
                            onClick={() => handleToggleCallback(person)}
                            title={person.isCalledBack ? "Remove from Callbacks" : "Add to Callbacks"}
                            className={`w-10 rounded-xl border flex items-center justify-center shrink-0 transition-colors ${
                              person.isCalledBack
                                ? "bg-purple-600 border-purple-400 text-white"
                                : "bg-zinc-900 border-white/5 text-zinc-500 hover:text-purple-300 hover:border-purple-500/30"
                            }`}
                          >
                            <Sparkles size={15} />
                          </button>

                          {/* Actor Dossier */}
                          <button
                            type="button"
                            onClick={() => setInspectingActorId(person.id)}
                            title="View Full Bio, History & Panel Notes"
                            className="w-10 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-white/5 text-zinc-400 hover:text-white flex items-center justify-center shrink-0 transition-colors"
                          >
                            <User size={16} />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                ))
              )}
            </div>

            {/* RIGHT SCORING DRAWER */}
            {selectedPerson && (
              <ScoringSidebar
                selectedPerson={selectedPerson}
                setSelectedPerson={(p) => setSelectedPersonId(p ? p.id : null)}
                judgeRole={judgeRole}
                judgeEmail={judgeEmail}
                round="audition"
                blueprintRoles={blueprintRoles}
                currentScores={currentScores}
                setCurrentScores={setCurrentScores}
                isSaving={isSaving}
                onSave={handleSaveBallot}
                onNavigate={navigateActor}
                canGoPrev={currentIndex > 0}
                canGoNext={currentIndex >= 0 && currentIndex < flatVisible.length - 1}
                onInspectActor={() => setInspectingActorId(selectedPerson.id)}
                onToggleCallback={() => handleToggleCallback(selectedPerson)}
                onRecordVideo={(kind) =>
                  setRecordingTarget({
                    auditionId: selectedPerson.id,
                    name: selectedPerson.name,
                    kind,
                  })
                }
                onDeleteVideo={(kind) => {
                  if (confirm(`Remove this ${kind} video?`)) {
                    handleVideoSaved(selectedPerson.id, kind, null);
                  }
                }}
              />
            )}
          </div>
        )}
      </div>

      {/* ACTOR DOSSIER MODAL */}
      {inspectingActor && (
        <ActorProfileModal
          actor={inspectingActor}
          onClose={() => setInspectingActorId(null)}
          onRecordVideo={(kind) =>
            setRecordingTarget({
              auditionId: inspectingActor.id,
              name: inspectingActor.name,
              kind,
            })
          }
          onDeleteVideo={(kind) => {
            if (confirm(`Remove this ${kind} video?`)) {
              handleVideoSaved(inspectingActor.id, kind, null);
            }
          }}
        />
      )}

      {/* VIDEO RECORDER MODAL */}
      {recordingTarget && (
        <VideoRecorderModal
          tenant={tenant}
          subjectLabel={recordingTarget.name}
          videoKind={recordingTarget.kind}
          onSaved={(publicUrl) =>
            handleVideoSaved(recordingTarget.auditionId, recordingTarget.kind, publicUrl)
          }
          onClose={() => setRecordingTarget(null)}
        />
      )}
    </>
  );
}

function InlineTrackButton({ trackUrl }: { trackUrl: string }) {
  const [isPlaying, setIsPlaying] = useState(false);
  const audioRef = useRef<HTMLAudioElement>(null);

  const togglePlay = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!audioRef.current) return;
    if (isPlaying) {
      audioRef.current.pause();
    } else {
      document.querySelectorAll("audio").forEach((a) => a.pause());
      audioRef.current.play().catch(() => {});
    }
  };

  return (
    <div className="shrink-0 flex items-stretch" onClick={(e) => e.stopPropagation()}>
      <audio
        ref={audioRef}
        src={trackUrl}
        crossOrigin="anonymous"
        onPlay={() => setIsPlaying(true)}
        onPause={() => setIsPlaying(false)}
        onEnded={() => setIsPlaying(false)}
      />
      <button
        type="button"
        onClick={togglePlay}
        className={`w-10 sm:w-auto sm:px-3 rounded-xl transition-all border flex items-center justify-center gap-1.5 active:scale-95 ${
          isPlaying
            ? "bg-purple-600 border-purple-400 text-white"
            : "bg-purple-500/10 hover:bg-purple-500/20 border-purple-500/30 text-purple-300"
        }`}
        title="Play Backing Track"
      >
        {isPlaying ? (
          <div className="w-3.5 h-3.5 bg-white rounded-sm animate-pulse" />
        ) : (
          <PlayCircle size={17} />
        )}
        <span className="font-black text-[10px] uppercase tracking-wider hidden md:inline">
          {isPlaying ? "Stop" : "Track"}
        </span>
      </button>
    </div>
  );
}
