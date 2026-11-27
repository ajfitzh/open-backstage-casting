// app/components/reports/ReportsClient.tsx
"use client";

import React, { useMemo, useState } from "react";
import {
  BarChart3,
  CheckCircle2,
  Clock,
  DollarSign,
  Download,
  PieChart,
  Ticket,
  TrendingUp,
  Users,
} from "lucide-react";

export interface ProductionFinancialReport {
  productionTitle: string;
  productionFee: number;
  ticketPrice: number;
  summary: {
    totalCast: number;
    newStudents: number;
    returningStudents: number;
    paidCount: number;
    unpaidCount: number;
    feesCollected: number;
    feesOutstanding: number;
    onlineBoxOfficeRevenue: number;
    onlineTicketsSold: number;
    totalPerfTicketsSold: number;
    totalPerfCapacity: number;
    estimatedBoxOfficeTotal: number;
    combinedProjectedRevenue: number;
  };
  ledger: {
    personId: number;
    name: string;
    email: string;
    auditionStatus: string;
    isReturning: boolean;
    feePaid: boolean;
    feeStatus: string;
    ticketsCredited: number;
    ticketRevenueCredited: number;
  }[];
  performances: {
    id: number;
    label: string;
    date: string;
    sold: number;
    capacity: number;
    price: number;
  }[];
}

const formatUSD = (n: number) =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 2,
  }).format(n || 0);

