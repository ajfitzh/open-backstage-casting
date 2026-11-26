"use client";

import React, { useState } from "react";
import Link from "next/link";
import { signOut } from "next-auth/react";
import {
  ArrowUpRight,
  Building2,
  CheckCircle2,
  Loader2,
  LogOut,
  Plus,
  Search,
  Sparkles,
  X,
} from "lucide-react";
import {
  createInstantOrganization,
  submitOrganizationRequest,
} from "@/app/actions/onboarding";
import { createWorkspaceLaunchUrl } from "@/app/actions/workspace-handoff";
import { toast } from "@/app/components/ToastProvider";

export interface PickerWorkspace {
  slug: string;
  name: string;
  role?: string;
  userName?: string;
  dashboardUrl: string;
  loginUrl: string;
  auditionUrl: string;
}

interface WorkspacePickerClientProps {
  userEmail: string | null;
  userName: string | null;
  isSignedIn: boolean;
  matchedWorkspaces: PickerWorkspace[];
  otherWorkspaces: PickerWorkspace[];
}

export default function WorkspacePickerClient({
  userEmail,
  userName,
  isSignedIn,
  matchedWorkspaces,
  otherWorkspaces,
}: WorkspacePickerClientProps) {
  const [search, setSearch] = useState("");
  const [showAddForm, setShowAddForm] = useState(false);
  const [launchingSlug, setLaunchingSlug] = useState<string | null>(null);

  // Onboarding request form
  const [orgName, setOrgName] = useState("");
  const [desiredSlug, setDesiredSlug] = useState("");
  const [orgType, setOrgType] = useState("Youth Theater / CYT Affiliate");
  const [contactName, setContactName] = useState(userName || "");
  const [contactEmail, setContactEmail] = useState(userEmail || "");
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [requestSuccess, setRequestSuccess] = useState<string | null>(null);

  const filteredOther = otherWorkspaces.filter((org) => {
    const q = search.trim().toLowerCase();
    if (!q) return true;
    return org.name.toLowerCase().includes(q) || org.slug.toLowerCase().includes(q);
  });

  const handleLaunchWorkspace = async (org: PickerWorkspace) => {
    if (!isSignedIn) {
      window.location.assign(org.loginUrl);
      return;
    }

    setLaunchingSlug(org.slug);
    const res = await createWorkspaceLaunchUrl(org.slug);
    if (res.success) {
      window.location.assign(res.url);
    } else {
      setLaunchingSlug(null);
      toast.error(res.error || "Could not launch workspace.");
    }
  };

  const handleOrgRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setRequestSuccess(null);

    if (isSignedIn) {
      const created = await createInstantOrganization({
        organizationName: orgName,
        desiredSlug,
        organizationType: orgType,
        notes,
      });

      if (created.success) {
        toast.success(`Created ${created.name}! Launching workspace...`);
        window.location.assign(created.launchUrl);
        return;
      }

      setSubmitting(false);
      toast.error(created.error || "Could not create organization.");
      return;
    }

    const res = await submitOrganizationRequest({
      organizationName: orgName,
      desiredSlug,
      organizationType: orgType,
      contactName,
      contactEmail,
      notes,
    });

    setSubmitting(false);
    if (res.success) {
      setRequestSuccess(res.message || "Organization request submitted!");
      toast.success("Organization request sent!");
      setOrgName("");
      setDesiredSlug("");
      setNotes("");
      setShowAddForm(false);
    } else {
      toast.error(res.error || "Please complete the required fields.");
    }
  };

  return (
    <div className="max-w-5xl mx-auto px-6 py-14 space-y-10">
      {/* HEADER */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-white/10 pb-6">
        <div>
          <span className="inline-flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.2em] text-blue-400 mb-2">
            <Sparkles size={12} /> Open Backstage
          </span>
          <h1 className="text-3xl md:text-4xl font-black uppercase italic tracking-tighter text-white">
            Choose Your Workspace
          </h1>
          <p className="text-sm text-zinc-400 mt-1">
            {userEmail ? (
              <>
                {isSignedIn ? "Signed in as " : "Showing organizations for "}
                <span className="text-white font-bold">{userEmail}</span>
                {matchedWorkspaces.length === 1
                  ? " — we found 1 organization for you."
                  : matchedWorkspaces.length > 1
                    ? ` — we found ${matchedWorkspaces.length} organizations for you.`
                    : "."}
              </>
            ) : (
              "Select your theater or school below, or sign in for one-click workspace access."
            )}
          </p>
        </div>

        <div className="flex items-center gap-3">
          {isSignedIn ? (
            <button
              type="button"
              onClick={() => signOut({ callbackUrl: "/login" })}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-zinc-900 border border-white/10 text-xs font-bold text-zinc-300 hover:text-white hover:bg-zinc-800 transition-colors"
            >
              <LogOut size={14} /> Sign Out
            </button>
          ) : (
            <Link
              href="/login"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-xs font-black uppercase tracking-wider text-white transition-colors"
            >
              Sign In
            </Link>
          )}
        </div>
      </div>

      {requestSuccess && (
        <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs font-bold flex items-center gap-2">
          <CheckCircle2 size={16} className="shrink-0" />
          <span>{requestSuccess}</span>
        </div>
      )}

      {/* PRIMARY WORKSPACE CARDS + DOTTED "ADD NEW ORGANIZATION" CARD */}
      <section className="space-y-4">
        <h2 className="text-xs font-black uppercase tracking-widest text-zinc-400">
          {userEmail ? `Your Organizations (${matchedWorkspaces.length})` : "Get Started"}
        </h2>

        {userEmail && matchedWorkspaces.length === 0 && (
          <div className="p-5 rounded-2xl bg-zinc-900/60 border border-amber-500/20 text-sm text-zinc-300 space-y-1">
            <p className="font-bold text-amber-300">
              We didn&apos;t find an existing membership for {userEmail} yet.
            </p>
            <p className="text-xs text-zinc-400">
              Pick an existing school or theater below, or add your own organization.
            </p>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {matchedWorkspaces.map((org) => {
            const isLaunching = launchingSlug === org.slug;
            return (
              <button
                key={org.slug}
                type="button"
                disabled={launchingSlug !== null}
                onClick={() => handleLaunchWorkspace(org)}
                className="group p-6 rounded-2xl bg-zinc-900 border border-blue-500/30 hover:border-blue-400 hover:bg-zinc-900/90 transition-all flex items-center justify-between gap-4 shadow-lg text-left disabled:opacity-60"
              >
                <div className="space-y-1.5 min-w-0">
                  <div className="flex items-center flex-wrap gap-2">
                    <span className="text-lg font-black text-white truncate">{org.name}</span>
                    {org.role && (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-blue-500/20 border border-blue-500/30 text-blue-300">
                        {org.role}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-zinc-500 font-mono truncate">
                    {isLaunching
                      ? `Signing into ${org.name}...`
                      : `${org.slug}.open-backstage.org`}
                  </p>
                  <p className="text-[11px] font-bold text-blue-400">
                    {isSignedIn ? "Click to open workspace automatically →" : "Click to sign in →"}
                  </p>
                </div>
                <span className="w-11 h-11 rounded-xl bg-blue-600/20 group-hover:bg-blue-600 text-blue-300 group-hover:text-white flex items-center justify-center transition-colors shrink-0">
                  {isLaunching ? (
                    <Loader2 size={18} className="animate-spin" />
                  ) : (
                    <ArrowUpRight size={18} />
                  )}
                </span>
              </button>
            );
          })}

          {/* DOTTED OUTLINE CARD: ADD NEW ORGANIZATION */}
          <button
            type="button"
            onClick={() => setShowAddForm((prev) => !prev)}
            className="group p-6 rounded-2xl border-2 border-dashed border-zinc-700 hover:border-emerald-400/70 bg-zinc-950/50 hover:bg-emerald-500/5 transition-all flex items-center justify-between gap-4 text-left"
          >
            <div className="space-y-1">
              <span className="text-base font-black text-zinc-200 group-hover:text-white transition-colors block">
                Add new organization
              </span>
              <p className="text-xs text-zinc-500">
                {isSignedIn
                  ? "Launch a brand-new workspace for another school, theater, or CYT chapter instantly."
                  : "Involved with a different school, theater, or CYT chapter? Request a workspace."}
              </p>
            </div>
            <span className="w-11 h-11 rounded-xl border border-dashed border-zinc-700 group-hover:border-emerald-400/60 group-hover:bg-emerald-500/15 text-zinc-400 group-hover:text-emerald-300 flex items-center justify-center transition-colors shrink-0">
              {showAddForm ? <X size={18} /> : <Plus size={18} />}
            </span>
          </button>
        </div>

        {/* INLINE COLLAPSIBLE NEW ORGANIZATION FORM */}
        {showAddForm && (
          <form
            onSubmit={handleOrgRequest}
            className="rounded-3xl bg-zinc-900/80 border border-emerald-500/25 p-6 md:p-8 grid grid-cols-1 md:grid-cols-2 gap-4 animate-in fade-in slide-in-from-top-2 duration-200"
          >
            <div className="md:col-span-2 flex items-center justify-between border-b border-white/5 pb-3">
              <div>
                <h3 className="text-base font-black uppercase italic tracking-tight text-white">
                  Add Your School or Theater
                </h3>
                <p className="text-xs text-zinc-400">
                  Tell us about your organization and we&apos;ll set up your dedicated subdomain.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowAddForm(false)}
                aria-label="Close new organization form"
                className="p-1.5 rounded-lg text-zinc-500 hover:text-white hover:bg-zinc-800"
              >
                <X size={16} />
              </button>
            </div>

            <div>
              <label className="block text-[10px] font-bold uppercase text-zinc-500 mb-1">
                School / Theater Name *
              </label>
              <input
                required
                value={orgName}
                onChange={(e) => setOrgName(e.target.value)}
                placeholder="e.g., Riverside High Drama Club"
                className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-950 border border-white/10 text-sm text-white outline-none focus:border-emerald-500"
              />
            </div>

            <div>
              <label className="block text-[10px] font-bold uppercase text-zinc-500 mb-1">
                Preferred Subdomain (Optional)
              </label>
              <input
                value={desiredSlug}
                onChange={(e) => setDesiredSlug(e.target.value)}
                placeholder="e.g., riverside-drama"
                className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-950 border border-white/10 text-sm text-white outline-none focus:border-emerald-500"
              />
            </div>

            <div>
              <label className="block text-[10px] font-bold uppercase text-zinc-500 mb-1">
                Organization Type
              </label>
              <select
                value={orgType}
                onChange={(e) => setOrgType(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-950 border border-white/10 text-sm text-white outline-none focus:border-emerald-500"
              >
                <option value="Youth Theater / CYT Affiliate">Youth Theater / CYT Affiliate</option>
                <option value="High School / Middle School">High School / Middle School</option>
                <option value="Community Theater">Community Theater</option>
                <option value="Performing Arts Academy">Performing Arts Academy</option>
              </select>
            </div>

            <div>
              <label className="block text-[10px] font-bold uppercase text-zinc-500 mb-1">
                Your Name *
              </label>
              <input
                required
                value={contactName}
                onChange={(e) => setContactName(e.target.value)}
                placeholder="Your full name"
                className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-950 border border-white/10 text-sm text-white outline-none focus:border-emerald-500"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-[10px] font-bold uppercase text-zinc-500 mb-1">
                Your Email *
              </label>
              <input
                type="email"
                required
                value={contactEmail}
                onChange={(e) => setContactEmail(e.target.value)}
                placeholder="you@school.org"
                className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-950 border border-white/10 text-sm text-white outline-none focus:border-emerald-500"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-[10px] font-bold uppercase text-zinc-500 mb-1">
                Notes (Optional)
              </label>
              <textarea
                rows={2}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Tell us about your upcoming season or how many students participate..."
                className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-950 border border-white/10 text-sm text-white outline-none focus:border-emerald-500"
              />
            </div>

            <div className="md:col-span-2 flex justify-end">
              <button
                type="submit"
                disabled={submitting}
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-black uppercase tracking-widest rounded-xl transition-colors disabled:opacity-50"
              >
                {submitting ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
                {isSignedIn ? "Create & Launch Workspace" : "Request Workspace Setup"}
              </button>
            </div>
          </form>
        )}
      </section>

      {/* OTHER REGISTERED ORGANIZATIONS */}
      {otherWorkspaces.length > 0 && (
        <section className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 className="text-xs font-black uppercase tracking-widest text-zinc-400">
                {matchedWorkspaces.length > 0
                  ? "Other Organizations on Open Backstage"
                  : "Available Organizations"}
              </h2>
              <p className="text-xs text-zinc-500 mt-0.5">
                Open another school or theater&apos;s login portal or public audition registration.
              </p>
            </div>
            {otherWorkspaces.length > 3 && (
              <div className="relative w-full sm:w-64">
                <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-500" />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Filter organizations..."
                  className="w-full bg-zinc-900 border border-white/10 rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder-zinc-600 outline-none focus:border-blue-500"
                />
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredOther.map((org) => (
              <div
                key={org.slug}
                className="p-5 rounded-2xl bg-zinc-900/60 border border-white/10 flex flex-col justify-between gap-4"
              >
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-xl bg-zinc-800 border border-white/5 flex items-center justify-center text-zinc-400 shrink-0">
                    <Building2 size={18} />
                  </div>
                  <div>
                    <h3 className="text-sm font-black text-white">{org.name}</h3>
                    <p className="text-xs text-zinc-500 font-mono">{org.slug}.open-backstage.org</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    disabled={launchingSlug !== null}
                    onClick={() => handleLaunchWorkspace(org)}
                    className="flex-1 text-center px-3 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-xs font-bold text-white transition-colors disabled:opacity-50"
                  >
                    {isSignedIn ? "Open Portal" : "Portal Login"}
                  </button>
                  <a
                    href={org.auditionUrl}
                    className="flex-1 text-center px-3 py-2 rounded-xl bg-blue-600/15 hover:bg-blue-600/30 border border-blue-500/30 text-xs font-bold text-blue-300 transition-colors"
                  >
                    Audition Form
                  </a>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
