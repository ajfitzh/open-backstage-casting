// app/components/auditions/CallbacksClient.tsx
"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import Link from "next/link";
import { toast } from "@/app/components/ToastProvider";
import {
  Sparkles,
  User,
  Users,
  Search,
  UserPlus,
  Video,
  PlayCircle,
  Columns,
  X,
  CheckCircle2,
  ArrowLeft,
  AlertCircle,
  Tag,
} from "lucide-react";
import ActorProfileModal from "@/app/components/ActorProfileModal";
import ScoringSidebar, { type BallotDraft } from "./ScoringSidebar";
import VideoRecorderModal from "./VideoRecorderModal";
import InlineVideoPlayer from "./InlineVideoPlayer";
import { type JudgeRole, ROLE_THEMES } from "./AuditionsClient";
import {
  fetchAuditionDeckData,
  saveAuditionVideoAction,
  saveJudgeBallotAction,
  toggleCallbackSelectionAction,
} from "@/app/actions/audition-panel";
import type { AuditionDeckPerformer } from "@/app/lib/db/audition-panel-repo";
import type { VideoKind } from "@/app/lib/audition-workflow-helpers";

interface CallbacksClientProps {
  tenant: string;
  productionId: number;
  productionTitle: string;
  serverJudgeName: string;
  serverJudgeEmail: string;
  serverJudgeRole: string;
  initialPerformers: AuditionDeckPerformer[];
  blueprintRoles?: string[];
}

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