export default function ReportsClient({ report }: { report: ProductionFinancialReport }) {
  const [activeTab, setActiveTab] = useState<"overview" | "financial" | "cast">("overview");
  const [feeFilter, setFeeFilter] = useState<"all" | "paid" | "unpaid">("all");

  const { summary, ledger, performances, productionTitle, productionFee } = report;
  const retentionRate =
    summary.totalCast > 0 ? Math.round((summary.returningStudents / summary.totalCast) * 100) : 0;

  const filteredLedger = useMemo(() => {
    if (feeFilter === "paid") return ledger.filter((r) => r.feePaid);
    if (feeFilter === "unpaid") return ledger.filter((r) => !r.feePaid);
    return ledger;
  }, [ledger, feeFilter]);

  const handleExportCsv = () => {
    const headers = [
      "Performer",
      "Email",
      "Status",
      "Student Type",
      "Production Fee Status",
      "Fee Amount",
      "Online Tickets Credited",
      "Ticket Revenue Credited",
    ];
    const rows = ledger.map((r) => [
      `"${r.name.replace(/"/g, '""')}"`,
      `"${r.email.replace(/"/g, '""')}"`,
      `"${r.auditionStatus}"`,
      r.isReturning ? "Returning" : "New",
      r.feeStatus,
      r.feePaid ? productionFee.toFixed(2) : "0.00",
      r.ticketsCredited,
      r.ticketRevenueCredited.toFixed(2),
    ]);

    const csv = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${productionTitle.replace(/[^a-z0-9]+/gi, "_")}_Financial_Report.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      {/* Tabs + Export Toolbar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex bg-zinc-900 p-1 rounded-xl border border-white/10 overflow-x-auto no-scrollbar max-w-full">
          {[
            { id: "overview", label: "Overview", icon: BarChart3 },
            { id: "financial", label: "Fees & Box Office", icon: DollarSign },
            { id: "cast", label: "Cast Roster", icon: Users },
          ].map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id as any)}
                className={`px-3.5 min-h-[40px] rounded-lg text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 whitespace-nowrap shrink-0 transition-all ${
                  activeTab === tab.id
                    ? "bg-blue-600 text-white shadow"
                    : "text-zinc-300 hover:text-white"
                }`}
              >
                <Icon size={14} /> {tab.label}
              </button>
            );
          })}
        </div>

        <button
          type="button"
          onClick={handleExportCsv}
          className="flex items-center gap-2 text-xs font-black uppercase tracking-widest text-white bg-zinc-800 hover:bg-zinc-700 border border-white/10 px-4 py-2.5 rounded-xl transition-colors"
        >
          <Download size={14} /> Export Financial CSV
        </button>
      </div>

      {/* Top KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Production Fees Collected"
          value={formatUSD(summary.feesCollected)}
          sub={`${summary.paidCount} paid • ${summary.unpaidCount} unpaid (${formatUSD(summary.feesOutstanding)} due)`}
          icon={<DollarSign size={20} />}
          color="bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
        />
        <StatCard
          label="Box Office Revenue"
          value={formatUSD(summary.estimatedBoxOfficeTotal)}
          sub={`${summary.totalPerfTicketsSold} sold (${formatUSD(summary.onlineBoxOfficeRevenue)} via Stripe)`}
          icon={<Ticket size={20} />}
          color="bg-blue-500/10 text-blue-400 border-blue-500/20"
        />
        <StatCard
          label="Total Cast"
          value={String(summary.totalCast)}
          sub={`${summary.newStudents} new • ${summary.returningStudents} returning`}
          icon={<Users size={20} />}
          color="bg-purple-500/10 text-purple-400 border-purple-500/20"
        />
        <StatCard
          label="Retention Rate"
          value={`${retentionRate}%`}
          sub={`Combined revenue: ${formatUSD(summary.combinedProjectedRevenue)}`}
          icon={<PieChart size={20} />}
          color="bg-amber-500/10 text-amber-400 border-amber-500/20"
        />
      </div>

      {/* TAB: OVERVIEW OR FINANCIAL */}
      {(activeTab === "overview" || activeTab === "financial") && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Performance Box Office Breakdown */}
          <div className="lg:col-span-5 bg-zinc-900/60 border border-white/10 rounded-3xl p-6 space-y-4">
            <h3 className="text-sm font-black uppercase tracking-widest text-blue-400 flex items-center gap-2">
              <Ticket size={16} /> Performance Box Office ({performances.length})
            </h3>
            {performances.length === 0 ? (
              <p className="text-xs text-zinc-500 py-6 text-center">
                No performances configured yet. Add showtimes in Box Office &amp; QR.
              </p>
            ) : (
              <div className="space-y-3">
                {performances.map((p) => {
                  const pct = p.capacity > 0 ? Math.min(100, Math.round((p.sold / p.capacity) * 100)) : 0;
                  return (
                    <div key={p.id} className="bg-zinc-950 border border-white/5 rounded-2xl p-4 space-y-2">
                      <div className="flex justify-between items-start gap-2">
                        <div>
                          <p className="text-sm font-bold text-white">{p.label}</p>
                          <p className="text-[11px] text-zinc-500">{p.date || "Date TBA"}</p>
                        </div>
                        <span className="text-sm font-mono font-black text-emerald-400">
                          {formatUSD(p.sold * p.price)}
                        </span>
                      </div>
                      <div className="flex justify-between text-[11px] text-zinc-400">
                        <span>
                          {p.sold} / {p.capacity} seats
                        </span>
                        <span className="font-mono">{pct}% full</span>
                      </div>
                      <div className="h-2 bg-zinc-900 rounded-full overflow-hidden">
                        <div className="h-full bg-blue-500" style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Production Fee Payment Ledger */}
          <div className="lg:col-span-7 bg-zinc-900/60 border border-white/10 rounded-3xl p-6 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h3 className="text-sm font-black uppercase tracking-widest text-emerald-400 flex items-center gap-2">
                <TrendingUp size={16} /> Production Fees &amp; Ticket Credits
              </h3>
              <div className="flex gap-1 bg-zinc-950 p-1 rounded-xl border border-white/10">
                {(["all", "paid", "unpaid"] as const).map((f) => (
                  <button
                    key={f}
                    type="button"
                    onClick={() => setFeeFilter(f)}
                    className={`px-3 py-1 rounded-lg text-[10px] font-black uppercase ${
                      feeFilter === f ? "bg-zinc-800 text-white" : "text-zinc-500 hover:text-white"
                    }`}
                  >
                    {f}
                  </button>
                ))}
              </div>
            </div>

            <div className="overflow-x-auto rounded-2xl border border-white/5 bg-zinc-950/60">
              <table className="w-full min-w-[520px] text-left text-xs">
                <thead className="bg-zinc-900/60 text-[10px] font-black uppercase tracking-wider text-zinc-500">
                  <tr>
                    <th className="p-3.5">Performer</th>
                    <th className="p-3.5">Type</th>
                    <th className="p-3.5">Fee Status</th>
                    <th className="p-3.5 text-right">Online Tix Credited</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {filteredLedger.map((row) => (
                    <tr key={row.personId} className="hover:bg-white/5">
                      <td className="p-3.5">
                        <p className="font-bold text-white">{row.name}</p>
                        {row.email && <p className="text-[11px] text-zinc-500">{row.email}</p>}
                      </td>
                      <td className="p-3.5">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-black uppercase ${
                            row.isReturning
                              ? "bg-zinc-800 text-zinc-300"
                              : "bg-purple-500/15 text-purple-300"
                          }`}
                        >
                          {row.isReturning ? "Returning" : "New"}
                        </span>
                      </td>
                      <td className="p-3.5">
                        {row.feePaid ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 text-[10px] font-black uppercase">
                            <CheckCircle2 size={11} /> Paid
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-amber-500/15 text-amber-300 text-[10px] font-black uppercase">
                            <Clock size={11} /> {row.feeStatus}
                          </span>
                        )}
                      </td>
                      <td className="p-3.5 text-right font-mono text-zinc-200">
                        {row.ticketsCredited > 0
                          ? `${row.ticketsCredited} (${formatUSD(row.ticketRevenueCredited)})`
                          : "—"}
                      </td>
                    </tr>
                  ))}
                  {filteredLedger.length === 0 && (
                    <tr>
                      <td colSpan={4} className="p-8 text-center text-zinc-500 italic">
                        No records match this filter.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB: CAST ROSTER */}
      {activeTab === "cast" && (
        <div className="bg-zinc-900/50 border border-white/10 rounded-3xl p-6">
          <h3 className="text-lg font-black text-white uppercase tracking-tight mb-4">
            Cast Composition ({ledger.length})
          </h3>
          <div className="overflow-x-auto rounded-2xl border border-white/5 bg-zinc-950/50">
            <table className="w-full min-w-[480px] text-left text-sm">
              <thead className="bg-zinc-900/50 text-xs font-black uppercase tracking-widest text-zinc-500">
                <tr>
                  <th className="p-4">Performer</th>
                  <th className="p-4">Audition Status</th>
                  <th className="p-4">Experience</th>
                  <th className="p-4 text-right">ID</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {ledger.map((student) => (
                  <tr key={student.personId} className="hover:bg-white/5 transition-colors">
                    <td className="p-4 font-bold text-zinc-200">{student.name}</td>
                    <td className="p-4 text-xs text-zinc-400">{student.auditionStatus}</td>
                    <td className="p-4">
                      <span
                        className={`px-2 py-1 rounded-md text-[10px] font-black uppercase ${
                          student.isReturning
                            ? "bg-zinc-800 text-zinc-400"
                            : "bg-emerald-500/10 text-emerald-400"
                        }`}
                      >
                        {student.isReturning ? "Returning" : "New Student"}
                      </span>
                    </td>
                    <td className="p-4 text-right font-mono text-xs text-zinc-600">
                      #{student.personId}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

function StatCard({
  label,
  value,
  sub,
  icon,
  color,
}: {
  label: string;
  value: string;
  sub?: string;
  icon: React.ReactNode;
  color: string;
}) {
  return (
    <div className={`p-5 rounded-2xl border ${color} flex items-start gap-4`}>
      <div className="p-3 bg-zinc-950 rounded-xl border border-white/5 opacity-80 shrink-0">
        {icon}
      </div>
      <div className="min-w-0">
        <div className="text-2xl font-black truncate">{value}</div>
        <div className="text-[10px] font-black uppercase tracking-widest opacity-80 mt-0.5">
          {label}
        </div>
        {sub && <div className="text-[11px] opacity-70 mt-1 leading-snug">{sub}</div>}
      </div>
    </div>
  );
}
