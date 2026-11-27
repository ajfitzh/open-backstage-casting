// app/components/production/CostumePlotPanel.tsx
"use client";

import React, { useMemo } from "react";
import { Printer, Shirt, Tag } from "lucide-react";
import { groupActorCostumePlot } from "@/app/lib/phase3-helpers";
import type { CastMeasurementItem, GarmentWithQr } from "./CostumePullSheet";

export default function CostumePlotPanel({
  tenant,
  productionId,
  showTitle,
  castWithMeasurements,
  garments,
}: {
  tenant: string;
  productionId: number;
  showTitle: string;
  castWithMeasurements: CastMeasurementItem[];
  garments: GarmentWithQr[];
}) {
  const plot = useMemo(
    () => groupActorCostumePlot(castWithMeasurements, garments, productionId),
    [castWithMeasurements, garments, productionId]
  );

  const assignedActorsCount = plot.filter((p) => p.garments.length > 0).length;

  return (
    <section className="mt-8 bg-zinc-900 border border-white/10 rounded-2xl p-5 sm:p-6 space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-black text-white flex items-center gap-2">
            <Shirt size={18} className="text-purple-400" />
            Per-Actor Costume Plot & Quick-Change Sheet
          </h2>
          <p className="text-xs text-zinc-400 mt-0.5">
            {showTitle} • {assignedActorsCount} of {plot.length} cast members have assigned garments.
          </p>
        </div>

        <a
          href={`/api/inventory/labels/pdf?tenant=${encodeURIComponent(tenant)}&type=garments&productionId=${productionId}`}
          target="_blank"
          rel="noopener noreferrer"
          className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-black uppercase tracking-wider inline-flex items-center gap-2 shadow-sm"
        >
          <Printer size={14} />
          Print Avery QR Hang-Tags (PDF)
        </a>
      </div>

      {plot.length === 0 ? (
        <p className="text-xs text-zinc-500">No cast members loaded for this production yet.</p>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-white/10">
          <table className="w-full text-left text-xs">
            <thead className="bg-zinc-950 text-[10px] font-black uppercase tracking-wider text-zinc-400">
              <tr>
                <th className="px-4 py-2.5">Actor</th>
                <th className="px-4 py-2.5">Role</th>
                <th className="px-4 py-2.5">Assigned Garments & Quick-Change Notes</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {plot.map((actor) => (
                <tr key={actor.personId} className="hover:bg-white/[0.02]">
                  <td className="px-4 py-3 font-bold text-white whitespace-nowrap">{actor.name}</td>
                  <td className="px-4 py-3 text-zinc-400 whitespace-nowrap">{actor.role}</td>
                  <td className="px-4 py-3">
                    {actor.garments.length === 0 ? (
                      <span className="text-zinc-600 italic">No garments pulled yet</span>
                    ) : (
                      <div className="flex flex-wrap gap-2">
                        {actor.garments.map((g) => (
                          <span
                            key={g.id}
                            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-zinc-950 border border-white/10 text-zinc-200"
                          >
                            <Tag size={11} className="text-purple-400 shrink-0" />
                            <span className="font-mono font-bold text-[11px]">{g.sku}</span>
                            <span className="text-zinc-400">{g.category}</span>
                            {g.binLocation && (
                              <span className="text-[10px] text-zinc-500">({g.binLocation})</span>
                            )}
                          </span>
                        ))}
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
