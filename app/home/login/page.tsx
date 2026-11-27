"use client";

import React, { useState, useEffect, FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";
import { Theater, ArrowRight, Loader2, Mail, Building2 } from "lucide-react";
import {
  startNativeGoogleSignIn,
  useIsNativeCapacitor,
} from "@/app/lib/capacitor-native";

export default function MainDomainLoginPage() {
  const [email, setEmail] = useState("");
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [isLookingUp, setIsLookingUp] = useState(false);
  const isNativeApp = useIsNativeCapacitor();
  const router = useRouter();

  useEffect(() => {
    const resetLoading = () => {
      setIsGoogleLoading(false);
      setIsLookingUp(false);
    };
    const onVisibility = () => {
      if (document.visibilityState === "visible") resetLoading();
    };
    window.addEventListener("pageshow", resetLoading);
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      window.removeEventListener("pageshow", resetLoading);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, []);

  const handleGoogleSignIn = () => {
    setIsGoogleLoading(true);
    if (isNativeApp) {
      void startNativeGoogleSignIn(undefined, () => setIsGoogleLoading(false));
      return;
    }
    signIn("google", { callbackUrl: "/workspaces" });
  };

  const handleEmailLookup = (e: FormEvent) => {
    e.preventDefault();
    const trimmed = email.trim();
    if (!trimmed) return;
    setIsLookingUp(true);
    router.push(`/workspaces?email=${encodeURIComponent(trimmed)}`);
  };

  return (
    <div className="min-h-[calc(100vh-10rem)] flex items-center justify-center px-4 py-16">
      <div className="w-full max-w-md bg-zinc-900/90 border border-white/10 rounded-3xl p-8 shadow-2xl space-y-6">
        <div className="text-center space-y-2">
          <div className="w-14 h-14 bg-blue-600/15 border border-blue-500/30 rounded-2xl flex items-center justify-center mx-auto text-blue-400">
            <Theater size={26} />
          </div>
          <h1 className="text-2xl font-black uppercase italic tracking-tighter text-white">
            Find Your Workspace
          </h1>
          <p className="text-xs text-zinc-400 font-medium leading-relaxed">
            Sign in with Google or enter your email and we&apos;ll route you straight to your theater or school portal.
          </p>
        </div>

        <button
          type="button"
          onClick={handleGoogleSignIn}
          disabled={isGoogleLoading}
          className="w-full py-3.5 bg-white hover:bg-zinc-200 text-black font-black uppercase text-xs tracking-widest rounded-xl transition-all flex items-center justify-center gap-3 shadow-lg disabled:opacity-50"
        >
          {isGoogleLoading ? (
            <Loader2 size={16} className="animate-spin" />
          ) : (
            <svg className="w-4 h-4" viewBox="0 0 24 24" aria-hidden="true">
              <path
                fill="currentColor"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="currentColor"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="currentColor"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
              />
              <path
                fill="currentColor"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
              />
            </svg>
          )}
          Continue with Google
        </button>

        <div className="relative flex py-1 items-center">
          <div className="flex-grow border-t border-white/10" />
          <span className="flex-shrink mx-4 text-zinc-500 text-[10px] font-bold uppercase tracking-widest">
            Or find by email
          </span>
          <div className="flex-grow border-t border-white/10" />
        </div>

        <form onSubmit={handleEmailLookup} className="space-y-3">
          <div className="relative">
            <Mail size={15} className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500" />
            <input
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              className="w-full bg-zinc-950 border border-white/10 rounded-xl pl-11 pr-4 py-3.5 text-sm text-white placeholder-zinc-600 focus:border-blue-500 outline-none transition-colors"
            />
          </div>
          <button
            type="submit"
            disabled={isLookingUp}
            className="w-full py-3.5 bg-blue-600 hover:bg-blue-500 text-white font-black uppercase text-xs tracking-widest rounded-xl transition-all flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {isLookingUp ? <Loader2 size={15} className="animate-spin" /> : null}
            Locate My Organization <ArrowRight size={15} />
          </button>
        </form>

        <div className="pt-4 border-t border-white/5 text-center">
          <Link
            href="/workspaces?choose=1"
            className="inline-flex items-center gap-2 text-xs font-bold text-zinc-400 hover:text-white transition-colors"
          >
            <Building2 size={14} /> Browse all organizations or add your school
          </Link>
        </div>
      </div>
    </div>
  );
}
