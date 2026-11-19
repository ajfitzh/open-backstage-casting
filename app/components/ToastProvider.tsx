"use client";

import React, { createContext, useCallback, useContext, useEffect, useState } from "react";
import { CheckCircle2, AlertCircle, Info, AlertTriangle, X } from "lucide-react";

export type ToastVariant = "success" | "error" | "info" | "warning";

interface ToastItem {
  id: number;
  message: string;
  variant: ToastVariant;
}

type ToastListener = (message: string, variant: ToastVariant) => void;

const listeners = new Set<ToastListener>();

function emitToast(message: string, variant: ToastVariant) {
  if (listeners.size === 0) return;
  listeners.forEach((listener) => listener(message, variant));
}

export const toast = {
  success: (message: string) => emitToast(message, "success"),
  error: (message: string) => emitToast(message, "error"),
  info: (message: string) => emitToast(message, "info"),
  warning: (message: string) => emitToast(message, "warning"),
};

interface ToastContextValue {
  push: (message: string, variant?: ToastVariant) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    return {
      push: (message: string, variant: ToastVariant = "info") => emitToast(message, variant),
    };
  }
  return ctx;
}

let nextToastId = 1;

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const dismiss = useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const push = useCallback(
    (message: string, variant: ToastVariant = "info") => {
      const id = nextToastId++;
      setToasts((prev) => [...prev.slice(-3), { id, message, variant }]);
      window.setTimeout(() => {
        dismiss(id);
      }, 4500);
    },
    [dismiss]
  );

  useEffect(() => {
    const listener: ToastListener = (message, variant) => push(message, variant);
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  }, [push]);

  const styleByVariant: Record<ToastVariant, { box: string; icon: React.ReactNode }> = {
    success: {
      box: "bg-zinc-950/95 border-emerald-500/40 text-emerald-100",
      icon: <CheckCircle2 size={16} className="text-emerald-400 shrink-0 mt-0.5" />,
    },
    error: {
      box: "bg-zinc-950/95 border-red-500/40 text-red-100",
      icon: <AlertCircle size={16} className="text-red-400 shrink-0 mt-0.5" />,
    },
    warning: {
      box: "bg-zinc-950/95 border-amber-500/40 text-amber-100",
      icon: <AlertTriangle size={16} className="text-amber-400 shrink-0 mt-0.5" />,
    },
    info: {
      box: "bg-zinc-950/95 border-blue-500/40 text-blue-100",
      icon: <Info size={16} className="text-blue-400 shrink-0 mt-0.5" />,
    },
  };

  return (
    <ToastContext.Provider value={{ push }}>
      {children}
      <div
        aria-live="polite"
        className="fixed bottom-5 right-5 z-[100] flex flex-col gap-2.5 max-w-sm w-[calc(100vw-2.5rem)] pointer-events-none"
      >
        {toasts.map((item) => {
          const style = styleByVariant[item.variant];
          return (
            <div
              key={item.id}
              role="status"
              className={`pointer-events-auto flex items-start gap-3 px-4 py-3 rounded-2xl border shadow-2xl backdrop-blur-md text-xs font-bold leading-snug animate-in fade-in slide-in-from-bottom-3 duration-200 ${style.box}`}
            >
              {style.icon}
              <p className="flex-1">{item.message}</p>
              <button
                type="button"
                onClick={() => dismiss(item.id)}
                aria-label="Dismiss notification"
                className="text-zinc-500 hover:text-white transition-colors shrink-0"
              >
                <X size={14} />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}
