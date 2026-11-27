"use client";

import React, { useRef, useState } from "react";
import {
  X,
  MessageSquare,
  Save,
  User,
  Music,
  Star,
  Move,
  ChevronLeft,
  ChevronRight,
  Users,
  Sparkles,
  CheckCircle2,
  Loader2,
  ChevronDown,
  ChevronUp,
  Info,
} from "lucide-react";
import InlineVideoPlayer from "./InlineVideoPlayer";
import type { AuditionDeckPerformer } from "@/app/lib/db/audition-panel-repo";
import type {
  AuditionRound,
  CallbackVote,
  VideoKind,
} from "@/app/lib/audition-workflow-helpers";
import { JudgeRole, ROLE_THEMES } from "./AuditionsClient";

function NormalizedAudioPlayer({ src }: { src: string }) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const contextRef = useRef<AudioContext | null>(null);
  const [isNormalized, setIsNormalized] = useState(false);
  const [error, setError] = useState(false);

  const handlePlay = () => {
    if (!audioRef.current || contextRef.current) return;
    try {
      const AudioContextCtor = window.AudioContext || (window as any).webkitAudioContext;
      const ctx = new AudioContextCtor();
      contextRef.current = ctx;

      const source = ctx.createMediaElementSource(audioRef.current);
      const compressor = ctx.createDynamicsCompressor();
      compressor.threshold.value = -30;
      compressor.knee.value = 20;
      compressor.ratio.value = 12;
      compressor.attack.value = 0.003;
      compressor.release.value = 0.25;

      const makeUpGain = ctx.createGain();
      makeUpGain.gain.value = 2.5;

      source.connect(compressor);
      compressor.connect(makeUpGain);
      makeUpGain.connect(ctx.destination);
      setIsNormalized(true);
    } catch {
      setError(true);
    }
  };

  return (
    <div className="flex flex-col gap-1.5">
      <audio
        ref={audioRef}
        controls
        preload="metadata"
        crossOrigin="anonymous"
        src={src}
        className="w-full outline-none h-9"
        onPlay={handlePlay}
      />
      {isNormalized && !error && (
        <div className="flex items-center justify-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
          <span className="text-[9px] font-black uppercase tracking-widest text-emerald-500">
            Auto-Leveling Active
          </span>
        </div>
      )}
    </div>
  );
}

const SCORE_LABELS = ["—", "Weak", "Fair", "Good", "Great", "Exc."];

function ScoreButtonRow({
  label,
  icon,
  val,
  setVal,
  highlighted,
  accent,
}: {
  label: string;
  icon: React.ReactNode;
  val: number;
  setVal: (n: number) => void;
  highlighted?: boolean;
  accent: string;
}) {
  return (
    <div
      className={`p-3 rounded-xl border transition-colors ${
        highlighted
          ? "bg-zinc-900 border-blue-500/40"
          : "bg-zinc-900/50 border-white/5"
      }`}
    >
      <div className="flex items-center justify-between mb-2">
        <span className="text-[11px] font-black uppercase tracking-wider text-zinc-300 flex items-center gap-1.5">
          {icon}
          {label}
          {highlighted && (
            <span className="text-[8px] px-1.5 py-0.5 rounded bg-blue-500/20 text-blue-300 font-black">
              Primary
            </span>
          )}
        </span>
        <span className="text-xs font-black text-zinc-400">
          {val > 0 ? `${val} · ${SCORE_LABELS[Math.round(val)]}` : "Not Scored"}
        </span>
      </div>
      <div className="grid grid-cols-6 gap-1.5">
        {[0, 1, 2, 3, 4, 5].map((n) => {
          const isSelected = val === n;
          return (
            <button
              key={n}
              type="button"
              onClick={() => setVal(n)}
              className={`h-10 rounded-lg font-black text-xs transition-all active:scale-95 border ${
                isSelected
                  ? n === 0
                    ? "bg-zinc-700 border-zinc-500 text-white"
                    : `${accent} text-white shadow-md`
                  : "bg-zinc-950 border-white/5 text-zinc-500 hover:text-zinc-200 hover:bg-zinc-800"
              }`}
            >
              {n === 0 ? "—" : n}
            </button>
          );
        })}
      </div>
    </div>
  );
}

