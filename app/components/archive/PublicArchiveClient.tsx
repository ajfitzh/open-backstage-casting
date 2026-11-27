"use client";

import React, { useMemo, useState } from "react";
import Link from "next/link";
import {
  Calendar,
  ExternalLink,
  GraduationCap,
  Image as ImageIcon,
  Loader2,
  MapPin,
  Search,
  Sparkles,
  Theater,
  Ticket,
  Users,
  X,
} from "lucide-react";
import type {
  ArchiveShowSummary,
  PublicArchiveData,
  PublicShowDetail,
} from "@/app/lib/db/archive-repo";
import { getPublicShowDetailAction } from "@/app/actions/archive";

export default function PublicArchiveClient({ data }: { data: PublicArchiveData }) {
  const [query, setQuery] = useState("");
  const [selectedSeason, setSelectedSeason] = useState<string>("All");
  const [playbillsOnly, setPlaybillsOnly] = useState(false);

  const [activeShow, setActiveShow] = useState<ArchiveShowSummary | null>(null);
  const [detail, setDetail] = useState<PublicShowDetail | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);

  const filteredSeasons = useMemo(() => {
    const q = query.trim().toLowerCase();
    return data.seasons
      .filter((s) => selectedSeason === "All" || s.season === selectedSeason)
      .map((group) => ({
        ...group,
        shows: group.shows.filter((show) => {
          if (playbillsOnly && !show.image) return false;
          if (!q) return true;
          const hay = [
            show.title,
            show.season,
            show.productionSession,
            show.venue,
            show.type,
          ]
            .filter(Boolean)
            .join(" ")
            .toLowerCase();
          return hay.includes(q);
        }),
      }))
      .filter((g) => g.shows.length > 0);
  }, [data.seasons, query, selectedSeason, playbillsOnly]);

  const openShowDetail = async (show: ArchiveShowSummary) => {
    setActiveShow(show);
    setDetail(null);
    setLoadingDetail(true);
    try {
      const res = await getPublicShowDetailAction(data.orgSlug, show.id);
      if (res.ok && res.detail) {
        setDetail(res.detail);
      }
    } finally {
      setLoadingDetail(false);
    }
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-white pb-20">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-10 sm:py-14 space-y-10">
        {/* HERO HEADER */}
        <header className="space-y-5 border-b border-white/10 pb-8">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="space-y-1.5">
              <p className="text-[11px] font-black uppercase tracking-[0.25em] text-blue-400 flex items-center gap-2">
                <Sparkles size={13} /> {data.orgName} • Our Story &amp; Show Archive
              </p>
              <h1 className="text-3xl sm:text-5xl font-black tracking-tight text-white">
                Production History
              </h1>
              <p className="text-sm text-zinc-400 max-w-2xl">
                Explore {data.totalShows} productions across {data.totalSeasons} seasons, complete
                with scanned playbills, cast lists, and creative teams.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <Link
                href="/tickets"
                className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-black uppercase tracking-wider transition-colors"
              >
                <Ticket size={14} /> Tickets
              </Link>
              <Link
                href="/classes"
                className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-white/10 text-zinc-200 text-xs font-bold uppercase tracking-wider transition-colors"
              >
                <GraduationCap size={14} /> Classes
              </Link>
              <Link
                href="/login"
                className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-white/10 text-zinc-300 text-xs font-bold uppercase tracking-wider transition-colors"
              >
                Portal Login
              </Link>
            </div>
          </div>

          {/* STATS + FILTER BAR */}
          <div className="flex flex-col md:flex-row gap-3 items-stretch md:items-center pt-2">
            <div className="relative flex-1">
              <Search
                size={16}
                className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-500 pointer-events-none"
              />
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search shows, seasons, or venues..."
                className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-zinc-900 border border-white/10 text-sm text-white placeholder:text-zinc-500 outline-none focus:border-blue-500"
              />
            </div>

            <select
              value={selectedSeason}
              onChange={(e) => setSelectedSeason(e.target.value)}
              className="px-3.5 py-2.5 rounded-xl bg-zinc-900 border border-white/10 text-sm font-semibold text-white outline-none focus:border-blue-500"
            >
              <option value="All">All Seasons ({data.totalSeasons})</option>
              {data.seasons.map((s) => (
                <option key={s.season} value={s.season}>
                  {s.season} ({s.shows.length})
                </option>
              ))}
            </select>

            <button
              type="button"
              onClick={() => setPlaybillsOnly((v) => !v)}
              className={`inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border text-xs font-black uppercase tracking-wider transition-colors ${
                playbillsOnly
                  ? "bg-blue-600/20 border-blue-500/50 text-blue-300"
                  : "bg-zinc-900 border-white/10 text-zinc-400 hover:text-white"
              }`}
            >
              <ImageIcon size={14} /> Playbills ({data.totalPlaybills})
            </button>
          </div>
        </header>

        {/* SEASON TIMELINE */}
        {filteredSeasons.length === 0 ? (
          <div className="py-16 text-center rounded-3xl bg-zinc-900/50 border border-dashed border-white/10 text-sm text-zinc-500">
            No productions match your filter.
          </div>
        ) : (
          <div className="space-y-12">
            {filteredSeasons.map((group) => (
              <section key={group.season} className="space-y-4">
                <div className="flex items-center justify-between border-b border-white/5 pb-2.5">
                  <div className="flex items-center gap-3">
                    <h2 className="text-xl sm:text-2xl font-black tracking-tight text-white">
                      {group.season} Season
                    </h2>
                    {group.status === "Active" && (
                      <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-[10px] font-black uppercase tracking-wider text-emerald-300">
                        Current Season
                      </span>
                    )}
                  </div>
                  <span className="text-xs font-bold text-zinc-500">
                    {group.shows.length} {group.shows.length === 1 ? "production" : "productions"}
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {group.shows.map((show) => (
                    <button
                      type="button"
                      key={show.id}
                      onClick={() => openShowDetail(show)}
                      className="group bg-zinc-900/70 border border-white/10 rounded-2xl overflow-hidden hover:border-blue-500/40 hover:bg-zinc-900 transition-all text-left flex items-stretch shadow-lg cursor-pointer"
                    >
                      <div className="w-24 sm:w-28 shrink-0 bg-zinc-950 relative overflow-hidden border-r border-white/5 flex items-center justify-center">
                        {show.image ? (
                          /* eslint-disable-next-line @next/next/no-img-element */
                          <img
                            src={show.image}
                            alt={show.title}
                            loading="lazy"
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                          />
                        ) : (
                          <Theater size={28} className="text-zinc-700" />
                        )}
                      </div>

                      <div className="p-4 flex-1 min-w-0 flex flex-col justify-between gap-2">
                        <div>
                          <div className="flex items-center gap-1.5 flex-wrap mb-1">
                            {show.productionSession && (
                              <span className="px-2 py-0.5 rounded bg-blue-500/15 text-blue-300 text-[9px] font-black uppercase tracking-wider">
                                {show.productionSession}
                              </span>
                            )}
                            <span className="px-2 py-0.5 rounded bg-zinc-800 text-zinc-400 text-[9px] font-bold uppercase tracking-wider">
                              {show.type}
                            </span>
                          </div>
                          <h3 className="text-sm sm:text-base font-black text-white group-hover:text-blue-300 transition-colors line-clamp-2">
                            {show.title}
                          </h3>
                          {show.venue && (
                            <p className="text-[11px] text-zinc-500 flex items-center gap-1 mt-1 truncate">
                              <MapPin size={11} className="shrink-0" />
                              <span className="truncate">{show.venue}</span>
                            </p>
                          )}
                        </div>

                        <div className="flex items-center gap-3 text-[10px] font-bold text-zinc-400 pt-2 border-t border-white/5">
                          {show.castCount > 0 && (
                            <span className="inline-flex items-center gap-1">
                              <Users size={11} className="text-blue-400" />
                              {show.castCount} Cast
                            </span>
                          )}
                          {show.crewCount > 0 && (
                            <span>{show.crewCount} Crew</span>
                          )}
                          {show.openingNight && (
                            <span className="inline-flex items-center gap-1 ml-auto text-zinc-500">
                              <Calendar size={10} /> {show.openingNight}
                            </span>
                          )}
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              </section>
            ))}
          </div>
        )}
      </div>

      {/* SHOW MEMORY MODAL */}
      {activeShow && (
        <div
          className="fixed inset-0 z-[220] bg-black/85 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in duration-150"
          onClick={() => setActiveShow(null)}
          role="dialog"
          aria-modal="true"
          aria-label={activeShow.title}
        >
          <div
            className="w-full sm:max-w-3xl bg-zinc-950 border border-white/10 rounded-t-3xl sm:rounded-3xl shadow-2xl max-h-[90dvh] flex flex-col overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-5 sm:p-6 bg-zinc-900/80 border-b border-white/10 flex items-start justify-between gap-4 shrink-0">
              <div className="min-w-0">
                <p className="text-[10px] font-black uppercase tracking-widest text-blue-400">
                  {activeShow.season} {activeShow.productionSession ? `• ${activeShow.productionSession}` : ""}
                </p>
                <h2 className="text-xl sm:text-2xl font-black text-white mt-0.5">
                  {activeShow.title}
                </h2>
                {activeShow.venue && (
                  <p className="text-xs text-zinc-400 flex items-center gap-1.5 mt-1">
                    <MapPin size={12} /> {activeShow.venue}
                  </p>
                )}
              </div>
              <button
                type="button"
                onClick={() => setActiveShow(null)}
                className="p-2 rounded-full bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white shrink-0"
                aria-label="Close show archive modal"
              >
                <X size={16} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-6 custom-scrollbar">
              {loadingDetail ? (
                <div className="py-12 flex items-center justify-center gap-2 text-xs text-zinc-400">
                  <Loader2 size={16} className="animate-spin text-blue-400" />
                  Loading playbill, cast &amp; creative team...
                </div>
              ) : (
                <>
                  {/* PLAYBILL & GALLERY */}
                  {detail && detail.gallery.length > 0 && (
                    <section className="space-y-3">
                      <h3 className="text-[10px] font-black uppercase tracking-widest text-zinc-400">
                        Playbill &amp; Photos
                      </h3>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {detail.gallery.map((g) => (
                          <a
                            key={`${g.id}-${g.url}`}
                            href={g.url}
                            target="_blank"
                            rel="noreferrer"
                            className="group relative rounded-2xl overflow-hidden border border-white/10 bg-black flex items-center justify-center max-h-96"
                          >
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                              src={g.url}
                              alt={g.name}
                              className="w-full h-full object-contain max-h-96"
                            />
                            <span className="absolute top-2.5 right-2.5 p-1.5 rounded-lg bg-black/70 text-white opacity-0 group-hover:opacity-100 transition-opacity">
                              <ExternalLink size={13} />
                            </span>
                          </a>
                        ))}
                      </div>
                    </section>
                  )}

                  {/* CREATIVE TEAM */}
                  {detail && detail.crew.length > 0 && (
                    <section className="space-y-2.5">
                      <h3 className="text-[10px] font-black uppercase tracking-widest text-emerald-400">
                        Creative &amp; Production Team ({detail.crew.length})
                      </h3>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {detail.crew.map((member, idx) => (
                          <div
                            key={`crew-${idx}`}
                            className="px-3.5 py-2.5 rounded-xl bg-zinc-900 border border-white/5 flex items-center justify-between gap-2"
                          >
                            <span className="text-xs font-bold text-white truncate">
                              {member.name}
                            </span>
                            <span className="text-[10px] font-bold uppercase text-emerald-400 shrink-0">
                              {member.role}
                            </span>
                          </div>
                        ))}
                      </div>
                    </section>
                  )}

                  {/* CAST LIST */}
                  {detail && detail.cast.length > 0 && (
                    <section className="space-y-2.5">
                      <h3 className="text-[10px] font-black uppercase tracking-widest text-blue-400">
                        Cast ({detail.cast.length})
                      </h3>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {detail.cast.map((actor, idx) => (
                          <div
                            key={`cast-${idx}`}
                            className="px-3.5 py-2 rounded-xl bg-zinc-900/70 border border-white/5 flex items-center justify-between gap-2"
                          >
                            <span className="text-xs font-semibold text-white truncate">
                              {actor.name}
                            </span>
                            <span className="text-[10px] font-bold text-blue-300 truncate max-w-[50%] text-right">
                              {actor.role}
                            </span>
                          </div>
                        ))}
                      </div>
                    </section>
                  )}

                  {detail && detail.gallery.length === 0 && detail.cast.length === 0 && detail.crew.length === 0 && (
                    <p className="text-xs text-zinc-500 italic text-center py-8">
                      No cast list or playbill photos archived for this production yet.
                    </p>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
