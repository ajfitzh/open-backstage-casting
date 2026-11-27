"use client";

import React, { useState, useMemo } from "react";
import {
  X,
  Star,
  History,
  Calendar,
  AlertCircle,
  User,
  Mic2,
  Move,
  FileText,
  Clapperboard,
  Users,
  Sparkles,
  Heart,
  ShieldAlert,
  Music,
  CheckCircle2,
} from "lucide-react";
import {
  Radar,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  ResponsiveContainer,
  RadarProps,
} from "recharts";
import InlineVideoPlayer from "@/app/components/auditions/InlineVideoPlayer";
import type {
  CallbackVote,
  JudgeBallot,
  PanelConsensus,
  VideoKind,
} from "@/app/lib/audition-workflow-helpers";

const RechartsRadar = Radar as unknown as React.FC<RadarProps>;

interface ActorProfileModalProps {
  actor: any;
  grades?: any;
  onClose: () => void;
  onRecordVideo?: (kind: VideoKind) => void;
  onDeleteVideo?: (kind: VideoKind) => void;
}

const VOTE_BADGES: Record<CallbackVote, { label: string; cls: string }> = {
  strong_yes: {
    label: "Strong Yes",
    cls: "bg-emerald-500/20 text-emerald-300 border-emerald-500/40",
  },
  yes: { label: "Yes", cls: "bg-blue-500/20 text-blue-300 border-blue-500/40" },
  maybe: { label: "Maybe", cls: "bg-amber-500/20 text-amber-300 border-amber-500/40" },
  no: { label: "No", cls: "bg-red-500/20 text-red-300 border-red-500/40" },
};

