"use client";

import React, { useEffect, useRef, useState } from "react";
import { Film, Video, Trash2, ExternalLink, RefreshCw } from "lucide-react";
import type { VideoKind } from "@/app/lib/audition-workflow-helpers";

interface InlineVideoPlayerProps {
  auditionVideoUrl: string | null;
  danceVideoUrl: string | null;
  callbackVideoUrl: string | null;
  posterUrl?: string | null;
  defaultTab?: VideoKind;
  onRecordClick?: (kind: VideoKind) => void;
  onDeleteClick?: (kind: VideoKind) => void;
  compact?: boolean;
}

const SPEEDS = [0.75, 1, 1.25, 1.5];

export default function InlineVideoPlayer({
  auditionVideoUrl,
  danceVideoUrl,
  callbackVideoUrl,
  posterUrl,
  defaultTab,
  onRecordClick,
  onDeleteClick,
  compact = false,
}: InlineVideoPlayerProps) {
  const initialTab: VideoKind =
    defaultTab ||
    (auditionVideoUrl ? "audition" : danceVideoUrl ? "dance" : callbackVideoUrl ? "callback" : "audition");

  const [selectedTab, setSelectedTab] = useState<VideoKind | null>(null);
  const activeTab = selectedTab ?? initialTab;
  const setActiveTab = (tab: VideoKind) => setSelectedTab(tab);
  const [speed, setSpeed] = useState<number>(1);
  const videoRef = useRef<HTMLVideoElement | null>(null);

  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.playbackRate = speed;
    }
  }, [speed, activeTab]);

  const currentUrl =
    activeTab === "audition"
      ? auditionVideoUrl
      : activeTab === "dance"
      ? danceVideoUrl
      : callbackVideoUrl;

  const tabs: Array<{ kind: VideoKind; label: string; hasVideo: boolean }> = [
    { kind: "audition", label: "Audition", hasVideo: Boolean(auditionVideoUrl) },
    { kind: "dance", label: "Dance", hasVideo: Boolean(danceVideoUrl) },
    { kind: "callback", label: "Callback", hasVideo: Boolean(callbackVideoUrl) },
  ];

  return (
    <div className="rounded-xl border border-white/10 bg-zinc-900/60 overflow-hidden">
      {/* Tab Bar */}
      <div className="flex items-center justify-between gap-2 px-3 py-2 border-b border-white/5 bg-zinc-950/60">
        <div className="flex items-center gap-1">
          {tabs.map((tab) => (
            <button
              key={tab.kind}
              type="button"
              onClick={() => setActiveTab(tab.kind)}
              className={`px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider transition-colors flex items-center gap-1.5 ${
                activeTab === tab.kind
                  ? "bg-blue-600 text-white"
                  : "text-zinc-400 hover:text-white hover:bg-white/5"
              }`}
            >
              <span>{tab.label}</span>
              {tab.hasVideo && (
                <span
                  className={`w-1.5 h-1.5 rounded-full ${
                    activeTab === tab.kind ? "bg-white" : "bg-emerald-400"
                  }`}
                />
              )}
            </button>
          ))}
        </div>

        {currentUrl && (
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => {
                const idx = SPEEDS.indexOf(speed);
                setSpeed(SPEEDS[(idx + 1) % SPEEDS.length]);
              }}
              className="px-2 py-1 rounded bg-zinc-800 hover:bg-zinc-700 text-[10px] font-mono font-bold text-zinc-200"
              title="Playback Speed"
            >
              {speed}x
            </button>
            <a
              href={currentUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="p-1 rounded text-zinc-400 hover:text-white hover:bg-white/5"
              title="Open video in new tab"
            >
              <ExternalLink size={12} />
            </a>
          </div>
        )}
      </div>

      {/* Video Surface */}
      {currentUrl ? (
        <div className="relative bg-black">
          <video
            ref={videoRef}
            key={currentUrl}
            src={currentUrl}
            controls
            playsInline
            preload="metadata"
            poster={posterUrl || undefined}
            className={`w-full object-contain bg-black ${compact ? "max-h-48" : "aspect-video max-h-72"}`}
          />
          {(onRecordClick || onDeleteClick) && (
            <div className="flex items-center justify-end gap-2 px-3 py-2 bg-zinc-950/90 border-t border-white/5">
              {onRecordClick && (
                <button
                  type="button"
                  onClick={() => onRecordClick(activeTab)}
                  className="px-2.5 py-1 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-[10px] font-bold uppercase text-zinc-200 flex items-center gap-1.5"
                >
                  <RefreshCw size={11} /> Retake / Replace
                </button>
              )}
              {onDeleteClick && (
                <button
                  type="button"
                  onClick={() => onDeleteClick(activeTab)}
                  className="px-2.5 py-1 rounded-lg bg-red-500/15 hover:bg-red-500/30 text-[10px] font-bold uppercase text-red-400 flex items-center gap-1.5"
                >
                  <Trash2 size={11} /> Remove
                </button>
              )}
            </div>
          )}
        </div>
      ) : (
        <div className="p-4 flex items-center justify-between gap-3 bg-zinc-950/40">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-lg bg-zinc-900 border border-white/5 flex items-center justify-center shrink-0">
              <Film size={15} className="text-zinc-600" />
            </div>
            <div className="min-w-0">
              <p className="text-xs font-bold text-zinc-300 truncate">
                No {activeTab} tape yet
              </p>
              <p className="text-[10px] text-zinc-500">
                Record live or upload from camera roll
              </p>
            </div>
          </div>
          {onRecordClick && (
            <button
              type="button"
              onClick={() => onRecordClick(activeTab)}
              className="px-3 py-2 rounded-lg bg-red-600 hover:bg-red-500 text-white text-[10px] font-black uppercase tracking-wider flex items-center gap-1.5 shrink-0 active:scale-95"
            >
              <Video size={13} /> Record
            </button>
          )}
        </div>
      )}
    </div>
  );
}