const CALLBACK_VOTE_OPTIONS: Array<{
  value: CallbackVote;
  label: string;
  activeCls: string;
}> = [
  {
    value: "strong_yes",
    label: "Strong Yes",
    activeCls: "bg-emerald-600 border-emerald-400 text-white shadow-lg shadow-emerald-900/30",
  },
  {
    value: "yes",
    label: "Yes",
    activeCls: "bg-blue-600 border-blue-400 text-white shadow-lg shadow-blue-900/30",
  },
  {
    value: "maybe",
    label: "Maybe",
    activeCls: "bg-amber-600 border-amber-400 text-white shadow-lg shadow-amber-900/30",
  },
  {
    value: "no",
    label: "No",
    activeCls: "bg-red-600 border-red-400 text-white shadow-lg shadow-red-900/30",
  },
];

export interface BallotDraft {
  vocal: number;
  acting: number;
  dance: number;
  presence: number;
  callbackVote: CallbackVote | null;
  suggestedRoles: string;
  notes: string;
}

interface ScoringSidebarProps {
  selectedPerson: AuditionDeckPerformer;
  setSelectedPerson: (person: AuditionDeckPerformer | null) => void;
  judgeRole: JudgeRole;
  judgeEmail: string;
  round: AuditionRound;
  blueprintRoles: string[];
  currentScores: BallotDraft;
  setCurrentScores: React.Dispatch<React.SetStateAction<BallotDraft>>;
  isSaving: boolean;
  onSave: (advanceNext?: boolean) => Promise<void>;
  onNavigate?: (delta: -1 | 1) => void;
  canGoPrev?: boolean;
  canGoNext?: boolean;
  onInspectActor: () => void;
  onToggleCallback: () => void;
  onRecordVideo: (kind: VideoKind) => void;
  onDeleteVideo: (kind: VideoKind) => void;
}

