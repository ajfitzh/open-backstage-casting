"use client";

import React, { useMemo, useState } from "react";
import type { VenueExplorerSeat } from "@/app/lib/db/phase3-repo";

interface VenueSeatingChartProps {
  venueName: string;
  seats: VenueExplorerSeat[];
  compact?: boolean;
  highlightSection?: string | null;
}

const SECTION_PALETTE = [
  { fill: "#38bdf8", stroke: "#7dd3fc", label: "Sky" },       // Center / A
  { fill: "#34d399", stroke: "#6ee7b7", label: "Emerald" },   // Left / B
  { fill: "#a78bfa", stroke: "#c4b5fd", label: "Violet" },    // Right / C
  { fill: "#fbbf24", stroke: "#fcd34d", label: "Amber" },     // Rear / D
  { fill: "#f472b6", stroke: "#f9a8d4", label: "Pink" },      // Balcony / E
  { fill: "#fb923c", stroke: "#fdba74", label: "Orange" },    // Mezzanine / F
];

export function getSectionColor(section: string, indexMap: Map<string, number>) {
  const s = (section || "").toLowerCase();
  if (s.includes("rear") && s.includes("left")) return SECTION_PALETTE[4];
  if (s.includes("rear") && s.includes("right")) return SECTION_PALETTE[5];
  if (s.includes("rear") || s.includes("balcony")) return SECTION_PALETTE[3];
  if (s.includes("center") || s.includes("orchestra")) return SECTION_PALETTE[0];
  if (s.includes("left")) return SECTION_PALETTE[1];
  if (s.includes("right")) return SECTION_PALETTE[2];
  const idx = indexMap.get(section) ?? 0;
  return SECTION_PALETTE[idx % SECTION_PALETTE.length];
}

