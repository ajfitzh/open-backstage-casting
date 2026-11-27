// app/components/tickets/OrderTicketsClient.tsx
"use client";

import React from "react";
import Link from "next/link";
import { Calendar, CheckCircle2, Clock, MapPin, Printer, Ticket } from "lucide-react";

interface TicketItem {
  id: number;
  code: string;
  holderName: string;
  status: string;
  checkedInAt: string | null;
  qrDataUrl: string;
}

export default function OrderTicketsClient({
  orgName,
  orderId,
  status,
  buyerName,
  buyerEmail,
  totalCents,
  productionTitle,
  productionLocation,
  performanceLabel,
  performanceDate,
  tickets,
}: {
  orgName: string;
  orderId: number;
  status: string;
  buyerName: string;
  buyerEmail: string;
  totalCents: number;
  productionTitle: string;
  productionLocation: string;
  performanceLabel: string;
  performanceDate: string;
  tickets: TicketItem[];
}) {
  return (
    <div className="min-h-screen bg-zinc-950 text-white print:bg-white print:text-black">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-10 space-y-6">
        <div className="flex flex-wrap items-start justify-between gap-4 border-b border-white/10 pb-6 print:border-black">
          <div>
            <p className="text-[11px] font-black uppercase tracking-[0.2em] text-blue-400 print:text-black">
              {orgName} • Order #{orderId}
            </p>
            <h1 className="text-3xl font-black tracking-tight mt-1">{productionTitle}</h1>
            <p className="text-sm text-zinc-400 print:text-black flex flex-wrap items-center gap-3 mt-1.5">
              <span className="inline-flex items-center gap-1">
                <Calendar size={14} /> {performanceLabel}
                {performanceDate ? ` • ${performanceDate}` : ""}
              </span>
              <span className="inline-flex items-center gap-1">
                <MapPin size={14} /> {productionLocation}
              </span>
            </p>
          </div>

          <div className="flex items-center gap-2 print:hidden">
            <button
              type="button"
              onClick={() => window.print()}
              className="px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-black uppercase tracking-widest flex items-center gap-2"
            >
              <Printer size={15} /> Print Tickets
            </button>
            <Link
              href="/tickets"
              className="px-4 py-2.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-white/10 text-xs font-bold text-zinc-200"
            >
              Buy More
            </Link>
          </div>
        </div>

        {status !== "paid" ? (
          <div className="bg-amber-500/10 border border-amber-500/30 rounded-2xl p-6 flex items-center gap-3 text-amber-200">
            <Clock size={22} className="shrink-0" />
            <div>
              <p className="font-black text-sm">Payment Processing</p>
              <p className="text-xs text-amber-200/80 mt-0.5">
                Your payment is being confirmed by Stripe. Refresh this page in a few seconds to
                view your QR tickets.
              </p>
            </div>
          </div>
        ) : (
          <>
            <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-2xl p-4 flex items-center gap-3 text-emerald-300 print:hidden">
              <CheckCircle2 size={20} className="shrink-0" />
              <div className="text-xs">
                <strong>Confirmed!</strong> {tickets.length} general admission ticket
                {tickets.length === 1 ? "" : "s"} (${(totalCents / 100).toFixed(2)}) sent to{" "}
                <strong>{buyerEmail}</strong>. Show the QR codes below at the door.
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 print:grid-cols-2">
              {tickets.map((t) => (
                <div
                  key={t.id}
                  className="bg-zinc-900 border border-white/10 rounded-3xl p-5 flex flex-col items-center text-center gap-3 break-inside-avoid print:bg-white print:border-2 print:border-black print:rounded-xl"
                >
                  <div className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-blue-400 print:text-black">
                    <Ticket size={13} /> General Admission
                  </div>
                  <p className="text-base font-black text-white print:text-black">
                    {productionTitle}
                  </p>
                  <p className="text-xs text-zinc-400 print:text-black">
                    {performanceLabel}
                    {performanceDate ? ` • ${performanceDate}` : ""}
                  </p>

                  <div className="bg-white p-3 rounded-2xl border border-white/10 print:border-black">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={t.qrDataUrl} alt={`Ticket QR ${t.code}`} className="w-44 h-44" />
                  </div>

                  <div>
                    <p className="font-mono text-sm font-black tracking-wider text-white print:text-black">
                      {t.code}
                    </p>
                    <p className="text-xs text-zinc-400 print:text-black mt-0.5">{t.holderName}</p>
                    {t.status === "checked_in" && (
                      <span className="inline-block mt-1.5 px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 text-[10px] font-black uppercase print:border print:border-black print:text-black">
                        Admitted
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </>
        )}

        <p className="text-center text-[11px] text-zinc-500 print:text-black pt-4">
          Purchased by {buyerName} ({buyerEmail}) • {orgName}
        </p>
      </div>
    </div>
  );
}
