// app/components/casting/StudentQrPassModal.tsx
"use client";

import React, { useEffect, useState } from "react";
import QRCode from "qrcode";
import { CalendarPlus, Check, Copy, Printer, QrCode, X } from "lucide-react";
import { buildStudentQrPayload } from "@/app/lib/features-helpers";

interface StudentQrPassModalProps {
  isOpen: boolean;
  onClose: () => void;
  tenant: string;
  studentId: number | string;
  studentName: string;
  roleName?: string;
  showId: number;
  showTitle: string;
}

export default function StudentQrPassModal({
  isOpen,
  onClose,
  tenant,
  studentId,
  studentName,
  roleName,
  showId,
  showTitle,
}: StudentQrPassModalProps) {
  const [qrDataUrl, setQrDataUrl] = useState<string>("");
  const [copiedFeed, setCopiedFeed] = useState(false);

  const qrPayload = buildStudentQrPayload(tenant, studentId);
  const icsUrl = `/api/calendar?tenant=${encodeURIComponent(tenant)}&productionId=${showId}&studentId=${encodeURIComponent(String(studentId))}`;

  useEffect(() => {
    if (!isOpen) return;
    let mounted = true;
    QRCode.toDataURL(qrPayload, {
      width: 300,
      margin: 2,
      color: { dark: "#09090b", light: "#ffffff" },
    })
      .then((url) => {
        if (mounted) setQrDataUrl(url);
      })
      .catch((err) => console.error("QR generation failed:", err));
    return () => {
      mounted = false;
    };
  }, [isOpen, qrPayload]);

  if (!isOpen) return null;

  const handleCopyCalendarFeed = async () => {
    try {
      const fullUrl = `${window.location.origin}${icsUrl}`;
      await navigator.clipboard.writeText(fullUrl);
      setCopiedFeed(true);
      setTimeout(() => setCopiedFeed(false), 2000);
    } catch {
      window.open(icsUrl, "_blank");
    }
  };

  return (
    <div
      className="fixed inset-0 z-[110] bg-black/85 backdrop-blur-md flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-zinc-950 border border-white/15 rounded-3xl w-full max-w-sm overflow-hidden shadow-2xl print:border-black print:bg-white print:text-black"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 py-4 bg-gradient-to-r from-blue-600 to-indigo-600 flex items-center justify-between print:hidden">
          <div className="flex items-center gap-2 text-white">
            <QrCode size={18} />
            <span className="text-xs font-black uppercase tracking-widest">
              Backstage Check-In Pass
            </span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white"
            aria-label="Close QR pass"
          >
            <X size={16} />
          </button>
        </div>

        {/* Badge Content */}
        <div className="p-6 text-center space-y-4">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-blue-400 print:text-black">
              {showTitle}
            </p>
            <h3 className="text-2xl font-black text-white tracking-tight mt-0.5 print:text-black">
              {studentName}
            </h3>
            {roleName && (
              <span className="inline-block mt-1.5 px-3 py-0.5 rounded-full bg-zinc-900 border border-white/10 text-[11px] font-bold text-zinc-300 print:border-black print:text-black">
                {roleName}
              </span>
            )}
          </div>

          <div className="bg-white p-4 rounded-2xl inline-flex items-center justify-center shadow-inner border border-white/10">
            {qrDataUrl ? (
              /* eslint-disable-next-line @next/next/no-img-element */
              <img
                src={qrDataUrl}
                alt={`Check-in QR pass for ${studentName}`}
                className="w-52 h-52"
              />
            ) : (
              <div className="w-52 h-52 flex items-center justify-center text-zinc-400 text-xs font-bold">
                Generating Pass...
              </div>
            )}
          </div>

          <p className="text-[11px] text-zinc-400 leading-relaxed print:text-black">
            Show this QR pass at Audition Check-In or Daily Rehearsal Check-In for instant 1-second scan.
          </p>
          <p className="text-[10px] font-mono text-zinc-600 select-all">ID #{studentId}</p>
        </div>

        {/* Actions */}
        <div className="px-6 pb-6 space-y-2.5 print:hidden">
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => window.print()}
              className="py-2.5 px-3 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-white/10 text-xs font-bold text-white flex items-center justify-center gap-1.5 transition-colors"
            >
              <Printer size={14} /> Print Badge
            </button>
            <a
              href={icsUrl}
              download
              className="py-2.5 px-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-xs font-bold text-white flex items-center justify-center gap-1.5 transition-colors"
            >
              <CalendarPlus size={14} /> Add to Cal
            </a>
          </div>
          <button
            type="button"
            onClick={handleCopyCalendarFeed}
            className="w-full py-2 px-3 rounded-xl bg-zinc-900/60 hover:bg-zinc-900 border border-white/5 text-[11px] font-bold text-zinc-400 hover:text-white flex items-center justify-center gap-1.5 transition-colors"
          >
            {copiedFeed ? <Check size={13} className="text-emerald-400" /> : <Copy size={13} />}
            {copiedFeed ? "Calendar Subscription Link Copied!" : "Copy Live .ICS Feed URL"}
          </button>
        </div>
      </div>
    </div>
  );
}
