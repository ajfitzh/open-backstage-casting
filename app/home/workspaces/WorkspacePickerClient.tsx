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
  PlusCircle,
  Search,
  Sparkles,
} from "lucide-react";
import { submitOrganizationRequest } from "@/app/actions/onboarding";
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
  const [showAddForm, setShowAddForm] = useState(matchedWorkspaces.length === 0);

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

  const handleOrgRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setRequestSuccess(null);

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
            <Sparkles size={12} /> Open Backstage Directory
          </span>
          <h1 className="text-3xl md:text-4xl font-black uppercase italic tracking-tighter text-white">
            Choose Your Workspace
          </h1>
          <p className="text-sm text-zinc-400 mt-1">
            {userEmail ? (
              <>
                Showing organizations for <span className="text-white font-bold">{userEmail}</span>.
              </>
            ) : (
              "Select your theater or school below, or sign in to jump straight to your portal."
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

      {/* MATCHED WORKSPACES */}
      {userEmail && (
        <section className="space-y-4">
          <h2 className="text-xs font-black uppercase tracking-widest text-zinc-400">
            Your Organizations ({matchedWorkspaces.length})
          </h2>

          {matchedWorkspaces.length === 0 ? (
            <div className="p-6 rounded-2xl bg-zinc-900/60 border border-amber-500/20 text-sm text-zinc-300 space-y-2">
              <p className="font-bold text-amber-300">
                We didn&apos;t find an existing membership for {userEmail} yet.
              </p>
              <p className="text-xs text-zinc-400">
                Pick an organization below to register or log in with a different email, or request a new workspace for
                your school or theater.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {matchedWorkspaces.map((org) => (
                <a
                  key={org.slug}
                  href={isSignedIn ? org.dashboardUrl : org.loginUrl}
                  className="group p-6 rounded-2xl bg-zinc-900 border border-blue-500/30 hover:border-blue-400 hover:bg-zinc-900/90 transition-all flex items-center justify-between gap-4 shadow-lg"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-lg font-black text-white">{org.name}</span>
                      {org.role && (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-blue-500/20 border border-blue-500/30 text-blue-300">
                          {org.role}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-zinc-500 font-mono">{org.slug}.open-backstage.org</p>
                  </div>
                  <span className="w-10 h-10 rounded-xl bg-blue-600/20 group-hover:bg-blue-600 text-blue-300 group-hover:text-white flex items-center justify-center transition-colors shrink-0">
                    <ArrowUpRight size={18} />
                  </span>
                </a>
              ))}
            </div>
          )}
        </section>
      )}

      {/* OTHER ORGANIZATIONS */}
      <section className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-xs font-black uppercase tracking-widest text-zinc-400">
              {matchedWorkspaces.length > 0
                ? "Involved in Another School or Organization?"
                : "Available Organizations"}
            </h2>
            <p className="text-xs text-zinc-500 mt-0.5">
              Open another organization&apos;s login portal or public audition registration.
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

        {filteredOther.length === 0 ? (
          <div className="p-6 rounded-2xl border border-dashed border-zinc-800 text-center text-xs text-zinc-500">
            No additional organizations matched your filter.
          </div>
        ) : (
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
                  <a
                    href={org.loginUrl}
                    className="flex-1 text-center px-3 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-xs font-bold text-white transition-colors"
                  >
                    Portal Login
                  </a>
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
        )}
      </section>

      {/* ADD NEW SCHOOL / ORGANIZATION */}
      <section className="rounded-3xl bg-zinc-900/70 border border-white/10 p-6 md:p-8 space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-black uppercase italic tracking-tight text-white flex items-center gap-2">
              <PlusCircle size={18} className="text-emerald-400" />
              Add Your School or Theater
            </h2>
            <p className="text-xs text-zinc-400 mt-1">
              Involved with a different school, community theater, or CYT chapter? Request a dedicated workspace.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setShowAddForm((prev) => !prev)}
            className="px-4 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-xs font-bold text-zinc-200 transition-colors shrink-0"
          >
            {showAddForm ? "Hide Form" : "Request New Workspace"}
          </button>
        </div>

        {requestSuccess && (
          <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs font-bold flex items-center gap-2">
            <CheckCircle2 size={16} className="shrink-0" />
            <span>{requestSuccess}</span>
          </div>
        )}

        {showAddForm && (
          <form onSubmit={handleOrgRequest} className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
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
                {submitting ? <Loader2 size={14} className="animate-spin" /> : <PlusCircle size={14} />}
                Request Workspace Setup
              </button>
            </div>
          </form>
        )}
      </section>
    </div>
  );
}
