"use client";

import React, { useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import {
  ShoppingCart,
  CreditCard,
  CheckCircle,
  Shirt,
  Ticket,
  Loader2,
  XCircle,
} from "lucide-react";

function CheckoutContent() {
  const searchParams = useSearchParams();
  const status = searchParams.get("status");
  
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleCheckout = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/checkout-sandbox", {
        method: "POST",
      });
      const data = await res.json();

      if (data.url) {
        // Redirect the user to the Stripe Checkout page
        window.location.href = data.url;
      } else {
        throw new Error(data.message || "Failed to create checkout session");
      }
    } catch (err: any) {
      console.error(err);
      setError(err.message);
      setIsLoading(false);
    }
  };

  // SUCCESS STATE
  if (status === "success") {
    return (
      <div className="max-w-md w-full mx-auto bg-zinc-900 border border-zinc-800 rounded-2xl p-8 shadow-2xl text-center">
        <div className="w-16 h-16 bg-emerald-500/10 rounded-full flex items-center justify-center mx-auto mb-6">
          <CheckCircle className="w-8 h-8 text-emerald-500" />
        </div>
        <h2 className="text-2xl font-semibold text-zinc-100 mb-2">
          Payment Successful!
        </h2>
        <p className="text-zinc-400 mb-8">
          Thank you for completing your registration and t-shirt order. You&apos;re all set for the production!
        </p>
        <button
          onClick={() => window.location.href = "/sandbox/checkout"}
          className="px-6 py-3 bg-zinc-800 hover:bg-zinc-700 text-zinc-100 rounded-lg font-medium transition-colors border border-zinc-700 w-full"
        >
          Return to Sandbox Cart
        </button>
      </div>
    );
  }

  // DEFAULT / CART STATE
  return (
    <div className="max-w-md w-full mx-auto bg-zinc-900 border border-zinc-800 rounded-2xl shadow-2xl overflow-hidden">
      {/* Header */}
      <div className="p-6 border-b border-zinc-800 flex items-center gap-3">
        <div className="p-2 bg-blue-500/10 rounded-lg">
          <ShoppingCart className="w-5 h-5 text-blue-500" />
        </div>
        <h1 className="text-xl font-semibold text-zinc-100">
          Registration Cart
        </h1>
      </div>

      {/* Error Message */}
      {error && (
        <div className="mx-6 mt-6 p-4 bg-red-500/10 border border-red-500/20 rounded-lg flex items-center gap-3 text-red-400">
          <XCircle className="w-5 h-5 shrink-0" />
          <p className="text-sm">{error}</p>
        </div>
      )}

      {/* Cancelled Message */}
      {status === "cancelled" && !error && (
        <div className="mx-6 mt-6 p-4 bg-zinc-800/50 border border-zinc-700 rounded-lg flex items-center gap-3 text-zinc-300">
          <XCircle className="w-5 h-5 shrink-0" />
          <p className="text-sm">Checkout was cancelled. You can try again when you&apos;re ready.</p>
        </div>
      )}

      {/* Line Items */}
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between group">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 bg-zinc-800 rounded-lg flex items-center justify-center shrink-0 group-hover:bg-zinc-700 transition-colors">
              <Ticket className="w-5 h-5 text-zinc-400" />
            </div>
            <div>
              <p className="font-medium text-zinc-200">Spring Production Fee</p>
              <p className="text-sm text-zinc-500">Austin Fitzhugh</p>
            </div>
          </div>
          <span className="font-medium text-zinc-200">$150.00</span>
        </div>

        <div className="flex items-center justify-between group">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 bg-zinc-800 rounded-lg flex items-center justify-center shrink-0 group-hover:bg-zinc-700 transition-colors">
              <Shirt className="w-5 h-5 text-zinc-400" />
            </div>
            <div>
              <p className="font-medium text-zinc-200">Show T-Shirt</p>
              <p className="text-sm text-zinc-500">Adult L</p>
            </div>
          </div>
          <span className="font-medium text-zinc-200">$20.00</span>
        </div>
      </div>

      {/* Summary & Checkout */}
      <div className="p-6 bg-zinc-950 border-t border-zinc-800">
        <div className="flex items-center justify-between mb-6">
          <span className="text-zinc-400">Total Due</span>
          <span className="text-2xl font-bold text-zinc-100">$170.00</span>
        </div>

        <button
          onClick={handleCheckout}
          disabled={isLoading}
          className="w-full flex items-center justify-center gap-2 py-4 px-6 bg-blue-600 hover:bg-blue-500 disabled:bg-blue-600/50 text-white rounded-xl font-medium transition-all focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-zinc-950"
        >
          {isLoading ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              Connecting to secure server...
            </>
          ) : (
            <>
              <CreditCard className="w-5 h-5" />
              Checkout with Stripe
            </>
          )}
        </button>
      </div>
    </div>
  );
}

export default function CheckoutSandbox() {
  return (
    <div className="min-h-screen bg-zinc-950 flex items-center justify-center p-4">
      {/* Wrap in Suspense to prevent Next.js build warnings 
        when using useSearchParams() inside a client component
      */}
      <Suspense fallback={
        <div className="text-zinc-400 flex items-center gap-2">
          <Loader2 className="w-5 h-5 animate-spin" />
          Loading secure sandbox...
        </div>
      }>
        <CheckoutContent />
      </Suspense>
    </div>
  );
}