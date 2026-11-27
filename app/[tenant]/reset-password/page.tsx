"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useParams, useSearchParams } from "next/navigation";
import { Lock, Loader2, CheckCircle2, AlertCircle } from "lucide-react";
import { completePasswordResetAction } from "@/app/actions/password-reset";
import { formatTenantDisplayName } from "@/app/lib/tenant-utils";

export default function ResetPasswordPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const tenant = (params?.tenant as string) || "sandbox";
  const token = searchParams.get("token") || "";
  const orgName = formatTenantDisplayName(tenant);

  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (password.trim().length < 8) {
      setError("Password must be at least 8 characters long.");
      return;
    }
    if (password !== confirm) {
      setError("Passwords do not match.");
      return;
    }

    setSubmitting(true);
    const res = await completePasswordResetAction(tenant, token, password);
    setSubmitting(false);

    if (!res.success) {
      setError(res.error || "Could not update password.");
    } else {
      setDone(true);
    }
  };

  return (
    <div className="min-h-screen bg-zinc-950 flex items-center justify-center p-4">
      <div className="w-full max-w-sm bg-zinc-900 border border-white/10 p-8 rounded-3xl shadow-2xl space-y-6">
        <div className="text-center space-y-2">
          <div className="w-14 h-14 bg-blue-500/10 border border-blue-500/20 rounded-2xl flex items-center justify-center mx-auto text-blue-400">
            <Lock size={26} />
          </div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Choose New Password</h1>
          <p className="text-xs font-semibold uppercase tracking-widest text-blue-400">{orgName}</p>
        </div>

        {!token ? (
          <div className="p-4 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-300 text-xs text-center space-y-2">
            <AlertCircle size={20} className="mx-auto" />
            <p>Missing reset token. Please open the link from your email or request a new one.</p>
            <Link href="/forgot-password" className="inline-block underline font-semibold text-white">
              Request New Reset Link
            </Link>
          </div>
        ) : done ? (
          <div className="p-5 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-200 text-sm text-center space-y-3">
            <CheckCircle2 size={26} className="mx-auto text-emerald-400" />
            <p className="font-bold text-white">Password Updated!</p>
            <p className="text-xs text-zinc-300">You can now sign in with your new password.</p>
            <Link
              href="/login"
              className="block w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-3 rounded-xl text-xs uppercase tracking-wider"
            >
              Go to Sign In
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-3">
            {error && (
              <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-300 text-xs">
                {error}
              </div>
            )}
            <input
              type="password"
              required
              minLength={8}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="New password (min 8 characters)"
              className="w-full bg-zinc-950 border border-zinc-800 px-4 py-3.5 rounded-xl text-sm text-white placeholder:text-zinc-500 focus:border-blue-500"
            />
            <input
              type="password"
              required
              minLength={8}
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              placeholder="Confirm new password"
              className="w-full bg-zinc-950 border border-zinc-800 px-4 py-3.5 rounded-xl text-sm text-white placeholder:text-zinc-500 focus:border-blue-500"
            />
            <button
              type="submit"
              disabled={submitting || !password || !confirm}
              className="w-full bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-bold py-3.5 rounded-xl text-sm flex items-center justify-center gap-2 transition-colors mt-1"
            >
              {submitting ? <Loader2 size={16} className="animate-spin" /> : "Save New Password"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
