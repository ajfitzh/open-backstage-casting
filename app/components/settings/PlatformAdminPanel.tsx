// app/components/settings/PlatformAdminPanel.tsx
"use client";

import React, { useEffect, useState } from "react";
import {
  Building2,
  CheckCircle2,
  History,
  Loader2,
  Palette,
  Rocket,
  Save,
} from "lucide-react";
import {
  approveOnboardingRequestAction,
  loadPhase4AdminDataAction,
  saveOrganizationBrandingAction,
} from "@/app/actions/phase4-ops";
import { formatAuditActionLabel } from "@/app/lib/phase4-helpers";

interface AuditEntry {
  id: number;
  actorEmail: string;
  actorName: string;
  action: string;
  entityType: string;
  entityId: string;
  createdAt: string;
}

interface OnboardingReq {
  id: number;
  organizationName: string;
  requestedSlug: string;
  organizationType: string;
  contactName: string;
  contactEmail: string;
  notes: string;
  status: string;
  createdOrganizationId: number | null;
  createdAt: string;
}

export default function PlatformAdminPanel({ tenant }: { tenant: string }) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [provisioningId, setProvisioningId] = useState<number | null>(null);
  const [feedback, setFeedback] = useState<{ kind: "ok" | "err"; text: string } | null>(null);

  const [primaryColor, setPrimaryColor] = useState("#2563eb");
  const [logoUrl, setLogoUrl] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [websiteUrl, setWebsiteUrl] = useState("");
  const [timezone, setTimezone] = useState("America/New_York");
  const [waiverText, setWaiverText] = useState("");
  const [committeeTemplates, setCommitteeTemplates] = useState("");

  const [auditLogs, setAuditLogs] = useState<AuditEntry[]>([]);
  const [requests, setRequests] = useState<OnboardingReq[]>([]);

  const reload = async () => {
    const res = await loadPhase4AdminDataAction(tenant);
    if (res.success) {
      if (res.branding) {
        setPrimaryColor(res.branding.primaryColor);
        setLogoUrl(res.branding.logoUrl);
        setContactEmail(res.branding.contactEmail);
        setWebsiteUrl(res.branding.websiteUrl);
        setTimezone(res.branding.timezone);
        setWaiverText(res.branding.waiverText);
        setCommitteeTemplates(res.branding.committeeTemplates.join(", "));
      }
      setAuditLogs(res.auditLogs);
      setRequests(res.onboardingRequests);
    }
    setLoading(false);
  };

  useEffect(() => {
    let active = true;
    (async () => {
      const res = await loadPhase4AdminDataAction(tenant);
      if (!active) return;
      if (res.success) {
        if (res.branding) {
          setPrimaryColor(res.branding.primaryColor);
          setLogoUrl(res.branding.logoUrl);
          setContactEmail(res.branding.contactEmail);
          setWebsiteUrl(res.branding.websiteUrl);
          setTimezone(res.branding.timezone);
          setWaiverText(res.branding.waiverText);
          setCommitteeTemplates(res.branding.committeeTemplates.join(", "));
        }
        setAuditLogs(res.auditLogs);
        setRequests(res.onboardingRequests);
      }
      setLoading(false);
    })();
    return () => {
      active = false;
    };
  }, [tenant]);

  const handleSaveBranding = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setFeedback(null);
    const res = await saveOrganizationBrandingAction(tenant, {
      primaryColor,
      logoUrl,
      contactEmail,
      websiteUrl,
      timezone,
      waiverText,
      committeeTemplates,
    });
    setSaving(false);
    if (!res.success) {
      setFeedback({ kind: "err", text: res.error || "Could not save branding." });
    } else {
      setFeedback({ kind: "ok", text: "Organization branding & templates saved." });
      void reload();
    }
  };

  const handleApproveRequest = async (id: number, name: string) => {
    setProvisioningId(id);
    setFeedback(null);
    const res = await approveOnboardingRequestAction(tenant, id);
    setProvisioningId(null);
    if (!res.success) {
      setFeedback({ kind: "err", text: res.error || "Provisioning failed." });
    } else {
      setFeedback({
        kind: "ok",
        text: `Provisioned "${name}" at ${res.organization.slug}.open-backstage.org with default staff positions and initial Admin account.`,
      });
      void reload();
    }
  };

  if (loading) {
    return (
      <div className="max-w-5xl mx-auto px-4 sm:px-6 pb-12">
        <div className="bg-zinc-900 border border-white/10 rounded-2xl p-6 text-xs text-zinc-400 flex items-center gap-2">
          <Loader2 size={14} className="animate-spin" /> Loading branding, onboarding queue &amp; audit log...
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 pb-16 space-y-6">
      {feedback && (
        <div
          className={`p-3.5 rounded-2xl text-xs font-bold border ${
            feedback.kind === "ok"
              ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-300"
              : "bg-red-500/10 border-red-500/30 text-red-300"
          }`}
        >
          {feedback.text}
        </div>
      )}

      {/* 1. Custom Organization Branding & Templates */}
      <form
        onSubmit={handleSaveBranding}
        className="bg-zinc-900 border border-white/10 rounded-2xl p-5 sm:p-6 space-y-4"
      >
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-base font-black text-white flex items-center gap-2">
              <Palette size={17} className="text-blue-400" />
              Organization Branding &amp; Templates
            </h2>
            <p className="text-xs text-zinc-400 mt-0.5">
              Customize accent colors, logo, waiver language, and default volunteer committees across your portal.
            </p>
          </div>
          <button
            type="submit"
            disabled={saving}
            className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white text-xs font-black uppercase tracking-wider flex items-center gap-1.5"
          >
            {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
            Save Branding
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <div>
            <label className="block text-[10px] font-black uppercase tracking-wider text-zinc-400 mb-1">
              Primary Accent Color
            </label>
            <div className="flex items-center gap-2">
              <input
                type="color"
                value={primaryColor}
                onChange={(e) => setPrimaryColor(e.target.value)}
                className="w-10 h-10 rounded-lg bg-zinc-950 border border-white/10 cursor-pointer"
              />
              <input
                type="text"
                value={primaryColor}
                onChange={(e) => setPrimaryColor(e.target.value)}
                className="flex-1 bg-zinc-950 border border-white/10 rounded-xl px-3 py-2 text-xs font-mono text-white"
              />
            </div>
          </div>

          <div>
            <label className="block text-[10px] font-black uppercase tracking-wider text-zinc-400 mb-1">
              Logo URL
            </label>
            <input
              type="url"
              value={logoUrl}
              onChange={(e) => setLogoUrl(e.target.value)}
              placeholder="https://cdn.example.org/logo.png"
              className="w-full bg-zinc-950 border border-white/10 rounded-xl px-3 py-2 text-xs text-white"
            />
          </div>

          <div>
            <label className="block text-[10px] font-black uppercase tracking-wider text-zinc-400 mb-1">
              Public Contact Email
            </label>
            <input
              type="email"
              value={contactEmail}
              onChange={(e) => setContactEmail(e.target.value)}
              placeholder="boxoffice@theater.org"
              className="w-full bg-zinc-950 border border-white/10 rounded-xl px-3 py-2 text-xs text-white"
            />
          </div>

          <div>
            <label className="block text-[10px] font-black uppercase tracking-wider text-zinc-400 mb-1">
              Website URL
            </label>
            <input
              type="url"
              value={websiteUrl}
              onChange={(e) => setWebsiteUrl(e.target.value)}
              placeholder="https://theater.org"
              className="w-full bg-zinc-950 border border-white/10 rounded-xl px-3 py-2 text-xs text-white"
            />
          </div>

          <div>
            <label className="block text-[10px] font-black uppercase tracking-wider text-zinc-400 mb-1">
              Timezone
            </label>
            <input
              type="text"
              value={timezone}
              onChange={(e) => setTimezone(e.target.value)}
              className="w-full bg-zinc-950 border border-white/10 rounded-xl px-3 py-2 text-xs text-white"
            />
          </div>

          <div>
            <label className="block text-[10px] font-black uppercase tracking-wider text-zinc-400 mb-1">
              Default Committees (comma-separated)
            </label>
            <input
              type="text"
              value={committeeTemplates}
              onChange={(e) => setCommitteeTemplates(e.target.value)}
              className="w-full bg-zinc-950 border border-white/10 rounded-xl px-3 py-2 text-xs text-white"
            />
          </div>
        </div>

        <div>
          <label className="block text-[10px] font-black uppercase tracking-wider text-zinc-400 mb-1">
            Custom Family Waiver / Release Text
          </label>
          <textarea
            rows={2}
            value={waiverText}
            onChange={(e) => setWaiverText(e.target.value)}
            placeholder="Optional custom release or handbook agreement text displayed during registration..."
            className="w-full bg-zinc-950 border border-white/10 rounded-xl px-3 py-2 text-xs text-white"
          />
        </div>
      </form>

      {/* 2. Super-Admin Tenant Onboarding Provisioning Queue */}
      <section className="bg-zinc-900 border border-white/10 rounded-2xl p-5 sm:p-6 space-y-4">
        <div>
          <h2 className="text-base font-black text-white flex items-center gap-2">
            <Building2 size={17} className="text-emerald-400" />
            Organization Onboarding Queue
          </h2>
          <p className="text-xs text-zinc-400 mt-0.5">
            Review incoming theater onboarding requests and provision isolated tenant workspaces in one click.
          </p>
        </div>

        {requests.length === 0 ? (
          <p className="text-xs text-zinc-500">No onboarding requests submitted yet.</p>
        ) : (
          <div className="space-y-2.5">
            {requests.map((r) => (
              <div
                key={r.id}
                className="flex flex-wrap items-center justify-between gap-3 p-3.5 rounded-xl bg-zinc-950 border border-white/10"
              >
                <div className="min-w-0">
                  <p className="text-sm font-black text-white">
                    {r.organizationName}{" "}
                    <span className="text-xs font-mono text-blue-400">
                      ({r.requestedSlug}.open-backstage.org)
                    </span>
                  </p>
                  <p className="text-xs text-zinc-400">
                    {r.contactName} • {r.contactEmail} • {r.organizationType}
                  </p>
                </div>

                {r.status === "approved" ? (
                  <span className="px-3 py-1 rounded-full bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 text-[10px] font-black uppercase inline-flex items-center gap-1">
                    <CheckCircle2 size={12} /> Provisioned
                  </span>
                ) : (
                  <button
                    type="button"
                    disabled={provisioningId === r.id}
                    onClick={() => handleApproveRequest(r.id, r.organizationName)}
                    className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-xs font-black uppercase tracking-wider inline-flex items-center gap-1.5"
                  >
                    {provisioningId === r.id ? (
                      <Loader2 size={13} className="animate-spin" />
                    ) : (
                      <Rocket size={13} />
                    )}
                    Approve &amp; Provision
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </section>

      {/* 3. Activity & Audit Log */}
      <section className="bg-zinc-900 border border-white/10 rounded-2xl p-5 sm:p-6 space-y-4">
        <div>
          <h2 className="text-base font-black text-white flex items-center gap-2">
            <History size={17} className="text-purple-400" />
            Workspace Activity &amp; Audit Log
          </h2>
          <p className="text-xs text-zinc-400 mt-0.5">
            Recent administrative changes recorded for accountability across staff &amp; volunteers.
          </p>
        </div>

        {auditLogs.length === 0 ? (
          <p className="text-xs text-zinc-500">No audit events recorded yet.</p>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-white/10">
            <table className="w-full text-left text-xs">
              <thead className="bg-zinc-950 text-[10px] font-black uppercase tracking-wider text-zinc-400">
                <tr>
                  <th className="px-3.5 py-2">Action</th>
                  <th className="px-3.5 py-2">Actor</th>
                  <th className="px-3.5 py-2">Entity</th>
                  <th className="px-3.5 py-2">Timestamp</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {auditLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-white/[0.02]">
                    <td className="px-3.5 py-2.5">
                      <span className="px-2 py-0.5 rounded-md bg-purple-500/15 text-purple-300 border border-purple-500/30 text-[10px] font-black uppercase">
                        {formatAuditActionLabel(log.action)}
                      </span>
                    </td>
                    <td className="px-3.5 py-2.5 text-zinc-200 font-medium">{log.actorName}</td>
                    <td className="px-3.5 py-2.5 text-zinc-400 font-mono">
                      {log.entityType}
                      {log.entityId ? ` #${log.entityId}` : ""}
                    </td>
                    <td className="px-3.5 py-2.5 text-zinc-500 font-mono whitespace-nowrap">
                      {new Date(log.createdAt).toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