export default function VenueSeatingChart({
  venueName,
  seats,
  compact = false,
  highlightSection = null,
}: VenueSeatingChartProps) {
  const [hoveredSeat, setHoveredSeat] = useState<VenueExplorerSeat | null>(null);

  const layout = useMemo(() => {
    if (!seats || seats.length === 0) return null;

    const sectionOrder = Array.from(new Set(seats.map((s) => s.section))).sort();
    const sectionIndexMap = new Map(sectionOrder.map((name, idx) => [name, idx]));

    let minX = Infinity;
    let maxX = -Infinity;
    let minY = Infinity;
    let maxY = -Infinity;

    for (const s of seats) {
      if (s.gridX < minX) minX = s.gridX;
      if (s.gridX > maxX) maxX = s.gridX;
      if (s.gridY < minY) minY = s.gridY;
      if (s.gridY > maxY) maxY = s.gridY;
    }

    const spanX = Math.max(1, maxX - minX);
    const spanY = Math.max(1, maxY - minY);

    // Normalize into a clean widescreen SVG canvas
    const width = 640;
    const stageHeight = compact ? 42 : 54;
    const padX = 36;
    const padBottom = 24;
    const usableW = width - padX * 2;
    const usableH = compact ? 210 : 340;
    const height = stageHeight + usableH + padBottom;

    // Estimate seat dot radius so dense 850-seat halls and cozy 120-seat halls both look crisp
    const density = seats.length;
    const radius = compact
      ? density > 600
        ? 2.2
        : density > 300
          ? 2.9
          : 4.2
      : density > 600
        ? 3.1
        : density > 300
          ? 4.0
          : 6.0;

    // Compute distinct row labels along Y for subtle left/right row guides in full mode
    const rowYMap = new Map<string, number>();
    const points = seats.map((s) => {
      const nx = padX + ((s.gridX - minX) / spanX) * usableW;
      const ny = stageHeight + 12 + ((s.gridY - minY) / spanY) * (usableH - 20);
      if (!rowYMap.has(s.rowLabel)) {
        rowYMap.set(s.rowLabel, ny);
      }
      return { seat: s, cx: nx, cy: ny };
    });

    const rowGuides = Array.from(rowYMap.entries())
      .sort((a, b) => a[1] - b[1])
      .filter((_, idx, arr) => arr.length <= 16 || idx % 2 === 0);

    return {
      width,
      height,
      stageHeight,
      radius,
      points,
      rowGuides,
      sectionOrder,
      sectionIndexMap,
    };
  }, [seats, compact]);

  if (!layout) {
    return (
      <div className="w-full h-full min-h-[160px] flex flex-col items-center justify-center text-zinc-600 text-xs font-semibold gap-1">
        <span>No seating chart mapped yet</span>
      </div>
    );
  }

  return (
    <div className="relative w-full select-none">
      <svg
        viewBox={`0 0 ${layout.width} ${layout.height}`}
        className="w-full h-auto block"
        role="img"
        aria-label={`${venueName} auditorium seating chart`}
      >
        <defs>
          <linearGradient id={`stage-glow-${venueName.replace(/\W+/g, "")}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.35" />
            <stop offset="100%" stopColor="#3b82f6" stopOpacity="0" />
          </linearGradient>
        </defs>

        {/* Curved Stage Arc */}
        <path
          d={`M 90 ${layout.stageHeight - 10} Q ${layout.width / 2} ${layout.stageHeight + 12} ${layout.width - 90} ${layout.stageHeight - 10}`}
          fill="none"
          stroke="#60a5fa"
          strokeWidth={compact ? 2.5 : 3}
          strokeLinecap="round"
          opacity={0.85}
        />
        <path
          d={`M 90 ${layout.stageHeight - 10} Q ${layout.width / 2} ${layout.stageHeight + 12} ${layout.width - 90} ${layout.stageHeight - 10} L ${layout.width - 70} ${layout.stageHeight + 34} L 70 ${layout.stageHeight + 34} Z`}
          fill={`url(#stage-glow-${venueName.replace(/\W+/g, "")})`}
        />
        <text
          x={layout.width / 2}
          y={layout.stageHeight - 18}
          textAnchor="middle"
          fill="#93c5fd"
          fontSize={compact ? 10 : 11}
          fontWeight="800"
          letterSpacing="4"
        >
          STAGE
        </text>

        {/* Subtle row labels in full interactive mode */}
        {!compact &&
          layout.rowGuides.map(([label, y]) => (
            <text
              key={`row-${label}`}
              x={14}
              y={y + 3}
              fill="#52525b"
              fontSize={9}
              fontWeight="700"
            >
              {label}
            </text>
          ))}

        {/* Seats */}
        {layout.points.map(({ seat, cx, cy }) => {
          const palette = getSectionColor(seat.section, layout.sectionIndexMap);
          const isBlocked = seat.status === "blocked";
          const isVip = seat.status === "vip";
          const isAccessible = seat.status === "accessible";
          const isDimmed =
            Boolean(highlightSection) && seat.section !== highlightSection;
          const isHovered = !compact && hoveredSeat?.id === seat.id;

          const fill = isBlocked
            ? "#27272a"
            : isVip
              ? "#fbbf24"
              : isAccessible
                ? "#38bdf8"
                : palette.fill;

          return (
            <circle
              key={seat.id}
              cx={cx}
              cy={cy}
              r={isHovered ? layout.radius * 1.65 : layout.radius}
              fill={fill}
              stroke={isHovered ? "#ffffff" : isVip ? "#fef08a" : "none"}
              strokeWidth={isHovered ? 1.5 : isVip ? 0.8 : 0}
              opacity={isBlocked ? 0.25 : isDimmed ? 0.16 : 0.92}
              className={compact ? undefined : "cursor-pointer transition-opacity duration-150"}
              onMouseEnter={compact ? undefined : () => setHoveredSeat(seat)}
              onMouseLeave={compact ? undefined : () => setHoveredSeat(null)}
            />
          );
        })}
      </svg>

      {/* Interactive seat readout bar (full view) */}
      {!compact && (
        <div className="mt-2 flex flex-wrap items-center justify-between gap-2 px-3 py-2 rounded-xl bg-zinc-950/90 border border-white/10 text-[11px]">
          {hoveredSeat ? (
            <div className="flex items-center gap-2 text-white font-bold">
              <span className="px-2 py-0.5 rounded bg-blue-500/20 border border-blue-400/30 text-blue-300 text-[10px] uppercase tracking-wider">
                {hoveredSeat.section}
              </span>
              <span>
                Row {hoveredSeat.rowLabel} • Seat {hoveredSeat.seatNumber}
              </span>
              {hoveredSeat.status && hoveredSeat.status !== "available" && (
                <span className="text-[10px] uppercase tracking-wider text-amber-300">
                  ({hoveredSeat.status})
                </span>
              )}
            </div>
          ) : (
            <span className="text-zinc-500">
              Hover any seat to inspect section, row, and seat number
            </span>
          )}
          <span className="text-zinc-400 font-semibold">
            {seats.length.toLocaleString()} mapped seats
          </span>
        </div>
      )}
    </div>
  );
}