export default function CallbacksClient({
  tenant,
  productionId,
  productionTitle,
  serverJudgeName,
  serverJudgeEmail,
  serverJudgeRole,
  initialPerformers,
  blueprintRoles = [],
}: CallbacksClientProps) {
  const judgeName = serverJudgeName || "Panel Judge";
  const judgeEmail = (serverJudgeEmail || "").toLowerCase();
  const [judgeRole, setJudgeRole] = useState<JudgeRole>(mapRawRoleToJudgeRole(serverJudgeRole));

  // Keep full production pool so staff can promote/add actors into Callbacks anytime
  const [allPerformers, setAllPerformers] = useState<AuditionDeckPerformer[]>(
    initialPerformers || []
  );
  const [searchQuery, setSearchQuery] = useState("");
  const [groupFilter, setGroupFilter] = useState<string>("ALL");

  const [selectedPersonId, setSelectedPersonId] = useState<number | null>(null);
  const [inspectingActorId, setInspectingActorId] = useState<number | null>(null);
  const [showPromoteModal, setShowPromoteModal] = useState(false);
  const [promoteSearch, setPromoteSearch] = useState("");
  const [editingGroupFor, setEditingGroupFor] = useState<{
    id: number;
    name: string;
    value: string;
  } | null>(null);

  // Side-by-side comparison (2-4 actors)
  const [compareIds, setCompareIds] = useState<number[]>([]);
  const [showCompareModal, setShowCompareModal] = useState(false);

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

  const refreshDeck = useCallback(async () => {
    const res = await fetchAuditionDeckData(tenant, productionId, false);
    if (res.success) {
      setAllPerformers(res.performers);
    }
  }, [tenant, productionId]);

  useEffect(() => {
    const timer = setInterval(() => {
      refreshDeck().catch(() => {});
    }, 15000);
    return () => clearInterval(timer);
  }, [refreshDeck]);

  const calledBackList = useMemo(
    () => allPerformers.filter((p) => p.isCalledBack),
    [allPerformers]
  );

  // Unique callback groups from callbackStatus tags (comma-separated)
  const callbackGroups = useMemo(() => {
    const set = new Set<string>();
    for (const p of calledBackList) {
      if (p.callbackStatus) {
        for (const tag of p.callbackStatus.split(",")) {
          const clean = tag.trim();
          if (clean) set.add(clean);
        }
      }
    }
    return Array.from(set).sort();
  }, [calledBackList]);

  const visibleCallbacks = useMemo(() => {
    return calledBackList.filter((p) => {
      if (groupFilter !== "ALL") {
        const tags = (p.callbackStatus || "")
          .split(",")
          .map((t) => t.trim().toLowerCase());
        if (!tags.includes(groupFilter.toLowerCase())) return false;
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const hit =
          p.name.toLowerCase().includes(q) ||
          (p.auditionNumber || "").toLowerCase().includes(q) ||
          (p.callbackStatus || "").toLowerCase().includes(q) ||
          p.auditionConsensus.suggestedRoles.some((r) => r.toLowerCase().includes(q));
        if (!hit) return false;
      }
      return true;
    });
  }, [calledBackList, groupFilter, searchQuery]);

  const selectedPerson = useMemo(
    () => allPerformers.find((p) => p.id === selectedPersonId) || null,
    [allPerformers, selectedPersonId]
  );

  const inspectingActor = useMemo(
    () => allPerformers.find((p) => p.id === inspectingActorId) || null,
    [allPerformers, inspectingActorId]
  );

  const getMyCallbackBallot = useCallback(
    (person: AuditionDeckPerformer) => {
      return person.ballots.find(
        (b) => b.round === "callback" && b.judgeEmail.toLowerCase() === judgeEmail
      );
    },
    [judgeEmail]
  );

  const openPersonForCallbackScoring = useCallback(
    (person: AuditionDeckPerformer) => {
      setSelectedPersonId(person.id);
      const mine = getMyCallbackBallot(person);
      setCurrentScores({
        vocal: mine?.vocalScore ?? 0,
        acting: mine?.actingScore ?? 0,
        dance: mine?.danceScore ?? 0,
        presence: mine?.stagePresenceScore ?? 0,
        callbackVote: mine?.callbackVote ?? null,
        suggestedRoles: mine?.suggestedRoles || person.callbackStatus || "",
        notes: mine?.notes || "",
      });
    },
    [getMyCallbackBallot]
  );

  const currentIndex = selectedPerson
    ? visibleCallbacks.findIndex((p) => p.id === selectedPerson.id)
    : -1;

  const navigateActor = (delta: -1 | 1) => {
    const nextIdx = currentIndex + delta;
    if (nextIdx >= 0 && nextIdx < visibleCallbacks.length) {
      openPersonForCallbackScoring(visibleCallbacks[nextIdx]);
    }
  };

  const handleSaveCallbackBallot = async (advanceNext = false) => {
    if (!selectedPerson) return;
    setIsSaving(true);
    try {
      const res = await saveJudgeBallotAction(tenant, productionId, selectedPerson.id, {
        round: "callback",
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
        toast.error(res.error || "Could not save callback ballot.");
        return;
      }

      setAllPerformers((prev) =>
        prev.map((p) =>
          p.id === selectedPerson.id
            ? {
                ...p,
                ballots: res.ballots,
                auditionConsensus: res.auditionConsensus,
                callbackConsensus: res.callbackConsensus,
              }
            : p
        )
      );
      toast.success(`Callback ballot saved for ${selectedPerson.name}`);

      if (advanceNext && currentIndex >= 0 && currentIndex < visibleCallbacks.length - 1) {
        openPersonForCallbackScoring(visibleCallbacks[currentIndex + 1]);
      }
    } catch {
      toast.error("Failed to save callback ballot.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleToggleCallback = async (
    person: AuditionDeckPerformer,
    nextState: boolean,
    groupLabel?: string
  ) => {
    setAllPerformers((prev) =>
      prev.map((p) =>
        p.id === person.id
          ? {
              ...p,
              isCalledBack: nextState,
              status: nextState ? "Called Back" : p.isCheckedIn ? "Checked In" : "Pending",
              callbackStatus:
                groupLabel !== undefined ? groupLabel : nextState ? p.callbackStatus : "",
            }
          : p
      )
    );
    const res = await toggleCallbackSelectionAction(
      tenant,
      productionId,
      person.id,
      nextState,
      groupLabel
    );
    if (!res.success) {
      toast.error(res.error || "Failed to update callback status.");
      refreshDeck();
    } else {
      toast.success(
        nextState
          ? `${person.name} updated in Callbacks`
          : `${person.name} removed from Callbacks`
      );
    }
  };

  const handleVideoSaved = async (auditionId: number, kind: VideoKind, publicUrl: string | null) => {
    const res = await saveAuditionVideoAction(tenant, productionId, auditionId, kind, publicUrl);
    if (!res.success) {
      toast.error(res.error || "Failed to save video.");
      return;
    }
    setAllPerformers((prev) =>
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

  const toggleCompare = (id: number) => {
    setCompareIds((prev) => {
      if (prev.includes(id)) return prev.filter((x) => x !== id);
      if (prev.length >= 4) {
        toast.warning("You can compare up to 4 actors side-by-side.");
        return prev;
      }
      return [...prev, id];
    });
  };

  const compareActors = useMemo(
    () => allPerformers.filter((p) => compareIds.includes(p.id)),
    [allPerformers, compareIds]
  );

  // Candidates not yet called back, sorted by Strong Yes / Yes votes then Panel Average
  const promotableCandidates = useMemo(() => {
    return allPerformers
      .filter((p) => !p.isCalledBack)
      .filter((p) =>
        promoteSearch.trim()
          ? p.name.toLowerCase().includes(promoteSearch.toLowerCase()) ||
            (p.auditionNumber || "").includes(promoteSearch.trim())
          : true
      )
      .sort((a, b) => {
        const scoreA =
          a.auditionConsensus.votes.strongYes * 3 +
          a.auditionConsensus.votes.yes * 2 +
          a.auditionConsensus.overallAverage;
        const scoreB =
          b.auditionConsensus.votes.strongYes * 3 +
          b.auditionConsensus.votes.yes * 2 +
          b.auditionConsensus.overallAverage;
        return scoreB - scoreA;
      });
  }, [allPerformers, promoteSearch]);

  return (
    <>
      <div className="flex flex-col h-full bg-black text-white overflow-hidden">
        {/* HEADER */}
        <header
          className={`px-4 py-3 md:px-6 md:py-4 border-b-2 bg-zinc-950 border-purple-500 shrink-0 space-y-3`}
        >
          <div className="flex flex-col md:flex-row justify-between md:items-center gap-3">
            <div>
              <div className="flex items-center gap-2.5 flex-wrap">
                <span className="px-2 py-0.5 rounded-full bg-purple-600/20 border border-purple-500/40 text-purple-300 text-[10px] font-black uppercase tracking-widest flex items-center gap-1">
                  <Sparkles size={11} /> Callback Room
                </span>
                <h1 className="text-lg md:text-2xl font-black italic uppercase tracking-tight">
                  {productionTitle}
                </h1>
                <span className="text-xs font-bold text-zinc-400">
                  {calledBackList.length} Called Back
                </span>
              </div>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-[10px] uppercase text-zinc-400 font-bold">{judgeName}</span>
                <span className="text-zinc-700">•</span>
                <select
                  value={judgeRole}
                  onChange={(e) => setJudgeRole(e.target.value as JudgeRole)}
                  aria-label="Judge Discipline"
                  className="bg-zinc-900 border border-white/10 rounded px-2 py-0.5 text-[10px] font-black uppercase text-zinc-200 outline-none"
                >
                  <option value="Director">Director</option>
                  <option value="Music">Music Director</option>
                  <option value="Choreographer">Choreographer</option>
                  <option value="Drop-In">Panel Judge</option>
                  <option value="Admin">Producer / Admin</option>
                </select>
              </div>
            </div>

            <div className="flex items-center gap-2 overflow-x-auto no-scrollbar shrink-0">
              <Link
                href={`/${tenant}/production/${productionId}/auditions`}
                className="px-3 py-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-white/10 text-zinc-300 text-[10px] font-black uppercase tracking-wider flex items-center gap-1.5 whitespace-nowrap"
              >
                <ArrowLeft size={13} /> Audition Deck
              </Link>
              <button
                type="button"
                onClick={() => setShowPromoteModal(true)}
                className="px-3.5 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-[10px] font-black uppercase tracking-wider flex items-center gap-1.5 whitespace-nowrap shadow-lg shadow-purple-900/30"
              >
                <UserPlus size={13} /> Add to Callbacks
              </button>
              {compareIds.length >= 2 && (
                <button
                  type="button"
                  onClick={() => setShowCompareModal(true)}
                  className="px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-[10px] font-black uppercase tracking-wider flex items-center gap-1.5 whitespace-nowrap shadow-lg"
                >
                  <Columns size={13} /> Compare ({compareIds.length})
                </button>
              )}
            </div>
          </div>

          {/* Search & Group Filter Pills */}
          <div className="flex flex-col md:flex-row gap-2">
            <div className="relative flex-1">
              <Search
                size={14}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500"
              />
              <input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search called-back actors, role groups, or audition #..."
                className="w-full bg-zinc-900 border border-white/10 rounded-xl py-2 pl-9 pr-3 text-xs text-white placeholder:text-zinc-500 focus:border-purple-500 outline-none"
              />
            </div>

            <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
              <button
                type="button"
                onClick={() => setGroupFilter("ALL")}
                className={`px-3 py-1.5 rounded-full text-[10px] font-black uppercase whitespace-nowrap border ${
                  groupFilter === "ALL"
                    ? "bg-purple-600 border-purple-400 text-white"
                    : "bg-zinc-900 border-white/10 text-zinc-400 hover:text-white"
                }`}
              >
                All ({calledBackList.length})
              </button>
              {callbackGroups.map((grp) => (
                <button
                  key={grp}
                  type="button"
                  onClick={() => setGroupFilter(grp)}
                  className={`px-3 py-1.5 rounded-full text-[10px] font-black uppercase whitespace-nowrap border ${
                    groupFilter === grp
                      ? "bg-purple-600 border-purple-400 text-white"
                      : "bg-zinc-900 border-white/10 text-zinc-400 hover:text-white"
                  }`}
                >
                  {grp}
                </button>
              ))}
            </div>
          </div>
        </header>

        {/* BODY */}
        <div className="flex-1 flex min-h-0 overflow-hidden">
          <div className="flex-1 overflow-y-auto p-4 md:p-6 custom-scrollbar">
            {visibleCallbacks.length === 0 ? (
              <div className="text-center py-20 max-w-md mx-auto space-y-3">
                <Sparkles size={40} className="mx-auto text-purple-500/40" />
                <h2 className="text-base font-black uppercase text-white">
                  {calledBackList.length === 0
                    ? "No Performers Called Back Yet"
                    : "No Matching Callback Performers"}
                </h2>
                <p className="text-xs text-zinc-400">
                  {calledBackList.length === 0
                    ? "Tap 'Add to Callbacks' to pull top-voted performers from the Audition Deck, or toggle the sparkle button on any auditionee."
                    : "Try clearing your search or role group filter."}
                </p>
                {calledBackList.length === 0 && (
                  <button
                    type="button"
                    onClick={() => setShowPromoteModal(true)}
                    className="mt-2 px-4 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-black uppercase tracking-wider inline-flex items-center gap-2"
                  >
                    <UserPlus size={14} /> Pull Top Performers into Callbacks
                  </button>
                )}
              </div>
            ) : (
              <div className="grid grid-cols-1 xl:grid-cols-2 gap-3">
                {visibleCallbacks.map((person) => {
                  const myCb = getMyCallbackBallot(person);
                  const isComparing = compareIds.includes(person.id);
                  const isSelected = selectedPersonId === person.id;

                  return (
                    <div
                      key={person.id}
                      className={`p-3.5 rounded-2xl border transition-all flex flex-col gap-3 ${
                        isSelected
                          ? "bg-zinc-800/90 border-purple-500 ring-1 ring-purple-500"
                          : "bg-zinc-900/75 border-white/10 hover:border-white/20"
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        {/* Headshot */}
                        <button
                          type="button"
                          onClick={() => openPersonForCallbackScoring(person)}
                          className="relative w-14 h-14 rounded-xl overflow-hidden border border-white/10 shrink-0"
                        >
                          <img
                            src={person.avatar || ""}
                            alt={person.name}
                            className="w-full h-full object-cover object-top"
                          />
                          {myCb && (
                            <span className="absolute -top-1 -right-1 bg-black rounded-full">
                              <CheckCircle2 size={14} className="text-emerald-400" />
                            </span>
                          )}
                        </button>

                        {/* Name + Scores */}
                        <button
                          type="button"
                          onClick={() => openPersonForCallbackScoring(person)}
                          className="flex-1 min-w-0 text-left space-y-1"
                        >
                          <div className="flex items-center gap-2 flex-wrap">
                            {person.auditionNumber && (
                              <span className="px-1.5 py-0.5 rounded bg-zinc-800 text-[10px] font-black text-zinc-300">
                                #{person.auditionNumber}
                              </span>
                            )}
                            <span className="font-black text-sm text-white truncate">
                              {person.name}
                            </span>
                            {person.conflictsList.length > 0 && (
                              <AlertCircle size={12} className="text-amber-400 shrink-0" />
                            )}
                          </div>
                          <div className="flex flex-wrap gap-2 text-[10px] text-zinc-400">
                            <span>Age {person.age}</span>
                            {person.height !== "N/A" && <span>• {person.height}</span>}
                            {person.vocalRange && <span>• {person.vocalRange}</span>}
                          </div>
                          <div className="flex flex-wrap gap-2 pt-0.5 text-[10px] font-bold">
                            <span className="px-2 py-0.5 rounded bg-zinc-800 text-zinc-300">
                              Initial:{" "}
                              {person.auditionConsensus.overallAverage > 0
                                ? `${person.auditionConsensus.overallAverage.toFixed(1)} (${person.auditionConsensus.judgeCount}j)`
                                : "—"}
                            </span>
                            <span className="px-2 py-0.5 rounded bg-purple-500/20 text-purple-300">
                              Callback:{" "}
                              {person.callbackConsensus.overallAverage > 0
                                ? `${person.callbackConsensus.overallAverage.toFixed(1)} (${person.callbackConsensus.judgeCount}j)`
                                : "Not scored"}
                            </span>
                          </div>
                        </button>

                        {/* Compare Checkbox */}
                        <button
                          type="button"
                          onClick={() => toggleCompare(person.id)}
                          className={`px-2 py-1 rounded-lg text-[9px] font-black uppercase border shrink-0 transition-colors ${
                            isComparing
                              ? "bg-blue-600 border-blue-400 text-white"
                              : "bg-zinc-950 border-white/10 text-zinc-400 hover:text-white"
                          }`}
                        >
                          {isComparing ? "Comparing" : "Compare"}
                        </button>
                      </div>

                      {/* Role / Callback Group Row */}
                      <div className="flex items-center justify-between gap-2 pt-2 border-t border-white/5 flex-wrap">
                        <button
                          type="button"
                          onClick={() =>
                            setEditingGroupFor({
                              id: person.id,
                              name: person.name,
                              value: person.callbackStatus || "",
                            })
                          }
                          className="flex items-center gap-1.5 text-[10px] font-bold text-zinc-300 hover:text-purple-300 truncate"
                        >
                          <Tag size={11} className="text-purple-400 shrink-0" />
                          <span className="truncate">
                            {person.callbackStatus || "Assign callback role/group..."}
                          </span>
                        </button>

                        <div className="flex items-center gap-1.5 shrink-0">
                          <button
                            type="button"
                            onClick={() =>
                              setRecordingTarget({
                                auditionId: person.id,
                                name: person.name,
                                kind: "callback",
                              })
                            }
                            className={`px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase flex items-center gap-1 border ${
                              person.callbackVideoUrl
                                ? "bg-blue-500/15 border-blue-500/30 text-blue-300"
                                : "bg-zinc-950 border-white/10 text-zinc-400 hover:text-white"
                            }`}
                          >
                            {person.callbackVideoUrl ? (
                              <>
                                <PlayCircle size={12} /> Retake
                              </>
                            ) : (
                              <>
                                <Video size={12} /> Record
                              </>
                            )}
                          </button>
                          <button
                            type="button"
                            onClick={() => setInspectingActorId(person.id)}
                            className="p-1.5 rounded-lg bg-zinc-950 border border-white/10 text-zinc-400 hover:text-white"
                            title="Open Actor Dossier"
                          >
                            <User size={13} />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* RIGHT CALLBACK SCORING DRAWER */}
          {selectedPerson && (
            <ScoringSidebar
              selectedPerson={selectedPerson}
              setSelectedPerson={(p) => setSelectedPersonId(p ? p.id : null)}
              judgeRole={judgeRole}
              judgeEmail={judgeEmail}
              round="callback"
              blueprintRoles={blueprintRoles}
              currentScores={currentScores}
              setCurrentScores={setCurrentScores}
              isSaving={isSaving}
              onSave={handleSaveCallbackBallot}
              onNavigate={navigateActor}
              canGoPrev={currentIndex > 0}
              canGoNext={currentIndex >= 0 && currentIndex < visibleCallbacks.length - 1}
              onInspectActor={() => setInspectingActorId(selectedPerson.id)}
              onToggleCallback={() => handleToggleCallback(selectedPerson, !selectedPerson.isCalledBack)}
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
      </div>

      {/* PROMOTE / ADD TO CALLBACKS MODAL */}
      {showPromoteModal && (
        <div
          className="fixed inset-0 z-[240] bg-black/85 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => setShowPromoteModal(false)}
        >
          <div
            className="w-full max-w-xl max-h-[85dvh] bg-zinc-950 border border-white/10 rounded-2xl overflow-hidden flex flex-col shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-4 border-b border-white/10 bg-zinc-900/60 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-black uppercase text-white">
                  Add Performers to Callbacks
                </h3>
                <p className="text-[11px] text-zinc-400">
                  Sorted by panel callback votes &amp; overall audition average
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowPromoteModal(false)}
                className="p-1.5 text-zinc-400 hover:text-white"
              >
                <X size={18} />
              </button>
            </div>
            <div className="p-3 border-b border-white/5">
              <input
                value={promoteSearch}
                onChange={(e) => setPromoteSearch(e.target.value)}
                placeholder="Search remaining auditionees..."
                className="w-full bg-zinc-900 border border-white/10 rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-purple-500"
              />
            </div>
            <div className="flex-1 overflow-y-auto p-3 space-y-2 custom-scrollbar">
              {promotableCandidates.length === 0 ? (
                <p className="text-center text-xs text-zinc-500 py-8">
                  All matching auditionees are already in Callbacks.
                </p>
              ) : (
                promotableCandidates.map((p) => (
                  <div
                    key={p.id}
                    className="flex items-center justify-between gap-3 p-2.5 rounded-xl bg-zinc-900/70 border border-white/5"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <img
                        src={p.avatar || ""}
                        alt={p.name}
                        className="w-9 h-9 rounded-lg object-cover object-top shrink-0"
                      />
                      <div className="min-w-0">
                        <p className="text-xs font-bold text-white truncate">
                          {p.auditionNumber ? `#${p.auditionNumber} ` : ""}
                          {p.name}
                        </p>
                        <p className="text-[10px] text-zinc-400">
                          Avg {p.auditionConsensus.overallAverage.toFixed(1)} ·{" "}
                          {p.auditionConsensus.votes.strongYes}★ {p.auditionConsensus.votes.yes}Y{" "}
                          {p.auditionConsensus.votes.maybe}M
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() =>
                        handleToggleCallback(
                          p,
                          true,
                          p.auditionConsensus.suggestedRoles.slice(0, 2).join(", ")
                        )
                      }
                      className="px-3 py-1.5 rounded-lg bg-purple-600 hover:bg-purple-500 text-white text-[10px] font-black uppercase shrink-0"
                    >
                      Call Back
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* EDIT CALLBACK ROLE GROUP MODAL */}
      {editingGroupFor && (
        <div
          className="fixed inset-0 z-[240] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => setEditingGroupFor(null)}
        >
          <div
            className="w-full max-w-md bg-zinc-950 border border-white/10 rounded-2xl p-5 space-y-4 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-black uppercase text-white">
                Callback Groups — {editingGroupFor.name}
              </h3>
              <button
                type="button"
                onClick={() => setEditingGroupFor(null)}
                className="text-zinc-400 hover:text-white"
              >
                <X size={18} />
              </button>
            </div>
            <input
              value={editingGroupFor.value}
              onChange={(e) =>
                setEditingGroupFor({ ...editingGroupFor, value: e.target.value })
              }
              placeholder="e.g., Lead Vocals, Belle, Dance Call"
              className="w-full bg-zinc-900 border border-white/10 rounded-xl px-3 py-2.5 text-xs text-white outline-none focus:border-purple-500"
            />
            {blueprintRoles.length > 0 && (
              <div className="flex flex-wrap gap-1.5 max-h-28 overflow-y-auto">
                {blueprintRoles.slice(0, 16).map((role) => (
                  <button
                    key={role}
                    type="button"
                    onClick={() => {
                      const parts = editingGroupFor.value
                        .split(",")
                        .map((s) => s.trim())
                        .filter(Boolean);
                      const has = parts.some((x) => x.toLowerCase() === role.toLowerCase());
                      const next = has
                        ? parts.filter((x) => x.toLowerCase() !== role.toLowerCase())
                        : [...parts, role];
                      setEditingGroupFor({ ...editingGroupFor, value: next.join(", ") });
                    }}
                    className="px-2 py-1 rounded-full bg-zinc-900 border border-white/10 hover:border-purple-400 text-[10px] font-bold text-zinc-300"
                  >
                    + {role}
                  </button>
                ))}
              </div>
            )}
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setEditingGroupFor(null)}
                className="px-4 py-2 rounded-xl bg-zinc-900 text-xs font-bold text-zinc-300"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={async () => {
                  const target = allPerformers.find((p) => p.id === editingGroupFor.id);
                  if (target) {
                    await handleToggleCallback(target, true, editingGroupFor.value);
                  }
                  setEditingGroupFor(null);
                }}
                className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-xs font-black uppercase text-white"
              >
                Save Groups
              </button>
            </div>
          </div>
        </div>
      )}

      {/* SIDE-BY-SIDE COMPARISON MODAL (2-4 ACTORS) */}
      {showCompareModal && compareActors.length >= 2 && (
        <div
          className="fixed inset-0 z-[250] bg-black/90 backdrop-blur-md flex items-center justify-center p-3 md:p-6"
          onClick={() => setShowCompareModal(false)}
        >
          <div
            className="w-full max-w-6xl max-h-[92dvh] bg-zinc-950 border border-white/10 rounded-2xl overflow-hidden flex flex-col shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-5 py-4 border-b border-white/10 bg-zinc-900/60 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Columns size={16} className="text-blue-400" />
                <h3 className="text-sm md:text-base font-black uppercase text-white">
                  Side-by-Side Callback Comparison ({compareActors.length} Actors)
                </h3>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setCompareIds([]);
                    setShowCompareModal(false);
                  }}
                  className="text-[10px] font-bold uppercase text-zinc-400 hover:text-white px-2.5 py-1 rounded bg-zinc-800"
                >
                  Clear Selection
                </button>
                <button
                  type="button"
                  onClick={() => setShowCompareModal(false)}
                  className="p-1.5 text-zinc-400 hover:text-white"
                >
                  <X size={20} />
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-auto p-4 md:p-5 custom-scrollbar">
              <div
                className={`grid gap-4 ${
                  compareActors.length === 2
                    ? "grid-cols-1 md:grid-cols-2"
                    : compareActors.length === 3
                    ? "grid-cols-1 md:grid-cols-3"
                    : "grid-cols-1 md:grid-cols-2 xl:grid-cols-4"
                }`}
              >
                {compareActors.map((actor) => (
                  <div
                    key={actor.id}
                    className="rounded-2xl bg-zinc-900/70 border border-white/10 p-4 space-y-3 flex flex-col"
                  >
                    <div className="flex items-center gap-3">
                      <img
                        src={actor.avatar || ""}
                        alt={actor.name}
                        className="w-16 h-16 rounded-xl object-cover object-top border border-white/10"
                      />
                      <div className="min-w-0">
                        <h4 className="font-black text-sm uppercase text-white truncate">
                          {actor.name}
                        </h4>
                        <p className="text-[11px] text-zinc-400">
                          Age {actor.age} • {actor.height}
                        </p>
                        <p className="text-[11px] text-purple-300 font-bold truncate">
                          {actor.vocalRange || actor.voiceType || "Range N/A"}
                        </p>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-center">
                      <div className="p-2 rounded-xl bg-black/40 border border-white/5">
                        <p className="text-[9px] font-bold uppercase text-zinc-500">Initial Avg</p>
                        <p className="text-base font-black text-white">
                          {actor.auditionConsensus.overallAverage > 0
                            ? actor.auditionConsensus.overallAverage.toFixed(1)
                            : "—"}
                        </p>
                      </div>
                      <div className="p-2 rounded-xl bg-purple-500/15 border border-purple-500/30">
                        <p className="text-[9px] font-bold uppercase text-purple-300">Callback Avg</p>
                        <p className="text-base font-black text-purple-200">
                          {actor.callbackConsensus.overallAverage > 0
                            ? actor.callbackConsensus.overallAverage.toFixed(1)
                            : "—"}
                        </p>
                      </div>
                    </div>

                    <div className="grid grid-cols-4 gap-1 text-center text-[10px]">
                      {[
                        { l: "V", v: actor.callbackConsensus.avgVocal || actor.auditionConsensus.avgVocal },
                        { l: "A", v: actor.callbackConsensus.avgActing || actor.auditionConsensus.avgActing },
                        { l: "D", v: actor.callbackConsensus.avgDance || actor.auditionConsensus.avgDance },
                        { l: "P", v: actor.callbackConsensus.avgPresence || actor.auditionConsensus.avgPresence },
                      ].map((s) => (
                        <div key={s.l} className="bg-black/30 rounded py-1">
                          <span className="text-zinc-500 font-bold">{s.l}:</span>{" "}
                          <span className="text-white font-black">{s.v ? s.v.toFixed(1) : "-"}</span>
                        </div>
                      ))}
                    </div>

                    <InlineVideoPlayer
                      auditionVideoUrl={actor.auditionVideoUrl}
                      danceVideoUrl={actor.danceVideoUrl}
                      callbackVideoUrl={actor.callbackVideoUrl}
                      posterUrl={actor.avatar}
                      defaultTab={actor.callbackVideoUrl ? "callback" : "audition"}
                      compact
                    />

                    <div className="text-[11px] space-y-1">
                      <p className="text-[9px] font-black uppercase text-zinc-500">
                        Conflicts ({actor.conflictsList.length})
                      </p>
                      {actor.conflictsList.length === 0 ? (
                        <p className="text-emerald-400 text-[11px]">No conflicts</p>
                      ) : (
                        <p className="text-red-300 text-[11px] line-clamp-3">
                          {actor.conflictsList.join("; ")}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

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
