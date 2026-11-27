"use client";

import React, { useEffect, useState } from "react";
import { Eye, EyeOff, Mail, Loader2, X, Send, Sparkles } from "lucide-react";
import { toast } from "@/app/components/ToastProvider";
import {
  getCastPublishStateAction,
  sendCallbackInvitesAction,
  sendCastNotificationsAction,
  toggleCastPublishedAction,
} from "@/app/actions/cast-publishing";

export default function CastPublishBar({
  tenant,
  productionId,
  mode = "casting",
}: {
  tenant: string;
  productionId: number;
  mode?: "casting" | "callbacks";
}) {
  const [publishedAt, setPublishedAt] = useState<string | null>(null);
  const [counts, setCounts] = useState({ castOffers: 0, notCast: 0, callbacks: 0 });
  const [loading, setLoading] = useState(true);
  const [toggling, setToggling] = useState(false);

  const [showEmailModal, setShowEmailModal] = useState(false);
  const [emailScope, setEmailScope] = useState<"cast_only" | "all">("cast_only");
  const [customMessage, setCustomMessage] = useState("");
  const [sending, setSending] = useState(false);

  useEffect(() => {
    let cancelled = false;
    getCastPublishStateAction(tenant, productionId).then((res) => {
      if (cancelled || !res.success) return;
      setPublishedAt(res.castPublishedAt);
      setCounts({
        castOffers: res.castOffersCount,
        notCast: res.notCastCount,
        callbacks: res.callbacksCount,
      });
      setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [tenant, productionId]);

  const handleTogglePublish = async () => {
    const next = !publishedAt;
    if (
      next &&
      !confirm(
        "Publish the Cast List? Families will immediately see their offered roles in the Family Hub."
      )
    ) {
      return;
    }
    setToggling(true);
    const res = await toggleCastPublishedAction(tenant, productionId, next);
    setToggling(false);
    if (!res.success) {
      toast.error(res.error || "Could not update publish status.");
      return;
    }
    setPublishedAt(res.castPublishedAt);
    toast.success(
      res.castPublishedAt
        ? "Cast list is now LIVE in Family Hub!"
        : "Cast list reverted to Draft (hidden from families)."
    );
  };

  const handleSendEmails = async () => {
    setSending(true);
    if (mode === "callbacks") {
      const res = await sendCallbackInvitesAction(tenant, productionId, customMessage);
      setSending(false);
      if (!res.success) {
        toast.error(res.error || "Failed to send callback invites.");
        return;
      }
      toast.success(
        `Sent ${res.sent} callback invite(s)${res.failed ? ` (${res.failed} failed)` : ""}.`
      );
      setShowEmailModal(false);
      setCustomMessage("");
      return;
    }

    const res = await sendCastNotificationsAction(tenant, productionId, emailScope, customMessage);
    setSending(false);
    if (!res.success) {
      toast.error(res.error || "Failed to send cast notifications.");
      return;
    }
    setPublishedAt(new Date().toISOString());
    toast.success(
      `Published & emailed ${res.sentCast} cast offer(s)${
        res.sentThankYou ? ` + ${res.sentThankYou} thank-you email(s)` : ""
      }!`
    );
    setShowEmailModal(false);
    setCustomMessage("");
  };

  if (mode === "callbacks") {
    return (
      <>
        <button
          type="button"
          onClick={() => setShowEmailModal(true)}
          className="px-3.5 min-h-[38px] rounded-xl bg-indigo-600/20 hover:bg-indigo-600/30 border border-indigo-500/40 text-indigo-200 text-[10px] font-bold uppercase tracking-wider flex items-center gap-1.5 whitespace-nowrap"
        >
          <Mail size={13} /> Email Callbacks
        </button>

        {showEmailModal && (
          <div
            className="fixed inset-0 z-[260] bg-black/85 backdrop-blur-sm flex items-center justify-center p-4"
            onClick={() => !sending && setShowEmailModal(false)}
          >
            <div
              className="w-full max-w-md bg-zinc-950 border border-white/10 rounded-2xl p-5 space-y-4 shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold uppercase tracking-wider text-white flex items-center gap-2">
                  <Sparkles size={15} className="text-purple-400" /> Email Callback Invitations
                </h3>
                <button
                  type="button"
                  onClick={() => setShowEmailModal(false)}
                  className="text-zinc-400 hover:text-white"
                >
                  <X size={18} />
                </button>
              </div>
              <p className="text-xs text-zinc-300">
                Sends personalized callback invites (including each actor&apos;s assigned callback
                groups/roles) to{" "}
                <strong className="text-white">{counts.callbacks}</strong> called-back performer(s)
                with emails on file.
              </p>
              <textarea
                value={customMessage}
                onChange={(e) => setCustomMessage(e.target.value)}
                placeholder="Optional callback details (e.g., Saturday 10:00 AM in Main Hall, bring dance shoes & sides)..."
                className="w-full min-h-[96px] bg-zinc-900 border border-white/10 rounded-xl p-3 text-xs text-white placeholder:text-zinc-500"
              />
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowEmailModal(false)}
                  disabled={sending}
                  className="px-4 py-2 rounded-xl bg-zinc-900 text-xs font-semibold text-zinc-300"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSendEmails}
                  disabled={sending || counts.callbacks === 0}
                  className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-xs font-bold uppercase tracking-wider text-white flex items-center gap-1.5"
                >
                  {sending ? <Loader2 size={14} className="animate-spin" /> : <Send size={13} />}
                  Send Invites
                </button>
              </div>
            </div>
          </div>
        )}
      </>
    );
  }

  return (
    <>
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={handleTogglePublish}
          disabled={loading || toggling}
          className={`px-3 min-h-[38px] rounded-lg text-xs font-bold uppercase tracking-wider border flex items-center gap-1.5 transition-colors disabled:opacity-50 ${
            publishedAt
              ? "bg-emerald-500/15 border-emerald-500/40 text-emerald-300 hover:bg-emerald-500/25"
              : "bg-amber-500/15 border-amber-500/40 text-amber-300 hover:bg-amber-500/25"
          }`}
          title={
            publishedAt
              ? "Cast list is visible to families in Family Hub. Click to revert to Draft."
              : "Cast list is Draft (hidden from families). Click to publish."
          }
        >
          {toggling ? (
            <Loader2 size={13} className="animate-spin" />
          ) : publishedAt ? (
            <Eye size={13} />
          ) : (
            <EyeOff size={13} />
          )}
          {publishedAt ? "Published" : "Draft Cast"}
        </button>

        <button
          type="button"
          onClick={() => setShowEmailModal(true)}
          disabled={loading}
          className="px-3 min-h-[38px] rounded-lg text-xs font-bold uppercase tracking-wider bg-indigo-600/20 hover:bg-indigo-600/30 border border-indigo-500/40 text-indigo-200 flex items-center gap-1.5 transition-colors"
        >
          <Mail size={13} /> Notify Cast
        </button>
      </div>

      {showEmailModal && (
        <div
          className="fixed inset-0 z-[260] bg-black/85 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => !sending && setShowEmailModal(false)}
        >
          <div
            className="w-full max-w-md bg-zinc-950 border border-white/10 rounded-2xl p-5 space-y-4 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold uppercase tracking-wider text-white flex items-center gap-2">
                <Mail size={15} className="text-blue-400" /> Publish &amp; Notify Cast
              </h3>
              <button
                type="button"
                onClick={() => setShowEmailModal(false)}
                className="text-zinc-400 hover:text-white"
              >
                <X size={18} />
              </button>
            </div>

            <div className="space-y-2 text-xs">
              <label className="flex items-center gap-2.5 p-3 rounded-xl bg-zinc-900 border border-white/10 cursor-pointer">
                <input
                  type="radio"
                  name="castNotifyScope"
                  checked={emailScope === "cast_only"}
                  onChange={() => setEmailScope("cast_only")}
                />
                <span>
                  <strong className="text-white">Cast Offers Only ({counts.castOffers})</strong> —
                  Email offered roles &amp; Family Hub acceptance link.
                </span>
              </label>
              <label className="flex items-center gap-2.5 p-3 rounded-xl bg-zinc-900 border border-white/10 cursor-pointer">
                <input
                  type="radio"
                  name="castNotifyScope"
                  checked={emailScope === "all"}
                  onChange={() => setEmailScope("all")}
                />
                <span>
                  <strong className="text-white">
                    Everyone ({counts.castOffers} Cast + {counts.notCast} Thank-You)
                  </strong>{" "}
                  — Also send warm thank-you notes to non-cast auditionees.
                </span>
              </label>
            </div>

            <textarea
              value={customMessage}
              onChange={(e) => setCustomMessage(e.target.value)}
              placeholder="Optional note for cast offers (e.g., First table read is Friday 5 PM; accept role by Wednesday)..."
              className="w-full min-h-[88px] bg-zinc-900 border border-white/10 rounded-xl p-3 text-xs text-white placeholder:text-zinc-500"
            />

            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowEmailModal(false)}
                disabled={sending}
                className="px-4 py-2 rounded-xl bg-zinc-900 text-xs font-semibold text-zinc-300"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSendEmails}
                disabled={sending || (counts.castOffers === 0 && emailScope === "cast_only")}
                className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-xs font-bold uppercase tracking-wider text-white flex items-center gap-1.5"
              >
                {sending ? <Loader2 size={14} className="animate-spin" /> : <Send size={13} />}
                Publish &amp; Send
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