export default function ScoringSidebar({
  selectedPerson,
  setSelectedPerson,
  judgeRole,
  judgeEmail,
  round,
  blueprintRoles,
  currentScores,
  setCurrentScores,
  isSaving,
  onSave,
  onNavigate,
  canGoPrev,
  canGoNext,
  onInspectActor,
  onToggleCallback,
  onRecordVideo,
  onDeleteVideo,
}: ScoringSidebarProps) {
  const [showOtherJudges, setShowOtherJudges] = useState(false);

  const consensus =
    round === "callback"
      ? selectedPerson.callbackConsensus
      : selectedPerson.auditionConsensus;
  const roundBallots = selectedPerson.ballots.filter((b) => b.round === round);
  const otherBallots = roundBallots.filter(
    (b) => b.judgeEmail.toLowerCase() !== judgeEmail.toLowerCase()
  );

  const toggleSuggestedRole = (roleName: string) => {
    const existing = currentScores.suggestedRoles
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
    const has = existing.some((r) => r.toLowerCase() === roleName.toLowerCase());
    const next = has
      ? existing.filter((r) => r.toLowerCase() !== roleName.toLowerCase())
      : [...existing, roleName];
    setCurrentScores((prev) => ({ ...prev, suggestedRoles: next.join(", ") }));
  };

  return (
    <aside className="fixed inset-0 z-[200] h-[100dvh] md:h-full w-full bg-zinc-950 flex flex-col md:relative md:w-[460px] md:border-l md:border-white/10 md:z-40">
      {/* Header */}
      <div className="p-4 border-b border-white/10 bg-zinc-900/70 shrink-0 space-y-3">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-3 min-w-0">
            <div className="relative w-14 h-14 rounded-xl bg-zinc-800 overflow-hidden border border-white/10 shrink-0">
              {selectedPerson.avatar ? (
                <img
                  src={selectedPerson.avatar}
                  className="w-full h-full object-cover object-top"
                  alt={selectedPerson.name}
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-zinc-600">
                  <User size={24} />
                </div>
              )}
              {selectedPerson.auditionNumber && (
                <span className="absolute bottom-0 right-0 px-1.5 py-0.5 bg-blue-600 text-[9px] font-black text-white rounded-tl-md">
                  #{selectedPerson.auditionNumber}
                </span>
              )}
            </div>
            <div className="min-w-0">
              <h2 className="text-lg font-black italic uppercase leading-tight text-white truncate">
                {selectedPerson.name}
              </h2>
              <div className="flex flex-wrap items-center gap-1.5 mt-1">
                <span className="bg-zinc-800 text-zinc-300 px-1.5 py-0.5 rounded text-[10px] font-bold">
                  Age {selectedPerson.age}
                </span>
                {selectedPerson.height && selectedPerson.height !== "N/A" && (
                  <span className="bg-zinc-800 text-zinc-300 px-1.5 py-0.5 rounded text-[10px] font-bold">
                    {selectedPerson.height}
                  </span>
                )}
                {selectedPerson.vocalRange && (
                  <span className="bg-purple-500/15 text-purple-300 px-1.5 py-0.5 rounded text-[10px] font-bold">
                    {selectedPerson.vocalRange}
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-1 shrink-0">
            {onNavigate && (
              <>
                <button
                  type="button"
                  onClick={() => onNavigate(-1)}
                  disabled={!canGoPrev}
                  className="p-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 disabled:opacity-25"
                  title="Previous Actor"
                >
                  <ChevronLeft size={16} />
                </button>
                <button
                  type="button"
                  onClick={() => onNavigate(1)}
                  disabled={!canGoNext}
                  className="p-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 disabled:opacity-25"
                  title="Next Actor"
                >
                  <ChevronRight size={16} />
                </button>
              </>
            )}
            <button
              type="button"
              onClick={() => setSelectedPerson(null)}
              className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-white/5"
              aria-label="Close Scoring Panel"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Quick Action Strip */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onInspectActor}
            className="flex-1 py-1.5 px-3 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-[10px] font-black uppercase tracking-wider text-zinc-200 flex items-center justify-center gap-1.5"
          >
            <Info size={12} /> Full Bio & Conflicts
            {selectedPerson.conflictsList.length > 0 && (
              <span className="px-1.5 rounded-full bg-red-500/20 text-red-300 text-[9px]">
                {selectedPerson.conflictsList.length}
              </span>
            )}
          </button>
          <button
            type="button"
            onClick={onToggleCallback}
            className={`py-1.5 px-3 rounded-lg text-[10px] font-black uppercase tracking-wider flex items-center gap-1.5 border transition-colors ${
              selectedPerson.isCalledBack
                ? "bg-purple-600 border-purple-400 text-white"
                : "bg-zinc-900 border-white/10 text-zinc-400 hover:text-white"
            }`}
          >
            <Sparkles size={12} />
            {selectedPerson.isCalledBack ? "Called Back" : "Call Back"}
          </button>
        </div>
      </div>

      {/* Scrollable Body */}
      <div className="p-4 space-y-4 flex-1 overflow-y-auto custom-scrollbar">
        {selectedPerson.lobbyNote && (
          <div className="p-3 bg-amber-500/10 border border-amber-500/25 rounded-xl">
            <p className="text-[10px] font-black uppercase tracking-widest text-amber-400 mb-0.5">
              Lobby Note
            </p>
            <p className="text-amber-100 text-xs">{selectedPerson.lobbyNote}</p>
          </div>
        )}

        {/* Inline Video Recorder & Player */}
        <InlineVideoPlayer
          auditionVideoUrl={selectedPerson.auditionVideoUrl}
          danceVideoUrl={selectedPerson.danceVideoUrl}
          callbackVideoUrl={selectedPerson.callbackVideoUrl}
          posterUrl={selectedPerson.avatar}
          defaultTab={round === "callback" ? "callback" : "audition"}
          onRecordClick={onRecordVideo}
          onDeleteClick={onDeleteVideo}
          compact
        />

        {/* Backing Track */}
        {selectedPerson.backingTrack && (
          <div className="bg-zinc-900 border border-white/5 p-3 rounded-xl">
            <p className="text-[9px] font-black uppercase tracking-widest text-purple-400 mb-1.5 flex items-center gap-1">
              <Music size={11} /> Backing Track
              {selectedPerson.song && (
                <span className="text-zinc-500 font-normal normal-case truncate ml-1">
                  — {selectedPerson.song}
                </span>
              )}
            </p>
            <NormalizedAudioPlayer src={selectedPerson.backingTrack} />
          </div>
        )}

        {/* Panel Consensus Strip (3-6 Judges) */}
        <div
          className={`p-3 rounded-xl border ${ROLE_THEMES[judgeRole].color} bg-zinc-900/60 space-y-2`}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Users size={13} className="text-blue-400" />
              <span className="text-[10px] font-black uppercase tracking-widest text-zinc-300">
                {round === "callback" ? "Callback" : "Audition"} Panel ({consensus.judgeCount}{" "}
                {consensus.judgeCount === 1 ? "Judge" : "Judges"})
              </span>
            </div>
            <span className="text-sm font-black text-white tabular-nums">
              {consensus.overallAverage > 0 ? `${consensus.overallAverage.toFixed(1)} / 5.0` : "No avg"}
            </span>
          </div>

          {consensus.judgeCount > 0 && (
            <div className="flex flex-wrap items-center justify-between gap-2 text-[10px] font-bold">
              <div className="flex gap-2 text-zinc-400">
                <span>V:{consensus.avgVocal || "—"}</span>
                <span>A:{consensus.avgActing || "—"}</span>
                <span>D:{consensus.avgDance || "—"}</span>
                <span>P:{consensus.avgPresence || "—"}</span>
              </div>
              <div className="flex gap-1.5">
                {consensus.votes.strongYes > 0 && (
                  <span className="px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300">
                    {consensus.votes.strongYes}★
                  </span>
                )}
                {consensus.votes.yes > 0 && (
                  <span className="px-1.5 py-0.5 rounded bg-blue-500/20 text-blue-300">
                    {consensus.votes.yes}Y
                  </span>
                )}
                {consensus.votes.maybe > 0 && (
                  <span className="px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300">
                    {consensus.votes.maybe}M
                  </span>
                )}
                {consensus.votes.no > 0 && (
                  <span className="px-1.5 py-0.5 rounded bg-red-500/20 text-red-300">
                    {consensus.votes.no}N
                  </span>
                )}
              </div>
            </div>
          )}

          {otherBallots.length > 0 && (
            <div className="pt-1 border-t border-white/5">
              <button
                type="button"
                onClick={() => setShowOtherJudges((v) => !v)}
                className="w-full flex items-center justify-between text-[10px] font-bold text-zinc-400 hover:text-white"
              >
                <span>
                  View {otherBallots.length} Other Judge{" "}
                  {otherBallots.length === 1 ? "Ballot" : "Ballots"}
                </span>
                {showOtherJudges ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
              </button>
              {showOtherJudges && (
                <div className="mt-2 space-y-1.5">
                  {otherBallots.map((b, i) => (
                    <div
                      key={`${b.judgeEmail}-${i}`}
                      className="p-2 rounded-lg bg-black/40 border border-white/5 text-[11px] space-y-1"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-zinc-200">
                          {b.judgeName}{" "}
                          <span className="text-[9px] text-zinc-500 uppercase">({b.judgeRole})</span>
                        </span>
                        <span className="text-[10px] text-zinc-400 font-mono">
                          V:{b.vocalScore ?? "-"} A:{b.actingScore ?? "-"} D:{b.danceScore ?? "-"} P:
                          {b.stagePresenceScore ?? "-"}
                        </span>
                      </div>
                      {b.notes && <p className="text-zinc-400 italic text-[11px]">&quot;{b.notes}&quot;</p>}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Your Independent Ballot */}
        <div className="space-y-2.5">
          <p className="text-[10px] font-black uppercase tracking-widest text-zinc-500">
            Your Ballot ({round === "callback" ? "Callback Round" : "Initial Audition"})
          </p>

          <ScoreButtonRow
            label="Vocal Ability"
            icon={<Music size={13} className="text-purple-400" />}
            val={currentScores.vocal}
            setVal={(v) => setCurrentScores((s) => ({ ...s, vocal: v }))}
            highlighted={judgeRole === "Music"}
            accent="bg-purple-600 border-purple-400"
          />
          <ScoreButtonRow
            label="Acting / Reads"
            icon={<Star size={13} className="text-blue-400" />}
            val={currentScores.acting}
            setVal={(v) => setCurrentScores((s) => ({ ...s, acting: v }))}
            highlighted={judgeRole === "Director"}
            accent="bg-blue-600 border-blue-400"
          />
          <ScoreButtonRow
            label="Dance / Movement"
            icon={<Move size={13} className="text-emerald-400" />}
            val={currentScores.dance}
            setVal={(v) => setCurrentScores((s) => ({ ...s, dance: v }))}
            highlighted={judgeRole === "Choreographer"}
            accent="bg-emerald-600 border-emerald-400"
          />
          <ScoreButtonRow
            label="Stage Presence"
            icon={<Sparkles size={13} className="text-amber-400" />}
            val={currentScores.presence}
            setVal={(v) => setCurrentScores((s) => ({ ...s, presence: v }))}
            accent="bg-amber-600 border-amber-400"
          />
        </div>

        {/* Callback Vote */}
        <div className="space-y-2">
          <label className="text-[10px] font-black uppercase tracking-widest text-zinc-400 block">
            Your Callback Vote
          </label>
          <div className="grid grid-cols-4 gap-1.5">
            {CALLBACK_VOTE_OPTIONS.map((opt) => {
              const active = currentScores.callbackVote === opt.value;
              return (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() =>
                    setCurrentScores((s) => ({
                      ...s,
                      callbackVote: active ? null : opt.value,
                    }))
                  }
                  className={`py-2.5 px-1 rounded-xl text-[10px] font-black uppercase border transition-all active:scale-95 ${
                    active
                      ? opt.activeCls
                      : "bg-zinc-900 border-white/10 text-zinc-400 hover:text-white"
                  }`}
                >
                  {opt.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Suggested Roles */}
        <div className="space-y-2">
          <label className="text-[10px] font-black uppercase tracking-widest text-zinc-400 block">
            Suggested Role(s)
          </label>
          <input
            type="text"
            value={currentScores.suggestedRoles}
            onChange={(e) =>
              setCurrentScores((s) => ({ ...s, suggestedRoles: e.target.value }))
            }
            placeholder="e.g., Belle, Gaston, Featured Dancer..."
            className="w-full bg-zinc-900 border border-white/10 px-3 py-2 rounded-xl text-xs text-white placeholder:text-zinc-600 focus:border-blue-500 outline-none"
          />
          {blueprintRoles.length > 0 && (
            <div className="flex flex-wrap gap-1.5 max-h-20 overflow-y-auto custom-scrollbar">
              {blueprintRoles.slice(0, 14).map((role) => {
                const isPicked = currentScores.suggestedRoles
                  .toLowerCase()
                  .split(",")
                  .map((r) => r.trim())
                  .includes(role.toLowerCase());
                return (
                  <button
                    key={role}
                    type="button"
                    onClick={() => toggleSuggestedRole(role)}
                    className={`px-2 py-0.5 rounded-full text-[10px] font-bold border transition-colors ${
                      isPicked
                        ? "bg-purple-600/30 border-purple-400 text-purple-200"
                        : "bg-zinc-900 border-white/10 text-zinc-400 hover:text-white"
                    }`}
                  >
                    {role}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Notes */}
        <div className="space-y-1.5">
          <label className="text-[10px] uppercase text-zinc-400 font-black tracking-widest flex items-center gap-1.5">
            <MessageSquare size={12} /> Your Judge Notes
          </label>
          <textarea
            className="w-full bg-zinc-900 border border-white/10 p-3 rounded-xl text-xs min-h-[84px] focus:border-blue-500 outline-none resize-none placeholder:text-zinc-600 text-white"
            placeholder={`Notes on ${selectedPerson.name} (stored separately under your ballot)...`}
            value={currentScores.notes}
            onChange={(e) => setCurrentScores((s) => ({ ...s, notes: e.target.value }))}
          />
        </div>
      </div>

      {/* Footer Save Actions */}
      <div className="p-4 border-t border-white/10 bg-zinc-900/70 shrink-0 flex gap-2">
        <button
          type="button"
          onClick={() => onSave(false)}
          disabled={isSaving}
          className="flex-1 bg-zinc-800 hover:bg-zinc-700 py-3.5 rounded-xl font-black uppercase text-xs tracking-wider text-white flex items-center justify-center gap-2 transition-all active:scale-95 disabled:opacity-50"
        >
          {isSaving ? <Loader2 size={15} className="animate-spin" /> : <Save size={15} />}
          Save Ballot
        </button>
        {canGoNext && (
          <button
            type="button"
            onClick={() => onSave(true)}
            disabled={isSaving}
            className="flex-1 bg-blue-600 hover:bg-blue-500 py-3.5 rounded-xl font-black uppercase text-xs tracking-wider text-white shadow-lg shadow-blue-900/30 flex items-center justify-center gap-1.5 transition-all active:scale-95 disabled:opacity-50"
          >
            <CheckCircle2 size={15} /> Save & Next
          </button>
        )}
      </div>
    </aside>
  );
}
