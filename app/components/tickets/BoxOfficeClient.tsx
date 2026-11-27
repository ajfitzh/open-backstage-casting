// app/components/tickets/BoxOfficeClient.tsx
"use client";

import React, { useState } from "react";
import {
  AlertTriangle,
  Camera,
  Check,
  CheckCircle2,
  Copy,
  ExternalLink,
  Loader2,
  Plus,
  ScanLine,
  Ticket,
  ToggleLeft,
  ToggleRight,
  XCircle,
} from "lucide-react";
import {
  createShowPerformance,
  scanDoorTicket,
  togglePerformanceSales,
} from "@/app/actions/tickets";
import CameraQrScanner from "@/app/components/production/CameraQrScanner";
import type { PerformanceSummary } from "@/app/lib/db/tickets-repo";

interface OrderSummary {
  id: number;
  performanceId: number;
  performanceLabel: string;
  buyerName: string;
  buyerEmail: string;
  quantity: number;
  totalCents: number;
  status: string;
  creditedActor: string | null;
  createdAt: string;
}

interface ScanResultBanner {
  outcome: "admitted" | "already_scanned" | "wrong_performance" | "invalid";
  message: string;
  timestamp: string;
}

export default function BoxOfficeClient({
  tenant,
  productionId,
  productionTitle,
  defaultTicketPrice,
  initialPerformances,
  initialStats,
  initialOrders,
}: {
  tenant: string;
  productionId: number;
  productionTitle: string;
  defaultTicketPrice: number;
  initialPerformances: PerformanceSummary[];
  initialStats: {
    totalTicketsSold: number;
    totalCheckedIn: number;
    grossRevenueCents: number;
    paidOrderCount: number;
  };
  initialOrders: OrderSummary[];
}) {
  const [performances, setPerformances] = useState<PerformanceSummary[]>(initialPerformances);
  const [checkedInTotal, setCheckedInTotal] = useState(initialStats.totalCheckedIn);
  const [copiedLink, setCopiedLink] = useState(false);

  // Door scanner state
  const [scanPerfId, setScanPerfId] = useState<number>(initialPerformances[0]?.id || 0);
  const [manualCode, setManualCode] = useState("");
  const [scannerOpen, setScannerOpen] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [lastScan, setLastScan] = useState<ScanResultBanner | null>(null);

  // Add performance form
  const [showAddForm, setShowAddForm] = useState(initialPerformances.length === 0);
  const [label, setLabel] = useState("Friday Opening Night (7:00 PM)");
  const [perfDate, setPerfDate] = useState("");
  const [doorsOpenAt, setDoorsOpenAt] = useState("6:30 PM");
  const [capacity, setCapacity] = useState("200");
  const [price, setPrice] = useState(String(defaultTicketPrice || 15));
  const [savingPerf, setSavingPerf] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const handleCopyStorefront = async () => {
    try {
      const url = `${window.location.origin}/tickets`;
      await navigator.clipboard.writeText(url);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2000);
    } catch {
      window.open("/tickets", "_blank");
    }
  };

  const handleScanCode = async (rawCode: string) => {
    const clean = rawCode.trim();
    if (!clean) return;
    setScanning(true);
    const res = await scanDoorTicket(tenant, clean, scanPerfId > 0 ? scanPerfId : null);
    setScanning(false);
    setManualCode("");

    setLastScan({
      outcome: res.outcome,
      message: res.message,
      timestamp: new Date().toLocaleTimeString(),
    });

    if (res.outcome === "admitted") {
      setCheckedInTotal((n) => n + 1);
      if (scanPerfId > 0) {
        setPerformances((prev) =>
          prev.map((p) =>
            p.id === scanPerfId ? { ...p, checkedInCount: p.checkedInCount + 1 } : p
          )
        );
      }
    }
  };

  const handleCreatePerformance = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingPerf(true);
    setFormError(null);

    const res = await createShowPerformance(tenant, productionId, {
      label,
      performanceDate: perfDate,
      doorsOpenAt,
      totalInventory: Number(capacity) || 150,
      ticketPrice: Number(price) || 15,
    });

    setSavingPerf(false);
    if (!res.success) {
      setFormError(res.error || "Could not create performance.");
      return;
    }

    setPerformances((prev) => [...prev, res.performance]);
    if (scanPerfId === 0) setScanPerfId(res.performance.id);
    setLabel("");
    setPerfDate("");
    setShowAddForm(false);
  };

  const handleToggleSales = async (perf: PerformanceSummary) => {
    const nextOpen = !perf.salesOpen;
    setPerformances((prev) =>
      prev.map((p) => (p.id === perf.id ? { ...p, salesOpen: nextOpen } : p))
    );
    const res = await togglePerformanceSales(tenant, perf.id, nextOpen);
    if (!res.success) {
      setPerformances((prev) =>
        prev.map((p) => (p.id === perf.id ? { ...p, salesOpen: perf.salesOpen } : p))
      );
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6 pb-20">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.25em] text-blue-400 mb-1">
            Box Office &amp; General Admission Ticketing
          </p>
          <h1 className="text-3xl md:text-4xl font-black uppercase italic tracking-tighter text-white flex items-center gap-3">
            <Ticket className="text-blue-500 shrink-0" size={32} />
            {productionTitle}
          </h1>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={handleCopyStorefront}
            className="px-4 py-2.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-white/10 text-xs font-bold text-zinc-200 flex items-center gap-2"
          >
            {copiedLink ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} />}
            {copiedLink ? "Storefront Link Copied" : "Copy Public Ticket Link"}
          </button>
          <a
            href="/tickets"
            target="_blank"
            rel="noopener noreferrer"
            className="px-4 py-2.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-xs font-bold text-white flex items-center gap-2"
          >
            <ExternalLink size={14} /> View Storefront
          </a>
          <button
            type="button"
            onClick={() => setShowAddForm((prev) => !prev)}
            className="px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-xs font-black uppercase tracking-widest text-white flex items-center gap-1.5"
          >
            <Plus size={15} /> Add Performance
          </button>
        </div>
      </div>

      {/* Metrics */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <MetricCard label="Tickets Sold" value={String(initialStats.totalTicketsSold)} />
        <MetricCard
          label="Admitted at Door"
          value={`${checkedInTotal} / ${initialStats.totalTicketsSold}`}
          accent="text-emerald-400"
        />
        <MetricCard
          label="Gross Box Office"
          value={`$${(initialStats.grossRevenueCents / 100).toFixed(2)}`}
          accent="text-blue-400"
        />
        <MetricCard label="Paid Orders" value={String(initialStats.paidOrderCount)} />
      </div>

      {/* Door QR Scanner */}
      <section className="bg-zinc-900 border border-blue-500/30 rounded-3xl p-5 sm:p-6 space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div>
            <h2 className="text-sm font-black uppercase tracking-widest text-blue-400 flex items-center gap-2">
              <ScanLine size={16} /> Live Door QR Ticket Scanner
            </h2>
            <p className="text-xs text-zinc-400 mt-0.5">
              Scan emailed QR tickets at the door to admit guests and block duplicate scans.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <select
              value={scanPerfId}
              onChange={(e) => setScanPerfId(Number(e.target.value))}
              className="bg-zinc-950 border border-white/10 rounded-xl px-3 py-2 text-xs font-bold text-zinc-200"
            >
              <option value={0}>Any Performance</option>
              {performances.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.label} ({p.checkedInCount}/{p.ticketsSold} in)
                </option>
              ))}
            </select>
            <button
              type="button"
              onClick={() => setScannerOpen(true)}
              className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-black uppercase tracking-widest flex items-center gap-2 shadow-lg"
            >
              <Camera size={16} /> Scan Ticket QR
            </button>
          </div>
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            void handleScanCode(manualCode);
          }}
          className="flex gap-2"
        >
          <input
            type="text"
            value={manualCode}
            onChange={(e) => setManualCode(e.target.value)}
            placeholder="Or type / USB-scan ticket code (e.g. OBT-A1B2-C3D4)..."
            className="flex-1 bg-zinc-950 border border-white/10 rounded-xl px-4 py-2.5 text-sm font-mono text-white outline-none focus:border-blue-500"
          />
          <button
            type="submit"
            disabled={scanning || !manualCode.trim()}
            className="px-5 py-2.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 disabled:opacity-40 text-xs font-black uppercase tracking-widest text-white"
          >
            {scanning ? <Loader2 size={15} className="animate-spin" /> : "Verify"}
          </button>
        </form>

        {lastScan && (
          <div
            className={`p-4 rounded-2xl border flex items-center gap-3 text-sm font-bold ${
              lastScan.outcome === "admitted"
                ? "bg-emerald-500/15 border-emerald-500/40 text-emerald-300"
                : lastScan.outcome === "already_scanned"
                  ? "bg-amber-500/15 border-amber-500/40 text-amber-200"
                  : "bg-red-500/15 border-red-500/40 text-red-300"
            }`}
          >
            {lastScan.outcome === "admitted" ? (
              <CheckCircle2 size={22} className="shrink-0" />
            ) : lastScan.outcome === "already_scanned" ? (
              <AlertTriangle size={22} className="shrink-0" />
            ) : (
              <XCircle size={22} className="shrink-0" />
            )}
            <div className="flex-1">
              <p>{lastScan.message}</p>
              <p className="text-[11px] opacity-75 font-mono mt-0.5">{lastScan.timestamp}</p>
            </div>
          </div>
        )}
      </section>

      {/* Add Performance Form */}
      {showAddForm && (
        <form
          onSubmit={handleCreatePerformance}
          className="bg-zinc-900 border border-white/10 rounded-3xl p-6 space-y-4"
        >
          <h3 className="text-xs font-black uppercase tracking-widest text-white">
            Create Performance / Showtime
          </h3>
          {formError && (
            <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-xs font-bold text-red-300">
              {formError}
            </div>
          )}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
            <div className="lg:col-span-2">
              <label className="block text-[10px] font-bold uppercase text-zinc-400 mb-1">
                Performance Label *
              </label>
              <input
                required
                value={label}
                onChange={(e) => setLabel(e.target.value)}
                placeholder="Saturday Matinee (2:00 PM)"
                className="w-full bg-zinc-950 border border-white/10 rounded-xl px-3 py-2 text-sm text-white"
              />
            </div>
            <div>
              <label className="block text-[10px] font-bold uppercase text-zinc-400 mb-1">
                Date *
              </label>
              <input
                required
                type="date"
                value={perfDate}
                onChange={(e) => setPerfDate(e.target.value)}
                className="w-full bg-zinc-950 border border-white/10 rounded-xl px-3 py-2 text-sm text-white"
              />
            </div>
            <div>
              <label className="block text-[10px] font-bold uppercase text-zinc-400 mb-1">
                Seat Cap *
              </label>
              <input
                required
                type="number"
                min={1}
                value={capacity}
                onChange={(e) => setCapacity(e.target.value)}
                className="w-full bg-zinc-950 border border-white/10 rounded-xl px-3 py-2 text-sm font-mono text-white"
              />
            </div>
            <div>
              <label className="block text-[10px] font-bold uppercase text-zinc-400 mb-1">
                Price (USD) *
              </label>
              <input
                required
                type="number"
                min={1}
                step="0.50"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                className="w-full bg-zinc-950 border border-white/10 rounded-xl px-3 py-2 text-sm font-mono text-white"
              />
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
            <div className="flex items-center gap-2">
              <label className="text-[10px] font-bold uppercase text-zinc-400">Doors Open:</label>
              <input
                value={doorsOpenAt}
                onChange={(e) => setDoorsOpenAt(e.target.value)}
                placeholder="6:30 PM"
                className="w-32 bg-zinc-950 border border-white/10 rounded-lg px-2.5 py-1.5 text-xs text-white"
              />
            </div>
            <button
              type="submit"
              disabled={savingPerf}
              className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-black uppercase tracking-widest flex items-center gap-2"
            >
              {savingPerf ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
              Save Performance
            </button>
          </div>
        </form>
      )}

      {/* Performances List */}
      <section className="space-y-3">
        <h2 className="text-xs font-black uppercase tracking-widest text-zinc-400">
          Showtimes &amp; Capacity ({performances.length})
        </h2>
        {performances.length === 0 ? (
          <div className="bg-zinc-900 border border-dashed border-zinc-800 rounded-2xl p-10 text-center text-sm text-zinc-500">
            No performances configured for {productionTitle} yet. Add one above to open online ticket
            sales.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {performances.map((perf) => {
              const pctSold =
                perf.totalInventory > 0
                  ? Math.min(100, Math.round((perf.ticketsSold / perf.totalInventory) * 100))
                  : 0;
              return (
                <div
                  key={perf.id}
                  className="bg-zinc-900 border border-white/10 rounded-2xl p-5 space-y-3"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h3 className="text-base font-black text-white">{perf.label}</h3>
                      <p className="text-xs text-zinc-400">
                        {perf.performanceDate || "Date TBA"} • ${perf.ticketPrice.toFixed(2)} GA
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleToggleSales(perf)}
                      className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black uppercase border ${
                        perf.salesOpen
                          ? "bg-emerald-500/15 border-emerald-500/30 text-emerald-300"
                          : "bg-zinc-800 border-white/10 text-zinc-400"
                      }`}
                    >
                      {perf.salesOpen ? <ToggleRight size={14} /> : <ToggleLeft size={14} />}
                      {perf.salesOpen ? "On Sale" : "Closed"}
                    </button>
                  </div>

                  <div className="space-y-1">
                    <div className="flex justify-between text-xs">
                      <span className="text-zinc-400">
                        {perf.ticketsSold} / {perf.totalInventory} sold ({perf.remainingSeats} left)
                      </span>
                      <span className="font-mono font-bold text-emerald-400">
                        {perf.checkedInCount} scanned
                      </span>
                    </div>
                    <div className="h-2 bg-zinc-950 rounded-full overflow-hidden border border-white/5">
                      <div
                        className="h-full bg-blue-500 transition-all"
                        style={{ width: `${pctSold}%` }}
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* Recent Orders */}
      <section className="space-y-3">
        <h2 className="text-xs font-black uppercase tracking-widest text-zinc-400">
          Recent Ticket Orders ({initialOrders.length})
        </h2>
        <div className="bg-zinc-900 border border-white/10 rounded-2xl overflow-x-auto">
          <table className="w-full min-w-[640px] text-left text-xs">
            <thead className="bg-zinc-950/60 text-zinc-500 uppercase text-[10px] font-black tracking-wider border-b border-white/5">
              <tr>
                <th className="p-3.5">Order</th>
                <th className="p-3.5">Buyer</th>
                <th className="p-3.5">Performance</th>
                <th className="p-3.5">Qty</th>
                <th className="p-3.5">Total</th>
                <th className="p-3.5">Cast Credit</th>
                <th className="p-3.5">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {initialOrders.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-zinc-500">
                    No online ticket orders yet.
                  </td>
                </tr>
              ) : (
                initialOrders.map((o) => (
                  <tr key={o.id} className="hover:bg-zinc-800/30">
                    <td className="p-3.5 font-mono text-zinc-400">#{o.id}</td>
                    <td className="p-3.5">
                      <p className="font-bold text-white">{o.buyerName}</p>
                      <p className="text-zinc-500">{o.buyerEmail}</p>
                    </td>
                    <td className="p-3.5 text-zinc-300">{o.performanceLabel}</td>
                    <td className="p-3.5 font-mono font-bold text-white">{o.quantity}</td>
                    <td className="p-3.5 font-mono text-emerald-400">
                      ${(o.totalCents / 100).toFixed(2)}
                    </td>
                    <td className="p-3.5 text-zinc-400">{o.creditedActor || "—"}</td>
                    <td className="p-3.5">
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase ${
                          o.status === "paid"
                            ? "bg-emerald-500/15 text-emerald-300"
                            : "bg-zinc-800 text-zinc-400"
                        }`}
                      >
                        {o.status}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      {scannerOpen && (
        <CameraQrScanner
          title="Box Office Door Scanner"
          subtitle="Point your camera at a guest's emailed QR ticket to admit them instantly."
          onScan={(decoded) => {
            setScannerOpen(false);
            void handleScanCode(decoded);
          }}
          onClose={() => setScannerOpen(false)}
        />
      )}
    </div>
  );
}

function MetricCard({
  label,
  value,
  accent = "text-white",
}: {
  label: string;
  value: string;
  accent?: string;
}) {
  return (
    <div className="bg-zinc-900 border border-white/10 rounded-2xl p-4">
      <p className="text-[10px] font-black uppercase tracking-widest text-zinc-500">{label}</p>
      <p className={`text-2xl font-black mt-0.5 ${accent}`}>{value}</p>
    </div>
  );
}
