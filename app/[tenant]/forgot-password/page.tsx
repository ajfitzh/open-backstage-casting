"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { KeyRound, Loader2, CheckCircle2, ArrowLeft } from "lucide-react";
import { requestPasswordResetAction } from "@/app/actions/password-reset";
import { formatTenantDisplayName } from "@/app/lib/tenant-utils";

export default function ForgotPasswordPage() {
  const params = useParams();
  const tenant = (params?.tenant as string) || "sandbox";
  const orgName = formatTenantDisplayName(tenant);

  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [doneMessage, setDoneMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    const res = await requestPasswordResetAction(tenant, email);
    setSubmitting(false);
    if (!res.success) {
      setError(res.error || "Could not process request.");
    } else {
      setDoneMessage(
        res.message || "If an account matches that email, we sent a password reset link."
      );
    }
  };

  return (
    <div className="min-h-screen bg-zinc-950 flex items-center justify-center p-4">
      <div className="w-full max-w-sm bg-zinc-900 border border-white/10 p-8 rounded-3xl shadow-2xl space-y-6">
        <div className="text-center space-y-2">
          <div className="w-14 h-14 bg-blue-500/10 border border-blue-500/20 rounded-2xl flex items-center justify-center mx-auto text-blue-400">
            <KeyRound size={26} />
          </div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Reset Password</h1>
          <p className="text-xs font-semibold uppercase tracking-widest text-blue-400">{orgName}</p>
        </div>

        {doneMessage ? (
          <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-200 text-sm space-y-2 text-center">
            <CheckCircle2 size={24} className="mx-auto text-emerald-400" />
            <p className="font-semibold">{doneMessage}</p>
            <p className="text-xs text-zinc-400">Check your inbox and spam folder.</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <p className="text-xs text-zinc-400 text-center">
              Enter your email address and we&apos;ll send you a one-time link to set a new password.
            </p>
            {error && (
              <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-300 text-xs">
                {error}
              </div>
            )}
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              className="w-full bg-zinc-950 border border-zinc-800 px-4 py-3.5 rounded-xl text-sm text-white placeholder:text-zinc-500 focus:border-blue-500"
            />
            <button
              type="submit"
              disabled={submitting || !email}
              className="w-full bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-bold py-3.5 rounded-xl text-sm flex items-center justify-center gap-2 transition-colors"
            >
              {submitting ? <Loader2 size={16} className="animate-spin" /> : "Send Reset Link"}
            </button>
          </form>
        )}

        <div className="text-center pt-2 border-t border-white/5">
          <Link
            href="/login"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-zinc-400 hover:text-white py-2"
          >
            <ArrowLeft size={13} /> Back to Sign In
          </Link>
        </div>
      </div>
    </div>
  );
}