export default function ActorProfileModal({
  actor,
  grades,
  onClose,
  onRecordVideo,
  onDeleteVideo,
}: ActorProfileModalProps) {
  const [activeTab, setActiveTab] = useState<"panel" | "bio" | "conflicts">("panel");

  const consensus: PanelConsensus | undefined = actor.auditionConsensus;
  const ballots: JudgeBallot[] = Array.isArray(actor.ballots) ? actor.ballots : [];
  const auditionBallots = ballots.filter((b) => b.round === "audition");
  const callbackBallots = ballots.filter((b) => b.round === "callback");

  const chartData = [
    { subject: "Vocal", A: consensus?.avgVocal || grades?.vocal || actor.vocal || 0 },
    { subject: "Acting", A: consensus?.avgActing || grades?.acting || actor.acting || 0 },
    { subject: "Dance", A: consensus?.avgDance || grades?.dance || actor.dance || 0 },
    { subject: "Presence", A: consensus?.avgPresence || grades?.presence || actor.presence || 0 },
  ];

  const pastRolesList = useMemo(() => {
    if (!actor.pastRoles) return [];
    if (Array.isArray(actor.pastRoles)) return actor.pastRoles.filter(Boolean);
    if (typeof actor.pastRoles === "string") {
      return actor.pastRoles
        .split(",")
        .map((s: string) => s.trim())
        .filter(Boolean);
    }
    return [];
  }, [actor.pastRoles]);

  const conflictsList: string[] = useMemo(() => {
    if (Array.isArray(actor.conflictsList) && actor.conflictsList.length > 0) {
      return actor.conflictsList;
    }
    if (typeof actor.conflicts === "string" && actor.conflicts.trim()) {
      return actor.conflicts
        .split(",")
        .map((s: string) => s.trim())
        .filter(Boolean);
    }
    return [];
  }, [actor.conflictsList, actor.conflicts]);

  const hasLegacyNotes =
    Boolean(actor.actingNotes || grades?.actingNotes) ||
    Boolean(actor.musicNotes || grades?.musicNotes) ||
    Boolean(actor.choreoNotes || grades?.choreoNotes) ||
    Boolean(actor.dropInNotes || grades?.dropInNotes);

  return (
    <div
      className="fixed inset-0 z-[220] bg-black/90 backdrop-blur-sm flex items-center justify-center p-0 md:p-4"
      onClick={onClose}
    >
      <div
        className="bg-zinc-950 w-full h-[100dvh] md:max-w-5xl md:h-[85dvh] md:rounded-3xl md:border md:border-white/10 overflow-hidden shadow-2xl flex flex-col md:flex-row relative"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Mobile Close */}
        <button
          onClick={onClose}
          className="absolute top-3 right-3 z-50 p-2 bg-black/60 backdrop-blur rounded-full text-zinc-400 hover:text-white md:hidden"
          aria-label="Close Actor Profile"
        >
          <X size={22} />
        </button>

        {/* LEFT COLUMN: IDENTITY, VITALS & RADAR */}
        <div className="p-5 md:p-6 border-b md:border-b-0 md:border-r border-white/5 bg-zinc-900/50 w-full md:w-[320px] flex flex-row md:flex-col items-center md:items-stretch gap-4 shrink-0 md:overflow-y-auto custom-scrollbar">
          <div className="relative w-20 h-20 md:w-36 md:h-36 md:mx-auto shrink-0">
            {actor.avatar ? (
              <img
                src={actor.avatar}
                alt={actor.name}
                className="w-full h-full object-cover object-top rounded-2xl border-2 border-white/10 shadow-xl"
              />
            ) : (
              <div className="w-full h-full bg-zinc-800 rounded-2xl flex items-center justify-center border border-white/10">
                <User size={36} className="text-zinc-600" />
              </div>
            )}
            {actor.auditionNumber && (
              <span className="absolute -bottom-2 -right-2 px-2 py-0.5 rounded-lg bg-blue-600 text-white text-[10px] font-black shadow-lg">
                #{actor.auditionNumber}
              </span>
            )}
          </div>

          <div className="flex-1 md:text-center min-w-0">
            <h2 className="text-lg md:text-xl font-black italic uppercase tracking-tight leading-tight text-white truncate">
              {actor.name}
            </h2>
            {actor.preferredName && actor.preferredName !== actor.name && (
              <p className="text-[11px] text-blue-400 font-bold mt-0.5">
                Goes by &quot;{actor.preferredName}&quot;
              </p>
            )}
            <div className="flex flex-wrap md:justify-center gap-1.5 mt-2">
              {actor.isCalledBack && (
                <span className="px-2 py-0.5 rounded-full bg-purple-500/20 border border-purple-500/40 text-purple-300 text-[9px] font-black uppercase">
                  Called Back
                </span>
              )}
              {actor.isCheckedIn ? (
                <span className="px-2 py-0.5 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-[9px] font-black uppercase">
                  Checked In
                </span>
              ) : (
                <span className="px-2 py-0.5 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-300 text-[9px] font-black uppercase">
                  Not Checked In
                </span>
              )}
            </div>

            <div className="grid grid-cols-3 gap-1.5 mt-3">
              <div className="bg-black/40 p-2 rounded-lg text-center border border-white/5">
                <p className="text-[8px] text-zinc-500 font-black uppercase">Age</p>
                <p className="text-xs font-bold text-white">{actor.age || "?"}</p>
              </div>
              <div className="bg-black/40 p-2 rounded-lg text-center border border-white/5">
                <p className="text-[8px] text-zinc-500 font-black uppercase">Height</p>
                <p className="text-xs font-bold text-white">{actor.height || "-"}</p>
              </div>
              <div className="bg-black/40 p-2 rounded-lg text-center border border-white/5">
                <p className="text-[8px] text-zinc-500 font-black uppercase">Range</p>
                <p className="text-xs font-bold text-white truncate">
                  {actor.vocalRange || actor.voiceType || "-"}
                </p>
              </div>
            </div>

            {(actor.grade || actor.hairColor) && (
              <div className="hidden md:grid grid-cols-2 gap-1.5 mt-1.5">
                <div className="bg-black/40 p-2 rounded-lg text-center border border-white/5">
                  <p className="text-[8px] text-zinc-500 font-black uppercase">Grade</p>
                  <p className="text-xs font-bold text-white">{actor.grade || "-"}</p>
                </div>
                <div className="bg-black/40 p-2 rounded-lg text-center border border-white/5">
                  <p className="text-[8px] text-zinc-500 font-black uppercase">Hair</p>
                  <p className="text-xs font-bold text-white truncate">{actor.hairColor || "-"}</p>
                </div>
              </div>
            )}
          </div>

          {/* Radar Chart */}
          <div className="hidden md:block w-full h-44 mt-auto relative pt-2">
            <p className="text-[9px] text-center text-zinc-500 font-black uppercase tracking-[0.2em]">
              Panel Average ({consensus?.judgeCount || 0} Judges)
            </p>
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart cx="50%" cy="52%" outerRadius="68%" data={chartData}>
                <PolarGrid stroke="#27272a" />
                <PolarAngleAxis
                  dataKey="subject"
                  tick={{ fill: "#a1a1aa", fontSize: 10, fontWeight: "700" }}
                />
                <RechartsRadar
                  dataKey="A"
                  stroke="#3b82f6"
                  fill="#3b82f6"
                  fillOpacity={0.4}
                />
              </RadarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* RIGHT COLUMN: TABS & DOSSIER CONTENT */}
        <div className="flex-1 flex flex-col bg-zinc-950 relative min-w-0 overflow-hidden">
          <button
            onClick={onClose}
            className="absolute top-4 right-5 text-zinc-500 hover:text-white z-20 transition-colors hidden md:block"
            aria-label="Close Actor Profile"
          >
            <X size={20} />
          </button>

          {/* Tabs */}
          <div className="flex border-b border-white/5 px-4 md:px-6 pt-3 gap-5 shrink-0 bg-zinc-950">
            {[
              { id: "panel", label: `Panel & Tapes (${ballots.length})` },
              { id: "bio", label: "Bio & Experience" },
              { id: "conflicts", label: `Conflicts (${conflictsList.length})` },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`pb-3 text-[11px] font-black uppercase tracking-widest transition-all border-b-2 ${
                  activeTab === tab.id
                    ? "text-white border-blue-500"
                    : "text-zinc-500 border-transparent hover:text-zinc-300"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div className="flex-1 overflow-y-auto p-4 md:p-6 custom-scrollbar space-y-6">
            {activeTab === "panel" && (
              <>
                {/* Inline Video Player (Audition / Dance / Callback) */}
                <InlineVideoPlayer
                  auditionVideoUrl={actor.auditionVideoUrl || actor.video || null}
                  danceVideoUrl={actor.danceVideoUrl || null}
                  callbackVideoUrl={actor.callbackVideoUrl || null}
                  posterUrl={actor.avatar}
                  onRecordClick={onRecordVideo}
                  onDeleteClick={onDeleteVideo}
                />

                {/* Panel Consensus Card */}
                {consensus && consensus.judgeCount > 0 && (
                  <div className="p-4 rounded-2xl bg-zinc-900/70 border border-white/10 space-y-3">
                    <div className="flex items-center justify-between flex-wrap gap-2">
                      <div className="flex items-center gap-2">
                        <Users size={14} className="text-blue-400" />
                        <span className="text-[11px] font-black uppercase tracking-widest text-white">
                          Audition Panel Consensus ({consensus.judgeCount}{" "}
                          {consensus.judgeCount === 1 ? "Judge" : "Judges"})
                        </span>
                      </div>
                      <span className="text-sm font-black text-blue-400">
                        {consensus.overallAverage.toFixed(1)} / 5.0 Overall
                      </span>
                    </div>

                    <div className="grid grid-cols-4 gap-2">
                      {[
                        { label: "Vocal", val: consensus.avgVocal, color: "text-purple-400" },
                        { label: "Acting", val: consensus.avgActing, color: "text-blue-400" },
                        { label: "Dance", val: consensus.avgDance, color: "text-emerald-400" },
                        { label: "Presence", val: consensus.avgPresence, color: "text-amber-400" },
                      ].map((item) => (
                        <div
                          key={item.label}
                          className="bg-black/40 p-2 rounded-xl border border-white/5 text-center"
                        >
                          <p className="text-[9px] font-bold uppercase text-zinc-500">
                            {item.label}
                          </p>
                          <p className={`text-base font-black ${item.color}`}>
                            {item.val > 0 ? item.val.toFixed(1) : "—"}
                          </p>
                        </div>
                      ))}
                    </div>

                    <div className="flex flex-wrap items-center gap-2 text-[10px] font-bold">
                      <span className="text-zinc-500 uppercase">Callback Votes:</span>
                      <span className="px-2 py-0.5 rounded bg-emerald-500/15 text-emerald-300">
                        {consensus.votes.strongYes} Strong Yes
                      </span>
                      <span className="px-2 py-0.5 rounded bg-blue-500/15 text-blue-300">
                        {consensus.votes.yes} Yes
                      </span>
                      <span className="px-2 py-0.5 rounded bg-amber-500/15 text-amber-300">
                        {consensus.votes.maybe} Maybe
                      </span>
                      <span className="px-2 py-0.5 rounded bg-red-500/15 text-red-300">
                        {consensus.votes.no} No
                      </span>
                    </div>

                    {consensus.suggestedRoles.length > 0 && (
                      <div className="flex flex-wrap items-center gap-1.5 pt-1">
                        <span className="text-[10px] font-bold uppercase text-zinc-500 mr-1">
                          Suggested Roles:
                        </span>
                        {consensus.suggestedRoles.map((r) => (
                          <span
                            key={r}
                            className="px-2.5 py-0.5 rounded-full bg-purple-500/15 border border-purple-500/30 text-purple-300 text-[10px] font-bold"
                          >
                            {r}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* Individual Judge Ballots */}
                <section className="space-y-3">
                  <div className="flex items-center gap-2 text-zinc-400">
                    <Star size={14} className="text-blue-500" />
                    <span className="text-[10px] font-black uppercase tracking-widest">
                      Individual Judge Ballots
                    </span>
                  </div>

                  {auditionBallots.length === 0 && callbackBallots.length === 0 ? (
                    hasLegacyNotes ? (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {[
                          { l: "Director (Acting)", v: actor.actingNotes || grades?.actingNotes, c: "text-blue-400", i: Clapperboard },
                          { l: "Musical Director", v: actor.musicNotes || grades?.musicNotes, c: "text-purple-400", i: Mic2 },
                          { l: "Choreographer", v: actor.choreoNotes || grades?.choreoNotes, c: "text-emerald-400", i: Move },
                          { l: "Drop-In / Panel", v: actor.dropInNotes || grades?.dropInNotes, c: "text-amber-400", i: FileText },
                        ].map((item) => (
                          <div
                            key={item.l}
                            className="bg-zinc-900/50 p-3.5 rounded-xl border border-white/5"
                          >
                            <div className="flex items-center gap-2 mb-1.5">
                              <item.i size={12} className={item.c} />
                              <p className={`text-[10px] font-bold uppercase ${item.c}`}>{item.l}</p>
                            </div>
                            <p className="text-xs text-zinc-300 italic">
                              {item.v || "No notes logged."}
                            </p>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="p-4 rounded-xl bg-zinc-900/40 border border-white/5 text-xs text-zinc-500 italic">
                        No judge ballots submitted yet for this performer.
                      </div>
                    )
                  ) : (
                    <div className="space-y-2.5">
                      {[...callbackBallots, ...auditionBallots].map((b, idx) => (
                        <div
                          key={`${b.judgeEmail}-${b.round}-${idx}`}
                          className="p-3.5 rounded-xl bg-zinc-900/60 border border-white/5 space-y-2"
                        >
                          <div className="flex items-center justify-between gap-2 flex-wrap">
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-black text-white">{b.judgeName}</span>
                              <span className="px-2 py-0.5 rounded bg-zinc-800 text-[9px] font-bold uppercase text-zinc-400">
                                {b.judgeRole}
                              </span>
                              <span
                                className={`px-2 py-0.5 rounded text-[9px] font-black uppercase ${
                                  b.round === "callback"
                                    ? "bg-purple-500/20 text-purple-300"
                                    : "bg-zinc-800/80 text-zinc-400"
                                }`}
                              >
                                {b.round}
                              </span>
                            </div>
                            {b.callbackVote && (
                              <span
                                className={`px-2 py-0.5 rounded-full border text-[9px] font-black uppercase ${
                                  VOTE_BADGES[b.callbackVote].cls
                                }`}
                              >
                                {VOTE_BADGES[b.callbackVote].label}
                              </span>
                            )}
                          </div>

                          <div className="flex flex-wrap gap-2 text-[10px] font-bold">
                            {b.vocalScore ? (
                              <span className="px-2 py-0.5 rounded bg-purple-500/10 text-purple-300">
                                Vocal {b.vocalScore}
                              </span>
                            ) : null}
                            {b.actingScore ? (
                              <span className="px-2 py-0.5 rounded bg-blue-500/10 text-blue-300">
                                Acting {b.actingScore}
                              </span>
                            ) : null}
                            {b.danceScore ? (
                              <span className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-300">
                                Dance {b.danceScore}
                              </span>
                            ) : null}
                            {b.stagePresenceScore ? (
                              <span className="px-2 py-0.5 rounded bg-amber-500/10 text-amber-300">
                                Presence {b.stagePresenceScore}
                              </span>
                            ) : null}
                            {b.suggestedRoles && (
                              <span className="px-2 py-0.5 rounded bg-white/5 text-zinc-300">
                                Roles: {b.suggestedRoles}
                              </span>
                            )}
                          </div>

                          {b.notes && (
                            <p className="text-xs text-zinc-300 italic leading-relaxed">
                              &quot;{b.notes}&quot;
                            </p>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </section>
              </>
            )}

            {activeTab === "bio" && (
              <div className="space-y-5">
                {/* Audition Prep */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div className="p-3.5 bg-zinc-900 rounded-xl border border-white/5">
                    <p className="text-[9px] font-black text-purple-400 uppercase mb-1 flex items-center gap-1.5">
                      <Music size={11} /> Audition Song
                    </p>
                    <p className="text-xs font-bold text-zinc-200">{actor.song || "Not listed"}</p>
                  </div>
                  <div className="p-3.5 bg-zinc-900 rounded-xl border border-white/5">
                    <p className="text-[9px] font-black text-emerald-400 uppercase mb-1 flex items-center gap-1.5">
                      <Clapperboard size={11} /> Monologue
                    </p>
                    <p className="text-xs font-bold text-zinc-200">
                      {actor.monologue || "Not listed"}
                    </p>
                  </div>
                </div>

                {/* Role Preferences & Casting Flags */}
                <div className="p-4 bg-zinc-900/60 rounded-xl border border-white/5 space-y-3">
                  <p className="text-[10px] font-black text-blue-400 uppercase tracking-widest flex items-center gap-1.5">
                    <Sparkles size={12} /> Role Preferences & Casting Flags
                  </p>
                  <div>
                    <p className="text-[10px] uppercase font-bold text-zinc-500">Preferred Roles</p>
                    <p className="text-xs font-bold text-white mt-0.5">
                      {actor.preferredRoles || "Open / None specified"}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <span
                      className={`px-2.5 py-1 rounded-lg text-[10px] font-bold border ${
                        actor.acceptAnyRole
                          ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-300"
                          : "bg-zinc-800 border-white/5 text-zinc-400"
                      }`}
                    >
                      <CheckCircle2 size={10} className="inline mr-1" />
                      Accept Any Role: {actor.acceptAnyRole ? "Yes" : "No"}
                    </span>
                    <span
                      className={`px-2.5 py-1 rounded-lg text-[10px] font-bold border ${
                        actor.stageRomance
                          ? "bg-pink-500/10 border-pink-500/30 text-pink-300"
                          : "bg-zinc-800 border-white/5 text-zinc-400"
                      }`}
                    >
                      <Heart size={10} className="inline mr-1" />
                      Stage Romance: {actor.stageRomance ? "OK" : "No"}
                    </span>
                    <span className="px-2.5 py-1 rounded-lg text-[10px] font-bold bg-zinc-800 border border-white/5 text-zinc-300">
                      Alter Appearance: {actor.willingToAlterAppearance ? "Yes" : "No"}
                    </span>
                    {actor.fearOfHeights && (
                      <span className="px-2.5 py-1 rounded-lg text-[10px] font-bold bg-amber-500/15 border border-amber-500/30 text-amber-300">
                        Fear of Heights
                      </span>
                    )}
                  </div>
                  {actor.otherTalents && (
                    <div>
                      <p className="text-[10px] uppercase font-bold text-zinc-500">
                        Special Skills / Other Talents
                      </p>
                      <p className="text-xs text-zinc-200 mt-0.5">{actor.otherTalents}</p>
                    </div>
                  )}
                </div>

                {/* Program Bio & Prior Experience */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div className="p-4 bg-zinc-900 rounded-xl border border-white/5">
                    <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest mb-2">
                      Student Bio
                    </p>
                    <p className="text-xs text-zinc-300 leading-relaxed whitespace-pre-wrap">
                      {actor.programBio || "No program bio submitted yet."}
                    </p>
                  </div>
                  <div className="p-4 bg-zinc-900 rounded-xl border border-white/5">
                    <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest mb-2">
                      Prior Experience
                    </p>
                    <p className="text-xs text-zinc-300 leading-relaxed whitespace-pre-wrap">
                      {actor.priorExperience || "No prior experience notes on file."}
                    </p>
                  </div>
                </div>

                {/* Past Productions */}
                <section>
                  <h4 className="text-[10px] font-black text-blue-400 uppercase tracking-widest mb-2 flex items-center gap-2">
                    <History size={13} /> Organization Show History
                  </h4>
                  {pastRolesList.length > 0 ? (
                    <div className="flex flex-wrap gap-2">
                      {pastRolesList.map((role: string, i: number) => (
                        <div
                          key={i}
                          className="text-[11px] bg-zinc-900 text-zinc-200 px-3 py-1.5 rounded-lg border border-white/10 font-bold"
                        >
                          {role}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-zinc-500 italic">
                      No previous cast roles recorded in this workspace.
                    </p>
                  )}
                </section>

                {/* Vitals & Medical Flag */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div className="bg-zinc-900 p-3.5 rounded-xl border border-white/5">
                    <p className="text-[10px] font-black text-zinc-500 uppercase flex items-center gap-1.5 mb-1">
                      <Calendar size={12} /> Date of Birth
                    </p>
                    <p className="text-xs font-bold text-white">{actor.dob || "Not provided"}</p>
                  </div>
                  {actor.medicalNotes && (
                    <div className="bg-red-500/10 p-3.5 rounded-xl border border-red-500/25">
                      <p className="text-[10px] font-black text-red-400 uppercase flex items-center gap-1.5 mb-1">
                        <ShieldAlert size={12} /> Medical / Allergy Note
                      </p>
                      <p className="text-xs text-red-200">{actor.medicalNotes}</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {activeTab === "conflicts" && (
              <div className="space-y-5">
                {actor.lobbyNote && (
                  <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/25">
                    <p className="text-[10px] font-black text-amber-400 uppercase tracking-widest mb-1">
                      Check-In Lobby Note
                    </p>
                    <p className="text-xs text-amber-100">{actor.lobbyNote}</p>
                  </div>
                )}

                <section>
                  <h4 className="text-[10px] font-black text-red-400 uppercase tracking-widest mb-3 flex items-center gap-2">
                    <AlertCircle size={14} /> Schedule Conflicts ({conflictsList.length})
                  </h4>
                  {conflictsList.length === 0 ? (
                    <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-xs text-emerald-300 font-bold">
                      No schedule conflicts reported.
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {conflictsList.map((c, idx) => (
                        <div
                          key={idx}
                          className="px-3.5 py-2.5 rounded-xl bg-red-500/10 border border-red-500/20 text-xs text-red-200 font-medium"
                        >
                          {c}
                        </div>
                      ))}
                    </div>
                  )}
                </section>

                {actor.adminNotes && (
                  <section>
                    <h4 className="text-[10px] font-black text-zinc-400 uppercase tracking-widest mb-2 flex items-center gap-2">
                      <FileText size={13} /> Registration & Admin Notes
                    </h4>
                    <pre className="p-4 bg-zinc-900 rounded-xl border border-white/5 text-xs text-zinc-300 whitespace-pre-wrap font-sans leading-relaxed">
                      {actor.adminNotes}
                    </pre>
                  </section>
                )}
              </div>
            )}
          </div>

          <div className="p-4 border-t border-white/5 bg-zinc-900/30 shrink-0">
            <button
              onClick={onClose}
              className="w-full bg-white text-black py-3 rounded-xl font-black uppercase text-[11px] tracking-[0.2em] hover:bg-zinc-200 transition-colors active:scale-[0.99]"
            >
              Close Dossier
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
